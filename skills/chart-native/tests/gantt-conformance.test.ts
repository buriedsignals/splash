import { describe, it, expect } from "bun:test";
import { checkGanttConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/gantt.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const groupColors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];
const spans = sample.items.map((i) => ({
  startMs: Date.parse(`${i.start}-01`),
  endMs: Date.parse(`${i.end}-01`),
}));

describe("the shipped gantt is conformant (global ++ gantt)", () => {
  it("passes with zero violations (valid spans, captioned axis, CVD-safe)", () => {
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans,
        timeLabel: sample.unit,
        groupColors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a span that ends before it starts", () => {
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans: [{ startMs: 100, endMs: 50 }],
        timeLabel: sample.unit,
        groupColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("end ≥ start"))).toBe(true);
  });

  it("flags a missing time-axis caption", () => {
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans,
        timeLabel: "",
        groupColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("time-axis caption"))).toBe(true);
  });

  it("flags an off-palette group colour", () => {
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans,
        timeLabel: sample.unit,
        groupColors: [...groupColors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
