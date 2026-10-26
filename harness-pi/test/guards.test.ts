import { beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, errorText } from "../craft/_shared/guards.mjs";

let beat: string;

beforeAll(() => {
  const story = mkdtempSync(join(tmpdir(), "splash-guards-"));
  beat = join(story, "beats", "1");
  mkdirSync(beat, { recursive: true });
  writeFileSync(join(story, "STORYBOARD.md"), `---\nclaimColumn: "co2_t"\n---\n`);
  writeFileSync(
    join(beat, "data.json"),
    JSON.stringify({ columns: [{ name: "country", type: "text" }, { name: "co2_t", type: "number" }], rows: [["A", 11_700_000_000], ["B", 4_900_000_000]] }),
  );
});

describe("assertDrawsClaimColumn", () => {
  it("should accept the claim column drawn in a power-of-ten unit (tonnes as billions)", () => {
    expect(() => assertDrawsClaimColumn([11.7, 4.9], beat)).not.toThrow();
  });

  it("should refuse values the claim column does not hold at any one scale", () => {
    expect(() => assertDrawsClaimColumn([11.7, 3.2], beat)).toThrow(/draws values that column does not hold/);
  });
});

describe("assertHeadlineNumbersDrawn", () => {
  it("should read a nineteenth-century year in the title as a year, not a figure", () => {
    expect(() => assertHeadlineNumbersDrawn("World population passed 8 billion, from 1 billion in 1858", [1, 8])).not.toThrow();
  });

  it("should still refuse a title whose figures are not drawn", () => {
    expect(() => assertHeadlineNumbersDrawn("Pedelec deaths rose from 36 to 214", [17, 60, 119])).toThrow(/the title states/);
  });
});

describe("applyStoryboard", () => {
  it("should refuse a beat.mjs with no default export, saying how to write one", () => {
    expect(() => applyStoryboard(undefined, beat)).toThrow(/beat\.mjs has no default export.*export default \{/);
  });
});

describe("assertLegibleLabels", () => {
  it("should refuse labels printed to the last tonne, asking for a readable unit", () => {
    const format = (v: number) => `${v.toLocaleString("en-US")} t`;
    expect(() => assertLegibleLabels([12_289_037_000, 4_904_120_000, 3_193_478_100], format)).toThrow(/billions .*unit/);
  });

  it("should accept a population printed in full", () => {
    const format = (v: number) => v.toLocaleString("en-US");
    expect(() => assertLegibleLabels([4_465_340, 4_312_005, 3_901_220], format)).not.toThrow();
  });
});

describe("errorText", () => {
  it("should spell out each error of a failed build with its line", async () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-build-"));
    writeFileSync(join(dir, "bad.mjs"), "const a = 1;\nconst a = 2;\nexport default {};\n");
    const error = await import(join(dir, "bad.mjs")).catch((e) => e);
    expect(errorText(error)).toMatch(/"a" has already been declared \(line 2: const a = 2;\)/);
  });
});

describe("assertHeadlineNumbersDrawn with signed values", () => {
  it("should read a loss stated without its sign against a negative drawn value", () => {
    expect(() => assertHeadlineNumbersDrawn("Beta lost 12 while Alpha gained 20", [20, -12])).not.toThrow();
  });
});

describe("assertHeadlineNumbersDrawn on negative values", () => {
  it("should refuse a title stating losses the negative drawn values do not hold", () => {
    expect(() => assertHeadlineNumbersDrawn("Beta fell 40 and Gamma fell 50", [-12, -30])).toThrow(/the title states/);
  });
});
