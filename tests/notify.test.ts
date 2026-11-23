import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { NotifyEvent, Order } from "@/lib/domain";
import { maskPhone, orderVars, templateIds } from "@/lib/notify";
import { authHeader } from "@/lib/notify/solapi";
import { render, TEMPLATES, templateVars } from "@/lib/notify/templates";

const order: Order = {
  id: "o1",
  orderNo: "PR-261124-01",
  accessToken: "AbCdEfGhIjKl",
  customerId: "c1",
  category: "robot",
  brand: "로보락",
  modelId: "robot-121135",
  modelName: "S7 Plus",
  optionLabel: "삼성SDI 7000mAh",
  symptoms: [],
  usageAge: null,
  memo: null,
  price: 100000,
  partnerCost: 80000,
  partnerId: null,
  status: "DELIVERED",
  dong: "215",
  ho: "1203",
  phone: "010-1234-5678",
  packagingAgreedAt: "2026-11-24T00:00:00Z",
  depositorName: null,
  paidAt: "2026-11-24T05:00:00Z",
  pickupDate: "2026-11-24",
  deliveryDate: "2026-11-28",
  deliveredAt: "2026-11-28T11:00:00Z",
  refunded: false,
  createdAt: "2026-11-24T00:00:00Z",
  updatedAt: "2026-11-24T00:00:00Z",
};

const ORDER_EVENTS: NotifyEvent[] = ["ORDER_RECEIVED", "QUOTE_READY", "PAID", "PICKED_UP", "DELIVERY_SCHEDULED", "RETURN_SCHEDULED", "DELIVERED", "CANCELED"];

describe("알림톡 템플릿", () => {
  it("주문 알림 템플릿의 변수는 모두 주문 정보로 채울 수 있다", () => {
    const vars = orderVars(order);
    for (const e of ORDER_EVENTS) {
      expect(() => render(TEMPLATES[e].body, vars), e).not.toThrow();
    }
  });
  it("채운 본문은 1,000자를 넘지 않는다 (알림톡 제한)", () => {
    const vars = orderVars(order);
    for (const e of ORDER_EVENTS) expect(render(TEMPLATES[e].body, vars).length).toBeLessThan(1000);
  });
  it("주문 정보가 본문에 들어간다", () => {
    const text = render(TEMPLATES.PAID.body, orderVars(order));
    expect(text).toContain("215동 1203호");
    expect(text).toContain("100,000원");
    expect(text).toContain("11/24(화)");
    expect(render(TEMPLATES.DELIVERED.body, orderVars(order))).toContain("5/28(금)"); // 보증 6개월 (2027-05-28)
  });
  it("변수가 빠지면 보내지 않는다", () => {
    expect(() => render("#{a} #{b}", { a: "1" })).toThrow(/b/);
    expect(templateVars("#{a} #{b} #{a}")).toEqual(["a", "b"]);
  });
  it("견적 전 주문은 금액 대신 안내 문구", () => {
    const v = orderVars({ ...order, price: null, paidAt: null });
    expect(v.금액).toBe("견적 후 안내");
    expect(v.환불안내).toContain("결제 전");
  });
});

describe("솔라피 설정과 인증", () => {
  it("템플릿 ID 목록을 읽는다", () => {
    expect(templateIds("ORDER_RECEIVED=KA01, PAID = KA02 ,UNKNOWN=x")).toEqual({ ORDER_RECEIVED: "KA01", PAID: "KA02" });
  });
  it("HMAC-SHA256 인증 헤더", () => {
    const date = "2026-11-24T00:00:00.000Z";
    const salt = "abc123";
    const expected = createHmac("sha256", "SECRET").update(date + salt).digest("hex");
    expect(authHeader("KEY", "SECRET", date, salt)).toBe(`HMAC-SHA256 apiKey=KEY, date=${date}, salt=${salt}, signature=${expected}`);
  });
  it("기록에는 번호 뒤 4자리만 남긴다", () => {
    expect(maskPhone("010-1234-5678")).toBe("***-5678");
  });
});
