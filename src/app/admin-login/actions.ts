"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { adminPassword, clearSession, clientIp, setSession } from "@/lib/auth";
import { IP_MAX_FAILS_PER_HOUR } from "@/lib/loginRules";
import { adminSession } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function adminLogin(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const expected = adminPassword();
  if (!expected) return { error: "ADMIN_PASSWORD가 설정되지 않았어요." };
  const store = getStore();
  const ip = await clientIp();
  const since = new Date(Date.now() - 3600_000).toISOString();
  if ((await store.countLoginFailures(ip, since)) >= IP_MAX_FAILS_PER_HOUR) return { error: "시도가 너무 많아요. 1시간 뒤에 다시 시도해 주세요." };

  const a = Buffer.from(String(form.get("password") ?? ""));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await store.recordLoginFailure(ip);
    return { error: "비밀번호가 맞지 않아요." };
  }
  await setSession(adminSession());
  redirect("/admin");
}

export async function adminLogout() {
  await clearSession();
  redirect("/admin-login");
}
