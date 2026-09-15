// The painting function for the locator scrolly, inlined by `renderScrolly`'s `reveal` option AFTER the map
// runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap` are in scope.
//
// THE RUNTIME OWNS THE CAMERA AND EVERY BEAT-DRAWN LAYER'S PAINT (`plan.mjs`). This file owns two things the plan
// cannot: which frozen card image lies under the live map, and MapTiler's OWN label layers — filtered to the names
// this beat needs and faded by the same state tokens, since those layers are not `plan.layers` and so are outside
// `bindState`'s reach (owner ruling, 2026-09-15: native toponyms, not beat-drawn words).
//
// A STATE, field by field:
//   tops     the four largest stations across Europe, dotted and labelled with their capacity            0..1
//   country  Ukraine stepped forward: its fill and outline                                                0..1
//   zoom     arrived at the close-up (0 at rest, 1 once the camera has settled there); the oblasts appear 0..1
//   places   the three classes of place named: countries, settlements, water                              0..1
//   subject  the station ringed and named                                                                 0..1
//   limit    the database's own limit stated                                                              0..1
//   card camX camY camZoom camBearing camPitch camAlignY   the card's camera and its frozen image

export function applyLocatorState(root, state) {
  if (!root.__locator) setUpLocator(root);
  const c = root.__locator;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));

  const shownLive = Boolean(c.handle && c.handle.ready);
  c.fallbacks.forEach((img) => {
    const opacity = !shownLive && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  if (shownLive) paintNativeLabels(c, state);
  // A READER WHO HAS NOT YET SCROLLED must still get the confirmed filter, not only one who moves: retried off
  // the animation frame, bounded, so an idle page still converges without costing anything once it has.
  if (shownLive && !c.nativeConfirmed && !c.nativeRetryQueued && (c.nativeRetries || 0) < 240) {
    c.nativeRetryQueued = true;
    c.nativeRetries = (c.nativeRetries || 0) + 1;
    requestAnimationFrame(() => {
      c.nativeRetryQueued = false;
      if (c.handle && c.handle.ready && !c.nativeConfirmed) paintNativeLabels(c, JSON.parse(c.rootRef.dataset.state || "{}"));
    });
  }

  const notes = {
    topNote: clamp(state.tops) * (1 - clamp(state.country)),
    countryNote: clamp(state.country) * (1 - clamp(state.zoom)),
    zoomNote: clamp(state.zoom) * (1 - clamp(state.places)),
    subjectNote: clamp(state.subject) * (1 - clamp(state.limit)),
    limitNote: clamp(state.limit),
  };
  showOneNote(Object.entries(c.notes).map(([key, node]) => [node, notes[key]]));
}

/** MAPTILER'S OWN LABEL LAYERS, FILTERED ONCE and faded every frame. Filtering and colouring happen only once
 *  (`onReady`, when the style has just loaded and every `keepLabels` layer exists); fading is state, so it runs
 *  every frame — but only ever calls `setPaintProperty` when the number actually changed (the live map's own rule:
 *  a bound paint value is set only on change). */
function paintNativeLabels(c, state) {
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const map = c.handle.map;
  if (!c.nativeConfirmed) {
    // `isStyleLoaded()` waits on every resource the style names, glyphs included, and can stay false for a
    // while after the layers this beat filters already exist — gating on it left the filter set-up racing the
    // page's first paint. THE SET-UP ITSELF WAS ALSO FOUND TO RACE SOMETHING ELSE (found live, 2026-09-15: even
    // once `setFilter` had run, a later read of the same layer sometimes still answered the style's own default
    // filter — a MapLibre-internal timing this beat does not control). So set-up is READ BACK and reapplied every
    // frame until the filter it produced is confirmed in place, not run once and trusted.
    if (!map.getLayer("Country labels")) return;
    setUpNativeLabels(map, c.native);
    c.nativePaint = c.nativePaint || {};
    const applied = JSON.stringify(map.getFilter("Country labels"));
    if (applied === JSON.stringify(["all", ["==", ["get", "class"], "country"], ["has", "iso_a2"], ["in", ["get", "iso_a2"], ["literal", c.native.countryCodes]]]))
      c.nativeConfirmed = true;
  }
  const set = (id, property, value) => {
    const key = `${id}.${property}`;
    if (c.nativePaint[key] === value) return;
    c.nativePaint[key] = value;
    if (map.getLayer(id)) map.setPaintProperty(id, property, value, { validate: false });
  };
  const places = clamp(state.places);
  set("Country labels", "text-opacity", clamp(state.places));
  for (const id of ["City labels", "Town labels", "Village labels", "Place labels", "State labels"]) set(id, "text-opacity", places);
  for (const id of ["Sea labels", "Ocean labels", "Lakeline labels"]) set(id, "text-opacity", places);
}

// EACH LAYER'S OWN CLASS SCOPE, RESTATED IN MODERN EXPRESSION SYNTAX. The style ships these filters in the OLDER,
// pre-expression form (`["==", "class", "city"]`, a bare property name) — legal MapLibre, but a legacy filter and
// a modern one (`["in", ["get", …], ["literal", …]]`, needed for a name list) do not combine under one `all`: MapLibre
// validates the whole tree by the legacy schema and refuses the modern branch ("string expected, array found"),
// silently dropping the filter along with it. So each layer's own scope is restated here, in the same syntax as the
// name filter it is joined to, rather than read back from the style and wrapped.
const CLASS_SCOPE = {
  "City labels": ["all", ["==", ["get", "class"], "city"], ["has", "rank"]],
  "Town labels": ["==", ["get", "class"], "town"],
  "Village labels": ["==", ["get", "class"], "village"],
  "Place labels": ["!", ["in", ["get", "class"], ["literal", ["city", "continent", "country", "province", "state", "town", "village", "place"]]]],
  "State labels": ["all", ["==", ["get", "class"], "state"], ["==", ["get", "rank"], 1]],
};

function setUpNativeLabels(map, native) {
  map.setFilter("Country labels", ["all", ["==", ["get", "class"], "country"], ["has", "iso_a2"], ["in", ["get", "iso_a2"], ["literal", native.countryCodes]]], { validate: false });
  map.setPaintProperty("Country labels", "text-color", native.countryColor, { validate: false });
  map.setPaintProperty("Country labels", "text-halo-color", native.landHalo, { validate: false });

  const nameOf = ["coalesce", ["get", "name:latin"], ["get", "name"]];
  const placeFilter = ["in", nameOf, ["literal", native.placeNames]];
  for (const id of ["City labels", "Town labels", "Village labels", "Place labels", "State labels"]) {
    map.setFilter(id, ["all", CLASS_SCOPE[id], placeFilter], { validate: false });
    map.setPaintProperty(id, "text-color", native.placeColor, { validate: false });
    map.setPaintProperty(id, "text-halo-color", native.landHalo, { validate: false });
  }

  const waterFilter = ["in", ["get", "name"], ["literal", native.waterNames]];
  map.setFilter("Sea labels", ["all", ["==", ["get", "class"], "sea"], ["has", "name"], waterFilter], { validate: false });
  map.setFilter("Ocean labels", ["all", ["==", ["get", "class"], "ocean"], ["has", "name"], waterFilter], { validate: false });
  map.setFilter("Lakeline labels", ["all", ["has", "name"], waterFilter], { validate: false });
  for (const id of ["Sea labels", "Ocean labels", "Lakeline labels"]) map.setPaintProperty(id, "text-color", native.waterColor, { validate: false });
}

function setUpLocator(root) {
  const data = JSON.parse(root.querySelector("[data-locator]").getAttribute("data-locator"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const repaint = () => {
    if (root.dataset.state) applyLocatorState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: repaint,
    onReady: repaint,
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__locator = {
    ...data,
    plan,
    handle,
    rootRef: root,
    nativeReady: false,
    stage: root.querySelector('[data-part="stage"]'),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: plan.fallback.wide.cards.length,
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
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
