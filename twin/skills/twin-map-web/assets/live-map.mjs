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

/**
 * THE MARK'S SCALE COMES FROM THE CAMERA, NOT FROM THE BOX. This is the fix for a defect the owner
 * found by looking at the live map, and it is worth the paragraph because the wrong answer looked
 * right in code.
 *
 * The marks carry their radius in the bake's own FRAME units — the same number the fallback SVG
 * draws. The first version turned those into CSS pixels with `Math.min(w / frameW, h / frameH)`,
 * which is the "fit, never stretch" arithmetic a RASTER PLATE needs: a plate must not be distorted,
 * so it fits by its tighter axis.
 *
 * A live map is not a plate. It has no aspect to preserve, because the canvas IS the container —
 * this file's own CSS says so (`html.mw-live .mw-viewport { aspect-ratio: auto !important }`) — and
 * the camera is fitted to the study set at runtime rather than restored from the plate. So the two
 * halves of one circle came apart: measured on the seed at 1600 x 900, the canvas is 1566 x 583, the
 * camera fits ~32° of longitude across 1566px while the plate fitted ~48° across 1000px, and
 * `Math.min` gave 0.583 — drawing Paris at 36px on cartography that had grown by 1.57x. A small dark
 * circle sitting in the middle of the country it is supposed to cover.
 *
 * The honest quantity is GROUND: a mark covers the same piece of the world it covered when baked.
 * `degreesPerPixel` is recorded in `geometry.json` by the bake (and only has been since the camera
 * facts landed), so this is a ratio of two measured facts rather than another constant:
 *
 *     scale = bake degrees-per-pixel ÷ live degrees-per-pixel
 *
 * which is exactly `2 ** (liveZoom − bakeZoom)`, since `degreesPerPixel = 360 / (512 · 2**zoom)`.
 * A camera zoomed one level further in than the plate's draws its marks twice as wide, and the
 * symbols keep their relationship to the coastlines under them at every container shape.
 *
 * WHICH RULE EACH MARK TYPE TAKES, because they are not the same and getting them the same way
 * round is the whole point:
 *
 *  - **Proportional symbol** (this seed): ground-derived AT THE FIT, then CONSTANT IN SCREEN PIXELS
 *    as the reader zooms. A circle encodes a VALUE, not a ground area — growing it with zoom would
 *    make the same number mean two different things at two zooms. So this is called on load and on
 *    resize, both of which re-fit the camera, and never on `move`.
 *  - **Choropleth**: the same. A region's fill is the geometry itself and reprojects on its own; the
 *    only screen-sized things are strokes and labels.
 *  - **Dot density**: THE OPPOSITE, and it is not shipped live yet for exactly this reason. A dot
 *    stands for a fixed number of people in a fixed piece of ground, so its GROUND area must be
 *    constant at every zoom or a reader watching the field thin out reads a change that did not
 *    happen. Its radius has to interpolate exponentially with zoom (base 2), which is a
 *    `["interpolate", ["exponential", 2], ["zoom"], …]` expression rather than the plain number
 *    below.
 *  - **Hex grid**: bins are emitted as geographic polygons, so they reproject correctly and need no
 *    scale at all.
 */
