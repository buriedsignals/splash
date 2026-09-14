// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the playhead: the stream drawn up to this year                                       first..last year
//   retreat  the two giants withdrawn: their bands thin to nothing and the scale fits what is left    0..1
//   cross    the year the tracked source passed its rival marked, both values written                0..1
//   end      the last year marked, the tracked source against its rival                              0..1
//   note     which header note is read                                                               0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: a silhouette stack in the layers' inside-out order,
// its outline smoothed through every year; each band named inside itself at the year it is thickest, when it is thick
// enough to hold its name.

export function applyStreamState(root, state, context) {
  const carrier = root.querySelector("[data-stream]");
  if (!carrier) return;
  if (context.resized || !root.__stream) seatStream(root, carrier);
  const c = root.__stream;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const first = c.years[0];
  const last = c.years[c.years.length - 1];
  const nY = c.years.length;
  const year = Math.max(first, Math.min(last, state.year));
  const retreat = ease(clamp(state.retreat));

  const top = c.markH + 8;
  const bottom = SH - c.tickH - 8;
  const cy = (top + bottom) / 2;
  const X = (t) => ((t - first) / (last - first)) * SW;

  // ── the stack: silhouette, inside-out, the giants weighted out by the retreat ──
  const weightOf = (layer) => (layer.giant ? 1 - retreat : 1);
  const totals = c.years.map((_, t) => c.layers.reduce((s, l) => s + l.values[t] * weightOf(l), 0));
  const allMax = Math.max(...c.years.map((_, t) => c.layers.reduce((s, l) => s + l.values[t], 0)));
  const smallMax = Math.max(...c.years.map((_, t) => c.layers.reduce((s, l) => s + (l.giant ? 0 : l.values[t]), 0)));
  const scaleMax = lerp(allMax, smallMax, retreat) * 1.08;
  const ppu = (bottom - top) / scaleMax;
  const edges = new Map();
  const run = totals.map((T) => -T / 2);
  for (const index of c.order) {
    const l = c.layers[index];
    const lo = run.slice();
    const hi = run.map((v, t) => v + l.values[t] * weightOf(l));
    for (let t = 0; t < nY; t++) run[t] = hi[t];
    edges.set(l.key, { lo, hi });
  }
  const Y = (v) => cy - v * ppu;

  const smooth = (pts) => {
    // Catmull–Rom through every year, as cubic Béziers.
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };

  const playX = X(year);
  c.playhead.setAttribute("width", String(playX + 1));
  for (const l of c.layers) {
    const { lo, hi } = edges.get(l.key);
    const upper = c.years.map((yr, t) => [X(yr), Y(hi[t])]);
    const lower = c.years.map((yr, t) => [X(yr), Y(lo[t])]).reverse();
    l.path.setAttribute("d", `M${upper[0][0]} ${upper[0][1]}${smooth(upper)} L${lower[0][0]} ${lower[0][1]}${smooth(lower)} Z`);

    // Named inside itself where it is thickest, among the years already drawn.
    let bestT = 0;
    let bestH = -1;
    for (let t = 0; t < nY; t++) {
      if (c.years[t] > year) break;
      const h = (hi[t] - lo[t]) * ppu;
      if (h > bestH) {
        bestH = h;
        bestT = t;
      }
    }
    const w = l.label.offsetWidth;
    const lx = Math.max(4, Math.min(SW - w - 4, X(c.years[bestT]) - w / 2));
    const ly = Y((hi[bestT] + lo[bestT]) / 2);
    Object.assign(l.label.style, { left: `${lx}px`, top: `${ly}px`, transform: "translateY(-50%)", opacity: String(bestH > c.labelH + 2 ? 1 : 0) });
  }

  // ── the marks ──
  const markOn = [clamp(state.cross), clamp(state.end)];
  c.marks.forEach((m, k) => {
    const x = X(m.year);
    set(m.line, { x1: x, x2: x, y1: top - 2, y2: bottom, opacity: markOn[k] });
    const w = m.label.offsetWidth;
    Object.assign(m.label.style, { left: `${Math.max(0, Math.min(SW - w, x - w / 2))}px`, top: "0px", opacity: String(markOn[k]) });
  });

  for (const t of c.xTicks) {
    const x = X(t.value);
    set(t.grid, { x1: x, x2: x, y1: top, y2: bottom, opacity: 0.6 });
    const w = t.node.offsetWidth;
    Object.assign(t.node.style, { left: `${Math.max(0, Math.min(SW - w, x - w / 2))}px`, top: `${bottom + 4}px` });
  }

  const drawText = c.drawNote.dataset.template.replace("{year}", String(Math.round(year)));
  if (c.drawNote.textContent !== drawText) c.drawNote.textContent = drawText;
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function seatStream(root, carrier) {
  const data = root.__streamData || (root.__streamData = JSON.parse(carrier.getAttribute("data-stream")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const layers = data.layers.map((l) => ({ ...l, path: q(`[data-layer="${CSS.escape(l.key)}"]`), label: q(`[data-label="${CSS.escape(l.key)}"]`) }));
  const marks = data.marks.map((year) => ({ year, line: q(`[data-mark="${year}"]`), label: q(`[data-mark-label="${year}"]`) }));
  const xTicks = data.xTicks.map((value) => ({ value, grid: q(`[data-x-grid="${value}"]`), node: q(`[data-x-tick="${value}"]`) }));
  root.__stream = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    playhead: q('[data-part="playhead"]'),
    layers,
    marks,
    xTicks,
    labelH: h(layers[0].label),
    markH: Math.max(...marks.map((m) => h(m.label))),
    tickH: h(xTicks[0].node),
    drawNote: root.querySelector('[data-note="drawNote"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
