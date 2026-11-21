import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Customer } from "@/lib/domain";
import { getStore, isDemoMode } from "@/lib/store";

export const DEMO_COOKIE = "b119_demo";
export const DEMO_USERS = {
  customer: { id: "demo-customer", name: "데모 고객" },
  admin: { id: "demo-admin", name: "데모 운영자" },
} as const;

export interface Session {
  userId: string;
  name: string | null;
  isAdmin: boolean;
  customer: Customer;
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 미들웨어가 세션을 갱신한다.
        }
      },
    },
  });
}

function envAdmins(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function getSession(): Promise<Session | null> {
  const store = getStore();
  if (isDemoMode()) {
    const role = (await cookies()).get(DEMO_COOKIE)?.value;
    if (role !== "customer" && role !== "admin") return null;
    const u = DEMO_USERS[role];
    let customer = await store.ensureCustomer(u.id, { name: u.name });
    if (role === "admin" && !customer.isAdmin) customer = await store.updateCustomer(u.id, { isAdmin: true });
    return { userId: u.id, name: customer.name, isAdmin: customer.isAdmin, customer };
  }

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) || (meta.full_name as string) || (meta.nickname as string) || null;
  const customer = await store.ensureCustomer(user.id, { name });
  const isAdmin = customer.isAdmin || envAdmins().includes(user.id);
  return { userId: user.id, name: customer.name, isAdmin, customer };
}

export async function requireUser(next: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireUser("/admin");
  if (!s.isAdmin) redirect("/?error=admin");
  return s;
}
