// 고객에게 보내는 쉬운 안내 문장. 웹 푸시와 운영자 휴대폰 문자가 같은 문장을 쓴다.
// 70대 고객도 한 번 읽고 알 수 있게: 짧게, 날짜·시간·할 일만.

import type { NotifyEvent } from "@/lib/domain";

export interface SimpleMessage {
  /** 알림 제목 */
  title: string;
  /** 본문 줄들 */
  lines: string[];
}

type V = Record<string, string>;

const MESSAGES: Partial<Record<NotifyEvent, (v: V) => SimpleMessage>> = {
  ORDER_RECEIVED: (v) => ({
    title: "신청이 접수됐어요",
    lines:
      v.금액 === "견적 후 안내"
        ? ["모델을 확인하고 가격을 알려 드릴게요."]
        : [`아래 계좌로 ${v.금액}을 보내 주세요.`, v.계좌, "입금하시면 가지러 가는 날을 알려 드려요."],
  }),
  QUOTE_READY: (v) => ({
    title: "가격이 나왔어요",
    lines: [`${v.제품} 배터리 교체 ${v.금액}이에요.`, `아래 계좌로 보내 주세요.`, v.계좌],
  }),
  PAID: (v) => ({
    title: "입금 확인됐어요",
    lines: [`${v.수거일} 저녁 7~10시에 가지러 가요.`, "제품을 박스에 담아 문 앞에 두세요."],
  }),
  PICKED_UP: () => ({
    title: "제품을 가져왔어요",
    lines: ["배터리를 새로 바꿔 드릴게요.", "다 되면 다시 알려 드려요."],
  }),
  DELIVERY_SCHEDULED: (v) => ({
    title: "배터리 교체가 끝났어요",
    lines: [`${v.배송일} 저녁 7~10시에 문 앞에 가져다 드려요.`],
  }),
  RETURN_SCHEDULED: (v) => ({
    title: "교체가 어려워요",
    lines: ["죄송해요. 이 제품은 배터리를 바꿀 수 없어요.", `${v.금액}은 돌려드려요.`, `${v.배송일} 저녁 7~10시에 제품을 문 앞에 가져다 드려요.`],
  }),
  DELIVERED: (v) => ({
    title: "문 앞에 두었어요",
    lines: [`${v.보증종료}까지 보증해 드려요.`, "같은 문제가 생기면 아래 링크에서 알려 주세요."],
  }),
  CANCELED: (v) => ({
    title: "신청이 취소됐어요",
    lines: [v.환불안내],
  }),
  INQUIRY_ANSWERED: () => ({
    title: "문의에 답변이 왔어요",
    lines: ["아래 링크를 눌러 확인해 주세요."],
  }),
  ADMIN_NEW_ORDER: (v) => ({
    title: "새 신청",
    lines: [`${v.동호} · ${v.제품}`, v.금액],
  }),
  ADMIN_NEW_INQUIRY: (v) => ({
    title: "새 문의",
    lines: [`${v.동호} · ${v.문의종류}`],
  }),
};

export function simpleMessage(event: NotifyEvent, vars: V): SimpleMessage | null {
  const f = MESSAGES[event];
  return f ? f(vars) : null;
}

/** 운영자가 자기 휴대폰으로 보내는 문자 본문 */
export function smsText(event: NotifyEvent, vars: V): string | null {
  const m = simpleMessage(event, vars);
  if (!m) return null;
  return ["[파크리오 배터리 119]", `${vars.동호} 고객님, ${m.title}.`, ...m.lines, "", "▶ 눌러서 확인하기", vars.링크].join("\n");
}

/** 휴대폰 문자 앱을 여는 주소. 받는 사람과 내용이 채워진다 (아이폰·안드로이드 모두) */
export function smsHref(phone: string, body: string): string {
  return `sms:${phone.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`;
}
