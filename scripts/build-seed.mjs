// src/data/models.json → supabase/seed.sql
// 사용: npm run seed:sql
import { readFileSync, writeFileSync } from "node:fs";

const models = JSON.parse(readFileSync(new URL("../src/data/models.json", import.meta.url), "utf8"));
const arr = (xs) => (xs.length ? `array[${xs.map((x) => q(x)).join(", ")}]` : "'{}'::text[]");
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const lines = [
  "-- 자동 생성 파일입니다. src/data/models.json을 고친 뒤 npm run seed:sql 로 다시 만드세요.",
  "-- 가격 출처: asbattery.com 배터리리필 메뉴 (2026-11-21 조사). 판매가 = 업체가 + 20,000원",
  "",
  "insert into partners (id, name, region) values",
  "  ('partner-taegeuk', '태극전기 (asbattery.com)', '미정'),",
  "  ('partner-yongsan', '용산 협력업체', '용산'),",
  "  ('partner-guro', '구로 협력업체', '구로'),",
  "  ('partner-jangji', '장지 협력업체', '장지')",
  "on conflict (id) do nothing;",
  "",
  "insert into models (id, category, brand, name, variants, partner_id, partner_cost, price, options, protect_circuit_fee, active, source_url) values",
];
lines.push(
  models
    .map(
      (m) =>
        `  (${q(m.id)}, ${q(m.category)}, ${q(m.brand)}, ${q(m.name)}, ${arr(m.variants ?? [])}, 'partner-taegeuk', ${m.partnerCost}, ${m.price}, ${q(JSON.stringify(m.options))}::jsonb, ${m.protectCircuitFee ?? "null"}, ${m.active === false ? "false" : "true"}, ${q(m.sourceUrl)})`,
    )
    .join(",\n") + "\non conflict (id) do nothing;",
);
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n") + "\n");

// 이미 만든 DB용: 모델 이름 정리와 개별 모델 목록만 바꾼다 (가격·협력업체는 그대로)
const upd = [
  "-- 자동 생성 파일입니다. scripts/model-variants.mjs 를 고친 뒤 node scripts/apply-variants.mjs && npm run seed:sql",
  "-- 여러 모델에 맞는 배터리 상품을 고객이 모델별로 고를 수 있게 개별 모델 목록(variants)을 넣는다.",
  "-- 가격, 원가, 협력업체는 바꾸지 않는다. 이미 접수된 주문도 그대로다.",
  "",
  "alter table models add column if not exists variants text[] not null default '{}';",
  "",
  ...models.map(
    (m) =>
      `update models set name = ${q(m.name)}, variants = ${arr(m.variants ?? [])}${m.active === false ? ", active = false" : ""} where id = ${q(m.id)};`,
  ),
];
writeFileSync(new URL("../supabase/migrations/0004_model_variants.sql", import.meta.url), upd.join("\n") + "\n");
console.log(`supabase/seed.sql: 모델 ${models.length}개`);
