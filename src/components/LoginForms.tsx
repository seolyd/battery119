"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/app/(app)/login/actions";

function Err({ s }: { s: AuthState }) {
  return s.error ? (
    <div className="alert err" role="alert">
      <b>{s.error}</b>
    </div>
  ) : null;
}

function Unit({ s }: { s: AuthState }) {
  return (
    <div className="grid2">
      <label className="field">
        동
        <input name="dong" inputMode="numeric" maxLength={3} placeholder="215" defaultValue={s.dong} required autoComplete="off" />
      </label>
      <label className="field">
        호
        <input name="ho" inputMode="numeric" maxLength={4} placeholder="1203" defaultValue={s.ho} required autoComplete="off" />
      </label>
    </div>
  );
}

const pinProps = {
  type: "password",
  inputMode: "numeric" as const,
  maxLength: 4,
  pattern: "\\d{4}",
  placeholder: "숫자 4자리",
  required: true,
};

export function LoginForms({ next, startWithSignup }: { next: string; startWithSignup: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(startWithSignup ? "signup" : "login");
  const [ls, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [ss, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});

  return (
    <>
      <nav className="filters" aria-label="로그인 또는 가입">
        <a href="#" aria-current={mode === "login" ? "true" : undefined} onClick={(e) => (e.preventDefault(), setMode("login"))}>
          로그인
        </a>
        <a href="#" aria-current={mode === "signup" ? "true" : undefined} onClick={(e) => (e.preventDefault(), setMode("signup"))}>
          처음이에요
        </a>
      </nav>

      {mode === "login" ? (
        <form action={loginAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <Unit s={ls} />
          <label className="field">
            비밀번호
            <input name="pin" autoComplete="current-password" {...pinProps} />
          </label>
          <Err s={ls} />
          <button className="btn" disabled={loginPending}>
            {loginPending ? "확인하는 중…" : "로그인"}
          </button>
          <p className="small muted">비밀번호를 잊으셨으면 카카오톡 채널로 문의해 주세요. 확인 후 새로 정해 드려요.</p>
        </form>
      ) : (
        <form action={signupAction} className="stack">
          <input type="hidden" name="next" value={next} />
          <p className="lead">한 세대에 계정 하나예요. 가족이 같은 동·호수와 비밀번호로 함께 쓰시면 돼요.</p>
          <Unit s={ss} />
          <div className="grid2">
            <label className="field">
              비밀번호
              <input name="pin" autoComplete="new-password" {...pinProps} />
            </label>
            <label className="field">
              비밀번호 확인
              <input name="pin2" autoComplete="new-password" {...pinProps} />
            </label>
          </div>
          <label className="field">
            이름 (선택)
            <input name="name" maxLength={20} placeholder="부르실 이름" />
          </label>
          <label className="field">
            연락처 (선택)
            <input name="phone" type="tel" inputMode="tel" maxLength={13} placeholder="010-1234-5678" />
          </label>
          <label className="agree">
            <input type="checkbox" name="resident" required />
            <span>잠실 파크리오 입주민이에요</span>
          </label>
          <Err s={ss} />
          <button className="btn" disabled={signupPending}>
            {signupPending ? "가입하는 중…" : "가입하고 시작하기"}
          </button>
        </form>
      )}
    </>
  );
}
