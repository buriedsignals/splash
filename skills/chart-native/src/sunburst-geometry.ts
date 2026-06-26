// Pure geometry core for SUNBURST charts — framework-free (D3 = math, but the
// partition is hand-rolled so it stays a unit-testable pure function). A radial
// hierarchy: the centre is the whole, each ring out is a level, each arc's ANGLE
// ∝ its value, nested within its parent's range. The reveal sweeps each arc open
// from its start angle, so angles/radii are fixed and frame N is a pure function.

export interface SunburstNode {
  label: string;
  value?: number; // leaves carry a value; internal nodes sum their children
  children?: SunburstNode[];
}

export interface SunburstData {
  unit: string;
  root: SunburstNode;
}

export interface SunburstDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface SunburstArc {
  label: string;
  value: number;
  depth: number; // 1 = first ring out from the centre
  branch: number; // top-level branch index (for colour)
  share: number; // value / total
  x0: number; // start angle (radians, 0 = up, clockwise)
  x1: number; // end angle
  y0: number; // inner radius
  y1: number; // outer radius
  midAngle: number;
}

export interface SunburstLayout {
  cx: number;
  cy: number;
  radius: number;
  ringW: number;
  arcs: SunburstArc[];
  total: number;
  centerLabel: string;
  centerValue: number;
}

function valueOf(n: SunburstNode): number {
  if (n.children && n.children.length)
    return n.children.reduce((s, c) => s + valueOf(c), 0);
  const v = Number(n.value);
  if (!(v > 0))
    throw new Error(`computeSunburstLayout: leaf "${n.label}" needs value > 0`);
  return v;
}

function maxDepthOf(n: SunburstNode, d = 0): number {
  if (!n.children || !n.children.length) return d;
  return Math.max(...n.children.map((c) => maxDepthOf(c, d + 1)));
}

export function computeSunburstLayout(
  data: SunburstData,
  dims: SunburstDims,
): SunburstLayout {
  const root = data.root;
  if (!root.children || !root.children.length)
    throw new Error("computeSunburstLayout: root needs children");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeSunburstLayout: padding exceeds dimensions");

  const total = valueOf(root);
  const cx = padding.left + innerWidth / 2;
  const cy = padding.top + innerHeight / 2;
  const radius = Math.max(10, Math.min(innerWidth, innerHeight) / 2);
  const depth = maxDepthOf(root); // number of rings
  // a centre disc (the whole) + one ring per level
  const ringW = radius / (depth + 1);

  const arcs: SunburstArc[] = [];
  const walk = (
    node: SunburstNode,
    a0: number,
    a1: number,
    d: number,
    branch: number,
  ) => {
    if (d >= 1) {
      const v = valueOf(node);
      arcs.push({
        label: node.label,
        value: v,
        depth: d,
        branch,
        share: v / total,
        x0: a0,
        x1: a1,
        y0: d * ringW,
        y1: (d + 1) * ringW,
        midAngle: (a0 + a1) / 2,
      });
    }
    if (node.children && node.children.length) {
      const nodeVal = valueOf(node);
      let cursor = a0;
      node.children.forEach((child, i) => {
        const span = (valueOf(child) / nodeVal) * (a1 - a0);
        walk(child, cursor, cursor + span, d + 1, d === 0 ? i : branch);
        cursor += span;
      });
    }
  };
  walk(root, 0, Math.PI * 2, 0, 0);

  return {
    cx,
    cy,
    radius,
    ringW,
    arcs,
    total,
    centerLabel: root.label,
    centerValue: total,
  };
}

/** A swept arc end angle as the ring opens from its start at `progress`. Pure. */
export function sweepArcEnd(arc: SunburstArc, progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return arc.x0 + (arc.x1 - arc.x0) * p;
}
