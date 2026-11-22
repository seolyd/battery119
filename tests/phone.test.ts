import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone } from "@/lib/phone";

describe("휴대폰 번호", () => {
  it("띄어쓰기, 점, 하이픈 없이 적어도 받는다", () => {
    for (const p of ["01012345678", "010-1234-5678", "010 1234 5678", "010.1234.5678", " 010-1234-5678 ", "0111234567"]) {
      expect(isValidPhone(p)).toBe(true);
    }
  });
  it("휴대폰 번호가 아니면 거절한다", () => {
    for (const p of ["", "1234", "02-123-4567", "010-123-45", "010123456789", "abc"]) expect(isValidPhone(p)).toBe(false);
  });
  it("010-1234-5678 형식으로 맞춘다", () => {
    expect(normalizePhone("010 1234 5678")).toBe("010-1234-5678");
    expect(normalizePhone("0111234567")).toBe("011-123-4567");
  });
});
