// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   grow0..2  each family's segments growing onto the column, in stacking order                        0..1
//   sort      the columns travelling from the order of their renewable share to the order of their fossil share 0..1
//   flip      fossil moving from the top of every column to its baseline                                  0..1
//   merge     nuclear taking the renewables' hue, the two written as one low-carbon share                  0..1
//   note      which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: six columns across the stage, 0 to 100 % up, a
// segment's share written inside it when its height holds the number.

export function applyMixState(root, state, context) {
  const carrier = root.querySelector("[data-mix]");
  if (!carrier) return;
  if (context.resized || !root.__mix) seatMix(root, carrier);
  const c = root.__mix;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const grows = [0, 1, 2].map((i) => ease(clamp(state[`grow${i}`])));
  const sort = ease(clamp(state.sort));
  const flip = ease(clamp(state.flip));
  const merge = clamp(state.merge);
  const x0 = c.tickW + 10;
  const top = c.valueH / 2 + 2;
  const bottom = SH - c.nameH * (SW < 560 ? 2 : 1) - 10;
  const Y = (pct) => bottom - (pct / 100) * (bottom - top);
  const n = c.columns.length;
  const cellW = (SW - x0) / n;
  // A phone writes the shares without their sign, which the axis's own 100 % carries: "99 %" did not fit a column.
  const narrow = SW < 560;
  for (const col of c.columns)
    for (const node of [...col.shares_, col.low]) {
      const full = node.dataset.full ?? (node.dataset.full = node.textContent);
      const text = narrow ? full.replace(/\u00A0%$/, "") : full;
      if (node.textContent !== text) node.textContent = text;
    }
  const barW = cellW * 0.78;

  c.grid.forEach(({ value, line, label }) => {
    set(line, { x1: x0, x2: SW, y1: Y(value), y2: Y(value) });
    Object.assign(label.style, { left: `${x0 - 8}px`, top: `${Y(value)}px`, transform: "translate(-100%, -50%)" });
  });

  c.columns.forEach((col, ci) => {
    const slotX = lerp(c.orders[0].indexOf(ci), c.orders[1].indexOf(ci), sort);
    const left = x0 + slotX * cellW + (cellW - barW) / 2;
    // Stacking positions: renewables, nuclear, fossil from the base; with the flip, fossil slides to the base and the
    // two low-carbon families ride up on top of it.
    const h = col.shares.map((s, i) => s * grows[i]);
    const base = [lerp(0, h[2], flip), lerp(h[0], h[0] + h[2], flip), lerp(h[0] + h[1], 0, flip)];
    col.segments.forEach((rect, i) => {
      const fill = i === 1 ? mixHex(c.fills[1], c.fills[0], merge) : c.fills[i];
      set(rect, { x: left, y: Y(base[i] + h[i]), width: barW, height: Math.max(0, Y(base[i]) - Y(base[i] + h[i])), fill });
      const label = col.shares_[i];
      const fits = (h[i] / 100) * (bottom - top) > c.valueH + 4 && barW > label.offsetWidth + 6;
      const hideInMerge = i < 2 ? 1 - merge : 1;
      Object.assign(label.style, { left: `${left + barW / 2}px`, top: `${Y(base[i] + h[i] / 2)}px`, transform: "translate(-50%, -50%)", opacity: String(fits ? clamp((grows[i] - 0.7) / 0.3) * hideInMerge : 0) });
    });
    // The merged low-carbon share, centred on the renewables and nuclear together.
    const lowBase = Math.min(base[0], base[1]);
    const lowH = h[0] + h[1];
    const lowFits = (lowH / 100) * (bottom - top) > c.valueH + 4;
    Object.assign(col.low.style, { left: `${left + barW / 2}px`, top: `${Y(lowBase + lowH / 2)}px`, transform: "translate(-50%, -50%)", opacity: String(lowFits ? merge : 0) });
    // Names under the columns, on two alternating rows where a column is too narrow for its name.
    const twoRows = narrow && Math.max(...c.columns.map((k) => k.name.offsetWidth)) > cellW - 4;
    const row = twoRows ? Math.round(slotX) % 2 : 0;
    Object.assign(col.name.style, { left: `${left + barW / 2}px`, top: `${bottom + 6 + row * c.nameH}px`, transform: "translateX(-50%)" });
  });

  c.keys.forEach((node, i) => {
    node.style.opacity = String(Math.max(0.35, grows[i]));
  });
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

function seatMix(root, carrier) {
  const data = root.__mixData || (root.__mixData = JSON.parse(carrier.getAttribute("data-mix")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const columns = data.columns.map((col) => {
    const g = q(`[data-column="${col.key}"]`);
    return {
      ...col,
      segments: [0, 1, 2].map((i) => g.querySelector(`[data-segment="${i}"]`)),
      shares_: [0, 1, 2].map((i) => q(`[data-share="${col.key}:${i}"]`)),
      low: q(`[data-low="${col.key}"]`),
      name: q(`[data-name="${col.key}"]`),
    };
  });
  const grid = [0, 50, 100].map((value) => ({ value, line: q(`[data-grid="${value}"]`), label: q(`[data-tick="${value}"]`) }));
  root.__mix = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    columns,
    grid,
    tickW: Math.max(...grid.map((g) => g.label.getBoundingClientRect().width)),
    valueH: h(columns[0].shares_[0]),
    nameH: h(columns[0].name),
    keys: [0, 1, 2].map((i) => root.querySelector(`[data-key="${i}"]`)),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
