"use client";

import { useActionState } from "react";
import { requestPinReset, sendInquiry, type HelpState } from "@/app/(app)/help/actions";

function Msg({ s }: { s: HelpState }) {
  if (s.error)
    return (
      <div className="alert err" role="alert">
        <b>{s.error}</b>
      </div>
    );
  return s.ok ? <div className="info">{s.ok}</div> : null;
}

export function InquiryForm({ orders, defaultOrderId }: { orders: { id: string; label: string }[]; defaultOrderId: string | null }) {
  const [state, action, pending] = useActionState<HelpState, FormData>(sendInquiry, {});
  return (
    <form action={action} className="stack">
      {orders.length > 0 && (
        <label className="field">
          어떤 주문에 대한 문의인가요? (선택)
          <select name="orderId" defaultValue={defaultOrderId ?? ""}>
            <option value="">주문과 관계없는 문의</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        문의 내용
        <textarea name="body" required maxLength={1000} rows={5} placeholder="예: 다이슨 V10인데 목록에서 못 찾겠어요" key={state.ok ? "sent" : "draft"} />
      </label>
      <Msg s={state} />
      <button className="btn" disabled={pending}>
        {pending ? "보내는 중…" : "문의 보내기"}
      </button>
    </form>
  );
}

export function PinResetForm() {
  const [state, action, pending] = useActionState<HelpState, FormData>(requestPinReset, {});
  if (state.ok)
    return (
      <div className="card accent">
        <b>요청을 받았어요</b>
        <span className="small muted">{state.ok}</span>
      </div>
    );
  return (
    <form action={action} className="stack">
      <div className="grid2">
        <label className="field">
          동
          <input name="dong" inputMode="numeric" maxLength={3} placeholder="215" required />
        </label>
        <label className="field">
          호
          <input name="ho" inputMode="numeric" maxLength={4} placeholder="1203" required />
        </label>
      </div>
      <label className="field">
        연락처
        <input name="phone" type="tel" inputMode="tel" maxLength={16} placeholder="010-1234-5678" required />
      </label>
      <label className="field">
        남길 말 (선택)
        <textarea name="memo" maxLength={300} rows={2} placeholder="예: 가입할 때 번호를 안 적었어요" />
      </label>
      <Msg s={state} />
      <button className="btn" disabled={pending}>
        {pending ? "보내는 중…" : "재설정 요청하기"}
      </button>
    </form>
  );
}
