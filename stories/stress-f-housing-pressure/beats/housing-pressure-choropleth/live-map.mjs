// twin/skills/map-web/assets/live-map.mjs
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
// things this format already proved, all measurable: a complete no-JS render, a page that works
// offline, a page that works when the key lapses, and a guard suite that does not need the network.
// None of that is required by the ruling and all of it is cheap to keep, so the page ships in two
// layers:
//
//   1. `#mw-fallback` — the SSR'd beat exactly as it rendered before: the baked plate as a data
//      URI, the marks, the labels, the legend. Complete, script-free, request-free.
//   2. `#mw-map` — an empty box that this file fills with a live map, and which is shown ONLY on
//      `map.on("load")`. A style failure, a tile failure, a rotated key or no network at all leaves
//      layer 1 exactly where it is.
//
// That last case is not decoration. MapTiler invalidates ALL of an account's keys at 100% of its
// spending limit (documented), so the failure mode is every published article's map going blank at
// once. Layer 1 is what stands between that and an article with a hole in it.
//
// ONE FILE, FIVE MAP TYPES. This is a byte-identical copy in every map × web beat (the twin
// duplicates helpers rather than importing across skills), so it may not know what a beat draws.
// Everything type-specific travels in the PLAN the renderer writes into the page — a list of
// LAYERS, each declaring how its own marks answer three questions this file cannot answer for them:
//
//   - `radius: "camera"` — a circle whose size encodes a VALUE (proportional symbol). Derived from
//     the camera at the fit, then held constant in screen pixels as the reader zooms, because the
//     same number must not mean two things at two zooms.
//   - `radius: "ground"` — a dot standing for a fixed number of people in a fixed piece of ground
//     (dot density). Its GROUND area must be constant, so its screen radius doubles per zoom level
//     — a `["interpolate", ["exponential", 2], ["zoom"], …]` expression, not a number.
//   - `radius: "fixed"` — a locator marker, which is a pin rather than a measurement: the same
//     screen size at every zoom, exactly as the plate drew it.
//   - no `radius` at all — `fill` and `line` layers (choropleth regions, hex bins, routes). They
//     are geographic polygons and reproject on their own; only their strokes are screen-sized.
//
// Inlined verbatim as a classic script by `scripts/render-web.mjs`, which strips `export` from each
// top-level declaration — the same treatment `interaction.mjs` gets, and for the same reason: no
// module script, so a CMS iframe or a sandboxed embed cannot refuse it.

/** The plan the renderer wrote into the page: the style URL with its key, the camera's own bounds
 *  and zoom range, and the beat's own layers. Returns null when the page carries no plan, which is
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
  // The sentinel is ASSEMBLED, never written whole. `deliver` substitutes every occurrence of
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
 * this format's own CSS says so (`html.mw-live .mw-viewport { aspect-ratio: auto !important }`) — and
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
 */
export function cameraScale(plan, map) {
  const liveDegreesPerPixel = 360 / (512 * Math.pow(2, map.getZoom()));
  if (!(plan.degreesPerPixel > 0))
    throw new Error("this plate predates the camera facts: re-bake it, or a mark has no scale to be drawn at");
  return plan.degreesPerPixel / liveDegreesPerPixel;
}

/**
 * The radius expression for a layer whose marks stand for a fixed piece of GROUND — a dot-density
 * dot. Its screen radius has to double for every zoom level the reader comes in, or the field
 * visibly thins out and a reader watching it reads a change in density that did not happen.
 *
 * `["exponential", 2]` between two stops one on each side of the bake's own zoom is exactly
 * `r · 2 ** (zoom − bakeZoom)`, so at the baked camera a dot is drawn at the size the plate drew it.
 * Written as an interpolation rather than computed per frame because it has to be true DURING a
 * zoom gesture, not only after it settles.
 */
