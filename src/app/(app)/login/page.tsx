import { redirect } from "next/navigation";
import { LoginForms } from "@/components/LoginForms";
import { AppBar } from "@/components/ui";
import { getSession, safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; signup?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSession()) redirect(next);

  return (
    <>
      <AppBar title="로그인" back="/" />
      <main className="content">
        <h1 className="h2">동·호수로 시작하기</h1>
        <p className="lead">파크리오 동·호수와 숫자 4자리 비밀번호로 로그인해요.</p>
        {isDemoMode() && <div className="info">데모 모드예요. 가입한 정보는 서버를 다시 시작하면 사라져요.</div>}
        <LoginForms next={next} startWithSignup={sp.signup === "1"} />
      </main>
    </>
  );
}
