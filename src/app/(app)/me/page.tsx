import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { AppBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function Me() {
  const session = await requireUser("/me");
  const c = session.customer;

  return (
    <>
      <AppBar title="내 정보" />
      <main className="content">
        <div className="card flat">
          <span className="small muted">우리 집</span>
          <b>
            파크리오 {c.dong}동 {c.ho}호
          </b>
        </div>
        <ProfileForm name={c.name ?? ""} phone={c.phone ?? ""} hasDoorCode={!!c.doorCodeEnc} />
        <Link href="/prices" className="btn ghost">
          모델별 가격 보기
        </Link>
        <div className="info">
          교체 작업은 배송일부터 3개월 동안 보증해요. 같은 증상이 다시 생기면 주문 상세에서 무상 재점검을 요청하세요. 배터리 자체 제조사 보증은 따로 안내해
          드려요.
        </div>
        <form action={logout}>
          <button className="btn ghost">로그아웃</button>
        </form>
      </main>
    </>
  );
}
