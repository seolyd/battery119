"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s ? Number(s) : null;
};

export async function updateModel(id: string, formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const model = await store.getModel(id);
  if (!model) throw new Error("모델을 찾을 수 없어요.");

  const active = formData.get("active") === "on";
  const partnerId = (formData.get("partnerId") as string) || null;
  if (model.options.length) {
    const options = model.options.map((o, i) => ({
      ...o,
      partnerCost: num(formData.get(`cost${i}`)) ?? o.partnerCost,
      price: num(formData.get(`price${i}`)) ?? o.price,
    }));
    await store.updateModel(id, { options, partnerCost: options[0].partnerCost, price: options[0].price, active, partnerId });
  } else {
    await store.updateModel(id, {
      partnerCost: num(formData.get("cost0")) ?? model.partnerCost,
      price: num(formData.get("price0")) ?? model.price,
      active,
      partnerId,
    });
  }
  revalidatePath("/admin/models");
}
