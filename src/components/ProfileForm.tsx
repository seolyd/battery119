"use client";

import { useActionState } from "react";
import { changePin, saveProfile, type ProfileState } from "@/app/(app)/me/actions";

function Msg({ s }: { s: ProfileState }) {
  if (s.error)
    return (
      <div className="alert err" role="alert">
        <b>{s.error}</b>
      </div>
    );
  return s.ok ? <div className="info">{s.ok}</div> : null;
}

const pinProps = { type: "password", inputMode: "numeric" as const, maxLength: 4, pattern: "\\d{4}", required: true };

export function ProfileForm({ name, phone, hasDoorCode }: { name: string; phone: string; hasDoorCode: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [pinState, pinAction, pinPending] = useActionState<ProfileState, FormData>(changePin, {});
  return (
    <>
      <form action={action} className="stack">
        <label className="field">
          이름
          <input name="name" maxLength={20} defaultValue={name} placeholder="부르실 이름" />
        </label>
        <label className="field">
          연락처
          <input name="phone" type="tel" inputMode="tel" maxLength={13} defaultValue={phone} placeholder="010-1234-5678" />
        </label>
        <label className="field">
          공동현관 비밀번호
          <input name="door" type="password" autoComplete="off" maxLength={30} placeholder={hasDoorCode ? "저장돼 있어요. 바꿀 때만 입력" : "예: 1234#"} />
        </label>
        <Msg s={state} />
        <button className="btn" disabled={pending}>
          {pending ? "저장하는 중…" : "저장"}
        </button>
      </form>

      <form action={pinAction} className="stack">
        <div className="label">로그인 비밀번호 바꾸기</div>
        <label className="field">
          지금 비밀번호
          <input name="current" autoComplete="current-password" {...pinProps} />
        </label>
        <div className="grid2">
          <label className="field">
            새 비밀번호
            <input name="pin" autoComplete="new-password" {...pinProps} />
          </label>
          <label className="field">
            새 비밀번호 확인
            <input name="pin2" autoComplete="new-password" {...pinProps} />
          </label>
        </div>
        <Msg s={pinState} />
        <button className="btn ghost" disabled={pinPending}>
          {pinPending ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </button>
      </form>
    </>
  );
}
