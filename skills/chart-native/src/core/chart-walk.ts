// core/chart-walk.ts — WHICH GRAIN OF WALK each chart type's video can carry.
//
// WHY THIS EXISTS. One type — `bar` — could carry a journalist's walk, and 40 could not. Not
// because 40 engines were missing something, but because two capabilities had been treated as
// one: SHOWING the beat's sentence at the right moment, and REORDERING the subjects' entrance to
// the journalist's order. Only the first is needed for the words to reach a reader — the walk
// guard's only criterion — and the second is a bonus most components cannot give.
//
// Tying them shut 40 types out of a step the journalist never even saw refused: `narrativeKindsFor`
// returned one offer, one offer is not a question, so the kind was never asked and no storyboard
// was ever proposed. The shape of an absent capability that does not announce itself — the defect
// this whole line of work exists to close.
//
// SO THERE ARE TWO GRAINS, and both are honest:
//
//   · ANCHORED  — the sentence appears WHEN ITS SUBJECT ENTERS. Needs a per-subject entrance
//                 (`stagger`) whose index is the subject's own, plus a field naming the subjects.
//   · SEQUENCED — the sentences follow IN THE ORDER WRITTEN, over the animation as it is. Needs
//                 nothing from the component: a pie sweeps its slices, a sankey draws its links,
//                 and the words play across it. A stepped video, in the plainest sense — the step
//                 carries the argument and the clock turns the page.
//
// ★ THE GRAIN IS SAID TO THE JOURNALIST (`narrativeKindsFor`'s `why`). "Each subject enters as its
// sentence appears" and "your sentences follow one another over the animation" are not the same
// promise, and letting someone believe the first while getting the second is the only way this
// registry can lie.

/** The stagger parameters a component drives its per-subject entrance from. Stored as the numbers
 *  the source literally passes — `stagger(p, i, n, start, stepNumerator / n, span)` — so the drift
 *  test can read the component and compare, rather than trusting this file. */
export type Entrance = {
  start: number;
  /** the numerator of the `/ n` step, e.g. 0.5 in `0.5 / n` */
  stepNumerator: number;
  span: number;
};

export type ChartWalk = {
  /**
   * HOW a stepped video of this type stages its walk.
   *
   * · `accent` — THE SCROLLY, IN TIME. The chart stands complete and each step ACCENTS the subject
   *   its sentence is about, the clock turning the pages. Rémy, 2026-08-06, after seeing the first
   *   stepped bar video: "le stepped devrait avoir le même rendu qu'un scrolly, juste en format
   *   vidéo" — and he was right, because the scrolly is where this staging was settled
   *   (`ScrollyChart`: all bars visible, the active beat's bar accented). It also removes a defect
   *   that same run showed: a fixed accent left the closing sentence pointing at another subject.
   *   Needs a highlight the component honours.
   * · `entrance` — the subjects ENTER in the walk's order and the sentence rides the entrance.
   *   Where a type has a per-subject entrance but no accent to move. Second best, and named as
   *   such: a type joins `accent` the day it learns to highlight.
   * · `sequenced` — no subject a beat can address; the sentences follow the order written over
   *   whatever the animation already does.
   */
  grain: "accent" | "entrance" | "sequenced";
  /** The component file whose entrance this describes — read by the drift test. Anchored only. */
  component?: string;
  /** The Config field whose value each beat's `category` names. Anchored only. */
  anchorField?: string;
  entrance?: Entrance;
  /** The config prop this type accents a subject through, and what it takes. `index` is the
   *  post-sort row index (safe for `bar`: the mapper pins `sort: "none"` when beats are present);
   *  `label` is the subject's own name, which no sort can invalidate. Absent ⇒ grain is not
   *  `accent`. */
  accent?: { prop: string; by: "index" | "label" };
  /** Does the component PERMUTE its entrance into the walk's order? True for every anchored
   *  type since 2026-08-06: the first rendered proof of a non-bar walk played the sentences in
   *  the DATA's order — establish second, payoff first — because only `bar` permuted. A walk
   *  whose steps arrive out of order is not a walk. */
  reorders?: boolean;
  /** Why this type is where it is — measured, and sayable to a journalist. */
  why: string;
};

