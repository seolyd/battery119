// 파크리오 배터리 119의 핵심 도메인 타입과 주문 상태 규칙.

export type Category = "cordless" | "robot";

export const CATEGORY_LABEL: Record<Category, string> = {
  cordless: "무선청소기",
  robot: "로봇청소기",
};

export interface ModelOption {
  label: string;
  partnerCost: number;
  price: number;
}

export interface Model {
  id: string;
  category: Category;
  brand: string;
  /** 상품 이름 (여러 모델에 맞는 배터리면 묶음 이름) */
  name: string;
  /** 이 배터리가 맞는 개별 모델들. 고객은 이 중 하나를 고른다. 비어 있으면 name 하나뿐 */
  variants: string[];
  partnerId: string | null;
  /** 옵션이 없을 때의 업체 원가 / 판매가. 옵션이 있으면 첫 옵션 값과 같다. */
  partnerCost: number;
  price: number;
  options: ModelOption[];
  /** 보호회로 교체가 필요할 때 추가 금액 (진단 후 안내) */
  protectCircuitFee: number | null;
  active: boolean;
  sourceUrl: string | null;
}

export interface Partner {
  id: string;
  name: string;
  region: string;
  contact: string | null;
}

/** 한 세대(동·호수)가 한 계정이다 */
export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  dong: string;
  ho: string;
  /** 4자리 비밀번호의 scrypt 해시 */
  pinHash: string;
  /** 연속으로 틀린 횟수와 잠금 해제 시각 */
  failedCount: number;
  lockedUntil: string | null;
  /** 암호화된 공동현관 비밀번호 */
  doorCodeEnc: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "REQUESTED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PICKED_UP"
  | "AT_PARTNER"
  | "REPAIRING"
  | "QC"
  | "NOT_REPAIRABLE"
  | "DELIVERY_SCHEDULED"
  | "DELIVERED"
  | "AS_REQUESTED"
  | "CANCELED";

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  category: Category;
  brand: string;
  modelId: string | null;
  /** 목록에 없는 모델일 때 고객이 적은 이름, 있으면 모델명 스냅샷 */
  modelName: string;
  optionLabel: string | null;
  symptoms: string[];
  usageAge: string | null;
  memo: string | null;
  /** 고객 결제 금액. 목록 밖 모델은 견적 전까지 null */
  price: number | null;
  partnerCost: number | null;
  partnerId: string | null;
  status: OrderStatus;
  dong: string;
  ho: string;
  phone: string;
  packagingAgreedAt: string;
  depositorName: string | null;
  paidAt: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  deliveredAt: string | null;
  refunded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  from: OrderStatus | null;
  to: OrderStatus;
  actor: "customer" | "admin" | "system";
  note: string | null;
  createdAt: string;
}

export interface Inspection {
  orderId: string;
  chargeOk: boolean;
  runtimeMin: number | null;
  heatOk: boolean;
  exteriorOk: boolean;
  passed: boolean;
  note: string | null;
  createdAt: string;
}

export const SYMPTOMS = [
  "사용 시간이 짧아요",
  "충전이 안 돼요",
  "쓰다가 갑자기 꺼져요",
  "충전 표시등이 깜빡여요",
  "배터리가 부풀었어요",
] as const;

export const USAGE_AGES = ["1년 미만", "1~3년", "3~5년", "5년 이상"] as const;

/** 관리자 화면용 상태 이름 */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  REQUESTED: "모델 확인 중",
  PAYMENT_PENDING: "입금 대기",
  PAID: "수거 예정",
  PICKED_UP: "수거 완료",
  AT_PARTNER: "업체 입고",
  REPAIRING: "교체 중",
  QC: "품질검사",
  NOT_REPAIRABLE: "교체 불가",
  DELIVERY_SCHEDULED: "배송 예정",
  DELIVERED: "배송 완료",
  AS_REQUESTED: "AS 요청",
  CANCELED: "취소",
};

/** 고객 화면용 상태 이름. 협력업체가 드러나지 않게 한다. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  ...STATUS_LABEL,
  AT_PARTNER: "배터리 진단",
  REPAIRING: "배터리 교체 중",
};

/** 고객 타임라인 단계. 각 단계에 도달했다고 보는 상태들 */
export const CUSTOMER_STEPS: { label: string; reachedBy: OrderStatus[] }[] = [
  { label: "신청 접수", reachedBy: [] },
  { label: "입금 확인", reachedBy: ["PAID"] },
  { label: "수거 완료", reachedBy: ["PICKED_UP"] },
  { label: "배터리 진단", reachedBy: ["AT_PARTNER", "NOT_REPAIRABLE"] },
  { label: "배터리 교체", reachedBy: ["REPAIRING"] },
  { label: "품질검사", reachedBy: ["QC"] },
  { label: "배송 예정", reachedBy: ["DELIVERY_SCHEDULED"] },
  { label: "배송 완료", reachedBy: ["DELIVERED"] },
];

const FLOW: OrderStatus[] = [
  "REQUESTED",
  "PAYMENT_PENDING",
  "PAID",
  "PICKED_UP",
  "AT_PARTNER",
  "REPAIRING",
  "QC",
  "DELIVERY_SCHEDULED",
  "DELIVERED",
];

/** 고객 타임라인에서 현재 몇 번째 단계까지 왔는지 (0부터) */
export function customerStepIndex(status: OrderStatus): number {
  if (status === "AS_REQUESTED") return CUSTOMER_STEPS.length - 1;
  if (status === "NOT_REPAIRABLE") return 3;
  if (status === "CANCELED" || status === "REQUESTED" || status === "PAYMENT_PENDING") return 0;
  const i = CUSTOMER_STEPS.findIndex((s) => s.reachedBy.includes(status));
  return i < 0 ? 0 : i;
}

/** 관리자가 할 수 있는 상태 변경 */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  REQUESTED: ["PAYMENT_PENDING", "CANCELED"],
  PAYMENT_PENDING: ["PAID", "CANCELED"],
  PAID: ["PICKED_UP", "CANCELED"],
  PICKED_UP: ["AT_PARTNER"],
  AT_PARTNER: ["REPAIRING", "NOT_REPAIRABLE"],
  REPAIRING: ["QC"],
  QC: ["DELIVERY_SCHEDULED", "REPAIRING"],
  NOT_REPAIRABLE: ["DELIVERY_SCHEDULED"],
  DELIVERY_SCHEDULED: ["DELIVERED"],
  DELIVERED: [],
  AS_REQUESTED: ["PICKED_UP"],
  CANCELED: [],
};

/** 고객이 직접 취소할 수 있는 상태 (수거 전) */
export const CUSTOMER_CANCELABLE: OrderStatus[] = ["REQUESTED", "PAYMENT_PENDING"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

export function isActive(status: OrderStatus): boolean {
  return status !== "DELIVERED" && status !== "CANCELED";
}

export function flowIndex(status: OrderStatus): number {
  return FLOW.indexOf(status);
}

export const WARRANTY_MONTHS = 3;

export function warrantyEnds(deliveredAt: string): Date {
  const d = new Date(deliveredAt);
  d.setMonth(d.getMonth() + WARRANTY_MONTHS);
  return d;
}

export function inWarranty(order: Pick<Order, "status" | "deliveredAt">, now = new Date()): boolean {
  return order.status === "DELIVERED" && !!order.deliveredAt && warrantyEnds(order.deliveredAt) > now;
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}
