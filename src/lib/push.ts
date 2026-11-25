import "server-only";
import webpush from "web-push";
import { getStore } from "@/lib/store";

// 웹 푸시. 브라우저 회사(애플·구글)의 푸시 서버를 쓰고 비용이 없다.
// 키(VAPID)는 관리자 화면 > 설정에서 만들어 Netlify 환경 변수에 넣는다.

export interface PushKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function pushKeys(): PushKeys | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT || "mailto:admin@example.com" };
}

export function generatePushKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

export interface PushPayload {
  title: string;
  body: string;
  /** 알림을 누르면 열 주소 */
  url: string;
}

export interface PushResult {
  status: "sent" | "failed" | "skipped";
  detail: string;
}

export function pushToCustomer(customerId: string, payload: PushPayload): Promise<PushResult> {
  return pushTo({ customerId }, payload);
}

export function pushToAdmins(payload: PushPayload): Promise<PushResult> {
  return pushTo({ admin: true }, payload);
}

/** 알림을 켠 모든 기기로 보낸다. 없어진 기기(404·410)는 지운다. */
async function pushTo(who: { customerId: string } | { admin: true }, payload: PushPayload): Promise<PushResult> {
  const keys = pushKeys();
  if (!keys) return { status: "skipped", detail: "웹 푸시 키 설정 전 (VAPID_* 환경 변수 없음)" };
  const store = getStore();
  const subs = await store.listPushSubscriptions(who);
  if (!subs.length) return { status: "skipped", detail: "알림을 켠 기기 없음" };

  let ok = 0;
  const errors: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { vapidDetails: keys, TTL: 60 * 60 * 24, timeout: 8000 },
        );
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await store.deletePushSubscription(s.endpoint).catch(() => {});
          errors.push("알림을 끈 기기 정리");
        } else {
          errors.push(code ? `HTTP ${code}` : e instanceof Error ? e.message : String(e));
        }
      }
    }),
  );
  if (ok) return { status: "sent", detail: `기기 ${ok}대${errors.length ? ` (실패 ${errors.length}: ${errors.join(", ")})` : ""}` };
  return { status: "failed", detail: errors.join(", ") || "보내지 못했어요" };
}
