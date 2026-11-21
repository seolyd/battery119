import Link from "next/link";
import { AppBar, KindIcon, StatusBadge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { CUSTOMER_STEPS, customerStepIndex, formatWon, isActive } from "@/lib/domain";
import { formatDay, pickupDateFor, VISIT_WINDOW } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();
  const store = getStore();
  const [models, closed, orders] = await Promise.all([
    store.listModels({ activeOnly: true }),
    store.listClosedDates(),
    session ? store.listOrdersByCustomer(session.userId) : Promise.resolve([]),
  ]);
  const active = orders.filter((o) => isActive(o.status));
  const count = (c: string) => models.filter((m) => m.category === c).length;
  const nextPickup = pickupDateFor(new Date(), closed);

  return (
    <>
      <AppBar title="배터리 119" sub="파크리오 전용" />
      <main className="content">
        {error === "admin" && (
          <div className="alert err">
            <b>관리자만 볼 수 있는 화면이에요.</b>
          </div>
        )}
        <section className="hero">
          <h1>
            청소기 배터리,
            <br />
            이제 들고 나가지 마세요
          </h1>
          <p>
            다음 수거 · {formatDay(nextPickup)} {VISIT_WINDOW} · 18시 전 입금 시 당일 수거
          </p>
        </section>

        {active.map((o) => {
          const pct = ((customerStepIndex(o.status) + 1) / CUSTOMER_STEPS.length) * 100;
          return (
            <Link key={o.id} href={`/orders/${o.id}`} className="card" style={{ textDecoration: "none" }}>
              <div className="row">
                <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.brand} {o.modelName}
                </b>
                <StatusBadge status={o.status} />
              </div>
              <div className="progress">
                <i style={{ width: `${pct}%` }} />
              </div>
              <span className="small muted">
                {o.status === "PAYMENT_PENDING" && o.price ? `${formatWon(o.price)} 입금을 기다리고 있어요` : null}
                {o.status === "PAID" && o.pickupDate ? `${formatDay(o.pickupDate)} ${VISIT_WINDOW} 수거 예정` : null}
                {o.status === "DELIVERY_SCHEDULED" && o.deliveryDate ? `${formatDay(o.deliveryDate)} ${VISIT_WINDOW} 배송 예정` : null}
                {o.status === "REQUESTED" ? "모델을 확인하고 견적을 알려 드릴게요" : null}
              </span>
            </Link>
          );
        })}

        <div className="label">어떤 청소기 배터리를 바꿀까요?</div>
        <div className="kinds">
          <Link className="kind" href="/order?kind=cordless">
            <KindIcon kind="cordless" />
            <div>
              <b>무선청소기</b>
              <span>다이슨·LG·삼성·일렉트로룩스 등 {count("cordless")}개 모델</span>
            </div>
          </Link>
          <Link className="kind" href="/order?kind=robot">
            <KindIcon kind="robot" />
            <div>
              <b>로봇청소기</b>
              <span>로보락·에코백스·삼성·LG 등 {count("robot")}개 모델</span>
            </div>
          </Link>
        </div>

        <div className="card flat">
          <b>이렇게 진행돼요</b>
          <span className="small muted">
            신청하고 입금하면 박스에 포장해 문 앞에 두세요. 저녁 7~10시에 수거해서 배터리를 교체하고, 품질검사를 마친 뒤 집 앞까지 배송해 드려요.
            교체 작업은 3개월 보증해요.
          </span>
        </div>
        <Link href="/prices" className="btn ghost">
          모델별 가격 보기
        </Link>
      </main>
    </>
  );
}
