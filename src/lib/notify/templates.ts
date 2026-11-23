// 알림톡 템플릿. 여기 적힌 본문을 그대로 카카오 템플릿 검수에 올린다 (docs/alimtalk.md).
// #{이름} 자리는 보낼 때 값으로 바뀐다. 검수에 올린 글자와 한 글자라도 다르면 발송이 실패하므로,
// 본문을 고치면 템플릿을 다시 검수받아야 한다.

import type { NotifyEvent } from "@/lib/domain";

export interface TemplateDef {
  /** 템플릿 이름 (검수 신청할 때 쓰는 이름) */
  name: string;
  body: string;
  /** 고객이 아니라 운영자에게 가는 알림이면 알림톡 대신 문자로 보낸다 */
  toAdmin?: boolean;
}

const H = "[파크리오 배터리 119]";

export const TEMPLATES: Record<NotifyEvent, TemplateDef> = {
  ORDER_RECEIVED: {
    name: "수리 신청 접수",
    body: `${H} 수리 신청 접수

#{동호} 고객님, 수리 신청이 접수됐어요.

■ 주문번호: #{주문번호}
■ 제품: #{제품}
■ 결제 금액: #{금액}
■ 입금 계좌: #{계좌}

#{수거안내}
진행 상황은 아래 주소에서 확인하실 수 있어요.
#{링크}`,
  },
  QUOTE_READY: {
    name: "견적 안내",
    body: `${H} 견적 안내

#{동호} 고객님, 신청하신 제품의 견적이 나왔어요.

■ 주문번호: #{주문번호}
■ 제품: #{제품}
■ 결제 금액: #{금액}
■ 입금 계좌: #{계좌}

#{수거안내}
#{링크}`,
  },
  PAID: {
    name: "입금 확인 및 수거 안내",
    body: `${H} 입금 확인

#{동호} 고객님, #{금액} 입금이 확인됐어요.

■ 수거일: #{수거일} 저녁 7~10시
제품을 박스에 포장해서 문 앞에 두세요.
#{링크}`,
  },
  PICKED_UP: {
    name: "수거 완료",
    body: `${H} 수거 완료

#{동호} 고객님, #{제품} 제품을 수거했어요.
배터리 진단 후 교체를 시작하고, 진행 상황을 다시 알려 드릴게요.
#{링크}`,
  },
  DELIVERY_SCHEDULED: {
    name: "교체 완료 및 배송 안내",
    body: `${H} 교체 완료 · 배송 안내

#{동호} 고객님, 배터리 교체와 품질검사를 마쳤어요.

■ 배송일: #{배송일} 저녁 7~10시
문 앞으로 가져다 드릴게요.
#{링크}`,
  },
  RETURN_SCHEDULED: {
    name: "교체 불가 및 환불 안내",
    body: `${H} 교체 불가 · 환불 안내

#{동호} 고객님, 죄송하지만 #{제품} 제품은 배터리 교체가 어려워요.

■ 환불 금액: #{금액}
■ 반송일: #{배송일} 저녁 7~10시
제품은 문 앞으로 돌려드려요.
#{링크}`,
  },
  DELIVERED: {
    name: "배송 완료",
    body: `${H} 배송 완료

#{동호} 고객님, 교체한 제품을 문 앞에 두었어요.

■ 보증 기간: #{보증종료}까지
같은 증상이 다시 생기면 앱에서 무상 재점검을 요청해 주세요.
#{링크}`,
  },
  CANCELED: {
    name: "신청 취소",
    body: `${H} 신청 취소

#{동호} 고객님, 주문 #{주문번호} 신청이 취소됐어요.
#{환불안내}`,
  },
  INQUIRY_ANSWERED: {
    name: "문의 답변 등록",
    body: `${H} 문의 답변

#{동호} 고객님, 남겨 주신 문의에 답변이 등록됐어요.
앱에서 확인해 주세요.
#{링크}`,
  },
  PIN_RESET: {
    name: "로그인 비밀번호 재설정",
    body: `${H} 로그인 비밀번호 재설정

#{동호} 로그인 비밀번호가 새로 설정됐어요.

■ 새 비밀번호: #{비밀번호}
로그인한 뒤 내 정보에서 비밀번호를 바꿔 주세요.
#{링크}`,
  },
  ADMIN_NEW_ORDER: {
    name: "운영자: 새 신청",
    toAdmin: true,
    body: `${H} 새 신청
#{동호} · #{제품}
금액: #{금액}
#{링크}`,
  },
  ADMIN_NEW_INQUIRY: {
    name: "운영자: 새 문의",
    toAdmin: true,
    body: `${H} 새 문의
#{동호} · #{문의종류}
#{링크}`,
  },
};

/** 템플릿에 들어 있는 변수 이름들 */
export function templateVars(body: string): string[] {
  return [...new Set([...body.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]))];
}

/** 변수를 채운 본문. 빠진 변수가 있으면 오류 (검수받은 템플릿과 달라져 발송이 실패하므로) */
export function render(body: string, vars: Record<string, string>): string {
  const missing = templateVars(body).filter((v) => vars[v] === undefined);
  if (missing.length) throw new Error(`템플릿 변수가 빠졌어요: ${missing.join(", ")}`);
  return body.replace(/#\{([^}]+)\}/g, (_, k: string) => vars[k]);
}
