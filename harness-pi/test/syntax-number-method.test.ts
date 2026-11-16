import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorText } from "../craft/_shared/guards.mjs";

// gx-sankey scrolly, Qwen3.5-9B (gx-sankey-scrolly-seeded-osaurus-qwen-1794845541253): `${share * 100.toFixed(1)}` broke
// the parse; the refusal said only "Syntax Error (line 90: …)", Qwen read line 9 and spent two no-op edits there.
async function loadError(source: string) {
  const dir = mkdtempSync(join(tmpdir(), "splash-syntax-"));
  writeFileSync(join(dir, "beat.mjs"), source);
  try {
    await import(join(dir, "beat.mjs"));
  } catch (e) {
    return errorText(e);
  }
  throw new Error("beat.mjs loaded");
}

describe("a syntax error in beat.mjs", () => {
  it("should name the column where the parse broke", async () => {
    const text = await loadError("const a = 1;\nconst s = `x ${a * 100.toFixed(1)} y`;\nexport default { s };\n");
    expect(text).toContain("column 20");
  });
  it("should name a number followed by a method as the cause, with parentheses as the value that works", async () => {
    const text = await loadError("const a = 1;\nconst s = `x ${a * 100.toFixed(1)} y`;\nexport default { s };\n");
    expect(text).toMatch(/100\.toFixed[\s\S]*value that works[\s\S]*\)\.toFixed\(1\)/);
  });
  it("should not name a number-method cause when the line holds none", async () => {
    const text = await loadError("const a = 1;\nconst s = { a b };\nexport default { s };\n");
    expect(text).not.toContain("toFixed");
  });
});
