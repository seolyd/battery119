import "server-only";
import type { NotifyEvent, Order, OrderEvent } from "@/lib/domain";
import { smsHref, smsText } from "@/lib/messages";
import { orderVars } from "@/lib/notify";

/** 지금 상태에서 고객에게 보낼 문자. 보낼 게 없는 상태면 null */
export function smsEventFor(order: Order, events: Pick<OrderEvent, "to">[]): NotifyEvent | null {
  switch (order.status) {
    case "PAYMENT_PENDING":
      return events.some((e) => e.to === "REQUESTED") ? "QUOTE_READY" : "ORDER_RECEIVED";
    case "PAID":
      return "PAID";
    case "PICKED_UP":
    case "AT_PARTNER":
    case "REPAIRING":
    case "QC":
      return "PICKED_UP";
    case "DELIVERY_SCHEDULED":
      return order.refunded || events.some((e) => e.to === "NOT_REPAIRABLE") ? "RETURN_SCHEDULED" : "DELIVERY_SCHEDULED";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELED":
      return "CANCELED";
    default:
      return null;
  }
}

export interface SmsDraft {
  event: NotifyEvent;
  phone: string;
  text: string;
  href: string;
}

export function smsDraft(order: Order, events: Pick<OrderEvent, "to">[]): SmsDraft | null {
  const event = smsEventFor(order, events);
  if (!event) return null;
  const text = smsText(event, orderVars(order));
  if (!text) return null;
  return { event, phone: order.phone, text, href: smsHref(order.phone, text) };
}
