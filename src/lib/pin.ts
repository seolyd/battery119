import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// 4자리 비밀번호는 scrypt로 해시해서 저장한다. 저장 형식: s1.<salt base64>.<hash base64>

const N = 16384;
const KEYLEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEYLEN, { N });
  return `s1.${salt.toString("base64")}.${hash.toString("base64")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [v, salt, hash] = stored.split(".");
  if (v !== "s1" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(pin, Buffer.from(salt, "base64"), expected.length, { N });
  return timingSafeEqual(actual, expected);
}

/** 해시 비교 시간을 맞추기 위해, 없는 세대로 로그인할 때도 한 번 계산한다 */
export function burnPinCheck(pin: string): void {
  scryptSync(pin, "battery119-dummy-salt", KEYLEN, { N });
}
