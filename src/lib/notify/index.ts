import "server-only";
import { CATEGORY_LABEL, formatWon, warrantyEnds, type Inquiry, type NotifyEvent, type Order } from "@/lib/domain";
import { phoneDigits } from "@/lib/phone";
import { formatDay, pickupDateFor, SAME_DAY_CUTOFF_HOUR, seoulToday } from "@/lib/schedule";
import { getStore } from "@/lib/store";
import { solapiConfig, solapiSend, type SolapiMessage } from "./solapi";
import { render, TEMPLATES } from "./templates";

// 알림 보내기. 실패해도 주문 처리는 그대로 진행되도록 오류를 밖으로 던지지 않고 기록만 남긴다.

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
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
  const link = `${appUrl()}/orders/${o.id}`;
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
    링크: link,
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

async function dispatch(t: Target): Promise<DispatchStatus> {
  const store = getStore();
  const tpl = TEMPLATES[t.event];
  const log = async (status: DispatchStatus, detail: string): Promise<DispatchStatus> => {
    await store
      .addNotification({ event: t.event, orderId: t.orderId ?? null, inquiryId: t.inquiryId ?? null, toMasked: maskPhone(t.to), status, detail })
      .catch((e) => console.error("notification log failed", e));
    return status;
  };

  try {
    const to = phoneDigits(t.to);
    if (!/^01\d{8,9}$/.test(to)) return log("skipped", "받을 휴대폰 번호가 없어요");
    const text = render(tpl.body, t.vars);
    const cfg = solapiConfig();
    if (!cfg) return log("skipped", "알림톡 설정 전 (SOLAPI_* 환경 변수 없음)");

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
    console.error("notify failed", t.event, e);
    return log("failed", e instanceof Error ? e.message : String(e));
  }
}

/** 주문 상태 알림 (고객에게) */
export async function notifyOrder(event: NotifyEvent, order: Order, extra?: Record<string, string>): Promise<void> {
  await dispatch({ event, to: order.phone, vars: orderVars(order, extra), orderId: order.id });
}

/** 운영자에게 새 신청 알림 (문자) */
export async function notifyAdminOrder(order: Order): Promise<void> {
  const to = process.env.ADMIN_PHONE;
  if (!to) return;
  await dispatch({ event: "ADMIN_NEW_ORDER", to, vars: { ...orderVars(order), 링크: `${appUrl()}/admin/orders/${order.id}` }, orderId: order.id });
}

export async function notifyAdminInquiry(q: Inquiry): Promise<void> {
  const to = process.env.ADMIN_PHONE;
  if (!to) return;
  await dispatch({
    event: "ADMIN_NEW_INQUIRY",
    to,
    vars: { 동호: unit(q.dong, q.ho), 문의종류: q.kind === "pin_reset" ? "비밀번호 재설정 요청" : "일반 문의", 링크: `${appUrl()}/admin/inquiries` },
    inquiryId: q.id,
  });
}

export async function notifyInquiryAnswered(q: Inquiry): Promise<void> {
  await dispatch({ event: "INQUIRY_ANSWERED", to: q.phone, vars: { 동호: unit(q.dong, q.ho), 링크: `${appUrl()}/help` }, inquiryId: q.id });
}

/** 새 로그인 비밀번호를 계정에 등록된 번호로 보낸다 */
export async function notifyPinReset(dong: string, ho: string, phone: string, pin: string, inquiryId: string | null): Promise<DispatchStatus> {
  return dispatch({ event: "PIN_RESET", to: phone, vars: { 동호: unit(dong, ho), 비밀번호: pin, 링크: `${appUrl()}/login` }, inquiryId });
}

