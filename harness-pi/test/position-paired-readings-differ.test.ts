// gx-dot-strip web, Qwen3.5-9B (mvq34, 2026-11-17): the beat filled both moments of each country from the same
// data.json row, so every from equalled its to; the refusals named only the title's "0 points" twice, never the rows.
import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { assertPairedReadingsDiffer, modelOf } = familyModule as any;
const model = (rows: any[]) => modelOf("dot-strip", { rows, format: (v: number) => String(v), unit: "%" });
const refusal = (rows: any[]) => {
  try {
    assertPairedReadingsDiffer(model(rows), ["2000", "2024"]);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
};

describe("a paired strip whose rows read one moment twice", () => {
  const same = [{ name: "Pologne", from: 31.1, to: 31.1 }, { name: "Suède", from: 98.7, to: 98.7 }];
  it("should refuse naming both moments", () => {
    expect(refusal(same)).toContain("2000");
  });
  it("should say to read each moment from its own rows", () => {
    expect(refusal(same)).toContain("its own rows");
  });
  it("should accept rows where one reading moved", () => {
    expect(refusal([{ name: "Pologne", from: 1.6, to: 31.1 }, { name: "Suède", from: 98.7, to: 98.7 }])).toBe("");
  });
});
