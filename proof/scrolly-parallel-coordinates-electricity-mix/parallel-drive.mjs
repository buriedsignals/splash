// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   span      how many axes stand, from one to all seven; the lines grow toward each axis as it arrives   1..n
//   floorN    the first axis's floor drawn and numbered                                                   0..1
//   floorW    the second axis's floor drawn and numbered                                                  0..1
//   mark      a point above its axis's floor taken in the accent                                          0..1
//   dots      the points where the lines meet the axes                                                    0..1
//   groupN    the countries above the first floor named beside the first axis                             0..1
//   groupW    the countries above the second floor named beside the second axis                           0..1
//   accent    the countries clearing both floors drawn in the accent, thicker                             0..1
//   retreat   every other line stepping back                                                              0..1
//   follow    the accented lines' values written on every axis                                            0..1
//   seats     0: no seated names; 1: the accented lines named at their own highest axis; 2: all sixteen   0..2
//   note      which header note is read (0..5)                                                            0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint. The axes stand as a block whose spacing is capped — a
// fifth of the plot on a wide stage, whose first axes keep to the left third, clear of the resting card; two fifths,
// centred, on a narrow one — until the block needs the whole width: it widens continuously as the scroll adds axes.

export function applyParallelState(root, state, context) {
  const carrier = root.querySelector("[data-parallel]");
  if (!carrier) return;
  if (context.resized || !root.__para) seatParallel(root, carrier);
  const c = root.__para;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.axes.length;
  const span = Math.max(1, Math.min(n, state.span));
  const narrow = SW < 560;
  const accentT = clamp(state.accent);
  const retreat = clamp(state.retreat);
  const follow = clamp(state.follow);
  const mark = clamp(state.mark);

  // ── the block of axes ──
  const insetL = Math.max(c.nameW[0] / 2, c.zeroW + 8, c.valueW + 10);
  const insetR = Math.max(c.nameW[n - 1] / 2, 6);
  const W = SW - insetL - insetR;
  const cx = insetL + W / 2;
  // A wide stage keeps the first axes in its left third, clear of the resting card; a narrow one, whose card spans
  // the whole width, centres them.
  const most = narrow ? 0.4 : 0.2;
  const gap = span <= 1 ? W * most : Math.min(W / (span - 1), W * most);
  const blockW = gap * (span - 1);
  const x0 = narrow ? cx - blockW / 2 : insetL;
  const xs = c.axes.map((_, i) => x0 + gap * i);
  const shown = c.axes.map((_, i) => clamp(span - i));

  // Axis names on as many rows as they need, each on the first row where it clears its neighbour.
  const nameRows = narrow ? 2 : 1;
  const rowEnds = [];
  c.axes.forEach((_, i) => {
    const node = c.axisNames[i];
    const w = c.nameW[i];
    const left = Math.max(0, Math.min(SW - w, xs[i] - w / 2));
    let row = 0;
    while (row < nameRows - 1 && left < (rowEnds[row] ?? -Infinity) + 6) row++;
    rowEnds[row] = left + w;
    Object.assign(node.style, { left: `${left}px`, top: `${row * c.lineH}px`, opacity: String(shown[i]) });
  });
  const ceilTop = nameRows * c.lineH + 2;
  const plotTop = ceilTop + c.lineH + 6;
  const plotBottom = SH - c.lineH / 2 - 4;
  const y = (i, v) => plotBottom - (v / c.axes[i].ceiling) * (plotBottom - plotTop);

  c.axes.forEach((a, i) => {
    set(c.rails[i], { x1: xs[i], x2: xs[i], y1: plotTop, y2: plotBottom, opacity: shown[i] });
    const ceil = c.ceilings[i];
    // A narrow stage drops the unit from each ceiling, so seven numbers fit their rails; the header names the unit.
    ceil.textContent = narrow ? String(a.ceiling) : `${a.ceiling}\u00A0%`;
    Object.assign(ceil.style, { left: `${xs[i]}px`, top: `${ceilTop}px`, transform: "translateX(-50%)", opacity: String(shown[i]) });
  });
  Object.assign(c.zero.style, { left: `${xs[0] - 7}px`, top: `${plotBottom}px`, transform: "translate(-100%, -50%)" });

  // ── the floors ──
  const floorOn = [clamp(state.floorN), clamp(state.floorW)];
  for (const [i, line] of Object.entries(c.floors)) {
    const k = Number(i);
    const on = (floorOn[k] ?? 0) * shown[k];
    const fy = y(k, c.axes[k].floor);
    set(line, { x1: xs[k] - 10, x2: xs[k] + 10, y1: fy, y2: fy, opacity: on });
    const label = c.floorLabels[i];
    Object.assign(label.style, { left: `${xs[k] - 13}px`, top: `${fy}px`, transform: "translate(-100%, -50%)", opacity: String(on) });
  }

  // ── the lines and their points ──
  const above = (l, i) => c.axes[i].floor !== null && i < 2 && l.values[i] >= c.axes[i].floor;
  for (const l of c.lines) {
    const pts = l.values.map((v, i) => [xs[i], y(i, v)]);
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < n; i++) {
      const p = clamp(span - i);
      if (p <= 0) break;
      d += ` L ${lerp(pts[i - 1][0], pts[i][0], p).toFixed(1)} ${lerp(pts[i - 1][1], pts[i][1], p).toFixed(1)}`;
    }
    const t = l.thread ? accentT : 0;
    const kept = l.thread ? 1 : 1 - 0.78 * retreat;
    set(l.path, { d, stroke: mixHex(c.field, c.accent, t), "stroke-width": c.rule * (1 + 1.2 * t), opacity: kept });
    l.dots.forEach((dot, i) => {
      const on = Math.max(clamp(state.dots), l.thread ? follow : 0) * shown[i] * kept;
      const fill = above(l, i) ? mixHex(c.field, c.accent, Math.max(mark, t)) : mixHex(c.field, c.accent, t);
      set(dot, { cx: pts[i][0], cy: pts[i][1], r: narrow ? 2.5 : 3.2, fill, opacity: on });
    });
  }

  // ── the names beside one axis: a column relaxed so no two touch ──
  const column = (axis, members, side, on, key) => {
    const seats = members.map((l) => ({ l, y: y(axis, l.values[axis]) })).sort((a, b) => a.y - b.y);
    relax(seats, c.lineH, plotTop, plotBottom);
    for (const l of c.lines) if (!members.includes(l)) l.names[key].style.opacity = "0";
    for (const s of seats) {
      const node = s.l.names[key];
      const x = side > 0 ? xs[axis] + 8 : xs[axis] - 8;
      Object.assign(node.style, { left: `${x}px`, top: `${s.y}px`, transform: side > 0 ? "translateY(-50%)" : "translate(-100%, -50%)" });
      node.style.opacity = String(on(s.l));
    }
  };
  // The first group stands only while its axis is alone; the second leaves as the third axis arrives.
  const groupN = clamp(state.groupN) * clamp((1.5 - span) * 2);
  column(0, c.lines.filter((l) => above(l, 0)), 1, () => groupN, "n");
  const groupW = clamp(state.groupW) * shown[1] * clamp((3 - span) * 2);
  column(1, c.lines.filter((l) => above(l, 1)), 1, (l) => groupW * (l.thread ? 1 : 1 - retreat), "w");

  // ── the seated names: once, at the axis where a line's own value is highest, never across another rail ──
  const seatsState = Math.max(0, Math.min(2, state.seats));
  const fullyOut = clamp((span - (n - 1)) / 1);
  const boxes = [];
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  // The values written for the followed lines are obstacles too: a name never sits on a number.
  const valueBoxes = [];
  if (follow > 0) {
    c.axes.forEach((_, i) => {
      const members = c.lines.filter((l) => l.thread).map((l) => ({ l, y: y(i, l.values[i]) })).sort((a, b) => a.y - b.y);
      relax(members, c.valueH, plotTop, plotBottom);
      for (const m of members) {
        const node = m.l.values_[i];
        const w = node.offsetWidth;
        Object.assign(node.style, { left: `${xs[i] - 7}px`, top: `${m.y}px`, transform: "translate(-100%, -50%)", opacity: String(follow * shown[i]) });
        valueBoxes.push({ x0: xs[i] - 7 - w - 2, y0: m.y - c.valueH / 2, x1: xs[i] - 5, y1: m.y + c.valueH / 2 });
      }
    });
  } else for (const l of c.lines) for (const node of l.values_ ?? []) if (node) node.style.opacity = "0";

  for (const l of [...c.lines].sort((a, b) => Number(b.thread) - Number(a.thread))) {
    const node = l.names.seat;
    const order = l.values.map((v, i) => ({ i, share: v / c.axes[i].ceiling })).sort((a, b) => b.share - a.share);
    let seat = null;
    const w = node.offsetWidth;
    // A line in the accent is always named: if no seat clears the other rails, it may cross them, on its halo.
    for (const strict of l.thread ? [true, false] : [true]) for (const { i } of order) {
      if (seat) break;
      const yy = y(i, l.values[i]);
      for (const side of [1, -1]) {
        const x = side > 0 ? xs[i] + 7 : xs[i] - 7;
        const box = { x0: side > 0 ? x - 2 : x - w - 2, y0: yy - c.lineH / 2, x1: side > 0 ? x + w + 2 : x + 2, y1: yy + c.lineH / 2 };
        if (box.x0 < 0 || box.x1 > SW) continue;
        if (boxes.some((b) => overlaps(b, box)) || valueBoxes.some((b) => overlaps(b, box))) continue;
        if (strict && xs.some((rx, j) => j !== i && rx > box.x0 - 3 && rx < box.x1 + 3)) continue;
        boxes.push(box);
        seat = { x, y: yy, side };
        break;
      }
      if (seat) break;
    }
    const want = l.thread ? clamp(seatsState) : clamp(seatsState - 1) * (1 - retreat);
    if (!seat) {
      node.style.opacity = "0";
      continue;
    }
    Object.assign(node.style, { left: `${seat.x}px`, top: `${seat.y}px`, transform: seat.side > 0 ? "translateY(-50%)" : "translate(-100%, -50%)", opacity: String(want * fullyOut) });
  }

  // ── the header note ──
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function relax(seats, lineH, top, bottom) {
  for (let i = 0; i < seats.length; i++) seats[i].y = Math.max(seats[i].y, i ? seats[i - 1].y + lineH : top + lineH / 2);
  for (let i = seats.length - 1; i >= 0; i--) seats[i].y = Math.min(seats[i].y, i < seats.length - 1 ? seats[i + 1].y - lineH : bottom - lineH / 2);
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatParallel(root, carrier) {
  const data = root.__paraData || (root.__paraData = JSON.parse(carrier.getAttribute("data-parallel")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const box = (node) => node.getBoundingClientRect();
  const axisNames = data.axes.map((_, i) => q(`[data-axis-name="${i}"]`));
  const lines = data.lines.map((l) => ({
    ...l,
    path: q(`[data-line="${l.code}"]`),
    dots: data.axes.map((_, i) => q(`[data-dot="${l.code}:${i}"]`)),
    names: Object.fromEntries(["n", "w", "seat"].map((k) => [k, q(`[data-name="${l.code}:${k}"]`)])),
    values_: l.thread ? data.axes.map((_, i) => q(`[data-value="${l.code}:${i}"]`)) : null,
  }));
  const floors = {};
  const floorLabels = {};
  data.axes.forEach((a, i) => {
    if (a.floor === null) return;
    floors[i] = q(`[data-floor="${i}"]`);
    floorLabels[i] = q(`[data-floor-label="${i}"]`);
  });
  const firstValue = lines.find((l) => l.thread).values_;
  root.__para = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    axisNames,
    nameW: axisNames.map((node) => box(node).width),
    rails: data.axes.map((_, i) => q(`[data-rail="${i}"]`)),
    ceilings: data.axes.map((_, i) => q(`[data-ceiling="${i}"]`)),
    zero: q('[data-part="zero"]'),
    zeroW: box(q('[data-part="zero"]')).width,
    lineH: box(axisNames[0]).height,
    valueH: box(firstValue[0]).height,
    valueW: Math.max(...firstValue.map((node) => box(node).width)),
    floors,
    floorLabels,
    lines,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
