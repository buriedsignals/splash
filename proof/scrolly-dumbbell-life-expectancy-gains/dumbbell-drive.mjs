// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the playhead: each row's head dot sits at that row's value in that year, read between years   2000..2023
//   ghost    the 2019 value left as a dashed ring once the heads move back                                  0..1
//   loss     the change since 2019 written for the rows that lost most                                      0..1
//   gain     the gain since 2000 written for every row                                                      0..1
//   sort     the rows travelling from their 2000 order to their order by gain                               0..1
//   focus    the row the sort card reads kept, the rest stepping back                                       0..1
//   note     which header note is read                                                                      0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: names in a left column, the gain (or the loss) in a
// right column, one fitted value scale between them shared by every row.

export function applyDumbbellState(root, state, context) {
  const carrier = root.querySelector("[data-dumbbell]");
  if (!carrier) return;
  if (context.resized || !root.__dumbbell) seatDumbbell(root, carrier);
  const c = root.__dumbbell;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const ghost = clamp(state.ghost);
  const loss = clamp(state.loss);
  const gain = clamp(state.gain);
  const sort = ease(clamp(state.sort));
  const focus = clamp(state.focus);
  const r = narrow ? 4.5 : 6;

  const x0 = c.nameW + (narrow ? 10 : 18);
  // The right edge leaves room for a head value beside the highest dot, then the gain column.
  const x1 = SW - c.gainW - c.valueW - r - (narrow ? 12 : 20);
  const top = 4;
  const bottom = SH - c.tickH - 10;
  const [lo, hi] = c.domain;
  const X = (v) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const n = c.rows.length;
  const slotH = (bottom - top) / n;
  const Y = (slot) => top + (slot + 0.5) * slotH;

  // The playhead, read between two years.
  const first = c.years[0];
  const lastIndex = c.years.length - 1;
  const at = (series, year) => {
    const t = Math.max(0, Math.min(lastIndex, year - first));
    const i = Math.min(lastIndex - 1, Math.floor(t));
    return lerp(series[i], series[i + 1], t - i);
  };
  // A card's own year is read exactly, not a hair before it.
  const raw = Math.max(first, Math.min(c.years[lastIndex], state.year));
  const year = Math.abs(raw - Math.round(raw)) < 0.002 ? Math.round(raw) : raw;
  const shown = Math.round(year);
  c.yearNode.textContent = shown === first ? c.yearFirst : c.yearTemplate.replace("{year}", String(shown));

  c.grid.forEach(({ value, line, label }, k) => {
    set(line, { x1: X(value), x2: X(value), y1: top, y2: bottom });
    Object.assign(label.style, { left: `${X(value)}px`, top: `${bottom + 6}px`, transform: "translateX(-50%)", opacity: narrow && k % 2 ? "0" : "1" });
  });

  c.rows.forEach((row, i) => {
    const slot = lerp(c.slotFrom[i], c.slotTo[i], sort);
    const y = Y(slot);
    const kept = row.focus ? 1 : 1 - 0.75 * focus;
    const fromX = X(row.series[0]);
    const headValue = at(row.series, year);
    const headX = X(headValue);
    const ghostX = X(row.series[c.dipFrom - first]);
    const dir = headX >= fromX ? 1 : -1;

    set(row.group, { opacity: kept });
    set(row.bar, { x1: fromX, x2: headX, y1: y, y2: y });
    set(row.from, { cx: fromX, cy: y, r });
    set(row.head, { cx: headX, cy: y, r });
    set(row.ghost, { cx: ghostX, cy: y, r, opacity: ghost });

    Object.assign(row.name.style, { left: "0px", top: `${y}px`, transform: "translateY(-50%)", opacity: String(kept) });

    // The head's value on the side away from the 2000 dot, clear of the ring while the ring is drawn.
    const outer = dir > 0 ? Math.max(headX, lerp(headX, ghostX, ghost)) : Math.min(headX, lerp(headX, ghostX, ghost));
    const gap = r + (narrow ? 4 : 6);
    // Rounded to tenths before formatting, as the page's sentences are: engines disagree on a double like 73.65.
    row.headValue.textContent = (Math.round(headValue * 10) / 10).toFixed(1).replace(".", ",");
    Object.assign(row.headValue.style, {
      left: `${outer + dir * gap}px`,
      top: `${y}px`,
      transform: dir > 0 ? "translateY(-50%)" : "translate(-100%, -50%)",
      opacity: String(kept),
    });
    const apart = clamp((Math.abs(headX - fromX) - 2 * r) / (narrow ? 10 : 16));
    Object.assign(row.fromValue.style, {
      left: `${fromX - dir * gap}px`,
      top: `${y}px`,
      transform: dir > 0 ? "translate(-100%, -50%)" : "translateY(-50%)",
      opacity: String(apart * kept * (narrow ? 1 - ghost : 1)),
    });

    // The right column: the loss since 2019 on the dip card, the gain since 2000 after.
    Object.assign(row.gain.style, { left: `${SW}px`, top: `${y}px`, transform: "translate(-100%, -50%)", opacity: String(gain * kept) });
    Object.assign(row.loss.style, { left: `${SW}px`, top: `${y}px`, transform: "translate(-100%, -50%)", opacity: String(row.hasLoss ? loss * (1 - gain) : 0) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatDumbbell(root, carrier) {
  const data = root.__dumbbellData || (root.__dumbbellData = JSON.parse(carrier.getAttribute("data-dumbbell")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const w = (node) => node.getBoundingClientRect().width;
  const rows = data.rows.map((d) => {
    const group = q(`[data-row="${d.key}"]`);
    const loss = q(`[data-loss="${d.key}"]`);
    return {
      key: d.key,
      series: d.series,
      marked: d.marked,
      focus: d.focus,
      hasLoss: loss.textContent.trim() !== "",
      group,
      bar: group.querySelector('[data-part="bar"]'),
      ghost: group.querySelector('[data-part="ghost"]'),
      from: group.querySelector('[data-part="from"]'),
      head: group.querySelector('[data-part="head"]'),
      name: q(`[data-name="${d.key}"]`),
      fromValue: q(`[data-from-value="${d.key}"]`),
      headValue: q(`[data-head-value="${d.key}"]`),
      gain: q(`[data-gain="${d.key}"]`),
      loss,
    };
  });
  const slotOf = (order) => {
    const slots = new Array(rows.length);
    order.forEach((rowIndex, slot) => (slots[rowIndex] = slot));
    return slots;
  };
  const grid = data.ticks.map((value) => ({ value, line: q(`[data-grid="${value}"]`), label: q(`[data-tick="${value}"]`) }));
  const yearNode = root.querySelector('[data-part="year"]');
  root.__dumbbell = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    rows,
    slotFrom: slotOf(data.orders[0]),
    slotTo: slotOf(data.orders[1]),
    grid,
    yearNode,
    yearTemplate: yearNode.getAttribute("data-template"),
    yearFirst: yearNode.getAttribute("data-first"),
    nameW: Math.max(...rows.map((row) => w(row.name))),
    gainW: Math.max(...rows.flatMap((row) => [w(row.gain), w(row.loss)])),
    valueW: Math.max(...rows.map((row) => w(row.headValue))),
    tickH: grid[0].label.getBoundingClientRect().height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
