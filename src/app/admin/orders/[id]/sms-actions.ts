"use server";

import { requireAdmin } from "@/lib/auth";
import type { NotifyEvent } from "@/lib/domain";
import { maskPhone } from "@/lib/notify";
import { getStore } from "@/lib/store";

/** 운영자가 "문자 보내기"를 눌렀다는 기록. 실제로 전송했는지는 휴대폰 문자 앱이라 알 수 없다 */
export async function logManualSms(orderId: string, event: NotifyEvent, edited: boolean): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return;
  await store.addNotification({
    event,
    channel: "sms_manual",
    orderId,
    inquiryId: null,
    toMasked: maskPhone(order.phone),
    status: "manual",
    detail: edited ? "운영자 휴대폰 문자 앱을 열었어요 (내용 고침)" : "운영자 휴대폰 문자 앱을 열었어요",
  });
}
