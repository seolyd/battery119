import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { adminPassword, isAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  const configured = !!adminPassword();
  return (
    <div className="shell">
      <header className="appbar">
        <span className="title">배터리 119 관리자</span>
      </header>
      <main className="content">
        {configured ? (
          <>
            {isDemoMode() && !process.env.ADMIN_PASSWORD && <div className="info">데모 모드 관리자 비밀번호: admin-demo</div>}
            <AdminLoginForm />
          </>
        ) : (
          <div className="alert err">
            <b>ADMIN_PASSWORD 환경 변수가 없어요.</b> 10자 이상으로 정해 배포 설정에 넣어 주세요.
          </div>
        )}
      </main>
    </div>
  );
}
