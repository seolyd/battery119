import Link from "next/link";
import {
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_STEPS,
  customerStepIndex,
  STATUS_LABEL,
  type Category,
  type Order,
  type OrderStatus,
} from "@/lib/domain";

export function AppBar({ title, back, sub }: { title: string; back?: string; sub?: string }) {
  return (
    <header className="appbar">
      {back && (
        <Link className="back" href={back} aria-label="뒤로">
          ‹
        </Link>
      )}
      <span className="title">{title}</span>
      {sub && <span className="sub">{sub}</span>}
    </header>
  );
}

export function KindIcon({ kind }: { kind: Category }) {
  return kind === "cordless" ? (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <rect width="56" height="56" rx="14" fill="var(--accent-soft)" />
      <path d="M33 9l-9 30" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="28" y="7" width="12" height="9" rx="3" fill="var(--accent)" />
      <rect x="14" y="38" width="20" height="8" rx="4" fill="var(--accent)" />
      <rect x="31" y="18" width="7" height="11" rx="2" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <rect width="56" height="56" rx="14" fill="var(--ok-soft)" />
      <circle cx="28" cy="29" r="16" fill="none" stroke="var(--ok)" strokeWidth="4" />
      <circle cx="28" cy="23" r="4" fill="var(--ok)" />
      <path d="M17 34h22" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const TONE: Partial<Record<OrderStatus, string>> = {
  DELIVERED: "ok",
  CANCELED: "mute",
  NOT_REPAIRABLE: "warn",
  REQUESTED: "warn",
  AS_REQUESTED: "warn",
};

export function StatusBadge({ status, admin = false }: { status: OrderStatus; admin?: boolean }) {
  const label = admin ? STATUS_LABEL[status] : CUSTOMER_STATUS_LABEL[status];
  return <span className={`badge ${TONE[status] ?? ""}`}>{label}</span>;
}

export function CustomerTimeline({ order }: { order: Order }) {
  const cur = customerStepIndex(order.status);
  const waiting = order.status === "REQUESTED" || order.status === "PAYMENT_PENDING";
  return (
    <div className="tl">
      {CUSTOMER_STEPS.map((s, i) => {
        let state: "done" | "now" | "todo";
        if (waiting) state = i === 0 ? "done" : i === 1 ? "now" : "todo";
        else if (order.status === "CANCELED") state = i === 0 ? "done" : "todo";
        else if (i < cur || (i === cur && (order.status === "DELIVERED" || order.status === "AS_REQUESTED"))) state = "done";
        else state = i === cur ? "now" : "todo";
        const label =
          i === 1 && order.status === "REQUESTED" ? "모델 확인 후 견적 안내" : i === 1 && waiting ? "입금 대기" : i === 3 && order.status === "NOT_REPAIRABLE" ? "교체 불가 판정" : s.label;
        return (
          <div key={s.label} className={state}>
            <i />
            {state === "now" ? <b>{label}</b> : <span>{label}</span>}
            <small>{stepDate(order, i)}</small>
          </div>
        );
      })}
    </div>
  );
}

function stepDate(o: Order, i: number): string {
  const md = (iso: string | null) => (iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : "");
  if (i === 0) return md(toSeoulDate(o.createdAt));
  if (i === 1) return md(o.paidAt ? toSeoulDate(o.paidAt) : null);
  if (i === 2 && o.pickupDate && customerStepIndex(o.status) < 2) return `${md(o.pickupDate)} 예정`;
  if (i === 6 && o.deliveryDate) return `${md(o.deliveryDate)}`;
  if (i === 7 && o.deliveredAt) return md(toSeoulDate(o.deliveredAt));
  return "";
}

export function toSeoulDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

export function toSeoulDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
