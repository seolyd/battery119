import { randomBytes } from "node:crypto";

/** 문자 바로가기 링크 코드. 12자 (72비트) — 짐작해서 남의 주문을 찾을 수 없다 */
export function newAccessToken(): string {
  return randomBytes(9).toString("base64url");
}

export function isAccessToken(t: string): boolean {
  return /^[A-Za-z0-9_-]{12}$/.test(t);
}
