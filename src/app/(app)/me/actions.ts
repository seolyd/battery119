"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { encryptDoorCode } from "@/lib/crypto";
import { normalizePhone } from "@/lib/orderRules";
import { getStore } from "@/lib/store";

export interface ProfileState {
  ok?: boolean;
  error?: string;
}

export async function saveProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요해요." };
  const dong = String(formData.get("dong") ?? "").trim();
  const ho = String(formData.get("ho") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const door = String(formData.get("door") ?? "").trim();
  if (dong && !/^\d{3}$/.test(dong)) return { error: "동은 숫자 3자리로 적어 주세요." };
  if (ho && !/^\d{3,4}$/.test(ho)) return { error: "호는 숫자 3~4자리로 적어 주세요." };
  if (door.length > 30) return { error: "공동현관 비밀번호가 너무 길어요." };
  await getStore().updateCustomer(session.userId, {
    dong: dong || null,
    ho: ho || null,
    phone: phone ? normalizePhone(phone) : null,
    // 비워 두면 기존 비밀번호를 그대로 둔다
    ...(door ? { doorCodeEnc: encryptDoorCode(door) } : {}),
  });
  revalidatePath("/me");
  return { ok: true };
}
