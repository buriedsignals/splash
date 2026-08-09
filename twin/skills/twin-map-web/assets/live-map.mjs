// twin/skills/twin-map-web/assets/live-map.mjs
//
// RULING R1 (2026-08-10), and the layer that keeps everything it did not ask to break.
//
// The owner's ruling: *"la carte doit rester interactive tout le temps sinon il n'y a pas
// d'intérêt d'être sur le web si on peut pas naviguer dedans"* — a web map you cannot move through
// is a picture. So map × web is a LIVE MapTiler map with its native zoom and pan, constrained to
// the subject's area. This OVERTURNS `references/map-web-discipline.md`'s own "Pan and zoom", which
// rejected live tiles in writing; that section now records the reversal and its price rather than
// having been quietly deleted.
//
// The straightforward reading of the ruling — delete the plate, ship a live map — throws away four
// things this genre already proved, all measurable: a complete no-JS render, a page that works
// offline, a page that works when the key lapses, and a guard suite that does not need the network.
// None of that is required by the ruling and all of it is cheap to keep, so the page ships in two
// layers:
//
//   1. `#mw-fallback` — the SSR'd beat exactly as it rendered before: the baked plate as a data
//      URI, the circles, the labels, the legend. Complete, script-free, request-free.
//   2. `#mw-map` — an empty box that this file fills with a live map, and which is shown ONLY on
//      `map.on("load")`. A style failure, a tile failure, a rotated key or no network at all leaves
//      layer 1 exactly where it is.
//
// That last case is not decoration. MapTiler invalidates ALL of an account's keys at 100% of its
// spending limit (documented), so the failure mode is every published article's map going blank at
// once. Layer 1 is what stands between that and an article with a hole in it.
//
// Inlined verbatim as a classic script by `scripts/render-web.mjs`, which strips `export` from each
// top-level declaration — the same treatment `interaction.mjs` gets, and for the same reason: no
// module script, so a CMS iframe or a sandboxed embed cannot refuse it.

/** The plan the renderer wrote into the page: the style URL with its key, the camera's own bounds
 *  and zoom range, and the marks as GeoJSON. Returns null when the page carries no plan, which is
 *  the shape a beat that opted out of live tiles takes. */
export function readLivePlan(doc) {
  const el = doc.getElementById("mw-live-plan");
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    return null;
  }
}

/** True when the plan still carries the delivery placeholder rather than a key. R1b keeps the real
 *  key out of the repository, so the COMMITTED artifact is always in this state and its live layer
 *  never boots — which is exactly right: a proof artifact must not spend a newsroom's tile quota. */
export function planIsUnkeyed(plan) {
  // The sentinel is ASSEMBLED, never written whole. `twin-deliver` substitutes every occurrence of
  // the placeholder in the delivered file, and this script is IN that file — a literal here would be
  // rewritten to the key itself, so the check would then read "does the style URL contain the key",
  // which is true, and every delivered map would refuse to boot. Found by driving the page in a real
  // browser after substitution, not by reading it: the fallback rendered perfectly and nothing was
  // red.
  const sentinel = "__MAPTILER" + "_KEY__";
  return !plan || !plan.styleUrl || plan.styleUrl.indexOf(sentinel) >= 0;
}

/** The scale between the bake's own frame and the box the live map is drawn in. The marks carry
 *  their radius in FRAME units (the same number the SVG draws), so this is what turns them into the
 *  CSS pixels MapLibre wants — one sizing rule, seen at two sizes, never two rules.
 *
 *  The SMALLER of the two ratios, not the width's. Web is a range of shapes rather than one size
 *  (ruling R2), and a 1566 x 583 container is 1.57x the frame's width but only 0.58x its height:
 *  scaling on width alone drew Paris at a 97px radius in a 583px-tall box, four circles overlapping
 *  into one grey mass. `min` is the same "fit, never stretch" arithmetic the plate's own viewport
 *  uses. */
export function containerScale(plan, container) {
  const width = container.clientWidth || plan.frame.width;
  const height = container.clientHeight || plan.frame.height;
  return Math.min(width / plan.frame.width, height / plan.frame.height);
}

