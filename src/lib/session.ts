import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// 서명한 쿠키로 로그인 상태를 기억한다. 형식: <payload base64url>.<HMAC-SHA256 base64url>

export const SESSION_COOKIE = "b119_session";
export const CUSTOMER_DAYS = 180;
export const ADMIN_HOURS = 12;

export type SessionPayload = { role: "customer"; uid: string; exp: number } | { role: "admin"; exp: number };

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return Buffer.from(s);
  if (process.env.SUPABASE_URL) throw new Error("SESSION_SECRET(32자 이상)이 필요해요.");
  return createHash("sha256").update("battery119-demo-session").digest(); // 데모 전용
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeSession(p: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeSession(token: string | undefined, now: number = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (typeof p.exp !== "number" || p.exp < now) return null;
    if (p.role === "customer" && typeof p.uid === "string") return p;
    if (p.role === "admin") return p;
    return null;
  } catch {
    return null;
  }
}

export function customerSession(uid: string, now: number = Date.now()): SessionPayload {
  return { role: "customer", uid, exp: now + CUSTOMER_DAYS * 86400_000 };
}

export function adminSession(now: number = Date.now()): SessionPayload {
  return { role: "admin", exp: now + ADMIN_HOURS * 3600_000 };
}
