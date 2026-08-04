// chart-native's producer manifest — self-registers with the shared registry on import
// (skills/splash/src/register-producers.ts imports this for its side effect). The
// scriptPath / skillDir / threadsChannel values are exactly what adapters.ts's SCRIPT /
// SKILL_DIR / CHANNEL_THREADED_PRODUCERS used to hard-code, now colocated with the engine.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import type { GestureVocabulary } from "../../../lib/core/gestures";
import { nativeSpecErrors } from "./spec-to-config";
import { NATIVE_TYPES } from "./native-types";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// What each chart type makes move — measured, not aspired to. Charts declare DATA
// gestures only (grow/draw/stagger/highlight) — no camera concept exists anywhere in
// skills/chart-native/src (docs/splash/gesture-inventory-2026-08-03.md §4).
//
// Every type below declares `reveal`. Three types (line, bar, scatter) ALSO declare
// `scrolly` — corrected here: a prior version of this comment claimed chart-native "has
// no beat structure" on the strength of "an exhaustive `arcBeats` grep — 0 hits", but
// `arcBeats` is map-native's field name, not chart-native's. chart-native's own beat
// structure lives in chart-story.ts, in plain sight: `ChartBeat` (:30), `mapStepToBeat`
// (:60), `AUTHORABLE_SCROLLY_TYPES = ["line","bar"]` (:128, the two types an explicit
// journalist `beats` override applies to — scatter's walk is always auto-derived, never
// authored, but it still walks), `deriveChartStory` (:288+, builds title→establish→
// reveal×N→takeaway beats for all three types). The renderer that consumes this beat
// list is `skills/scrolly`'s own ScrollyChart.tsx (:92-138) — which imports LineChart/
// BarChart/ScatterChart directly from this package and renders line/bar/scatter
// scrollies today.
//
// Where that vocabulary is DECLARED was a circular buck-pass: this file used to say "see
// scrolly's own manifest below" while scrolly/src/manifest.ts said "declared on chart-
// native's manifest (their `scrolly` narrative kind), not here" — neither true. scrolly's
// own producer registers ZERO `types` (documented there as deliberate: it is the shared
// MECHANISM, not a type owner), so it structurally CANNOT declare a per-type gesture
// vocabulary — the `t.gestures` shape is keyed by `p.types`, and scrolly's `p.types` is
// always empty. chart-native is the only manifest that owns `line`/`bar`/`scatter` as
// types, so chart-native is the only place this vocabulary CAN live. Declared below, per
// type, from ScrollyChart.tsx's own code (see LINE_GESTURES / BAR_LIKE_SCROLLY comments).
//
// `highlight` (hover/keyboard-focus, present in the interactive rendering of the
// `reveal` kind — inventory §4.1) is confirmed on every one of the 41 base components by
// grep (`onMouseEnter`/`onFocus` present in each), extending inventory §4.1's own
// citation (LineChart.tsx:131,173,438-441) — a supplementary measurement made for this
// task, not claimed from a header. Recorded in task-4-report.md.
//
// ★ SUPPLEMENTARY FINDING (this task, not the inventory): gestures.ts's own doc comment
// on `stagger` names "two independent, real (non-dead-code) implementations"
// (SankeyChart.tsx, DotDensityStory.tsx). Reading the 41 chart-native components for
// this task found a THIRD, much larger source: the shared `stagger(p, i, count, start,
// step, span)` primitive (core/math.ts:69-79, own docstring: "lets the motion build
// stagger gridlines/bars/labels deterministically") is imported and called by 27 of the
// 41 components, each gating one subject's (bar/row/column/series/node) own eased
// entrance window by its index — mechanically the same shape as SankeyChart's own
// hand-written nodeAppear/linkAppear formula (colIndex*0.12 offset), which is why it
// grounds the same gesture name. Two further components (HeatmapChart.tsx,
// CalendarChart.tsx) implement an equivalent per-position gate inline, without the
// shared helper. This does not contradict gestures.ts — `stagger` was never defined as
// "only these two files," only as "two REAL ones, unlike the disproven ChoroplethReveal
// header claim" — but it is recorded here because gestures.ts's own comment, read on its
// own, would undercount by 27+ call sites, which is exactly the kind of drift this
// sub-project exists to prevent from going unrecorded.
//
// Per-type citations below name the file:line actually read for THIS task (not the
// inventory's own 7-header sample, which this task's brief explicitly permits going
// beyond when the difference can be grounded in a few minutes of reading — see
// task-4-report.md for the full per-type ledger).
//
// NOTE for sub-project ④ (which decides reachability/deferral, not this one): 14 of
// NATIVE_TYPES' 41 entries carry `deferred` (native-types.ts) and every one of them still
// gets a FULL gesture vocabulary below, same as a reachable type. That is deliberate, not
// an oversight — `gestures` describes what the COMPONENT does when it renders (the same
// "capability, not reachability" distinction this manifest already draws for map-native's
// unreachable video-Scrolly family), and a deferred chart-native type's .tsx component
// still exists and still renders exactly as declared; only its produce-path wiring is
// deferred. Left as-is, called out explicitly here so ④ inherits the fact instead of
// re-discovering it.

