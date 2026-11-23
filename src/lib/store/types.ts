import type {
  Inquiry,
  NotificationLog,
  Customer,
  Inspection,
  Model,
  Order,
  OrderEvent,
  OrderStatus,
  Partner,
} from "@/lib/domain";

export type NewOrder = Omit<
  Order,
  "id" | "orderNo" | "createdAt" | "updatedAt" | "paidAt" | "pickupDate" | "deliveryDate" | "deliveredAt" | "refunded" | "depositorName" | "partnerId"
> & { partnerId?: string | null };

export type OrderPatch = Partial<
  Pick<
    Order,
    | "status"
    | "price"
    | "partnerCost"
    | "partnerId"
    | "paidAt"
    | "pickupDate"
    | "deliveryDate"
    | "deliveredAt"
    | "refunded"
    | "depositorName"
    | "memo"
    | "modelName"
  >
>;

export type CustomerPatch = Partial<Pick<Customer, "name" | "phone" | "doorCodeEnc" | "pinHash" | "failedCount" | "lockedUntil">>;

export type NewCustomer = Pick<Customer, "dong" | "ho" | "pinHash"> & Partial<Pick<Customer, "name" | "phone">>;

/** 이미 가입된 세대에 다시 가입하려 할 때 */
export class UnitTakenError extends Error {}

export type ModelPatch = Partial<Pick<Model, "partnerCost" | "price" | "options" | "partnerId" | "active" | "protectCircuitFee">>;

/**
 * 앱이 쓰는 저장소. 데모 모드는 메모리, 운영은 Supabase 구현을 쓴다.
 * 모든 접근은 서버에서만 일어나고, 권한 확인은 호출하는 쪽(서버 액션·페이지)이 한다.
 */
export interface Store {
  getCustomer(id: string): Promise<Customer | null>;
  findCustomerByUnit(dong: string, ho: string): Promise<Customer | null>;
  /** 같은 동·호수가 있으면 UnitTakenError */
  createCustomer(input: NewCustomer): Promise<Customer>;
  updateCustomer(id: string, patch: CustomerPatch): Promise<Customer>;
  listCustomers(ids: string[]): Promise<Customer[]>;

  listModels(opts?: { activeOnly?: boolean }): Promise<Model[]>;
  getModel(id: string): Promise<Model | null>;
  updateModel(id: string, patch: ModelPatch): Promise<Model>;

  listPartners(): Promise<Partner[]>;

  createOrder(input: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  listOrdersByCustomer(customerId: string): Promise<Order[]>;
  listOrders(opts?: { statuses?: OrderStatus[] }): Promise<Order[]>;
  updateOrder(id: string, patch: OrderPatch): Promise<Order>;

  addEvent(ev: Omit<OrderEvent, "id" | "createdAt">): Promise<OrderEvent>;
  listEvents(orderId: string): Promise<OrderEvent[]>;

  saveInspection(ins: Omit<Inspection, "createdAt">): Promise<Inspection>;
  getInspection(orderId: string): Promise<Inspection | null>;

  listClosedDates(): Promise<string[]>;

  /** 로그인 실패 기록 (접속지별 시도 제한) */
  recordLoginFailure(ip: string): Promise<void>;
  countLoginFailures(ip: string, sinceIso: string): Promise<number>;

  createInquiry(input: Omit<Inquiry, "id" | "answer" | "status" | "createdAt" | "answeredAt">): Promise<Inquiry>;
  getInquiry(id: string): Promise<Inquiry | null>;
  listInquiries(opts?: { customerId?: string; status?: Inquiry["status"] }): Promise<Inquiry[]>;
  answerInquiry(id: string, answer: string): Promise<Inquiry>;

  addNotification(log: Omit<NotificationLog, "id" | "createdAt">): Promise<void>;
  listNotifications(opts: { orderId?: string; inquiryId?: string }): Promise<NotificationLog[]>;
}
