"use server";

import { getSession, isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { isAccessToken } from "@/lib/token";

export interface PushSubInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * 이 기기에서 알림 받기.
 * - 문자 링크 화면(token): 그 주문의 고객 기기로 저장 (로그인 없이)
 * - 관리자 화면(admin): 운영자 기기로 저장
 * - 그 밖에는 로그인한 고객 기기로 저장
 */
export async function savePushSubscription(sub: PushSubInput, opts: { token?: string; admin?: boolean; userAgent?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, error: "알림 정보를 받지 못했어요." };
  const store = getStore();
  let customerId: string | null = null;
  let admin = false;

  if (opts.admin) {
    if (!(await isAdmin())) return { ok: false, error: "관리자만 켤 수 있어요." };
    admin = true;
  } else if (opts.token) {
    if (!isAccessToken(opts.token)) return { ok: false, error: "링크가 올바르지 않아요." };
    const order = await store.getOrderByToken(opts.token);
    if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };
    customerId = order.customerId;
  } else {
    const s = await getSession();
    if (!s) return { ok: false, error: "로그인이 필요해요." };
    customerId = s.userId;
  }

  await store.savePushSubscription({
    customerId,
    admin,
    endpoint: sub.endpoint.slice(0, 1000),
    p256dh: sub.keys.p256dh.slice(0, 200),
    auth: sub.keys.auth.slice(0, 100),
    userAgent: opts.userAgent?.slice(0, 300) ?? null,
  });
  return { ok: true };
}
