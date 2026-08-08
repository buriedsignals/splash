import { describe, it, expect } from "bun:test";
import { checkSankeyConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/sankey.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const ramp = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
];
const cols = [...new Set(sample.nodes.map((n) => n.column))];

describe("the shipped sankey is conformant (global ++ sankey)", () => {
  it("passes with zero violations (3 columns, positive flows, labelled, CVD-safe)", () => {
    const v = checkSankeyConformance(
      {
        title: sample.title,
        source: sample.source,
        columnCount: cols.length,
        linkValues: sample.links.map((l) => l.value),
        nodeLabels: sample.nodes.map((n) => n.label),
        rampColors: ramp,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-positive link value", () => {
    const v = checkSankeyConformance(
      {
        title: sample.title,
        source: sample.source,
        columnCount: 3,
        linkValues: [10, 0, 5],
        nodeLabels: sample.nodes.map((n) => n.label),
        rampColors: ramp,
      },
      text,
    );
    expect(v.some((m) => m.includes("must be > 0"))).toBe(true);
  });

  it("flags an unlabelled node", () => {
    const v = checkSankeyConformance(
      {
        title: sample.title,
        source: sample.source,
        columnCount: 3,
        linkValues: sample.links.map((l) => l.value),
        nodeLabels: ["Wind", "", "Solar"],
        rampColors: ramp,
      },
      text,
    );
    expect(v.some((m) => m.includes("needs a label"))).toBe(true);
  });

  it("flags an off-palette ribbon colour", () => {
    const v = checkSankeyConformance(
      {
        title: sample.title,
        source: sample.source,
        columnCount: 3,
        linkValues: sample.links.map((l) => l.value),
        nodeLabels: sample.nodes.map((n) => n.label),
        rampColors: [...ramp, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FLOW CONSERVATION, measured on the links the CONFIG carries. This is the one sankey rule a
// rendered picture cannot show is broken: the geometry draws a stage at max(in, out), so a
// stage that loses a fifth of its quantity renders as a perfectly solid bar with thinner
// ribbons on one side. The gate refuses it on the CSV; this is the twin on the artifact, so a
// hand-built config that never passed through the mapper meets the same rule.
//
// MUTATION-VERIFIED: deleting the `if (input.links)` block reddened the first case only;
// widening `SANKEY_CONSERVATION_TOLERANCE` to 1 did the same; narrowing it to 0 reddened only
// the rounding case.
// ---------------------------------------------------------------------------
describe("sankey flow conservation (the error the render hides)", () => {
  const base = {
    title: sample.title,
    source: sample.source,
    columnCount: 3,
    nodeLabels: ["A", "Hub", "B"],
    rampColors: [] as string[],
  };

  it("flags a stage that takes more than it passes on, naming both totals", () => {
    const v = checkSankeyConformance(
      {
        ...base,
        linkValues: [100, 60],
        links: [
          { source: "A", target: "Hub", value: 100 },
          { source: "Hub", target: "B", value: 60 },
        ],
      },
      text,
    );
    expect(v.join(" ")).toContain('stage "Hub" does not conserve');
    expect(v.join(" ")).toContain("100 in, 60 out");
  });

  it("says nothing about a source or a sink — neither conserves anything", () => {
    const v = checkSankeyConformance(
      {
        ...base,
        linkValues: [100, 100],
        links: [
          { source: "A", target: "Hub", value: 100 },
          { source: "Hub", target: "B", value: 100 },
        ],
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("tolerates a rounding crumb (real flow tables are rounded)", () => {
    const v = checkSankeyConformance(
      {
        ...base,
        linkValues: [100, 99.9],
        links: [
          { source: "A", target: "Hub", value: 100 },
          { source: "Hub", target: "B", value: 99.9 },
        ],
      },
      text,
    );
    expect(v).toEqual([]);
  });
});
