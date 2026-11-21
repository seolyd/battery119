import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, supabaseServer } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";

function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

// 카카오 로그인 시작. 데모 모드에서는 ?as=customer|admin 으로 데모 계정에 로그인한다.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const next = safeNext(form.get("next") as string | null);
  const origin = request.nextUrl.origin;

  if (isDemoMode()) {
    const as = form.get("as") === "admin" ? "admin" : "customer";
    const res = NextResponse.redirect(new URL(as === "admin" ? "/admin" : next, origin), 303);
    res.cookies.set(DEMO_COOKIE, as, { httpOnly: true, sameSite: "lax", path: "/" });
    return res;
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, origin), 303);
  }
  return NextResponse.redirect(data.url, 303);
}
