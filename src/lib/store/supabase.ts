import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Inspection, Model, Order, OrderEvent, Partner } from "@/lib/domain";
import { UnitTakenError, type Store } from "./types";

// 운영 저장소. 서비스 롤 키로 서버에서만 접근한다 (테이블은 RLS로 외부 접근 차단).

type Row = Record<string, unknown>;

const toCustomer = (r: Row): Customer => ({
  id: r.id as string,
  name: (r.name as string) ?? null,
  phone: (r.phone as string) ?? null,
  dong: r.dong as string,
  ho: r.ho as string,
  pinHash: r.pin_hash as string,
  failedCount: (r.failed_count as number) ?? 0,
  lockedUntil: (r.locked_until as string) ?? null,
  doorCodeEnc: (r.door_code_enc as string) ?? null,
  createdAt: r.created_at as string,
});

const toModel = (r: Row): Model => ({
  id: r.id as string,
  category: r.category as Model["category"],
  brand: r.brand as string,
  name: r.name as string,
  variants: (r.variants as string[]) ?? [],
  partnerId: (r.partner_id as string) ?? null,
  partnerCost: r.partner_cost as number,
  price: r.price as number,
  options: (r.options as Model["options"]) ?? [],
  protectCircuitFee: (r.protect_circuit_fee as number) ?? null,
  active: !!r.active,
  sourceUrl: (r.source_url as string) ?? null,
});

