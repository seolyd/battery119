"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { encryptDoorCode } from "@/lib/crypto";
import { buildOrder, RuleError, type OrderInput } from "@/lib/orderRules";
import { getStore } from "@/lib/store";

export interface SubmitResult {
  error?: string;
}

export async function submitOrder(input: OrderInput): Promise<SubmitResult> {
  const session = await getSession();
  if (!session) return { error: "로그인이 풀렸어요. 다시 로그인한 뒤 신청해 주세요." };
  const store = getStore();

  let orderId: string;
  try {
    const model = input.modelId ? await store.getModel(input.modelId) : null;
    if (input.modelId && !model) return { error: "모델 정보를 찾을 수 없어요. 처음부터 다시 골라 주세요." };
    const draft = buildOrder(input, model, session.userId);
    const order = await store.createOrder(draft);
    await store.addEvent({ orderId: order.id, from: null, to: order.status, actor: "customer", note: "신청 접수" });
    // 다음 신청 때 다시 입력하지 않도록 고객 정보에 저장
    await store.updateCustomer(session.userId, {
      dong: draft.dong,
      ho: draft.ho,
      phone: draft.phone,
      doorCodeEnc: encryptDoorCode(input.doorCode.trim()),
    });
    orderId = order.id;
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    console.error("submitOrder failed", e);
    return { error: "신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  redirect(`/orders/${orderId}?new=1`);
}
