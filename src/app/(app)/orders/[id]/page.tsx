import { notFound } from "next/navigation";
import { AppBar, CustomerTimeline, StatusBadge, toSeoulDate } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CATEGORY_LABEL, CUSTOMER_CANCELABLE, formatWon, inWarranty, warrantyEnds } from "@/lib/domain";
import { formatDay, pickupDateFor, VISIT_WINDOW } from "@/lib/schedule";
import { getStore } from "@/lib/store";
import { cancelOrder, requestAs } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const session = await requireUser(`/orders/${id}`);
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order || order.customerId !== session.userId) notFound();
  const [inspection, closed] = await Promise.all([store.getInspection(order.id), store.listClosedDates()]);
  const bank = process.env.BANK_ACCOUNT || "입금 계좌는 카카오톡으로 안내해 드려요";
  const warranty = inWarranty(order);

  return (
    <>
      <AppBar title="주문 상세" back="/orders" sub={order.orderNo} />
      <main className="content">
        {isNew && (
          <div className="card accent">
            <b>{order.status === "REQUESTED" ? "견적 요청이 접수됐어요" : "신청이 접수됐어요"}</b>
            <span className="small muted">
              {order.status === "REQUESTED"
                ? "모델을 확인하고 견적을 알려 드릴게요. 견적이 나오면 이 화면에 입금 안내가 보여요."
                : `아래 계좌로 입금해 주세요. 지금 입금하시면 ${formatDay(pickupDateFor(new Date(), closed))} ${VISIT_WINDOW}에 수거해요.`}
            </span>
          </div>
        )}

        <div className="card flat">
          <div className="row">
            <span className="small muted">
              {CATEGORY_LABEL[order.category]} · {order.brand}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <b>{order.modelName}</b>
          {order.optionLabel && <span className="small">{order.optionLabel}</span>}
          <span className="small muted">{order.symptoms.join(", ")}</span>
        </div>

        {order.status === "PAYMENT_PENDING" && order.price != null && (
          <div className="card accent">
            <div className="row">
              <b>입금 안내</b>
              <span className="badge">입금 대기</span>
            </div>
            <div className="row">
              <span className="muted small">금액</span>
              <b className="mono">{formatWon(order.price)}</b>
            </div>
            <div className="row">
              <span className="muted small">계좌</span>
              <span className="small" style={{ textAlign: "right" }}>
                {bank}
              </span>
            </div>
            <span className="small muted">입금자명은 신청하신 분 성함이나 {order.dong}동 {order.ho}호로 해 주세요.</span>
          </div>
        )}
        {order.status === "PAID" && order.pickupDate && (
          <div className="card accent">
            <b>
              {formatDay(order.pickupDate)} {VISIT_WINDOW}에 수거해요
            </b>
            <span className="small muted">박스에 포장해서 문 앞에 두세요. 수거하면 알려 드려요.</span>
          </div>
        )}
        {order.status === "DELIVERY_SCHEDULED" && order.deliveryDate && (
          <div className="card accent">
            <b>
              {formatDay(order.deliveryDate)} {VISIT_WINDOW}에 배송해요
            </b>
            {order.refunded && <span className="small muted">교체가 어려워 결제 금액을 환불하고 제품을 돌려드려요.</span>}
          </div>
        )}

        <div className="label">진행 상황</div>
        <CustomerTimeline order={order} />

        {inspection && (
          <>
            <div className="label">품질검사 결과</div>
            <div className="bill">
              <div>
                <span className="m">충전</span>
                <span>{inspection.chargeOk ? "정상" : "확인 필요"}</span>
              </div>
              {inspection.runtimeMin != null && (
                <div>
                  <span className="m">작동 시간</span>
                  <span>{inspection.runtimeMin}분</span>
                </div>
              )}
              <div>
                <span className="m">발열</span>
                <span>{inspection.heatOk ? "이상 없음" : "확인 필요"}</span>
              </div>
              <div>
                <span className="m">외관</span>
                <span>{inspection.exteriorOk ? "이상 없음" : "확인 필요"}</span>
              </div>
            </div>
          </>
        )}

        <div className="label">신청 정보</div>
        <div className="bill">
          <div>
            <span className="m">결제 금액</span>
            <span>{order.price != null ? formatWon(order.price) : "견적 전"}</span>
          </div>
          <div>
            <span className="m">주소</span>
            <span>
              파크리오 {order.dong}동 {order.ho}호
            </span>
          </div>
          <div>
            <span className="m">신청일</span>
            <span>{formatDay(toSeoulDate(order.createdAt))}</span>
          </div>
          {order.deliveredAt && (
            <div>
              <span className="m">보증 기간</span>
              <span>{formatDay(toSeoulDate(warrantyEnds(order.deliveredAt).toISOString()))}까지</span>
            </div>
          )}
        </div>

        {CUSTOMER_CANCELABLE.includes(order.status) && (
          <form action={cancelOrder.bind(null, order.id)}>
            <button className="btn danger">신청 취소하기</button>
          </form>
        )}
        {warranty && (
          <form action={requestAs.bind(null, order.id)} className="stack">
            <label className="field">
              같은 증상이 다시 생겼나요?
              <textarea name="note" placeholder="어떤 증상인지 적어 주세요" maxLength={300} />
            </label>
            <button className="btn ghost">무상 재점검 요청하기</button>
          </form>
        )}
      </main>
    </>
  );
}
