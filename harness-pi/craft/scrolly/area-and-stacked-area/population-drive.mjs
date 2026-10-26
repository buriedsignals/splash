// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the playhead: the area filled up to this year, each billion crossed marked as it is reached  first..last
//   gaps     the area giving way to the years each billion took, one bar a billion                          0..1
//   rate     the area's height turning from the population into its annual growth rate                     0..1
//   last     the last year's population written at the edge                                                0..1
//   note     which header note is read                                                                     0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: one column a year, 0 to 9 billion up; the rate reuses
// the same columns on its own 0–2.5 % scale, so the outline morphs from one reading to the other.

export function applyPopulationState(root, state, context) {
  const carrier = root.querySelector("[data-population]");
  if (!carrier) return;
  if (context.resized || !root.__population) seatPopulation(root, carrier);
  const c = root.__population;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const first = c.years[0];
  const last = c.years[c.years.length - 1];
  const head = Math.max(first, Math.min(last, state.year));
  const gaps = ease(clamp(state.gaps));
  const rate = ease(clamp(state.rate));
  const chart = 1 - gaps;

  const x0 = c.tickW + 10;
  const x1 = SW - c.lastW - 16;
  const top = c.labelH + 6;
  const bottom = SH - c.tickH - 8;
  const X = (y) => x0 + ((y - first) / (last - first)) * (x1 - x0);
  const YP = (v) => bottom - (v / 9) * (bottom - top);
  const YR = (v) => bottom - (v / 2.5) * (bottom - top);

  // ── grids and ticks: billions for the stock, percentages for the rate ──
  c.billionGrid.forEach((line, b) => set(line, { x1: x0, x2: x1, y1: YP(b), y2: YP(b), opacity: chart * (1 - rate) }));
  c.billionTicks.forEach((node, b) => Object.assign(node.style, { left: `${x0 - 8}px`, top: `${YP(b)}px`, transform: "translate(-100%, -50%)", opacity: String(chart * (1 - rate)) }));
  c.rateGrid.forEach((line, r) => set(line, { x1: x0, x2: x1, y1: YR(r), y2: YR(r), opacity: chart * rate }));
  c.rateTicks.forEach((node, r) => Object.assign(node.style, { left: `${x0 - 8}px`, top: `${YR(r)}px`, transform: "translate(-100%, -50%)", opacity: String(chart * rate) }));
  c.xTicks.forEach((t) => Object.assign(t.node.style, { left: `${X(t.year)}px`, top: `${bottom + 5}px`, transform: "translateX(-50%)", opacity: String(chart) }));

  // ── the area, up to the playhead; its height morphing from population to rate ──
  const pts = [];
  for (let i = 0; i < c.years.length; i++) {
    const y = c.years[i];
    if (y > head) break;
    const r = c.rate[i] ?? c.rate[i + 1];
    pts.push([X(y), lerp(YP(c.population[i]), YR(Math.max(0, r)), rate)]);
  }
  if (pts.length) {
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
    set(c.edge, { d: line, opacity: chart });
    set(c.area, { d: `${line}L${pts[pts.length - 1][0].toFixed(1)} ${bottom}L${x0} ${bottom}Z`, opacity: chart });
  }

  // ── the billions crossed: a level line to the crossing, a dot, the year ──
  const crossOn = chart * (1 - rate);
  const reached = c.crossings.filter((k) => head >= k.year);
  const latest = reached[reached.length - 1];
  c.crossings.forEach((k) => {
    const on = head >= k.year ? crossOn : 0;
    set(k.group, { opacity: on });
    set(k.level, { x1: x0, x2: X(k.year), y1: YP(k.billion), y2: YP(k.billion) });
    set(k.dot, { cx: X(k.year), cy: YP(k.billion) });
    // Named left of its dot, above its level; the latest crossing is always named, the earlier ones while they fit.
    const w = k.label.offsetWidth;
    const left = Math.max(x0 + 4, X(k.year) - w - 8);
    Object.assign(k.label.style, { left: `${left}px`, top: `${YP(k.billion) - 3}px`, transform: "translateY(-100%)", opacity: String(on * (k === latest || state.year >= last ? 1 : 0.85)) });
  });

  // The last year's population, at the edge.
  const lastY = YP(c.population[c.population.length - 1]);
  Object.assign(c.last.style, { left: `${X(last) + 8}px`, top: `${lastY}px`, transform: "translateY(-50%)", opacity: String(clamp(state.last) * crossOn * (head >= last ? 1 : 0)) });

  // The rate's peak and its last value.
  const pi = c.years.indexOf(c.peak);
  set(c.peakDot, { cx: X(c.peak), cy: YR(c.rate[pi]), opacity: chart * clamp((rate - 0.6) / 0.4) });
  Object.assign(c.peakLabel.style, { left: `${X(c.peak)}px`, top: `${YR(c.rate[pi]) - 10}px`, transform: "translate(-50%, -100%)", opacity: String(chart * clamp((rate - 0.6) / 0.4)) });
  const rl = c.rate[c.rate.length - 1];
  Object.assign(c.rateLast.style, { left: `${X(last) + 8}px`, top: `${YR(rl)}px`, transform: "translateY(-50%)", opacity: String(chart * clamp((rate - 0.6) / 0.4)) });

  // ── the years each billion took, as bars ──
  const withGap = c.crossings.filter((k) => k.gap !== null);
  const nameW = Math.max(...withGap.map((k) => k.gapName.offsetWidth));
  const valueW = Math.max(...withGap.map((k) => k.gapValue.offsetWidth));
  const bx0 = nameW + 12;
  const bx1 = SW - valueW - 12;
  const maxGap = Math.max(...withGap.map((k) => k.gap));
  const rowH = Math.min(52, (bottom - top) / withGap.length);
  withGap.forEach((k, i) => {
    const cy = top + (i + 0.5) * rowH;
    const w = ((k.gap / maxGap) * (bx1 - bx0)) * gaps;
    set(k.bar, { x: bx0, y: cy - rowH * 0.3, width: Math.max(0, w), height: rowH * 0.6, opacity: gaps });
    Object.assign(k.gapName.style, { left: `${bx0 - 10}px`, top: `${cy}px`, transform: "translate(-100%, -50%)", opacity: String(gaps) });
    Object.assign(k.gapValue.style, { left: `${bx0 + w + 8}px`, top: `${cy}px`, transform: "translateY(-50%)", opacity: String(clamp((gaps - 0.6) / 0.4)) });
  });

  c.unit.style.opacity = String(chart * (1 - rate));
  c.gapUnit.style.opacity = String(gaps);
  c.rateUnit.style.opacity = String(chart * rate);
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatPopulation(root, carrier) {
  const data = root.__populationData || (root.__populationData = JSON.parse(carrier.getAttribute("data-population")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const w = (node) => node.getBoundingClientRect().width;
  const crossings = data.crossings.map((k) => {
    const g = q(`[data-crossing="${k.billion}"]`);
    return {
      ...k,
      group: g,
      level: g.querySelector('[data-part="level"]'),
      dot: g.querySelector('[data-part="dot"]'),
      label: q(`[data-crossing-label="${k.billion}"]`),
      bar: q(`[data-gap-bar="${k.billion}"]`),
      gapName: q(`[data-gap-name="${k.billion}"]`),
      gapValue: q(`[data-gap-value="${k.billion}"]`),
    };
  });
  const billionTicks = Array.from({ length: 9 }, (_, b) => q(`[data-billion-tick="${b}"]`));
  const last = q('[data-part="last"]');
  root.__population = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    area: q('[data-part="area"]'),
    edge: q('[data-part="edge"]'),
    billionGrid: Array.from({ length: 9 }, (_, b) => q(`[data-billion-grid="${b}"]`)),
    billionTicks,
    rateGrid: [0, 1, 2].map((r) => q(`[data-rate-grid="${r}"]`)),
    rateTicks: [0, 1, 2].map((r) => q(`[data-rate-tick="${r}"]`)),
    xTicks: data.xTicks.map((year) => ({ year, node: q(`[data-x-tick="${year}"]`) })),
    crossings,
    last,
    peakDot: q('[data-part="peak"]'),
    peakLabel: q('[data-part="peak-label"]'),
    rateLast: q('[data-part="rate-last"]'),
    tickW: Math.max(...billionTicks.map(w), w(q('[data-rate-tick="2"]'))),
    tickH: h(billionTicks[0]),
    labelH: h(crossings[0].label),
    lastW: Math.max(w(last), w(q('[data-part="rate-last"]'))),
    unit: root.querySelector('[data-part="unit"]'),
    gapUnit: root.querySelector('[data-part="gap-unit"]'),
    rateUnit: root.querySelector('[data-part="rate-unit"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
