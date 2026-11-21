import Link from "next/link";
import { AppBar } from "@/components/ui";
import { brandsOf, minPrice, toCatalog } from "@/lib/catalog";
import { CATEGORY_LABEL, formatWon, type Category } from "@/lib/domain";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Prices({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: k } = await searchParams;
  const kind: Category = k === "robot" ? "robot" : "cordless";
  const catalog = toCatalog(await getStore().listModels({ activeOnly: true }));
  const brands = brandsOf(catalog, kind);

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
        <p className="lead">수거·배송, 품질검사, 3개월 보증이 포함된 가격이에요. 용량을 고를 수 있는 모델은 가장 낮은 가격을 보여 드려요.</p>
        {brands.map(([b]) => (
          <section key={b} className="stack" style={{ gap: 6 }}>
            <div className="label">{b}</div>
            {catalog
              .filter((m) => m.category === kind && m.brand === b)
              .sort((x, y) => x.name.localeCompare(y.name, "ko", { numeric: true }))
              .map((m) => (
                <Link key={m.id} href={`/order?kind=${kind}`} className="item">
                  <span className="nm small">{m.name}</span>
                  <span className="pr">
                    {formatWon(minPrice(m))}
                    {m.options.length > 1 && <small>부터</small>}
                  </span>
                </Link>
              ))}
          </section>
        ))}
      </main>
    </>
  );
}
