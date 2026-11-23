import "server-only";
import { createHmac, randomBytes } from "node:crypto";

// 솔라피(SOLAPI) 메시지 발송. https://solapi.com/developers
// 인증: Authorization: HMAC-SHA256 apiKey=<키>, date=<ISO 시각>, salt=<임의 문자열>, signature=<HMAC(시크릿, date+salt) 16진수>

// 테스트할 때만 SOLAPI_URL로 바꾼다
const solapiUrl = () => process.env.SOLAPI_URL || "https://api.solapi.com/messages/v4/send-many/detail";

export interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  /** 카카오 채널을 솔라피에 연동하면 생기는 발신 프로필 ID (PF로 시작) */
  pfId: string;
  /** 문자 발신번호 (솔라피에 등록·인증한 번호). 알림톡 실패 시 대체 문자와 운영자 문자에 쓴다 */
  sender: string | null;
}

export function solapiConfig(): SolapiConfig | null {
  const { SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_PFID, SOLAPI_SENDER } = process.env;
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_PFID) return null;
  return { apiKey: SOLAPI_API_KEY, apiSecret: SOLAPI_API_SECRET, pfId: SOLAPI_PFID, sender: SOLAPI_SENDER?.replace(/\D/g, "") || null };
}

export function authHeader(apiKey: string, apiSecret: string, date: string, salt: string): string {
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export type SolapiMessage =
  | { to: string; from?: string; text?: string; kakaoOptions: { pfId: string; templateId: string; variables: Record<string, string>; disableSms: boolean } }
  | { to: string; from: string; text: string };

export interface SendResult {
  ok: boolean;
  detail: string;
}

export async function solapiSend(cfg: SolapiConfig, message: SolapiMessage): Promise<SendResult> {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  try {
    const res = await fetch(solapiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader(cfg.apiKey, cfg.apiSecret, date, salt) },
      body: JSON.stringify({ messages: [message] }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status} ${text.slice(0, 300)}` };
    let data: { failedMessageList?: { statusMessage?: string; statusCode?: string }[]; groupInfo?: { groupId?: string } } = {};
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, detail: `응답을 읽지 못했어요: ${text.slice(0, 200)}` };
    }
    const failed = data.failedMessageList ?? [];
    if (failed.length) return { ok: false, detail: failed.map((f) => `${f.statusCode ?? ""} ${f.statusMessage ?? ""}`.trim()).join("; ") };
    return { ok: true, detail: data.groupInfo?.groupId ? `group ${data.groupInfo.groupId}` : "accepted" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
