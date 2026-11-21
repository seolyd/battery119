"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { decryptDoorCode } from "@/lib/crypto";
import { STATUS_LABEL, type OrderStatus } from "@/lib/domain";
import { RuleError, transitionPatch } from "@/lib/orderRules";
import { getStore } from "@/lib/store";

export interface ActionState {
  error?: string;
  ok?: string;
}

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s ? Number(s) : null;
};

export async function changeStatus(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return { error: "주문을 찾을 수 없어요." };
  const to = String(formData.get("to")) as OrderStatus;

  try {
    const closed = await store.listClosedDates();
    const patch = transitionPatch(
      order,
      to,
      {
        price: num(formData.get("price")),
        partnerCost: num(formData.get("partnerCost")),
        depositorName: (formData.get("depositorName") as string) ?? null,
        deliveryDate: (formData.get("deliveryDate") as string) || null,
        partnerId: (formData.get("partnerId") as string) || null,
        refunded: formData.get("refunded") === "on",
      },
      new Date(),
      closed,
    );

    if (to === "DELIVERY_SCHEDULED" && order.status === "QC") {
      const ins = await store.getInspection(order.id);
      if (!ins?.passed) return { error: "품질검사를 통과해야 배송을 잡을 수 있어요." };
    }

    await store.updateOrder(order.id, patch);
    const note = String(formData.get("note") ?? "").trim() || null;
    await store.addEvent({ orderId: order.id, from: order.status, to, actor: "admin", note });
  } catch (e) {
    if (e instanceof RuleError) return { error: e.message };
    console.error(e);
    return { error: "상태를 바꾸지 못했어요. 다시 시도해 주세요." };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  return { ok: `${STATUS_LABEL[to]}(으)로 바꿨어요.` };
}

export async function saveInspection(orderId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status !== "QC") return { error: "품질검사 단계의 주문만 기록할 수 있어요." };
  const chargeOk = formData.get("chargeOk") === "on";
  const heatOk = formData.get("heatOk") === "on";
  const exteriorOk = formData.get("exteriorOk") === "on";
  const runtimeMin = num(formData.get("runtimeMin"));
  const passed = chargeOk && heatOk && exteriorOk;
  await store.saveInspection({
    orderId,
    chargeOk,
    heatOk,
    exteriorOk,
    runtimeMin,
    passed,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return passed ? { ok: "합격으로 기록했어요. 배송일을 잡아 주세요." } : { error: "불합격으로 기록했어요. 업체로 다시 보내 주세요." };
}

export async function revealDoorCode(customerId: string): Promise<string> {
  await requireAdmin();
  const c = await getStore().getCustomer(customerId);
  if (!c?.doorCodeEnc) return "저장된 비밀번호가 없어요";
  try {
    return decryptDoorCode(c.doorCodeEnc);
  } catch {
    return "복호화하지 못했어요. 고객에게 다시 받아 주세요.";
  }
}
