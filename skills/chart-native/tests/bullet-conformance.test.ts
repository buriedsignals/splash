import { describe, it, expect } from "bun:test";
import { checkBulletConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/bullet.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.vermillion]; // hit / miss

describe("the shipped bullet is conformant (global ++ bullet)", () => {
  it("passes with zero violations (targets present, CVD-safe measures)", () => {
    const v = checkBulletConformance(
      {
        title: sample.title,
        source: sample.source,
        measureColors: colors,
        rows: sample.rows,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a row with no target", () => {
    const rows = sample.rows.map((r, i) =>
      i === 0 ? { ...r, target: NaN } : r,
    );
    const v = checkBulletConformance(
      {
        title: sample.title,
        source: sample.source,
        measureColors: colors,
        rows,
      },
      text,
    );
    expect(v.some((m) => m.includes("needs a target"))).toBe(true);
  });

  it("flags an off-palette measure colour", () => {
    const v = checkBulletConformance(
      {
        title: sample.title,
        source: sample.source,
        measureColors: [OKABE_ITO.blue, "#FF0000"],
        rows: sample.rows,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
