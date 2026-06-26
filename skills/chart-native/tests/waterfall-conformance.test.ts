import { describe, it, expect } from "bun:test";
import { checkWaterfallConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeWaterfallLayout } from "../src/waterfall-geometry";
import sample from "../assets/sample-data/waterfall.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.vermillion, OKABE_ITO.black];
const layout = computeWaterfallLayout(
  { rows: sample.rows },
  {
    width: 840,
    height: 480,
    padding: { top: 90, right: 18, bottom: 40, left: 48 },
  },
);

describe("the shipped waterfall is conformant (global ++ waterfall)", () => {
  it("passes with zero violations (exact bridge, 3 CVD-safe role colours)", () => {
    const v = checkWaterfallConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        rows: sample.rows,
        roleColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a closing total that breaks the bridge", () => {
    const broken = sample.rows.map((r) =>
      r.label === "Closing" ? { ...r, value: 999 } : r,
    );
    const v = checkWaterfallConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        rows: broken,
        roleColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("does not match the running level"))).toBe(
      true,
    );
  });

  it("flags an off-palette role colour", () => {
    const v = checkWaterfallConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        rows: sample.rows,
        roleColors: [OKABE_ITO.blue, OKABE_ITO.vermillion, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
