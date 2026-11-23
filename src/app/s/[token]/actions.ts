"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSession } from "@/lib/auth";
import { notifyAdminInquiry } from "@/lib/notify";
import { customerSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import { isAccessToken } from "@/lib/token";

async function orderFor(token: string) {
  if (!isAccessToken(token)) return null;
  return getStore().getOrderByToken(token);
}

export interface TokenInquiryState {
  ok?: boolean;
  error?: string;
}

/** 문자 링크 화면에서 바로 묻기 (로그인 없이). 이 주문에 대한 문의로 남는다 */
export async function askFromLink(token: string, _: TokenInquiryState, form: FormData): Promise<TokenInquiryState> {
  const order = await orderFor(token);
  if (!order) return { error: "주문을 찾을 수 없어요." };
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 2) return { error: "물어보실 내용을 적어 주세요." };
  const store = getStore();
  // 같은 링크로 하루에 너무 많이 보내지 못하게
  const since = new Date(Date.now() - 86400_000).toISOString();
  const recent = (await store.listInquiries({ customerId: order.customerId })).filter((q) => q.orderId === order.id && q.createdAt >= since);
  if (recent.length >= 5) return { error: "오늘은 더 보낼 수 없어요. 답변을 기다려 주세요." };
  const q = await store.createInquiry({
    kind: "general",
    customerId: order.customerId,
    orderId: order.id,
    dong: order.dong,
    ho: order.ho,
    phone: order.phone,
    body: body.slice(0, 1000),
  });
  await notifyAdminInquiry(q);
  revalidatePath(`/s/${token}`);
  return { ok: true };
}

/**
 * "이 휴대폰으로 계속 쓰기": 문자로 받은 링크를 가진 사람을 그 고객으로 로그인시킨다.
 * 문자는 가입할 때 등록한 번호로만 보내므로 문자 인증과 같은 수준으로 본다.
 * 로그인해도 공동현관 비밀번호는 화면에 나오지 않고, 비밀번호 변경은 지금 비밀번호가 있어야 한다.
 */
export async function continueOnThisPhone(token: string) {
  const order = await orderFor(token);
  if (!order) redirect("/login");
  await setSession(customerSession(order.customerId));
  redirect("/");
}
