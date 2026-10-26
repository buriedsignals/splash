// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   log     the income axis from linear to logarithmic: every point slides to its new x              0..1
//   brk     the break drawn down the plot                                                             0..1
//   below   the spread under the break measured: its band, its extremes ringed and named, the rest back  0..1
//   above   the spread over the break, the same                                                       0..1
//   all     both claims and the band over the break — the static plate                               0..1
//
// EVERYTHING IS PLACED IN THE READER'S PIXELS: the SVG's viewBox is the stage. On a narrow stage the plot takes the
// larger of the two bands the resting card leaves free, above it or below it.

export function applyIncomeState(root, state, context) {
  const carrier = root.querySelector("[data-income]");
  if (!carrier) return;
  if (context.resized || !root.__income) seatIncome(root, carrier);
  const c = root.__income;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const stageTop = c.stage.getBoundingClientRect().top;
  const cardTop = window.innerHeight * 0.42 - stageTop;
  const cardBottom = window.innerHeight * 0.63 - stageTop;
  const useBelow = narrow && SH - cardBottom > cardTop;
  const bandTop = useBelow ? Math.max(0, cardBottom) : 0;
  const bandBottom = narrow && !useBelow ? Math.max(SH * 0.35, cardTop - 6) : SH;

  // On a narrow stage the two claims cannot share a line: the one over the break takes a second line.
  const top = bandTop + c.claimH * (narrow ? 2 : 1) + 6;
  const bottom = bandBottom - c.tickH - c.nameH * (narrow ? 2 : 1) - 10;
  const left = c.yTickW + 8;
  const right = SW - 6;
  const logE = ease(clamp(state.log));
  const lin = (v) => v / c.linMax;
  const lg = (v) => (Math.log(v) - Math.log(c.xMin * 0.9)) / (Math.log(c.xMax * 1.1) - Math.log(c.xMin * 0.9));
  const x = (v) => left + lerp(lin(v), lg(v), logE) * (right - left);
  const y = (v) => top + (1 - (v - c.yLo) / (c.yHi - c.yLo)) * (bottom - top);
  const below = clamp(state.below);
  const above = clamp(state.above);
  const all = clamp(state.all);

  for (const g of c.grids) {
    const yy = y(Number(g.dataset.grid));
    g.setAttribute("x1", String(left));
    g.setAttribute("x2", String(right));
    g.setAttribute("y1", String(yy));
    g.setAttribute("y2", String(yy));
  }
  for (const t of c.yTicks) Object.assign(t.style, { top: `${y(Number(t.dataset.ytick))}px`, left: "0px" });
  for (const t of c.xTicks) {
    const on = t.dataset.scale === "log" ? logE : 1 - logE;
    const px = x(Number(t.dataset.xtick));
    Object.assign(t.style, { left: `${px}px`, top: `${bottom + 4}px`, opacity: String(px >= left - 1 && px <= right + 1 ? on : 0) });
  }
  const name = logE >= 0.5 ? "log" : "linear";
  for (const n of c.scaleNames) n.style.display = n.dataset.scaleName === name ? "" : "none";
  Object.assign(c.xName.style, { left: `${narrow ? 0 : left}px`, top: `${bottom + c.tickH + 6}px`, whiteSpace: narrow ? "normal" : "nowrap", width: narrow ? `${SW}px` : "auto" });

  const r = Math.max(2.5, Math.min(5, SW / 260));
  for (const p of c.points) {
    const side = p.x < c.breakAt ? "below" : "above";
    const back = side === "below" ? above : below;
    p.el.setAttribute("cx", String(x(p.x)));
    p.el.setAttribute("cy", String(y(p.y)));
    p.el.setAttribute("r", String(r));
    p.el.setAttribute("fill-opacity", String(0.55 * (1 - 0.75 * back)));
  }

  const bx = x(c.breakAt);
  const brk = ease(clamp(state.brk));
  c.breakLine.setAttribute("x1", String(bx));
  c.breakLine.setAttribute("x2", String(bx));
  c.breakLine.setAttribute("y1", String(top));
  c.breakLine.setAttribute("y2", String(lerp(top, bottom, brk)));
  c.breakLine.setAttribute("opacity", brk > 0.001 ? "1" : "0");
  const setBand = (node, x0, x1, lo, hi, on) => {
    node.setAttribute("x", String(x0));
    node.setAttribute("width", String(Math.max(0, x1 - x0)));
    node.setAttribute("y", String(y(hi)));
    node.setAttribute("height", String(Math.max(0, y(lo) - y(hi))));
    node.setAttribute("opacity", String(on));
  };
  setBand(c.bands.below, left, bx, c.spread.below.lo, c.spread.below.hi, below);
  setBand(c.bands.above, bx, right, c.spread.above.lo, c.spread.above.hi, Math.max(above, all));

  Object.assign(c.claims.below.style, { left: `${left + 4}px`, top: `${bandTop}px`, opacity: String(Math.max(below, all) * brk) });
  const aboveW = c.claims.above.offsetWidth;
  Object.assign(c.claims.above.style, { left: `${Math.min(bx + 6, SW - aboveW)}px`, top: `${bandTop + (narrow ? c.claimH : 0)}px`, opacity: String(Math.max(above, all) * brk) });

  for (const e of c.extremes) {
    const on = e.side === "below" ? below : above;
    const px = x(e.point.x);
    const py = y(e.point.y);
    e.ring.setAttribute("cx", String(px));
    e.ring.setAttribute("cy", String(py));
    e.ring.setAttribute("r", String(r + 3));
    e.ring.setAttribute("opacity", String(on));
    const w = e.label.offsetWidth;
    const toLeft = px + r + 6 + w > right;
    Object.assign(e.label.style, { left: `${toLeft ? px - r - 6 - w : px + r + 6}px`, top: `${py}px`, transform: "translateY(-50%)", opacity: String(on) });
  }

  const notes = { logNote: logE * (1 - brk), breakNote: brk * (1 - Math.max(below, above, all)), belowNote: below, aboveNote: above };
  showOneNote(Object.entries(c.notes).map(([key, node]) => [node, notes[key]]));
}

