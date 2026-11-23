import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/domain";
import { easyStatus } from "@/lib/easyStatus";
import { smsHref, smsText } from "@/lib/messages";
import { orderVars, shortLink } from "@/lib/notify";
import { smsEventFor } from "@/lib/sms";
import { isAccessToken, newAccessToken } from "@/lib/token";

const base: Order = {
  id: "o1",
  orderNo: "PR-261124-01",
  accessToken: "AbCdEfGhIjKl",
  customerId: "c1",
  category: "robot",
  brand: "로보락",
  modelId: "robot-121135",
  modelName: "S7 Plus",
  optionLabel: null,
  symptoms: [],
  usageAge: null,
  memo: null,
  price: 80000,
  partnerCost: 60000,
  partnerId: null,
  status: "PAYMENT_PENDING",
  dong: "215",
  ho: "1203",
  phone: "010-1234-5678",
  packagingAgreedAt: "2026-11-24T00:00:00Z",
  depositorName: null,
  paidAt: null,
  pickupDate: null,
  deliveryDate: null,
  deliveredAt: null,
  refunded: false,
  createdAt: "2026-11-24T00:00:00Z",
  updatedAt: "2026-11-24T00:00:00Z",
};
const o = (over: Partial<Order>): Order => ({ ...base, ...over });

describe("문자 바로가기 링크", () => {
  it("코드는 12자이고 매번 다르다", () => {
    const a = newAccessToken();
    expect(isAccessToken(a)).toBe(true);
    expect(newAccessToken()).not.toBe(a);
    expect(isAccessToken("../etc/passwd")).toBe(false);
  });
  it("알림과 문자에는 로그인 없이 열리는 링크가 들어간다", () => {
    expect(shortLink(base)).toMatch(/\/s\/AbCdEfGhIjKl$/);
    expect(orderVars(base).링크).toBe(shortLink(base));
  });
});

describe("쉬운 상태 문장 (70대 고객 기준)", () => {
  const mon17 = new Date("2026-11-23T17:00:00+09:00");
  it("입금 대기: 금액과 가지러 가는 날", () => {
    const s = easyStatus(base, mon17);
    expect(s.headline).toBe("80,000원 입금을 기다리고 있어요");
    expect(s.todo).toContain("11/23(월) 저녁 7~10시");
    expect(s.tone).toBe("action");
  });
  it("입금 확인: 언제 가지러 가는지와 할 일", () => {
    const s = easyStatus(o({ status: "PAID", pickupDate: "2026-11-24" }));
    expect(s.headline).toBe("11/24(화) 저녁 7~10시에 가지러 가요");
    expect(s.todo).toContain("문 앞에");
    expect(s.step).toBe(1);
  });
  it("업체 이름이나 전문 용어를 쓰지 않는다", () => {
    for (const status of ["AT_PARTNER", "REPAIRING", "QC"] as const) {
      const s = easyStatus(o({ status }));
      expect(s.headline + (s.todo ?? "")).not.toMatch(/업체|품질|검사|입고/);
      expect(s.step).toBe(2);
    }
  });
  it("배송 완료: 보증 기간", () => {
    const s = easyStatus(o({ status: "DELIVERED", deliveredAt: "2026-11-28T11:00:00Z" }));
    expect(s.tone).toBe("done");
    expect(s.todo).toContain("5/28(금)까지");
  });
});

describe("운영자 문자", () => {
  it("상태에 맞는 문자를 고른다", () => {
    expect(smsEventFor(base, [])).toBe("ORDER_RECEIVED");
    expect(smsEventFor(base, [{ to: "REQUESTED" }, { to: "PAYMENT_PENDING" }])).toBe("QUOTE_READY");
    expect(smsEventFor(o({ status: "REPAIRING" }), [])).toBe("PICKED_UP");
    expect(smsEventFor(o({ status: "DELIVERY_SCHEDULED" }), [{ to: "NOT_REPAIRABLE" }])).toBe("RETURN_SCHEDULED");
    expect(smsEventFor(o({ status: "REQUESTED" }), [])).toBeNull();
  });
  it("문자에는 인사, 할 일, 바로가기 링크가 들어간다", () => {
    const text = smsText("PAID", orderVars(o({ status: "PAID", pickupDate: "2026-11-24" })))!;
    expect(text).toContain("215동 1203호 고객님, 입금 확인됐어요.");
    expect(text).toContain("11/24(화) 저녁 7~10시에 가지러 가요.");
    expect(text.trim().endsWith("/s/AbCdEfGhIjKl")).toBe(true);
  });
  it("문자 앱 주소: 번호와 내용이 채워진다", () => {
    const href = smsHref("010-1234-5678", "안녕 하세요\n링크");
    expect(href).toBe("sms:01012345678?&body=" + encodeURIComponent("안녕 하세요\n링크"));
  });
});
