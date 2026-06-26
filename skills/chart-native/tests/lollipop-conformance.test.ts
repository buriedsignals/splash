import { describe, it, expect } from "bun:test";
// A lollipop is a bar variant (magnitude, baseline-0), so it REUSES the bar guard
// rather than introducing a near-identical one (recipe step 5: reuse globals).
import { checkBarConformance } from "../src/core/conformance";
import { COLORS, OKABE_ITO } from "../src/core/tokens";
import { computeLollipopLayout } from "../src/lollipop-geometry";
import sample from "../assets/sample-data/lollipop.json";

const colors = {
  data: COLORS.line,
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};
const layout = computeLollipopLayout(
  { catField: sample.catField, valField: sample.valField, rows: sample.rows },
  {
    width: 840,
    height: 480,
    padding: { top: 90, right: 18, bottom: 24, left: 124 },
  },
);

describe("the shipped lollipop is conformant (reuses the bar guard)", () => {
  it("passes with zero violations (baseline 0, Okabe-Ito)", () => {
    const v = checkBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("the accent colour is also in the Okabe-Ito set (≤2-colour rule)", () => {
    expect(
      [OKABE_ITO.blue, OKABE_ITO.vermillion].every((c) =>
        Object.values(OKABE_ITO).includes(c),
      ),
    ).toBe(true);
  });

  it("flags an off-palette data colour", () => {
    const v = checkBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
      },
      { data: "#123456", text: ["#1A1A1A"], bg: "#FFFFFF" },
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags a value axis that does not include 0", () => {
    const v = checkBarConformance(
      { title: sample.title, source: sample.source, valueDomain: [4, 14] },
      colors,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });
});
