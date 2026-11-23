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

/** 문자 링크 화면: 카카오톡 채널로 소식 받기. 채널은 고객이 먼저 말을 걸어야 해서, 동·호수만 보내 달라고 안내한다 */
export function KakaoConnect({ chatUrl, unit, linked }: { chatUrl: string; unit: string; linked: boolean }) {
  const [copied, setCopied] = useState(false);
  if (linked)
    return (
      <div className="push-box on big">
        <b>💬 카카오톡으로도 알려 드려요</b>
        <span className="push-note">파크리오 배터리 119 카카오톡 채널로 진행 상황을 보내 드려요.</span>
      </div>
    );
  return (
    <div className="push-box big">
      <b>💬 카카오톡으로 소식 받기</b>
      <ol className="ios-steps">
        <li>아래 버튼을 눌러 카카오톡 채널을 열어요</li>
        <li>
          <b>{unit}</b> 이라고만 보내 주세요
        </li>
      </ol>
      <a className="btn easy-btn" href={chatUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#fee500", color: "#191600" }}>
        카카오톡 채널 열기
      </a>
      <button
        type="button"
        className="btn ghost easy-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(unit);
            setCopied(true);
          } catch {
            /* 복사가 막히면 직접 적으면 된다 */
          }
        }}
      >
        {copied ? `“${unit}” 복사했어요` : `“${unit}” 복사하기`}
      </button>
      <span className="push-note">그다음부터는 문자 대신 카카오톡으로 알려 드려요.</span>
    </div>
  );
}
