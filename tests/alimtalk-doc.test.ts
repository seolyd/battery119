import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/notify/templates";

describe("알림톡 가이드 문서", () => {
  it("검수에 올릴 템플릿 본문이 코드와 똑같다 (다르면 node scripts/build-alimtalk-doc.mjs)", () => {
    const doc = readFileSync("docs/alimtalk.md", "utf8");
    for (const [id, t] of Object.entries(TEMPLATES)) {
      expect(doc, id).toContain("```\n" + t.body + "\n```");
    }
  });
});
