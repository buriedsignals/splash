// Pure geometry core for BEESWARM / strip plots — framework-free (D3 = math). A
// 1-D value layout: each point sits at its value on the x-axis and is dodged
// vertically (deterministic tangent-packing, Bostock's algorithm) so no two dots
// overlap. The dodge axis is decorative — only x carries meaning. POSITION
// encoding → no baseline-0. The reveal only scales each dot's radius from 0, so
// positions are fixed and frame N is a pure function of the frame.

import { scaleLinear } from "d3-scale";
import { ascending } from "d3-array";

export interface BeeswarmPoint {
  value: number;
  label?: string;
  category?: string;
}

export interface BeeswarmData {
  valueLabel: string;
  points: BeeswarmPoint[];
  categories?: string[]; // colour order; omit for a single hue
}

export interface BeeswarmDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface BeeswarmNode {
  index: number; // original index
  order: number; // rank in value order (for staggered reveal)
  value: number;
  label?: string;
  category?: string;
  x: number;
  y: number;
}

export interface BeeswarmLayout {
  innerWidth: number;
  innerHeight: number;
  nodes: BeeswarmNode[];
  valueTicks: { pos: number; label: string }[];
  valueDomain: [number, number];
  radius: number;
}

export function computeBeeswarmLayout(
  data: BeeswarmData,
  dims: BeeswarmDims,
  radius = 4,
): BeeswarmLayout {
  if (!data.points.length) throw new Error("computeBeeswarmLayout: no points");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeBeeswarmLayout: padding exceeds dimensions");

  const values = data.points.map((p) => Number(p.value));
  if (values.some((v) => Number.isNaN(v)))
    throw new Error("computeBeeswarmLayout: a point has a non-numeric value");

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const domain: [number, number] = [lo - span * 0.02, hi + span * 0.02];
  const x = scaleLinear().domain(domain).range([0, innerWidth]);
  const centerY = innerHeight / 2;
  const r = radius + 0.5; // collision spacing (dot radius + a hair)

  // order points by x; place each at the smallest |offset| from the centre line
  // that clears every already-placed neighbour (tangent-packing).
  const order = data.points
    .map((_, i) => i)
    .sort((a, b) => ascending(values[a], values[b]));

  const placed: { px: number; offset: number }[] = [];
  const offsetByIndex = new Map<number, number>();
  for (const idx of order) {
    const px = x(values[idx]);
    // candidate offsets: 0, plus the tangent points to each near neighbour.
    const candidates = [0];
    for (const q of placed) {
      const dx = px - q.px;
      if (Math.abs(dx) >= 2 * r) continue;
      const dy = Math.sqrt(Math.max(0, 2 * r * (2 * r) - dx * dx));
      candidates.push(q.offset + dy, q.offset - dy);
    }
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b));
    let chosen = 0;
    for (const c of candidates) {
      const ok = placed.every((q) => {
        const dx = px - q.px;
        const dyy = c - q.offset;
        return dx * dx + dyy * dyy >= 4 * r * r - 1e-6;
      });
      if (ok) {
        chosen = c;
        break;
      }
    }
    placed.push({ px, offset: chosen });
    offsetByIndex.set(idx, chosen);
  }

  // fit the swarm into the band: if the tallest offset overflows, scale offsets
  // down so every dot stays inside (keeps the chart in bounds for dense swarms).
  const maxAbs = Math.max(1e-6, ...placed.map((q) => Math.abs(q.offset)));
  const limit = innerHeight / 2 - radius;
  const scaleY = maxAbs > limit ? limit / maxAbs : 1;

  const orderRank = new Map<number, number>();
  order.forEach((idx, rank) => orderRank.set(idx, rank));

  const nodes: BeeswarmNode[] = data.points.map((p, i) => ({
    index: i,
    order: orderRank.get(i) ?? 0,
    value: values[i],
    label: p.label,
    category: p.category,
    x: x(values[i]),
    y: centerY + (offsetByIndex.get(i) ?? 0) * scaleY,
  }));

  const valueTicks = x.ticks(5).map((t) => ({ pos: x(t), label: String(t) }));

  return {
    innerWidth,
    innerHeight,
    nodes,
    valueTicks,
    valueDomain: domain,
    radius,
  };
}
