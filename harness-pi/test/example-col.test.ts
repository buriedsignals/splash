import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import { join } from "node:path";

// gx-cartogram web (12B, 2026-11-15): the beat wrote [col("gas"), col("coal")].map(col), looked an index up as a
// name, and was refused "data.json has no column 3" three crafts running — 37 turns, no page. The kits' col() is
// what a model copies: it must take back an index it already gave, and name the real columns when a name is wrong.
const ROOT = join(import.meta.dir, "..", "craft");
const examples = [...new Glob("**/beat.example.mjs").scanSync(ROOT)].filter((p) =>
  /const col = \(name\) =>/.test(readFileSync(join(ROOT, p), "utf8")),
);

const colOf = (path: string) => {
  const src = readFileSync(join(ROOT, path), "utf8");
  const start = src.indexOf("const col = (name) =>");
  const end = src.indexOf("\n};", start) + 3;
  const table = { columns: [{ name: "entity" }, { name: "code" }, { name: "gas" }, { name: "coal" }] };
  return new Function("table", "data", `${src.slice(start, end)}; return col;`)(table, table);
};

describe("the kits' col()", () => {
  it("should find the kits that define one", () => {
    expect(examples.length).toBeGreaterThan(40);
  });
  for (const p of examples) {
    it(`should give back an index it was handed again: ${p}`, () => {
      const col = colOf(p);
      expect([col("gas"), col("coal")].map(col)).toEqual([2, 3]);
    });
    it(`should name the real columns when a name is wrong: ${p}`, () => {
      expect(() => colOf(p)("oil")).toThrow(/entity, code, gas, coal/);
    });
  }
});
