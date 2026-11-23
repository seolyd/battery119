// 문자 링크 화면(/s/코드)에 보여 줄 쉬운 상태 문장. 70대 고객 기준:
// 지금 무슨 일인지 한 문장, 고객이 할 일 한 문장. 전문 용어(품질검사, 협력업체 등)는 쓰지 않는다.

import { formatWon, type Order, warrantyEnds } from "@/lib/domain";
import { formatDay, pickupDateFor } from "@/lib/schedule";

export interface EasyStatus {
  /** 큰 글씨 한 문장 */
  headline: string;
  /** 고객이 할 일 (없으면 null) */
  todo: string | null;
  /** 4단계 중 어디인지 (0~3), 취소는 -1 */
  step: number;
  tone: "action" | "wait" | "done" | "stop";
}

export const EASY_STEPS = ["신청", "가지러 감", "배터리 교체", "가져다 드림"];

const seoulDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export function easyStatus(o: Order, now = new Date(), closed: string[] = []): EasyStatus {
  switch (o.status) {
    case "REQUESTED":
      return { headline: "가격을 알아보고 있어요", todo: "가격이 나오면 문자로 알려 드려요. 기다려 주세요.", step: 0, tone: "wait" };
    case "PAYMENT_PENDING":
      return {
        headline: `${o.price != null ? formatWon(o.price) : ""} 입금을 기다리고 있어요`,
        todo: `아래 계좌로 보내 주시면 ${formatDay(pickupDateFor(now, closed))} 저녁 7~10시에 가지러 가요.`,
        step: 0,
        tone: "action",
      };
    case "PAID":
    case "AS_REQUESTED":
      return {
        headline: o.pickupDate ? `${formatDay(o.pickupDate)} 저녁 7~10시에 가지러 가요` : "곧 가지러 가요",
        todo: "제품을 박스에 담아 문 앞에 두세요.",
        step: 1,
        tone: "action",
      };
    case "PICKED_UP":
    case "AT_PARTNER":
    case "REPAIRING":
    case "QC":
      return { headline: "배터리를 새로 바꾸고 있어요", todo: "다 되면 가져다 드리는 날을 알려 드려요.", step: 2, tone: "wait" };
    case "NOT_REPAIRABLE":
      return { headline: "이 제품은 배터리를 바꿀 수 없어요", todo: "죄송해요. 돈은 돌려드리고, 제품은 다시 가져다 드려요.", step: 2, tone: "stop" };
    case "DELIVERY_SCHEDULED":
      return {
        headline: o.deliveryDate ? `${formatDay(o.deliveryDate)} 저녁 7~10시에 가져다 드려요` : "곧 가져다 드려요",
        todo: o.refunded ? "교체가 어려워 돈은 돌려드렸어요. 제품을 문 앞에 두고 갈게요." : "문 앞에 두고 갈게요. 집에 안 계셔도 괜찮아요.",
        step: 3,
        tone: "wait",
      };
    case "DELIVERED":
      return {
        headline: "다 끝났어요. 문 앞에 두었어요",
        todo: o.deliveredAt ? `${formatDay(seoulDate(warrantyEnds(o.deliveredAt).toISOString()))}까지 보증해 드려요.` : null,
        step: 3,
        tone: "done",
      };
    case "CANCELED":
      return { headline: "신청이 취소됐어요", todo: o.paidAt ? (o.refunded ? "보내 주신 돈은 돌려드렸어요." : "보내 주신 돈은 확인 후 돌려드려요.") : null, step: -1, tone: "stop" };
  }
}
