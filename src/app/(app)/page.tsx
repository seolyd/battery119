import Link from "next/link";
import { BrandEmblem, BrandLockup } from "@/components/BrandMark";
import { KindIcon, StatusBadge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { entryCount, minPrice, toCatalog } from "@/lib/catalog";
import { CUSTOMER_STEPS, customerStepIndex, formatWon, isActive } from "@/lib/domain";
import { BRAND, CELL_CLAIM, DISCLAIMER, HERO, PARKRIO_OFFICIAL_LOGO, TAGLINE, WARRANTY_CLAIM } from "@/lib/marketing";
import { formatDay, pickupDateFor, VISIT_WINDOW } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const ICON = {
  door: "M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M14 12h.01",
  cell: "M9 3h6M7 5h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM13 8l-3 5h4l-3 5",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();
  const store = getStore();
  const [models, closed, orders] = await Promise.all([
    store.listModels({ activeOnly: true }),
    store.listClosedDates(),
    session ? store.listOrdersByCustomer(session.userId) : Promise.resolve([]),
  ]);
  const catalog = toCatalog(models);
  const active = orders.filter((o) => isActive(o.status));
  const stat = (c: "cordless" | "robot") => {
    const ms = catalog.filter((m) => m.category === c);
    return { count: ms.reduce((n, m) => n + entryCount(m), 0), from: ms.length ? Math.min(...ms.map(minPrice)) : 0 };
  };
  const cordless = stat("cordless");
  const robot = stat("robot");
  const nextPickup = pickupDateFor(new Date(), closed);

  const benefits = [
    {
      icon: ICON.door,
      title: "문 앞 픽업 · 문 앞 배달",
      body: "들고 나갈 필요 없어요. 박스에 담아 문 앞에 두시면 저녁에 수거하고, 교체가 끝나면 다시 문 앞에 가져다 드려요.",
    },
    { icon: ICON.cell, title: CELL_CLAIM.title, body: CELL_CLAIM.detail },
    { icon: ICON.shield, title: WARRANTY_CLAIM.title, body: WARRANTY_CLAIM.detail },
    {
      icon: ICON.clock,
      title: "18시 전 입금하면 당일 수거",
      body: `수거는 월~목, 배송은 월~토 ${VISIT_WINDOW}. 교체가 어려운 제품은 전액 환불하고 무료로 돌려드려요.`,
    },
  ];

  const steps = [
    { t: "신청·입금", d: "모델을 고르면 가격이 바로 나와요. 계좌이체로 결제해요." },
    { t: "문 앞에 두기", d: "박스에 포장해서 문 앞에 두세요. 공동현관은 저희가 열고 들어가요." },
    { t: "교체·품질검사", d: "전문 업체에서 배터리를 리필하고 충전·작동·발열을 확인해요." },
    { t: "문 앞 배송", d: "교체 내역과 함께 다시 문 앞까지 가져다 드려요." },
  ];

  return (
    <>
      <header className="brandbar">
        <BrandLockup compact />
        {session ? (
          <Link href="/orders" className="brandbar-link">
            내 주문
          </Link>
        ) : (
          <Link href="/login" className="brandbar-link">
            로그인
          </Link>
        )}
      </header>

      <main className="landing">
        {error === "admin" && (
          <div className="alert err">
            <b>관리자만 볼 수 있는 화면이에요.</b>
          </div>
        )}

        {active.length > 0 && (
          <section className="stack" aria-label="진행 중인 주문">
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
          </section>
        )}

        <section className="hero2">
          <div className="hero2-sign" aria-hidden="true">
            {PARKRIO_OFFICIAL_LOGO ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={PARKRIO_OFFICIAL_LOGO} alt="" className="parkrio-official" />
            ) : (
              <BrandEmblem size={72} />
            )}
          </div>
          <span className="hero2-eyebrow">{HERO.eyebrow}</span>
          <h1 className="hero2-title">
            {HERO.title[0]}
            <br />
            {HERO.title[1]}
          </h1>
          <p className="hero2-body">{HERO.body}</p>
          <p className="tagline">“{TAGLINE}”</p>
          <div className="hero2-cta">
            <Link href="/order" className="btn">
              지금 수리 신청하기
            </Link>
            <Link href="/prices" className="btn ghost">
              모델별 가격 보기
            </Link>
          </div>
          <p className="hero2-note">
            다음 수거 {formatDay(nextPickup)} {VISIT_WINDOW} · 18시 전 입금 시 당일 수거
          </p>
        </section>

        <section className="section">
          <span className="section-eyebrow">왜 {BRAND.name}인가요</span>
          <h2 className="section-title">파크리오 입주민만을 위한 맞춤형 픽업·배달 서비스</h2>
          <div className="benefits">
            {benefits.map((b) => (
              <div key={b.title} className="benefit">
                <span className="benefit-icon">
                  <Icon d={b.icon} />
                </span>
                <b>{b.title}</b>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <span className="section-eyebrow">이렇게 진행돼요</span>
          <h2 className="section-title">신청부터 배송까지 집 밖으로 나갈 일이 없어요</h2>
          <ol className="flow4">
            {steps.map((s) => (
              <li key={s.t}>
                <b>{s.t}</b>
                <span>{s.d}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" id="order">
          <span className="section-eyebrow">수리 신청</span>
          <h2 className="section-title">어떤 청소기 배터리를 바꿀까요?</h2>
          <div className="kinds">
            <Link className="kind" href="/order?kind=cordless">
              <KindIcon kind="cordless" />
              <div>
                <b>무선청소기</b>
                <span>
                  다이슨·LG·삼성·일렉트로룩스 등 {cordless.count}개 모델 · {formatWon(cordless.from)}부터
                </span>
              </div>
            </Link>
            <Link className="kind" href="/order?kind=robot">
              <KindIcon kind="robot" />
              <div>
                <b>로봇청소기</b>
                <span>
                  로보락·에코백스·삼성·LG 등 {robot.count}개 모델 · {formatWon(robot.from)}부터
                </span>
              </div>
            </Link>
          </div>
          <p className="small muted">가격에는 수거·배송, 품질검사, 보증이 모두 포함돼 있어요. 목록에 없는 모델도 사진을 보내 주시면 확인해 드려요.</p>
        </section>

        <footer className="landing-foot">
          <BrandLockup compact />
          <Link href="/help" className="small">
            문의하기
          </Link>
          <p>{DISCLAIMER}</p>
        </footer>
      </main>
    </>
  );
}
