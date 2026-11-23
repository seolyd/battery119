import { manifestResponse } from "@/lib/manifest";
import { isAccessToken } from "@/lib/token";

// 문자 링크 화면에서 "홈 화면에 추가"하면 그 주문 화면이 바로 열린다
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isAccessToken(token)) return new Response("not found", { status: 404 });
  return manifestResponse(`/s/${token}`, `/s/${token}`);
}
