import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, supabaseServer } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  if (isDemoMode()) {
    res.cookies.delete(DEMO_COOKIE);
  } else {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  return res;
}
