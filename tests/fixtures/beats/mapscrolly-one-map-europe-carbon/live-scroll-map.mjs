// THE LIVE MAPTILER LAYER UNDER THIS BEAT'S CAMERA.
//
// RULING R1, EXTENDED TO THE SCROLLY BY THE OWNER, 2026-08-10. He drove this page and said:
// *"j'ai l'impression que le scrolly map n'utilise pas MapTiler correctement, je ne vois aucun
// canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* He was right about the fact —
// this page rendered a baked SVG plate and nothing else, and `grep maplibregl` over the delivered
// file returned 0. The reasoning that kept the plate is preserved in `BRIEF.md` under the heading
// it was written as, marked overturned, because it was a real argument and not an oversight: a
// scrolly's cameras are AUTHORED, a finite set a plate can hold, and a reader mid-scrub can outrun
// a tile server.
//
// THE RULING IS IMPLEMENTED, AND THE RISK IS ENGINEERED AROUND RATHER THAN IGNORED. Three things
// do that, and each is measured rather than asserted:
//
//   1. **The cameras are known at build time, so they are WARMED before the reader sees the map.**
//      `warmCameras` walks every authored camera and the midpoints between them through MapLibre's
//      own machinery and waits for `idle` at each, so the tiles the whole piece needs are in the
//      library's tile cache before the live layer is revealed. This is deliberately not a
//      hand-rolled tile enumerator: guessing which z/x/y MapLibre will ask for is a second opinion
//      about the same thing, and this project has now been bitten twice by two opinions of one
//      number (the mark radius, the scroll position). Warming through the map itself cannot
//      disagree with the map.
//   2. **The baked plate stays UNDERNEATH, never instead of.** It is the same DOM it always was,
//      under the map container and moved by the same camera transform, so a style failure, a
//      rotated key, a blocked `api.maptiler.com` or no network at all leaves the reader exactly the
//      picture this beat shipped before the ruling. The live layer is revealed on `load` and never
//      before.
//   3. **No controls, and no reader-driven camera.** The owner, same day: *"Pas de controls sur le
//      scrolly, le scroll pilote et la map doit prendre toute la largeur."* The map is constructed
//      `interactive: false` — no drag, no wheel, no keyboard pan, no NavigationControl — because on
//      a scrolly the scroll already drives the camera and a reader-moved camera would be overridden
//      by the next step's flight. This is a DIFFERENCE from map × web, where R1 requires the
//      controls; it is recorded as a distinction between the two formats in
//      `scrolly/references/scrolly-discipline.md` rather than left as an omission.
//
// ONE IMPLEMENTATION, USED TWICE, like `map-drive.mjs` beside it: the pure half is imported in node
// by the beat's own test, and the whole file is inlined into the delivered HTML by `render.mjs`,
// which strips the `export` keywords. Nothing here is imported from another skill or another beat —
// the twin duplicates helpers (`no-cross-skill-imports.test.ts`). `map-web/assets/live-map.mjs`
// is the map × web sibling of this file and was READ, not imported; what is shared with it is the
// vocabulary (a plan in a `<script type="application/json">`, a placeholder key, a two-layer page),
// not a line of code.

/** The delivery placeholder. R1b: the committed artifact never holds a real key — `deliver`
 *  substitutes at delivery. ASSEMBLED rather than written whole, for the reason `live-map.mjs`
 *  records: this script is inside the file the substitution rewrites, so a literal here would
 *  become the key itself and the check below would refuse every delivered map. */
export function keyPlaceholder() {
  return "__MAPTILER" + "_KEY__";
}

/** True while the page still carries the placeholder — the state every COMMITTED proof artifact is
 *  in, and the reason a proof page never spends a newsroom's tile quota. */
export function planIsUnkeyed(plan) {
  return !plan || !plan.styleUrl || plan.styleUrl.indexOf(keyPlaceholder()) >= 0;
}

// ── The projection, which is the same one the plate was baked in ───────────────────────────────
//
// The plate is a Web Mercator capture: `geometry.frameCorners` is the extent it actually shows and
// `geometry.frame` is its size in plate units. MapLibre draws the same projection, so a plate unit
// and a map pixel are the same thing at the same zoom — which is what lets the beat's own vector
// overlay (the 41 shapes, the veil, the three highlight groups) stay registered with live tiles
// without being re-projected: it is moved by the SAME transform, over a camera derived from the
// SAME numbers.

