// The painting function for this beat's one visual, inlined into the page by `renderScrolly`'s
// `reveal` option and called by `skills/scrolly/assets/reveal.mjs` with the state the scroll has
// reached. It only ever sets opacities, one clip width and the seats of four labels — the geometry
// is SSR'd once by `DirectedAreaScrolly.tsx` and never rebuilt.
//
// A STATE, field by field (every field a number, so a state interpolates):
//   line   the curve drawn alone, before the surface is asked for          0..1
//   fill   how far the surface has filled, left to right, as a fraction   0..1
//   split  the earlier half turning to its tint                            0..1
//   rule   the rule at the midpoint year, and its label                    0..1
//   halfA  the earlier half's own name                                     0..1
//   halfB  the later half's own name                                       0..1
//   end    the last reading, at the end of the curve                       0..1
//
// SEATS ARE MEASURED HERE, IN THE READER'S OWN PIXELS, on the first paint and after every resize.
// The static plate measures them once at 960 x 540; this frame is any size from a phone to a wide
// desktop, so the same rules run against the box the browser actually laid out:
//   - a half is named inside itself only where the surface is taller than the label and the half
//     wider than it (the static plate's `seatFor`, unchanged in substance);
//   - the midpoint year sits above the highest stretch of curve under its own width;
//   - an x tick that would touch its neighbour is not drawn, and the last year always is.

export function applyAreaState(root, state, context) {
  const part = (name) => root.querySelector(`[data-part="${name}"]`);
  const clip = part("clip");
  if (clip) clip.setAttribute("width", String(state.fill * 1000));
  const set = (name, value) => {
    const node = part(name);
    if (node) node.style.opacity = String(value);
  };
  set("line", state.line);
  set("earlier-tint", state.split);
  set("rule", state.rule);
  set("rule-label", state.rule);
  set("end", state.end);
  set("end-dot", state.end);

  if (context.resized) seatAreaLabels(root);
  const seated = (name) => part(name)?.dataset.seated === "1";
  set("half-a", seated("half-a") ? state.halfA : 0);
  set("half-b", seated("half-b") ? state.halfB : 0);
}

export function seatAreaLabels(root) {
  const box = root.querySelector('[data-part="plot"]');
  if (!box) return;
  // `root` is the scaffold's own wrapper; the series travels on the component inside it.
  const carrier = root.matches("[data-series]") ? root : root.querySelector("[data-series]");
  if (!carrier) throw new Error("this visual carries no data-series — DirectedAreaScrolly writes it on its own root");
  const series = JSON.parse(carrier.getAttribute("data-series"));
  const { first, last, top, midpoint, readings } = series;
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!(W > 0 && H > 0)) return;
  const px = (year) => ((year - first) / (last - first)) * W;
  const py = (mt) => H - (mt / top) * H;

  function seatHalf(name, span) {
    const label = root.querySelector(`[data-part="${name}"]`);
    if (!label) return;
    const w = label.offsetWidth;
    const h = label.offsetHeight;
    let seat = null;
    let room = 0;
    for (const r of span) {
      const left = px(r.year) - w / 2;
      const right = px(r.year) + w / 2;
      if (left < px(span[0].year) + 2 || right > px(span[span.length - 1].year) - 2) continue;
      const covered = span.filter((s) => px(s.year) >= left && px(s.year) <= right);
      const headroom = H - py(Math.min(...covered.map((s) => s.mt)));
      if (headroom > room) {
        room = headroom;
        seat = { x: px(r.year), y: H - headroom / 2 };
      }
    }
    const fits = seat !== null && room >= h * 1.8;
    label.dataset.seated = fits ? "1" : "0";
    if (!fits) return;
    label.style.left = `${(seat.x / W) * 100}%`;
    label.style.top = `${(seat.y / H) * 100}%`;
  }
  seatHalf("half-a", readings.filter((r) => r.year <= midpoint));
  seatHalf("half-b", readings.filter((r) => r.year >= midpoint));

  // THE MIDPOINT YEAR SITS ABOVE THE CURVE UNDER ITS OWN WIDTH, not above the one reading at the
  // rule: at a phone's width the neighbouring peaks rise over that reading and ran through the digits.
  const ruleLabel = root.querySelector('[data-part="rule-label"]');
  if (ruleLabel) {
    const half = ruleLabel.offsetWidth / 2 + 4;
    const near = readings.filter((r) => Math.abs(px(r.year) - px(midpoint)) <= half);
    const crest = Math.min(...near.map((r) => py(r.mt)));
    ruleLabel.style.top = `${(crest / H) * 100}%`;
    ruleLabel.style.transform = "translate(-50%, calc(-100% - 6px))";
  }

  const ticks = Array.from(root.querySelectorAll("[data-xtick]"));
  let right = -Infinity;
  const kept = [];
  for (const tick of ticks) {
    tick.style.visibility = "visible";
    const r = tick.getBoundingClientRect();
    if (r.left < right + 8) tick.style.visibility = "hidden";
    else {
      kept.push({ tick, r });
      right = r.right;
    }
  }
  const lastTick = ticks[ticks.length - 1];
  if (lastTick && lastTick.style.visibility === "hidden") {
    lastTick.style.visibility = "visible";
    const edge = lastTick.getBoundingClientRect().left;
    for (let i = kept.length - 1; i >= 0 && kept[i].r.right + 8 > edge; i--) kept[i].tick.style.visibility = "hidden";
  }
}
