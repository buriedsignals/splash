// The painting function for the choropleth scrolly, inlined by `renderScrolly`'s `reveal` option AFTER
// the map runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and
// `applyScrollyMap` are in scope, nothing here is global unless it is put on `window`.
//
// The runtime owns the camera and every paint inside the map. This file owns what sits outside the plan:
// the header counter, the key's swatches, which frozen card image lies under the live map, and the odd
// one's name lifted above the card with its leader.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   classes    the ramp arriving class by class, lowest first; an unreached class is bare land   0..1
//   filter     every country under the floor stepping back to bare land                         0..1
//   top        the six countries of the north-west named                                          0..1
//   zoom       the travel from Europe onto Albania and its neighbours                             0..1
//   odd        Albania ringed and named, its neighbours named with their shares                    0..1
//   card       the nearest card, for its frozen image                                              0..5
//   camX camY camZoom camBearing camPitch   the card's camera (`shared/map-beat/scrolly.mjs`)

export function applyChoroplethState(root, state) {
  if (!root.__choro) setUpChoropleth(root);
  const c = root.__choro;
  applyScrollyMap(c.handle, state);

  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeTravel = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));
  const live = c.handle && c.handle.ready && !c.handle.failed;
  // Once the live map is the picture, no card image stays under it: anything the canvas leaves
  // transparent must show the stage's own ground, not a frozen card.
  c.fallbacks.forEach((img) => {
    const opacity = !live && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  const n = c.swatches.length;
  for (const swatch of c.swatches) swatch.style.opacity = String(clamp(state.classes * n - Number(swatch.dataset.classSwatch)));
  // The key arrives with its first class: before any class is drawn it is an empty panel under the map.
  c.key.style.opacity = String(clamp(state.classes * n));

  // The same two moments `plan.mjs` gives the map's own words: close-up names once the camera has
  // arrived, whole-map names at rest.
  const z = easeTravel(clamp(state.zoom));
  const arrived = clamp((z - 0.75) / 0.25);
  const atRest = clamp((0.08 - z) / 0.08);

  // WHERE ALBANIA IS ON THE STAGE: asked of the live map when it is the picture, read off the frozen
  // card's own bake otherwise — the shape the stage shows (the other is `display: none`), scaled and
  // cropped exactly as `object-fit: cover` scales and crops it.
  const stage = c.stage.getBoundingClientRect();
  let x;
  let y;
  let radius;
  if (live) {
    const p = c.handle.map.project(c.plan.oddSeat);
    x = p.x;
    y = p.y;
    radius = (c.plan.oddRingDegrees * 512 * 2 ** c.handle.map.getZoom()) / 360;
  } else {
    const shown = c.fallbacks.find((img) => Number(img.dataset.fallback) === card && img.getClientRects().length > 0);
    const shape = c.plan.fallback[shown ? shown.dataset.shape : "wide"];
    const baked = shape.cards[card];
    const size = shape.size;
    const scale = Math.max(stage.width / size.width, stage.height / size.height);
    x = (stage.width - size.width * scale) / 2 + baked.odd[0] * scale;
    y = (stage.height - size.height * scale) / 2 + baked.odd[1] * scale;
    radius = ((c.plan.oddRingDegrees * 512 * 2 ** baked.zoom) / 360) * scale;
  }
  const odd = c.odd;
  const inside = x > 0 && x < stage.width && y > 0 && y < stage.height;
  odd.style.left = `${x}px`;
  odd.style.top = `${y}px`;
  odd.style.opacity = String(inside ? state.odd * Math.max(arrived, atRest) : 0);

  // THE CLOSE-UP KEEPS ITS SUBJECT AT THE CENTRE, where the card reads over it: the odd one's name is lifted
  // above whichever card covers its country, and a leader runs down to it; the card hides the rest of the line.
  c.leader.style.opacity = "0";
  if (arrived > 0) {
    const panel = Array.from(root.ownerDocument.querySelectorAll(".step-panel"))
      .map((el) => el.getBoundingClientRect())
      .find((r) => r.width > 0 && x + stage.left > r.left && x + stage.left < r.right && y + stage.top > r.top - 12 && y + stage.top < r.bottom + 12);
    if (panel) {
      const h = odd.offsetHeight;
      // High in the band above the card, clear of the neighbours' names that sit just around the country.
      const lifted = Math.max(h / 2 + 2, (panel.top - stage.top) * 0.4);
      odd.style.top = `${y + (lifted - y) * arrived}px`;
      const from = lifted + h / 2;
      Object.assign(c.leader.style, { left: `${x}px`, top: `${from}px`, height: `${Math.max(0, y - radius - from)}px`, opacity: String(state.odd * arrived) });
    }
  }

  const count = c.topCount;
  const text = count.dataset.template.replace("{n}", String(Math.round(Number(count.dataset.value) * clamp(state.filter * 2))));
  if (count.textContent !== text) count.textContent = text;
  count.style.opacity = String(state.filter);
}

function setUpChoropleth(root) {
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  // `?verify` is how the live guards ask for a canvas they can read back; a reader never needs it.
  // `onShown` (the live map's first drawn view) and `onReady` (the warmed map taking over) repaint the
  // current state once each: that is when the card images step aside and the odd one's name is re-seated
  // on the live camera, and no scroll may come to trigger it.
  const repaint = () => {
    if (root.dataset.state) applyChoroplethState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: repaint,
    onReady: repaint,
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__choro = {
    plan,
    handle,
    stage: root.querySelector('[data-part="stage"]'),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: plan.fallback.wide.cards.length,
    swatches: Array.from(root.querySelectorAll("[data-class-swatch]")),
    key: root.querySelector('[data-part="key"]'),
    topCount: root.querySelector('[data-part="top-count"]'),
    odd: root.querySelector('[data-role="odd"]'),
    leader: root.querySelector('[data-part="odd-leader"]'),
  };
}