const DEG = 180 / Math.PI;

export function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function inverseMercatorY(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * DEG;
}

/** A point in the plate's own units → the longitude and latitude it stands for. */
export function plateToLonLat(point, geometry) {
  const corners = geometry.frameCorners;
  const frame = geometry.frame;
  if (!corners || !frame)
    throw new Error(
      "this plate predates the camera facts: geometry.json carries no frameCorners, so a plate " +
        "coordinate cannot be turned into a place and the live map has nowhere to point",
    );
  const lon = corners.west + (point[0] / frame.width) * (corners.east - corners.west);
  const top = mercatorY(corners.north);
  const bottom = mercatorY(corners.south);
  return [lon, inverseMercatorY(top + (point[1] / frame.height) * (bottom - top))];
}

/**
 * The zoom at which one plate unit is one screen pixel — derived from the world width the bake
 * recorded, not from its rounded `zoom` field. `worldWidthPx = 512 · 2**zoom` is MapLibre's own
 * relation at its own 512px tile size, so this is the bake's camera restated in the library's
 * terms rather than a second measurement of it.
 */
export function bakeZoomOf(geometry) {
  if (!(geometry.worldWidthPx > 0))
    throw new Error("this plate predates the camera facts: geometry.json carries no worldWidthPx");
  return Math.log2(geometry.worldWidthPx / 512);
}

/**
 * The live camera for one resolved plate camera.
 *
 * `resolveCamera` (in `map-drive.mjs`) answers where the plate sits inside the frame:
 * `x_frame = x_plate · scale + tx`. Inverted at the frame's own centre that is the plate point the
 * reader is looking at, which is the map's centre; and `scale` plate-units-per-pixel is exactly one
 * zoom level per doubling, so the live zoom is the bake's plus `log2(scale)`.
 *
 * One derivation, so the tiles and the overlay cannot disagree about where the camera is. Two
 * derivations of one camera is the defect class this project has now paid for twice.
 */
export function viewForCamera(camera, frame, geometry) {
  const centre = [
    (frame.width / 2 - camera.tx) / camera.scale,
    (frame.height / 2 - camera.ty) / camera.scale,
  ];
  return {
    center: plateToLonLat(centre, geometry),
    zoom: bakeZoomOf(geometry) + Math.log2(camera.scale),
  };
}

// ── Warming: the answer to "a reader mid-scrub outruns the tile server" ────────────────────────

/**
 * Every camera the piece can be at, sampled. The authored states are the corners of the path; the
 * reader spends most of a scroll BETWEEN them, at zooms and centres no authored state has, so the
 * midpoints are warmed too. `samplesPerLeg` is this beat's one tuning knob for the warm: 3 means
 * each leg contributes its two ends and two interior positions.
 */
export function warmPositions(stateCount, samplesPerLeg) {
  const out = [];
  for (let i = 0; i < stateCount - 1; i++)
    for (let s = 0; s < samplesPerLeg; s++) out.push(i + s / samplesPerLeg);
  out.push(stateCount - 1);
  return out;
}

/**
 * Walks the map through every warm position and waits for it to go quiet at each, so MapLibre's own
 * tile cache holds what the whole piece needs before the reader is shown anything live.
 *
 * `maxTileCacheSize` is raised at construction rather than here — a cache that evicts the opening
 * camera while warming the closing one is a warm that measures itself and delivers nothing.
 *
 * Every wait is bounded. A tile server that never answers must not leave the reader on a blank
 * container forever: the warm gives up, the live layer is revealed anyway, and the plate underneath
 * is what shows through wherever a tile is missing.
 */
export function warmCameras(map, views, options) {
  const timeout = (options && options.timeoutMs) || 4000;
  const win = (options && options.window) || (typeof window !== "undefined" ? window : null);
  let i = 0;
  return new Promise(function (resolve) {
    const started = win ? win.performance.now() : 0;
    function next() {
      if (i >= views.length) return resolve({ warmed: views.length, ms: win ? win.performance.now() - started : 0 });
      const view = views[i++];
      let done = false;
      const finish = function () {
        if (done) return;
        done = true;
        map.off("idle", finish);
        next();
      };
      map.once("idle", finish);
      map.jumpTo({ center: view.center, zoom: view.zoom });
      if (win) win.setTimeout(finish, timeout);
    }
    next();
  });
}