/** The one entrance every bar-family component passes: `stagger(p, i, n, 0.18, 0.5 / n, 0.35)`. */
const BAR_FAMILY: Entrance = { start: 0.18, stepNumerator: 0.5, span: 0.35 };
/** …and the wider-span variant the paired types use (`0.4` rather than `0.35`). */
const PAIRED_FAMILY: Entrance = { start: 0.18, stepNumerator: 0.5, span: 0.4 };

const SEQUENCED_CONTINUOUS =
  "it animates by one continuous motion — a sweep, a wipe, a draw — with no per-subject entrance " +
  "to sit a sentence on, so the sentences follow one another over it in the order written";
const SEQUENCED_BY_SERIES =
  "its entrance advances by SERIES rather than by subject, so no sentence can be pinned to a " +
  "named row; the sentences follow one another over the animation in the order written";
const SEQUENCED_UNNAMED =
  "its subjects are not named by a field a beat can address (bins, cells, nodes), so the " +
  "sentences follow one another over the animation in the order written";

const anchored = (
  component: string,
  anchorField: string,
  entrance: Entrance,
  extra?: Partial<ChartWalk>,
): ChartWalk => ({
  grain: "entrance",
  component,
  anchorField,
  entrance,
  reorders: true,
  why:
    "each subject enters at the moment of its own sentence, in the order you choose",
  ...extra,
});

const sequenced = (why: string): ChartWalk => ({ grain: "sequenced", why });

/**
 * EVERY native chart type, and the grain of walk its video carries.
 *
 * Covers the whole of NATIVE_TYPES — asserted by a test, so a 42nd type cannot be added without
 * someone deciding which grain it is. A missing entry is a decision nobody made, which is exactly
 * how `bar` came to be alone.
 */
