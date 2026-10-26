// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   group    every year's point travelling from its place in time to its decade's column                0..1
//   box      each column closed into its box — quartiles, median, whiskers — the points stepping back
//            except the outliers                                                                        0..1
//   medians  the medians joined and written                                                             0..1
//   spread   the widest decade and the partial last one read: their extent written, the rest back       0..1
//   rule     the whisker rule written on the plate                                                      0..1
//   note     which header note is read                                                                  0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: one value scale, fitted, for every picture; in time a
// point's x is its year, in a column it sits at a small offset from the column's centre so the years stay apart.

export function applyBoxplotState(root, state, context) {
  const carrier = root.querySelector("[data-boxplot]");
  if (!carrier) return;
  if (context.resized || !root.__boxplot) seatBoxplot(root, carrier);
  const c = root.__boxplot;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const group = ease(clamp(state.group));
  const box = ease(clamp(state.box));
  const medians = clamp(state.medians);
  const spread = clamp(state.spread);
  const narrow = SW < 560;

  const x0 = c.tickW + 10;
  const x1 = SW - 6;
  const top = c.valueH + 8;
  const bottom = SH - c.decadeH - c.nH - 12;
  const [lo, hi] = c.domain;
  const Y = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const years = c.points.map((p) => p[0]);
  const yFirst = Math.min(...years);
  const yLast = Math.max(...years);
  const XT = (y) => x0 + ((y - yFirst) / (yLast - yFirst)) * (x1 - x0);
  const n = c.boxes.length;
  const colW = (x1 - x0) / n;
  const XC = (i) => x0 + (i + 0.5) * colW;
  const boxW = Math.min(46, colW * 0.55);

  c.grid.forEach(({ value, line, label }) => {
    set(line, { x1: x0, x2: x1, y1: Y(value), y2: Y(value) });
    Object.assign(label.style, { left: `${x0 - 8}px`, top: `${Y(value)}px`, transform: "translate(-100%, -50%)" });
  });
  c.xTicks.forEach((t) => Object.assign(t.node.style, { left: `${XT(t.year)}px`, top: `${bottom + 6}px`, transform: "translateX(-50%)", opacity: String(1 - group) }));

  // Which boxes the spread card reads: the widest extent, and the partial last decade.
  const focusOf = (i) => (spread > 0 ? (c.focus.includes(i) ? 1 : 1 - 0.7 * spread) : 1);

  c.boxes.forEach((b, i) => {
    const cx = XC(i);
    const kept = focusOf(i);
    set(b.group, { opacity: box * kept });
    set(b.whisker, { x1: cx, x2: cx, y1: Y(b.lo), y2: Y(b.hi) });
    set(b.capLo, { x1: cx - boxW / 4, x2: cx + boxW / 4, y1: Y(b.lo), y2: Y(b.lo) });
    set(b.capHi, { x1: cx - boxW / 4, x2: cx + boxW / 4, y1: Y(b.hi), y2: Y(b.hi) });
    const h = Y(b.q1) - Y(b.q3);
    set(b.iqr, { x: cx - boxW / 2, y: Y(b.q3) + (h * (1 - box)) / 2, width: boxW, height: Math.max(0, h * box) });
    set(b.medianRule, { x1: cx - boxW / 2, x2: cx + boxW / 2, y1: Y(b.median), y2: Y(b.median) });
    Object.assign(b.decadeNode.style, { left: `${cx}px`, top: `${bottom + 6}px`, transform: "translateX(-50%)", opacity: String(group * kept) });
    Object.assign(b.nNode.style, { left: `${cx}px`, top: `${bottom + 6 + c.decadeH}px`, transform: "translateX(-50%)", opacity: String(group * kept * (b.n < 10 ? 1 : narrow ? 0 : 0.7)) });
    Object.assign(b.medianNode.style, { left: `${cx + boxW / 2 + 4}px`, top: `${Y(b.median)}px`, transform: "translateY(-50%)", opacity: String(medians * (narrow && i % 2 ? 0 : 1)) });
    const spreadOn = c.focus.includes(i) ? spread : 0;
    Object.assign(b.spreadNode.style, { left: `${cx}px`, top: `${Y(b.hi) - 8}px`, transform: "translate(-50%, -100%)", opacity: String(spreadOn) });
  });

  // The medians joined, drawn from left to right as the card arrives.
  const pts = c.boxes.map((b, i) => [XC(i), Y(b.median)]);
  set(c.medianLine, { d: `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`, opacity: medians });

  // The years: in time, then in columns; an outlier stays drawn once the boxes close.
  const r = narrow ? 2.4 : 3.2;
  c.points.forEach(([year, value, decade, outlier], k) => {
    const i = c.decadeIndex.get(decade);
    const slot = year - decade;
    const offset = ((slot % 2 ? 1 : -1) * (Math.floor(slot / 2) + 0.5) * Math.min(colW * 0.4, boxW) * 0.18);
    const x = lerp(XT(year), XC(i) + offset, group);
    const kept = focusOf(i);
    const alpha = outlier ? 1 : 1 - 0.85 * box;
    set(c.pointNodes[k], { cx: x, cy: Y(value), r: outlier ? r * 1.2 : r, opacity: alpha * kept });
  });

  // The peak year named on the timeline; the outlier named once the boxes close.
  const peak = c.points.find((p) => p[0] === c.peakYear);
  Object.assign(c.peak.style, { left: `${XT(peak[0])}px`, top: `${Y(peak[1]) - 8}px`, transform: "translate(-50%, -100%)", opacity: String(1 - group) });
  const out = c.points.find((p) => p[3]);
  if (out) {
    const i = c.decadeIndex.get(out[2]);
    Object.assign(c.outlier.style, { left: `${XC(i) + boxW / 2 + 6}px`, top: `${Y(out[1])}px`, transform: "translateY(-50%)", opacity: String(clamp((box - 0.6) / 0.4) * (1 - medians) * focusOf(i)) });
  }
  Object.assign(c.rule.style, { left: `${x1}px`, top: `${top - 4}px`, transform: "translate(-100%, -100%)", opacity: String(clamp(state.rule)) });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatBoxplot(root, carrier) {
  const data = root.__boxplotData || (root.__boxplotData = JSON.parse(carrier.getAttribute("data-boxplot")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const boxes = data.boxes.map((b) => {
    const g = q(`[data-box="${b.decade}"]`);
    return {
      ...b,
      group: g,
      whisker: g.querySelector('[data-part="whisker"]'),
      capLo: g.querySelector('[data-part="cap-lo"]'),
      capHi: g.querySelector('[data-part="cap-hi"]'),
      iqr: g.querySelector('[data-part="iqr"]'),
      medianRule: g.querySelector('[data-part="median"]'),
      decadeNode: q(`[data-decade="${b.decade}"]`),
      nNode: q(`[data-n="${b.decade}"]`),
      medianNode: q(`[data-median-label="${b.decade}"]`),
      spreadNode: q(`[data-spread="${b.decade}"]`),
    };
  });
  // The spread card reads the boxes the beat marks: the widest decade, and the partial last one.
  const focus = boxes.map((b, i) => (b.focus ? i : -1)).filter((i) => i >= 0);
  const ticks = data.ticks.map((value) => ({ value, line: q(`[data-grid="${value}"]`), label: q(`[data-tick="${value}"]`) }));
  root.__boxplot = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    boxes,
    focus,
    decadeIndex: new Map(boxes.map((b, i) => [b.decade, i])),
    grid: ticks,
    xTicks: data.xTicks.map((year) => ({ year, node: q(`[data-x-tick="${year}"]`) })),
    pointNodes: data.points.map((p) => q(`[data-point="${p[0]}"]`)),
    medianLine: q('[data-part="median-line"]'),
    peak: q('[data-part="peak"]'),
    outlier: q('[data-part="outlier"]'),
    rule: q('[data-part="rule"]'),
    tickW: Math.max(...ticks.map((t) => t.label.getBoundingClientRect().width)),
    valueH: h(q('[data-part="peak"]')) * 2,
    decadeH: h(boxes[0].decadeNode),
    nH: h(boxes[0].nNode),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
