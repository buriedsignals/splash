// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   stack    every country's dot falling from its own value on the axis into its bin's column, lowest first  0..1
//   bars     the columns of dots giving way to the bars they add up to                                        0..1
//   cut      the threshold drawn, the dots under it in the accent                                             0..1
//   median   the median drawn                                                                                 0..1
//   tail     the far tail named: 1, the one country furthest out; 2, every one of them                        0..2
//   note     which header note is read                                                                        0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint. A column holds its bin's countries a few to a row, the
// row width chosen so the fullest column fits the plot; a bar is exactly as tall as its column of dots would be.

export function applySpreadState(root, state, context) {
  const carrier = root.querySelector("[data-spread]");
  if (!carrier) return;
  if (context.resized || !root.__spread) seatSpread(root, carrier);
  const c = root.__spread;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const stack = clamp(state.stack);
  const bars = ease(clamp(state.bars));
  const cut = clamp(state.cut);
  const nBins = c.bins.length;
  const maxV = nBins * c.binWidth;
  const baseline = SH - c.tickH - 8;
  const plotTop = c.labelH * 2 + 14;
  const plotH = baseline - plotTop - c.countH - 6;
  const binW = SW / nBins;
  const X = (v) => (Math.min(v, maxV) / maxV) * SW;
  // The row width: the fewest dots a row that still lets the fullest column fit.
  const maxCount = Math.max(...c.bins.map((b) => b.count));
  let perRow = 2;
  while (perRow < 40 && Math.ceil(maxCount / perRow) * (binW / perRow) > plotH) perRow++;
  const cell = binW / perRow;
  const r = Math.max(1.5, cell * 0.36);

  set(c.baseline, { x1: 0, x2: SW, y1: baseline, y2: baseline });
  // The strip of dots: mid-plot on a wide stage; low on a phone, below the resting card.
  const bandH = Math.min(plotH * (narrow ? 0.35 : 0.6), 160);
  const bandMid = narrow ? baseline - bandH / 2 - 12 : plotTop + plotH * 0.55;
  c.bins.forEach((b, i) => {
    // A phone labels every other bin: ten ranges side by side run into each other.
    Object.assign(b.label.style, { left: `${(i + 0.5) * binW}px`, top: `${baseline + 5}px`, transform: "translateX(-50%)", opacity: String(narrow && i % 2 ? 0 : 1) });
    const h = (b.count / perRow) * cell;
    const barH = Math.ceil(b.count / perRow) * cell;
    set(b.bar, { x: i * binW + 1, y: baseline - h, width: binW - 2, height: h, opacity: bars });
    b.top = baseline - lerp(barH, h, bars);
    Object.assign(b.countNode.style, { left: `${(i + 0.5) * binW}px`, top: `${b.top - 3}px`, transform: "translate(-50%, -100%)", opacity: String(stack > 0.95 ? 1 : 0) });
  });

  const order = c.byValue;
  order.forEach((d, rank) => {
    const t = ease(clamp(stack * 1.5 - (0.5 * rank) / order.length));
    const col = d.slot % perRow;
    const row = Math.floor(d.slot / perRow);
    const sx = d.bin * binW + (col + 0.5) * cell;
    const sy = baseline - (row + 0.5) * cell;
    const fx = X(d.value);
    const fy = bandMid + d.jitter * bandH;
    d.x = lerp(fx, sx, t);
    d.y = lerp(fy, sy, t);
    const under = d.value < c.threshold;
    set(d.node, { cx: d.x, cy: d.y, r: lerp(Math.max(2, r * 0.9), r, t), fill: under ? mixHex(c.colours.field, c.colours.cut, cut) : c.colours.field, opacity: (1 - bars) * lerp(0.7, 1, t) });
  });

  // The cut and the median, drawn across the plot at their own values.
  const cx = X(c.threshold);
  set(c.cut, { x1: cx, x2: cx, y1: plotTop - 4, y2: baseline, opacity: cut });
  Object.assign(c.cutLabel.style, { left: `${cx + 8}px`, top: `${plotTop - 4}px`, opacity: String(cut) });
  const mx = X(c.median);
  const median = clamp(state.median);
  set(c.medianLine, { x1: mx, x2: mx, y1: plotTop + c.labelH + 4, y2: baseline, opacity: median });
  Object.assign(c.medianLabel.style, { left: `${cx + 8}px`, top: `${plotTop + c.labelH + 6}px`, opacity: String(median) });

  // The far tail named: above its dot on the axis, or listed above its column once stacked.
  const tail = Math.max(0, Math.min(2, state.tail));
  const byBin = new Map();
  for (const tn of c.tail) {
    const d = c.dots.get(tn.code);
    const list = byBin.get(d.bin) ?? [];
    list.push({ tn, d });
    byBin.set(d.bin, list);
  }
  const furthest = c.tail.reduce((a, b) => (c.dots.get(b.code).value > c.dots.get(a.code).value ? b : a));
  for (const [bin, list] of byBin) {
    list.sort((a, b) => b.d.value - a.d.value);
    list.forEach(({ tn, d }, j) => {
      const on = tn === furthest ? clamp(tail) : narrow ? 0 : clamp(tail - 1);
      const stacked = stack > 0.5;
      const w = tn.node.offsetWidth;
      const x = stacked ? (bin + 0.5) * binW : d.x;
      const y = stacked ? c.bins[bin].top - c.countH - 6 - j * c.lineH : d.y - r - 4 - (j % 2) * c.lineH;
      Object.assign(tn.node.style, { left: `${Math.max(0, Math.min(SW - w, x - w / 2))}px`, top: `${y}px`, transform: "translateY(-100%)", opacity: String(on) });
    });
  }

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatSpread(root, carrier) {
  const data = root.__spreadData || (root.__spreadData = JSON.parse(carrier.getAttribute("data-spread")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const nBins = data.bins.length;
  const binOf = (v) => Math.min(nBins - 1, Math.floor(v / data.binWidth));
  const slots = new Array(nBins).fill(0);
  // A deterministic jitter, so the strip reads the same on every load.
  const jitter = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 - 0.5;
  const byValue = data.countries
    .map(([code, value], i) => ({ code, value, jitter: jitter(i + 1), node: q(`[data-dot="${code}"]`) }))
    .sort((a, b) => a.value - b.value);
  for (const d of byValue) {
    d.bin = binOf(d.value);
    d.slot = slots[d.bin]++;
  }
  const bins = data.bins.map((b) => ({ ...b, bar: q(`[data-bar="${b.lo}"]`), label: q(`[data-bin-label="${b.lo}"]`), countNode: q(`[data-count="${b.lo}"]`) }));
  const tail = data.tail.map((code) => ({ code, node: q(`[data-tail="${code}"]`) }));
  root.__spread = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    baseline: q('[data-part="baseline"]'),
    cut: q('[data-part="cut"]'),
    medianLine: q('[data-part="median"]'),
    cutLabel: q('[data-part="cut-label"]'),
    medianLabel: q('[data-part="median-label"]'),
    byValue,
    dots: new Map(byValue.map((d) => [d.code, d])),
    bins,
    tail,
    tickH: h(bins[0].label),
    countH: h(bins[0].countNode),
    labelH: h(q('[data-part="cut-label"]')),
    lineH: h(tail[0].node),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