export const CHART_WALKS: Readonly<Record<string, ChartWalk>> = {
  // --- ANCHORED: a per-subject entrance indexed by the subject's own row, and a field naming it.
  // ★ THE THREE THAT STAGE LIKE A SCROLLY — the chart stands complete and the accent walks.
  bar: anchored("BarChart", "catField", BAR_FAMILY, {
    grain: "accent",
    accent: { prop: "highlightIndex", by: "index" },
    why:
      "the chart stands complete and each step highlights the subject its sentence is about — " +
      "the reading of a scrolly, with the clock turning the pages",
  }),
  diverging: anchored("DivergingBarChart", "catField", BAR_FAMILY),
  lollipop: anchored("LollipopChart", "catField", BAR_FAMILY, {
    grain: "accent",
    accent: { prop: "highlightLabel", by: "label" },
    why:
      "the chart stands complete and each step highlights the subject its sentence is about — " +
      "the reading of a scrolly, with the clock turning the pages",
  }),
  "radial-bar": anchored("RadialBarChart", "categoryField", {
    start: 0.15,
    stepNumerator: 0.5,
    span: 0.5,
  }),
  pyramid: anchored("PopulationPyramidChart", "bandField", BAR_FAMILY),
  dumbbell: anchored("DumbbellChart", "labelField", PAIRED_FAMILY),
  slope: anchored("SlopeChart", "labelField", PAIRED_FAMILY, {
    grain: "accent",
    accent: { prop: "highlightLabel", by: "label" },
    why:
      "the chart stands complete and each step highlights the line its sentence is about — " +
      "the reading of a scrolly, with the clock turning the pages",
  }),

  // --- SEQUENCED by series: the entrance advances one SERIES at a time, so `stacked`'s bars all
  // grow together per series and no single category can own a moment.
  stacked: sequenced(SEQUENCED_BY_SERIES),
  grouped: sequenced(SEQUENCED_BY_SERIES),
  combo: sequenced(SEQUENCED_BY_SERIES),
  "diverging-stacked": sequenced(SEQUENCED_BY_SERIES),
  marimekko: sequenced(SEQUENCED_BY_SERIES),
  radar: sequenced(SEQUENCED_BY_SERIES),
  streamgraph: sequenced(SEQUENCED_BY_SERIES),

  // --- SEQUENCED, unnamed subjects: bins, cells, nodes, ranks — nothing a beat's anchor addresses.
  histogram: sequenced(SEQUENCED_UNNAMED),
  boxplot: sequenced(SEQUENCED_UNNAMED),
  beeswarm: sequenced(SEQUENCED_UNNAMED),
  bullet: sequenced(SEQUENCED_UNNAMED),
  candlestick: sequenced(SEQUENCED_UNNAMED),
  chord: sequenced(SEQUENCED_UNNAMED),
  gantt: sequenced(SEQUENCED_UNNAMED),
  treemap: sequenced(SEQUENCED_UNNAMED),
  waffle: sequenced(SEQUENCED_UNNAMED),
  waterfall: sequenced(SEQUENCED_UNNAMED),
  arc: sequenced(SEQUENCED_UNNAMED),
  heatmap: sequenced(SEQUENCED_UNNAMED),
  calendar: sequenced(SEQUENCED_UNNAMED),
  sankey: sequenced(SEQUENCED_UNNAMED),
  sunburst: sequenced(SEQUENCED_UNNAMED),
  parallel: sequenced(SEQUENCED_UNNAMED),
  lorenz: sequenced(SEQUENCED_UNNAMED),
  violin: sequenced(SEQUENCED_UNNAMED),
  pictogram: sequenced(SEQUENCED_UNNAMED),
  "dot-strip": sequenced(SEQUENCED_UNNAMED),
  bump: sequenced(SEQUENCED_UNNAMED),

  // --- SEQUENCED, continuous: one scalar drives the whole picture.
  line: sequenced(SEQUENCED_CONTINUOUS),
  "stacked-area": sequenced(SEQUENCED_CONTINUOUS),
  fan: sequenced(SEQUENCED_CONTINUOUS),
  pie: sequenced(SEQUENCED_CONTINUOUS),
  "connected-scatter": sequenced(SEQUENCED_CONTINUOUS),
  // Scatter DOES stagger by x-rank, but its points are a cloud its own engine refuses to let a
  // journalist author a walk over (chart-story.ts) — sequenced is the honest answer, not anchored.
  scatter: sequenced(SEQUENCED_CONTINUOUS),
};

/** The grain this type's video carries. Unknown type ⇒ undefined, and every caller treats that as
 *  a decision nobody made rather than as "sequenced" — a silent default here is how a new type
 *  would quietly ship without its walk. */
export function chartWalk(nativeType: string): ChartWalk | undefined {
  return CHART_WALKS[nativeType];
}

/** The entrance schedule of an anchored type, as `captionAt` wants it. */
export function entranceStep(entrance: Entrance, count: number): number {
  return entrance.stepNumerator / Math.max(1, count);
}

/** The shape a component drives `stagger` from. */
export type EntranceSchedule = {
  start: number;
  step: (n: number) => number;
  span: number;
};

/**
 * ★ THE ONE CLOCK, handed to the component itself.
 *
 * The components used to carry their stagger numbers as literals, and this registry would then
 * have been a COPY of them — drifting the day someone retuned a component, with a caption left
 * sitting over the wrong subject and nothing to say so. `BarChart` already read its schedule from
 * a shared constant for exactly that reason; every anchored type now reads it from here, so the
 * caption and the entrance cannot come apart. A drift test pins that they still do.
 *
 * Throws on a type that is not anchored: asking for the entrance of a sequenced type is a
 * programming error, and answering it with a plausible default would invent a schedule nothing
 * renders.
 */
export function entranceOf(nativeType: string): EntranceSchedule {
  const w = CHART_WALKS[nativeType];
  if (!w?.entrance)
    throw new Error(
      `no per-subject entrance for chart type "${nativeType}" — it is ${
        w ? `${w.grain}, not anchored` : "not a native chart type"
      }`,
    );
  const e = w.entrance;
  return {
    start: e.start,
    step: (n: number) => entranceStep(e, n),
    span: e.span,
  };
}
