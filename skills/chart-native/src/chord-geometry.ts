// Pure geometry core for CHORD diagrams — framework-free (D3 = math: d3-chord for
// the matrix layout, d3-shape `arc` for the group arcs). A circular flow matrix:
// each entity's arc ∝ its total, each ribbon ∝ a pair's flow. The wrapper is a
// pure function of the matrix; the reveal animates only scale/opacity, so geometry
// is fixed and frame N is a pure function of the frame.

import { chord as d3chord, ribbon as d3ribbon } from "d3-chord";
import { arc as d3arc } from "d3-shape";
import { descending } from "d3-array";

export interface ChordData {
  labels: string[];
  /** square matrix; matrix[i][j] = flow from i to j (≥ 0) */
  matrix: number[][];
}

export interface ChordDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ChordGroup {
  index: number;
  label: string;
  value: number;
  arcPath: string; // origin-centred
  midAngle: number; // radians, 0 = up, clockwise
  labelX: number; // relative to centre
  labelY: number;
  side: "left" | "right";
}

export interface ChordRibbon {
  index: number;
  source: number; // group index
  target: number; // group index
  value: number; // the directed flow (source → target)
  path: string; // origin-centred
}

export interface ChordLayout {
  cx: number;
  cy: number;
  radius: number;
  groups: ChordGroup[];
  ribbons: ChordRibbon[];
}

export interface ChordOptions {
  arcWidth?: number;
  /** Px the LABELS need to the left/right of the ring, and above/below it — measured by the
   *  caller (which knows the type size) and passed in, so the geometry stays pure. They are
   *  separate on purpose: an arc label sits BESIDE the ring, so horizontally it needs its full
   *  width and vertically only its line height. One shared gutter has to take the larger of
   *  the two, which spends the label's whole WIDTH out of the frame's HEIGHT — and a landscape
   *  frame is short. That is exactly what a fixed 64 px gutter did: at the 1200×676 article
   *  frame it ate 40 % of the radius and left the circle floating in a third of its own band.
   */
  labelGutterX?: number;
  labelGutterY?: number;
}

export function computeChordLayout(
  data: ChordData,
  dims: ChordDims,
  opts: ChordOptions = {},
): ChordLayout {
  const N = data.labels.length;
  if (N < 2) throw new Error("computeChordLayout: need ≥ 2 entities");
  if (data.matrix.length !== N || data.matrix.some((r) => r.length !== N))
    throw new Error("computeChordLayout: matrix must be square (N×N)");
  if (data.matrix.some((r) => r.some((v) => v < 0)))
    throw new Error("computeChordLayout: flows must be ≥ 0");

  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeChordLayout: padding exceeds dimensions");

  const cx = padding.left + innerWidth / 2;
  const cy = padding.top + innerHeight / 2;
  const arcW = opts.arcWidth ?? 12;
  // The ring grows until either the widest label or a label's own line height would leave the
  // plot — measured on each axis separately (see ChordOptions). The defaults are the historic
  // 64 px on both axes, so a caller that measures nothing gets the old picture.
  const gutterX = opts.labelGutterX ?? 64;
  const gutterY = opts.labelGutterY ?? 64;
  const radius = Math.max(
    10,
    Math.min(innerWidth / 2 - gutterX, innerHeight / 2 - gutterY),
  );

  const chords = d3chord().padAngle(0.04).sortSubgroups(descending)(
    data.matrix,
  );

  const arcGen = d3arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(radius)
    .outerRadius(radius + arcW);
  const ribGen = d3ribbon().radius(radius);

  const groups: ChordGroup[] = chords.groups.map((g) => {
    const mid = (g.startAngle + g.endAngle) / 2;
    const lr = radius + arcW + 8;
    // d3 angles: 0 = up (12 o'clock), clockwise → x = sin, y = -cos
    const sin = Math.sin(mid);
    return {
      index: g.index,
      label: data.labels[g.index],
      value: g.value,
      arcPath: arcGen({ startAngle: g.startAngle, endAngle: g.endAngle }) ?? "",
      midAngle: mid,
      labelX: lr * sin,
      labelY: -lr * Math.cos(mid),
      side: sin >= 0 ? "right" : "left",
    };
  });

  const ribbons: ChordRibbon[] = chords.map((c, i) => ({
    index: i,
    source: c.source.index,
    target: c.target.index,
    value: c.source.value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path: (ribGen as any)(c) ?? "",
  }));

  return { cx, cy, radius, groups, ribbons };
}
