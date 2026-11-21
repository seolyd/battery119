import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { adminLogout } from "../admin-login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-top">
        <span className="brand">배터리 119 관리</span>
        <AdminNav />
        <Link href="/" className="small muted">
          고객 화면
        </Link>
        <form action={adminLogout}>
          <button className="btn sm ghost">로그아웃</button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
