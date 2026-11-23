import { InquiryForm } from "@/components/HelpForms";
import { AppBar, toSeoulDateTime } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Help({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const session = await requireUser(order ? `/help?order=${order}` : "/help");
  const store = getStore();
  const [orders, inquiries] = await Promise.all([store.listOrdersByCustomer(session.userId), store.listInquiries({ customerId: session.userId })]);
  const orderLabel = new Map(orders.map((o) => [o.id, `${o.orderNo} · ${o.brand} ${o.modelName}`.slice(0, 60)]));

  return (
    <>
      <AppBar title="문의하기" back="/me" />
      <main className="content">
        <p className="lead">궁금한 점을 남겨 주세요. 답변이 등록되면 알림톡으로 알려 드리고, 이 화면에서 볼 수 있어요.</p>
        {!session.customer.phone && (
          <div className="alert">
            <b>연락처가 없어요.</b> 내 정보에 휴대폰 번호를 저장하면 답변 알림을 받을 수 있어요.
          </div>
        )}
        <InquiryForm
          orders={orders.slice(0, 10).map((o) => ({ id: o.id, label: orderLabel.get(o.id)! }))}
          defaultOrderId={order && orderLabel.has(order) ? order : null}
        />

        {inquiries.length > 0 && (
          <>
            <div className="label">지난 문의</div>
            <div className="list">
              {inquiries.map((q) => (
                <div key={q.id} className="card">
                  <div className="row">
                    <span className="small muted">{toSeoulDateTime(q.createdAt)}</span>
                    <span className={`badge ${q.status === "answered" ? "ok" : "warn"}`}>{q.status === "answered" ? "답변 완료" : "답변 대기"}</span>
                  </div>
                  {q.orderId && orderLabel.get(q.orderId) && <span className="small muted">{orderLabel.get(q.orderId)}</span>}
                  <p style={{ whiteSpace: "pre-wrap" }}>{q.body}</p>
                  {q.answer && (
                    <div className="info" style={{ color: "var(--fg)" }}>
                      <b className="small">답변 · {q.answeredAt ? toSeoulDateTime(q.answeredAt) : ""}</b>
                      <p style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
