"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { encryptDoorCode } from "@/lib/crypto";
import { checkNewPin, LoginError } from "@/lib/loginRules";
import { normalizePhone } from "@/lib/orderRules";
import { hashPin, verifyPin } from "@/lib/pin";
import { getStore } from "@/lib/store";

export interface ProfileState {
  ok?: string;
  error?: string;
}

export async function saveProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요해요." };
  const name = String(formData.get("name") ?? "").trim().slice(0, 20);
  const phone = String(formData.get("phone") ?? "").trim();
  const door = String(formData.get("door") ?? "").trim();
  if (door.length > 30) return { error: "공동현관 비밀번호가 너무 길어요." };
  await getStore().updateCustomer(session.userId, {
    name: name || null,
    phone: phone ? normalizePhone(phone) : null,
    // 비워 두면 기존 비밀번호를 그대로 둔다
    ...(door ? { doorCodeEnc: encryptDoorCode(door) } : {}),
  });
  revalidatePath("/me");
  return { ok: "저장했어요." };
}

export async function changePin(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요해요." };
  const current = String(formData.get("current") ?? "");
  const pin = String(formData.get("pin") ?? "");
  try {
    if (!verifyPin(current, session.customer.pinHash)) return { error: "지금 비밀번호가 맞지 않아요." };
    checkNewPin(pin, String(formData.get("pin2") ?? ""));
  } catch (e) {
    if (e instanceof LoginError) return { error: e.message };
    throw e;
  }
  await getStore().updateCustomer(session.userId, { pinHash: hashPin(pin), failedCount: 0, lockedUntil: null });
  return { ok: "비밀번호를 바꿨어요." };
}
