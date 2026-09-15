// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER the map
// runtime (`shared/map-beat/inline.mjs`): `initScrollyMap` and `applyScrollyMap` are in scope, as is
// `reveal.mjs`'s `ease`/`clamp01`/`fitViewBox`.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   morph       every country from its territory, on the live map (0), to its equal tile (1)          0..1
//   size        each equal tile resized to a square whose area is the electricity its country produces 0..1
//   subject     the subject country picked out — on the map AND, before the handover, on the SVG       0..1
//   area        the area-weighted counter                                                              0..1
//   country     the country-mean counter                                                                0..1
//   production  the production-weighted counter                                                        0..1
//   rule        the three means on one rule, the tiles stepping back                                   0..1
//   missing     the country with no reading named, its tile ringed                                     0..1
//
// ADDENDUM 2026-09-15 §5: A LIVE MAP WHILE THE FORM SHOWS GEOGRAPHY, THE TILES OUTSIDE IT ONCE IT LEAVES.
// Cards 1–2 are the live map's own layers (`plan.mjs`), bound to `subject`. THE HANDOVER, ported from the
// validated video beat's own two-phase `morph` window: over the raw field's own first 15 %, the SVG country
// groups — projected with the SAME camera the map plan uses (`plan.mjs`'s `cartogramGeometry`) — fade in
// static, over their territory box, exactly where the map already draws them; only once they are fully drawn
// does the true geometric morph (`m`) begin, over the remaining 85 %. THE LIVE MAP FADES WITH `m`: once the
// countries start travelling, what they leave behind on the map would show through a static SVG cover — so
// the live map's own container is faded out under the shapes as they move, not switched off in one frame.
//
// THE MORPH IS STILL AN AFFINE MAP PER COUNTRY, box onto tile, eased; the shape fades into a rect drawn in
// that same box over the last third of the travel (Russia shrinking, Malta swelling into two tiles of one
// size); strokes do not scale. THE RESIZE is the same map onto a square centred in the tile, its side the
// tile's short side times the square root of the country's share of the largest producer.
// Names are placed on the group's box in the reader's own pixels, read back through the SVG's own screen
// matrix. On the equal tiles they are shown all or none; on the resized tiles a name is shown where its own
// square holds it.
//
// RULE-BENT (noted for the owner): the phone-only inset that reserved a band at the stage's top and bottom
// (for the missing-country note and the rule) is dropped — every card fits the WHOLE stage, centred, on
// every shape, so the live map's camera and the SVG's `fitViewBox` cannot disagree about what "centred"
// means on a stage the reference camera was not authored for. The notes keep their own background chip and
// sit over the picture instead.

const HANDOVER = 0.15;

