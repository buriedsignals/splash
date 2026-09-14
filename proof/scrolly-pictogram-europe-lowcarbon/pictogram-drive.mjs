// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   mode     0: every square set down at its own share on a 0–100 % axis; 1: the squares counted in blocks   0..1
//   floors   the two floors drawn across the axis                                                           0..1
//   ends     the two ends of the axis named                                                                 0..1
//   counts   each block's count and name                                                                    0..1
//   middle   the middle block alone, its countries named; the two ends step back                            0..1
//   sides    the two ends alone; the middle steps back                                                      0..1
//   classes  each square takes the fill of its class                                                        0..1
//   key      the classes' breaks, and the country not drawn                                                 0..1
//   note     which header note is read                                                                      0..4
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint. On the axis a square sits in the column of its share and
// stacks on the squares already there, so a crowd of countries is a tower; in the blocks the row width is a rung of
// the static plate's ladder — twenty, sixteen, thirteen, ten or eight — the one that gives the largest square.

export function applyPictogramState(root, state, context) {
  const carrier = root.querySelector("[data-pictogram]");
  if (!carrier) return;
  if (context.resized || !root.__picto) seatPictogram(root, carrier);
  const c = root.__picto;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const W = c.stage.clientWidth;
  const H = c.stage.clientHeight;
  if (!(W > 0 && H > 0)) return;

  const mode = clamp(state.mode);
  const axisOn = clamp(1 - mode * 2);
  const n = c.units.length;

  // ── the axis layout ──
  // Forty-one columns, one per 2.5 points of share — twenty-one, one per 5 points, on a narrow stage: a square as large
  // as the axis allows, and neighbours that close stack rather than touch.
  const cols = W < 560 ? 21 : 41;
  const ag = 3;
  const as = Math.max(4, Math.floor((W - c.endPad) / cols) - ag);
  const axisY = H - c.tickH - 6;
  const colOf = (share) => Math.round((share / 100) * (cols - 1));
  const xOfShare = (share) => (share / 100) * (cols - 1) * (as + ag) + as / 2;
  const heights = new Map();
  const onAxis = new Map();
  for (const u of [...c.units].sort((a, b) => a.share - b.share)) {
    const col = colOf(u.share);
    const k = heights.get(col) ?? 0;
    heights.set(col, k + 1);
    onAxis.set(u.key, { x: col * (as + ag), y: axisY - (k + 1) * (as + ag) + ag, s: as });
  }

  Object.assign(c.axis.style, { left: "0px", top: `${axisY}px`, width: `${(cols - 1) * (as + ag) + as}px`, opacity: String(axisOn) });
  for (const t of c.ticks) Object.assign(t.node.style, { left: `${xOfShare(t.value)}px`, top: `${axisY + 3}px`, transform: "translateX(-50%)", opacity: String(axisOn) });
  const lowest = c.units.reduce((a, b) => (b.share < a.share ? b : a));
  const highest = c.units.reduce((a, b) => (b.share > a.share ? b : a));
  // An end's name sits above every tower it spans, so it never lies on a square.
  const clearTop = (x0, x1) => {
    let k = 0;
    for (const [col, height] of heights) {
      const cx0 = col * (as + ag);
      if (cx0 + as > x0 && cx0 < x1) k = Math.max(k, height);
    }
    return axisY - k * (as + ag) - 4;
  };
  // A floor's number sits on the tick row, under the axis; a tick it would touch steps back while it is read. Its rule
  // rises only as high as the towers beside it, so it never crosses an end's name.
  const floorsOn = clamp(state.floors) * axisOn;
  const labelBoxes = c.floors.map((f) => {
    const x = xOfShare(f.value);
    const w = f.label.offsetWidth;
    const top = clearTop(x - as - ag, x + as + ag) - 6;
    Object.assign(f.rule.style, { left: `${x}px`, top: `${top}px`, height: `${axisY - top}px`, opacity: String(floorsOn) });
    Object.assign(f.label.style, { left: `${x}px`, top: `${axisY + 3}px`, transform: "translateX(-50%)", opacity: String(floorsOn) });
    return [x - w / 2 - 4, x + w / 2 + 4];
  });
  for (const t of c.ticks) {
    const x = xOfShare(t.value);
    const w = t.node.offsetWidth;
    const touched = labelBoxes.some(([x0, x1]) => x + w / 2 > x0 && x - w / 2 < x1);
    t.node.style.opacity = String(axisOn * (touched ? 1 - clamp(state.floors) : 1));
  }
  const lowX = onAxis.get(lowest.key).x;
  const lowW = c.lowEnd.offsetWidth;
  Object.assign(c.lowEnd.style, { left: `${lowX}px`, top: `${clearTop(lowX, lowX + lowW)}px`, transform: "translateY(-100%)", opacity: String(clamp(state.ends) * axisOn) });
  const highX = onAxis.get(highest.key).x + as;
  const highW = c.highEnd.offsetWidth;
  Object.assign(c.highEnd.style, { left: `${highX}px`, top: `${clearTop(highX - highW, highX)}px`, transform: "translate(-100%, -100%)", opacity: String(clamp(state.ends) * axisOn) });

  // ── the block layout ──
  c.key.style.width = `${W}px`;
  const keyH = c.key.offsetHeight;
  const keyTop = H - keyH - 14;
  c.middleNames.style.width = `${W}px`;
  const namesH = c.middleNames.offsetHeight;
  const blockGap = 14;
  const gg = 4;
  // A block's name wraps under its count on a narrow stage.
  for (const b of c.blocks) {
    b.label.style.width = `${W}px`;
    b.labelH = b.label.offsetHeight;
  }
  const room = keyTop - 14 - c.blocks.reduce((sum, b) => sum + b.labelH + 4, 0) - (c.blocks.length - 1) * blockGap - namesH - 4;
  let best = null;
  for (const perRow of [20, 16, 13, 10, 8]) {
    const rows = c.blocks.reduce((s, b) => s + Math.ceil(b.members.length / perRow), 0);
    const cell = Math.min(44, (W - (perRow - 1) * gg) / perRow, room / rows - gg);
    if (!best || cell > best.cell) best = { perRow, cell };
  }
  const { perRow, cell } = best;
  const inGrid = new Map();
  let yRun = 0;
  c.blocks.forEach((b, bi) => {
    Object.assign(b.label.style, { left: "0px", top: `${yRun}px` });
    b.top = yRun;
    yRun += b.labelH + 4;
    b.members.forEach((u, k) => {
      inGrid.set(u.key, { x: (k % perRow) * (cell + gg), y: yRun + Math.floor(k / perRow) * (cell + gg), s: cell });
    });
    yRun += Math.ceil(b.members.length / perRow) * (cell + gg) - gg;
    if (bi === c.middle) {
      Object.assign(c.middleNames.style, { left: "0px", top: `${yRun + 4}px` });
      yRun += namesH + 4;
    }
    yRun += blockGap;
  });
  // The key sits at the foot of the stage, below the resting card, whatever height the blocks take.
  Object.assign(c.key.style, { left: "0px", top: `${keyTop + 14}px`, opacity: String(clamp(state.key)) });

  // ── the squares ──
  const middle = clamp(state.middle);
  const sides = clamp(state.sides);
  const classes = clamp(state.classes);
  c.order.forEach((u, rank) => {
    const t = ease(clamp(mode * 1.5 - (0.5 * rank) / (n - 1)));
    const a = onAxis.get(u.key);
    const g = inGrid.get(u.key);
    const s = lerp(a.s, g.s, t);
    const isMiddle = u.block === c.middle;
    const kept = isMiddle ? 1 - 0.8 * sides : 1 - 0.8 * middle;
    Object.assign(u.node.style, {
      left: `${lerp(a.x, g.x, t)}px`,
      top: `${lerp(a.y, g.y, t)}px`,
      width: `${s}px`,
      height: `${s}px`,
      background: mixHex(c.neutral, c.fills[u.index], classes),
      opacity: String(kept),
    });
  });

  const labelsOn = clamp(state.counts) * clamp((mode - 0.6) / 0.4);
  c.blocks.forEach((b, bi) => {
    const kept = bi === c.middle ? 1 - 0.8 * sides : 1 - 0.8 * middle;
    b.label.style.opacity = String(labelsOn * kept);
  });
  c.middleNames.style.opacity = String(middle * clamp((mode - 0.6) / 0.4));

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatPictogram(root, carrier) {
  const data = root.__pictoData || (root.__pictoData = JSON.parse(carrier.getAttribute("data-pictogram")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const units = data.units.map((u, index) => ({ ...u, index, node: q(`[data-unit="${u.key}"]`) }));
  const blocks = Array.from({ length: data.blockCount }, (_, i) => ({
    label: q(`[data-block-label="${i}"]`),
    members: units.filter((u) => u.block === i).sort((a, b) => b.share - a.share),
  }));
  const ticks = data.ticks.map((value) => ({ value, node: q(`[data-tick="${value}"]`) }));
  const lowEnd = q('[data-part="low-end"]');
  const highEnd = q('[data-part="high-end"]');
  root.__picto = {
    ...data,
    stage,
    units,
    order: [...units].sort((a, b) => b.share - a.share),
    blocks,
    middle: 1,
    axis: q('[data-part="axis"]'),
    ticks,
    tickH: h(ticks[0].node),
    // The last tick is centred on the axis's end: the axis stops short by half its width.
    endPad: ticks[ticks.length - 1].node.getBoundingClientRect().width / 2,
    floors: data.floors.map((value) => {
      const el = q(`[data-floor="${value}"]`);
      return { value, rule: el.querySelector('[data-part="floor-rule"]'), label: el.querySelector('[data-part="floor-label"]') };
    }),
    lowEnd,
    highEnd,
    middleNames: q('[data-part="middle-names"]'),
    key: q('[data-part="key"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
