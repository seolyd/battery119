// 휴대폰 번호 확인. 화면과 서버가 같은 규칙을 쓴다.
// 띄어쓰기, 점, 하이픈은 어떻게 적어도 숫자만 보고 판단한다.

export function phoneDigits(p: string): string {
  return p.replace(/\D/g, "");
}

export function isValidPhone(p: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phoneDigits(p));
}

/** 010-1234-5678 형식으로 맞춘다 */
export function normalizePhone(p: string): string {
  const d = phoneDigits(p);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return p.trim();
}