export function groundRadiusExpression(bakeZoom, options) {
  const span = 6;
  const floorPx = options && options.floorPx > 0 ? options.floorPx : 0;
  if (!floorPx)
    return [
      "interpolate",
      ["exponential", 2],
      ["zoom"],
      bakeZoom - span,
      ["/", ["get", "r"], Math.pow(2, span)],
      bakeZoom + span,
      ["*", ["get", "r"], Math.pow(2, span)],
    ];
  // THE FLOOR, and why it cannot be written the obvious way.
  //
  // Measured on `proof/mapgen-dot-web` at 375x812: the live field deposited **6% of the ink the
  // baked plate deposits over the same ground** — 0.0119 against 0.1856 — because the ground rule
  // had shrunk every dot to 0.50px. The page still said "2,996 dots drawn for 596,770,599 people"
  // over a map with no dots on it. Below some radius a circle stops being drawn and the encoding is
  // simply gone, so the ground rule needs a bottom.
  //
  // `["max", <the expression above>, floorPx]` is the obvious way and MapLibre SILENTLY REJECTS IT:
  // a `["zoom"]` expression may not be nested inside another expression, `setPaintProperty` becomes
  // a no-op, and five different floors render identically. Found by rendering all five and
  // comparing the pictures, not by an error. So the floor has to be expressed as STOPS of one
  // top-level interpolation — which needs the zoom at which the ground rule crosses the floor, and
  // that zoom depends on the radius, so it exists only if every mark in the layer shares one.
  const uniform = options.uniformRadius;
  if (!(uniform > 0))
    throw new Error(
      "a ground-scaled layer asked for a radius floor of " +
        floorPx +
        "px but declared no `uniformRadius`. The floor is a zoom breakpoint (`bakeZoom + log2(floor / r)`) " +
        "and MapLibre refuses a zoom expression nested inside a `max`, so the breakpoint has to be a " +
        "number — which exists only when every mark in the layer is drawn at one radius. A layer whose " +
        "marks differ in size cannot take a floor this way.",
    );
  const breakZoom = bakeZoom + Math.log2(floorPx / uniform);
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    breakZoom - span,
    floorPx,
    breakZoom,
    floorPx,
    breakZoom + span,
    floorPx * Math.pow(2, span),
  ];
}

/** Every layer the plan declares, defaulted so a beat only says what is true of its own marks. */
export function planLayers(plan) {
  return (plan && plan.layers) || [];
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
    // The constructor has no canvas to measure yet, so the FIRST fit takes the ceiling and
    // `map.on("load")`'s `fitToStudy` immediately re-fits with the padding this container earns.
    fitBoundsOptions: { padding: MAX_FIT_PADDING_PX, animate: false },
    maxZoom: 22,
    attributionControl: false,
  });
  win.__mwMap = map;

  // B5.3, and the owner's instruction by name: MapTiler's OWN zoom and pan controls, not a button
  // beside the map. The compass is off because no beat in this format rotates.
  map.addControl(new win.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  map.on("style.load", function () {
    // geo-discipline rule 7, re-applied to the LIVE style exactly as the bake applies it to the
    // baked one. If the live map and its own fallback disagree about the colour of water, the swap
    // is visible and the beat is broken — this is the one line that keeps them the same cartography.
    const ids = ["Water", "Water shadow"];
    for (let i = 0; i < ids.length; i++)
      if (map.getLayer(ids[i])) map.setPaintProperty(ids[i], "fill-color", plan.waterFill);
    // Rule 9: the beat draws the only labels. The provider's place names compete with the labels
    // this beat positions itself, so they go, live exactly as baked.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");

    const declared = planLayers(plan);
    for (let i = 0; i < declared.length; i++) {
      const layer = declared[i];
      map.addSource(layer.id, { type: "geojson", data: layer.data });
      const paint = {};
      for (const key in layer.paint) paint[key] = layer.paint[key];
      // Placeholder until the camera has actually been fitted — `applyMarkScale` on `load` is what
      // sets the real number. Adding a circle layer with no radius at all would draw MapLibre's own
      // default 5px for one frame, which is a visible flash of the wrong circle.
      if (layer.radius === "camera") paint["circle-radius"] = ["*", ["get", "r"], cameraScale(plan, map)];
      else if (layer.radius === "ground")
        paint["circle-radius"] = groundRadiusExpression(plan.bakeZoom, {
          floorPx: layer.radiusFloorPx,
          uniformRadius: layer.uniformRadius,
        });
      else if (layer.radius === "fixed") paint["circle-radius"] = ["get", "r"];
      map.addLayer({ id: layer.id, type: layer.type, source: layer.id, paint: paint });
    }
  });

  map.on("load", function () {
    fallback.hidden = true;
    doc.documentElement.classList.add("mw-live");
    map.resize();
    // `fitToStudy`, not `leash` alone: the constructor fitted with the ceiling padding because it
    // had no canvas to measure yet, and on a short viewport that ceiling is more than half the
    // height. This is the first fit that knows the container.
    fitToStudy(map, plan);
    applyMarkScale(map, doc, plan);
    applyFilter(map, doc, plan);
  });

  // One listener on the document rather than one per radio: the chips are a real `<fieldset>` of
  // real radios, so `change` bubbles, and nothing here has to know how many groups a beat has.
  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== "mw-filter") return;
    applyFilter(map, doc, plan);
    // A mark that has just been filtered away must not keep the tooltip it was showing.
    const tooltip = doc.getElementById("tooltip");
    if (tooltip) tooltip.hidden = true;
    markActive(doc, null);
  });

  // The camera moved, not the container: value-encoding marks keep the pixel size they were fitted
  // at (a circle encodes a value, not a ground area) and only their labels and hit targets follow.
  map.on("move", function () {
    reposition(map, doc, plan, map.__mwScale);
  });
  // The container changed shape, so the camera re-fits and the marks are re-derived from it.
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy(map, plan);
    applyMarkScale(map, doc, plan);
  });

  wireHover(map, doc, win, plan);
  return map;
}

