"use client";

import { useState } from "react";
import { logManualSms } from "@/app/admin/orders/[id]/sms-actions";
import type { NotifyEvent } from "@/lib/domain";
import { smsHref } from "@/lib/messages";

// 운영자 휴대폰의 문자 앱을 열어 고객 번호와 안내 문구를 채워 준다. 전송만 누르면 된다 (요금제 무료 문자).
export function SmsCard({
  orderId,
  event,
  eventName,
  phone,
  text,
  pushNote,
}: {
  orderId: string;
  event: NotifyEvent;
  eventName: string;
  phone: string;
  text: string;
  pushNote: string;
}) {
  const [body, setBody] = useState(text);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const href = smsHref(phone, body);

  return (
    <section className="sms-card" aria-label="고객에게 문자 보내기">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <b>고객에게 문자: {eventName}</b>
        <span className="small muted">{pushNote}</span>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="보낼 문자 내용" />
      <div className="sms-row">
        <a
          className="btn"
          href={href}
          onClick={() => {
            setOpened(true);
            void logManualSms(orderId, event, body !== text);
          }}
        >
          📱 {phone}에게 문자 보내기
        </a>
        <button
          type="button"
          className="btn ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* 복사가 막힌 브라우저 */
            }
          }}
        >
          {copied ? "복사했어요" : "내용 복사"}
        </button>
      </div>
      <span className="small muted">
        {opened
          ? "문자 앱이 열렸어요. 전송을 눌렀는지 확인해 주세요."
          : "휴대폰에서 누르면 문자 앱이 열리고 번호와 내용이 채워져요. 컴퓨터에서는 내용 복사를 쓰세요."}
      </span>
    </section>
  );
}