// ── The live layer ─────────────────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Boots the live map behind this beat's own overlay and hands back a `follow(camera, frame)` the
 * scroll driver calls on every frame it paints.
 *
 * Everything that can fail returns null and leaves the plate showing: no library on the page, no
 * plan, an unsubstituted key, no container. There is no error state a reader sees, because the
 * plate IS the error state and it is the picture this beat shipped for a week.
 */
export function initLiveScrollMap(root, plan, options) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (planIsUnkeyed(plan)) return null;
  if (!win.maplibregl) return null;
  const container = root.querySelector("[data-part=live]");
  if (!container) return null;

  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    center: plan.center,
    zoom: plan.zoom,
    // THE SCROLL PILOTS, AND NOTHING ELSE DOES. The owner's ruling of 2026-08-10 in one option:
    // no drag, no wheel, no double-click zoom, no keyboard pan, no touch. A reader who moved this
    // camera would have it taken back on the next scroll event, which is worse than not offering
    // the gesture at all.
    interactive: false,
    attributionControl: false,
    // A cross-fade between zoom levels is MapLibre answering a camera the reader is no longer at.
    fadeDuration: 0,
    // Big enough to hold the whole warmed path. The default is derived from the viewport and evicts
    // the opening camera somewhere around the third reading, which turns a warm into a measurement
    // of nothing.
    maxTileCacheSize: (options && options.tileCache) || 600,
    maxZoom: 22,
  });
  win.__msMap = map;

  map.on("style.load", function () {
    // geo-discipline rule 7, applied to the LIVE style exactly as the bake applies it to the baked
    // one. If the live map and the plate under it disagree about the colour of water, the reveal is
    // visible and the beat is broken.
    const water = ["Water", "Water shadow"];
    for (let i = 0; i < water.length; i++)
      if (map.getLayer(water[i])) map.setPaintProperty(water[i], "fill-color", plan.waterFill);
    // Rule 9: this beat draws the only labels. The provider's place names compete with the labels
    // the beat positions itself and with its own choropleth, live exactly as baked.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");
  });

  // The warm drives the camera itself, so a reader who scrolls while it runs must not fight it.
  // The last camera the driver asked for is REMEMBERED and applied the moment the warm finishes,
  // which is also what makes the reveal land on the reader's actual position rather than on the
  // opening one.
  let ready = false;
  let pending = null;
  const follow = function (camera, frame) {
    if (!(camera && camera.scale > 0)) return;
    const view = viewForCamera(camera, frame, plan.geometry);
    if (!ready) {
      pending = view;
      return;
    }
    map.jumpTo({ center: view.center, zoom: view.zoom });
    root.dataset.liveView = view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
  };

  map.once("load", function () {
    const views = (plan.warm || []).map(function (camera) {
      return { center: camera.center, zoom: camera.zoom };
    });
    warmCameras(map, views, { window: win, timeoutMs: (options && options.warmTimeoutMs) || 4000 }).then(function (warm) {
      root.dataset.liveWarm = String(warm.warmed) + ":" + Math.round(warm.ms);
      // Revealed by the container's own opacity rather than by a class the scaffold would have to
      // carry a stylesheet for: this beat owns its own layer and says so in one place.
      container.style.opacity = "1";
      root.classList.add("ms-live");
      doc.documentElement.classList.add("ms-live");
      map.resize();
      ready = true;
      if (pending) {
        map.jumpTo({ center: pending.center, zoom: pending.zoom });
        root.dataset.liveView =
          pending.center[0].toFixed(4) + "," + pending.center[1].toFixed(4) + "@" + pending.zoom.toFixed(3);
      }
      if (options && options.onReady) options.onReady(map);
    });
  });

  map.on("error", function (event) {
    // Never a thrown error and never a console the reader cannot see: the plate is underneath and
    // the page stays readable. The state is PUBLISHED so a driving run can assert on it, which is
    // the difference between a silent fallback and a hidden one.
    root.dataset.liveError = (event && event.error && event.error.message) || "map error";
  });

  return { map: map, follow: follow };
}
