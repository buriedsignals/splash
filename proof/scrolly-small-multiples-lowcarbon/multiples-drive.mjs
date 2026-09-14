// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   grow     the second year's bars growing, every change written                                         0..1
//   byFrom   the panels travelling from alphabetical order to the order of their first-year level         0..1
//   byGain   the panels travelling on to the order of their gain                                          0..1
//   scatter  every panel condensed into one point: its first-year level across, its gain up; the fitted
//            line drawn                                                                                    0..1
//   ends     the two extremes in the accent, every other panel stepping back                               0..1
//   note     which header note is read                                                                     0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: six panels a row on a wide stage, four on a narrow
// one; one scale, 0 to 100 %, for every panel's bars.

export function applyMultiplesState(root, state, context) {
  const carrier = root.querySelector("[data-multiples]");
  if (!carrier) return;
  if (context.resized || !root.__multiples) seatMultiples(root, carrier);
  const c = root.__multiples;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.panels.length;
  const cols = SW < 560 ? 4 : 6;
  const rows = Math.ceil(n / cols);
  const cellW = SW / cols;
  const cellH = SH / rows;
  const grow = ease(clamp(state.grow));
  const byFrom = ease(clamp(state.byFrom));
  const byGain = ease(clamp(state.byGain));
  const scatter = ease(clamp(state.scatter));
  const ends = clamp(state.ends);

  // The panel's own furniture: its name above, its change below, the gap between rows twice the gaps inside one.
  const inner = 6;
  const barTop = c.nameH + inner;
  const barH = Math.max(12, cellH - c.nameH - c.valueH - inner * 2 - Math.max(14, cellH * 0.14));
  const barW = Math.min(36, cellW * 0.2);
  const pairW = barW * 2 + barW * 0.5;

  // ── the scatter's own frame ──
  const padL = c.yTickW + 10;
  const padB = c.tickH + c.nameAxisH + 12;
  const sx0 = padL;
  const sx1 = SW - 16;
  const sy0 = c.nameAxisH + 12;
  const sy1 = SH - padB;
  const px = (v) => sx0 + (v / 100) * (sx1 - sx0);
  const py = (v) => sy1 - (v / c.axes.yMax) * (sy1 - sy0);
  const axesOn = clamp((scatter - 0.5) * 2);
  c.axesGroup.setAttribute("opacity", String(axesOn));
  set(c.xAxis, { x1: sx0, x2: sx1, y1: sy1, y2: sy1 });
  set(c.yAxis, { x1: sx0, x2: sx0, y1: sy0, y2: sy1 });
  const [slope, intercept] = c.fit;
  set(c.fitLine, { x1: px(0), y1: py(intercept), x2: px(100), y2: py(intercept + slope * 100) });
  for (const t of c.xTicks) Object.assign(t.node.style, { left: `${px(t.value)}px`, top: `${sy1 + 4}px`, transform: "translateX(-50%)", opacity: String(axesOn) });
  for (const t of c.yTicks) Object.assign(t.node.style, { left: `${sx0 - 6}px`, top: `${py(t.value)}px`, transform: "translate(-100%, -50%)", opacity: String(axesOn) });
  Object.assign(c.xName.style, { left: `${sx1}px`, top: `${sy1 + c.tickH + 6}px`, transform: "translateX(-100%)", opacity: String(axesOn) });
  Object.assign(c.yName.style, { left: `${sx0}px`, top: "0px", opacity: String(axesOn) });

  const slotOf = (order, i) => order.indexOf(i);
  c.panels.forEach((p, i) => {
    const s0 = slotOf(c.orders[0], i);
    const s1 = slotOf(c.orders[1], i);
    const s2 = slotOf(c.orders[2], i);
    const cx = (s) => (s % cols) * cellW + cellW / 2;
    const cy = (s) => Math.floor(s / cols) * cellH;
    const left = lerp(lerp(cx(s0), cx(s1), byFrom), cx(s2), byGain);
    const top = lerp(lerp(cy(s0), cy(s1), byFrom), cy(s2), byGain);
    const kept = (p.thread ? 1 : 1 - 0.65 * ends) * (1 - scatter);
    const baseY = top + barTop + barH;
    const fromH = (p.from / 100) * barH;
    const toH = (p.to / 100) * barH * grow;
    const x0 = left - pairW / 2;
    set(p.base, { x1: x0 - 4, x2: x0 + pairW + 4, y1: baseY, y2: baseY, opacity: kept });
    set(p.fromBar, { x: x0, y: baseY - fromH, width: barW, height: fromH, opacity: kept });
    set(p.toBar, { x: x0 + barW * 1.5, y: baseY - toH, width: barW, height: toH, opacity: kept });

    // In the scatter the panel is a point; the two extremes keep their names beside it.
    const dotX = lerp(left, px(p.from), scatter);
    const dotY = lerp(baseY - barH / 2, py(p.to - p.from), scatter);
    set(p.dot, { cx: dotX, cy: dotY, opacity: scatter });
    const nameOn = p.thread ? 1 : 1 - scatter;
    // A name wider than its cell is set smaller rather than run into its neighbour's; beside a point, it turns to
    // the left when the right would push it off the stage.
    const nameW = p.name.offsetWidth;
    const fit = Math.min(1, (cellW - 8) / nameW);
    const shrink = lerp(fit, 1, scatter);
    const besideX = dotX + 8 + nameW > SW ? dotX - 8 - nameW : dotX + 8;
    const nameX = lerp(left - (nameW * shrink) / 2, besideX, scatter);
    const nameY = lerp(top, dotY - c.nameH / 2, scatter);
    Object.assign(p.name.style, { left: `${nameX}px`, top: `${nameY}px`, transform: `scale(${shrink})`, transformOrigin: "0 0", opacity: String(nameOn * (p.thread ? 1 : 1 - 0.65 * ends)) });
    Object.assign(p.delta.style, { left: `${left - p.delta.offsetWidth / 2}px`, top: `${baseY + 4}px`, opacity: String(grow * kept) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function seatMultiples(root, carrier) {
  const data = root.__multiplesData || (root.__multiplesData = JSON.parse(carrier.getAttribute("data-multiples")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const panels = data.panels.map((p) => {
    const g = q(`[data-panel="${CSS.escape(p.key)}"]`);
    return {
      ...p,
      base: g.querySelector('[data-part="base"]'),
      fromBar: g.querySelector('[data-part="from"]'),
      toBar: g.querySelector('[data-part="to"]'),
      dot: g.querySelector('[data-part="dot"]'),
      name: q(`[data-name="${CSS.escape(p.key)}"]`),
      delta: q(`[data-delta="${CSS.escape(p.key)}"]`),
    };
  });
  const xTicks = data.axes.xTicks.map((value) => ({ value, node: q(`[data-x-tick="${value}"]`) }));
  const yTicks = data.axes.yTicks.map((value) => ({ value, node: q(`[data-y-tick="${value}"]`) }));
  root.__multiples = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    panels,
    axesGroup: q('[data-part="scatter-axes"]'),
    xAxis: q('[data-part="x-axis"]'),
    yAxis: q('[data-part="y-axis"]'),
    fitLine: q('[data-part="fit"]'),
    xTicks,
    yTicks,
    xName: q('[data-part="x-name"]'),
    yName: q('[data-part="y-name"]'),
    nameH: h(panels[0].name),
    valueH: h(panels[0].delta),
    tickH: h(xTicks[0].node),
    yTickW: Math.max(...yTicks.map((t) => t.node.getBoundingClientRect().width)),
    nameAxisH: h(q('[data-part="x-name"]')),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