const toOrder = (r: Row): Order => ({
  id: r.id as string,
  orderNo: r.order_no as string,
  customerId: r.customer_id as string,
  category: r.category as Order["category"],
  brand: r.brand as string,
  modelId: (r.model_id as string) ?? null,
  modelName: r.model_name as string,
  optionLabel: (r.option_label as string) ?? null,
  symptoms: (r.symptoms as string[]) ?? [],
  usageAge: (r.usage_age as string) ?? null,
  memo: (r.memo as string) ?? null,
  price: (r.price as number) ?? null,
  partnerCost: (r.partner_cost as number) ?? null,
  partnerId: (r.partner_id as string) ?? null,
  status: r.status as Order["status"],
  dong: r.dong as string,
  ho: r.ho as string,
  phone: r.phone as string,
  packagingAgreedAt: r.packaging_agreed_at as string,
  depositorName: (r.depositor_name as string) ?? null,
  paidAt: (r.paid_at as string) ?? null,
  pickupDate: (r.pickup_date as string) ?? null,
  deliveryDate: (r.delivery_date as string) ?? null,
  deliveredAt: (r.delivered_at as string) ?? null,
  refunded: !!r.refunded,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toEvent = (r: Row): OrderEvent => ({
  id: r.id as string,
  orderId: r.order_id as string,
  from: (r.from_status as OrderEvent["from"]) ?? null,
  to: r.to_status as OrderEvent["to"],
  actor: r.actor as OrderEvent["actor"],
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

const toInspection = (r: Row): Inspection => ({
  orderId: r.order_id as string,
  chargeOk: !!r.charge_ok,
  runtimeMin: (r.runtime_min as number) ?? null,
  heatOk: !!r.heat_ok,
  exteriorOk: !!r.exterior_ok,
  passed: !!r.passed,
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

const snake: Record<string, string> = {
  doorCodeEnc: "door_code_enc",
  pinHash: "pin_hash",
  failedCount: "failed_count",
  lockedUntil: "locked_until",
  partnerCost: "partner_cost",
  partnerId: "partner_id",
  protectCircuitFee: "protect_circuit_fee",
  sourceUrl: "source_url",
  customerId: "customer_id",
  modelId: "model_id",
  modelName: "model_name",
  optionLabel: "option_label",
  usageAge: "usage_age",
  packagingAgreedAt: "packaging_agreed_at",
  depositorName: "depositor_name",
  paidAt: "paid_at",
  pickupDate: "pickup_date",
  deliveryDate: "delivery_date",
  deliveredAt: "delivered_at",
  orderId: "order_id",
  chargeOk: "charge_ok",
  runtimeMin: "runtime_min",
  heatOk: "heat_ok",
  exteriorOk: "exterior_ok",
};

function toRow(obj: object): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[snake[k] ?? k] = v;
  return out;
}

// supabase-js는 스키마 타입 없이 쓰면 응답 타입이 들쭉날쭉해서 여기서 한 번에 정리한다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must(res: { data: unknown; error: { message: string } | null }): any {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseStore(client?: SupabaseClient): Store {
  const db =
    client ??
    createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  return {
    async getCustomer(id) {
      const r = must(await db.from("customers").select("*").eq("id", id).maybeSingle());
      return r ? toCustomer(r) : null;
    },
    async findCustomerByUnit(dong, ho) {
      const r = must(await db.from("customers").select("*").eq("dong", dong).eq("ho", ho).maybeSingle());
      return r ? toCustomer(r) : null;
    },
    async createCustomer(input) {
      const res = await db.from("customers").insert(toRow(input)).select().single();
      if (res.error?.code === "23505") throw new UnitTakenError();
      return toCustomer(must(res));
    },
    async updateCustomer(id, patch) {
      return toCustomer(must(await db.from("customers").update(toRow(patch)).eq("id", id).select().single()));
    },
    async listCustomers(ids) {
      if (!ids.length) return [];
      return must(await db.from("customers").select("*").in("id", ids)).map(toCustomer);
    },

    async listModels(opts) {
      let q = db.from("models").select("*").order("brand").order("name");
      if (opts?.activeOnly) q = q.eq("active", true);
      return must(await q).map(toModel);
    },
    async getModel(id) {
      const r = must(await db.from("models").select("*").eq("id", id).maybeSingle());
      return r ? toModel(r) : null;
    },
    async updateModel(id, patch) {
      return toModel(must(await db.from("models").update(toRow(patch)).eq("id", id).select().single()));
    },

    async listPartners() {
      return must(await db.from("partners").select("*").order("name")).map(
        (r: Row): Partner => ({ id: r.id as string, name: r.name as string, region: r.region as string, contact: (r.contact as string) ?? null }),
      );
    },

    async createOrder(input) {
      // order_no는 DB 트리거가 매긴다
      return toOrder(must(await db.from("orders").insert(toRow(input)).select().single()));
    },
    async getOrder(id) {
      const r = must(await db.from("orders").select("*").eq("id", id).maybeSingle());
      return r ? toOrder(r) : null;
    },
    async listOrdersByCustomer(customerId) {
      return must(await db.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false })).map(toOrder);
    },
    async listOrders(opts) {
      let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (opts?.statuses) q = q.in("status", opts.statuses);
      return must(await q).map(toOrder);
    },
    async updateOrder(id, patch) {
      return toOrder(must(await db.from("orders").update(toRow(patch)).eq("id", id).select().single()));
    },

    async addEvent(ev) {
      const r = must(
        await db
          .from("order_events")
          .insert({ order_id: ev.orderId, from_status: ev.from, to_status: ev.to, actor: ev.actor, note: ev.note })
          .select()
          .single(),
      );
      return toEvent(r);
    },
    async listEvents(orderId) {
      return must(await db.from("order_events").select("*").eq("order_id", orderId).order("created_at")).map(toEvent);
    },

    async saveInspection(ins) {
      return toInspection(must(await db.from("inspections").upsert(toRow(ins), { onConflict: "order_id" }).select().single()));
    },
    async getInspection(orderId) {
      const r = must(await db.from("inspections").select("*").eq("order_id", orderId).maybeSingle());
      return r ? toInspection(r) : null;
    },

    async listClosedDates() {
      return must(await db.from("closed_dates").select("date")).map((r: Row) => r.date as string);
    },

    async recordLoginFailure(ip) {
      must(await db.from("login_failures").insert({ ip }));
    },
    async countLoginFailures(ip, sinceIso) {
      const res = await db.from("login_failures").select("id", { count: "exact", head: true }).eq("ip", ip).gte("at", sinceIso);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },
  };
}
