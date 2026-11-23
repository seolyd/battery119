// src/lib/notify/templates.ts 의 템플릿 본문으로 docs/alimtalk.md 의 템플릿 목록을 다시 만든다.
// 사용: node scripts/build-alimtalk-doc.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/notify/templates.ts", import.meta.url), "utf8");
const H = "[파크리오 배터리 119]";
const re = /^\s{2}([A-Z_]+): \{\n\s+name: "([^"]+)",\n(\s+toAdmin: true,\n)?\s+body: `([\s\S]*?)`,\n\s+\},/gm;
const items = [...src.matchAll(re)].map((m) => ({ id: m[1], name: m[2], admin: !!m[3], body: m[4].replaceAll("${H}", H) }));
if (items.length < 10) throw new Error(`템플릿을 ${items.length}개만 찾았어요`);

const doc = readFileSync(new URL("../docs/alimtalk.md", import.meta.url), "utf8");
const start = "<!-- templates:start -->";
const end = "<!-- templates:end -->";
const list = items
  .map((t) =>
    t.admin
      ? `### ${t.name} (\`${t.id}\`) — 운영자에게 문자로 발송, 검수 불필요\n\n\`\`\`\n${t.body}\n\`\`\``
      : `### ${t.name} (\`${t.id}\`)\n\n\`\`\`\n${t.body}\n\`\`\``,
  )
  .join("\n\n");
const out = doc.replace(new RegExp(`${start}[\\s\\S]*${end}`), `${start}\n\n${list}\n\n${end}`);
writeFileSync(new URL("../docs/alimtalk.md", import.meta.url), out);
console.log(`docs/alimtalk.md: 템플릿 ${items.length}개`);
