import { describe, it, expect } from "bun:test";
import { checkBumpConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/bump.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const accents = [OKABE_ITO.blue, OKABE_ITO.orange];
const maxRank = Math.max(...sample.items.flatMap((i) => i.ranks));

describe("the shipped bump chart is conformant (global ++ bump)", () => {
  it("passes with zero violations (4 periods, 5 ranks, 2 accents)", () => {
    const v = checkBumpConformance(
      {
        title: sample.title,
        source: sample.source,
        periodCount: sample.periods.length,
        maxRank,
        highlightCount: sample.highlight.length,
        accentColors: accents,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags fewer than 2 periods", () => {
    const v = checkBumpConformance(
      {
        title: sample.title,
        source: sample.source,
        periodCount: 1,
        maxRank,
        highlightCount: 2,
        accentColors: accents,
      },
      text,
    );
    expect(v.some((m) => m.includes("≥ 2 periods"))).toBe(true);
  });

  it("flags more than 3 highlighted lines", () => {
    const v = checkBumpConformance(
      {
        title: sample.title,
        source: sample.source,
        periodCount: 4,
        maxRank,
        highlightCount: 5,
        accentColors: accents,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 3"))).toBe(true);
  });

  it("flags an off-palette accent colour", () => {
    const v = checkBumpConformance(
      {
        title: sample.title,
        source: sample.source,
        periodCount: 4,
        maxRank,
        highlightCount: 2,
        accentColors: [...accents, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
