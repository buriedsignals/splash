import { beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertDrawsClaimColumn, assertHeadlineNumbersDrawn } from "../craft/_shared/guards.mjs";

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
