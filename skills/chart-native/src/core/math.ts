// core/math — the pure, framework-free helpers shared by EVERY chart type
// (L0/global). No D3 scales here (those are per-type geometry); just number
// formatting, clamping, and the easing/stagger vocabulary the motion build uses.
// Decouples the geometry files from each other (bar must not import from line).

/** Abbreviate a number the FT way: 12831 -> "12.8k", 1_800_000 -> "1.8M". */
export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimZero(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZero(n / 1_000)}k`;
  return trimZero(n);
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
