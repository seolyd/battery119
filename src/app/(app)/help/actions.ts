"use server";

import { revalidatePath } from "next/cache";
import { clientIp, getSession } from "@/lib/auth";
import { LoginError, normalizeUnit } from "@/lib/loginRules";
import { notifyAdminInquiry } from "@/lib/notify";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { getStore } from "@/lib/store";

export interface HelpState {
  ok?: string;
  error?: string;
}

const MAX_BODY = 1000;
const RESET_LIMIT_PER_HOUR = 5;

/** 로그인한 고객의 문의 */
export async function sendInquiry(_: HelpState, form: FormData): Promise<HelpState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요해요." };
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 2) return { error: "문의 내용을 적어 주세요." };
  if (body.length > MAX_BODY) return { error: `문의는 ${MAX_BODY}자까지 적을 수 있어요.` };
  const store = getStore();

  let orderId = String(form.get("orderId") ?? "") || null;
  if (orderId) {
    const o = await store.getOrder(orderId);
    if (!o || o.customerId !== session.userId) orderId = null;
  }
  const c = session.customer;
  const q = await store.createInquiry({
    kind: "general",
    customerId: c.id,
    orderId,
    dong: c.dong,
    ho: c.ho,
    phone: c.phone ?? "",
    body,
  });
  await notifyAdminInquiry(q);
  revalidatePath("/help");
  return { ok: c.phone ? "문의를 보냈어요. 답변이 등록되면 알림톡으로 알려 드려요." : "문의를 보냈어요. 답변은 이 화면에서 확인해 주세요." };
}

/** 로그인 없이 보내는 비밀번호 재설정 요청. 계정이 있는지 여부는 알려 주지 않는다. */
export async function requestPinReset(_: HelpState, form: FormData): Promise<HelpState> {
  const store = getStore();
  const ipKey = `pin-reset:${await clientIp()}`;
  const since = new Date(Date.now() - 3600_000).toISOString();
  if ((await store.countLoginFailures(ipKey, since)) >= RESET_LIMIT_PER_HOUR) {
    return { error: "요청이 너무 많아요. 1시간 뒤에 다시 시도해 주세요." };
  }
  let dong: string, ho: string;
  try {
    ({ dong, ho } = normalizeUnit(String(form.get("dong") ?? ""), String(form.get("ho") ?? "")));
  } catch (e) {
    if (e instanceof LoginError) return { error: e.message };
    throw e;
  }
  const phone = String(form.get("phone") ?? "");
  if (!isValidPhone(phone)) return { error: "연락처를 010-1234-5678처럼 휴대폰 번호로 적어 주세요." };
  const memo = String(form.get("memo") ?? "").trim().slice(0, 300);

  await store.recordLoginFailure(ipKey);
  const account = await store.findCustomerByUnit(dong, ho);
  const q = await store.createInquiry({
    kind: "pin_reset",
    customerId: account?.id ?? null,
    orderId: null,
    dong,
    ho,
    phone: normalizePhone(phone),
    body: memo || "로그인 비밀번호 재설정 요청",
  });
  await notifyAdminInquiry(q);
  return { ok: "요청을 받았어요. 확인한 뒤 가입할 때 등록한 휴대폰 번호로 새 비밀번호를 알림톡으로 보내 드려요." };
}
