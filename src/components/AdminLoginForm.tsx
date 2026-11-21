"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/admin-login/actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(adminLogin, {});
  return (
    <form action={action} className="stack">
      <label className="field">
        관리자 비밀번호
        <input name="password" type="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error && (
        <div className="alert err" role="alert">
          <b>{state.error}</b>
        </div>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "확인하는 중…" : "관리자 로그인"}
      </button>
    </form>
  );
}
