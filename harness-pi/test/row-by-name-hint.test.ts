import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rowByNameHint } from "../src/tools/run.ts";

// gx-lollipop scrolly, Qwen3.5-9B (gx-lollipop-scrolly-seeded-osaurus-qwen-1794873114807): beat.mjs read r["entity_fr"]
// on a data.json row, which is a list, got undefined, and its own check refused "CHN has no French name in data.json"
// twice; the model searched data.json instead of its access.
function beatDir(beat: string) {
  const dir = mkdtempSync(join(tmpdir(), "splash-rowname-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.json"), JSON.stringify({ columns: [{ name: "code" }, { name: "entity_fr" }], rows: [["CHN", "Chine"]] }));
  writeFileSync(join(dir, "beat.mjs"), beat);
  return dir;
}

describe("a failed render whose beat reads a row by a column name", () => {
  it("should say a row is a list and give the access that works", () => {
    const dir = beatDir('const n = Object.fromEntries(data.rows.map((r) => [r[CODE], r["entity_fr"]]));\n');
    expect(rowByNameHint(dir)).toMatch(/r\["entity_fr"\] is undefined[\s\S]*r\[col\("entity_fr"\)\]/);
  });
  it("should catch the dotted access too", () => {
    expect(rowByNameHint(beatDir("const n = data.rows.map((row) => row.entity_fr);\n"))).toMatch(/row\.entity_fr is undefined/);
  });
  // gx-locator web, Qwen3.5-9B (mvq57): rows were mapped to objects by index, then filtered as objects under the same
  // parameter name; the hint read that r.kind as a raw row's, and the model rewrote its working access into a broken one.
  it("should say nothing when the name reads an object a raw row was mapped to", () => {
    const beat = 'const KIND = col("kind");\nconst rows = table.rows.map((r) => ({ kind: r[KIND] }));\nconst cities = rows.filter((r) => r.kind === "city");\n';
    const dir = beatDir(beat);
    writeFileSync(join(dir, "data.json"), JSON.stringify({ columns: [{ name: "kind" }], rows: [["city"]] }));
    expect(rowByNameHint(dir)).toBe("");
  });
  it("should still catch a name read inside a loop over the raw rows", () => {
    expect(rowByNameHint(beatDir("for (const r of data.rows) {\n  out.push(r.entity_fr);\n}\n"))).toMatch(/r\.entity_fr is undefined/);
  });
  it("should say nothing when columns are read by index", () => {
    expect(rowByNameHint(beatDir('const NAME = col("entity_fr");\nconst n = data.rows.map((r) => r[NAME]);\n'))).toBe("");
  });
});

describe("render_beat", () => {
  it("should append the row hint to a failed render", () => {
    const src = require("node:fs").readFileSync(join(import.meta.dirname, "..", "src", "tools", "run.ts"), "utf8");
    expect(src).toMatch(/failed\s*\?\s*rowByNameHint\(beatDir\(bases, beat\)\)/);
  });
});
