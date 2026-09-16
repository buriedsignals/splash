// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   reach    the year the line is drawn to, read between two years; a dot rides its end               1950..2024
//   peak     the 1973 peak marked and written                                                         0..1
//   band     the plateau read as a band, its floor and ceiling written                                0..1
//   runner   the year that came closest to the peak marked and written                                0..1
//   cross    the first year under the 1967 level ringed and written                                   0..1
//   zoom     the scales travelling from the whole series to the last ten years, each year written    0..1
//   end      the last year written                                                                    0..1
//   note     which header note is read                                                                0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: both scales are interpolated between the wide view and
// the close-up, and every mark and label follows them; the plot is clipped so the close-up hides what it leaves out.

export function applyLineState(root, state, context) {
  const carrier = root.querySelector("[data-line]");
  if (!carrier) return;
  if (context.resized || !root.__line) seatLine(root, carrier);
  const c = root.__line;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const zoom = ease(clamp(state.zoom));
  const peakOn = clamp(state.peak);
  const bandOn = clamp(state.band);
  const runnerOn = clamp(state.runner);
  const crossOn = clamp(state.cross);
  const endOn = clamp(state.end);

  const x0 = c.tickW + 10;
  const x1 = SW - (narrow ? 8 : 14);
  const top = c.labelH * 0.6;
  const bottom = SH - c.tickH - 10;
  const { wide, zoom: close } = c.domains;
  const dx = [lerp(wide.x[0], close.x[0], zoom), lerp(wide.x[1], close.x[1], zoom)];
  const dy = [lerp(wide.y[0], close.y[0], zoom), lerp(wide.y[1], close.y[1], zoom)];
  const X = (year) => x0 + ((year - dx[0]) / (dx[1] - dx[0])) * (x1 - x0);
  const Y = (v) => bottom - ((v - dy[0]) / (dy[1] - dy[0])) * (bottom - top);
  const inside = (px, a, b) => (px >= a - 0.5 && px <= b + 0.5 ? 1 : 0);
  const pad = 12;
  set(c.clip, { x: x0 - pad, y: top - pad, width: x1 - x0 + 2 * pad, height: bottom - top + 2 * pad });

  // Both sets of ticks follow the moving scales; each set is read only in its own view.
  for (const t of c.ticks) {
    const shown = t.set === "wide" ? 1 - zoom : zoom;
    if (t.axis === "y") {
      const y = Y(t.value);
      const on = shown * inside(y, top, bottom);
      if (t.line) set(t.line, { x1: x0, x2: x1, y1: y, y2: y, opacity: on });
      Object.assign(t.label.style, { left: `${x0 - 8}px`, top: `${y}px`, transform: "translate(-100%, -50%)", opacity: String(on) });
    } else {
      const x = X(t.value);
      Object.assign(t.label.style, { left: `${x}px`, top: `${bottom + 6}px`, transform: "translateX(-50%)", opacity: String(shown * inside(x, x0, x1)) });
    }
  }

  // The line to the reach year, its end between two readings.
  const first = c.points[0][0];
  const last = c.points[c.points.length - 1][0];
  const reach = Math.max(first, Math.min(last, state.reach));
  const valueAt = (year) => {
    const i = Math.min(c.points.length - 2, Math.floor(year - first));
    const [ya, va] = c.points[i];
    const [, vb] = c.points[i + 1];
    return lerp(va, vb, year - ya);
  };
  const drawn = c.points.filter(([year]) => year < reach).map(([year, v]) => [X(year), Y(v)]);
  const headX = X(reach);
  const headY = Y(valueAt(reach));
  drawn.push([headX, headY]);
  set(c.path, { d: `M${drawn.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` });
  set(c.head, { cx: headX, cy: headY });

  // The 1967 rule and its label, above the rule at the left where the early line runs under it.
  const refY = Y(c.reference);
  set(c.referenceRule, { x1: x0, x2: x1, y1: refY, y2: refY });
  // On a phone the plateau's floor label sits just above it, so the rule's label steps aside while the band is read.
  Object.assign(c.referenceLabel.style, { left: `${x0 + 4}px`, top: `${refY - 4}px`, transform: "translateY(-100%)", opacity: String(narrow ? 1 - bandOn : 1) });

  // The plateau band and its floor.
  const [bFrom, bTo, bLo, bHi] = c.plateau;
  set(c.band, { x: X(bFrom), y: Y(bHi), width: Math.max(0, X(bTo) - X(bFrom)), height: Math.max(0, Y(bLo) - Y(bHi)), opacity: bandOn });
  Object.assign(c.bandLabel.style, { left: `${(X(bFrom) + X(bTo)) / 2}px`, top: `${Y(bLo) + 6}px`, transform: "translateX(-50%)", opacity: String(bandOn * (1 - zoom)) });

  // The peak written to its left and the runner-up to its right, so the two never meet on a phone.
  const [pYear, pValue] = c.peak;
  set(c.peakDot, { cx: X(pYear), cy: Y(pValue), opacity: peakOn * (1 - zoom) });
  Object.assign(c.peakLabel.style, { left: `${X(pYear) + 4}px`, top: `${Y(pValue) - 8}px`, transform: "translate(-100%, -100%)", opacity: String(peakOn * (1 - zoom)) });
  const [rYear, rValue] = c.runnerUp;
  set(c.runnerDot, { cx: X(rYear), cy: Y(rValue), opacity: runnerOn * (1 - zoom) });
  Object.assign(c.runnerLabel.style, { left: `${X(rYear) - 4}px`, top: `${Y(rValue) - 8}px`, transform: "translateY(-100%)", opacity: String(runnerOn * (1 - zoom)) });

  // The first year under the rule, and the last year: written below and to the left of the line's end.
  const [cYear, cValue] = c.cross;
  set(c.crossRing, { cx: X(cYear), cy: Y(cValue), opacity: crossOn });
  Object.assign(c.crossLabel.style, { left: `${X(cYear) - 12}px`, top: `${Y(cValue) + 10}px`, transform: "translateX(-100%)", opacity: String(crossOn * (1 - zoom)) });
  Object.assign(c.endLabel.style, { left: `${headX - 10}px`, top: `${headY + 10}px`, transform: "translateX(-100%)", opacity: String(endOn * (1 - zoom)) });

  // The close-up: every year a dot and its value; the first year under the rule written below its dot.
  c.zoomYears.forEach(({ year, dot, label }, k) => {
    const v = c.points[year - first][1];
    const x = X(year);
    const below = year === cYear;
    const kept = narrow ? (below || year === last || k % 2 === 0 ? 1 : 0) : 1;
    set(dot, { cx: x, cy: Y(v), opacity: zoom });
    Object.assign(label.style, { left: `${x}px`, top: `${below ? Y(v) + 10 : Y(v) - 10}px`, transform: below ? "translateX(-50%)" : "translate(-50%, -100%)", opacity: String(clamp((zoom - 0.6) / 0.4) * kept) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatLine(root, carrier) {
  const data = root.__lineData || (root.__lineData = JSON.parse(carrier.getAttribute("data-line")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const box = (node) => node.getBoundingClientRect();
  const ticks = ["wide", "zoom"].flatMap((set) => [
    ...data.ticks[set].y.map((value) => ({ set, axis: "y", value, line: q(`[data-grid-y="${set}:${value}"]`), label: q(`[data-tick-y="${set}:${value}"]`) })),
    ...data.ticks[set].x.map((value) => ({ set, axis: "x", value, label: q(`[data-tick-x="${set}:${value}"]`) })),
  ]);
  root.__line = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    clip: q('[data-part="clip"]'),
    ticks,
    path: q('[data-part="line"]'),
    head: q('[data-part="head"]'),
    referenceRule: q('[data-part="reference"]'),
    referenceLabel: q('[data-part="reference-label"]'),
    band: q('[data-part="band"]'),
    bandLabel: q('[data-part="band-label"]'),
    peakDot: q('[data-part="peak"]'),
    peakLabel: q('[data-part="peak-label"]'),
    runnerDot: q('[data-part="runner-up"]'),
    runnerLabel: q('[data-part="runner-up-label"]'),
    crossRing: q('[data-part="cross"]'),
    crossLabel: q('[data-part="cross-label"]'),
    endLabel: q('[data-part="end-label"]'),
    zoomYears: data.zoomYears.map((year) => ({ year, dot: q(`[data-zoom-dot="${year}"]`), label: q(`[data-zoom-value="${year}"]`) })),
    tickW: Math.max(...ticks.filter((t) => t.axis === "y").map((t) => box(t.label).width)),
    tickH: box(ticks.find((t) => t.axis === "x").label).height,
    labelH: box(q('[data-part="peak-label"]')).height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
