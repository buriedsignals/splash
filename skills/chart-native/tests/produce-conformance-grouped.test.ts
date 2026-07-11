import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";

const grouped = (
  seriesFields: string[],
  rows: Record<string, string | number>[],
) => ({
  title: "Urban wages pulled ahead of rural pay across every region",
  source: { name: "INSEE 2025", url: "https://insee.fr/x" },
  altInsight: "Urban wages pulled ahead of rural pay across every region.",
  unit: "median monthly wage (€)",
  catField: "region",
  seriesFields,
  rows,
});

describe("grouped-bar produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("grouped");
  });
  it("passes the default 2-series Okabe-Ito palette", () => {
    const r = runProduceConformance(
      "grouped",
      grouped(
        ["urban", "rural"],
        [
          { region: "North", urban: 2400, rural: 1900 },
          { region: "South", urban: 2200, rural: 1800 },
        ],
      ),
    );
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than three series (picket-fence rule)", () => {
    const r = runProduceConformance(
      "grouped",
      grouped(
        ["a", "b", "c", "d"],
        [{ region: "North", a: 1, b: 2, c: 3, d: 4 }],
      ),
    );
    expect(r.violations.join(" ")).toMatch(/series \(> 3\)/);
  });
});
