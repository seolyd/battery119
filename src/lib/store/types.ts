import type {
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

export type CustomerPatch = Partial<Pick<Customer, "name" | "phone" | "dong" | "ho" | "doorCodeEnc" | "isAdmin">>;

export type ModelPatch = Partial<Pick<Model, "partnerCost" | "price" | "options" | "partnerId" | "active" | "protectCircuitFee">>;

/**
 * 앱이 쓰는 저장소. 데모 모드는 메모리, 운영은 Supabase 구현을 쓴다.
 * 모든 접근은 서버에서만 일어나고, 권한 확인은 호출하는 쪽(서버 액션·페이지)이 한다.
 */
export interface Store {
  getCustomer(id: string): Promise<Customer | null>;
  ensureCustomer(id: string, defaults: { name: string | null }): Promise<Customer>;
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
}
