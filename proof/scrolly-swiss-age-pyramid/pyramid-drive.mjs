// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   men      the men's bars growing band by band, youngest first                                         0..bands
//   women    the women's bars, the same way                                                              0..bands
//   diff     every band turned into its own difference: the surplus sex's bar alone, on a scale fitted to
//            the largest difference                                                                       0..1
//   cross    the band where women first outnumber men marked, with a rule and its label                  0..1
//   old      the oldest bands measured as a ratio of women to men, every other band stepping back        0..1
//   note     which header note is read                                                                   0..4
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: one band a row, the ages in a centre gutter, one
// mirrored zero-anchored scale on both sides.

export function applyPyramidState(root, state, context) {
  const carrier = root.querySelector("[data-pyramid]");
  if (!carrier) return;
  if (context.resized || !root.__pyramid) seatPyramid(root, carrier);
  const c = root.__pyramid;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.bands.length;
  const diff = ease(clamp(state.diff));
  const old = clamp(state.old);
  const cross = clamp(state.cross);
  const top = c.headH + 6;
  const bottom = SH - c.tickH - 8;
  const rowH = (bottom - top) / n;
  const barH = Math.max(3, rowH * 0.8);
  const cx = SW / 2;
  const gutter = c.ageW + 12;
  const leftEdge = cx - gutter / 2;
  const rightEdge = cx + gutter / 2;
  const halfW = Math.min(leftEdge, SW - rightEdge) - 4;
  const maxPop = Math.max(...c.bands.flatMap((b) => [b.male, b.female]));
  const maxDiff = Math.max(...c.bands.map((b) => Math.abs(b.female - b.male)));
  const scale = lerp(maxPop, maxDiff * 1.15, diff);
  const px = (v) => (v / scale) * halfW;
  const rowY = (i) => bottom - (i + 1) * rowH;

  // The side names over each half; in the difference, each names the surplus it carries.
  Object.assign(c.men.style, { left: `${leftEdge - halfW / 2}px`, top: "0px", transform: "translateX(-50%)", opacity: String(1 - diff) });
  Object.assign(c.women.style, { left: `${rightEdge + halfW / 2}px`, top: "0px", transform: "translateX(-50%)", opacity: String(1 - diff) });
  Object.assign(c.menSurplus.style, { left: `${leftEdge - halfW / 2}px`, top: "0px", transform: "translateX(-50%)", opacity: String(diff) });
  Object.assign(c.womenSurplus.style, { left: `${rightEdge + halfW / 2}px`, top: "0px", transform: "translateX(-50%)", opacity: String(diff) });

  const grid = (group, value, on) => {
    const lines = group.querySelectorAll("line");
    set(lines[0], { x1: leftEdge - px(value), x2: leftEdge - px(value), y1: top, y2: bottom, opacity: on * (px(value) <= halfW + 1 ? 1 : 0) });
    set(lines[1], { x1: rightEdge + px(value), x2: rightEdge + px(value), y1: top, y2: bottom, opacity: on * (px(value) <= halfW + 1 ? 1 : 0) });
  };
  // A narrow stage writes only each scale's largest tick: three numbers a side ran into each other.
  const narrow = SW < 560;
  const tickLabel = (pair, value, on, largest) => {
    const fits = px(value) <= halfW + 1 && (!narrow || value === largest) ? 1 : 0;
    Object.assign(pair[0].style, { left: `${leftEdge - px(value)}px`, top: `${bottom + 4}px`, transform: "translateX(-50%)", opacity: String(on * fits) });
    Object.assign(pair[1].style, { left: `${rightEdge + px(value)}px`, top: `${bottom + 4}px`, transform: "translateX(-50%)", opacity: String(on * fits) });
  };
  c.ticks.forEach((t) => {
    grid(t.group, t.value, 1 - diff);
    tickLabel(t.labels, t.value, 1 - diff, c.ticks[c.ticks.length - 1].value);
  });
  c.diffTicks.forEach((t) => {
    grid(t.group, t.value, diff);
    tickLabel(t.labels, t.value, diff, c.diffTicks[c.diffTicks.length - 1].value);
  });

  c.bands.forEach((b, i) => {
    const y = rowY(i) + (rowH - barH) / 2;
    const d = b.female - b.male;
    const menV = lerp(b.male, Math.max(0, -d), diff) * ease(clamp(state.men - i));
    const womenV = lerp(b.female, Math.max(0, d), diff) * ease(clamp(state.women - i));
    const isOld = c.oldest.includes(b.band);
    const kept = isOld ? 1 : 1 - 0.75 * old;
    set(b.maleBar, { x: leftEdge - px(menV), y, width: px(menV), height: barH, opacity: kept });
    set(b.femaleBar, { x: rightEdge, y, width: px(womenV), height: barH, opacity: kept });
    Object.assign(b.age.style, { left: `${cx}px`, top: `${rowY(i) + rowH / 2}px`, transform: "translate(-50%, -50%)", opacity: String(isOld ? 1 : 1 - 0.6 * old) });
    Object.assign(b.ratio.style, { left: `${rightEdge + px(womenV) + 8}px`, top: `${rowY(i) + rowH / 2}px`, transform: "translateY(-50%)", opacity: String(isOld ? old : 0) });
    // In the difference, the crossing band writes its own difference beside its bar.
    const diffOn = b.band === c.crossing ? diff * cross : 0;
    Object.assign(b.diffLabel.style, { left: `${rightEdge + px(womenV) + 8}px`, top: `${rowY(i) + rowH / 2}px`, transform: "translateY(-50%)", opacity: String(diffOn) });
  });

  // The crossing: a rule under the first band where women outnumber men, its label on the women's side.
  const ci = c.bands.findIndex((b) => b.band === c.crossing);
  const ruleY = rowY(ci) + rowH;
  set(c.crossLine, { x1: leftEdge - halfW, x2: rightEdge + halfW, y1: ruleY, y2: ruleY, opacity: cross });
  const lw = c.crossLabel.offsetWidth;
  Object.assign(c.crossLabel.style, { left: `${Math.min(SW - lw, rightEdge + halfW * 0.35)}px`, top: `${ruleY + 4}px`, opacity: String(cross * (1 - old)) });

  c.notes.forEach((node, k) => {
    if (node) node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatPyramid(root, carrier) {
  const data = root.__pyramidData || (root.__pyramidData = JSON.parse(carrier.getAttribute("data-pyramid")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const bands = data.bands.map((b) => {
    const g = q(`[data-band="${b.band}"]`);
    return {
      ...b,
      maleBar: g.querySelector('[data-part="male"]'),
      femaleBar: g.querySelector('[data-part="female"]'),
      age: q(`[data-age="${b.band}"]`),
      ratio: q(`[data-ratio="${b.band}"]`),
      diffLabel: q(`[data-diff="${b.band}"]`),
    };
  });
  const tickSet = (values, groupAttr, labelAttr) =>
    values.map((value) => ({
      value,
      group: q(`[${groupAttr}="${value}"]`),
      labels: [q(`[${labelAttr}="left:${value}"]`), q(`[${labelAttr}="right:${value}"]`)],
    }));
  const men = q('[data-part="men"]');
  root.__pyramid = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    bands,
    ticks: tickSet(data.ticks, "data-grid", "data-tick"),
    diffTicks: tickSet(data.diffTicks, "data-diff-grid", "data-diff-tick"),
    men,
    women: q('[data-part="women"]'),
    menSurplus: q('[data-part="men-surplus"]'),
    womenSurplus: q('[data-part="women-surplus"]'),
    crossLine: q('[data-part="cross"]'),
    crossLabel: q('[data-part="cross-label"]'),
    headH: h(men),
    tickH: h(q("[data-tick]")),
    ageW: Math.max(...bands.map((b) => b.age.getBoundingClientRect().width)),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
