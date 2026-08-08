// Pure geometry core for the ARC DIAGRAM — framework-free (D3 = math). Nodes sit
// on one horizontal baseline (a 1-D ordering); each relationship is an arc that
// rises ABOVE the line between its two nodes. Unlike the sankey/chord (flow
// matrices), the arc diagram shows a network of pairwise links on a line, so the
// node ORDER is the editorial choice. Link weight → arc stroke width; node degree
// → node radius via AREA (scaleSqrt, r ∝ √degree). A true semicircle would be
// half the span tall, so the arc height is CAPPED to the available band (a half-
// ellipse) — the non-negotiable that keeps a wide link inside the plot. The
// reveal grows each arc with a per-arc progress in the component → deterministic.

import { scalePoint, scaleLinear, scaleSqrt } from "d3-scale";

export interface ArcNode {
  id: string;
  label: string;
  group?: string;
}

export interface ArcLink {
  source: string;
  target: string;
  value: number;
}

export interface ArcData {
  nodes: ArcNode[]; // array order = left→right on the baseline
  links: ArcLink[];
}

export interface ArcDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ArcNodeLayout {
  id: string;
  label: string;
  group?: string;
  x: number; // screen x on the baseline
  degree: number; // summed weight of incident links
  r: number; // node radius (area-scaled)
}

export interface ArcLinkLayout {
  source: string;
  target: string;
  value: number;
  x1: number; // left endpoint x
  x2: number; // right endpoint x
  rx: number; // horizontal arc radius = |x2 - x1| / 2
  ry: number; // vertical radius (capped to the band)
  width: number; // stroke width (weight-scaled)
}

export interface ArcLayout {
  innerWidth: number;
  innerHeight: number;
  baseY: number; // baseline y (within the inner box)
  nodes: ArcNodeLayout[];
  links: ArcLinkLayout[];
  maxArcHeight: number;
}

export interface ArcOptions {
  minStroke?: number;
  maxStroke?: number;
  // px reserved BELOW the baseline for node labels, so the baseline sits high
  // enough that a label can never be overlapped by its own (largest) node dot.
  baselineInset?: number;
}

export const NODE_R_MAX = 9; // top of the node-radius range (used for spacing)

export function computeArcLayout(
  data: ArcData,
  dims: ArcDims,
  options: ArcOptions = {},
): ArcLayout {
  if (!data.nodes.length) throw new Error("computeArcLayout: no nodes");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeArcLayout: padding exceeds dimensions");

  const { minStroke = 1.5, maxStroke = 12, baselineInset = 0 } = options;

  const index = new Map(data.nodes.map((n, i) => [n.id, i]));
  for (const l of data.links) {
    if (!index.has(l.source))
      throw new Error(`arc link source not a node: ${l.source}`);
    if (!index.has(l.target))
      throw new Error(`arc link target not a node: ${l.target}`);
    if (Number.isNaN(Number(l.value)))
      throw new Error(`invalid arc link value: ${l.value}`);
  }

  // node degree = total incident weight
  const degree = new Map<string, number>(data.nodes.map((n) => [n.id, 0]));
  for (const l of data.links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + l.value);
    degree.set(l.target, (degree.get(l.target) ?? 0) + l.value);
  }
  const maxDegree = Math.max(1, ...degree.values());

  // baseline sits above the reserved label band; labels live below it (within
  // the inset), arcs rise above it.
  const baseY = innerHeight - baselineInset - 1;
  const maxArcHeight = baseY - 2;
  if (maxArcHeight <= 0)
    throw new Error("computeArcLayout: baselineInset leaves no room for arcs");

  const px = scalePoint<string>()
    .domain(data.nodes.map((n) => n.id))
    .range([0, innerWidth])
    .padding(0.5);
  const rNode = scaleSqrt().domain([0, maxDegree]).range([3, NODE_R_MAX]);

  const maxValue = Math.max(1, ...data.links.map((l) => l.value));
  const stroke = scaleLinear()
    .domain([0, maxValue])
    .range([minStroke, maxStroke]);

  const nodes: ArcNodeLayout[] = data.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    group: n.group,
    x: px(n.id) ?? 0,
    degree: degree.get(n.id) ?? 0,
    r: rNode(degree.get(n.id) ?? 0),
  }));

  // arc height is NOT a data encoding (it is just a function of which nodes
  // connect), so scale every arc by one vertical factor that makes the WIDEST
  // arc fill the band — fills dead space when all arcs are short, shrinks them
  // when one is too tall. Relative heights are preserved; the tallest is capped.
  const spans = data.links.map((l) => {
    const xa = px(l.source) ?? 0;
    const xb = px(l.target) ?? 0;
    return Math.abs(xb - xa) / 2;
  });
  const maxRx = Math.max(1, ...spans);
  const vFill = maxArcHeight / maxRx;

  const links: ArcLinkLayout[] = data.links.map((l) => {
    const xa = px(l.source) ?? 0;
    const xb = px(l.target) ?? 0;
    const x1 = Math.min(xa, xb);
    const x2 = Math.max(xa, xb);
    const rx = (x2 - x1) / 2;
    return {
      source: l.source,
      target: l.target,
      value: l.value,
      x1,
      x2,
      rx,
      ry: Math.min(rx * vFill, maxArcHeight), // fill the band, cap at the top
      width: stroke(l.value),
    };
  });

  return {
    innerWidth,
    innerHeight,
    baseY,
    nodes,
    links,
    maxArcHeight,
  };
}

