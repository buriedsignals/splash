// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER the
// map runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap`
// are in scope. The plan (`choropleth-plan.mjs`) owns every mark inside the live map; this file owns only
// what sits outside it — swapping the frozen fallback image for the live canvas once it is ready.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   classes   the "has any nuclear" fill arriving                       0..1
//   classes2  the top-3 fill arriving over it                           0..1
//   odd       France's ring and name                                    0..1
//   card      the nearest card, for its frozen image                    0..2
//   camX camY camZoom camBearing camPitch   the card's camera (`shared/map-beat/scrolly.mjs`)

export function applyNuclearChoroplethState(root, state) {
  if (!root.__nuc) setUp(root);
  const c = root.__nuc;
  applyScrollyMap(c.handle, state);

  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));
  // LIVE MEANS A LIVE MAP IS ON SCREEN, not "nothing has failed" — once the live map is the picture, no
  // frozen card image stays under it.
  const live = Boolean(c.handle && c.handle.ready);
  c.fallbacks.forEach((img) => {
    const opacity = !live && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });
}

function setUp(root) {
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const repaint = () => {
    if (root.dataset.state) applyNuclearChoroplethState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: repaint,
    onReady: repaint,
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__nuc = {
    plan,
    handle,
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: plan.fallback.wide.cards.length,
  };
}
