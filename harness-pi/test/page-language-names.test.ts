import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNoAggregates } from "../craft/_shared/guards.mjs";

// gx-beeswarm static, Qwen3.5-9B, 2026-11-16: the analyst gave data.json an entity_fr column (H1), the beat read
// col("entity"), and the French page printed "Saudi Arabia" and "Kuwait". A drawn name is checked where every family
// already checks it (assertNoAggregates).
function beat(language: string) {
  const story = mkdtempSync(join(tmpdir(), "splash-pagelang-"));
  const here = join(story, "beats", "1");
  mkdirSync(here, { recursive: true });
  writeFileSync(join(story, "STORYBOARD.md"), `---\nlanguage: ${language}\n---\n`);
  writeFileSync(
    join(here, "data.json"),
    JSON.stringify({
      columns: [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "co2", type: "number" }, { name: "entity_fr", type: "text" }],
      rows: [["Saudi Arabia", "SAU", 21, "Arabie saoudite"], ["Qatar", "QAT", 40, "Qatar"], ["Germany", "DEU", 8, "Allemagne"]],
    }),
  );
  return here;
}

describe("a drawn name on a page whose language data.json translates", () => {
  it("should refuse the source column's name when its translation differs", () => {
    expect(() => assertNoAggregates(["Saudi Arabia", "Qatar"], beat("fr"))).toThrow(/"Saudi Arabia"/);
  });
  it("should hand the translated column and its name as a value that works", () => {
    expect(() => assertNoAggregates(["Saudi Arabia", "Qatar"], beat("fr"))).toThrow(/entity_fr[\s\S]*"Arabie saoudite"/);
  });
  // gx-bump-ranking-over-time web (Qwen3.5-9B, mvq111): the refusal named the column, but beat.mjs also typed
  // "India" to find its series, and the beat came back unchanged twice. Name the line and the typed names.
  it("should name the beat.mjs lines that read the source column and type its names", () => {
    const here = beat("fr");
    writeFileSync(join(here, "beat.mjs"), 'const NAME = col("entity");\nconst lead = "Saudi Arabia";\n');
    expect(() => assertNoAggregates(["Saudi Arabia", "Qatar"], here)).toThrow(
      /line 1: col\("entity"\) → col\("entity_fr"\)[\s\S]*line 2: "Saudi Arabia" → "Arabie saoudite"/,
    );
  });
  it("should accept the translated names", () => {
    expect(assertNoAggregates(["Arabie saoudite", "Qatar", "Allemagne"], beat("fr"))).toBeUndefined();
  });
  it("should accept a name both columns spell alike", () => {
    expect(assertNoAggregates(["Qatar"], beat("fr"))).toBeUndefined();
  });
  it("should accept the source names on an English page", () => {
    expect(assertNoAggregates(["Saudi Arabia", "Germany"], beat("en"))).toBeUndefined();
  });
});