// Bars/stems grow from the zero baseline (gestures.ts's own "grow" citation:
// "bar/stem height from baseline (BarChart.tsx:1-3)"), each one's own entrance offset
// by index via the shared `stagger()` primitive — a real per-item timing gate, not one
// shared scalar.
const BAR_LIKE: GestureVocabulary = {
  reveal: ["grow", "stagger", "highlight"],
};

// A single continuous wipe/clip reveals the whole shape left-to-right (or by angle) —
// ONE shared progress for every element, no per-item offset found (grep: no `stagger(`
// call in the file). Matches gestures.ts's own "draw" citation for the area-wipe case
// (StackedAreaChart.tsx:1-4).
const WIPE_LIKE: GestureVocabulary = { reveal: ["draw", "highlight"] };

// LineChart.tsx has exactly two `stagger(` calls in the whole file (:304, :307) — both
// inside `layout.yTicks.map((t, i) => …)`, where `nY` is the Y-AXIS TICK COUNT. That is
// gridline furniture (the axis's own gridlines, staggered top→bottom per :300's own
// comment — "gridlines: horizontal wipe from the left, staggered bottom→top"), not a
// second data series: a prior reading of this file claimed "a second, distinct series
// gets its own stagger(...) entrance offset", but LineChart renders exactly one series
// (one `revealLine`/`revealHead` call at :262-263, one `<path className="series-line">`
// — singular, never mapped over a series list). Gridline furniture is not a data-mark
// gesture — declaring `stagger` for `line` on the strength of it would promise a
// per-series entrance the component cannot render for a chart type that has no second
// series to begin with. `line` declares `draw` (the one data mark) and `highlight`
// (hover/keyboard-focus) only.
const LINE_GESTURES: GestureVocabulary = {
  // revealLine/revealHead draw the single series by cumulative path length — `draw`,
  // gestures.ts's own citation. Hover state :131,173,438-441 (inventory §4.1's own
  // citation) — `highlight`.
  reveal: ["draw", "highlight"],
  // ScrollyChart.tsx:92-109: LineChart is driven by `revealTo` (a continuous scroll-
  // mapped fraction, `scrollToLineProgress`), the SAME single-scalar cumulative-length
  // draw as `reveal` above — `draw`. `interactive` is never passed (defaults false,
  // LineChart.tsx:83), so the hover/keyboard-focus machinery that grounds `reveal`'s
  // `highlight` is inert in the scrolly embed — no `highlight` here.
  scrolly: ["draw"],
};

