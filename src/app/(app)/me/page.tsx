import Link from "next/link";
import { AppBar } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Me() {
  const session = await requireUser("/me");
  const c = session.customer;

  return (
    <>
      <AppBar title="내 정보" />
      <main className="content">
        <div className="card flat">
          <span className="small muted">카카오 계정</span>
          <b>{c.name ?? "이름 없음"}</b>
        </div>
        <ProfileForm dong={c.dong ?? ""} ho={c.ho ?? ""} phone={c.phone ?? ""} hasDoorCode={!!c.doorCodeEnc} />
        {session.isAdmin && (
          <Link href="/admin" className="btn ghost">
            관리자 화면으로
          </Link>
        )}
        <Link href="/prices" className="btn ghost">
          모델별 가격 보기
        </Link>
        <div className="info">
          교체 작업은 배송일부터 3개월 동안 보증해요. 같은 증상이 다시 생기면 주문 상세에서 무상 재점검을 요청하세요. 배터리 자체 제조사 보증은 따로 안내해
          드려요.
        </div>
        <form action="/auth/logout" method="post">
          <button className="btn ghost">로그아웃</button>
        </form>
      </main>
    </>
  );
}