/**
 * SVG path for one arc as the upper half of an ellipse from (x1,baseY) to
 * (x2,baseY), rising `ry` above the baseline. `progress` (0→1) sweeps the arc
 * open from its left foot — pure function → reproducible video frames.
 */
export function arcPath(
  link: ArcLinkLayout,
  baseY: number,
  progress = 1,
): string {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  // a full elliptical top: M x1,baseY A rx ry 0 0 1 x2,baseY
  // for the reveal we interpolate the end angle along the ellipse.
  const cx = (link.x1 + link.x2) / 2;
  // endpoint angle sweeps from π (left foot, p=0) to 0 (right foot, p=1).
  const theta = Math.PI * (1 - p);
  const ex = cx + link.rx * Math.cos(theta);
  const ey = baseY - link.ry * Math.sin(theta);
  // upper half-ellipse, large-arc=0 sweep=1; the end point moves with progress.
  return `M ${link.x1} ${baseY} A ${link.rx} ${link.ry} 0 0 1 ${ex} ${ey}`;
}

// ── ARE THESE NODES STILL NAMEABLE? ───────────────────────────────────────────────────────
// ONE measurement, shared by the mapper (so the refusal reaches the journalist at the GATE,
// while they can still change the table) and by the produce guard (so a hand-built config that
// never passed through the mapper meets the same rule). Two copies of a measured rule is how
// the two ends come to disagree.

/** How much of the longest node label must survive the arc's own truncation. Half: a name cut
 *  to under half its width is an ellipsis with a hint, not a label — and every arc label sits
 *  under its own node, so there is no legend to recover the name from.
 *
 *  It lives HERE, beside the measurement it qualifies, rather than in core/conformance: the
 *  mapper applies the same rule at the gate, and importing the conformance belt into
 *  spec-to-config dragged the whole L0 stack — and `zod` with it — into the import closure the
 *  runnable source bundle traces, which broke every scrolly bundle. Caught by
 *  bundle-source.test.ts, which is the only thing that walks that closure. */
export const ARC_MIN_LABEL_RATIO = 0.5;

/**
 * ArcChart's BASE landscape frame — the one the measurement below is taken at.
 *
 * WHY THE BASE FRAME ANSWERS FOR EVERY WIDTH: the rule compares a GAP against a LABEL WIDTH,
 * and `resolveFrameWithHeader` scales the padding and the type size by the same factor — widen
 * the frame to 1200 and both sides grow together, so the RATIO is scale-invariant.
 */
export const ARC_GUARD_DIMS: ArcDims = {
  width: 840,
  height: 480,
  padding: { top: 90, right: 22, bottom: 60, left: 22 },
};

export interface ArcLabelFit {
  /** smallest gap between two adjacent nodes on the rendered baseline */
  minGapPx: number;
  longestLabel: string;
  /** px the longest label needs at the base type size */
  labelPx: number;
}

/**
 * Measure the baseline the component will draw. `measure` is the caller's text-width function
 * (core/text's `textWidth` at the base source type size) — passed in so this file stays
 * framework- and token-free, exactly like the rest of the geometry.
 */
export function arcLabelFit(
  data: ArcData,
  measure: (label: string) => number,
  dims: ArcDims = ARC_GUARD_DIMS,
): ArcLabelFit {
  const layout = computeArcLayout(data, dims, {
    baselineInset: NODE_R_MAX + 12,
  });
  let minGapPx = layout.innerWidth;
  for (let i = 1; i < layout.nodes.length; i++)
    minGapPx = Math.min(minGapPx, layout.nodes[i].x - layout.nodes[i - 1].x);
  const longest = data.nodes.reduce(
    (a, b) => (measure(b.label) > measure(a.label) ? b : a),
    data.nodes[0] ?? { id: "", label: "" },
  );
  return {
    minGapPx,
    longestLabel: longest.label,
    labelPx: measure(longest.label),
  };
}
