import { describe, expect, it } from "vitest";
import type { Model, Order } from "@/lib/domain";
import { customerStepIndex, CUSTOMER_STATUS_LABEL } from "@/lib/domain";
import { buildOrder, RuleError, transitionPatch, type OrderInput } from "@/lib/orderRules";

const robot: Model = {
  id: "robot-121135",
  category: "robot",
  brand: "로보락",
  name: "S5 ~ S8",
  partnerId: "partner-taegeuk",
  partnerCost: 60000,
  price: 90000,
  options: [
    { label: "삼성SDI 5200mAh", partnerCost: 60000, price: 90000 },
    { label: "삼성SDI 7000mAh", partnerCost: 80000, price: 110000 },
  ],
  protectCircuitFee: null,
  active: true,
  sourceUrl: null,
};

const input = (over: Partial<OrderInput> = {}): OrderInput => ({
  category: "robot",
  brand: "로보락",
  modelId: robot.id,
  customModel: null,
  optionLabel: "삼성SDI 7000mAh",
  symptoms: ["사용 시간이 짧아요"],
  usageAge: "3~5년",
  memo: null,
  dong: "215",
  ho: "1203",
  phone: "01012345678",
  doorCode: "1234#",
  packagingAgreed: true,
  ...over,
});

describe("buildOrder", () => {
  it("가격은 고객이 보낸 값이 아니라 서버의 모델 옵션으로 정한다", () => {
    const o = buildOrder(input(), robot, "c1");
    expect(o.price).toBe(110000);
    expect(o.partnerCost).toBe(80000);
    expect(o.status).toBe("PAYMENT_PENDING");
    expect(o.phone).toBe("010-1234-5678");
  });
  it("없는 용량을 고르면 거절한다", () => {
    expect(() => buildOrder(input({ optionLabel: "9999mAh" }), robot, "c1")).toThrow(RuleError);
  });
  it("포장 안내 동의가 없으면 거절한다", () => {
    expect(() => buildOrder(input({ packagingAgreed: false }), robot, "c1")).toThrow(/포장/);
  });
  it("증상이 없으면 거절하고, 목록에 없는 증상은 버린다", () => {
    expect(() => buildOrder(input({ symptoms: ["아무거나"] }), robot, "c1")).toThrow(/증상/);
  });
  it("동·호 형식을 확인한다", () => {
    expect(() => buildOrder(input({ dong: "21" }), robot, "c1")).toThrow(/동/);
    expect(() => buildOrder(input({ ho: "12a3" }), robot, "c1")).toThrow(/호/);
  });
  it("판매를 끈 모델은 받지 않는다", () => {
    expect(() => buildOrder(input(), { ...robot, active: false }, "c1")).toThrow(/접수하지 않는/);
  });
  it("목록 밖 모델은 견적 전 상태(가격 없음)로 만든다", () => {
    const o = buildOrder(input({ modelId: null, brand: "보쉬", customModel: "BBH3", optionLabel: null }), null, "c1");
    expect(o.status).toBe("REQUESTED");
    expect(o.price).toBeNull();
    expect(o.modelName).toBe("BBH3");
  });
});

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  orderNo: "PR-261123-01",
  customerId: "c1",
  category: "robot",
  brand: "로보락",
  modelId: robot.id,
  modelName: robot.name,
  optionLabel: null,
  symptoms: [],
  usageAge: null,
  memo: null,
  price: 90000,
  partnerCost: 60000,
  partnerId: "partner-taegeuk",
  status: "PAYMENT_PENDING",
  dong: "215",
  ho: "1203",
  phone: "010-1234-5678",
  packagingAgreedAt: "2026-11-23T00:00:00Z",
  depositorName: null,
  paidAt: null,
  pickupDate: null,
  deliveryDate: null,
  deliveredAt: null,
  refunded: false,
  createdAt: "2026-11-23T00:00:00Z",
  updatedAt: "2026-11-23T00:00:00Z",
  ...over,
});

describe("transitionPatch", () => {
  it("입금 확인 시 수거일을 정한다 (월 17시 → 당일)", () => {
    const p = transitionPatch(order(), "PAID", { depositorName: "홍길동" }, new Date("2026-11-23T17:00:00+09:00"));
    expect(p.pickupDate).toBe("2026-11-23");
    expect(p.depositorName).toBe("홍길동");
  });
  it("허용되지 않은 단계로는 바꿀 수 없다", () => {
    expect(() => transitionPatch(order(), "DELIVERED", {})).toThrow(RuleError);
  });
  it("견적을 보낼 때 금액이 필요하다", () => {
    expect(() => transitionPatch(order({ status: "REQUESTED", price: null }), "PAYMENT_PENDING", {})).toThrow(/금액/);
    expect(transitionPatch(order({ status: "REQUESTED", price: null }), "PAYMENT_PENDING", { price: 120000 }).price).toBe(120000);
  });
  it("일요일에는 배송일을 잡을 수 없다", () => {
    expect(() => transitionPatch(order({ status: "QC" }), "DELIVERY_SCHEDULED", { deliveryDate: "2026-11-29" })).toThrow(/월~토/);
  });
  it("교체 불가 후 반송할 때 환불을 기록한다", () => {
    const p = transitionPatch(order({ status: "NOT_REPAIRABLE" }), "DELIVERY_SCHEDULED", { deliveryDate: "2026-11-28", refunded: true });
    expect(p.refunded).toBe(true);
  });
});

describe("고객 화면에는 협력업체가 드러나지 않는다", () => {
  it("업체 입고 단계를 '배터리 진단'으로 보여 준다", () => {
    expect(CUSTOMER_STATUS_LABEL.AT_PARTNER).toBe("배터리 진단");
    expect(Object.values(CUSTOMER_STATUS_LABEL).some((l) => l.includes("업체"))).toBe(false);
  });
  it("진행 단계 위치", () => {
    expect(customerStepIndex("PAYMENT_PENDING")).toBe(0);
    expect(customerStepIndex("PAID")).toBe(1);
    expect(customerStepIndex("DELIVERED")).toBe(7);
  });
});
