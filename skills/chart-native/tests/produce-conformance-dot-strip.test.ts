import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";

const cfg = (rows: Record<string, string | number>[]) => ({
  title: "Wait times vary far more between clinics than within them",
  source: { name: "NHS 2025", url: "https://nhs.uk/x" },
  unit: "wait (days)",
  categoryField: "clinic",
  valueField: "days",
  rows,
});

describe("dot-strip produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("dot-strip");
  });

  it("passes raw-observation data with a mean marker", () => {
    const r = runProduceConformance(
      "dot-strip",
      cfg([
        { clinic: "A", days: 5 },
        { clinic: "A", days: 9 },
        { clinic: "B", days: 3 },
        { clinic: "B", days: 20 },
      ]),
    );
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
});