/** The most room this format ever leaves around the study set, in CSS pixels. A ceiling, not the
 *  value — `fitPadding` below is what a fit actually uses. */
export const MAX_FIT_PADDING_PX = 48;

/**
 * The room left around the study set when the camera fits it — **a fraction of the box being
 * padded, capped at the ceiling above**, read by the first fit and by every re-fit so the two can
 * never disagree and make a resize jump.
 *
 * It was a flat 48px, and that is fine until the box is small. Measured on `proof/mapgen-dot-web`
 * at 375x667: the stage is 341 x 178, so 48px of padding on each side takes **96 of 178px — 54% of
 * the height** — and `fitBounds` answered by dropping to zoom 0, showing 240° of longitude with
 * Europe as a blob and five labels stacked on each other. The same camera at 375x812 is fine, so it
 * only appears on a short viewport, which is why nothing caught it.
 *
 * 9% of the shorter side keeps every container this format has been driven at 1600 down to 768 at the
 * old 48 exactly, and hands a phone a padding proportional to what it has.
 */
export function fitPadding(map) {
  const canvas = map.getCanvas();
  const shorter = Math.min(canvas.clientWidth || 0, canvas.clientHeight || 0);
  if (!(shorter > 0)) return MAX_FIT_PADDING_PX;
  return Math.min(MAX_FIT_PADDING_PX, Math.round(shorter * 0.09));
}

/**
 * The reader's leash, set once the camera has actually been fitted.
 *
 * `minZoom` is the fitted zoom itself: a reader can never pull back past the view the title makes
 * its claim about, and because the fit happened in THIS container it is the right number for THIS
 * shape rather than for the square frame the plate was baked at.
 *
 * `maxZoom` is the zoom at which the study set stops filling the frame, evaluated on the view that
 * actually resulted — past it the reader is looking at basemap with two marks on it. It is derived,
 * so a camera already tight on its subject gets a correspondingly short leash. `minHeadroom` is the
 * one number a beat may raise: at a tall narrow container `fitBounds` can land already tight enough
 * that the derived headroom is a fifth of a zoom level, which is not "moving through the map" in any
 * sense the ruling meant.
 */
