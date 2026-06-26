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
