// Editorial intent family → the chart-native type ids that legitimately serve it.
// The native mirror of family-types.ts (which is DW-only). Every id here MUST be a
// non-deferred NATIVE_TYPES entry — asserted by tests/native-family-types.test.ts
// (created in Task 10). No tiers.
export const NATIVE_FAMILY_TYPES: Record<string, string[]> = {
  // `combo` sits here rather than under `magnitude`: FT's Visual Vocabulary files the
  // line+column form under change-over-time, and the form only earns its second axis when a
  // quantity and a rate move TOGETHER over a shared time axis. A magnitude comparison at one
  // moment needs no second scale — that is a bar.
  "change-over-time": ["line", "stacked-area", "slope", "fan", "combo"],
  correlation: ["scatter", "connected-scatter"],
  "part-to-whole": ["pie", "stacked", "waffle", "treemap"],
  magnitude: ["bar", "grouped", "radial-bar", "dumbbell", "bullet", "heatmap"],
  distribution: [
    "histogram",
    "beeswarm",
    "dot-strip",
    "boxplot",
    "violin",
    "pyramid",
  ],
  ranking: ["lollipop", "bump"],
  deviation: ["diverging", "waterfall", "diverging-stacked"],
};