export function leash(map, plan) {
  const fitted = map.getZoom();
  const visible = map.getBounds();
  const visibleLonSpan = Math.abs(visible.getEast() - visible.getWest());
  const studyLonSpan = Math.abs(plan.studyBounds.east - plan.studyBounds.west);
  const headroom = Math.log2(visibleLonSpan / Math.max(studyLonSpan, 1e-6));
  const minHeadroom = plan.minZoomHeadroom > 0 ? plan.minZoomHeadroom : 0;
  map.setMinZoom(fitted);
  map.setMaxZoom(fitted + Math.max(headroom, minHeadroom, 0));
  // The pan bound is the view the camera FITTED TO, not the box the plate was baked in. At the
  // minimum zoom that is the whole claim and there is nothing to pan to, which is correct; zoomed
  // in, a reader moves within the subject's own area and no further. Set after the fit, because a
  // bound set before it constrains the fit — which is how it came to crop the claim.
  //
  // EXCEPT AT PLANET EXTENT, where setting it crops the claim in the OTHER direction. When the whole
  // world fits inside the canvas, `getBounds()` returns more than 360° of longitude — the empty
  // margin either side of the world counts — and MapLibre's own constraint clamps a longitude range
  // to one world width and RAISES THE ZOOM to make it fit. Traced on `proof/mapgen-hexgrid-web`:
  // this one call took the fitted zoom from 0.960 to 2.417, so a beat whose title says "not spread
  // evenly across the globe" opened on eight hexagons over the Great Lakes while its own fallback
  // drew the whole planet. There is nothing to leash a reader to when the world is already on
  // screen, so nothing is set.
  if (visibleLonSpan < 360) map.setMaxBounds(visible);
  else map.setMaxBounds(null);
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
  // `-2`, not `0`, and it is MapLibre's own floor rather than a number of ours (`setMinZoom` refuses
  // anything below it). A planet needs zoom -1.06 to fit a 341px box; floored at 0 the fit could not
  // reach it and returned a cropped world instead. Measured on `proof/mapgen-hexgrid-web`, where the
  // same fit reaches -1.279 once the floor allows it.
  map.setMinZoom(-2);
  map.fitBounds(
    [
      [plan.studyBounds.west, plan.studyBounds.south],
      [plan.studyBounds.east, plan.studyBounds.north],
    ],
    { padding: fitPadding(map), animate: false },
  );
  leash(map, plan);
}

/**
 * B6.18a and B6.14a, closed by construction rather than by tuning: the hit area IS the rendered
 * mark, at every size and every zoom. There is no fixed 28px button under a 90px disc any more, and
 * no country whose hover only fires over its capital — a `fill` layer answers anywhere inside the
 * polygon, which is what "as soon as you enter the country" means. The `.pt` buttons stay in the DOM
 * for keyboard reach and for their `aria-label`; CSS drops their pointer-events while live, so the
 * canvas is what a pointer talks to.
 */
function wireHover(map, doc, win, plan) {
  const tooltip = doc.getElementById("tooltip");
  const layers = planLayers(plan).filter(function (layer) {
    return layer.hover !== false;
  });
  for (let i = 0; i < layers.length; i++) {
    const id = layers[i].id;
    map.on("mousemove", id, function (event) {
      const feature = event.features && event.features[0];
      if (!feature || !tooltip) return;
      map.getCanvas().style.cursor = "pointer";
      showTooltip(win, tooltip, feature.properties, event.originalEvent);
      markActive(doc, feature.properties.key);
    });
    map.on("mouseleave", id, function () {
      map.getCanvas().style.cursor = "";
      if (tooltip) tooltip.hidden = true;
      markActive(doc, null);
    });
  }
}

/**
 * THE ONE SELECTION BOTH HALVES READ.
 *
 * The filter is pure CSS — `:checked` + `:has()` — and that is deliberate: it is what makes the
 * filter work with JavaScript disabled, and it is not being replaced. But CSS can only reach the
 * HTML overlay. Once the marks became a MapLibre layer, a stylesheet had no way to speak to them,
 * and the one rule that used to govern both halves governed one. Measured on the seed, clicking
 * "Western Europe" in a real browser: 6 of 13 labels left, 6 of 13 hit targets left, and **all 13
 * circles still painted**. Same shape as the mark radius — two halves of one mark driven by two
 * mechanisms that diverged — and this is the second instance, so it is written into the discipline
 * as a class rather than as an incident.
 *
 * `null` means the unfiltered option, whose id (`mw-filter-all`) is reserved and refused as a group
 * slug by `assertDistinctSlugs` at build time.
 */
export function selectedGroup(doc) {
  const checked = doc.querySelector("input[name=mw-filter]:checked");
  if (!checked || checked.id === "mw-filter-all") return null;
  return checked.id.replace(/^mw-filter-/, "");
}

/**
 * Makes the live layer obey the same selection the CSS obeys. The features carry the filter
 * property as the SAME slug the radio's own id carries and the CSS selector quotes — one
 * vocabulary, three readers, which is what `slugOf` and `assertDistinctSlugs` exist to keep true.
 *
 * WITH JAVASCRIPT OFF none of this runs, and that state is coherent rather than broken: the CSS
 * still narrows the labels, the hit targets and the accessible table, and the fallback plate shows
 * every mark because a baked raster cannot be filtered. A static picture under a filtered label set
 * is a defensible degraded state — the reader sees every mark and is told about a subset — and it is
 * chosen here deliberately, not inherited.
 */