/**
 * Boots the live map and swaps it in. Everything that could fail — no MapLibre on the page, no
 * plan, a placeholder key, a style that never loads — returns quietly and leaves the fallback
 * showing. There is no error state a reader sees, because the fallback IS the error state and it is
 * the whole claim.
 */
export function initLiveMap(win) {
  const doc = win.document;
  const plan = readLivePlan(doc);
  if (planIsUnkeyed(plan)) return null;
  if (!win.maplibregl) return null;
  const container = doc.getElementById("mw-map");
  const fallback = doc.getElementById("mw-fallback");
  if (!container || !fallback) return null;

  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    // THE CAMERA IS FITTED AT RUNTIME, TO THE STUDY SET — not restored from the bake's own zoom.
    // Ruling R2: web is not a fourth export size, it is a RANGE, so the container's aspect is not
    // known when the plate is baked. Fitting the bake's `frameCorners` (computed for a square frame)
    // into a 1566 x 583 window is height-bound and crops six of the thirteen points out of the
    // picture — measured, in a real browser, and the reason this is a runtime fit.
    //
    // `maxBounds` stays the extent the camera actually showed, so panning stops at the subject's
    // area rather than wandering into an ocean the beat says nothing about. `minZoom` and `maxZoom`
    // are set on `load`, once the fit has happened and there is a real zoom to bound.
    bounds: [
      [plan.studyBounds.west, plan.studyBounds.south],
      [plan.studyBounds.east, plan.studyBounds.north],
    ],
    fitBoundsOptions: { padding: 48, animate: false },
    maxBounds: [
      [plan.maxBounds.west, plan.maxBounds.south],
      [plan.maxBounds.east, plan.maxBounds.north],
    ],
    maxZoom: 22,
    attributionControl: false,
  });
  win.__mwMap = map;

  map.addControl(new win.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  map.on("style.load", function () {
    // geo-discipline rule 7, re-applied to the LIVE style exactly as the bake applies it to the
    // baked one. If the live map and its own fallback disagree about the colour of water, the swap
    // is visible and the beat is broken — this is the one line that keeps them the same cartography.
    const ids = ["Water", "Water shadow"];
    for (let i = 0; i < ids.length; i++)
      if (map.getLayer(ids[i])) map.setPaintProperty(ids[i], "fill-color", plan.waterFill);
    // Rule 9: the beat draws the only labels. The provider's place names compete with the point
    // labels this beat positions itself, so they go, live exactly as baked.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");

    map.addSource("mw-marks", { type: "geojson", data: plan.marks.source });
    const scale = containerScale(plan, container);
    const paint = {};
    for (const key in plan.marks.paint) paint[key] = plan.marks.paint[key];
    paint["circle-radius"] = ["*", ["get", "r"], scale];
    map.addLayer({ id: "mw-marks", type: "circle", source: "mw-marks", paint: paint });
  });

  map.on("load", function () {
    fallback.hidden = true;
    doc.documentElement.classList.add("mw-live");
    map.resize();
    leash(map, plan);
    reposition(map, doc, plan);
  });

  map.on("move", function () {
    reposition(map, doc, plan);
  });
  map.on("resize", function () {
    if (!map.getLayer("mw-marks")) return;
    map.setPaintProperty("mw-marks", "circle-radius", ["*", ["get", "r"], containerScale(plan, container)]);
    reposition(map, doc, plan);
  });

  wireHover(map, doc, win);
  return map;
}

/**
 * The reader's leash, set once the camera has actually been fitted.
 *
 * `minZoom` is the fitted zoom itself: a reader can never pull back past the view the title makes
 * its claim about, and because the fit happened in THIS container it is the right number for THIS
 * shape rather than for the square frame the plate was baked at.
 *
 * `maxZoom` is `maxZoomForStudySet`'s rule, evaluated on the view that actually resulted: for a
 * proportional symbol the marks keep their pixel size, so the honest bound is where the study set
 * stops filling the frame — past it the reader is looking at basemap with two circles on it. It is
 * derived, so a camera already tight on its subject gets a correspondingly short leash. That is the
 * intended behaviour and not a bug: the alternative is a free parameter.
 */
