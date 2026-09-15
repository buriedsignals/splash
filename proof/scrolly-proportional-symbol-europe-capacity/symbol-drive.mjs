// The painting function for the proportional symbol scrolly, inlined by `renderScrolly`'s `reveal` option AFTER the
// map runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap` are in
// scope, nothing here is global unless it is put on `window`.
//
// The runtime owns the camera and every paint inside the map (`plan.mjs`). This file owns what sits outside the
// plan: which frozen card image lies under the live map, the counter and its two notes, the cut, and the key's
// circles, sized for the camera the reader is on.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   level    how many stations stand, as a power of ten, largest first: 0 is the largest alone, 2 the hundred
//            largest; a rank band arrives as the count passes its ranks                                  0..log10(n)
//   largest  the largest station named                                                                  0..1
//   subject  the nuclear sites drawn in the ink, whatever their rank; every other station steps back      0..1
//   zoom     the travel from the whole map onto the country with most nuclear sites                       0..1
//   cut      the static plate's cut stated                                                               0..1
//   card     the nearest card, for its frozen image                                                      0..5
//   camX camY camZoom camBearing camPitch camAlignY   the card's camera (`shared/map-beat/scrolly.mjs`)

export function applySymbolState(root, state) {
  if (!root.__symbols) setUpSymbols(root);
  const c = root.__symbols;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeTravel = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));

  // LIVE MEANS A LIVE MAP IS ON SCREEN (`ready`): once it is the picture, no card image stays under it.
  const shownLive = Boolean(c.handle && c.handle.ready);
  c.fallbacks.forEach((img) => {
    const opacity = !shownLive && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  // THE KEY STATES THE SCALE AT THE WHOLE-MAP CAMERA ON THIS STAGE, the camera it is read with, by the same radius
  // rule as the map's own circles (`plan.radius`); a frozen card image is shown at that same scale (`cover`). While
  // the camera travels onto the close-up its circles would no longer be true, so they fade with the travel.
  const width = c.stage.clientWidth;
  const height = c.stage.clientHeight;
  const whole = stageViewOf(c.plan, c.plan.cameras[0], width, height);
  const r = c.plan.radius;
  const largestPx = r.largestPx * 2 ** (r.growth * (whole.zoom - r.anchorZoom));
  const travel = easeTravel(clamp(state.zoom));
  for (const swatch of c.sizeSwatches) {
    const d = `${2 * largestPx * Math.sqrt(Number(swatch.dataset.mw) / c.maxMw) + 1.5}px`;
    if (swatch.style.width !== d) Object.assign(swatch.style, { width: d, height: d });
    swatch.style.opacity = String(1 - travel);
  }

  // The counter: the stations standing, their share of the sites and of the power.
  const n = c.cumulative.length;
  const k = Math.max(1, Math.round(Math.min(n, 10 ** Math.max(0, state.level))));
  const text = c.counter.dataset.template
    .replace("{n}", c.format(k))
    .replace("centrales", k === 1 ? "centrale" : "centrales")
    .replace("{sites}", c.percent((k / n) * 100))
    .replace("{mw}", c.percent(c.cumulative[k - 1]));
  if (c.counter.textContent !== text) c.counter.textContent = text;
  const subject = clamp(state.subject);
  const cut = clamp(state.cut);
  showOneNote([[c.counter, (1 - subject) * (1 - cut)], [c.subjectNote, subject], [c.cutNote, cut]]);
  c.cut.style.opacity = String(cut);
}

function setUpSymbols(root) {
  const data = JSON.parse(root.querySelector("[data-symbols]").getAttribute("data-symbols"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  // `?verify` is how the live guards ask for a canvas they can read back; a reader never needs it. `onShown` and
  // `onReady` repaint the current state once each: that is when the card images step aside.
  const repaint = () => {
    if (root.dataset.state) applySymbolState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: repaint,
    onReady: repaint,
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__symbols = {
    ...data,
    plan,
    handle,
    stage: root.querySelector('[data-part="stage"]'),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: plan.fallback.wide.cards.length,
    format: (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"),
    percent: (v) => `${(v < 0.1 ? v.toFixed(2) : v.toFixed(1)).replace(".", ",")}\u00A0%`,
    counter: root.querySelector('[data-part="counter"]'),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    cutNote: root.querySelector('[data-part="cut-note"]'),
    cut: root.querySelector('[data-part="cut"]'),
    sizeSwatches: Array.from(root.querySelectorAll("[data-mw]")),
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
