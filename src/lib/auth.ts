import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Customer } from "@/lib/domain";
import { decodeSession, encodeSession, SESSION_COOKIE, type SessionPayload } from "@/lib/session";
import { getStore, isDemoMode } from "@/lib/store";

// 로그인: 고객은 동·호수 + 4자리 비밀번호, 운영자는 관리자 비밀번호(ADMIN_PASSWORD)

export interface Session {
  userId: string;
  customer: Customer;
}

async function payload(): Promise<SessionPayload | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function setSession(p: SessionPayload): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, encodeSession(p), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isDemoMode(),
    path: "/",
    expires: new Date(p.exp),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** 로그인한 고객. 운영자 세션이거나 계정이 없어졌으면 null */
export async function getSession(): Promise<Session | null> {
  const p = await payload();
  if (!p || p.role !== "customer") return null;
  const customer = await getStore().getCustomer(p.uid);
  return customer ? { userId: customer.id, customer } : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await payload())?.role === "admin";
}

export async function requireUser(next: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin-login");
}

/** 운영자 비밀번호. 데모 모드에서는 정하지 않았으면 "admin-demo" */
export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  if (p && p.length >= 10) return p;
  return isDemoMode() ? "admin-demo" : null;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/admin") ? v : "/";
}
