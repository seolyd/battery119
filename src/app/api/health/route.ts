import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// 상태 확인용. Vercel이 하루에 한 번 호출해서 Supabase 무료 프로젝트가 잠들지 않게 한다.
export async function GET() {
  try {
    const models = await getStore().listModels({ activeOnly: true });
    return NextResponse.json({ ok: true, models: models.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
