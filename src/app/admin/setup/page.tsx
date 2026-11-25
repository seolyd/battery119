import { generatePushKeys, pushKeys } from "@/lib/push";
import { appUrl } from "@/lib/notify";
import { solapiConfig } from "@/lib/notify/solapi";
import { kakaoChannelUrl } from "@/lib/kakao";
import { isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

function Row({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ borderColor: ok ? "var(--ok)" : "var(--line)" }}>
      <div className="row">
        <b>{label}</b>
        <span className={`badge ${ok ? "ok" : "warn"}`}>{ok ? "설정됨" : "설정 필요"}</span>
      </div>
      {children}
    </div>
  );
}

// 운영 설정 점검. 웹 푸시 키가 없으면 여기서 새로 만들어 보여 준다 (이 화면은 관리자만 볼 수 있다).
export default function AdminSetup() {
  const push = pushKeys();
  const fresh = push ? null : generatePushKeys();
  const bank = !!process.env.BANK_ACCOUNT;
  const appUrlSet = !!process.env.APP_URL;

  return (
    <>
      <h1 className="h2">설정 점검</h1>
      <p className="small muted">설정을 바꾼 뒤에는 Netlify에서 다시 배포(Deploys → Trigger deploy)해야 반영돼요.</p>
      {isDemoMode() && <div className="alert">데모 모드예요. 실제 운영에서는 Supabase 설정도 필요해요.</div>}
      <div className="stack" style={{ maxWidth: 760 }}>
        <Row ok={!!push} label="웹 푸시 알림 (무료)">
          {push ? (
            <span className="small muted">고객과 운영자가 &quot;알림 받기&quot;를 누르면 진행 상황이 자동으로 가요.</span>
          ) : (
            <>
              <span className="small">
                아래 세 값을 Netlify &gt; Project configuration &gt; Environment variables에 그대로 넣고 다시 배포하세요. 이 키는 지금 새로 만든 것이라, 이 화면을 새로고침하면
                다른 값이 나와요. <b>한 번 넣은 뒤에는 바꾸지 마세요</b> (바꾸면 고객이 알림을 다시 켜야 해요).
              </span>
              <dl className="kv">
                <dt>VAPID_PUBLIC_KEY</dt>
                <dd className="mono small" style={{ userSelect: "all" }}>
                  {fresh!.publicKey}
                </dd>
                <dt>VAPID_PRIVATE_KEY</dt>
                <dd className="mono small" style={{ userSelect: "all" }}>
                  {fresh!.privateKey}
                </dd>
                <dt>VAPID_SUBJECT</dt>
                <dd className="mono small" style={{ userSelect: "all" }}>
                  mailto:운영자이메일@example.com
                </dd>
              </dl>
              <span className="small muted">VAPID_PRIVATE_KEY는 비밀번호처럼 다루세요. 다른 곳에 붙여 넣지 마세요.</span>
            </>
          )}
        </Row>
        <Row ok={appUrlSet} label="앱 주소 (APP_URL)">
          <span className="small muted">문자와 알림에 들어가는 링크 주소예요. 지금: {appUrl()}</span>
        </Row>
        <Row ok={bank} label="입금 계좌 (BANK_ACCOUNT)">
          <span className="small muted">{bank ? process.env.BANK_ACCOUNT : "고객 화면과 문자에 보여 줄 계좌를 넣어 주세요."}</span>
        </Row>
        <Row ok={!!kakaoChannelUrl()} label="카카오톡 채널 (무료, 선택)">
          <span className="small muted">
            {kakaoChannelUrl()
              ? `${kakaoChannelUrl()} · 고객 링크 화면에 "카카오톡으로 소식 받기"가 보여요.`
              : "KAKAO_CHANNEL_URL에 채널 주소(https://pf.kakao.com/_xxxxx)를 넣으면, 번호 노출 없이 카톡으로 소식을 보낼 수 있어요."}
          </span>
        </Row>
        <div className="card flat">
          <div className="row">
            <b>알림톡 (유료, 선택)</b>
            <span className="badge mute">{solapiConfig() ? "켜짐" : "꺼짐"}</span>
          </div>
          <span className="small muted">꺼 두면 비용이 들지 않아요. 진행 상황은 웹 푸시와 주문 화면의 &quot;문자 보내기&quot;로 알려요.</span>
        </div>
      </div>
    </>
  );
}
