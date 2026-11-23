"use client";

import { useActionState, useState } from "react";
import { askFromLink, type TokenInquiryState } from "@/app/s/[token]/actions";

/** 계좌번호 복사 버튼. 복사가 막힌 휴대폰이면 글자를 골라 둔다 */
export function CopyButton({ text, label = "복사하기" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost easy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        } catch {
          const el = document.getElementById("copy-target");
          if (el) {
            const r = document.createRange();
            r.selectNodeContents(el);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(r);
          }
        }
      }}
    >
      {done ? "복사했어요" : label}
    </button>
  );
}

export function AskForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TokenInquiryState, FormData>(askFromLink.bind(null, token), {});
  if (state.ok)
    return (
      <div className="easy-card done">
        <b>보냈어요</b>
        <p>답변이 오면 문자로 알려 드려요. 이 화면에서도 볼 수 있어요.</p>
      </div>
    );
  if (!open)
    return (
      <button type="button" className="btn ghost easy-btn" onClick={() => setOpen(true)}>
        궁금한 점 물어보기
      </button>
    );
  return (
    <form action={action} className="easy-card">
      <label className="easy-label" htmlFor="ask-body">
        무엇이 궁금하세요?
      </label>
      <textarea id="ask-body" name="body" className="easy-input" rows={4} maxLength={1000} required placeholder="예: 저녁에 집에 없는데 괜찮나요?" />
      {state.error && <p className="easy-error">{state.error}</p>}
      <button className="btn easy-btn" disabled={pending}>
        {pending ? "보내는 중…" : "보내기"}
      </button>
    </form>
  );
}