// BarChart.tsx/ScatterChart.tsx rendered by ScrollyChart.tsx (:110-141) are both called
// with `progress={1}` — a CONSTANT, not scroll-driven — so the grow/stagger entrance
// each type plays under `reveal` never runs in the scrolly embed; every mark is already
// fully drawn from the first frame. The only thing that changes per scroll step is which
// one mark is accented: BarChart's `highlightIndex` mutes every OTHER bar to `C.muted`
// while the highlighted bar keeps the constant primary colour (`barColor`, BarChart.tsx:
// 228-241 — siblings dim, no ramp on the emphasised subject: `highlight`); ScatterChart's
// `annotate` attaches a text label to one story point, with no dim and no ramp on any
// point's own rendering. Both match gestures.ts's own citation for this exact pattern
// ("ScrollyChart's bar/scatter 'highlight walk' … one bar/point accented per step,
// ScrollyChart.tsx:110-138" — the vocabulary's own grounding for `highlight`).
// Only `bar` and `scatter` are ever rendered by ScrollyChart.tsx (CHART_SCROLLY_TYPES =
// ["line","bar","scatter"], scrolly-types.ts) — this key is added to those two types
// only, never to the other BAR_LIKE-sharing types (grouped/stacked/dumbbell/etc.), which
// ScrollyChart never touches and so have no `scrolly` capability to declare.
const BAR_LIKE_SCROLLY: GestureVocabulary = { scrolly: ["highlight"] };

