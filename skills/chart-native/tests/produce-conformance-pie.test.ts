// skills/chart-native/tests/produce-conformance-pie.test.ts
import { describe, it, expect } from "bun:test";
import { runProduceConformance } from "../src/core/produce-conformance";

const pie = (rows: Record<string, string | number>[]) => ({
  title: "Hydro still supplies most of the country's clean power",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of clean generation",
  labelField: "source",
  valueField: "gwh",
  rows,
});

describe("pie produce-time conformance", () => {
  it("passes the default palette (≤5 Okabe-Ito slices)", () => {
    const r = runProduceConformance(
      "pie",
      pie([
        { source: "Hydro", gwh: 420 },
        { source: "Wind", gwh: 180 },
        { source: "Solar", gwh: 90 },
      ]),
    );
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than five slices", () => {
    const rows = ["A", "B", "C", "D", "E", "F"].map((s, i) => ({
      source: s,
      gwh: 10 + i,
    }));
    const r = runProduceConformance("pie", pie(rows));
    expect(r.checked).toBe(true);
    expect(r.violations.join(" ")).toMatch(/slices \(> 5\)/);
  });
});
