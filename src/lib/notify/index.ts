import "server-only";
import { CATEGORY_LABEL, formatWon, warrantyEnds, type Inquiry, type NotifyEvent, type Order } from "@/lib/domain";
import { simpleMessage } from "@/lib/messages";
import { phoneDigits } from "@/lib/phone";
import { pushToAdmins, pushToCustomer } from "@/lib/push";
import { formatDay, pickupDateFor, SAME_DAY_CUTOFF_HOUR, seoulToday } from "@/lib/schedule";
import { getStore } from "@/lib/store";
import { solapiConfig, solapiSend, type SolapiMessage } from "./solapi";
import { render, TEMPLATES } from "./templates";

// 알림 보내기. 실패해도 주문 처리는 그대로 진행되도록 오류를 밖으로 던지지 않고 기록만 남긴다.
//  1. 웹 푸시 (무료): 알림을 켠 기기로 자동 발송
//  2. 알림톡 (유료, 선택): SOLAPI_* 를 넣었을 때만. 넣지 않으면 아무것도 하지 않는다
//  3. 운영자 휴대폰 문자: 관리자 화면의 "문자 보내기" 버튼 (src/lib/messages.ts)

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // Netlify는 배포한 사이트 주소를 URL에 넣어 준다
  if (process.env.URL && /^https:\/\//.test(process.env.URL)) return process.env.URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** 문자에 넣는 바로가기 링크. 로그인하지 않아도 이 주문을 볼 수 있다 */
export function shortLink(order: Pick<Order, "accessToken">): string {
  return `${appUrl()}/s/${order.accessToken}`;
}

/** SOLAPI_TEMPLATES="ORDER_RECEIVED=KA01TP...,PAID=KA01TP..." */
export function templateIds(raw = process.env.SOLAPI_TEMPLATES ?? ""): Partial<Record<NotifyEvent, string>> {
  const out: Partial<Record<NotifyEvent, string>> = {};
  for (const part of raw.split(/[,\n]/)) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v && k in TEMPLATES) out[k as NotifyEvent] = v;
  }
  return out;
}

export function maskPhone(p: string): string {
  const d = phoneDigits(p);
  return d.length >= 4 ? `***-${d.slice(-4)}` : "***";
}

const unit = (dong: string, ho: string) => `${dong}동 ${ho}호`;

function pickupGuide(now = new Date()): string {
  const d = pickupDateFor(now);
  const today = d === seoulToday(now);
  return today
    ? `${SAME_DAY_CUTOFF_HOUR}시 전에 입금이 확인되면 오늘(${formatDay(d)}) 저녁 7~10시에 수거해요.`
    : `입금이 확인되면 ${formatDay(d)} 저녁 7~10시에 수거해요.`;
}

/** 주문 알림에 쓰는 변수들 */
export function orderVars(o: Order, extra: Record<string, string> = {}, now = new Date()): Record<string, string> {
  return {
    동호: unit(o.dong, o.ho),
    주문번호: o.orderNo,
    제품: `${o.brand} ${o.modelName}`.slice(0, 60),
    종류: CATEGORY_LABEL[o.category],
    금액: o.price != null ? formatWon(o.price) : "견적 후 안내",
    계좌: o.price != null ? process.env.BANK_ACCOUNT || "앱에서 확인해 주세요" : "견적 후 안내",
    수거안내: o.price != null ? pickupGuide(now) : "모델을 확인한 뒤 견적을 알려 드릴게요.",
    수거일: o.pickupDate ? formatDay(o.pickupDate) : "",
    배송일: o.deliveryDate ? formatDay(o.deliveryDate) : "",
    // 서울 날짜로 보여 준다
    보증종료: o.deliveredAt ? formatDay(new Date(warrantyEnds(o.deliveredAt).getTime() + 9 * 3600_000).toISOString().slice(0, 10)) : "",
    환불안내: o.paidAt ? (o.refunded ? `결제하신 ${o.price != null ? formatWon(o.price) : "금액"}은 환불해 드렸어요.` : "결제 금액은 확인 후 환불해 드려요.") : "결제 전이라 따로 하실 일은 없어요.",
    링크: shortLink(o),
    ...extra,
  };
}

interface Target {
  event: NotifyEvent;
  to: string;
  vars: Record<string, string>;
  orderId?: string | null;
  inquiryId?: string | null;
}

export type DispatchStatus = "sent" | "failed" | "skipped";

async function writeLog(t: Pick<Target, "event" | "orderId" | "inquiryId">, channel: "alimtalk" | "push", toMasked: string, status: DispatchStatus, detail: string) {
  await getStore()
    .addNotification({ event: t.event, channel, orderId: t.orderId ?? null, inquiryId: t.inquiryId ?? null, toMasked, status, detail })
    .catch((e) => console.error("notification log failed", e));
}

