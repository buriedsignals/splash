import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quotedTemplateHint } from "../src/tools/run.ts";

// gx-stacked-bar web, Qwen3.5-9B (gx-stacked-bar-web-seeded-osaurus-qwen-1794875417614): gestures[3].mark was
// "Espagne · ${ADDED}" in double quotes, printed as is; the refusal gave the drawn row, never the quotes.
function beatDir(beat: string) {
  const dir = mkdtempSync(join(tmpdir(), "splash-quoted-"));
  writeFileSync(join(dir, "beat.mjs"), beat);
  return dir;
}

describe("a failed render whose beat puts ${…} inside plain quotes", () => {
  it("should name the string and say it needs backticks", () => {
    expect(quotedTemplateHint(beatDir('const g = { mark: "Espagne · ${ADDED}" };\n'))).toMatch(/"Espagne · \$\{ADDED\}"[\s\S]*backticks/);
  });
  it("should catch single quotes too", () => {
    expect(quotedTemplateHint(beatDir("const g = { mark: 'Espagne · ${ADDED}' };\n"))).toMatch(/'Espagne · \$\{ADDED\}'/);
  });
  it("should say nothing for a template literal", () => {
    expect(quotedTemplateHint(beatDir("const g = { mark: `Espagne · ${ADDED}`, note: `le \"${X}\" dit` };\n"))).toBe("");
  });
});

describe("render_beat wiring", () => {
  it("should append the hint to a failed render", async () => {
    const src = await Bun.file(join(import.meta.dirname, "../src/tools/run.ts")).text();
    expect(src).toMatch(/failed\s*\?\s*rowByNameHint\(beatDir\(bases, beat\)\)\s*\+\s*quotedTemplateHint\(beatDir\(bases, beat\)\)/);
  });
});
