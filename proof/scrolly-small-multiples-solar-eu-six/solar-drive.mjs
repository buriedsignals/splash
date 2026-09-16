// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the playhead: every line drawn up to this year, its dot and value at the head     first..last year
//   floor    the floor drawn across every panel, the panels above it named in the accent        0..1
//   merge    the six panels travelling onto one chart, each line named at its end                 0..1
//   own      every panel's scale stretched to its own maximum — the trap, shown                   0..1
//   note     which header note is read                                                            0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: three panels a row on a wide stage, two on a narrow
// one, every panel the same size with the same gutters, so one scale reads the same in each.

export function applySolarState(root, state, context) {
  const carrier = root.querySelector("[data-solar]");
  if (!carrier) return;
  if (context.resized || !root.__solar) seatSolar(root, carrier);
  const c = root.__solar;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.panels.length;
  const cols = SW < 560 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const first = c.years[0];
  const last = c.years[c.years.length - 1];
  const year = Math.max(first, Math.min(last, state.year));
  const floorOn = clamp(state.floor);
  const merge = ease(clamp(state.merge));
  const own = ease(clamp(state.own));

  // ── the boxes: one per panel, and the merged chart's ──
  const gutterL = c.tickW + 8;
  const gutterR = c.valueW + 12;
  const cellW = SW / cols;
  const cellH = SH / rows;
  const panelBox = (i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW;
    const y = row * cellH;
    return { x0: x + gutterL, x1: x + cellW - gutterR, y0: y + c.nameH + 10, y1: y + cellH - c.tickH - 14 };
  };
  const mergedBox = { x0: gutterL, x1: SW - c.endW - 12, y0: 8, y1: SH - c.tickH - 8 };

  const valueAt = (values, t) => {
    const k = Math.floor(t - first);
    const f = t - first - k;
    return k >= values.length - 1 ? values[values.length - 1] : lerp(values[k], values[k + 1], f);
  };

  const ends = [];
  c.panels.forEach((p, i) => {
    const pb = panelBox(i);
    const b = { x0: lerp(pb.x0, mergedBox.x0, merge), x1: lerp(pb.x1, mergedBox.x1, merge), y0: lerp(pb.y0, mergedBox.y0, merge), y1: lerp(pb.y1, mergedBox.y1, merge) };
    const max = lerp(c.sharedMax, p.ownMax, own * (1 - merge));
    const X = (t) => b.x0 + ((t - first) / (last - first)) * (b.x1 - b.x0);
    const Y = (v) => b.y1 - (v / max) * (b.y1 - b.y0);

    // The grid: the shared ticks, drawn once in the merged chart.
    const gridOn = i === 0 ? 1 : 1 - merge;
    c.ticks.forEach((t, k) => {
      const inRange = t <= max + 1e-6 ? 1 : 0;
      set(p.grid[k], { x1: b.x0, x2: b.x1, y1: Y(t), y2: Y(t), opacity: gridOn * inRange * (1 - own * 0.6) });
      // Tick numbers down the left column only; in the trap, every panel's own top is written instead.
      const leftColumn = i % cols === 0 || merge > 0.5;
      Object.assign(p.tickLabels[k].style, { left: `${b.x0 - 6}px`, top: `${Y(t)}px`, transform: "translate(-100%, -50%)", opacity: String(leftColumn && i === (merge > 0.5 ? 0 : i) ? inRange * (1 - own) * gridOn : 0) });
    });
    // The trap's own ceiling, inside the panel's top-left corner: a gutter number would read as the neighbour's.
    Object.assign(p.ownTop.style, { left: `${b.x0 + 4}px`, top: `${b.y0 + 3}px`, transform: "none", opacity: String(own * (1 - merge)) });
    const bottomRow = Math.floor(i / cols) === rows - 1 || merge > 0.5;
    c.xTicks.forEach((t, k) => {
      Object.assign(p.xLabels[k].style, { left: `${X(t)}px`, top: `${b.y1 + 4}px`, transform: "translateX(-50%)", opacity: String(bottomRow && (merge < 0.5 || i === 0) ? 1 : 0) });
    });

    // The floor, in every panel, at the same height.
    const fy = Y(c.floor);
    set(p.floorLine, { x1: b.x0, x2: b.x1, y1: fy, y2: fy, opacity: floorOn * (i === 0 ? 1 : 1 - merge) });
    Object.assign(p.floorLabel.style, { left: `${b.x0 + 4}px`, top: `${fy - 2}px`, transform: "translateY(-100%)", opacity: String(floorOn * (i === 0 ? 1 : 1 - merge)) });

    // The line up to the playhead.
    const pts = [];
    for (let t = first; t <= Math.floor(year); t++) pts.push([X(t), Y(p.values[t - first])]);
    const head = valueAt(p.values, year);
    if (year > Math.floor(year)) pts.push([X(year), Y(head)]);
    set(p.line, { d: `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}` });
    set(p.dot, { cx: X(year), cy: Y(head) });

    const valueText = `${head.toFixed(1).replace(".", ",")}\u00A0%`;
    if (p.endValue.textContent !== valueText) p.endValue.textContent = valueText;
    p.endName.style.display = merge > 0.5 ? "inline" : "none";
    const above = head > c.floor;
    const lit = floorOn * (above ? 1 : 0);
    p.name.style.color = lit > 0.5 ? c.accentInk : "";
    Object.assign(p.name.style, { left: `${pb.x0}px`, top: `${pb.y0 - c.nameH - 6}px`, opacity: String(1 - merge) });
    ends.push({ p, x: X(year) + 8, y: Y(head) });
  });

  // End labels, relaxed so no two touch once the lines share one chart.
  if (merge > 0.5) {
    const seats = [...ends].sort((a, b) => a.y - b.y);
    for (let i = 1; i < seats.length; i++) seats[i].y = Math.max(seats[i].y, seats[i - 1].y + c.valueH);
  }
  for (const e of ends) Object.assign(e.p.end.style, { left: `${e.x}px`, top: `${e.y}px`, transform: "translateY(-50%)" });

  const yearText = c.yearNote.dataset.template.replace("{year}", String(Math.round(year)));
  if (c.yearNote.textContent !== yearText) c.yearNote.textContent = yearText;
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function seatSolar(root, carrier) {
  const data = root.__solarData || (root.__solarData = JSON.parse(carrier.getAttribute("data-solar")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const box = (node) => node.getBoundingClientRect();
  const panels = data.panels.map((p) => {
    const g = q(`[data-panel="${p.key}"]`);
    const end = q(`[data-end="${p.key}"]`);
    return {
      ...p,
      grid: data.ticks.map((t) => g.querySelector(`[data-grid="${t}"]`)),
      floorLine: g.querySelector('[data-part="floor"]'),
      line: g.querySelector('[data-part="line"]'),
      dot: g.querySelector('[data-part="dot"]'),
      name: q(`[data-name="${p.key}"]`),
      end,
      endName: end.querySelector('[data-part="end-name"]'),
      endValue: end.querySelector('[data-part="end-value"]'),
      tickLabels: data.ticks.map((t) => q(`[data-tick="${p.key}:${t}"]`)),
      ownTop: q(`[data-own-top="${p.key}"]`),
      xLabels: data.xTicks.map((y) => q(`[data-x-tick="${p.key}:${y}"]`)),
      floorLabel: q(`[data-floor-label="${p.key}"]`),
    };
  });
  const accentProbe = root.querySelector('[data-note="floorNote"]');
  // A paint may have hidden the end names; they are measured shown, since the merged chart reserves their width.
  for (const p of panels) p.endName.style.display = "inline";
  root.__solar = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    panels,
    nameH: box(panels[0].name).height,
    tickH: box(panels[0].xLabels[0]).height,
    tickW: Math.max(...panels.map((p) => box(p.ownTop).width)),
    valueW: Math.max(...panels.map((p) => box(p.endValue).width)) + 4,
    endW: Math.max(...panels.map((p) => box(p.endName).width + box(p.endValue).width)) + 12,
    valueH: box(panels[0].endValue).height,
    accentInk: getComputedStyle(accentProbe).color,
    yearNote: root.querySelector('[data-note="yearNote"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