/** 알림톡 (유료). 설정하지 않았으면 기록도 남기지 않고 넘어간다 */
async function alimtalk(t: Target): Promise<DispatchStatus> {
  const cfg = solapiConfig();
  if (!cfg) return "skipped";
  const tpl = TEMPLATES[t.event];
  const log = async (status: DispatchStatus, detail: string) => {
    await writeLog(t, "alimtalk", maskPhone(t.to), status, detail);
    return status;
  };
  try {
    const to = phoneDigits(t.to);
    if (!/^01\d{8,9}$/.test(to)) return log("skipped", "받을 휴대폰 번호가 없어요");
    const text = render(tpl.body, t.vars);
    let message: SolapiMessage;
    if (tpl.toAdmin) {
      if (!cfg.sender) return log("skipped", "운영자 문자 발신번호(SOLAPI_SENDER) 없음");
      message = { to, from: cfg.sender, text };
    } else {
      const templateId = templateIds()[t.event];
      if (!templateId) return log("skipped", `템플릿 ID 없음 (SOLAPI_TEMPLATES에 ${t.event} 추가 필요)`);
      // 알림톡이 실패하면 같은 내용을 문자로 보낸다 (발신번호가 있을 때)
      message = {
        to,
        ...(cfg.sender ? { from: cfg.sender, text } : {}),
        kakaoOptions: { pfId: cfg.pfId, templateId, variables: Object.fromEntries(Object.entries(t.vars).map(([k, v]) => [`#{${k}}`, v])), disableSms: !cfg.sender },
      };
    }
    const r = await solapiSend(cfg, message);
    return log(r.ok ? "sent" : "failed", r.detail);
  } catch (e) {
    console.error("alimtalk failed", t.event, e);
    return log("failed", e instanceof Error ? e.message : String(e));
  }
}

/** 웹 푸시 (무료) */
async function push(t: Target, customerId: string | null, admin = false): Promise<DispatchStatus> {
  const m = simpleMessage(t.event, t.vars);
  if (!m) return "skipped";
  try {
    const payload = { title: m.title, body: m.lines.filter(Boolean).join(" "), url: t.vars.링크 };
    const r = admin ? await pushToAdmins(payload) : customerId ? await pushToCustomer(customerId, payload) : null;
    if (!r) return "skipped";
    await writeLog(t, "push", admin ? "운영자 기기" : "고객 기기", r.status, r.detail);
    return r.status;
  } catch (e) {
    console.error("push failed", t.event, e);
    await writeLog(t, "push", admin ? "운영자 기기" : "고객 기기", "failed", e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

/** 주문 상태 알림 (고객에게) */
export async function notifyOrder(event: NotifyEvent, order: Order, extra?: Record<string, string>): Promise<void> {
  const t: Target = { event, to: order.phone, vars: orderVars(order, extra), orderId: order.id };
  await Promise.all([push(t, order.customerId), alimtalk(t)]);
}

/** 운영자에게 새 신청 알림 */
export async function notifyAdminOrder(order: Order): Promise<void> {
  const t: Target = { event: "ADMIN_NEW_ORDER", to: process.env.ADMIN_PHONE ?? "", vars: { ...orderVars(order), 링크: `${appUrl()}/admin/orders/${order.id}` }, orderId: order.id };
  await Promise.all([push(t, null, true), t.to ? alimtalk(t) : Promise.resolve("skipped")]);
}

export async function notifyAdminInquiry(q: Inquiry): Promise<void> {
  const t: Target = {
    event: "ADMIN_NEW_INQUIRY",
    to: process.env.ADMIN_PHONE ?? "",
    vars: { 동호: unit(q.dong, q.ho), 문의종류: q.kind === "pin_reset" ? "비밀번호 재설정 요청" : "일반 문의", 링크: `${appUrl()}/admin/inquiries` },
    inquiryId: q.id,
  };
  await Promise.all([push(t, null, true), t.to ? alimtalk(t) : Promise.resolve("skipped")]);
}

export async function notifyInquiryAnswered(q: Inquiry): Promise<void> {
  const order = q.orderId ? await getStore().getOrder(q.orderId) : null;
  const t: Target = { event: "INQUIRY_ANSWERED", to: q.phone, vars: { 동호: unit(q.dong, q.ho), 링크: order ? shortLink(order) : `${appUrl()}/help` }, inquiryId: q.id };
  await Promise.all([push(t, q.customerId), alimtalk(t)]);
}

/** 새 로그인 비밀번호를 계정에 등록된 번호로 보낸다 (알림톡이 설정됐을 때만. 푸시는 잠금 화면에 보여서 쓰지 않는다) */
export async function notifyPinReset(dong: string, ho: string, phone: string, pin: string, inquiryId: string | null): Promise<DispatchStatus> {
  return alimtalk({ event: "PIN_RESET", to: phone, vars: { 동호: unit(dong, ho), 비밀번호: pin, 링크: `${appUrl()}/login` }, inquiryId });
}
