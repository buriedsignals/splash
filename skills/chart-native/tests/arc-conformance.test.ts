import { describe, it, expect } from "bun:test";
import { checkArcConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/arc.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
// one colour per distinct group, in order
const groupColors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];

describe("the shipped arc diagram is conformant (global ++ arc)", () => {
  it("passes with zero violations (CVD-safe group colours, weight→width)", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags an off-palette group colour", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors: [OKABE_ITO.blue, "#123456"],
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than 8 group colours", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors: Object.values(OKABE_ITO).concat(OKABE_ITO.blue),
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 8"))).toBe(true);
  });

  it("flags links that do not encode weight by width", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: false,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("stroke width"))).toBe(true);
  });

  it("flags dangling links (missing node)", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: true,
        danglingLinks: 2,
      },
      text,
    );
    expect(v.some((m) => m.includes("missing node"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The LABEL-FIT rule the flow contract made necessary. An arc's node labels are truncated to
// the gap between neighbours, so a crowded baseline does not overflow — it turns every name
// into an ellipsis, and snap-label-fit (which only looks for text escaping its clip box)
// cannot see that. Measured on the rendered layout, never counted from the data.
//
// MUTATION-VERIFIED: `ARC_MIN_LABEL_RATIO` 0.5 → 0 made both cases below pass (the rule can no
// longer fire at all) and reddened only the first of them; 0.5 → 1 reddened only the second.
// ---------------------------------------------------------------------------
describe("arc label fit — the crowding a rendered picture hides", () => {
  const base = {
    title: sample.title,
    source: sample.source,
    groupColors,
    encodesWeightByWidth: true,
    danglingLinks: 0,
  };

  it("flags a baseline where the longest name loses more than half its width", () => {
    const v = checkArcConformance(
      {
        ...base,
        labelFit: {
          minGapPx: 20,
          longestLabel: "Social Democrats",
          labelPx: 90,
        },
      },
      text,
    );
    expect(v.join(" ")).toContain("too crowded to name");
    expect(v.join(" ")).toContain("Social Democrats");
  });

  it("passes when MOST of the name survives, even though it is trimmed", () => {
    // 70px gap → a 65.8px budget for a 90px name: trimmed, but well over half, which is the
    // line. (Requiring the WHOLE name would refuse every arc diagram ever drawn.)
    const v = checkArcConformance(
      {
        ...base,
        labelFit: {
          minGapPx: 70,
          longestLabel: "Social Democrats",
          labelPx: 90,
        },
      },
      text,
    );
    expect(v).toEqual([]);
  });
});
