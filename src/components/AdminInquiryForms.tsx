"use client";

import { useActionState } from "react";
import { answerInquiry, resetPinFromInquiry, type AdminHelpState } from "@/app/admin/inquiries/actions";

function Msg({ s }: { s: AdminHelpState }) {
  if (s.error)
    return (
      <div className="alert err" role="alert">
        <b>{s.error}</b>
      </div>
    );
  if (!s.ok) return null;
  return (
    <div className="info">
      {s.ok}
      {s.pin && (
        <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--fg)", marginTop: 4 }}>
          {s.pin}
        </div>
      )}
    </div>
  );
}

export function AnswerForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AdminHelpState, FormData>(answerInquiry.bind(null, id), {});
  return (
    <form action={action} className="stack" style={{ gap: 6 }}>
      <label className="field">
        답변
        <textarea name="answer" required maxLength={2000} rows={3} />
      </label>
      <Msg s={state} />
      <button className="btn sm" disabled={pending}>
        {pending ? "등록하는 중…" : "답변 등록하고 알림 보내기"}
      </button>
    </form>
  );
}

export function PinResetAction({ id, accountHasPhone }: { id: string; accountHasPhone: boolean }) {
  const [state, action, pending] = useActionState<AdminHelpState, FormData>(resetPinFromInquiry.bind(null, id), {});
  return (
    <form action={action} className="stack" style={{ gap: 6 }}>
      {!accountHasPhone && (
        <label className="check">
          <input type="checkbox" name="verified" /> 계정에 번호가 없어요. 본인 확인을 마쳤고, 요청한 번호로 보낼게요
        </label>
      )}
      <Msg s={state} />
      {!state.ok && (
        <button className="btn sm" disabled={pending}>
          {pending ? "보내는 중…" : "새 비밀번호 만들어 보내기"}
        </button>
      )}
    </form>
  );
}
