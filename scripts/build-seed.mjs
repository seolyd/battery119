// src/data/models.json → supabase/seed.sql
// 사용: npm run seed:sql
import { readFileSync, writeFileSync } from "node:fs";

const models = JSON.parse(readFileSync(new URL("../src/data/models.json", import.meta.url), "utf8"));
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const lines = [
  "-- 자동 생성 파일입니다. src/data/models.json을 고친 뒤 npm run seed:sql 로 다시 만드세요.",
  "-- 가격 출처: asbattery.com 배터리리필 메뉴 (2026-11-21 조사). 판매가 = 업체가 + 30,000원 (예시)",
  "",
  "insert into partners (id, name, region) values",
  "  ('partner-taegeuk', '태극전기 (asbattery.com)', '미정'),",
  "  ('partner-yongsan', '용산 협력업체', '용산'),",
  "  ('partner-guro', '구로 협력업체', '구로'),",
  "  ('partner-jangji', '장지 협력업체', '장지')",
  "on conflict (id) do nothing;",
  "",
  "insert into models (id, category, brand, name, partner_id, partner_cost, price, options, protect_circuit_fee, source_url) values",
];
lines.push(
  models
    .map(
      (m) =>
        `  (${q(m.id)}, ${q(m.category)}, ${q(m.brand)}, ${q(m.name)}, 'partner-taegeuk', ${m.partnerCost}, ${m.price}, ${q(JSON.stringify(m.options))}::jsonb, ${m.protectCircuitFee ?? "null"}, ${q(m.sourceUrl)})`,
    )
    .join(",\n") + "\non conflict (id) do nothing;",
);
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`supabase/seed.sql: 모델 ${models.length}개`);
