// 주문 생성·상태 변경 규칙. 저장소와 분리해서 테스트한다.
import {
  canTransition,
  type Category,
  type Model,
  type Order,
  type OrderStatus,
  SYMPTOMS,
  USAGE_AGES,
} from "@/lib/domain";
import { isDeliveryDay, pickupDateFor, type DateStr } from "@/lib/schedule";
import type { NewOrder, OrderPatch } from "@/lib/store/types";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export interface OrderInput {
  category: string;
  brand: string;
  modelId: string | null;
  /** 목록에 없는 모델일 때 고객이 적은 모델명 */
  customModel: string | null;
  optionLabel: string | null;
  symptoms: string[];
  usageAge: string | null;
  memo: string | null;
  dong: string;
  ho: string;
  phone: string;
  packagingAgreed: boolean;
}

/** 어느 신청 단계에서 고쳐야 하는지 알려 주면 화면이 그 단계로 보내 준다 */
export type RuleField = "model" | "conditions" | "pickup";

export class RuleError extends Error {
  constructor(
    message: string,
    public field?: RuleField,
  ) {
    super(message);
  }
}

export { normalizePhone } from "@/lib/phone";

/** 고객 입력을 확인하고 저장할 주문을 만든다. 가격은 항상 서버의 모델 정보로 다시 계산한다. */
export function buildOrder(input: OrderInput, model: Model | null, customerId: string, now: Date = new Date()): NewOrder {
  const category = input.category as Category;
  if (category !== "cordless" && category !== "robot") throw new RuleError("청소기 종류를 골라 주세요.");
  if (!/^\d{3}$/.test(input.dong)) throw new RuleError("동은 숫자 3자리로 적어 주세요.");
  if (!/^\d{3,4}$/.test(input.ho)) throw new RuleError("호는 숫자 3~4자리로 적어 주세요.");
  if (!isValidPhone(input.phone)) throw new RuleError("연락처를 010-1234-5678처럼 휴대폰 번호로 적어 주세요.", "pickup");
  if (!input.packagingAgreed) throw new RuleError("포장 안내에 동의해야 신청할 수 있어요.", "pickup");
  const symptoms = input.symptoms.filter((s) => (SYMPTOMS as readonly string[]).includes(s));
  if (!symptoms.length) throw new RuleError("증상을 하나 이상 골라 주세요.", "conditions");
  const usageAge = input.usageAge && (USAGE_AGES as readonly string[]).includes(input.usageAge) ? input.usageAge : null;
  const memo = input.memo?.trim().slice(0, 500) || null;

  const base = {
    customerId,
    category,
    symptoms,
    usageAge,
    memo,
    dong: input.dong,
    ho: input.ho,
    phone: normalizePhone(input.phone),
    packagingAgreedAt: now.toISOString(),
  };

  if (!model) {
    const name = input.customModel?.trim();
    if (!name) throw new RuleError("모델명을 적어 주세요. 모르면 '모름'이라고 적어도 돼요.", "model");
    if (!input.brand.trim()) throw new RuleError("제조사를 적어 주세요.", "model");
    return {
      ...base,
      brand: input.brand.trim().slice(0, 40),
      modelId: null,
      modelName: name.slice(0, 120),
      optionLabel: null,
      price: null,
      partnerCost: null,
      partnerId: null,
      status: "REQUESTED",
    };
  }

  if (!model.active) throw new RuleError("지금은 접수하지 않는 모델이에요.");
  if (model.category !== category) throw new RuleError("청소기 종류와 모델이 맞지 않아요.");
  let price = model.price;
  let partnerCost = model.partnerCost;
  let optionLabel: string | null = null;
  if (model.options.length) {
    const opt = model.options.find((o) => o.label === input.optionLabel) ?? null;
    if (!opt) throw new RuleError("배터리 용량을 골라 주세요.", "conditions");
    price = opt.price;
    partnerCost = opt.partnerCost;
    optionLabel = opt.label;
  }
  return {
    ...base,
    brand: model.brand,
    modelId: model.id,
    modelName: model.name,
    optionLabel,
    price,
    partnerCost,
    partnerId: model.partnerId,
    status: "PAYMENT_PENDING",
  };
}

export interface TransitionPayload {
  /** REQUESTED → PAYMENT_PENDING: 견적 금액 */
  price?: number | null;
  partnerCost?: number | null;
  /** PAYMENT_PENDING → PAID: 입금자명 */
  depositorName?: string | null;
  /** → DELIVERY_SCHEDULED: 배송일 */
  deliveryDate?: DateStr | null;
  partnerId?: string | null;
  /** 취소·교체 불가 시 환불 처리 여부 */
  refunded?: boolean;
}

/** 관리자 상태 변경이 가능한지 확인하고 함께 바꿀 값을 계산한다. */
export function transitionPatch(
  order: Order,
  to: OrderStatus,
  payload: TransitionPayload,
  now: Date = new Date(),
  closedDates: DateStr[] = [],
): OrderPatch {
  if (!canTransition(order.status, to)) throw new RuleError(`'${order.status}'에서 '${to}'로 바꿀 수 없어요.`);
  const patch: OrderPatch = { status: to };

  switch (to) {
    case "PAYMENT_PENDING": {
      const price = payload.price ?? order.price;
      if (!price || price <= 0) throw new RuleError("견적 금액을 적어 주세요.");
      patch.price = price;
      if (payload.partnerCost != null) patch.partnerCost = payload.partnerCost;
      if (payload.partnerId) patch.partnerId = payload.partnerId;
      break;
    }
    case "PAID":
      patch.paidAt = now.toISOString();
      patch.pickupDate = pickupDateFor(now, closedDates);
      if (payload.depositorName?.trim()) patch.depositorName = payload.depositorName.trim();
      break;
    case "AT_PARTNER":
      if (payload.partnerId) patch.partnerId = payload.partnerId;
      if (!patch.partnerId && !order.partnerId) throw new RuleError("맡길 협력업체를 골라 주세요.");
      break;
    case "DELIVERY_SCHEDULED": {
      const d = payload.deliveryDate;
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new RuleError("배송일을 골라 주세요.");
      if (!isDeliveryDay(d, closedDates)) throw new RuleError("배송은 월~토에만 할 수 있어요.");
      patch.deliveryDate = d;
      if (order.status === "NOT_REPAIRABLE" && payload.refunded) patch.refunded = true;
      break;
    }
    case "DELIVERED":
      patch.deliveredAt = now.toISOString();
      break;
    case "CANCELED":
      if (payload.refunded) patch.refunded = true;
      break;
  }
  return patch;
}
