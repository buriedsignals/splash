// Pure geometry core for SANKEY / flow diagrams — framework-free (D3 = math, but
// the layout is hand-rolled so it stays a unit-testable pure function). Nodes are
// placed in explicit COLUMNS; a node's height ∝ the quantity flowing through it
// (max of its in/out totals) on one shared scale; links are ribbons whose
// THICKNESS ∝ value. Links are ordered at each node by the connected node's
// position to reduce crossings. The reveal only animates opacity/width, so paths
// are fixed and frame N is a pure function of the frame.

export interface SankeyNodeIn {
  id: string;
  label: string;
  column: number; // explicit layer (0 = leftmost)
  category?: string;
}

export interface SankeyLinkIn {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNodeIn[];
  links: SankeyLinkIn[];
}

export interface SankeyDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface SankeyNode {
  id: string;
  label: string;
  column: number;
  category?: string;
  value: number; // max(in, out)
  x: number; // left edge
  y: number; // top edge
  w: number; // node bar width
  h: number; // node bar height (∝ value)
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  width: number; // ribbon thickness (∝ value)
  x0: number; // source right edge
  y0: number; // ribbon CENTRE y at the source
  x1: number; // target left edge
  y1: number; // ribbon CENTRE y at the target
}

export interface SankeyLayout {
  innerWidth: number;
  innerHeight: number;
  nodes: SankeyNode[];
  links: SankeyLink[];
  columns: number[]; // sorted column indices
}

export function computeSankeyLayout(
  data: SankeyData,
  dims: SankeyDims,
  opts: { nodeWidth?: number; nodeGap?: number } = {},
): SankeyLayout {
  const nodeWidth = opts.nodeWidth ?? 14;
  const nodeGap = opts.nodeGap ?? 14;
  if (!data.nodes.length) throw new Error("computeSankeyLayout: no nodes");
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  for (const l of data.links) {
    if (!byId.has(l.source))
      throw new Error(`computeSankeyLayout: unknown link source "${l.source}"`);
    if (!byId.has(l.target))
      throw new Error(`computeSankeyLayout: unknown link target "${l.target}"`);
    if (!(l.value > 0))
      throw new Error("computeSankeyLayout: every link value must be > 0");
  }

  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeSankeyLayout: padding exceeds dimensions");

  // node value = max(total in, total out)
  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();
  for (const l of data.links) {
    outSum.set(l.source, (outSum.get(l.source) ?? 0) + l.value);
    inSum.set(l.target, (inSum.get(l.target) ?? 0) + l.value);
  }
  const valueOf = (id: string) =>
    Math.max(inSum.get(id) ?? 0, outSum.get(id) ?? 0);

  const columns = [...new Set(data.nodes.map((n) => n.column))].sort(
    (a, b) => a - b,
  );
  if (columns.length < 2)
    throw new Error("computeSankeyLayout: need ≥ 2 columns");

  // nodes grouped by column, kept in declared order (curated vertical order).
  const colNodes = new Map<number, SankeyNodeIn[]>();
  for (const c of columns) colNodes.set(c, []);
  for (const n of data.nodes) colNodes.get(n.column)!.push(n);

  // one shared px-per-unit so every column fits the band.
  let pxPerUnit = Infinity;
  for (const c of columns) {
    const ns = colNodes.get(c)!;
    const totalVal = ns.reduce((s, n) => s + valueOf(n.id), 0);
    if (totalVal <= 0) continue;
    const avail = innerHeight - (ns.length - 1) * nodeGap;
    pxPerUnit = Math.min(pxPerUnit, avail / totalVal);
  }
  if (!Number.isFinite(pxPerUnit) || pxPerUnit <= 0) pxPerUnit = 1;

  // x position per column (evenly spread; first flush-left, last flush-right)
  const xOfColumn = new Map<number, number>();
  columns.forEach((c, i) => {
    const x =
      columns.length === 1
        ? 0
        : (i / (columns.length - 1)) * (innerWidth - nodeWidth);
    xOfColumn.set(c, x);
  });

  // place nodes: stack within a column, vertically centred.
  const nodes: SankeyNode[] = [];
  const nodePos = new Map<string, SankeyNode>();
  for (const c of columns) {
    const ns = colNodes.get(c)!;
    const heights = ns.map((n) => valueOf(n.id) * pxPerUnit);
    const stackH =
      heights.reduce((s, h) => s + h, 0) + (ns.length - 1) * nodeGap;
    let y = (innerHeight - stackH) / 2;
    ns.forEach((n, i) => {
      const node: SankeyNode = {
        id: n.id,
        label: n.label,
        column: c,
        category: n.category,
        value: valueOf(n.id),
        x: xOfColumn.get(c)!,
        y,
        w: nodeWidth,
        h: heights[i],
      };
      nodes.push(node);
      nodePos.set(n.id, node);
      y += heights[i] + nodeGap;
    });
  }

  // links: order each node's outgoing links by the target's y (and incoming by
  // the source's y) so the ribbons stack without crossing at the node, then
  // assign each link a band along the source's right edge and target's left edge.
  const outCursor = new Map<string, number>(); // running y offset per source
  const inCursor = new Map<string, number>();
  for (const n of nodes) {
    outCursor.set(n.id, n.y);
    inCursor.set(n.id, n.y);
  }

  const orderedOut = (id: string) =>
    data.links
      .filter((l) => l.source === id)
      .sort((a, b) => nodePos.get(a.target)!.y - nodePos.get(b.target)!.y);
  const orderedIn = (id: string) =>
    data.links
      .filter((l) => l.target === id)
      .sort((a, b) => nodePos.get(a.source)!.y - nodePos.get(b.source)!.y);

  // assign source-side bands
  const srcBand = new Map<SankeyLinkIn, number>();
  for (const n of nodes)
    for (const l of orderedOut(n.id)) {
      const top = outCursor.get(n.id)!;
      srcBand.set(l, top);
      outCursor.set(n.id, top + l.value * pxPerUnit);
    }
  // assign target-side bands
  const tgtBand = new Map<SankeyLinkIn, number>();
  for (const n of nodes)
    for (const l of orderedIn(n.id)) {
      const top = inCursor.get(n.id)!;
      tgtBand.set(l, top);
      inCursor.set(n.id, top + l.value * pxPerUnit);
    }

  const links: SankeyLink[] = data.links.map((l) => {
    const s = nodePos.get(l.source)!;
    const t = nodePos.get(l.target)!;
    const w = l.value * pxPerUnit;
    return {
      source: l.source,
      target: l.target,
      value: l.value,
      width: w,
      x0: s.x + s.w,
      y0: (srcBand.get(l) ?? s.y) + w / 2,
      x1: t.x,
      y1: (tgtBand.get(l) ?? t.y) + w / 2,
    };
  });

  return { innerWidth, innerHeight, nodes, links, columns };
}

/** The ribbon path for a link — a horizontal cubic between the two centres,
 *  drawn as a stroke of `width`. Pure. */
export function sankeyLinkPath(link: SankeyLink): string {
  const mx = (link.x0 + link.x1) / 2;
  return `M${link.x0},${link.y0} C${mx},${link.y0} ${mx},${link.y1} ${link.x1},${link.y1}`;
}
