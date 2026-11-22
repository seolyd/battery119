import Link from "next/link";
import { AppBar } from "@/components/ui";
import { brandsOf, minPrice, toCatalog } from "@/lib/catalog";
import { CATEGORY_LABEL, formatWon, type Category } from "@/lib/domain";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// 모델별 가격: 종류 → 제조사 → 그 제조사의 모델 목록 순서로 본다
export default async function Prices({ searchParams }: { searchParams: Promise<{ kind?: string; brand?: string }> }) {
  const sp = await searchParams;
  const kind: Category = sp.kind === "robot" ? "robot" : "cordless";
  const catalog = toCatalog(await getStore().listModels({ activeOnly: true }));
  const brands = brandsOf(catalog, kind);
  const brand = sp.brand && brands.some(([b]) => b === sp.brand) ? sp.brand : null;

  if (brand) {
    const models = catalog
      .filter((m) => m.category === kind && m.brand === brand)
      .sort((x, y) => x.name.localeCompare(y.name, "ko", { numeric: true }));
    return (
      <>
        <AppBar title={`${brand} 가격`} back={`/prices?kind=${kind}`} sub={CATEGORY_LABEL[kind]} />
        <main className="content">
          <p className="lead">수거·배송, 품질검사, 3개월 보증이 포함된 가격이에요. 용량을 고를 수 있는 모델은 가장 낮은 가격을 보여 드려요.</p>
          <div className="list">
            {models.map((m) => (
              <div key={m.id} className="item" style={{ cursor: "default" }}>
                <span className="nm small">
                  {m.name}
                  {m.variants.length > 1 && (
                    <span className="muted" style={{ display: "block", fontSize: 12 }}>
                      {m.variants.join(", ")}
                    </span>
                  )}
                  {m.options.length > 1 && (
                    <span className="muted" style={{ display: "block", fontSize: 12 }}>
                      {m.options.map((o) => `${o.label} ${formatWon(o.price)}`).join(" · ")}
                    </span>
                  )}
                </span>
                <span className="pr">
                  {formatWon(minPrice(m))}
                  {m.options.length > 1 && <small>부터</small>}
                </span>
              </div>
            ))}
          </div>
          <Link href={`/order?kind=${kind}`} className="btn">
            {brand} 수리 신청하기
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar title="모델별 가격" back="/" />
      <main className="content">
        <nav className="filters" aria-label="청소기 종류">
          {(["cordless", "robot"] as const).map((c) => (
            <Link key={c} href={`/prices?kind=${c}`} aria-current={c === kind ? "true" : undefined}>
              {CATEGORY_LABEL[c]}
            </Link>
          ))}
        </nav>
        <h1 className="h2">제조사를 골라 주세요</h1>
        <div className="brands">
          {brands.map(([b, n]) => {
            const from = Math.min(...catalog.filter((m) => m.category === kind && m.brand === b).map(minPrice));
            return (
              <Link key={b} href={`/prices?kind=${kind}&brand=${encodeURIComponent(b)}`} style={{ textDecoration: "none" }}>
                <b>{b}</b>
                <span>
                  {n}개 모델 · {formatWon(from)}부터
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