export function leash(map, plan) {
  const fitted = map.getZoom();
  const visible = map.getBounds();
  const visibleLonSpan = Math.abs(visible.getEast() - visible.getWest());
  const studyLonSpan = Math.abs(plan.studyBounds.east - plan.studyBounds.west);
  map.setMinZoom(fitted);
  map.setMaxZoom(Math.max(fitted, fitted + Math.log2(visibleLonSpan / Math.max(studyLonSpan, 1e-6))));
}

function wireHover(map, doc, win) {
  // B6.18a and B6.14a, closed by construction rather than by tuning: the hit area IS the rendered
  // mark, at every size and every zoom. There is no fixed 28px button under a 90px disc any more,
  // and no country whose hover only fires over its capital. The `.pt` buttons stay in the DOM for
  // keyboard reach and for their `aria-label`; CSS drops their pointer-events while live, so the
  // canvas is what a pointer talks to.
  const tooltip = doc.getElementById("tooltip");
  map.on("mousemove", "mw-marks", function (event) {
    const feature = event.features && event.features[0];
    if (!feature || !tooltip) return;
    map.getCanvas().style.cursor = "pointer";
    showTooltip(win, tooltip, feature.properties, event.originalEvent);
    markActive(doc, feature.properties.key);
  });
  map.on("mouseleave", "mw-marks", function () {
    map.getCanvas().style.cursor = "";
    if (tooltip) tooltip.hidden = true;
    markActive(doc, null);
  });
}

/** Every `.pt` button and `.point-label` follows the camera. They were percentages of a fixed
 *  plate; live, `map.project` is what puts them where their point actually is. */
export function reposition(map, doc, plan) {
  const byKey = {};
  for (const feature of plan.marks.source.features) byKey[feature.properties.key] = feature.geometry.coordinates;
  const scale = containerScale(plan, doc.getElementById("mw-map"));
  const nodes = doc.querySelectorAll(".pt, .point-label");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const coords = byKey[node.getAttribute("data-key")];
    if (!coords) continue;
    const at = map.project(coords);
    // A hit target sits ON its point; a label sits BESIDE it, on the side and at the gap
    // `labelPlacement` chose at bake time, scaled into the box the live map is drawn in. Both
    // numbers travel on the node itself rather than being recomputed here, so the live label and
    // the fallback label are the same placement seen at two sizes.
    const side = node.getAttribute("data-side");
    const gap = Number(node.getAttribute("data-gap") || 0) * scale;
    const dy = Number(node.getAttribute("data-dy") || 0) * scale;
    node.style.top = at.y + dy + "px";
    if (side === "left") {
      node.style.left = "auto";
      node.style.right = doc.getElementById("mw-map").clientWidth - (at.x - gap) + "px";
    } else {
      node.style.right = "auto";
      node.style.left = at.x + (side ? gap : 0) + "px";
    }
  }
}

function markActive(doc, key) {
  const nodes = doc.querySelectorAll(".pt");
  for (let i = 0; i < nodes.length; i++)
    nodes[i].classList.toggle("pt-active", key !== null && nodes[i].getAttribute("data-key") === key);
}

function showTooltip(win, tooltip, properties, event) {
  const node = win.document.querySelector('.pt[data-key="' + properties.key + '"]');
  // The detail string is the one the SSR'd markup already carries, never a second formatting of
  // the same number in a second place.
  tooltip.textContent = node ? node.getAttribute("data-detail") : properties.name;
  tooltip.hidden = false;
  const tw = tooltip.offsetWidth || 160;
  const th = tooltip.offsetHeight || 28;
  const x = Math.min(Math.max(event.clientX - tw / 2, 8), win.innerWidth - tw - 8);
  const y = Math.max(event.clientY - th - 14, 8);
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

if (typeof document !== "undefined" && typeof window !== "undefined") initLiveMap(window);
