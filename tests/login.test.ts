import { describe, expect, it } from "vitest";
import { afterFailure, checkNewPin, isWeakPin, lockedMinutes, LoginError, MAX_FAILS, normalizeUnit } from "@/lib/loginRules";
import { hashPin, verifyPin } from "@/lib/pin";
import { adminSession, customerSession, decodeSession, encodeSession } from "@/lib/session";

describe("동·호수", () => {
  it("숫자만 남기고 형식을 확인한다", () => {
    expect(normalizeUnit(" 215동", "1203호")).toEqual({ dong: "215", ho: "1203" });
    expect(() => normalizeUnit("21", "1203")).toThrow(LoginError);
    expect(() => normalizeUnit("215", "12")).toThrow(LoginError);
  });
});

describe("4자리 비밀번호", () => {
  it("쉬운 번호를 거절한다", () => {
    for (const p of ["0000", "1111", "1234", "4321", "7890", "1212", "6789"]) expect(isWeakPin(p)).toBe(true);
    for (const p of ["2580", "7314", "1029"]) expect(isWeakPin(p)).toBe(false);
  });
  it("숫자 4자리, 확인 일치를 요구한다", () => {
    expect(() => checkNewPin("123", "123")).toThrow(/4자리/);
    expect(() => checkNewPin("2580", "2581")).toThrow(/확인/);
    expect(() => checkNewPin("1234", "1234")).toThrow(/쉬운/);
    expect(() => checkNewPin("2580", "2580")).not.toThrow();
  });
  it("해시로 저장하고 맞는 번호만 통과한다", () => {
    const h = hashPin("2580");
    expect(h).not.toContain("2580");
    expect(verifyPin("2580", h)).toBe(true);
    expect(verifyPin("2581", h)).toBe(false);
    expect(verifyPin("2580", "garbage")).toBe(false);
  });
});

describe("잠금", () => {
  it(`${MAX_FAILS}번 틀리면 15분 잠근다`, () => {
    const now = new Date("2026-11-23T10:00:00Z");
    let st = { failedCount: 0, lockedUntil: null as string | null };
    for (let i = 0; i < MAX_FAILS - 1; i++) st = afterFailure(st.failedCount, now);
    expect(st.lockedUntil).toBeNull();
    st = afterFailure(st.failedCount, now);
    expect(lockedMinutes(st.lockedUntil, now)).toBe(15);
    expect(lockedMinutes(st.lockedUntil, new Date("2026-11-23T10:16:00Z"))).toBe(0);
  });
});

describe("로그인 쿠키", () => {
  it("서명한 값만 받아들이고 만료를 확인한다", () => {
    const now = Date.now();
    const t = encodeSession(customerSession("u1", now));
    expect(decodeSession(t, now)).toMatchObject({ role: "customer", uid: "u1" });
    expect(decodeSession(t, now + 181 * 86400_000)).toBeNull();
    // 내용을 바꿔치기하면 거절
    const forged = Buffer.from(JSON.stringify(adminSession(now))).toString("base64url") + "." + t.split(".")[1];
    expect(decodeSession(forged, now)).toBeNull();
    expect(decodeSession("abc", now)).toBeNull();
    expect(decodeSession(undefined, now)).toBeNull();
  });
});
