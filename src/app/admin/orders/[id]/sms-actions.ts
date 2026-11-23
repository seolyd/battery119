"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { NotifyEvent } from "@/lib/domain";
import { maskPhone } from "@/lib/notify";
import { getStore } from "@/lib/store";

/** 운영자가 "문자 보내기"를 눌렀다는 기록. 실제로 전송했는지는 휴대폰 문자 앱이라 알 수 없다 */
export async function logManualSms(orderId: string, event: NotifyEvent, edited: boolean, via: "sms" | "kakao" = "sms"): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return;
  await store.addNotification({
    event,
    channel: via === "kakao" ? "kakao_manual" : "sms_manual",
    orderId,
    inquiryId: null,
    toMasked: maskPhone(order.phone),
    status: "manual",
    detail:
      (via === "kakao" ? "카톡 채널용 문구를 복사했어요" : "운영자 휴대폰 문자 앱을 열었어요") + (edited ? " (내용 고침)" : ""),
  });
}

/** 고객이 카카오톡 채널에 동·호수를 보내 왔을 때 "카톡 연결됨"으로 표시 (끄기도 가능) */
export async function setKakaoLinked(orderId: string, linked: boolean): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return;
  await store.updateCustomer(order.customerId, { kakaoLinkedAt: linked ? new Date().toISOString() : null });
  revalidatePath(`/admin/orders/${orderId}`);
}
