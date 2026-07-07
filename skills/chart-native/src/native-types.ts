// The canonical native-chart-type registry: the SINGLE source of truth for which
// types the engine ships, replacing the un-exported literals previously duplicated
// in scripts/produce.mjs (PREFIX) and src/mount.tsx (the two component registries).
// `id` is the RENDER KEY (what produce.mjs looks up, what a NativeSpec.nativeType
// carries) — not a display name. `shape` documents the CSV shape a mapper expects;
// `family` = A (article-realistic, tidy-CSV) vs B (structural/specialist, deferred).
// `deferred` (a reason) marks a type NOT expected to be reachable+guarded yet; its
// absence means the type must satisfy the full contract (see tests/completeness.test.ts).

export type NativeShape =
  "single" | "wide" | "paired" | "distribution" | "structural";

export interface NativeTypeEntry {
  id: string;
  family: "A" | "B";
  shape: NativeShape;
  /** reason a type is not yet expected mapped; absent ⇔ must meet the full contract */
  deferred?: string;
}

// The four types reachable today whose KB ref + native-family entry are a tracked
// backfill (Plan 2), NOT a silent gap. They ARE reachable and conformance-guarded
// (the hard invariant still applies to them); they are only exempt from the
// KB + family predicates of the full contract. This list must SHRINK, never grow.
export const LEGACY_KB_FAMILY_BACKFILL: readonly string[] = [
  "line",
  "bar",
  "scatter",
  "pie",
];

const A_PENDING = (shape: NativeShape) =>
  `family-A: reachable+guarded pending its shape batch (${shape})`;

export const NATIVE_TYPES: readonly NativeTypeEntry[] = [
  // --- reachable today (Plan 1 keeps/loads them into the MAPPERS table) ---
  { id: "line", family: "A", shape: "single" },
  { id: "bar", family: "A", shape: "single" },
  { id: "scatter", family: "A", shape: "paired" },
  { id: "pie", family: "A", shape: "single" },
  // --- the Plan 1 witness (flipped to mapped in Task 10) ---
  { id: "grouped", family: "A", shape: "wide" },
  // --- Native Batch 2 wide (flipped to mapped) ---
  { id: "stacked", family: "A", shape: "wide" },
  { id: "stacked-area", family: "A", shape: "wide" },
  // --- Family A, deferred until their shape batch ---
  { id: "slope", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "dumbbell", family: "A", shape: "paired" },
  { id: "histogram", family: "A", shape: "distribution" },
  { id: "diverging", family: "A", shape: "single" },
  { id: "waterfall", family: "A", shape: "single" },
  { id: "lollipop", family: "A", shape: "single" },
  { id: "pyramid", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "bullet", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "connected-scatter", family: "A", shape: "paired" },
  {
    id: "boxplot",
    family: "A",
    shape: "distribution",
    deferred: A_PENDING("distribution"),
  },
  { id: "bump", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "beeswarm", family: "A", shape: "distribution" },
  {
    id: "treemap",
    family: "A",
    shape: "single",
    deferred: A_PENDING("single"),
  },
  {
    id: "diverging-stacked",
    family: "A",
    shape: "wide",
    deferred: A_PENDING("wide"),
  },
  { id: "waffle", family: "A", shape: "single" },
  { id: "fan", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "dot-strip", family: "A", shape: "single" },
  {
    id: "violin",
    family: "A",
    shape: "distribution",
    deferred: A_PENDING("distribution"),
  },
  { id: "radial-bar", family: "A", shape: "single" },
  // --- Family B, deferred by design (structural/specialist data an article rarely yields) ---
  {
    id: "heatmap",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs an x×y×value matrix",
  },
  {
    id: "marimekko",
    family: "B",
    shape: "structural",
    deferred: "family-B: 2D width×height encoding",
  },
  {
    id: "radar",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  {
    id: "sankey",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs nodes+links",
  },
  {
    id: "streamgraph",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  {
    id: "gantt",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs start/end intervals",
  },
  {
    id: "calendar",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a dense date grid",
  },
  {
    id: "lorenz",
    family: "B",
    shape: "distribution",
    deferred: "family-B: specialist inequality curve",
  },
  {
    id: "candlestick",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs OHLC",
  },
  {
    id: "chord",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a flow matrix",
  },
  {
    id: "sunburst",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a hierarchy",
  },
  {
    id: "parallel",
    family: "B",
    shape: "wide",
    deferred: "family-B: rare in a small newsroom",
  },
  {
    id: "arc",
    family: "B",
    shape: "structural",
    deferred: "family-B: needs a hierarchy/edges",
  },
  {
    id: "combo",
    family: "B",
    shape: "wide",
    deferred: "family-B: per-series encoding choice",
  },
  {
    id: "pictogram",
    family: "B",
    shape: "single",
    deferred: "family-B: stylistic variant of waffle",
  },
];

// type → Remotion composition prefix (XReveal/XSquare/XPortrait). Several keys don't
// PascalCase cleanly (pyramid → PopulationPyramid, grouped → GroupedBar). Consumed by
// scripts/produce.mjs; asserted equal to NATIVE_TYPES ids by tests/native-types.test.ts.
export const REMOTION_PREFIX: Record<string, string> = {
  line: "Line",
  bar: "Bar",
  scatter: "Scatter",
  pie: "Pie",
  stacked: "StackedBar",
  slope: "Slope",
  grouped: "GroupedBar",
  dumbbell: "Dumbbell",
  "stacked-area": "StackedArea",
  heatmap: "Heatmap",
  histogram: "Histogram",
  diverging: "DivergingBar",
  waterfall: "Waterfall",
  lollipop: "Lollipop",
  pyramid: "Pyramid",
  bullet: "Bullet",
  "connected-scatter": "ConnectedScatter",
  marimekko: "Marimekko",
  radar: "Radar",
  boxplot: "Boxplot",
  bump: "Bump",
  beeswarm: "Beeswarm",
  treemap: "Treemap",
  "diverging-stacked": "DivergingStacked",
  sankey: "Sankey",
  streamgraph: "Streamgraph",
  gantt: "Gantt",
  fan: "Fan",
  calendar: "Calendar",
  waffle: "Waffle",
  lorenz: "Lorenz",
  candlestick: "Candlestick",
  chord: "Chord",
  sunburst: "Sunburst",
  parallel: "Parallel",
  "dot-strip": "DotStrip",
  violin: "Violin",
  arc: "Arc",
  "radial-bar": "RadialBar",
  combo: "Combo",
  pictogram: "Pictogram",
};
