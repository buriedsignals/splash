// Editorial intent family → the chart-native type ids that legitimately serve it.
// The native mirror of family-types.ts (which is DW-only). Every id here MUST be a
// non-deferred NATIVE_TYPES entry — asserted by tests/native-family-types.test.ts
// (created in Task 10). No tiers.
export const NATIVE_FAMILY_TYPES: Record<string, string[]> = {
  // `combo` sits here rather than under `magnitude`: FT's Visual Vocabulary files the
  // line+column form under change-over-time, and the form only earns its second axis when a
  // quantity and a rate move TOGETHER over a shared time axis. A magnitude comparison at one
  // moment needs no second scale — that is a bar.
  // `gantt` is change-over-time and not magnitude, which is the mistake the form invites: its
  // bar length is DURATION on a real time axis, never a quantity. A reader trained on bar charts
  // reads length as magnitude, which is why the type refuses to render without a captioned time
  // axis — and why filing it under `magnitude` would route it at exactly the claims it lies about.
  // `candlestick` is change-over-time: its x axis is time and its claim is how each period
  // MOVED. It is the most finance-coded form the engine ships — reserve it for when the
  // within-period range and the open→close direction are both the point; for "it went up",
  // a line is clearer.
  "change-over-time": [
    "line",
    "stacked-area",
    "slope",
    "fan",
    "combo",
    "gantt",
    "candlestick",
  ],
  correlation: ["scatter", "connected-scatter"],
  "part-to-whole": ["pie", "stacked", "waffle", "treemap"],
  // `pictogram` was un-deferred on a sibling branch without being listed here, which left the
  // completeness test RED on main — a type the gate accepts that no intent can route to. Its own
  // KB sheet declares `intent: [magnitude, ranking]`, so it belongs in both, and it is a
  // magnitude a reader VERIFIES by counting rather than one they trust a length for.
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
  ranking: ["lollipop", "bump", "pictogram"],
  deviation: ["diverging", "waterfall", "diverging-stacked"],
  // The FLOW family — the ninth FT intent, and the first native types to serve it. All three
  // read one `source,target,value` link list and differ in what they claim about it: `sankey`
  // for a quantity moving THROUGH STAGES, `chord` for exchange WITHIN one set, `arc` for
  // relationships along one ordered axis. Their sheets say when each is wrong.
  flow: ["sankey", "chord", "arc"],
};
