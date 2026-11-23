import Link from "next/link";
import { AnswerForm, PinResetAction } from "@/components/AdminInquiryForms";
import { toSeoulDateTime } from "@/components/ui";
import { phoneDigits } from "@/lib/phone";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminInquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const showAll = status === "all";
  const store = getStore();
  const inquiries = await store.listInquiries(showAll ? {} : { status: "open" });
  const customers = await store.listCustomers([...new Set(inquiries.map((q) => q.customerId).filter((x): x is string => !!x))]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  // 비밀번호 재설정 요청은 지금 계정 상태(번호 일치 여부)를 다시 확인한다
  const resetAccounts = new Map(
    await Promise.all(
      inquiries.filter((q) => q.kind === "pin_reset").map(async (q) => [q.id, await store.findCustomerByUnit(q.dong, q.ho)] as const),
    ),
  );

  return (
    <>
      <h1 className="h2">문의</h1>
      <nav className="filters" aria-label="상태">
        <Link href="/admin/inquiries" aria-current={!showAll ? "true" : undefined}>
          답변 대기
        </Link>
        <Link href="/admin/inquiries?status=all" aria-current={showAll ? "true" : undefined}>
          전체
        </Link>
      </nav>
      {inquiries.length === 0 && <p className="muted">{showAll ? "아직 문의가 없어요." : "답변을 기다리는 문의가 없어요."}</p>}
      <div className="cols">
        {inquiries.map((q) => {
          const account = q.kind === "pin_reset" ? resetAccounts.get(q.id) : q.customerId ? byId.get(q.customerId) : null;
          const phoneMatch = account?.phone ? phoneDigits(account.phone) === phoneDigits(q.phone) : null;
          return (
            <section key={q.id} className="panel">
              <h2>
                <span>
                  {q.dong}동 {q.ho}호 · {q.kind === "pin_reset" ? "비밀번호 재설정" : "문의"}
                </span>
                <span className={`badge ${q.status === "answered" ? "ok" : "warn"}`}>{q.status === "answered" ? "답변 완료" : "대기"}</span>
              </h2>
              <div className="body">
                <dl className="kv">
                  <dt>받은 시각</dt>
                  <dd>{toSeoulDateTime(q.createdAt)}</dd>
                  <dt>연락처</dt>
                  <dd className="mono">{q.phone || "-"}</dd>
                  {q.orderId && (
                    <>
                      <dt>주문</dt>
                      <dd>
                        <Link href={`/admin/orders/${q.orderId}`}>주문 보기</Link>
                      </dd>
                    </>
                  )}
                  {q.kind === "pin_reset" && (
                    <>
                      <dt>계정</dt>
                      <dd>
                        {!account
                          ? "가입한 계정 없음"
                          : !account.phone
                            ? "계정에 등록된 번호 없음"
                            : phoneMatch
                              ? "등록된 번호와 같음"
                              : `등록된 번호와 다름 (${account.phone.slice(0, 3)}-****-${phoneDigits(account.phone).slice(-4)})`}
                      </dd>
                    </>
                  )}
                </dl>
                <p style={{ whiteSpace: "pre-wrap" }}>{q.body}</p>
                {q.answer ? (
                  <div className="info" style={{ color: "var(--fg)" }}>
                    <b className="small">답변 · {q.answeredAt ? toSeoulDateTime(q.answeredAt) : ""}</b>
                    <p style={{ whiteSpace: "pre-wrap" }}>{q.answer}</p>
                  </div>
                ) : q.kind === "pin_reset" ? (
                  account ? (
                    <PinResetAction id={q.id} accountHasPhone={!!account.phone} />
                  ) : (
                    <AnswerForm id={q.id} />
                  )
                ) : (
                  <AnswerForm id={q.id} />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
