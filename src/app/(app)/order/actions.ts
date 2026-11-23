"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { encryptDoorCode } from "@/lib/crypto";
import { buildOrder, RuleError, type OrderInput, type RuleField } from "@/lib/orderRules";
import { notifyAdminOrder, notifyOrder } from "@/lib/notify";
import { getStore } from "@/lib/store";

export interface SubmitResult {
  error?: string;
  /** 고칠 단계 */
  field?: RuleField;
}

/** 주소(동·호수)는 계정에서 가져온다. 공동현관 비밀번호는 새로 적었을 때만 바꾼다. */
export type WizardInput = Omit<OrderInput, "dong" | "ho"> & { doorCode: string };

export async function submitOrder(input: WizardInput): Promise<SubmitResult> {
  const session = await getSession();
  if (!session) return { error: "로그인이 풀렸어요. 다시 로그인한 뒤 신청해 주세요." };
  const { customer } = session;
  const store = getStore();
  const doorCode = input.doorCode.trim();

  let orderId: string;
  try {
    if (!doorCode && !customer.doorCodeEnc) throw new RuleError("공동현관 비밀번호를 적어 주세요.", "pickup");
    if (doorCode.length > 30) throw new RuleError("공동현관 비밀번호가 너무 길어요.", "pickup");
    const model = input.modelId ? await store.getModel(input.modelId) : null;
    if (input.modelId && !model) return { error: "모델 정보를 찾을 수 없어요. 처음부터 다시 골라 주세요." };
    const draft = buildOrder({ ...input, dong: customer.dong, ho: customer.ho }, model, customer.id);
    const order = await store.createOrder(draft);
    await store.addEvent({ orderId: order.id, from: null, to: order.status, actor: "customer", note: "신청 접수" });
    await store.updateCustomer(customer.id, {
      phone: draft.phone,
      ...(doorCode ? { doorCodeEnc: encryptDoorCode(doorCode) } : {}),
    });
    orderId = order.id;
    // 알림은 실패해도 신청은 완료된다 (발송 결과는 관리자 주문 상세에 기록)
    await Promise.all([notifyOrder("ORDER_RECEIVED", order), notifyAdminOrder(order)]);
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message, field: e.field };
    console.error("submitOrder failed", e);
    return { error: "신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  redirect(`/orders/${orderId}?new=1`);
}