// Exported (not just used below) so a drift test can check every key here resolves to a
// real NATIVE_TYPES id — a typo'd key here (e.g. "pictogrma") silently drops the real
// type's gestures and leaves the typo'd entry unreachable through the registry (the
// `.map()` below only ever looks up `CHART_GESTURES[t.id]` for a REAL id; a stray key
// like "pictogrma" is simply never read, and its own product never appears in
// `p.types` for anything to notice) — see gesture-declaration-drift.test.ts.
export const CHART_GESTURES: Record<string, GestureVocabulary> = {
  line: LINE_GESTURES,
  // BarChart.tsx:283 `stagger(p, i, n, 0.18, 0.5/n, 0.35)` per bar.
  bar: { ...BAR_LIKE, ...BAR_LIKE_SCROLLY },
  // ScatterChart.tsx:191 `stagger(p, xRank[i], n, ...)` per point; header: "dots POP IN
  // in place (scale 0→1, slight bloom)".
  scatter: { reveal: ["grow", "stagger", "highlight"], ...BAR_LIKE_SCROLLY },
  // pie-geometry.ts:139-144 `sliceProgress` — ONE continuous sweeping angle (`master`)
  // drives every slice's own [startAngle,endAngle] window; no per-slice easing/offset.
  // Matches gestures.ts's own "draw" citation ("an angle by sweep, PieChart.tsx:1-4").
  pie: { reveal: ["draw", "highlight"] },
  // GroupedBarChart.tsx:213 `stagger(p, ci, nCols, ...)` per column group.
  grouped: BAR_LIKE,
  // StackedBarChart.tsx:227 `stagger(p, i, n, ...)` per column.
  stacked: BAR_LIKE,
  // StackedAreaChart.tsx:211-213: `wipe = easeInOutCubic(p)`, one clip rect for the
  // whole stack — no per-band offset.
  "stacked-area": WIPE_LIKE,
  // SlopeChart.tsx:288 `stagger(p, i, n, ...)` per line; header: "extends each line
  // left→right" (a draw, not a size ramp).
  slope: { reveal: ["draw", "stagger", "highlight"] },
  // DumbbellChart.tsx:236 `stagger(p, i, n, ...)` per row; header: "opens each gap".
  dumbbell: BAR_LIKE,
  // HistogramChart.tsx:186 `stagger(p, i, n, ...)` per bin.
  histogram: BAR_LIKE,
  // DivergingBarChart.tsx:208 `stagger(p, i, n, ...)` per bar.
  diverging: BAR_LIKE,
  // WaterfallChart.tsx:250 `stagger(p, i, n, ...)` per bar; header: "builds the bridge
  // step by step".
  waterfall: BAR_LIKE,
  // LollipopChart.tsx:212 `stagger(p, i, n, ...)` per row.
  lollipop: BAR_LIKE,
  // PopulationPyramidChart.tsx:196 `stagger(p, i, n, ...)` per band.
  pyramid: BAR_LIKE,
  // BulletChart.tsx:197 `stagger(p, i, n, ...)` per row.
  bullet: BAR_LIKE,
  // ConnectedScatterChart.tsx:189-200: one continuous cumulative-length path draw
  // (`draw`/`head`, single scalar). `dotOp` (:197-200) gates each dot's own opacity on
  // ITS OWN cumulative position along the path (`pt.cum / totalLen`) — a real per-point
  // timing offset, the same shape as the shared `stagger()` helper even though this file
  // never calls it (it is hand-written inline, same class as HeatmapChart/CalendarChart
  // per this manifest's own supplementary finding above). A prior reading took "no
  // `stagger(` call in the file" literally and concluded no stagger exists — the per-dot
  // gate is real, it is just not implemented via the shared helper.
  "connected-scatter": { reveal: ["draw", "stagger", "highlight"] },
  // BoxplotChart.tsx:195 `stagger(p, i, n, ...)` per row; header: "grows each box FROM
  // THE MEDIAN outward".
  boxplot: BAR_LIKE,
  // BumpChart.tsx:271 `drawBumpPath(ln.points, drawProg)` draws each line by one shared
  // scalar (`draw`). :296-301: each period's dot has its own opacity gate
  // `clamp01((drawProg - frac + 0.08) / 0.06)` where `frac` is the dot's own position
  // along the line — the file's own comment: "each pops just as the sweep reaches it" —
  // a real per-dot timing offset, same class as ConnectedScatterChart's `dotOp` above.
  // Same correction: "no `stagger(` call found" is true of the helper, not of the
  // pattern.
  bump: { reveal: ["draw", "stagger", "highlight"] },
  // BeeswarmChart.tsx:273,317 `stagger(p, nd.order, n, ...)` per dot; header: "scales
  // each dot's radius from 0".
  beeswarm: BAR_LIKE,
  // TreemapChart.tsx:208 `stagger(p, order, n, ...)` per cell, largest first.
  treemap: BAR_LIKE,
  // DivergingStackedChart.tsx:244 `stagger(p, i, n, ...)` per item.
  "diverging-stacked": BAR_LIKE,
  // WaffleChart.tsx:225 `stagger(p, c.index, n, ...)` per cell.
  waffle: BAR_LIKE,
  // FanChart.tsx:198-199: one clip rect (`clipW = innerWidth * reveal`) for the whole
  // fan — no per-band offset.
  fan: WIPE_LIKE,
  // DotStripChart.tsx:244: one clip wipe ("dot-strip-wipe") for the whole strip — no
  // per-dot offset.
  "dot-strip": WIPE_LIKE,
  // ViolinChart.tsx:217 `inflate = easeInOutCubic(p)` — ONE shared scalar drives every
  // violin's half-width; no `stagger(` call in the file.
  violin: { reveal: ["grow", "highlight"] },
  // RadialBarChart.tsx:240 `stagger(p, b.index, n, ...)` per bar; header: "grows the
  // bars... from a baseline circle" (not a sweep, despite the family being "angular" —
  // this type's own header was read directly, not inferred from the family).
  "radial-bar": BAR_LIKE,
  // HeatmapChart.tsx:248-250: `wave = (rowIndex+colIndex)/maxWave` gates each cell's own
  // eased `a` (opacity AND scale) — a real per-cell positional offset, inline rather
  // than via the shared helper, but the same shape. Confirms the header's "diagonal
  // wave" claim (contrast ChoroplethReveal.tsx:3's disproven "stagger by bin index" —
  // here the code was read and the per-cell gate is really there).
  heatmap: { reveal: ["grow", "stagger", "highlight"] },
  // MarimekkoChart.tsx:213 `stagger(p, ci, n, ...)` per column.
  marimekko: BAR_LIKE,
  // RadarChart.tsx:210 `stagger(p, si, nS, ...)` per series; header: "grows each polygon
  // FROM THE CENTRE outward".
  radar: BAR_LIKE,
  // SankeyChart.tsx:254-255 `nodeAppear`, :258-260 `linkAppear` — gestures.ts's own
  // cited "stagger" example (per-column offset). Ribbon `strokeWidth = lk.width * ap`
  // widens with the staggered value (:288) — a real grow, not just a fade.
  sankey: { reveal: ["grow", "stagger", "highlight"] },
  // StreamgraphChart.tsx:235 `stagger(p, bi, n, ...)` per band; header: "grows each band
  // from its own centre-line" (not a wipe, despite family grouping with StackedArea —
  // read directly).
  streamgraph: BAR_LIKE,
  // GanttChart.tsx:198 `stagger(p, i, n, ...)` per row; header: "grows each bar from its
  // start, staggered by row".
  gantt: BAR_LIKE,
  // CalendarChart.tsx:173 `wipeCol`, :229 `ap = clamp01((wipeCol - c.col)*1.2)` — cells
  // sharing a column (week) enter together, gated by column, matching gestures.ts's own
  // "per-column... offset/gate" language for `stagger`. Opacity only, no scale change —
  // no `grow`.
  calendar: { reveal: ["stagger", "highlight"] },
  // LorenzChart.tsx:196-197: one clip wipe for both curves — no per-curve offset.
  lorenz: WIPE_LIKE,
  // CandlestickChart.tsx:186 `stagger(p, i, n, ...)` per period; header: "draws the
  // candles left→right (wick draws, body grows from the open)" — both a draw (wick) and
  // a grow (body) inside each period's staggered window.
  candlestick: { reveal: ["draw", "grow", "stagger", "highlight"] },
  // ChordChart.tsx:213 `stagger(p, r.index, nR, ...)` per ribbon; header: "blooms the
  // figure from the centre [arcs, grow] and fades the ribbons in [per-ribbon, staggered
  // — not one shared scalar, so not `appear`]".
  chord: { reveal: ["grow", "stagger", "highlight"] },
  // SunburstChart.tsx:223-228 `sweep(depth)` — a per-depth-ring eased window
  // (`start = (depth-1)/maxDepth * 0.45`), the same per-position-offset shape as
  // `stagger()` though hand-written; header: "sweeps the rings open" (draw).
  sunburst: { reveal: ["draw", "stagger", "highlight"] },
  // ParallelChart.tsx:212-213: one clip wipe for all polylines — no per-line offset.
  parallel: WIPE_LIKE,
  // ArcChart.tsx:268-296: arcs share ONE `reveal` value (`arcPath(l, baseY, reveal)`,
  // no per-arc index term) — a draw. Nodes get their own `stagger(p, i, nodes.length,
  // ...)` at :309-316 — a distinct, per-node entrance layered on top.
  arc: { reveal: ["draw", "stagger", "highlight"] },
  // ComboChart.tsx:290 `stagger(p, c.index, n, ...)` per column (grow); header: "grows
  // the columns and wipes the line in left→right" (the line is a separate, single-scalar
  // draw, not staggered).
  combo: { reveal: ["grow", "draw", "stagger", "highlight"] },
  // PictogramChart.tsx:265,280,336 `op = clamp01((reveal*maxCols - c)/0.7)` — each icon
  // column gets its own linear entrance window (not eased, but still per-position, not
  // one shared scalar). Icons are fixed-size (header: "every icon is the SAME size") —
  // opacity only, no `grow`.
  pictogram: { reveal: ["stagger", "highlight"] },
};

registerProducer({
  name: "chart-native",
  // The single-format CLI vocabulary chart-native's produce-from-spec.mjs accepts
  // (scrolly is owned by the scrolly engine and fails hard here — see adapters.ts header).
  formats: ["static", "interactive", "video"],
  types: NATIVE_TYPES.map((t) => ({
    id: t.id,
    ...(t.deferred ? { deferred: t.deferred } : {}),
    ...(CHART_GESTURES[t.id] ? { gestures: CHART_GESTURES[t.id] } : {}),
  })),
  validate: nativeSpecErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce-from-spec.mjs"),
    skillDir,
    // A native chart renders at the channel's size/aspect (Slice 2): SPLASH_CHANNEL is threaded.
    threadsChannel: true,
  },
});
