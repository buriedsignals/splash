import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";

const cfg = (items: { label: string; value: number }[]) => ({
  title: "Half of Riverton still commutes by car",
  source: {
    name: "Riverton travel-to-work survey",
    url: "https://example.org/riverton-commute",
  },
  altInsight: "Half of Riverton still commutes by car.",
  unit: "share of commuters (each square = 1%)",
  items,
});

describe("waffle produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("waffle");
  });

  it("passes the default palette (≤6 Okabe-Ito categories)", () => {
    const r = runProduceConformance(
      "waffle",
      cfg([
        { label: "Car", value: 52 },
        { label: "Bus", value: 18 },
        { label: "Bike", value: 12 },
        { label: "Walk", value: 11 },
        { label: "Train", value: 7 },
      ]),
    );
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("flags more than six categories", () => {
    const items = ["A", "B", "C", "D", "E", "F", "G"].map((l, i) => ({
      label: l,
      value: 10 + i,
    }));
    const r = runProduceConformance("waffle", cfg(items));
    expect(r.checked).toBe(true);
    expect(r.violations.join(" ")).toMatch(/> 6/);
  });
});
