import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// gx-connected-scatter video, Qwen3.5-9B (gx-connected-scatter-video-seeded-osaurus-qwen-1794864022726): the worked
// example labelled countries from a typed FRENCH table; on an English story the model dropped it and drew DNK, FRA,
// SWE — data.json's entity column was there all along. Names come from the data, never from a table in the example.
const ROOT = join(import.meta.dir, "..", "craft");
const examples = ["static", "web", "scrolly", "video"].map((f) => `${f}/connected-scatter/beat.example.mjs`);

const nameOfIn = (path: string, table: object) => {
  const src = readFileSync(join(ROOT, path), "utf8");
  const colAt = src.indexOf("const col = (name) =>");
  const colSrc = src.slice(colAt, src.indexOf("\n};", colAt) + 3);
  const start = src.indexOf("const NAME = ");
  const nameSrc = start < 0 ? "" : src.slice(start, src.indexOf("\n", src.indexOf("const nameOf = ", start)));
  return new Function("table", `${colSrc}; ${nameSrc}; return typeof nameOf === "function" ? nameOf : () => undefined;`)(table);
};
const english = { columns: [{ name: "entity" }, { name: "code" }], rows: [["Germany", "DEU"]] };
const french = { columns: [{ name: "entity" }, { name: "code" }, { name: "entity_fr" }], rows: [["Germany", "DEU", "Allemagne"]] };

describe("the connected-scatter examples' names", () => {
  for (const p of examples) {
    it(`should type no code-to-name table: ${p}`, () => {
      expect(readFileSync(join(ROOT, p), "utf8").match(/\b[A-Z]{3}: "[^"]+"/g) ?? []).toEqual([]);
    });
    it(`should read the entity column on an English story: ${p}`, () => {
      expect(nameOfIn(p, english)("DEU")).toBe("Germany");
    });
    it(`should read the page language's column when data.json has one: ${p}`, () => {
      expect(nameOfIn(p, french)("DEU")).toBe("Allemagne");
    });
  }
});
