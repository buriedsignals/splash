// Editorial intent family → the chart-native type ids that legitimately serve it.
// The native mirror of family-types.ts (which is DW-only). Every id here MUST be a
// non-deferred NATIVE_TYPES entry — asserted by tests/native-family-types.test.ts
// (created in Task 10). No tiers.
export const NATIVE_FAMILY_TYPES: Record<string, string[]> = {
  "change-over-time": ["line"],
  correlation: ["scatter"],
  "part-to-whole": ["pie"],
  magnitude: ["bar", "grouped"],
  distribution: ["histogram"],
  ranking: ["lollipop"],
};
