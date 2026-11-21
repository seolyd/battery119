"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { CUSTOMER_CANCELABLE, inWarranty } from "@/lib/domain";
import { getStore } from "@/lib/store";

async function ownOrder(orderId: string) {
  const session = await getSession();
  if (!session) throw new Error("로그인이 필요해요.");
  const order = await getStore().getOrder(orderId);
  if (!order || order.customerId !== session.userId) throw new Error("주문을 찾을 수 없어요.");
  return order;
}

export async function cancelOrder(orderId: string) {
  const order = await ownOrder(orderId);
  if (!CUSTOMER_CANCELABLE.includes(order.status)) throw new Error("수거가 시작된 주문은 카카오톡 상담으로 취소해 주세요.");
  const store = getStore();
  await store.updateOrder(order.id, { status: "CANCELED" });
  await store.addEvent({ orderId: order.id, from: order.status, to: "CANCELED", actor: "customer", note: "고객 취소" });
  revalidatePath(`/orders/${order.id}`);
}

export async function requestAs(orderId: string, formData: FormData) {
  const order = await ownOrder(orderId);
  if (!inWarranty(order)) throw new Error("보증 기간이 지났어요.");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || "AS 요청";
  const store = getStore();
  await store.updateOrder(order.id, { status: "AS_REQUESTED" });
  await store.addEvent({ orderId: order.id, from: order.status, to: "AS_REQUESTED", actor: "customer", note });
  revalidatePath(`/orders/${order.id}`);
}
