// A REPEATED ROW IS A FACT NOBODY WAS READING.
//
// `intake` writes `duplicates: { count, rows }` on every profile it freezes and has done for
// rounds; a grep across this tree found no reader for it outside the profiler's own tests and its
// own SKILL.md. Round five recorded that as finding T5 — "a writer and no reader" — and it stayed
// open because the question "so what should read it?" has one honest answer: a numeral that rests
// on a figure computed from EVERY row. A table carrying the same row twice has a sum, a count and a
// ranking that are each one row too many, and confirming a total against it is confirmation of
// arithmetic nobody would stand behind.
//
// `stress-t-europe-recycling` is the one frozen table in the corpus that carries a repeat: Sweden's
// 48.7 in 1980 appears at rows 10 and 11.

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groundTakeaway } from "../scripts/ground-claim.mjs";

const ROOT = join(import.meta.dir, "../../..");
const read = (file: string) =>
  readFileSync(join(ROOT, "stories/stress-t-europe-recycling/source", file), "utf8");
const profile = JSON.parse(read("profile.json"));
const csv = read("data.csv");

const TOTAL = "The twelve recycling rates in the table add up to 566.9 between them.";

describe("a total taken over a table that repeats a row", () => {
  it("should place the numeral without confirming it", () => {
    const { claims } = groundTakeaway(TOTAL, profile, { csv });
    const total = claims.find((c: any) => c.claim.includes("566.9"))!;
    expect(total.verdict).toBe("consistent");
  });

  it("should name the repetition, with the values that repeat", () => {
    const { claims } = groundTakeaway(TOTAL, profile, { csv });
    const total = claims.find((c: any) => c.claim.includes("566.9"))!;
    expect(total.detail).toContain("1 repeated row");
    expect(total.detail).toContain("Sweden");
    expect(total.detail).toContain("appears 2 times");
  });

  it("should leave the same claim CONFIRMED on a table that repeats nothing", () => {
    // The same arithmetic, the same sentence, one row removed. This is what tells the downgrade
    // from a check that simply stopped confirming totals.
    const clean = { ...profile, duplicates: { count: 0, rows: [] } };
    const { claims } = groundTakeaway(TOTAL, clean, { csv });
    const total = claims.find((c: any) => c.claim.includes("566.9"))!;
    expect(total.verdict).toBe("supported");
    expect(total.detail).not.toContain("repeated row");
  });

  it("should say the same thing about a row COUNT, which is the other figure every row feeds", () => {
    const counted = { ...profile, rowCount: 12 };
    const { claims } = groundTakeaway("The recycling rate is reported for 12 countries.", counted, { csv });
    const count = claims.find((c: any) => c.claim.includes("12"))!;
    expect(count.verdict).toBe("consistent");
    expect(count.detail).toContain("repeated row");
  });
});