export function applyFilter(map, doc, plan) {
  const group = selectedGroup(doc);
  const layers = planLayers(plan);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!layer.filterProperty || !map.getLayer(layer.id)) continue;
    map.setFilter(layer.id, group === null ? null : ["==", ["get", layer.filterProperty], group]);
  }
  return group;
}

/**
 * Sets the drawn radius from the camera and remembers the number, so the label gutters and the hit
 * targets are placed against the SAME scale the marks are drawn at. Two numbers describing one
 * circle living apart is precisely the defect this function exists to make impossible: there is one
 * place the scale is computed and one place it is stored.
 */
export function applyMarkScale(map, doc, plan) {
  const scale = cameraScale(plan, map);
  map.__mwScale = scale;
  const layers = planLayers(plan);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.radius !== "camera" || !map.getLayer(layer.id)) continue;
    map.setPaintProperty(layer.id, "circle-radius", ["*", ["get", "r"], scale]);
  }
  reposition(map, doc, plan, scale);
  return scale;
}

/**
 * The painted halo's own arithmetic, and the two numbers it is allowed to be made of (B6.20).
 *
 * `HALO_PAD_PX` is the small constant that makes the halo read as a RING around the mark rather
 * than as the mark: 10 px of diameter, so 5 px of grey either side of the circle's own edge.
 * `HALO_FLOOR_PX` is `HIT_TARGET_PX`, the same 28 px floor the SSR'd markup uses, so a mark drawn
 * at two pixels still has a focus indicator a keyboard reader can see.
 *
 * There is deliberately no third number here. A halo derived from anything other than the mark's
 * own drawn radius is the "two numbers describing one circle" defect this format has now paid for
 * twice — see `references/map-web-discipline.md`, "The class: one mark, two halves, two mechanisms".
 */
const HALO_PAD_PX = 10;
const HALO_FLOOR_PX = 28;

/** Every `.pt` button and `.point-label` follows the camera. They were percentages of a fixed
 *  plate; live, `map.project` is what puts them where their point actually is — and a `.pt` that
 *  carries its mark's own radius (`data-r`) is SIZED here too, in screen pixels, because the
 *  percentage it was SSR'd with is a percentage of a box that is no longer the plate's. */
export function reposition(map, doc, plan, scale) {
  const anchors = plan.anchors || {};
  if (!(scale > 0)) scale = cameraScale(plan, map);
  const nodes = doc.querySelectorAll(".pt, .point-label");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const coords = anchors[node.getAttribute("data-key")];
    if (!coords) continue;
    const at = map.project(coords);
    // THE HALO IS THE MARK'S OWN SIZE, IN SCREEN PIXELS. `data-r` is the radius the mark is drawn
    // at in the bake's frame units — the very number `livePlan` puts on the circle layer's own
    // features — so `r * scale` is exactly what MapLibre paints, and the halo is that plus the pad.
    // Set on BOTH axes explicitly rather than left to `aspect-ratio`, because this is the one place
    // that knows the number in pixels and a circle stated once cannot come apart.
    const markRadius = Number(node.getAttribute("data-r") || 0);
    if (markRadius > 0 && node.classList.contains("pt")) {
      const diameter = Math.max(HALO_FLOOR_PX, markRadius * scale * 2 + HALO_PAD_PX);
      node.style.width = diameter + "px";
      node.style.height = diameter + "px";
    }
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
  // `[data-detail]`, which is what makes this the PRIMARY world's button on a page that wraps: a
  // repeated world's marks carry no `data-detail` at all — only their `title` — and the first `.pt` in document order
  // on such a page belongs to the westernmost copy.
  const node = win.document.querySelector('.pt[data-detail][data-key="' + properties.key + '"]');
  // The detail string is the one the SSR'd markup already carries, never a second formatting of
  // the same number in a second place. A feature with no button of its own (a hex bin, a region a
  // beat draws no hit target for) carries its own `detail` instead.
  tooltip.textContent = node
    ? node.getAttribute("data-detail")
    : properties.detail || properties.name;
  tooltip.hidden = false;
  const tw = tooltip.offsetWidth || 160;
  const th = tooltip.offsetHeight || 28;
  const x = Math.min(Math.max(event.clientX - tw / 2, 8), win.innerWidth - tw - 8);
  const y = Math.max(event.clientY - th - 14, 8);
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

if (typeof document !== "undefined" && typeof window !== "undefined") initLiveMap(window);
