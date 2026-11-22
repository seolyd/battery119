import Link from "next/link";
import { CATEGORY_LABEL, formatWon, type Category } from "@/lib/domain";
import { getStore } from "@/lib/store";
import { updateModel } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminModels({ searchParams }: { searchParams: Promise<{ kind?: string; brand?: string; q?: string }> }) {
  const sp = await searchParams;
  const kind: Category = sp.kind === "robot" ? "robot" : "cordless";
  const store = getStore();
  const [models, partners] = await Promise.all([store.listModels(), store.listPartners()]);
  const inKind = models.filter((m) => m.category === kind);
  const brands = [...new Set(inKind.map((m) => m.brand))].sort((a, b) => a.localeCompare(b, "ko"));
  const brand = sp.brand && brands.includes(sp.brand) ? sp.brand : "";
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = inKind
    .filter((m) => (!brand || m.brand === brand) && (!q || [m.name, ...m.variants].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => a.brand.localeCompare(b.brand, "ko") || a.name.localeCompare(b.name, "ko", { numeric: true }));

  return (
    <>
      <h1 className="h2">모델·가격</h1>
      <p className="small muted">
        고객에게는 판매가만 보이고, 원가와 협력업체는 보이지 않아요. 판매를 끄면 신청 화면에서 빠져요. 초기 데이터는 asbattery.com 리필가(2026-11-21)에 20,000원을
        더한 값이에요.
      </p>
      <nav className="filters" aria-label="종류">
        {(["cordless", "robot"] as const).map((c) => (
          <Link key={c} href={`/admin/models?kind=${c}`} aria-current={c === kind ? "true" : undefined}>
            {CATEGORY_LABEL[c]} ({models.filter((m) => m.category === c).length})
          </Link>
        ))}
      </nav>
      <form className="inline" method="get">
        <input type="hidden" name="kind" value={kind} />
        <label className="field">
          제조사
          <select name="brand" defaultValue={brand}>
            <option value="">전체</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          모델명
          <input name="q" defaultValue={sp.q ?? ""} placeholder="검색" />
        </label>
        <button className="btn sm ghost">찾기</button>
      </form>
      <section className="panel">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>제조사</th>
                <th>모델</th>
                <th className="num">업체 원가</th>
                <th className="num">판매가</th>
                <th className="num">차액</th>
                <th>협력업체</th>
                <th>판매</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const rows = m.options.length ? m.options : [{ label: "", partnerCost: m.partnerCost, price: m.price }];
                const formId = `f-${m.id}`;
                return (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{m.brand}</td>
                    <td style={{ minWidth: 240 }}>
                      {m.name}
                      {m.variants.length > 0 && <div className="small muted">{m.variants.join(", ")}</div>}
                      {m.sourceUrl && (
                        <>
                          {" "}
                          <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="small muted">
                            출처
                          </a>
                        </>
                      )}
                      <form id={formId} action={updateModel.bind(null, m.id)} />
                    </td>
                    <td className="num">
                      {rows.map((o, i) => (
                        <div key={i}>
                          {o.label && <span className="small muted">{o.label} </span>}
                          <input form={formId} className="price-input" name={`cost${i}`} defaultValue={o.partnerCost} inputMode="numeric" aria-label="업체 원가" />
                        </div>
                      ))}
                    </td>
                    <td className="num">
                      {rows.map((o, i) => (
                        <div key={i}>
                          <input form={formId} className="price-input" name={`price${i}`} defaultValue={o.price} inputMode="numeric" aria-label="판매가" />
                        </div>
                      ))}
                    </td>
                    <td className="num small">
                      {rows.map((o, i) => (
                        <div key={i} style={{ padding: "6px 0" }}>
                          {formatWon(o.price - o.partnerCost)}
                        </div>
                      ))}
                    </td>
                    <td>
                      <select form={formId} name="partnerId" defaultValue={m.partnerId ?? ""} aria-label="협력업체">
                        <option value="">미정</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.region === "미정" ? p.name : p.region}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="check">
                        <input form={formId} type="checkbox" name="active" defaultChecked={m.active} /> 판매
                      </label>
                    </td>
                    <td>
                      <button form={formId} className="btn sm ghost">
                        저장
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
