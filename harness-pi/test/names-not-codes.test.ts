import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNoAggregates } from "../craft/_shared/guards.mjs";

// gx-connected-scatter scrolly, Qwen3.5-9B (gx-connected-scatter-scrolly-seeded-osaurus-qwen-1794869933546): the beat
// built its entities as { name: code } and the page printed FRA, SWE, DEU over the plot and "FRA stands alone" in a
// card, while data.json held each country's name. A reader knows France, not FRA.
function beatDir(language: string | null, withNames = true) {
  const root = mkdtempSync(join(tmpdir(), "splash-codes-"));
  const dir = join(root, "beats", "1");
  mkdirSync(dir, { recursive: true });
  if (language) writeFileSync(join(root, "STORYBOARD.md"), `---\nlanguage: ${language}\n---\n`);
  const columns = withNames
    ? [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "entity_fr", type: "text" }, { name: "v", type: "number" }]
    : [{ name: "code", type: "text" }, { name: "v", type: "number" }];
  const rows = withNames
    ? [["France", "FRA", "France", 1], ["Sweden", "SWE", "Suède", 2], ["Germany", "DEU", "Allemagne", 3]]
    : [["FRA", 1], ["SWE", 2], ["DEU", 3]];
  writeFileSync(join(dir, "data.json"), JSON.stringify({ columns, rows }));
  return dir;
}

describe("a printed name that is a country code", () => {
  it("should refuse a code where data.json holds the country's name", () => {
    expect(() => assertNoAggregates(["FRA", "SWE", "DEU"], beatDir("en"))).toThrow(/"FRA".*code/);
  });
  it("should give the source's name as the value that works on an English page", () => {
    expect(() => assertNoAggregates(["FRA", "SWE", "DEU"], beatDir("en"))).toThrow(/a value that works:.*"Sweden"/);
  });
  it("should give the page language's name as the value that works on a French page", () => {
    expect(() => assertNoAggregates(["FRA", "SWE", "DEU"], beatDir("fr"))).toThrow(/a value that works:.*"Suède"/);
  });
  it("should accept the names data.json holds", () => {
    expect(() => assertNoAggregates(["France", "Sweden", "Germany"], beatDir("en"))).not.toThrow();
  });
  it("should accept codes when data.json holds no name to print instead", () => {
    expect(() => assertNoAggregates(["FRA", "SWE", "DEU"], beatDir("en", false))).not.toThrow();
  });
});

describe("the connected-scatter kits", () => {
  for (const format of ["static", "web", "video", "scrolly"])
    it(`should check the ${format} kit's printed names against data.json's codes`, () => {
      const src = require("node:fs").readFileSync(join(import.meta.dir, "..", "craft", format, "connected-scatter", "render-beat.mjs"), "utf8");
      expect(src).toMatch(/assertNoAggregates\(\(Array\.isArray\(beat\.entities\)/);
    });
});
