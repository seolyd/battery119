import { redirect } from "next/navigation";
import { AppBar } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getSession()) redirect(safe);
  const demo = isDemoMode();

  return (
    <>
      <AppBar title="로그인" back="/" />
      <main className="content">
        <h1 className="h2">카카오로 시작하기</h1>
        <p className="lead">수리 신청과 진행 상황 확인은 로그인 후에 할 수 있어요. 파크리오 주민이면 누구나 쓸 수 있어요.</p>
        {error && (
          <div className="alert err">
            <b>로그인하지 못했어요.</b> 잠시 후 다시 시도해 주세요.
          </div>
        )}
        {demo ? (
          <>
            <div className="info">
              지금은 데모 모드예요. 카카오 대신 데모 계정으로 들어가요. 데이터는 서버를 다시 시작하면 사라져요.
            </div>
            <form action="/auth/login" method="post" className="stack">
              <input type="hidden" name="next" value={safe} />
              <button className="btn kakao" name="as" value="customer">
                데모 고객으로 시작하기
              </button>
              <button className="btn ghost" name="as" value="admin">
                데모 운영자로 시작하기
              </button>
            </form>
          </>
        ) : (
          <form action="/auth/login" method="post">
            <input type="hidden" name="next" value={safe} />
            <button className="btn kakao">카카오로 계속하기</button>
          </form>
        )}
      </main>
    </>
  );
}
