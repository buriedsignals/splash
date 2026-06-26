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
}

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

  const { minStroke = 1.5, maxStroke = 12 } = options;

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

  // baseline sits low; labels live below it, arcs rise above it.
  const baseY = innerHeight - 1;
  const maxArcHeight = innerHeight - 2;

  const px = scalePoint<string>()
    .domain(data.nodes.map((n) => n.id))
    .range([0, innerWidth])
    .padding(0.5);
  const rNode = scaleSqrt().domain([0, maxDegree]).range([3, 9]);

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
