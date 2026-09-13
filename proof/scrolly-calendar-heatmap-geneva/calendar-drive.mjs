// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture is scrubbed by the reader's own scroll):
//   fill      how much of the year has appeared, day by day from 1 January       0..1
//   key       the binned key under the calendar                                  0..1
//   filter    the days under the threshold stepping back to a neutral            0..1
//   zoom      July and August growing to fill the frame, the other months folded  0..1
//   outline   the streak outlined in the order of its days, the counter climbing   0..1
//   means     each month's mean drawn beside its row                             0..1
//   extremes  the hottest and coldest days ringed and named                      0..1
//
// THE ZOOM IS ROW HEIGHTS, NOT A TRANSFORM. The calendar is a grid; zooming interpolates its row track
// sizes between the overview (every month the same height) and the focus (the two streak months sharing
// the frame, the other ten at zero). Every word on the grid is a grid item, so it follows without being
// scaled. A value is printed inside a focused cell only where the cell, at full zoom, is wider and
// taller than the value — measured on every resize, in the reader's own pixels.

export function applyCalendarState(root, state, context) {
  if (context.resized || !root.__calendar) measureCalendar(root);
  const c = root.__calendar;
  if (!c) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const shown = state.fill * c.cells.length;
  for (const cell of c.cells) cell.style.opacity = String(clamp(shown - Number(cell.dataset.index)));
  for (const node of c.colds) node.style.opacity = String(state.filter);
  c.key.style.opacity = String(state.key);

  // Rows: overview → focus.
  const rows = c.months.map((_, month) =>
    c.base + ((c.focus.has(month) ? c.zoomRow : 0) - c.base) * state.zoom,
  );
  c.calendar.style.gridTemplateRows = `auto ${rows.map((h) => `${h.toFixed(2)}px`).join(" ")}`;
  for (const node of c.unfocused) node.style.opacity = String(1 - state.zoom);
  for (const node of c.values) node.style.opacity = String(c.valuesFit ? clamp(state.zoom * 2 - 1) : 0);

  // The streak, traced day by day, and the counter that follows it while the zoom is open.
  let before = 0;
  for (const box of c.runs) {
    const length = Number(box.getAttribute("data-days"));
    const part = Math.min(Math.max(state.outline * c.streak - before, 0), length) / length;
    box.style.clipPath = part >= 1 ? "none" : `inset(-6px ${(1 - part) * 100}% -6px -6px)`;
    box.style.opacity = part > 0 ? "1" : "0";
    before += length;
  }
  const n = Math.round(state.outline * c.streak);
  const text = `${n} ${c.counter.dataset.suffix}`;
  if (c.counter.textContent !== text) c.counter.textContent = text;
  c.counter.style.opacity = String(state.outline > 0 ? state.zoom : 0);
  if (state.outline > 0 && state.zoom > 0) keepInside(c.calendar, [c.counter]);

  // Means: the column opens, then the bars draw.
  c.calendar.style.gridTemplateColumns = `max-content repeat(31, minmax(0, 1fr)) ${(c.meansWidth * state.means).toFixed(2)}px`;
  for (const node of c.means) node.style.opacity = String(state.means);

  for (const node of c.extremes) node.style.opacity = String(state.extremes);
  if (state.extremes > 0) keepInside(c.calendar, c.labels);
}

function measureCalendar(root) {
  const calendar = root.querySelector('[data-part="calendar"]');
  if (!calendar) return;
  const months = Array.from(calendar.querySelectorAll("span[data-month]"));
  const tick = calendar.querySelector('[data-part="tick"]');
  const gap = Number.parseFloat(getComputedStyle(calendar).rowGap) || 0;
  const available = calendar.clientHeight - (tick ? tick.offsetHeight : 0) - gap * 12;
  const base = Math.max(0, Math.min(40, available / 12));
  const zoomRow = Math.max(base, Math.min(available / 2 - gap, 160));
  const focus = new Set(months.filter((m) => m.hasAttribute("data-focus")).map((m) => Number(m.dataset.month)));
  const width = calendar.clientWidth;
  const meansWidth = Math.min(110, width * 0.14);

  // Does a value fit its cell at full zoom? The column width does not change with the zoom.
  const label = months[0];
  const columnWidth = (width - label.offsetWidth - meansWidth - gap * 32) / 31;
  const values = Array.from(calendar.querySelectorAll("[data-value]"));
  const widest = Math.max(0, ...values.map((v) => v.offsetWidth));
  const tallest = Math.max(0, ...values.map((v) => v.offsetHeight));
  const valuesFit = widest + 4 <= columnWidth && tallest + 4 <= zoomRow;

  const runs = Array.from(calendar.querySelectorAll('[data-part="run"]'));
  root.__calendar = {
    calendar,
    months,
    base,
    zoomRow,
    focus,
    meansWidth,
    valuesFit,
    values,
    cells: Array.from(calendar.querySelectorAll("[data-cell]")),
    colds: Array.from(calendar.querySelectorAll("[data-cold]")),
    unfocused: Array.from(calendar.querySelectorAll("[data-month]:not([data-focus])")),
    runs,
    streak: runs.reduce((s, r) => s + Number(r.getAttribute("data-days")), 0),
    counter: calendar.querySelector('[data-part="counter"]'),
    means: Array.from(calendar.querySelectorAll('[data-part="mean"]')),
    extremes: Array.from(calendar.querySelectorAll('[data-part="extreme"]')),
    labels: Array.from(calendar.querySelectorAll('[data-part="extreme"][data-label]')),
    key: root.querySelector('[data-part="key"]'),
  };
  root.dataset.valuesFit = valuesFit ? "1" : "0";
}

/** A name or the counter anchored near the frame's edge would hang outside it; it slides back in. */
function keepInside(calendar, labels) {
  const frame = calendar.getBoundingClientRect();
  for (const label of labels) {
    label.style.marginLeft = "0px";
    const box = label.getBoundingClientRect();
    if (box.right > frame.right) label.style.marginLeft = `${frame.right - box.right}px`;
    else if (box.left < frame.left) label.style.marginLeft = `${frame.left - box.left}px`;
  }
}