export function cameraScale(plan, map) {
  const liveDegreesPerPixel = 360 / (512 * Math.pow(2, map.getZoom()));
  if (!(plan.degreesPerPixel > 0))
    throw new Error("this plate predates the camera facts: re-bake it, or a mark has no scale to be drawn at");
  return plan.degreesPerPixel / liveDegreesPerPixel;
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
    // known when the plate is baked. Fitting the bake's `frameCorners` (computed for a SQUARE frame)
    // into a 1566 x 583 window is height-bound and crops six of the thirteen points out of the
    // picture — measured, in a real browser, and the reason this is a runtime fit.
    //
    // NO `maxBounds` HERE, and that omission is the fix for the same defect wearing its other face.
    // `maxBounds` does not merely stop panning: MapLibre also raises the minimum zoom so the
    // viewport can never leave the box. Set to the square plate's `frameCorners` (47.8° of longitude)
    // it forced zoom 4.526 on a 1566px-wide canvas, and at that zoom 583px of height holds about 11°
    // of latitude against the study set's 21 — so the leash cropped SIX OF THIRTEEN POINTS out of a
    // beat whose title claims all of them. The plate's box is not the container's box, in the leash
    // exactly as in the mark radius. The reader's bound is set on `load` instead, from the view the
    // camera actually fitted to.
    bounds: [
      [plan.studyBounds.west, plan.studyBounds.south],
      [plan.studyBounds.east, plan.studyBounds.north],
    ],
    fitBoundsOptions: { padding: 48, animate: false },
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
    const paint = {};
    for (const key in plan.marks.paint) paint[key] = plan.marks.paint[key];
    // Placeholder until the camera has actually been fitted — `applyMarkScale` on `load` is what
    // sets the real number. Adding the layer with no radius at all would draw MapLibre's own
    // default 5px for one frame, which is a visible flash of the wrong circle.
    paint["circle-radius"] = ["*", ["get", "r"], cameraScale(plan, map)];
    map.addLayer({ id: "mw-marks", type: "circle", source: "mw-marks", paint: paint });
  });

  map.on("load", function () {
    fallback.hidden = true;
    doc.documentElement.classList.add("mw-live");
    map.resize();
    leash(map, plan);
    applyMarkScale(map, doc, plan);
  });

  // The camera moved, not the container: the marks keep the pixel size they were fitted at (a
  // circle encodes a value, not a ground area) and only their labels and hit targets follow.
  map.on("move", function () {
    reposition(map, doc, plan, map.__mwScale);
  });
  // The container changed shape, so the camera re-fits and the marks are re-derived from it.
  map.on("resize", function () {
    if (!map.getLayer("mw-marks") || !doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy(map, plan);
    applyMarkScale(map, doc, plan);
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
  // The pan bound is the view the camera FITTED TO, not the box the plate was baked in. At the
  // minimum zoom that is the whole claim and there is nothing to pan to, which is correct; zoomed
  // in, a reader moves within the subject's own area and no further. Set after the fit, because a
  // bound set before it constrains the fit — which is how it came to crop the claim.
  map.setMaxBounds(visible);
}

/**
 * Re-fits the camera to the study set. Called when the CONTAINER changes shape, never when the
 * reader moves: web is a range of shapes (R2), so a beat embedded in a CMS column that reflows has
 * to answer the new shape with a new fit rather than with a cropped old one.
 *
 * The existing pan bound is released first. A `maxBounds` is a constraint on the fit as well as on
 * the reader, so re-fitting inside the previous shape's bound would inherit exactly the crop this
 * function exists to recompute away.
 */
export function fitToStudy(map, plan) {
  map.setMaxBounds(null);
  map.setMinZoom(0);
  map.fitBounds(
    [
      [plan.studyBounds.west, plan.studyBounds.south],
      [plan.studyBounds.east, plan.studyBounds.north],
    ],
    { padding: 48, animate: false },
  );
  leash(map, plan);
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

/**
 * Sets the drawn radius from the camera and remembers the number, so the label gutters and the hit
 * targets are placed against the SAME scale the circles are drawn at. Two numbers describing one
 * circle living apart is precisely the defect this function exists to make impossible: there is one
 * place the scale is computed and one place it is stored.
 */
export function applyMarkScale(map, doc, plan) {
  const scale = cameraScale(plan, map);
  map.__mwScale = scale;
  if (map.getLayer("mw-marks")) map.setPaintProperty("mw-marks", "circle-radius", ["*", ["get", "r"], scale]);
  reposition(map, doc, plan, scale);
  return scale;
}

/** Every `.pt` button and `.point-label` follows the camera. They were percentages of a fixed
 *  plate; live, `map.project` is what puts them where their point actually is. */
export function reposition(map, doc, plan, scale) {
  const byKey = {};
  for (const feature of plan.marks.source.features) byKey[feature.properties.key] = feature.geometry.coordinates;
  if (!(scale > 0)) scale = cameraScale(plan, map);
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
