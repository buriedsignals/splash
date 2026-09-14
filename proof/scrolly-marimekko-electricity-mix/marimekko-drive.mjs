// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   width    columns from equal widths to the width of their generation; the totals written under them  0..1
//   tracked  every band but the tracked source stepping back                                           0..1
//   stack    the tracked bands leaving their columns for one column of their own, area kept             0..1
//   labels   the sources named once, in stacking order                                                  0..1
//   pct      the shares written inside the bands that hold them                                         0..1
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint. AREA IS KEPT when the tracked bands gather: one TWh is
// the same area in its column and in the gathered column, whose width is the tracked share of the plot — so its
// height is the whole plot's, and the gathered column reads as its own share at a glance.

export function applyMarimekkoState(root, state, context) {
  const carrier = root.querySelector("[data-marimekko]");
  if (!carrier) return;
  if (context.resized || !root.__mari) seatMarimekko(root, carrier);
  const c = root.__mari;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const narrow = c.narrow;
  const widthE = ease(clamp(state.width));
  const tracked = clamp(state.tracked);
  const stack = ease(clamp(state.stack));
  const labels = clamp(state.labels);
  const pct = clamp(state.pct);
  const gap = narrow ? 3 : 6;
  const n = c.columns.length;
  const trackedShare = c.trackedTotal / c.grand;
  // A narrow stage names its columns on up to three rows, each name on the first row where it clears its neighbour.
  const nameRows = narrow ? 3 : 1;
  const plotTop = c.nameH * nameRows + 6;
  const plotBottom = SH - c.totalH - c.widthNameH - 12;
  const plotH = plotBottom - plotTop;
  // The right gutter holds the gathered column (its width is the tracked share of the plot) or the source names.
  const labelsW = narrow ? 0 : c.labelW + 24;
  const plotW0 = SW - labelsW;
  const stackW = trackedShare * (plotW0 - gap * (n - 1));
  const gutter = Math.max(labelsW, stack > 0.001 ? stackW + 24 : 0);
  const plotW = SW - gutter;
  const avail = plotW - gap * (n - 1);
  const stackX = plotW + (gutter - stackW) / 2;
  const stackLabelW = c.stackLabel.offsetWidth;
  const stackLabelX = Math.min(stackX + stackW / 2, SW - stackLabelW / 2);

  let x = 0;
  const rowEnds = [];
  let stackRun = plotBottom;
  const last = c.columns[n - 1];
  const lastBands = {};
  c.columns.forEach((col, ci) => {
    const w = lerp(avail / n, (col.total / c.grand) * avail, widthE);
    let yRun = plotBottom;
    col.bands.forEach((band, bi) => {
      const h = (band.value / col.total) * plotH;
      const isTracked = band.key === c.tracked;
      let bx = x;
      let by = yRun - h;
      let bw = w;
      let bh = h;
      if (isTracked && stack > 0) {
        // Area kept: this band's TWh as a piece of the gathered column.
        const sh = (band.value / c.trackedTotal) * plotH;
        const sy = stackRun - sh;
        bx = lerp(x, stackX, stack);
        by = lerp(by, sy, stack);
        bw = lerp(w, stackW, stack);
        bh = lerp(h, sh, stack);
        stackRun = sy;
        // Inside the gathered column when it fits; otherwise beside it, on a patch of ground over the faded columns.
        const piece = col.piece;
        const inside = stackW > piece.offsetWidth + 6;
        Object.assign(piece.style, inside
          ? { left: `${stackX + stackW / 2}px`, top: `${sy + sh / 2}px`, transform: "translate(-50%, -50%)", color: c.inks[0], background: "none", padding: "0", textAlign: "center" }
          : { left: `${stackX - 6}px`, top: `${sy + sh / 2}px`, transform: "translate(-100%, -50%)", color: c.groundInk, background: c.groundRgb, padding: "2px 4px", textAlign: "right" });
        piece.style.opacity = String(sh > c.pieceH + 4 ? clamp((stack - 0.8) / 0.2) : 0);
      } else if (isTracked) {
        col.piece.style.opacity = "0";
      }
      Object.assign(band.el.style, { left: `${bx}px`, top: `${by}px`, width: `${Math.max(0, bw)}px`, height: `${Math.max(0, bh)}px` });
      band.el.style.opacity = String(isTracked ? 1 : 1 - 0.8 * Math.max(tracked, stack));
      band.el.style.boxShadow = h > 1.5 ? `inset 0 1px 0 ${c.groundRgb}` : "none";
      const p = band.pctEl;
      const fits = h > c.pctH + 2 && w > p.offsetWidth + 6 && p.textContent.trim() !== "";
      Object.assign(p.style, { left: `${x + w / 2}px`, top: `${yRun - h / 2}px`, transform: "translate(-50%, -50%)" });
      p.style.opacity = String(fits ? pct * (isTracked || tracked < 0.5 ? 1 : 0.3) * (1 - stack) : 0);
      if (col === last) lastBands[band.key] = yRun - h / 2;
      yRun -= h;
    });
    const nameW = col.name.offsetWidth;
    const nameX = Math.max(0, Math.min(SW - nameW, x + w / 2 - nameW / 2));
    let row = 0;
    while (row < nameRows - 1 && nameX < (rowEnds[row] ?? -Infinity) + 6) row++;
    Object.assign(col.name.style, { left: `${nameX}px`, top: `${row * c.nameH}px`, transform: "none" });
    const clear = nameX >= (rowEnds[row] ?? -Infinity) + 6;
    if (clear) rowEnds[row] = nameX + nameW;
    // A name under the gathered column's label steps back while the column is drawn.
    const underStackLabel = row === nameRows - 1 && nameX + nameW > stackLabelX - stackLabelW / 2 - 6;
    col.name.style.opacity = String(clear ? (underStackLabel ? 1 - stack : 1) : 0);
    Object.assign(col.totalEl.style, { left: `${x + w / 2}px`, top: `${plotBottom + 4}px`, transform: "translateX(-50%)" });
    col.totalEl.style.opacity = String(widthE * (w > col.totalEl.offsetWidth + 2 ? 1 : 0));
    x += w + gap;
  });

  Object.assign(c.widthName.style, { left: "0px", top: `${plotBottom + 4 + c.totalH + 2}px`, opacity: String(widthE) });

  // The sources, named once at the right in stacking order, each seat relaxed so no two touch.
  if (!narrow) {
    const seats = c.sources.map((key) => ({ key, y: lastBands[key] }));
    const lineH = c.labelH;
    for (let i = 0; i < seats.length; i++) seats[i].y = Math.min(seats[i].y, i ? seats[i - 1].y - lineH : plotBottom - lineH / 2);
    for (let i = seats.length - 1; i >= 0; i--) seats[i].y = Math.max(seats[i].y, i < seats.length - 1 ? seats[i + 1].y + lineH : plotTop + lineH / 2);
    for (const s of seats) {
      const node = c.sourceLabels[s.key];
      Object.assign(node.style, { left: `${plotW + 14}px`, top: `${s.y}px`, transform: "translateY(-50%)" });
      node.style.opacity = String(labels * (1 - stack));
    }
  } else for (const node of Object.values(c.sourceLabels)) node.style.opacity = "0";
  // A narrow stage names the sources in a row under the plot instead.
  c.legend.style.opacity = String(narrow ? labels * (1 - stack) : 0);

  Object.assign(c.stackLabel.style, { left: `${stackLabelX}px`, top: `${plotTop}px`, transform: "translate(-50%, -100%)", opacity: String(stack) });

  const notes = { grandNote: widthE * (1 - tracked), trackedNote: tracked * (1 - stack), stackNote: stack };
  showOneNote(Object.entries(c.notes).map(([key, node]) => [node, notes[key]]));
}

