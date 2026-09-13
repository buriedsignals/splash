// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option and
// called by `skills/scrolly/assets/reveal.mjs` with the state the scroll has reached.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   trace    how far the curve has drawn itself, left to right             0..1
//   line     the curve itself, before the surface replaces it              0..1
//   peak     the 1973 peak named on the curve                              0..1
//   end      the last reading, beside the end of the curve                 0..1
//   fill     how far the surface has filled, left to right                 0..1
//   stock    the running stock counter above the plot                      0..1
//   split    the rule at the midpoint year, the earlier half's tint        0..1
//   halfA    the earlier half's own name                                   0..1
//   rescale  the x window closing from the whole series onto the recent half 0..1
//   halfB    the later half's own name                                     0..1
//
// THE RESCALE IS A WINDOW. The SVG's viewBox travels from [first, last] to [zoomFrom, last]; every word
// maps its year through the same window, so the words and the geometry cannot disagree. A word whose
// year leaves the window fades rather than slides into a gutter.

export function applyAreaState(root, state) {
  const carrier = root.matches("[data-series]") ? root : root.querySelector("[data-series]");
  if (!carrier) throw new Error("this visual carries no data-series — DirectedAreaScrolly writes it on its own root");
  const s = root.__area || (root.__area = JSON.parse(carrier.getAttribute("data-series")));
  const part = (name) => root.querySelector(`[data-part="${name}"]`);
  const box = part("plot");
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!(W > 0 && H > 0)) return;
  const VW = 1000;
  const VH = 500;
  const X = (year) => ((year - s.first) / (s.last - s.first)) * VW;
  const lo = s.first + (s.zoomFrom - s.first) * state.rescale;
  const hi = s.last;
  const frac = (year) => (year - lo) / (hi - lo);
  const pct = (year) => `${frac(year) * 100}%`;
  const inWindow = (year) => (year >= lo - 1e-9 ? 1 : 0);
  const py = (mt) => H - (mt / s.top) * H;

  part("field").setAttribute("viewBox", `${X(lo)} 0 ${X(hi) - X(lo)} ${VH}`);
  part("fill-clip").setAttribute("width", String(state.fill * VW));
  part("line-clip").setAttribute("width", String(state.trace * VW));
  part("line").style.opacity = String(state.line);
  part("earlier-tint").style.opacity = String(state.split);
  part("rule").style.opacity = String(state.split);
  // A word named on the curve waits for the trace to reach it: a label ahead of its own line names a
  // point the reader has not been shown yet.
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const traced = s.first + state.trace * (s.last - s.first);
  const reachedBy = (year) => clamp((traced - year) / 4);
  for (const name of ["end", "end-dot"]) part(name).style.opacity = String(state.end * reachedBy(s.last - 4));

  // The peak, named where it is — and gone once the window has closed past it.
  const peak = part("peak");
  peak.style.left = pct(s.peak.year);
  peak.style.opacity = String(state.peak * reachedBy(s.peak.year) * inWindow(s.peak.year));

  // The stock, counted up to the year the fill has reached.
  const reached = s.first + state.fill * (s.last - s.first);
  const stock = s.readings.reduce((sum, r) => (r.year <= reached ? sum + r.mt : sum), 0);
  const counter = part("stock");
  const text = `${Math.round(stock).toLocaleString("fr-FR").replace(/[  ]/g, " ")} ${counter.dataset.suffix}`;
  if (counter.textContent !== text) counter.textContent = text;
  counter.style.opacity = String(state.stock);

  // The midpoint year, above the highest stretch of curve under its own width, in the current window.
  const px = (year) => frac(year) * W;
  const ruleLabel = part("rule-label");
  {
    const half = ruleLabel.offsetWidth / 2 + 4;
    const near = s.readings.filter((r) => Math.abs(px(r.year) - px(s.midpoint)) <= half);
    const crest = Math.min(...near.map((r) => py(r.mt)));
    ruleLabel.style.left = pct(s.midpoint);
    ruleLabel.style.top = `${(crest / H) * 100}%`;
    ruleLabel.style.opacity = String(state.split * inWindow(s.midpoint));
  }

  // Each half named inside itself where it fits, in the current window.
  const seat = (name, span, opacity) => {
    const label = part(name);
    const w = label.offsetWidth;
    const h = label.offsetHeight;
    const visible = span.filter((r) => r.year >= lo);
    let best = null;
    let room = 0;
    if (visible.length > 1)
      for (const r of visible) {
        const left = px(r.year) - w / 2;
        const right = px(r.year) + w / 2;
        if (left < Math.max(px(visible[0].year), 0) + 2 || right > Math.min(px(visible[visible.length - 1].year), W) - 2) continue;
        const covered = visible.filter((v) => px(v.year) >= left && px(v.year) <= right);
        const headroom = H - py(Math.min(...covered.map((v) => v.mt)));
        if (headroom > room) {
          room = headroom;
          best = { x: px(r.year), y: H - headroom / 2 };
        }
      }
    const fits = best !== null && room >= h * 1.8;
    if (fits) {
      label.style.left = `${(best.x / W) * 100}%`;
      label.style.top = `${(best.y / H) * 100}%`;
    }
    label.style.opacity = String(fits ? opacity : 0);
  };
  seat("half-a", s.readings.filter((r) => r.year <= s.midpoint), state.halfA * (1 - state.rescale));
  seat("half-b", s.readings.filter((r) => r.year >= s.midpoint), state.halfB);

  // Two tick sets, one per window, and only one at a time: cross-faded, the two sets printed years over
  // each other mid-travel. Within the set shown, a tick that would touch its neighbour gives way.
  for (const set of ["full", "zoom"]) {
    const ticks = Array.from(root.querySelectorAll(`[data-xtick][data-set="${set}"]`));
    const weight = (set === "full") === state.rescale < 0.5 ? 1 : 0;
    // Right to left, so the last year is the one that always stays.
    let left = Infinity;
    for (const tick of ticks.reverse()) {
      const year = Number(tick.dataset.xtick);
      tick.style.left = pct(year);
      const visible = year >= lo && year <= hi;
      tick.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      const r = tick.getBoundingClientRect();
      const clear = r.right <= left - 8;
      tick.style.opacity = String(clear ? weight : 0);
      if (clear) left = r.left;
    }
  }
}
