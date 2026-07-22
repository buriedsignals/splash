// story-warrant.ts — a PURE, DESIGN-HEURISTIC judgement of whether a dataset carries a
// narrative arc worth a scrolly/video, or is better served by a static annotated chart.
//
// ★ NOT credited literature. Grounding (2026-07-21) found NO citable source stating
// "these data shapes don't warrant a narrative arc". This is Splash's own heuristic,
// reasonably informed by (but NOT claiming as its rule): Segel & Heer (2010) author↔reader
// axis, McKenna et al. (2017) "role of visualization" flow-factor, Kosara & Mackinlay
// (2013) presentation-vs-analysis. It NEVER hard-refuses production — it is a PROPOSITION
// signal the suggester uses to propose static-vs-scrolly; the journalist can veto to a scrolly.
//
// Thresholds are tuning knobs (each = one number), calibrated on the test fixtures.

const LINE_FLAT_MAX_CV = 0.05; // line: coefficient of variation below this ⇒ essentially
// constant/noise, NO arc — checked FIRST so a tiny data range can't make noise look like a
// big *relative* swing (the turn test below is range-relative and would false-fire otherwise).
const TREND_MIN_MONOTONE_FRACTION = 0.7; // line: ≥70% of steps share the net direction ⇒ trend
const TURN_MIN_RELATIVE_SWING = 0.4; // line: a peak/valley whose swing ≥40% of the range ⇒ turn
const SPREAD_MIN_LEADER_RATIO = 1.5; // bar: leader ≥1.5× the 2nd ⇒ detached leader (spread)
const SPREAD_MIN_CV = 0.25; // bar: coefficient of variation ≥0.25 ⇒ real spread
const SCATTER_MIN_ABS_R = 0.5; // scatter: |Pearson r| ≥0.5 ⇒ a correlation story

export interface StoryArcInput {
  type: "line" | "bar" | "scatter";
  values: number[]; // line/bar: the series; scatter: the x values
  ys?: number[]; // scatter only: the y values
}
export interface StoryArcVerdict {
  hasArc: boolean;
  reason: string;
}

function lineArc(v: number[]): StoryArcVerdict {
  if (v.length < 3)
    return { hasArc: false, reason: "too few points for an arc" };
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  const cv = mean === 0 ? (sd === 0 ? 0 : Infinity) : sd / Math.abs(mean);
  if (cv < LINE_FLAT_MAX_CV)
    return {
      hasArc: false,
      reason:
        "essentially flat/constant — no arc; a static value or annotated chart reads better",
    };
  const steps = v.slice(1).map((y, i) => y - v[i]);
  const ups = steps.filter((s) => s > 0).length;
  const downs = steps.filter((s) => s < 0).length;
  const monotoneFrac = Math.max(ups, downs) / steps.length;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const range = max - min || 1;
  // a turn = an interior extreme whose swing to both neighbours is a real fraction of range
  let hasTurn = false;
  for (let i = 1; i < v.length - 1; i++) {
    const swing =
      Math.min(Math.abs(v[i] - v[i - 1]), Math.abs(v[i] - v[i + 1])) / range;
    const isExtreme =
      (v[i] > v[i - 1] && v[i] > v[i + 1]) ||
      (v[i] < v[i - 1] && v[i] < v[i + 1]);
    if (isExtreme && swing >= TURN_MIN_RELATIVE_SWING) hasTurn = true;
  }
  if (monotoneFrac >= TREND_MIN_MONOTONE_FRACTION)
    return { hasArc: true, reason: "a directional trend carries the story" };
  if (hasTurn)
    return {
      hasArc: true,
      reason: "a clear turn (peak/valley) carries the story",
    };
  return {
    hasArc: false,
    reason:
      "flat/noisy — no trend or clear turn; a static annotated chart reads better",
  };
}

function barArc(v: number[]): StoryArcVerdict {
  if (v.length < 3) return { hasArc: false, reason: "too few bars for an arc" };
  const desc = [...v].sort((a, b) => b - a);
  const leaderRatio = desc[1] === 0 ? Infinity : desc[0] / desc[1];
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  const cv = mean === 0 ? 0 : sd / Math.abs(mean);
  if (leaderRatio >= SPREAD_MIN_LEADER_RATIO || cv >= SPREAD_MIN_CV)
    return {
      hasArc: true,
      reason: "real spread (a detached leader / long tail) carries the story",
    };
  return {
    hasArc: false,
    reason:
      "a near-flat ranking — no dominant leader or tail; a static ranked chart reads better",
  };
}

function scatterArc(xs: number[], ys: number[]): StoryArcVerdict {
  const n = Math.min(xs.length, ys.length);
  if (n < 3)
    return { hasArc: false, reason: "too few points for a correlation story" };
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(sxx * syy);
  const r = denom === 0 ? 0 : sxy / denom;
  if (Math.abs(r) >= SCATTER_MIN_ABS_R)
    return {
      hasArc: true,
      reason: `a correlation (r=${r.toFixed(2)}) carries the story`,
    };
  return {
    hasArc: false,
    reason: `no correlation (r=${r.toFixed(2)}) — a static annotated scatter reads better`,
  };
}

export function assessStoryArc(input: StoryArcInput): StoryArcVerdict {
  if (input.type === "line") return lineArc(input.values);
  if (input.type === "bar") return barArc(input.values);
  return scatterArc(input.values, input.ys ?? []);
}
