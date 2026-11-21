import { describe, expect, it } from "vitest";
import { formatDay, isDeliveryDay, nextDeliveryDate, pickupDateFor, seoulNow, weekday } from "@/lib/schedule";

// 서울 시간 = UTC + 9
const seoul = (iso: string) => new Date(iso + "+09:00");

describe("seoulNow", () => {
  it("서버가 UTC여도 서울 날짜·시각으로 계산한다", () => {
    // UTC 11/23 16:30 = 서울 11/24 01:30
    expect(seoulNow(new Date("2026-11-23T16:30:00Z"))).toEqual({ date: "2026-11-24", hour: 1, minute: 30 });
  });
});

describe("pickupDateFor (수거: 월~목, 18시 전 입금이면 당일)", () => {
  it("월요일 17:59 입금 → 그날 수거", () => {
    expect(pickupDateFor(seoul("2026-11-23T17:59:00"))).toBe("2026-11-23");
  });
  it("월요일 18:00 입금 → 화요일 수거", () => {
    expect(pickupDateFor(seoul("2026-11-23T18:00:00"))).toBe("2026-11-24");
  });
  it("목요일 19시 입금 → 다음 주 월요일 수거", () => {
    expect(pickupDateFor(seoul("2026-11-26T19:00:00"))).toBe("2026-11-30");
  });
  it("금·토·일 입금 → 다음 주 월요일 수거", () => {
    expect(pickupDateFor(seoul("2026-11-27T09:00:00"))).toBe("2026-11-30");
    expect(pickupDateFor(seoul("2026-11-28T09:00:00"))).toBe("2026-11-30");
    expect(pickupDateFor(seoul("2026-11-29T23:00:00"))).toBe("2026-11-30");
  });
  it("쉬는 날은 건너뛴다", () => {
    expect(pickupDateFor(seoul("2026-11-23T10:00:00"), ["2026-11-23", "2026-11-24"])).toBe("2026-11-25");
  });
});

describe("배송일 (월~토)", () => {
  it("토요일은 배송, 일요일은 쉰다", () => {
    expect(isDeliveryDay("2026-11-28")).toBe(true);
    expect(isDeliveryDay("2026-11-29")).toBe(false);
  });
  it("일요일에는 다음 월요일이 가장 빠른 배송일", () => {
    expect(nextDeliveryDate(seoul("2026-11-29T12:00:00"))).toBe("2026-11-30");
  });
});

describe("formatDay", () => {
  it("11/24(화)처럼 보여 준다", () => {
    expect(weekday("2026-11-24")).toBe(2);
    expect(formatDay("2026-11-24")).toBe("11/24(화)");
  });
});
