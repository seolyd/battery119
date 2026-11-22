import { describe, expect, it } from "vitest";
import seed from "@/data/models.json";
import { brandsOf, matches, pickEntries, toCatalog } from "@/lib/catalog";
import type { Model } from "@/lib/domain";

const models = (seed as Omit<Model, "partnerId">[]).map((m) => ({ ...m, partnerId: null })) as Model[];
const catalog = toCatalog(models);

describe("모델 나누기", () => {
  it("로보락 S5~S8 묶음이 모델마다 한 줄씩 나온다", () => {
    const labels = pickEntries(catalog, "robot", "로보락").map((e) => e.label);
    expect(labels).toContain("S7");
    expect(labels).toContain("S8 MaxV Ultra");
    expect(labels.length).toBe(12);
    expect(labels.some((l) => l.includes("[") || l.includes(","))).toBe(false);
  });
  it("같은 제조사 안에서 같은 모델이 두 번 나오지 않는다", () => {
    for (const kind of ["cordless", "robot"] as const) {
      for (const [b] of brandsOf(catalog, kind)) {
        const labels = pickEntries(catalog, kind, b).map((e) => e.label);
        expect(new Set(labels).size, `${b}: ${labels.join(" | ")}`).toBe(labels.length);
      }
    }
  });
  it("판매를 끈 중복 상품은 빠진다", () => {
    expect(catalog.find((m) => m.id === "cordless-87401")).toBeUndefined();
  });
  it("제조사별 모델 수는 나눈 모델 기준으로 센다", () => {
    expect(brandsOf(catalog, "robot").find(([b]) => b === "로보락")?.[1]).toBe(12);
  });
});

describe("모델 검색", () => {
  it("띄어쓰기·대소문자·하이픈을 무시한다", () => {
    expect(matches("S7 Plus", "s7plus")).toBe(true);
    expect(matches("에르고라피도 ZB3230", "zb3230")).toBe(true);
    expect(matches("VC-LSS90", "vclss90")).toBe(true);
    expect(matches("S7 Plus", "S8")).toBe(false);
    expect(matches("아무거나", "")).toBe(true);
  });
});
