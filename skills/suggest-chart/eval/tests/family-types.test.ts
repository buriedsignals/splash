import { describe, it, expect } from "bun:test";
import { FAMILY_TYPES } from "../family-types";
import { CHART_TYPES } from "../../../dw-chart/src/chart-spec";

describe("FAMILY_TYPES", () => {
  it("lists only types the producer supports", () => {
    const allowed = new Set<string>(CHART_TYPES);
    for (const [family, types] of Object.entries(FAMILY_TYPES)) {
      for (const type of types) {
        expect(
          allowed.has(type),
          `${type} (family ${family}) not in CHART_TYPES`,
        ).toBe(true);
      }
    }
  });

  it("covers the first-cut families", () => {
    for (const family of [
      "change-over-time",
      "magnitude",
      "ranking",
      "correlation",
      "distribution",
      "part-to-whole",
      "deviation",
    ]) {
      expect(FAMILY_TYPES[family]?.length).toBeGreaterThan(0);
    }
  });
});