function seatIncome(root, carrier) {
  const data = root.__incomeData || (root.__incomeData = JSON.parse(carrier.getAttribute("data-income")));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  svg.setAttribute("preserveAspectRatio", "none");
  const byCode = Object.fromEntries(data.points.map((p) => [p.code, p]));
  const yTicks = Array.from(stage.querySelectorAll("[data-ytick]"));
  root.__income = {
    ...data,
    stage,
    svg,
    xMin: Math.min(...data.points.map((p) => p.x)),
    xMax: Math.max(...data.points.map((p) => p.x)),
    linMax: Math.ceil((Math.max(...data.points.map((p) => p.x)) * 1.04) / 25000) * 25000,
    yLo: data.yTicks[0],
    yHi: data.yTicks[data.yTicks.length - 1],
    points: data.points.map((p) => ({ ...p, el: svg.querySelector(`[data-point="${p.code}"]`) })),
    grids: Array.from(svg.querySelectorAll("[data-grid]")),
    yTicks,
    yTickW: Math.max(...yTicks.map((t) => t.getBoundingClientRect().width)),
    xTicks: Array.from(stage.querySelectorAll("[data-xtick]")),
    tickH: stage.querySelector("[data-xtick]").getBoundingClientRect().height,
    xName: stage.querySelector('[data-part="x-name"]'),
    scaleNames: Array.from(stage.querySelectorAll("[data-scale-name]")),
    nameH: stage.querySelector('[data-part="x-name"]').getBoundingClientRect().height,
    breakLine: svg.querySelector('[data-part="break"]'),
    bands: { below: svg.querySelector('[data-band="below"]'), above: svg.querySelector('[data-band="above"]') },
    claims: { below: stage.querySelector('[data-claim="below"]'), above: stage.querySelector('[data-claim="above"]') },
    claimH: stage.querySelector('[data-claim="below"]').getBoundingClientRect().height,
    extremes: data.extremes.map((e) => ({ ...e, point: byCode[e.code], ring: svg.querySelector(`[data-ring="${e.code}"]`), label: stage.querySelector(`[data-extreme="${e.code}"]`) })),
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
