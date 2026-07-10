// core/math — the pure, framework-free helpers shared by EVERY chart type
// (L0/global). No D3 scales here (those are per-type geometry); just number
// formatting, clamping, and the easing/stagger vocabulary the motion build uses.
// Decouples the geometry files from each other (bar must not import from line).

import { localizeDecimal, type Lang } from "./locale";

/**
 * Abbreviate a number the FT way: 12831 -> "12.8k", 1_800_000 -> "1.8M".
 * `lang` localizes the DECIMAL separator ("19.3" -> "19,3" in French); English
 * output is byte-identical to before (default lang = English).
 */
export function formatNumber(n: number, lang?: Lang): string {
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000) s = `${trimZero(n / 1_000_000)}M`;
  else if (abs >= 1_000) s = `${trimZero(n / 1_000)}k`;
  else s = trimZero(n);
  return localizeDecimal(s, lang);
}
function trimZero(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Disney ease-in/out (cubic) — the master easing for line/bar reveals. */
export function easeInOutCubic(t: number): number {
  const p = clamp01(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/** Decelerating ease (fast start, soft landing) — for the chrome wipe-ins. */
export function easeOutCubic(t: number): number {
  const p = clamp01(t);
  return 1 - Math.pow(1 - p, 3);
}

/**
 * Full opacity for a bar-family value label once its element is this fraction
 * grown (~15%). One number → the whole family's label-reveal knob.
 */
export const LABEL_REVEAL_GROWN = 0.15;

/**
 * Value-label reveal opacity for the bar family (bar / diverging / waterfall /
 * lollipop / bullet / dumbbell). A value label fades in EARLY with its OWN
 * element's growth, reaching full opacity by `LABEL_REVEAL_GROWN`, so it is
 * present at EVERY mid-build frame — not only the p=1 hold. Pair it with a label
 * that RIDES its element's animated end (always outside the mark → never
 * clipped). Replaces the old late gate `(grown-0.65)/0.35`, which hid the
 * last-staggered smallest elements' labels until ~97% growth and shipped
 * label-less mid-build video stills (the deliverable still freezes ≈60% through).
 * Pure function of the element's local growth → frame-deterministic. `grown` is
 * that element's staggered 0→1 progress.
 */
export function labelReveal(grown: number): number {
  return clamp01(grown / LABEL_REVEAL_GROWN);
}

/**
 * A staggered sub-window of the master progress. Element `i` of `count` starts
 * at `start + i*step` and runs for `span`; returns its local eased 0→1. Pure —
 * lets the motion build stagger gridlines/bars/labels deterministically.
 */
export function stagger(
  p: number,
  i: number,
  count: number,
  start: number,
  step: number,
  span: number,
): number {
  const begin = start + i * step;
  return easeOutCubic((p - begin) / span);
}
