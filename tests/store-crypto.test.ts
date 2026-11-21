import { describe, expect, it } from "vitest";
import seed from "@/data/models.json";
import { decryptDoorCode, encryptDoorCode } from "@/lib/crypto";
import { createMemoryStore } from "@/lib/store/memory";

describe("공동현관 비밀번호 암호화", () => {
  it("암호화한 값을 다시 풀 수 있고, 평문이 남지 않는다", () => {
    const enc = encryptDoorCode("1234#");
    expect(enc).not.toContain("1234");
    expect(decryptDoorCode(enc)).toBe("1234#");
  });
  it("같은 값도 매번 다르게 암호화한다", () => {
    expect(encryptDoorCode("1234#")).not.toBe(encryptDoorCode("1234#"));
  });
  it("변조된 값은 풀리지 않는다", () => {
    const [v, iv, tag, data] = encryptDoorCode("1234#").split(".");
    const bad = [v, iv, tag, Buffer.from("xxxx").toString("base64") + data.slice(8)].join(".");
    expect(() => decryptDoorCode(bad)).toThrow();
  });
});

describe("초기 모델 데이터", () => {
  it("무선·로봇 두 종류만 있고 판매가 = 원가 + 30,000원", () => {
    const models = seed as { category: string; partnerCost: number; price: number; options: { partnerCost: number; price: number }[] }[];
    expect(new Set(models.map((m) => m.category))).toEqual(new Set(["cordless", "robot"]));
    for (const m of models) {
      expect(m.price - m.partnerCost).toBe(30000);
      for (const o of m.options) expect(o.price - o.partnerCost).toBe(30000);
    }
  });
});

describe("메모리 저장소", () => {
  it("주문번호를 날마다 01부터 매기고 고객별로 주문을 찾는다", async () => {
    const s = createMemoryStore();
    await s.ensureCustomer("c1", { name: "고객" });
    const base = {
      customerId: "c1",
      category: "robot" as const,
      brand: "로보락",
      modelId: null,
      modelName: "S7",
      optionLabel: null,
      symptoms: ["사용 시간이 짧아요"],
      usageAge: null,
      memo: null,
      price: 90000,
      partnerCost: 60000,
      status: "PAYMENT_PENDING" as const,
      dong: "215",
      ho: "1203",
      phone: "010-1234-5678",
      packagingAgreedAt: new Date().toISOString(),
    };
    const a = await s.createOrder(base);
    const b = await s.createOrder(base);
    expect(a.orderNo).toMatch(/^PR-\d{6}-01$/);
    expect(b.orderNo).toMatch(/-02$/);
    expect((await s.listOrdersByCustomer("c1")).length).toBe(2);
    expect((await s.listOrdersByCustomer("c2")).length).toBe(0);
  });
});
