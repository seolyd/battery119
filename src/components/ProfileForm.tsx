"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "@/app/(app)/me/actions";

export function ProfileForm({ dong, ho, phone, hasDoorCode }: { dong: string; ho: string; phone: string; hasDoorCode: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  return (
    <form action={action} className="stack">
      <div className="label">수거·배송 주소</div>
      <div className="grid2">
        <label className="field">
          동
          <input name="dong" inputMode="numeric" maxLength={3} defaultValue={dong} placeholder="215" />
        </label>
        <label className="field">
          호
          <input name="ho" inputMode="numeric" maxLength={4} defaultValue={ho} placeholder="1203" />
        </label>
      </div>
      <label className="field">
        공동현관 비밀번호
        <input name="door" type="password" autoComplete="off" maxLength={30} placeholder={hasDoorCode ? "저장돼 있어요. 바꿀 때만 입력" : "예: 1234#"} />
      </label>
      <label className="field">
        연락처
        <input name="phone" type="tel" inputMode="tel" maxLength={13} defaultValue={phone} placeholder="010-1234-5678" />
      </label>
      {state.error && (
        <div className="alert err" role="alert">
          <b>{state.error}</b>
        </div>
      )}
      {state.ok && <div className="info">저장했어요.</div>}
      <button className="btn" disabled={pending}>
        {pending ? "저장하는 중…" : "저장"}
      </button>
    </form>
  );
}
