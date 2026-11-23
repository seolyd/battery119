import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderActions, DoorCode, ResetPin } from "@/components/AdminOrderActions";
import { SmsCard } from "@/components/SmsCard";
import { shortLink } from "@/lib/notify";
import { smsDraft } from "@/lib/sms";
import { StatusBadge, toSeoulDateTime } from "@/components/ui";
import { ADMIN_TRANSITIONS, CATEGORY_LABEL, formatWon, STATUS_LABEL } from "@/lib/domain";
import { formatDay, nextDeliveryDate } from "@/lib/schedule";
import { TEMPLATES } from "@/lib/notify/templates";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) notFound();
  const [customer, events, inspection, partners, closed, notes] = await Promise.all([
    store.getCustomer(order.customerId),
    store.listEvents(order.id),
    store.getInspection(order.id),
    store.listPartners(),
    store.listClosedDates(),
    store.listNotifications({ orderId: id }),
  ]);
  const pushDevices = (await store.listPushSubscriptions({ customerId: order.customerId })).length;
  const sms = smsDraft(order, events);
  // 이 상태 알림을 웹 푸시로 이미 보냈는지
  const pushedNow = sms ? notes.some((n) => n.channel === "push" && n.event === sms.event && n.status === "sent") : false;
  const partner = partners.find((p) => p.id === order.partnerId);
  const margin = order.price != null && order.partnerCost != null ? order.price - order.partnerCost : null;

  return (
    <>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/orders" className="small muted">
            ‹ 주문 목록
          </Link>
          <h1 className="h2 mono">{order.orderNo}</h1>
        </div>
        <StatusBadge status={order.status} admin />
      </div>

      {sms && (
        <SmsCard
          key={sms.event /* 상태가 바뀌면 새 문구로 다시 채운다 */}
          orderId={order.id}
          event={sms.event}
          eventName={TEMPLATES[sms.event].name}
          phone={sms.phone}
          text={sms.text}
          pushNote={
            pushedNow
              ? "웹 푸시로 이미 보냈어요. 문자는 선택이에요."
              : pushDevices
                ? `고객이 알림을 켠 기기 ${pushDevices}대`
                : "고객이 알림을 켜지 않았어요. 문자로 알려 주세요."
          }
        />
      )}

      <div className="cols">
        <section className="panel">
          <h2>제품</h2>
          <div className="body">
            <dl className="kv">
              <dt>종류</dt>
              <dd>{CATEGORY_LABEL[order.category]}</dd>
              <dt>제조사</dt>
              <dd>{order.brand}</dd>
              <dt>모델</dt>
              <dd>
                {order.modelName}
                {!order.modelId && <span className="badge warn" style={{ marginLeft: 6 }}>목록 밖</span>}
              </dd>
              {order.optionLabel && (
                <>
                  <dt>용량</dt>
                  <dd>{order.optionLabel}</dd>
                </>
              )}
              <dt>증상</dt>
              <dd>{order.symptoms.join(", ")}</dd>
              <dt>사용 기간</dt>
              <dd>{order.usageAge ?? "-"}</dd>
              <dt>고객 메모</dt>
              <dd>{order.memo ?? "-"}</dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <h2>고객·방문</h2>
          <div className="body">
            <dl className="kv">
              <dt>이름</dt>
              <dd>{customer?.name ?? "-"}</dd>
              <dt>주소</dt>
              <dd>
                파크리오 {order.dong}동 {order.ho}호
              </dd>
              <dt>연락처</dt>
              <dd className="mono">{order.phone}</dd>
              <dt>공동현관</dt>
              <dd>
                <DoorCode customerId={order.customerId} />
              </dd>
              <dt>수거일</dt>
              <dd>{order.pickupDate ? formatDay(order.pickupDate) : "-"}</dd>
              <dt>배송일</dt>
              <dd>{order.deliveryDate ? formatDay(order.deliveryDate) : "-"}</dd>
              <dt>고객 링크</dt>
              <dd>
                <a href={shortLink(order)} target="_blank" rel="noopener noreferrer" className="mono small">
                  {shortLink(order).replace(/^https?:\/\//, "")}
                </a>
              </dd>
              <dt>포장 동의</dt>
              <dd>{toSeoulDateTime(order.packagingAgreedAt)}</dd>
            </dl>
            <ResetPin customerId={order.customerId} />
          </div>
        </section>

        <section className="panel">
          <h2>금액·업체</h2>
          <div className="body">
            <dl className="kv">
              <dt>고객 결제</dt>
              <dd className="mono">{order.price != null ? formatWon(order.price) : "견적 전"}</dd>
              <dt>업체 원가</dt>
              <dd className="mono">{order.partnerCost != null ? formatWon(order.partnerCost) : "-"}</dd>
              <dt>차액</dt>
              <dd className="mono">{margin != null ? formatWon(margin) : "-"}</dd>
              <dt>협력업체</dt>
              <dd>{partner ? `${partner.name} (${partner.region})` : "-"}</dd>
              <dt>입금</dt>
              <dd>{order.paidAt ? `${toSeoulDateTime(order.paidAt)}${order.depositorName ? ` · ${order.depositorName}` : ""}` : "-"}</dd>
              <dt>환불</dt>
              <dd>{order.refunded ? "환불함" : "-"}</dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <h2>다음 단계</h2>
          <div className="body">
            <AdminOrderActions
              order={order}
              next={ADMIN_TRANSITIONS[order.status]}
              partners={partners}
              inspection={inspection}
              defaultDelivery={nextDeliveryDate(new Date(), closed)}
            />
          </div>
        </section>

        <section className="panel">
          <h2>
            알림 발송 <span className="small muted">웹 푸시·운영자 문자</span>
          </h2>
          <div className="body">
            {notes.length ? (
              <ul className="events">
                {notes.map((n) => (
                  <li key={n.id}>
                    <time>{toSeoulDateTime(n.createdAt)}</time>
                    <span>
                      <b>{TEMPLATES[n.event]?.name ?? n.event}</b>{" "}
                      <span className="small muted">{n.channel === "push" ? "웹 푸시" : n.channel === "sms_manual" ? "운영자 문자" : "알림톡"}</span>{" "}
                      <span className={`badge ${n.status === "sent" || n.status === "manual" ? "ok" : n.status === "failed" ? "warn" : "mute"}`}>
                        {n.status === "sent" ? "보냄" : n.status === "manual" ? "문자 앱 열림" : n.status === "failed" ? "실패" : "안 보냄"}
                      </span>
                      <span className="muted">
                        {" "}
                        · {n.toMasked}
                        {n.detail ? ` · ${n.detail}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="small muted">보낸 알림이 없어요.</span>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>기록</h2>
          <div className="body">
            <ul className="events">
              {events.map((e) => (
                <li key={e.id}>
                  <time>{toSeoulDateTime(e.createdAt)}</time>
                  <span>
                    {e.from ? `${STATUS_LABEL[e.from]} → ` : ""}
                    <b>{STATUS_LABEL[e.to]}</b>
                    <span className="muted"> · {e.actor === "customer" ? "고객" : e.actor === "admin" ? "운영자" : "시스템"}</span>
                    {e.note && <span className="muted"> · {e.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
