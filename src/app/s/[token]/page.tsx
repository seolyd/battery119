import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandLockup } from "@/components/BrandMark";
import { AskForm, CopyButton } from "@/components/EasyParts";
import { PushOptIn } from "@/components/PushOptIn";
import { toSeoulDateTime } from "@/components/ui";
import { formatWon } from "@/lib/domain";
import { EASY_STEPS, easyStatus } from "@/lib/easyStatus";
import { pushKeys } from "@/lib/push";
import { getStore } from "@/lib/store";
import { isAccessToken } from "@/lib/token";
import { continueOnThisPhone } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "내 신청 · 파크리오 배터리 119",
    robots: { index: false, follow: false },
    // 이 화면에서 "홈 화면에 추가"하면 이 화면이 바로 열린다
    manifest: isAccessToken(token) ? `/s/${token}/app.webmanifest` : undefined,
  };
}

// 문자 속 링크로 여는 화면. 로그인도, 앱 설치도, 주소를 기억할 필요도 없다.
export default async function EasyOrder({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isAccessToken(token)) notFound();
  const store = getStore();
  const order = await store.getOrderByToken(token);
  if (!order) notFound();
  const [closed, inquiries] = await Promise.all([store.listClosedDates(), store.listInquiries({ customerId: order.customerId })]);
  const mine = inquiries.filter((q) => q.orderId === order.id);
  const s = easyStatus(order, new Date(), closed);
  const bank = process.env.BANK_ACCOUNT || "";

  return (
    <div className="shell easy">
      <header className="brandbar">
        <BrandLockup compact />
      </header>
      <main className="easy-main">
        <p className="easy-hello">
          {order.dong}동 {order.ho}호 고객님
        </p>

        <section className={`easy-status ${s.tone}`} aria-live="polite">
          <h1>{s.headline}</h1>
          {s.todo && <p>{s.todo}</p>}
        </section>

        {order.status === "PAYMENT_PENDING" && order.price != null && bank && (
          <section className="easy-card">
            <span className="easy-label">보내실 곳</span>
            <b id="copy-target" className="easy-account">
              {bank}
            </b>
            <span className="easy-label">보내실 돈</span>
            <b className="easy-amount">{formatWon(order.price)}</b>
            <CopyButton text={bank} label="계좌번호 복사하기" />
          </section>
        )}

        {s.step >= 0 && (
          <ol className="easy-steps" aria-label="진행 단계">
            {EASY_STEPS.map((label, i) => (
              <li key={label} className={i < s.step || (i === s.step && s.tone === "done") ? "done" : i === s.step ? "now" : ""}>
                <span className="dot">{i < s.step || (i === s.step && s.tone === "done") ? "✓" : i + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        )}

        <section className="easy-card soft">
          <span className="easy-label">맡기신 제품</span>
          <b>
            {order.brand} {order.modelName}
          </b>
          {order.optionLabel && <span>{order.optionLabel}</span>}
          <span className="easy-small">신청 번호 {order.orderNo}</span>
        </section>

        <PushOptIn publicKey={pushKeys()?.publicKey ?? null} token={token} big />

        {mine.length > 0 && (
          <section className="stack">
            <span className="easy-label">물어보신 것</span>
            {mine.map((q) => (
              <div key={q.id} className="easy-card soft">
                <p className="easy-small">{toSeoulDateTime(q.createdAt)}</p>
                <p style={{ whiteSpace: "pre-wrap" }}>{q.body}</p>
                {q.answer ? (
                  <div className="easy-answer">
                    <b>답변</b>
                    <p style={{ whiteSpace: "pre-wrap" }}>{q.answer}</p>
                  </div>
                ) : (
                  <p className="easy-small">답변을 준비하고 있어요.</p>
                )}
              </div>
            ))}
          </section>
        )}

        <AskForm token={token} />

        <form action={continueOnThisPhone.bind(null, token)}>
          <button className="btn ghost easy-btn">다른 청소기도 맡기기 · 내 신청 모두 보기</button>
        </form>

        <p className="easy-foot">문자에 있는 링크를 누르면 언제든 이 화면을 다시 볼 수 있어요. 따로 기억하실 필요 없어요.</p>
      </main>
    </div>
  );
}
