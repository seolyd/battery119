import type { Category, Model } from "@/lib/domain";

/** 신청 화면에 보내는 모델 정보 (원가는 빼고 보낸다) */
export interface CatalogModel {
  id: string;
  category: Category;
  brand: string;
  name: string;
  price: number;
  options: { label: string; price: number }[];
  protectCircuitFee: number | null;
}

export function toCatalog(models: Model[]): CatalogModel[] {
  return models
    .filter((m) => m.active)
    .map((m) => ({
      id: m.id,
      category: m.category,
      brand: m.brand,
      name: m.name,
      price: m.price,
      options: m.options.map((o) => ({ label: o.label, price: o.price })),
      protectCircuitFee: m.protectCircuitFee,
    }));
}

export function brandsOf(catalog: CatalogModel[], category: Category): [string, number][] {
  const c = new Map<string, number>();
  catalog.filter((m) => m.category === category).forEach((m) => c.set(m.brand, (c.get(m.brand) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

export function minPrice(m: CatalogModel): number {
  return m.options.length ? Math.min(...m.options.map((o) => o.price)) : m.price;
}
