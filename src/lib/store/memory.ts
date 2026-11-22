import { randomUUID } from "node:crypto";
import type { Customer, Inspection, Model, Order, OrderEvent, Partner } from "@/lib/domain";
import seedModels from "@/data/models.json";
import { seoulToday } from "@/lib/schedule";
import { UnitTakenError, type Store } from "./types";

// 데모 모드 저장소. 서버 프로세스 메모리에 있어서 재시작하면 초기화된다.

export const DEMO_PARTNER_ID = "partner-taegeuk";

interface Db {
  customers: Map<string, Customer>;
  models: Map<string, Model>;
  partners: Partner[];
  orders: Map<string, Order>;
  events: OrderEvent[];
  inspections: Map<string, Inspection>;
  orderSeq: Map<string, number>;
  loginFailures: { ip: string; at: string }[];
}

type SeedModel = Omit<Model, "partnerId" | "active"> & { active?: boolean };

export function createMemoryDb(): Db {
  const models = new Map<string, Model>();
  for (const m of seedModels as SeedModel[]) {
    models.set(m.id, { ...m, variants: m.variants ?? [], partnerId: DEMO_PARTNER_ID, active: m.active ?? true });
  }
  return {
    customers: new Map(),
    models,
    partners: [
      { id: DEMO_PARTNER_ID, name: "태극전기 (asbattery.com)", region: "미정", contact: null },
      { id: "partner-yongsan", name: "용산 협력업체", region: "용산", contact: null },
      { id: "partner-guro", name: "구로 협력업체", region: "구로", contact: null },
      { id: "partner-jangji", name: "장지 협력업체", region: "장지", contact: null },
    ],
    orders: new Map(),
    events: [],
    inspections: new Map(),
    orderSeq: new Map(),
    loginFailures: [],
  };
}

const clone = <T,>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();

export function createMemoryStore(db: Db = createMemoryDb()): Store {
  return {
    async getCustomer(id) {
      const c = db.customers.get(id);
      return c ? clone(c) : null;
    },
    async findCustomerByUnit(dong, ho) {
      const c = [...db.customers.values()].find((x) => x.dong === dong && x.ho === ho);
      return c ? clone(c) : null;
    },
    async createCustomer(input) {
      if ([...db.customers.values()].some((x) => x.dong === input.dong && x.ho === input.ho)) throw new UnitTakenError();
      const c: Customer = {
        id: randomUUID(),
        name: input.name ?? null,
        phone: input.phone ?? null,
        dong: input.dong,
        ho: input.ho,
        pinHash: input.pinHash,
        failedCount: 0,
        lockedUntil: null,
        doorCodeEnc: null,
        createdAt: now(),
      };
      db.customers.set(c.id, c);
      return clone(c);
    },
    async updateCustomer(id, patch) {
      const c = db.customers.get(id);
      if (!c) throw new Error("고객 정보를 찾을 수 없어요.");
      Object.assign(c, patch);
      return clone(c);
    },
    async listCustomers(ids) {
      return ids.map((id) => db.customers.get(id)).filter((c): c is Customer => !!c).map(clone);
    },

    async listModels(opts) {
      const all = [...db.models.values()];
      return clone(opts?.activeOnly ? all.filter((m) => m.active) : all);
    },
    async getModel(id) {
      const m = db.models.get(id);
      return m ? clone(m) : null;
    },
    async updateModel(id, patch) {
      const m = db.models.get(id);
      if (!m) throw new Error("모델을 찾을 수 없어요.");
      Object.assign(m, patch);
      return clone(m);
    },

    async listPartners() {
      return clone(db.partners);
    },

    async createOrder(input) {
      const day = seoulToday().slice(2).replace(/-/g, "");
      const seq = (db.orderSeq.get(day) ?? 0) + 1;
      db.orderSeq.set(day, seq);
      const o: Order = {
        ...input,
        partnerId: input.partnerId ?? null,
        id: randomUUID(),
        orderNo: `PR-${day}-${String(seq).padStart(2, "0")}`,
        depositorName: null,
        paidAt: null,
        pickupDate: null,
        deliveryDate: null,
        deliveredAt: null,
        refunded: false,
        createdAt: now(),
        updatedAt: now(),
      };
      db.orders.set(o.id, o);
      return clone(o);
    },
    async getOrder(id) {
      const o = db.orders.get(id);
      return o ? clone(o) : null;
    },
    async listOrdersByCustomer(customerId) {
      return clone(
        [...db.orders.values()].filter((o) => o.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    async listOrders(opts) {
      const all = [...db.orders.values()].filter((o) => !opts?.statuses || opts.statuses.includes(o.status));
      return clone(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async updateOrder(id, patch) {
      const o = db.orders.get(id);
      if (!o) throw new Error("주문을 찾을 수 없어요.");
      Object.assign(o, patch, { updatedAt: now() });
      return clone(o);
    },

    async addEvent(ev) {
      const e: OrderEvent = { ...ev, id: randomUUID(), createdAt: now() };
      db.events.push(e);
      return clone(e);
    },
    async listEvents(orderId) {
      return clone(db.events.filter((e) => e.orderId === orderId));
    },

    async saveInspection(ins) {
      const i: Inspection = { ...ins, createdAt: now() };
      db.inspections.set(ins.orderId, i);
      return clone(i);
    },
    async getInspection(orderId) {
      const i = db.inspections.get(orderId);
      return i ? clone(i) : null;
    },

    async listClosedDates() {
      return [];
    },

    async recordLoginFailure(ip) {
      db.loginFailures.push({ ip, at: now() });
      if (db.loginFailures.length > 5000) db.loginFailures.splice(0, 1000);
    },
    async countLoginFailures(ip, sinceIso) {
      return db.loginFailures.filter((f) => f.ip === ip && f.at >= sinceIso).length;
    },
  };
}
