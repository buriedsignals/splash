import { describe, it, expect } from "bun:test";
import { checkGanttConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/gantt.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const groupColors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];
const spans = sample.items.map((i) => ({
  startMs: Date.parse(`${i.start}-01`),
  endMs: Date.parse(`${i.end}-01`),
  label: i.label,
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
        spans: [{ startMs: 100, endMs: 50, label: "Land acquisition" }],
        timeLabel: sample.unit,
        groupColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("end ≥ start"))).toBe(true);
  });

  it("NAMES the row that runs backwards, not just the fact that one does", () => {
    // MUTATION: dropping `s.label` from the message → this fails while the test above
    // still passes, which is exactly why both exist.
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans: [{ startMs: 100, endMs: 50, label: "Land acquisition" }],
        timeLabel: sample.unit,
        groupColors,
      },
      text,
    );
    expect(v.join(" ")).toContain("Land acquisition");
  });

  it("flags a row left without a label", () => {
    const v = checkGanttConformance(
      {
        title: sample.title,
        source: sample.source,
        spans: [{ startMs: 50, endMs: 100, label: "  " }],
        timeLabel: sample.unit,
        groupColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("no label"))).toBe(true);
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
