"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/actions/push";

// "알림 받기" 버튼. 어떤 휴대폰이든 고객이 헷갈리지 않게 상황마다 한 가지만 보여 준다.
//  - 아이폰 Safari: 홈 화면에 추가하는 방법 (아이폰은 홈 화면에 추가해야 알림이 와요)
//  - 알림을 켤 수 있음: 큰 "알림 받기" 버튼
//  - 이미 켜짐 / 꺼 둠 / 지원 안 함: 한 줄 안내 (문자로도 알려 드린다고 안심시키기)

type State = "loading" | "unsupported" | "ios-add" | "ready" | "on" | "denied" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function PushOptIn({
  publicKey,
  token,
  admin = false,
  big = false,
}: {
  publicKey: string | null;
  token?: string;
  admin?: boolean;
  big?: boolean;
}) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(isIos() && !isStandalone() ? "ios-add" : "unsupported");
      if (isIos() && !isStandalone()) return setState("ios-add");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const existing = await reg.pushManager.getSubscription();
        setState(existing && Notification.permission === "granted" ? "on" : "ready");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  if (!publicKey) return null;

  async function turnOn() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription(json, { token, admin, userAgent: navigator.userAgent });
      if (!r.ok) {
        setMsg(r.error ?? "알림을 켜지 못했어요.");
        setState("error");
        return;
      }
      setState("on");
    } catch {
      setMsg("알림을 켜지 못했어요. 잠시 후 다시 눌러 주세요.");
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const reassure = admin ? null : <span className="push-note">알림을 안 켜도 괜찮아요. 문자로도 알려 드려요.</span>;

  if (state === "loading") return null;

  if (state === "on")
    return (
      <div className={`push-box on${big ? " big" : ""}`}>
        <b>🔔 알림이 켜져 있어요</b>
        <span className="push-note">{admin ? "새 신청과 문의가 오면 이 기기로 알려 드려요." : "진행 상황이 바뀌면 이 휴대폰으로 바로 알려 드려요."}</span>
      </div>
    );

  if (state === "ios-add")
    return (
      <div className={`push-box${big ? " big" : ""}`}>
        <b>아이폰에서 알림을 받으려면</b>
        <ol className="ios-steps">
          <li>
            화면 아래 <span className="ios-share" aria-label="공유 버튼">공유</span> 버튼을 눌러요
          </li>
          <li>
            <b>홈 화면에 추가</b>를 눌러요
          </li>
          <li>
            홈 화면에 생긴 <b>배터리 119</b>를 눌러 열어요
          </li>
          <li>
            거기서 <b>알림 받기</b>를 눌러요
          </li>
        </ol>
        {reassure}
      </div>
    );

  if (state === "denied")
    return (
      <div className={`push-box${big ? " big" : ""}`}>
        <b>알림이 꺼져 있어요</b>
        <span className="push-note">{admin ? "휴대폰 설정에서 이 사이트 알림을 허용해 주세요." : "괜찮아요. 진행 상황은 문자로 알려 드려요."}</span>
      </div>
    );

  if (state === "unsupported")
    return admin ? (
      <div className="push-box">
        <span className="push-note">이 브라우저는 알림을 지원하지 않아요.</span>
      </div>
    ) : null;

  return (
    <div className={`push-box${big ? " big" : ""}`}>
      <button type="button" className="btn push-btn" onClick={turnOn} disabled={busy}>
        {busy ? "켜는 중…" : admin ? "🔔 이 기기로 새 신청 알림 받기" : "🔔 알림 받기"}
      </button>
      {msg && <span className="push-note" style={{ color: "var(--danger)" }}>{msg}</span>}
      {!admin && <span className="push-note">누르고 “허용”을 고르면, 진행 상황이 바뀔 때마다 알려 드려요.</span>}
    </div>
  );
}
