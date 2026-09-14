// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   source   the tracked source's ribbons growing from its node to the countries                        0..1
//   shares   where the tracked source goes, each ribbon's share of it written at the country's rail     0..1
//   web      every other ribbon growing the same way                                                    0..1
//   focus0   the ribbons into the first focused country kept, the rest stepping back, each ribbon's share
//            of that country written at the source's rail                                                0..1
//   focus1   the same for the second focused country                                                    0..1
//   note     which header note is read                                                                  0..4
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint. One scale for both rails, so the ribbons out of a
// node add up exactly to the node on either side; each rail spreads its own nodes over the stage's height.

export function applySankeyState(root, state, context) {
  const carrier = root.querySelector("[data-sankey]");
  if (!carrier) return;
  if (context.resized || !root.__sankey) seatSankey(root, carrier);
  const c = root.__sankey;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  // A narrow stage sets each node's total under its name, so the rails keep room for the ribbons.
  const narrow = SW < 560;
  for (const label of c.labels) label.total.style.display = narrow ? "block" : "inline";
  // And writes a ribbon's share alone, without its source's name or its TWh, which the rails beside it carry.
  for (const node of [...c.targetShares, ...c.sourceShares]) {
    const name = node.querySelector('[data-part="share-name"]');
    if (name) name.style.display = narrow ? "none" : "inline";
  }
  const leftW = Math.max(...c.labels.filter((l) => l.side === "source").map((l) => l.node.offsetWidth));
  const rightW = Math.max(...c.labels.filter((l) => l.side === "target").map((l) => l.node.offsetWidth));
  const pitch = Math.max(...c.labels.map((l) => l.node.offsetHeight)) + 1;
  const RAIL = narrow ? 7 : 9;
  const leftRail = leftW + 8;
  const rightRail = SW - rightW - 8 - RAIL;
  const x0 = leftRail + RAIL;
  const x1 = rightRail;
  const mid = (x0 + x1) / 2;

  const total = c.sources.reduce((s, n) => s + n.total, 0);
  const GAP = narrow ? 5 : 7;
  const scale = (SH - GAP * (Math.max(c.sources.length, c.targets.length) - 1)) / total;
  const stack = (nodes) => {
    const gap = nodes.length > 1 ? (SH - total * scale) / (nodes.length - 1) : 0;
    let y = 0;
    return new Map(nodes.map((n) => {
      const box = { y0: y, h: n.total * scale };
      y += box.h + gap;
      return [n.key, box];
    }));
  };
  const left = stack(c.sources);
  const right = stack(c.targets);

  // ── the rails ──
  for (const n of c.sources) set(c.rails[`source:${n.key}`], { x: leftRail, y: left.get(n.key).y0, width: RAIL, height: Math.max(1, left.get(n.key).h) });
  for (const n of c.targets) set(c.rails[`target:${n.key}`], { x: rightRail, y: right.get(n.key).y0, width: RAIL, height: Math.max(1, right.get(n.key).h) });

  // ── the ribbons: stacked in each rail's own order on both ends ──
  const MIN = 0.6;
  const offL = new Map();
  const offR = new Map();
  const geometry = new Map();
  for (const f of c.order) {
    const h = Math.max(f.value * scale, MIN);
    const ay = left.get(f.from).y0 + (offL.get(f.from) ?? 0);
    const by = right.get(f.to).y0 + (offR.get(f.to) ?? 0);
    offL.set(f.from, (offL.get(f.from) ?? 0) + f.value * scale);
    offR.set(f.to, (offR.get(f.to) ?? 0) + f.value * scale);
    geometry.set(f.key, { ay, by, h });
    set(f.path, {
      d: `M${x0} ${ay} C${mid} ${ay} ${mid} ${by} ${x1} ${by} L${x1} ${by + h} C${mid} ${by + h} ${mid} ${ay + h} ${x0} ${ay + h} Z`,
    });
  }
  const grow = (t) => x0 + (x1 - x0) * ease(clamp(t));
  set(c.clips.source, { width: grow(state.source) });
  set(c.clips.web, { width: grow(state.web) });

  // ── the focus: one country's ribbons kept, every other stepping back ──
  const focus = [clamp(state.focus0), clamp(state.focus1)];
  const keptFor = (f) => focus.reduce((k, t, i) => k * (f.to === c.focus[i] ? 1 : 1 - 0.85 * t), 1);
  for (const f of c.order) f.path.setAttribute("opacity", String(keptFor(f)));
  for (const l of c.labels) {
    const dim = l.side === "target" ? focus.reduce((k, t, i) => k * (l.key === c.focus[i] ? 1 : 1 - 0.6 * t), 1) : 1;
    l.node.style.opacity = String(dim);
  }

  // ── the node labels, spaced so no two touch ──
  const spaced = (side, boxes, x, align) => {
    const seats = c.labels.filter((l) => l.side === side).map((l) => ({ l, y: boxes.get(l.key).y0 + boxes.get(l.key).h / 2 }));
    relax(seats, pitch, 0, SH);
    for (const s of seats)
      Object.assign(s.l.node.style, { left: `${align === "right" ? x - s.l.node.offsetWidth : x}px`, top: `${s.y - s.l.node.offsetHeight / 2}px` });
  };
  spaced("source", left, leftRail - 6, "right");
  spaced("target", right, rightRail + RAIL + 6, "left");

  // ── the shares written on the ribbons ──
  const writeShares = (nodes, key, endX, align, on) => {
    const seats = nodes
      .map((node) => {
        const g = geometry.get(node.flowKey);
        return { node, y: (key === "source" ? g.by : g.ay) + g.h / 2, h: g.h };
      })
      .sort((a, b) => a.y - b.y);
    relax(seats, c.valueH, 0, SH);
    for (const s of seats) {
      Object.assign(s.node.style, { left: `${align === "right" ? endX - s.node.offsetWidth : endX}px`, top: `${s.y - c.valueH / 2}px` });
      s.node.style.opacity = String(on);
    }
  };
  writeShares(c.sourceShares, "source", x1 - 6, "right", clamp(state.shares) * clamp((state.source - 0.7) / 0.3));
  c.focus.forEach((country, i) => {
    writeShares(c.targetShares.filter((s) => s.to === country), "target", x0 + 6, "left", focus[i]);
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function relax(seats, pitch, top, bottom) {
  for (let i = 0; i < seats.length; i++) seats[i].y = Math.max(seats[i].y, i ? seats[i - 1].y + pitch : top + pitch / 2);
  for (let i = seats.length - 1; i >= 0; i--) seats[i].y = Math.min(seats[i].y, i < seats.length - 1 ? seats[i + 1].y - pitch : bottom - pitch / 2);
}

function seatSankey(root, carrier) {
  const data = root.__sankeyData || (root.__sankeyData = JSON.parse(carrier.getAttribute("data-sankey")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const rank = (list, key) => list.findIndex((n) => n.key === key);
  const order = data.flows
    .map((f) => ({ ...f, key: `${f.from}|${f.to}`, path: q(`[data-flow="${CSS.escape(`${f.from}|${f.to}`)}"]`) }))
    .sort((a, b) => rank(data.sources, a.from) - rank(data.sources, b.from) || rank(data.targets, a.to) - rank(data.targets, b.to));
  const labels = [
    ...data.sources.map((n) => ({ side: "source", key: n.key })),
    ...data.targets.map((n) => ({ side: "target", key: n.key })),
  ].map((l) => {
    const node = q(`[data-node-label="${CSS.escape(`${l.side}:${l.key}`)}"]`);
    return { ...l, node, total: node.querySelector('[data-part="total"]') };
  });
  const rails = {};
  for (const n of data.sources) rails[`source:${n.key}`] = q(`[data-rail="${CSS.escape(`source:${n.key}`)}"]`);
  for (const n of data.targets) rails[`target:${n.key}`] = q(`[data-rail="${CSS.escape(`target:${n.key}`)}"]`);
  const shareNode = (kind, f) => {
    const node = q(`[data-flow-share="${CSS.escape(`${kind}|${f.from}|${f.to}`)}"]`);
    return node ? Object.assign(node, { flowKey: `${f.from}|${f.to}`, to: f.to }) : null;
  };
  const sourceShares = data.flows.filter((f) => f.from === data.tracked.from && f.value > 0).map((f) => shareNode("source", f));
  for (const f of data.flows) {
    const node = shareNode("source", f);
    if (node && !sourceShares.includes(node)) node.style.display = "none";
  }
  // A share too small to be written carries no text, and takes no seat.
  const targetShares = data.flows.filter((f) => data.focus.includes(f.to)).map((f) => shareNode("target", f)).filter((node) => node && node.textContent.trim() !== "");
  root.__sankey = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    order,
    labels,
    rails,
    clips: { source: q('[data-clip="source"]'), web: q('[data-clip="web"]') },
    sourceShares,
    targetShares,
    valueH: sourceShares[0].getBoundingClientRect().height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
