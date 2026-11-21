// 동·호수 + 4자리 비밀번호 로그인 규칙. 저장소와 분리해서 테스트한다.

export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;
/** 같은 접속지(IP)에서 1시간에 틀릴 수 있는 횟수. 여러 세대를 돌아가며 찍는 시도를 막는다 */
export const IP_MAX_FAILS_PER_HOUR = 20;

export class LoginError extends Error {}

export function normalizeUnit(dong: string, ho: string): { dong: string; ho: string } {
  const d = dong.replace(/\D/g, "");
  const h = ho.replace(/\D/g, "");
  if (!/^\d{3}$/.test(d)) throw new LoginError("동은 숫자 3자리로 적어 주세요. (예: 215)");
  if (!/^\d{3,4}$/.test(h)) throw new LoginError("호는 숫자 3~4자리로 적어 주세요. (예: 1203)");
  return { dong: d, ho: h };
}

const SEQUENCES = "01234567890 98765432109";

/** 쉽게 맞힐 수 있는 비밀번호인지 */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true; // 0000, 1111
  if (SEQUENCES.includes(pin)) return true; // 1234, 4321, 7890
  if (/^(\d\d)\1$/.test(pin)) return true; // 1212
  return false;
}

export function checkNewPin(pin: string, confirm: string): void {
  if (!/^\d{4}$/.test(pin)) throw new LoginError("비밀번호는 숫자 4자리로 정해 주세요.");
  if (pin !== confirm) throw new LoginError("비밀번호 확인이 맞지 않아요.");
  if (isWeakPin(pin)) throw new LoginError("1234, 1111처럼 쉬운 번호는 쓸 수 없어요. 다른 번호로 정해 주세요.");
}

/** 잠겨 있으면 남은 분을 돌려준다 */
export function lockedMinutes(lockedUntil: string | null, now: Date = new Date()): number {
  if (!lockedUntil) return 0;
  const ms = new Date(lockedUntil).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

/** 비밀번호를 틀렸을 때 저장할 값 */
export function afterFailure(failedCount: number, now: Date = new Date()): { failedCount: number; lockedUntil: string | null } {
  const n = failedCount + 1;
  if (n >= MAX_FAILS) return { failedCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString() };
  return { failedCount: n, lockedUntil: null };
}
