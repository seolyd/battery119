import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { formatWon, type Order } from "@/lib/domain";
import { formatDay, isDeliveryDay, isPickupDay, seoulToday, VISIT_WINDOW } from "@/lib/schedule";
import { PushOptIn } from "@/components/PushOptIn";
import { pushKeys } from "@/lib/push";
import { smsDraft } from "@/lib/sms";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const byDong = (a: Order, b: Order) => a.dong.localeCompare(b.dong) || a.ho.localeCompare(b.ho);
const STALE_DAYS = 5;

export default async function AdminToday() {
  const store = getStore();
  const today = seoulToday();
  const [orders, closed, openInquiries] = await Promise.all([store.listOrders(), store.listClosedDates(), store.listInquiries({ status: "open" })]);

  const pickups = orders.filter((o) => (o.status === "PAID" || o.status === "AS_REQUESTED") && (!o.pickupDate || o.pickupDate <= today)).sort(byDong);
  const deliveries = orders.filter((o) => o.status === "DELIVERY_SCHEDULED" && o.deliveryDate && o.deliveryDate <= today).sort(byDong);
  const route = [...pickups.map((o) => ({ o, kind: "수거" as const })), ...deliveries.map((o) => ({ o, kind: "배송" as const }))].sort((a, b) =>
    byDong(a.o, b.o),
  );
  const quotes = orders.filter((o) => o.status === "REQUESTED");
  const payments = orders.filter((o) => o.status === "PAYMENT_PENDING");
  const staleCut = Date.now() - STALE_DAYS * 86400_000;
  const atPartner = orders.filter((o) => (o.status === "AT_PARTNER" || o.status === "REPAIRING") && new Date(o.updatedAt).getTime() < staleCut);
  const inShop = orders.filter((o) => ["PICKED_UP", "AT_PARTNER", "REPAIRING", "QC", "NOT_REPAIRABLE"].includes(o.status));

  // 오늘 방문할 집마다 "문자" 버튼 (지금 상태에 맞는 안내 문구가 채워진다)
  const smsLinks = new Map(
    await Promise.all(
      route.map(async ({ o }) => {
        const d = smsDraft(o, await store.listEvents(o.id));
        return [o.id, d?.href] as const;
      }),
    ),
  );
  const pickupOpen = isPickupDay(today, closed);
  const deliveryOpen = isDeliveryDay(today, closed);

  return (
    <>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <h1 className="h2">{formatDay(today)} 오늘</h1>
        <span className="small muted">
          수거 {pickupOpen ? `운영 · ${VISIT_WINDOW}` : "쉬는 날"} · 배송 {deliveryOpen ? `운영 · ${VISIT_WINDOW}` : "쉬는 날"}
        </span>
      </div>

      <div className="tiles">
        <Link className={`tile ${route.length ? "hot" : ""}`} href="#route">
          <span className="v">{route.length}</span>
          <span className="k">오늘 방문 (수거 {pickups.length} · 배송 {deliveries.length})</span>
        </Link>
        <Link className={`tile ${payments.length ? "hot" : ""}`} href="/admin/orders?status=PAYMENT_PENDING">
          <span className="v">{payments.length}</span>
          <span className="k">입금 확인 대기</span>
        </Link>
        <Link className={`tile ${quotes.length ? "hot" : ""}`} href="/admin/orders?status=REQUESTED">
          <span className="v">{quotes.length}</span>
          <span className="k">견적 필요 (목록 밖 모델)</span>
        </Link>
        <Link className={`tile ${openInquiries.length ? "hot" : ""}`} href="/admin/inquiries">
          <span className="v">{openInquiries.length}</span>
          <span className="k">답변 대기 문의</span>
        </Link>
        <Link className="tile" href="/admin/orders?status=AT_PARTNER">
          <span className="v">{inShop.length}</span>
          <span className="k">작업 중인 제품</span>
        </Link>
      </div>

      <PushOptIn publicKey={pushKeys()?.publicKey ?? null} admin />

      <div className="cols">
        <section className="panel" id="route">
          <h2>
            오늘 루트 <span className="small muted">동 번호 순</span>
          </h2>
          {route.length ? (
            <div className="route">
              {route.map(({ o, kind }) => (
                <div key={o.id + kind} className="route-row">
                <Link href={`/admin/orders/${o.id}`}>
                  <span className="dong">{o.dong}</span>
                  <span>
                    {kind} · {o.brand} {o.modelName.slice(0, 28)}
                    <br />
                    <span className="small muted">
                      {o.ho}호 · {o.phone}
                      {kind === "수거" && o.pickupDate && o.pickupDate < today ? " · 밀린 수거" : ""}
                    </span>
                  </span>
                  <span className={`badge ${kind === "배송" ? "ok" : ""}`}>{kind}</span>
                </Link>
                {smsLinks.get(o.id) && (
                  <a className="btn sm ghost" href={smsLinks.get(o.id)} aria-label={`${o.dong}동 ${o.ho}호에 문자 보내기`}>
                    문자
                  </a>
                )}
                </div>
              ))}
            </div>
          ) : (
            <div className="body small muted">오늘 수거·배송할 제품이 없어요.</div>
          )}
        </section>

        <section className="panel">
          <h2>입금 확인 대기</h2>
          <div className="body">
            {payments.length ? (
              payments.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="row" style={{ textDecoration: "none" }}>
                  <span>
                    {o.dong}동 {o.ho}호 · {o.brand}
                    <br />
                    <span className="small muted mono">{o.orderNo}</span>
                  </span>
                  <b className="mono">{o.price != null ? formatWon(o.price) : "-"}</b>
                </Link>
              ))
            ) : (
              <span className="small muted">입금을 기다리는 주문이 없어요.</span>
            )}
          </div>
        </section>

        {(quotes.length > 0 || atPartner.length > 0) && (
          <section className="panel">
            <h2>확인이 필요해요</h2>
            <div className="body">
              {quotes.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="row" style={{ textDecoration: "none" }}>
                  <span>
                    {o.brand} {o.modelName}
                  </span>
                  <StatusBadge status={o.status} admin />
                </Link>
              ))}
              {atPartner.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="row" style={{ textDecoration: "none" }}>
                  <span>
                    {o.brand} {o.modelName.slice(0, 24)}
                    <br />
                    <span className="small muted">업체에 맡긴 지 {STALE_DAYS}일 넘었어요</span>
                  </span>
                  <StatusBadge status={o.status} admin />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
