// The painting function for the dot density scrolly, inlined by `renderScrolly`'s `reveal` option AFTER the map
// runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap` are in scope.
//
// THE RUNTIME OWNS THE CAMERA AND EVERY PLAN LAYER'S PAINT (`plan.mjs`). This file owns what sits outside the
// plan: which frozen card image lies under the live map, and the counter and its notes above it.
//
// A STATE, field by field:
//   arrive   the ordinary stations filling in, fuel by fuel, most numerous first                        0..1
//   subject  the 72 nuclear sites arriving, ringed                                                       0..1
//   fade     every other station stepping back while nuclear is isolated                                 0..1
//   weight   every dot re-encoded to the area of its capacity                                             0..1
//   zoom     the travel onto the close-up country (paint timing only; the camera moves on its own cards)  0..1
//   card camX camY camZoom camBearing camPitch camAlignY   the card's camera and its frozen image

export function applyDotState(root, state) {
  if (!root.__dots) setUpDots(root);
  const c = root.__dots;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));

  const shownLive = Boolean(c.handle && c.handle.ready);
  c.fallbacks.forEach((img) => {
    const opacity = !shownLive && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  // THE COUNTER COUNTS WHAT THE MAP HAS DRAWN: the ordinary stations' own buckets, weighted by how far each has
  // arrived — nuclear counts separately, on its own note, once isolated (`subjectNote`).
  const arrive = clamp(state.arrive);
  let arrived = 0;
  for (const b of c.plan.buckets) arrived += b.n * clamp(arrive * c.plan.buckets.length - c.plan.buckets.indexOf(b));
  const k = Math.max(0, Math.min(c.total, Math.round(arrived)));
  const text = c.counter.dataset.template.replace("{n}", c.format(k));
  if (c.counter.textContent !== text) c.counter.textContent = text;

  const subject = clamp(state.subject);
  const weight = clamp(state.weight);
  const zoom = clamp(state.zoom);
  const notes = {
    counter: (1 - subject) * (1 - weight),
    subjectNote: subject * (1 - weight) * (1 - zoom),
    weightNote: weight * (1 - zoom),
    zoomNote: zoom,
  };
  showOneNote([[c.counter, notes.counter], [c.subjectNote, notes.subjectNote], [c.weightNote, notes.weightNote], [c.zoomNote, notes.zoomNote]]);

  // THE SHARE BAR: nuclear's share of the sites, carried with the dots to its share of the power — the video's
  // own reading, `share = shareSites + (shareCapacity - shareSites) · weight`, one bar measuring both counts.
  const share = c.shareSites + (c.shareCapacity - c.shareSites) * weight;
  const fillWidth = `${share}%`;
  if (c.barFill.style.width !== fillWidth) c.barFill.style.width = fillWidth;
  const barOpacity = String(subject);
  if (c.bar.style.opacity !== barOpacity) c.bar.style.opacity = barOpacity;
}

function setUpDots(root) {
  const data = JSON.parse(root.querySelector("[data-dots]").getAttribute("data-dots"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const repaint = () => {
    if (root.dataset.state) applyDotState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: repaint,
    onReady: repaint,
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__dots = {
    ...data,
    plan,
    handle,
    stage: root.querySelector('[data-part="stage"]'),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: plan.fallback.wide.cards.length,
    format: (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    counter: root.querySelector('[data-part="counter"]'),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    weightNote: root.querySelector('[data-part="weight-note"]'),
    zoomNote: root.querySelector('[data-part="zoom-note"]'),
    bar: root.querySelector('[data-part="bar"]'),
    barFill: root.querySelector('[data-part="bar-fill"]'),
  };
}

// The header's notes share one slot: only the strongest shows, at its lead over the next, so two notes never
// overlap while the scroll crossfades between them — each fades out to nothing before the next fades in.
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