export function applyCartogramState(root, state) {
  if (!root.__carto) seatCartogram(root);
  const c = root.__carto;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease2 = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  const shown = Boolean(c.handle.map && c.handle.ready);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));
  c.fallbacks.forEach((img) => {
    const opacity = !shown && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  // ── the handover: the SVG shapes rise over the still map, then the true morph begins ────────────
  const rawMorph = clamp(state.morph);
  const shapesIn = clamp(rawMorph / HANDOVER);
  const m = ease2(clamp((rawMorph - HANDOVER) / (1 - HANDOVER)));
  if (shown) c.live.style.opacity = String(1 - m);

  const size = ease2(clamp(state.size));
  const ruleOn = clamp(state.rule);
  const shapeOut = clamp((m - 0.62) / 0.3);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  const vb = fitViewBox({ x: 0, y: 0, w: c.width, h: c.height }, { width: SW, height: SH }, { top: 0, right: 0, bottom: 0, left: 0 });
  c.field.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.field.setAttribute("preserveAspectRatio", "none");
  const stage = c.stage.getBoundingClientRect();
  const matrix = c.field.getScreenCTM();
  const px = (v) => (matrix ? v * matrix.a : v);

  // ALL NAMES OR NONE on the equal tiles, at one size: the largest that every tile holds, never below 70 %.
  const fitOf = (k, w, h) => Math.min(1, (px(w) - 4) / k.nameWidth, px(h) / k.nameHeight);
  const gridScale = Math.min(...c.countries.map((k) => fitOf(k, k.tile.w, k.tile.h)));
  const gridNames = gridScale >= 0.7;
  root.dataset.namesFit = gridNames ? "1" : "0";

  for (const country of c.countries) {
    const { box, tile } = country;
    const side = country.twh > 0 ? Math.min(tile.w, tile.h) * Math.sqrt(country.twh / c.maxTwh) : Math.min(tile.w, tile.h);
    const target = country.classIndex === null
      ? tile
      : { x: tile.x + (tile.w - side) / 2, y: tile.y + (tile.h - side) / 2, w: side, h: side };
    const tw = tile.w + (target.w - tile.w) * size;
    const th = tile.h + (target.h - tile.h) * size;
    const tx = tile.x + (target.x - tile.x) * size;
    const ty = tile.y + (target.y - tile.y) * size;
    const sx = 1 + (tw / box.w - 1) * m;
    const sy = 1 + (th / box.h - 1) * m;
    const x = box.x + (tx - box.x) * m;
    const y = box.y + (ty - box.y) * m;
    country.group.setAttribute("transform", `translate(${x - box.x * sx} ${y - box.y * sy}) scale(${sx} ${sy})`);
    country.shape.style.opacity = String(shapesIn * (1 - shapeOut));
    country.rect.style.opacity = String(shapesIn * shapeOut);

    // Invisible before the handover (the live map is the picture); `dim` once the SVG has risen.
    const dim = (country.iso === c.subject ? 1 : 1 - 0.7 * state.subject) * (1 - 0.82 * ruleOn);
    country.group.style.opacity = String(shapesIn * dim);
    if (country.classIndex === null) {
      country.rect.setAttribute("stroke", mix(c.ink.muted, c.ink.dark, state.missing));
      country.rect.setAttribute("stroke-width", String(1 + state.missing));
    }

    if (matrix) {
      const cx = x + (box.w * sx) / 2;
      const cy = y + (box.h * sy) / 2;
      country.name.style.left = `${matrix.a * cx + matrix.c * cy + matrix.e - stage.left}px`;
      country.name.style.top = `${matrix.b * cx + matrix.d * cy + matrix.f - stage.top}px`;
      const own = fitOf(country, tw, th);
      const scale = (1 - size) * gridScale + size * Math.min(1, own);
      const shownName = (1 - size) * (gridNames ? 1 : 0) + size * (own >= 0.85 ? 1 : 0);
      country.name.style.transform = `translate(-50%, -50%) scale(${Math.min(1, scale).toFixed(3)})`;
      country.name.style.opacity = String(shapesIn * clamp((m - 0.8) / 0.2) * shownName * (1 - ruleOn));
    }
  }

  for (const [node, value] of [
    [c.byArea, state.area],
    [c.byProduction, state.production],
    [c.byCountry, state.country],
  ]) {
    const target = Number(node.dataset.value);
    const text = node.dataset.template.replace("{n}", (target * clamp(value * 2)).toFixed(1).replace(".", ","));
    if (node.textContent !== text) node.textContent = text;
    node.style.opacity = String(value);
  }

  // The rule near the top of the stage, clear of the card that reads over the middle.
  const midY = SH * 0.14 + c.rule.offsetHeight / 2;
  Object.assign(c.rule.style, { top: `${midY - c.rule.offsetHeight / 2}px`, opacity: String(ruleOn) });

  // The subject's note beside its country, once the SVG is the picture — before the handover, the live
  // map alone carries the subject's name (`plan.mjs`, bound to the same `subject` field); the missing
  // country's note in the stage's top corner, clear of the card.
  const subject = c.countries.find((k) => k.iso === c.subject);
  c.subjectNote.style.opacity = String(shapesIn * state.subject);
  if (subject && state.subject > 0) {
    const r = subject.group.getBoundingClientRect();
    const left = Math.min(Math.max(r.left - stage.left + r.width / 2 - c.subjectNote.offsetWidth / 2, 0), stage.width - c.subjectNote.offsetWidth);
    const top = Math.min(Math.max(r.top - stage.top + r.height / 2 - c.subjectNote.offsetHeight / 2, 0), stage.height - c.subjectNote.offsetHeight);
    Object.assign(c.subjectNote.style, { left: `${left}px`, top: `${top}px` });
  }
  Object.assign(c.missingNote.style, { left: `${stage.width - c.missingNote.offsetWidth}px`, top: "0px", opacity: String(state.missing) });
}

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatCartogram(root) {
  const carrier = root.querySelector("[data-cartogram]");
  const data = JSON.parse(carrier.getAttribute("data-cartogram"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const stage = root.querySelector('[data-part="stage"]');
  const field = root.querySelector('[data-part="field"]');
  const repaint = () => {
    if (root.dataset.state) applyCartogramState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, { window, preserveDrawingBuffer: /[?&]verify/.test(location.search), onShown: repaint, onReady: repaint });
  root.__handle = handle;
  window.__scrollyMap = handle;

  const countries = data.countries.map((k) => {
    const group = field.querySelector(`[data-country="${k.iso}"]`);
    const name = root.querySelector(`[data-name="${k.iso}"]`);
    return {
      ...k,
      group,
      shape: group.querySelector('[data-part="shape"]'),
      rect: group.querySelector('[data-part="tile"]'),
      name,
      nameWidth: name.offsetWidth,
      nameHeight: name.offsetHeight,
    };
  });
  root.__carto = {
    ...data,
    plan,
    handle,
    stage,
    field,
    live: root.querySelector('[data-part="live"]'),
    countries,
    byArea: root.querySelector('[data-part="by-area"]'),
    byCountry: root.querySelector('[data-part="by-country"]'),
    byProduction: root.querySelector('[data-part="by-production"]'),
    rule: root.querySelector('[data-part="rule"]'),
    maxTwh: Math.max(...data.countries.map((k) => k.twh)),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    missingNote: root.querySelector('[data-part="missing-note"]'),
    swatches: Array.from(root.querySelectorAll("[data-class-swatch]")),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: data.cards,
  };
}
