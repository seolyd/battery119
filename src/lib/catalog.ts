import type { Category, Model } from "@/lib/domain";

/** 신청 화면에 보내는 모델 정보 (원가는 빼고 보낸다) */
export interface CatalogModel {
  id: string;
  category: Category;
  brand: string;
  name: string;
  variants: string[];
  price: number;
  options: { label: string; price: number }[];
  protectCircuitFee: number | null;
}

/** 고객이 실제로 고르는 한 줄. 여러 모델에 맞는 상품은 모델마다 한 줄씩 나온다 */
export interface PickEntry {
  key: string;
  model: CatalogModel;
  variant: string | null;
  label: string;
}

export function toCatalog(models: Model[]): CatalogModel[] {
  return models
    .filter((m) => m.active)
    .map((m) => ({
      id: m.id,
      category: m.category,
      brand: m.brand,
      name: m.name,
      variants: m.variants,
      price: m.price,
      options: m.options.map((o) => ({ label: o.label, price: o.price })),
      protectCircuitFee: m.protectCircuitFee,
    }));
}

export function pickEntries(catalog: CatalogModel[], category: Category, brand: string): PickEntry[] {
  return catalog
    .filter((m) => m.category === category && m.brand === brand)
    .flatMap((m): PickEntry[] =>
      m.variants.length
        ? m.variants.map((v) => ({ key: `${m.id}#${v}`, model: m, variant: v, label: v }))
        : [{ key: m.id, model: m, variant: null, label: m.name }],
    )
    .sort((a, b) => a.label.localeCompare(b.label, "ko", { numeric: true }));
}

/** 고객이 고를 수 있는 모델 수 */
export function entryCount(m: CatalogModel): number {
  return m.variants.length || 1;
}

export function brandsOf(catalog: CatalogModel[], category: Category): [string, number][] {
  const c = new Map<string, number>();
  catalog.filter((m) => m.category === category).forEach((m) => c.set(m.brand, (c.get(m.brand) ?? 0) + entryCount(m)));
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

export function minPrice(m: CatalogModel): number {
  return m.options.length ? Math.min(...m.options.map((o) => o.price)) : m.price;
}

/** 검색: 띄어쓰기와 대소문자, 하이픈을 무시한다 (예: "s7plus" → "S7 Plus", "zb3230" → "ZB3230") */
export function matches(label: string, q: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.·/]/g, "");
  const n = norm(q);
  return !n || norm(label).includes(n);
}
