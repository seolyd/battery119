"use client";

import { useState, useTransition } from "react";
import { logManualSms, setKakaoLinked } from "@/app/admin/orders/[id]/sms-actions";
import type { NotifyEvent } from "@/lib/domain";
import { smsHref } from "@/lib/messages";

// 고객에게 소식 보내기 카드.
//  - 카톡 채널 연결된 고객: 문구를 복사해서 카카오톡 채널 관리자 앱 채팅방에 붙여 넣기 (무료, 내 번호 안 보임)
//  - 그 밖: 휴대폰 문자 앱을 열어 번호와 문구를 채워 준다 (요금제 무료 문자, 내 번호가 보임)
export function SmsCard({
  orderId,
  event,
  eventName,
  phone,
  unit,
  text,
  pushNote,
  kakao,
}: {
  orderId: string;
  event: NotifyEvent;
  eventName: string;
  phone: string;
  unit: string;
  text: string;
  pushNote: string;
  kakao: { configured: boolean; linked: boolean };
}) {
  const [body, setBody] = useState(text);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [pending, start] = useTransition();
  // 누르자마자 바뀌게 화면에서 먼저 바꾸고, 저장은 뒤에서 한다
  const [linked, setLinked] = useState(kakao.linked);
  const href = smsHref(phone, body);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* 복사가 막힌 브라우저: 내용을 직접 골라 복사 */
    }
  }

  const smsButton = (primary: boolean) => (
    <a
      className={`btn${primary ? "" : " ghost"}`}
      href={href}
      onClick={() => {
        setOpened(true);
        void logManualSms(orderId, event, body !== text);
      }}
    >
      📱 문자 보내기{primary ? ` (${phone})` : ""}
    </a>
  );

  return (
    <section className="sms-card" aria-label="고객에게 소식 보내기">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <b>고객에게 소식: {eventName}</b>
        <span className="small muted">{pushNote}</span>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="보낼 내용" />

      {linked ? (
        <>
          <div className="sms-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void copy();
                void logManualSms(orderId, event, body !== text, "kakao");
              }}
            >
              {copied ? "복사했어요 → 카톡 채널 앱에 붙여 넣기" : "💬 카톡용 문구 복사"}
            </button>
            {smsButton(false)}
          </div>
          <span className="small muted">
            카카오톡 채널 관리자 앱에서 <b>{unit}</b> 채팅방을 열고 붙여 넣어 보내세요. 내 번호가 보이지 않아요. 문자는 내 번호가 보이니 카톡이 안 될 때만 쓰세요.
          </span>
        </>
      ) : (
        <>
          <div className="sms-row">
            {smsButton(true)}
            <button type="button" className="btn ghost" onClick={copy}>
              {copied ? "복사했어요" : "내용 복사"}
            </button>
          </div>
          <span className="small muted">
            {opened ? "문자 앱이 열렸어요. 전송을 눌렀는지 확인해 주세요. " : ""}
            <b>받는 사람에게 내 휴대폰 번호가 보여요.</b>
            {kakao.configured ? " 고객이 카카오톡 채널에 동·호수를 보내 오면 아래에서 '카톡 연결됨'을 켜세요. 그다음부터는 번호 없이 카톡으로 보내요." : ""}
          </span>
        </>
      )}

      {kakao.configured && (
        <label className="check">
          <input
            type="checkbox"
            checked={linked}
            disabled={pending}
            onChange={(e) => {
              const on = e.target.checked;
              setLinked(on);
              start(() => setKakaoLinked(orderId, on));
            }}
          />
          카톡 연결됨 ({unit} 고객이 카카오톡 채널에 말을 걸어 왔어요)
        </label>
      )}
    </section>
  );
}
