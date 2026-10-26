// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   reach   the year the grid is filled to, one column at a time; the value column reads that year   2010..2024
//   crisis  the relapse year's column outlined, the rows that jumped marked                          0..1
//   focus   the last year read: the one row above half marked, every row neither under the first break
//           nor above half stepping back                                                             0..1
//   sort    the rows from their 2010 order to their relative fall, the fall written in the value column 0..1
//   both    the first year's values set in a column of their own beside the last year's              0..1
//   note    which header note is read                                                                0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the name column and the value columns as wide as
// their widest text, the fifteen year columns in between.

export function applyCoalHeatmapState(root, state, context) {
  const carrier = root.querySelector("[data-coal]");
  if (!carrier) return;
  if (context.resized || !root.__coal) seatCoal(root, carrier);
  const c = root.__coal;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const narrow = SW < 560;
  const first = c.years[0];
  const lastIndex = c.years.length - 1;
  const reach = Math.max(first, Math.min(c.years[lastIndex], state.reach));
  // A card's own year is read exactly, not a hair before it.
  const yearIndex = Math.min(lastIndex, Math.floor(reach - first + 0.002));
  const crisis = clamp(state.crisis);
  const focus = clamp(state.focus);
  const sort = ease(clamp(state.sort));
  const both = clamp(state.both);

  const gap = narrow ? 6 : 10;
  const gx = c.nameW + gap;
  const gridW = SW - gx - gap - c.valueW - both * (c.startW + gap);
  const colW = gridW / c.years.length;
  const startX = gx + gridW + gap;
  const valueX = startX + both * (c.startW + gap);
  const headH = c.headH + 6;
  const rowH = (SH - headH) / c.rows.length;
  const pad = Math.max(0.5, Math.min(1.5, colW * 0.06));
  const colX = (i) => gx + i * colW;

  c.yearNodes.forEach((node, i) => {
    // On a phone the last year's label would run into the value column's own year.
    const beside = narrow && i === lastIndex ? 0 : 1;
    Object.assign(node.style, { left: `${colX(i) + colW / 2}px`, top: "0px", transform: "translateX(-50%)", opacity: String(clamp(reach - c.years[i] + 1) * beside) });
  });
  Object.assign(c.startHead.style, { left: `${startX}px`, top: "0px", opacity: String(both) });
  const headText = sort > 0.5 ? c.valueHead.dataset.fall : String(c.years[yearIndex]);
  if (c.valueHead.textContent !== headText) c.valueHead.textContent = headText;
  Object.assign(c.valueHead.style, { left: `${valueX}px`, top: "0px" });

  const crisisIndex = c.years.indexOf(c.crisis.year);
  Object.assign(c.crisisColumn.style, { left: `${colX(crisisIndex) - 2}px`, top: `${headH - 3}px`, width: `${colW + 4}px`, height: `${SH - headH + 3}px`, opacity: String(crisis) });

  const threshold = c.firstBreak;
  let under = 0;
  for (const row of c.rows) {
    const slot = lerp(c.orders.start.indexOf(row.key), c.orders.fall.indexOf(row.key), sort);
    const y = headH + slot * rowH;
    const lastValue = row.values[lastIndex];
    const kept = row.halfLast || lastValue < threshold ? 1 : 1 - 0.7 * focus;
    if (row.values[yearIndex] < threshold) under += 1;
    Object.assign(row.el.style, { top: `${y}px`, left: "0px", width: `${SW}px`, height: `${rowH}px`, opacity: String(kept) });
    Object.assign(row.name.style, { left: `${c.nameW}px`, top: `${rowH / 2}px`, transform: "translate(-100%, -50%)" });
    row.cells.forEach((cell, i) => {
      Object.assign(cell.style, { left: `${colX(i) + pad}px`, top: `${pad}px`, width: `${colW - 2 * pad}px`, height: `${rowH - 2 * pad}px`, opacity: String(clamp(reach - c.years[i] + 1)) });
    });

    // One mark a row: the relapse year's cell on the crisis card, the last year's on the focus card.
    const markCrisis = c.crisis.marked.includes(row.key) ? crisis : 0;
    const markHalf = row.halfLast ? focus : 0;
    const at = markHalf > markCrisis ? lastIndex : crisisIndex;
    Object.assign(row.mark.style, { left: `${colX(at) + pad}px`, top: `${pad}px`, width: `${colW - 2 * pad}px`, height: `${rowH - 2 * pad}px`, opacity: String(Math.max(markCrisis, markHalf)) });

    Object.assign(row.startValue.style, { left: `${startX}px`, top: `${rowH / 2}px`, transform: "translateY(-50%)", opacity: String(both) });
    const text = row.texts[yearIndex];
    if (row.value.textContent !== text) row.value.textContent = text;
    Object.assign(row.value.style, { left: `${valueX}px`, top: `${rowH / 2}px`, transform: "translateY(-50%)", opacity: String(1 - sort) });
    Object.assign(row.fall.style, { left: `${valueX}px`, top: `${rowH / 2}px`, transform: "translateY(-50%)", opacity: String(sort) });
  }

  const count = c.notes[1];
  const countText = count.dataset.template.replace("{year}", String(c.years[yearIndex])).replace("{n}", String(under));
  if (count.textContent !== countText) count.textContent = countText;
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}

function seatCoal(root, carrier) {
  const data = root.__coalData || (root.__coalData = JSON.parse(carrier.getAttribute("data-coal")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const w = (node) => node.getBoundingClientRect().width;
  const last = data.years.length - 1;
  const rows = data.rows.map((r) => {
    const el = q(`[data-row="${CSS.escape(r.key)}"]`);
    return {
      key: r.key,
      values: r.values,
      texts: r.texts,
      halfLast: r.values[last] >= 50,
      el,
      name: el.querySelector('[data-part="name"]'),
      cells: Array.from(el.querySelectorAll("[data-cell]")),
      mark: el.querySelector('[data-part="mark"]'),
      startValue: el.querySelector('[data-part="start-value"]'),
      value: el.querySelector('[data-part="value"]'),
      fall: el.querySelector('[data-part="fall"]'),
    };
  });
  const valueHead = q('[data-part="value-head"]');
  // The value column is as wide as the widest text it will ever set: any year's value, any fall, either head.
  const probe = rows[0].value;
  const widest = (texts) => {
    const saved = probe.textContent;
    let max = 0;
    for (const t of texts) {
      probe.textContent = t;
      max = Math.max(max, w(probe));
    }
    probe.textContent = saved;
    return max;
  };
  root.__coal = {
    ...data,
    stage,
    rows,
    yearNodes: data.years.map((y) => q(`[data-year="${y}"]`)),
    startHead: q('[data-part="start-head"]'),
    valueHead,
    crisisColumn: q('[data-part="crisis-column"]'),
    nameW: Math.max(...rows.map((r) => w(r.name))),
    startW: Math.max(w(q('[data-part="start-head"]')), ...rows.map((r) => w(r.startValue))),
    valueW: Math.max(widest(rows.flatMap((r) => r.texts)), ...rows.map((r) => w(r.fall)), w(valueHead), widest([valueHead.dataset.fall])),
    headH: valueHead.getBoundingClientRect().height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
