// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the playhead: every line drawn up to this year, each country named at its head          first..last year
//   rings    the subject's crossings ringed as the playhead reaches them, the latest one captioned      0..1
//   retreat  every line but the subject's stepping back                                               0..1
//   exit     the countries that left the top ten drawn in the ink, where they left written             0..1
//   note     which header note is read                                                                0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: one row a rank, rank 1 at the top, one column a year;
// a line that leaves the top ten stops at the last year it held a place.

export function applyBumpState(root, state, context) {
  const carrier = root.querySelector("[data-bump]");
  if (!carrier) return;
  if (context.resized || !root.__bump) seatBump(root, carrier);
  const c = root.__bump;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const first = c.years[0];
  const last = c.years[c.years.length - 1];
  const head = Math.max(first, Math.min(last, state.year));
  const retreat = clamp(state.retreat);
  const exit = clamp(state.exit);
  const rings = clamp(state.rings);

  const labelW = Math.max(...c.tracks.map((t) => t.label.offsetWidth));
  const x0 = c.rankW + 10;
  const x1 = SW - labelW - 14;
  const X = (y) => x0 + ((y - first) / (last - first)) * (x1 - x0);
  const top = c.labelH / 2 + 2;
  const bottom = SH - c.tickH - 10;
  const rowH = (bottom - top) / (c.slots - 1);
  const Y = (rank) => top + (rank - 1) * rowH;

  c.rows.forEach((line, i) => set(line, { x1: x0, x2: x1, y1: Y(i + 1), y2: Y(i + 1) }));
  c.ranks.forEach((node, i) => Object.assign(node.style, { left: `${x0 - 10}px`, top: `${Y(i + 1)}px`, transform: "translate(-100%, -50%)" }));
  c.xTicks.forEach((t) => Object.assign(t.node.style, { left: `${X(t.year)}px`, top: `${bottom + 6}px`, transform: "translateX(-50%)" }));
  c.clip.setAttribute("width", String(X(head) + 10000 + 1));
  set(c.headLine, { x1: X(head), x2: X(head), y1: top - 6, y2: bottom, opacity: head < last - 0.01 ? 0.6 : 0 });

  for (const t of c.tracks) {
    // Runs of consecutive years; a gap in membership breaks the line.
    let d = "";
    t.points.forEach(([year, rank], i) => {
      const prev = t.points[i - 1];
      d += `${prev && prev[0] === year - 1 ? "L" : "M"}${X(year).toFixed(1)} ${Y(rank).toFixed(1)}`;
    });
    const kept = t.subject ? 1 : t.left ? lerp(1 - 0.75 * retreat, 1, exit) : 1 - 0.75 * Math.max(retreat, exit);
    const colour = t.subject ? c.colours.subject : mixHex(c.colours.field, c.colours.left, t.left ? exit : 0);
    set(t.path, { d, opacity: kept, stroke: colour, "stroke-width": t.subject ? c.series * 1.6 : c.series * lerp(0.8, 1.4, t.left ? exit : 0) });

    // Where the line is at the playhead: interpolated inside a run, at its last point once it has left.
    const k = t.points.findIndex(([year]) => year > head);
    const beforeIdx = k === -1 ? t.points.length - 1 : k - 1;
    const started = beforeIdx >= 0;
    const at = started ? t.points[beforeIdx] : null;
    const next = k >= 0 ? t.points[k] : null;
    const inRun = at && next && next[0] === at[0] + 1;
    // A country that leaves fades within half a year of its last point, so its name never lingers over its successor.
    const live = !started ? 0 : inRun || (k === -1 && at[0] === last) ? 1 : clamp((at[0] + 0.5 - head) * 2);
    const hx = live ? X(inRun ? head : at[0]) : at ? X(at[0]) : 0;
    const hy = live ? Y(inRun ? lerp(at[1], next[1], head - at[0]) : at[1]) : at ? Y(at[1]) : 0;
    set(t.end, { cx: hx, cy: hy, opacity: started ? kept : 0, fill: colour });
    Object.assign(t.label.style, { left: `${hx + 10}px`, top: `${hy}px`, transform: "translateY(-50%)", opacity: String(live * kept) });
    if (t.exitNode) {
      const [ey, er] = t.points[t.points.length - 1];
      Object.assign(t.exitNode.style, { left: `${X(ey) + 8}px`, top: `${Y(er) - 4}px`, transform: "translateY(-100%)", opacity: String(exit * (head >= ey ? 1 : 0)) });
    }
  }

  // The subject's crossings: ringed once reached; the latest reached captioned.
  const reached = c.crossings.map((x) => head >= x.year);
  const latest = reached.lastIndexOf(true);
  c.crossings.forEach((x, i) => {
    const cx = X(x.year - 0.5);
    const cy = Y((x.from + x.to) / 2);
    set(x.ring, { cx, cy, opacity: rings * clamp((head - (x.year - 0.5)) * 2) });
    // The caption sits in the corridor the crossing opened, right of the ring; it waits until the playhead's own
    // labels have moved far enough on not to lie over it.
    const w = x.label.offsetWidth;
    const lx = Math.min(x1 - w, cx + 12);
    const clear = clamp((X(head) - (lx + w) - 8) / 30);
    Object.assign(x.label.style, { left: `${lx}px`, top: `${cy - 12}px`, transform: "translateY(-100%)", opacity: String(rings * (i === latest ? 1 : 0) * clear) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
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

function seatBump(root, carrier) {
  const data = root.__bumpData || (root.__bumpData = JSON.parse(carrier.getAttribute("data-bump")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const h = (node) => node.getBoundingClientRect().height;
  const tracks = data.tracks.map((t) => ({
    ...t,
    path: q(`[data-track="${CSS.escape(t.key)}"]`),
    end: q(`[data-end="${CSS.escape(t.key)}"]`),
    label: q(`[data-label="${CSS.escape(t.key)}"]`),
    exitNode: t.left ? q(`[data-exit="${CSS.escape(t.key)}"]`) : null,
  }));
  const ranks = Array.from({ length: data.slots }, (_, i) => q(`[data-rank="${i + 1}"]`));
  root.__bump = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    clip: q('[data-part="clip"]'),
    headLine: q('[data-part="head"]'),
    rows: Array.from({ length: data.slots }, (_, i) => q(`[data-row="${i + 1}"]`)),
    ranks,
    rankW: Math.max(...ranks.map((n) => n.getBoundingClientRect().width)),
    xTicks: data.xTicks.map((year) => ({ year, node: q(`[data-x-tick="${year}"]`) })),
    tracks,
    crossings: data.crossings.map((x, i) => ({ ...x, ring: q(`[data-crossing="${i}"]`), label: q(`[data-crossing-label="${i}"]`) })),
    labelH: h(tracks[0].label),
    tickH: h(q("[data-x-tick]")),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
