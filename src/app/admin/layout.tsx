import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-top">
        <span className="brand">배터리 119 관리</span>
        <AdminNav />
        <span className="small muted">{s.name}</span>
        <Link href="/" className="small muted">
          고객 화면
        </Link>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
