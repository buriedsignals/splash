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
  // `pictogram` was un-deferred on 2026-08-08 without an entry here, which left it mapped and
  // guarded but UNPICKABLE by intent — score.ts filters candidates through this table, so the
  // eval would have marked every pictogram proposal an off-family miss. Caught by this file's
  // own completeness test the next time the table was edited; fixed here rather than left for
  // its own branch, since it is one line and the alternative is shipping a red test.
  magnitude: [
    "bar",
    "grouped",
    "radial-bar",
    "dumbbell",
    "bullet",
    "heatmap",
    "pictogram",
  ],
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
  // The FLOW family — the ninth FT intent, and the first native types to serve it. All three
  // read one `source,target,value` link list and differ in what they claim about it: `sankey`
  // for a quantity moving THROUGH STAGES, `chord` for exchange WITHIN one set, `arc` for
  // relationships along one ordered axis. Their sheets say when each is wrong.
  flow: ["sankey", "chord", "arc"],
};
