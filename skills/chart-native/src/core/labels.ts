// core/labels — the GLOBAL label-placement mechanism (a cross-chart concern, not
// a per-type one). The invariant it guarantees: a placed label stays strictly
// INSIDE the given bounds and overlaps no mark or other placed label. The
// mechanism: take candidates by priority, try four spots around the anchor
// (right/left/above/below), then a short leader into free space, else SKIP.
// Each chart type supplies its own candidates + marks + bounds (the type-specific
// inputs); the placement + the in-bounds guarantee live here, once.

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
export interface Leader {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlaceCandidate {
  id: number | string;
  text: string;
  /** anchor = the mark (dot/point) the label belongs to, in plot coords */
  ax: number;
  ay: number;
  /** clearance radius around the anchor (e.g. the dot radius) */
  r: number;
  /** higher = placed first when space is contested */
  priority: number;
  /**
   * true = this label was EXPLICITLY requested (a journalist/②-named highlight) and
   * must never be silently dropped. When no clean (in-bounds, no-overlap) spot exists,
   * it is offset to the best in-bounds position anyway — an overlapping-but-present
   * label beats a missing requested one. Absent/false = the default "fewer-but-readable"
   * behaviour (auto labels may be skipped when they can't be placed cleanly).
   */
  required?: boolean;
}

export interface PlacedLabel {
  id: number | string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  leader?: Leader;
}

export interface PlaceOptions {
  /** labels must stay strictly inside this rectangle (the plot area) */
  bounds: Box;
  /** estimated character width (≈ fontSize * 0.6) */
  charW: number;
  /** label box height */
  lh: number;
  /** horizontal padding added to the estimated text width */
  padX?: number;
  /** gap between the mark edge and the label */
  gap?: number;
  /** length of the short leader used when no adjacent spot is free */
  leaderOffset?: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/**
 * 1-D vertical de-collision for labels that share an x edge (slope endpoints,
 * stacked-area band labels at the right edge): nudge them apart by at least
 * `minGap`, then shift the whole stack up if it ran past `maxY`. Returns y per
 * input index. A global label mechanism (used by ≥2 types) — lives here, once.
 */
export function spreadLabels(
  ys: { index: number; y: number }[],
  minGap: number,
  maxY: number,
): Map<number, number> {
  const sorted = [...ys].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const it of sorted) {
    let y = it.y;
    if (y - prev < minGap) y = prev + minGap;
    it.y = y;
    prev = y;
  }
  const overflow = sorted.length ? sorted[sorted.length - 1].y - maxY : 0;
  if (overflow > 0) for (const it of sorted) it.y -= overflow;
  const out = new Map<number, number>();
  for (const it of sorted) out.set(it.index, it.y);
  return out;
}

/**
 * De-collision like `spreadLabels`, but bounded to the closed band [minY, maxY] AND
 * gap-filling. `spreadLabels` only pushes labels DOWN then shifts the whole stack up on
 * bottom overflow — so an ISOLATED extreme value (a slope's lone high-earning category,
 * far above the clustered rest) leaves a large empty gap that the lower cluster can't use,
 * and the uniform up-shift then drags that extreme label ABOVE the plot into the header.
 * A down-pass then an UP-pass (from the bottom, clamped to maxY) pulls labels back up into
 * that gap, so a set that FITS the band lands entirely inside it — no label invades the
 * subtitle above or the captions below. If the set genuinely can't fit (n·minGap > the
 * band), the top is clamped to minY and the unavoidable overlap stays in the middle
 * (a bounded degradation) rather than escaping the frame. Used for the slope's wrapped
 * left "name value" blocks; the single-line `spreadLabels` is unchanged for its other
 * callers (right value labels, stacked-area).
 */
export function spreadLabelsBounded(
  ys: { index: number; y: number }[],
  minGap: number,
  minY: number,
  maxY: number,
): Map<number, number> {
  const sorted = [...ys].sort((a, b) => a.y - b.y);
  // down-pass: first label ≥ minY, each next ≥ prev + minGap
  let prev = minY - minGap;
  for (const it of sorted) {
    it.y = Math.max(it.y, prev + minGap);
    prev = it.y;
  }
  // up-pass: last label ≤ maxY, each prior ≤ next − minGap (fills the wasted gap above)
  let next = maxY + minGap;
  for (let i = sorted.length - 1; i >= 0; i--) {
    sorted[i].y = Math.min(sorted[i].y, next - minGap);
    next = sorted[i].y;
  }
  const out = new Map<number, number>();
  for (const it of sorted) out.set(it.index, it.y);
  return out;
}

export function withinBounds(b: Box, bounds: Box): boolean {
  return (
    b.x0 >= bounds.x0 &&
    b.x1 <= bounds.x1 &&
    b.y0 >= bounds.y0 &&
    b.y1 <= bounds.y1
  );
}

/**
 * Place as many candidate labels as fit cleanly. Greedy by priority; each label
 * never overlaps a mark, an already-placed label, or leaves `bounds`. Returns
 * only the placed ones (callers expect fewer-but-readable over overlapping).
 */
export function placeLabels(
  candidates: PlaceCandidate[],
  marks: Box[],
  opts: PlaceOptions,
): PlacedLabel[] {
  const { bounds, charW, lh } = opts;
  const padX = opts.padX ?? 3;
  const gap = opts.gap ?? 6;
  const leaderOffset = opts.leaderOffset ?? 28;
  const obstacles: Box[] = [...marks];
  const placed: PlacedLabel[] = [];

  const box = (x0: number, y: number, w: number): Box => ({
    x0,
    x1: x0 + w,
    y0: y - lh / 2,
    y1: y + lh / 2,
  });

  for (const c of [...candidates].sort((a, b) => b.priority - a.priority)) {
    const w = c.text.length * charW + padX * 2;
    const r = c.r;
    type Pos = {
      x: number;
      y: number;
      anchor: "start" | "middle" | "end";
      box: Box;
      leader?: Leader;
    };
    const positions: Pos[] = [
      {
        x: c.ax + r + gap,
        y: c.ay,
        anchor: "start",
        box: box(c.ax + r + gap, c.ay, w),
      },
      {
        x: c.ax - r - gap,
        y: c.ay,
        anchor: "end",
        box: box(c.ax - r - gap - w, c.ay, w),
      },
      {
        x: c.ax,
        y: c.ay - r - 12,
        anchor: "middle",
        box: box(c.ax - w / 2, c.ay - r - 12, w),
      },
      {
        x: c.ax,
        y: c.ay + r + 12,
        anchor: "middle",
        box: box(c.ax - w / 2, c.ay + r + 12, w),
      },
      {
        x: c.ax,
        y: c.ay - r - leaderOffset,
        anchor: "middle",
        box: box(c.ax - w / 2, c.ay - r - leaderOffset, w),
        leader: {
          x1: c.ax,
          y1: c.ay - r,
          x2: c.ax,
          y2: c.ay - r - leaderOffset + lh / 2,
        },
      },
      {
        x: c.ax,
        y: c.ay + r + leaderOffset,
        anchor: "middle",
        box: box(c.ax - w / 2, c.ay + r + leaderOffset, w),
        leader: {
          x1: c.ax,
          y1: c.ay + r,
          x2: c.ax,
          y2: c.ay + r + leaderOffset - lh / 2,
        },
      },
    ];

    // Corner fallback: an anchor at the plot edge defeats all six spots above — the
    // horizontal ones clip vertically (anchor at the bottom/top edge), the vertical ones
    // clip horizontally (anchor at the left/right edge). Offer the label to the side with
    // its y CLAMPED inside bounds and a short leader back to the mark, so any in-bounds
    // anchor whose label physically fits still gets placed instead of silently dropped.
    const clampY = Math.max(
      bounds.y0 + lh / 2,
      Math.min(bounds.y1 - lh / 2, c.ay),
    );
    for (const side of [1, -1] as const) {
      const start = side === 1;
      const x = start ? c.ax + r + gap : c.ax - r - gap;
      const bx = start ? x : x - w;
      positions.push({
        x,
        y: clampY,
        anchor: start ? "start" : "end",
        box: box(bx, clampY, w),
        leader:
          Math.abs(clampY - c.ay) > 0.5
            ? { x1: c.ax + side * r, y1: c.ay, x2: x, y2: clampY }
            : undefined,
      });
    }
    let chosen = positions.find(
      (pos) =>
        withinBounds(pos.box, bounds) &&
        !obstacles.some((o) => overlaps(pos.box, o)),
    );
    // A REQUIRED label (an explicitly-requested highlight) is never dropped: if no
    // clean spot exists, take the best in-bounds position even if it overlaps a mark or
    // another label (offset over drop). Only truly unplaceable (no in-bounds spot at
    // all — a label wider than the plot) falls through unplaced.
    if (!chosen && c.required)
      chosen = positions.find((pos) => withinBounds(pos.box, bounds));
    if (chosen) {
      obstacles.push(chosen.box);
      placed.push({
        id: c.id,
        x: chosen.x,
        y: chosen.y,
        anchor: chosen.anchor,
        leader: chosen.leader,
      });
    }
  }
  return placed;
}
