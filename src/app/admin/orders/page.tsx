import Link from "next/link";
import { StatusBadge, toSeoulDate } from "@/components/ui";
import { formatWon, STATUS_LABEL, type OrderStatus } from "@/lib/domain";
import { formatDay } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "open", label: "진행 중", statuses: ["REQUESTED", "PAYMENT_PENDING", "PAID", "PICKED_UP", "AT_PARTNER", "REPAIRING", "QC", "NOT_REPAIRABLE", "DELIVERY_SCHEDULED", "AS_REQUESTED"] },
  ...(["REQUESTED", "PAYMENT_PENDING", "PAID", "AT_PARTNER", "QC", "DELIVERY_SCHEDULED"] as OrderStatus[]).map((s) => ({ key: s, label: STATUS_LABEL[s], statuses: [s] })),
  { key: "done", label: "완료·취소", statuses: ["DELIVERED", "CANCELED"] },
  { key: "all", label: "전체" },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const f = FILTERS.find((x) => x.key === status) ?? FILTERS[0];
  const statuses = f.key === "AT_PARTNER" ? (["PICKED_UP", "AT_PARTNER", "REPAIRING"] as OrderStatus[]) : f.statuses;
  const orders = await getStore().listOrders({ statuses });

  return (
    <>
      <h1 className="h2">주문</h1>
      <nav className="filters" aria-label="상태">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/orders?status=${x.key}`} aria-current={x.key === f.key ? "true" : undefined}>
            {x.label}
          </Link>
        ))}
      </nav>
      <section className="panel">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>상태</th>
                <th>동·호</th>
                <th>제품</th>
                <th className="num">결제</th>
                <th>수거·배송</th>
                <th>신청일</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">
                    <Link href={`/admin/orders/${o.id}`}>{o.orderNo}</Link>
                  </td>
                  <td>
                    <StatusBadge status={o.status} admin />
                  </td>
                  <td className="mono">
                    {o.dong}-{o.ho}
                  </td>
                  <td>
                    <Link href={`/admin/orders/${o.id}`}>
                      {o.brand} {o.modelName.length > 40 ? o.modelName.slice(0, 40) + "…" : o.modelName}
                    </Link>
                    {o.optionLabel && <span className="small muted"> · {o.optionLabel}</span>}
                  </td>
                  <td className="num">{o.price != null ? formatWon(o.price) : "견적 전"}</td>
                  <td className="small">
                    {o.pickupDate && `수거 ${formatDay(o.pickupDate)}`}
                    {o.deliveryDate && ` · 배송 ${formatDay(o.deliveryDate)}`}
                  </td>
                  <td className="small">{formatDay(toSeoulDate(o.createdAt))}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 24 }}>
                    해당하는 주문이 없어요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
