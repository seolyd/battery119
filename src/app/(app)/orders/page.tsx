import Link from "next/link";
import { AppBar, StatusBadge, toSeoulDate } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatWon } from "@/lib/domain";
import { formatDay } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Orders() {
  const session = await requireUser("/orders");
  const orders = await getStore().listOrdersByCustomer(session.userId);

  return (
    <>
      <AppBar title="내 주문" />
      <main className="content">
        {orders.length === 0 ? (
          <div className="card flat" style={{ alignItems: "center", textAlign: "center", padding: 28 }}>
            <b>아직 신청한 수리가 없어요</b>
            <span className="small muted">무선청소기나 로봇청소기 배터리를 집 앞에서 맡기고 받아 보세요.</span>
            <Link href="/order" className="btn" style={{ marginTop: 8 }}>
              수리 신청하기
            </Link>
          </div>
        ) : (
          <div className="list">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="item">
                <span className="nm">
                  <b>
                    {o.brand} {o.modelName}
                  </b>
                  <br />
                  <span className="small muted mono">
                    {o.orderNo} · {formatDay(toSeoulDate(o.createdAt))}
                  </span>
                </span>
                <span className="pr">
                  <StatusBadge status={o.status} />
                  <small>{o.price != null ? formatWon(o.price) : "견적 전"}</small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
