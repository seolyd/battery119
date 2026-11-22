// scripts/model-variants.mjs 의 정리 내용을 src/data/models.json 에 반영한다.
// 사용: node scripts/apply-variants.mjs && npm run seed:sql
import { readFileSync, writeFileSync } from "node:fs";
import { VARIANTS } from "./model-variants.mjs";

const url = new URL("../src/data/models.json", import.meta.url);
const models = JSON.parse(readFileSync(url, "utf8"));
const ids = new Set(models.map((m) => m.id));
for (const id of Object.keys(VARIANTS)) if (!ids.has(id)) throw new Error(`없는 상품 id: ${id}`);

let split = 0;
for (const m of models) {
  const v = VARIANTS[m.id];
  m.variants = [];
  m.active = true;
  if (!v) continue;
  const [name, variants, extra = {}] = v;
  if (new Set(variants).size !== variants.length) throw new Error(`${m.id}: 같은 모델이 두 번 있어요`);
  m.name = name;
  m.variants = variants;
  if (extra.active === false) m.active = false;
  if (variants.length) split++;
}
writeFileSync(url, JSON.stringify(models, null, 1) + "\n");
const entries = models.filter((m) => m.active).reduce((n, m) => n + (m.variants.length || 1), 0);
console.log(`상품 ${models.length}개 (판매 ${models.filter((m) => m.active).length}개), 나눈 상품 ${split}개, 고객이 고르는 모델 ${entries}개`);
