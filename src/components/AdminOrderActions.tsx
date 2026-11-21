"use client";

import { useActionState, useState } from "react";
import { changeStatus, resetPin, revealDoorCode, saveInspection, type ActionState } from "@/app/admin/orders/[id]/actions";
import { STATUS_LABEL, type Inspection, type Order, type OrderStatus, type Partner } from "@/lib/domain";

const VERB: Partial<Record<OrderStatus, string>> = {
  PAYMENT_PENDING: "견적 보내기 (입금 대기로)",
  PAID: "입금 확인",
  PICKED_UP: "수거 완료",
  AT_PARTNER: "업체에 입고",
  REPAIRING: "교체 작업 시작",
  QC: "교체 완료 → 품질검사",
  NOT_REPAIRABLE: "교체 불가 판정",
  DELIVERY_SCHEDULED: "배송일 잡기",
  DELIVERED: "배송 완료",
  CANCELED: "주문 취소",
};

function Msg({ s }: { s: ActionState }) {
  if (s.error)
    return (
      <div className="alert err" role="alert">
        <b>{s.error}</b>
      </div>
    );
  if (s.ok) return <div className="info">{s.ok}</div>;
  return null;
}

function TransitionForm({
  order,
  to,
  partners,
  defaultDelivery,
}: {
  order: Order;
  to: OrderStatus;
  partners: Partner[];
  defaultDelivery: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(changeStatus.bind(null, order.id), {});
  const danger = to === "CANCELED" || to === "NOT_REPAIRABLE";
  const back = order.status === "QC" && to === "REPAIRING";
  return (
    <form action={action}>
      <input type="hidden" name="to" value={to} />
      <b>{back ? "불합격 → 업체로 다시 보내기" : VERB[to] ?? STATUS_LABEL[to]}</b>
      {to === "PAYMENT_PENDING" && (
        <div className="inline">
          <label className="field">
            고객 결제 금액
            <input name="price" inputMode="numeric" required placeholder="95000" defaultValue={order.price ?? ""} />
          </label>
          <label className="field">
            업체 원가
            <input name="partnerCost" inputMode="numeric" placeholder="65000" defaultValue={order.partnerCost ?? ""} />
          </label>
        </div>
      )}
      {to === "PAID" && (
        <label className="field">
          입금자명
          <input name="depositorName" placeholder="통장에 찍힌 이름" />
        </label>
      )}
      {(to === "AT_PARTNER" || to === "PAYMENT_PENDING") && (
        <label className="field">
          맡길 협력업체
          <select name="partnerId" defaultValue={order.partnerId ?? ""}>
            <option value="">선택</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.region})
              </option>
            ))}
          </select>
        </label>
      )}
      {to === "DELIVERY_SCHEDULED" && (
        <>
          <label className="field">
            배송일 (월~토 19~22시)
            <input type="date" name="deliveryDate" defaultValue={order.deliveryDate ?? defaultDelivery} required />
          </label>
          {order.status === "NOT_REPAIRABLE" && (
            <label className="check">
              <input type="checkbox" name="refunded" defaultChecked /> 결제 금액 환불 완료
            </label>
          )}
        </>
      )}
      {to === "CANCELED" && order.paidAt && (
        <label className="check">
          <input type="checkbox" name="refunded" /> 환불 완료
        </label>
      )}
      <label className="field">
        메모 (선택)
        <input name="note" placeholder={to === "NOT_REPAIRABLE" ? "교체 불가 사유" : ""} />
      </label>
      <Msg s={state} />
      <button className={`btn sm ${danger || back ? "danger" : ""}`} disabled={pending}>
        {pending ? "처리 중…" : back ? "업체로 다시 보내기" : VERB[to] ?? STATUS_LABEL[to]}
      </button>
    </form>
  );
}

export function AdminOrderActions({
  order,
  next,
  partners,
  inspection,
  defaultDelivery,
}: {
  order: Order;
  next: OrderStatus[];
  partners: Partner[];
  inspection: Inspection | null;
  defaultDelivery: string;
}) {
  const [qc, qcAction, qcPending] = useActionState<ActionState, FormData>(saveInspection.bind(null, order.id), {});
  const hideDelivery = order.status === "QC" && !inspection?.passed;
  return (
    <div className="actions">
      {order.status === "QC" && (
        <form action={qcAction}>
          <b>품질검사</b>
          <label className="check">
            <input type="checkbox" name="chargeOk" defaultChecked={inspection?.chargeOk} /> 충전 정상
          </label>
          <label className="check">
            <input type="checkbox" name="heatOk" defaultChecked={inspection?.heatOk} /> 발열 이상 없음
          </label>
          <label className="check">
            <input type="checkbox" name="exteriorOk" defaultChecked={inspection?.exteriorOk} /> 외관 이상 없음
          </label>
          <label className="field">
            완충 후 작동 시간 (분)
            <input name="runtimeMin" inputMode="numeric" defaultValue={inspection?.runtimeMin ?? ""} placeholder="40" />
          </label>
          <label className="field">
            메모
            <input name="note" defaultValue={inspection?.note ?? ""} />
          </label>
          <Msg s={qc} />
          <button className="btn sm" disabled={qcPending}>
            검사 결과 저장
          </button>
        </form>
      )}
      {next
        .filter((to) => !(hideDelivery && to === "DELIVERY_SCHEDULED"))
        .map((to) => (
          <TransitionForm key={to} order={order} to={to} partners={partners} defaultDelivery={defaultDelivery} />
        ))}
      {!next.length && <span className="small muted">더 바꿀 상태가 없어요.</span>}
    </div>
  );
}

export function DoorCode({ customerId }: { customerId: string }) {
  const [code, setCode] = useState<string | null>(null);
  return code ? (
    <span className="mono">{code}</span>
  ) : (
    <button type="button" className="btn sm ghost" onClick={async () => setCode(await revealDoorCode(customerId))}>
      보기
    </button>
  );
}

export function ResetPin({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPin.bind(null, customerId), {});
  if (!open)
    return (
      <button type="button" className="btn sm ghost" onClick={() => setOpen(true)}>
        로그인 비밀번호 새로 정하기
      </button>
    );
  return (
    <form action={action} className="stack" style={{ gap: 6 }}>
      <label className="field">
        새 비밀번호 (숫자 4자리)
        <input name="pin" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required autoComplete="off" />
      </label>
      <Msg s={state} />
      <button className="btn sm" disabled={pending}>
        저장
      </button>
    </form>
  );
}