function seatMarimekko(root, carrier) {
  const data = root.__mariData || (root.__mariData = JSON.parse(carrier.getAttribute("data-marimekko")));
  const stage = root.querySelector('[data-part="stage"]');
  const legend = root.querySelector('[data-part="legend"]');
  // Decided before anything is measured: the legend row takes its height out of the stage.
  const narrow = carrier.clientWidth < 660;
  legend.style.display = narrow ? "flex" : "none";
  const columns = data.columns.map((col) => {
    const el = stage.querySelector(`[data-column="${col.key}"]`);
    return {
      ...col,
      name: el.querySelector('[data-part="name"]'),
      totalEl: el.querySelector('[data-part="total"]'),
      piece: el.querySelector('[data-part="piece"]'),
      bands: col.bands.map((b) => ({ ...b, el: el.querySelector(`[data-band="${b.key}"]`), pctEl: el.querySelector(`[data-pct="${b.key}"]`) })),
    };
  });
  const sourceLabels = Object.fromEntries(data.sources.map((k) => [k, stage.querySelector(`[data-source-label="${CSS.escape(k)}"]`)]));
  const h = (node) => node.getBoundingClientRect().height;
  root.__mari = {
    ...data,
    stage,
    columns,
    grand: data.columns.reduce((s, c) => s + c.total, 0),
    trackedTotal: data.columns.reduce((s, c) => s + c.bands.find((b) => b.key === data.tracked).value, 0),
    nameH: h(columns[0].name),
    totalH: h(columns[0].totalEl),
    pieceH: h(columns[0].piece),
    pctH: Math.max(...columns.flatMap((col) => col.bands.map((b) => h(b.pctEl)))),
    labelH: h(Object.values(sourceLabels)[0]),
    labelW: Math.max(...Object.values(sourceLabels).map((n) => n.getBoundingClientRect().width)),
    widthName: stage.querySelector('[data-part="width-name"]'),
    widthNameH: h(stage.querySelector('[data-part="width-name"]')),
    sourceLabels,
    legend,
    narrow,
    stackLabel: stage.querySelector('[data-part="stack-label"]'),
    groundRgb: getComputedStyle(root.querySelector("[data-marimekko]")).backgroundColor,
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
  };
}

// The header's notes share one slot: only the strongest shows, at its lead over the next, so two notes never overlap
// while the scroll crossfades between them — each fades out to nothing before the next fades in.
function showOneNote(entries) {
  const ranked = entries.map(([, v]) => v).sort((a, b) => b - a);
  const lead = Math.max(0, Math.min(1, ranked[0] - (ranked[1] ?? 0)));
  let shown = false;
  for (const [node, v] of entries) {
    const top = !shown && v === ranked[0];
    if (top) shown = true;
    node.style.opacity = String(top ? lead : 0);
  }
}
