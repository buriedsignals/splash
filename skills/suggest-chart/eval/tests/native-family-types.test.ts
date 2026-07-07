import { describe, it, expect } from "bun:test";
import { NATIVE_TYPES } from "../../../chart-native/src/native-types";
import { NATIVE_FAMILY_TYPES } from "../native-family-types";

const LEGACY = new Set(["line", "bar", "scatter", "pie"]); // KB/family backfill (Plan 2)

describe("NATIVE_FAMILY_TYPES completeness (suggest-chart half)", () => {
  const familyIds = new Set(Object.values(NATIVE_FAMILY_TYPES).flat());
  it("only lists non-deferred native types the producer can actually render", () => {
    for (const id of familyIds) {
      const e = NATIVE_TYPES.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e?.deferred).toBeUndefined();
    }
  });
  it("makes every mapped (non-deferred, non-legacy) type pickable by intent", () => {
    for (const e of NATIVE_TYPES) {
      if (e.deferred || LEGACY.has(e.id)) continue;
      expect(familyIds.has(e.id)).toBe(true);
    }
  });
});
