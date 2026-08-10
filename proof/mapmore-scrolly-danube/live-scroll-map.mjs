// THE LIVE MAPTILER LAYER UNDER THIS BEAT'S CAMERA.
//
// RULING R1, EXTENDED TO THE SCROLLY BY THE OWNER, 2026-08-10. He drove these pages and said:
// *"j'ai l'impression que le scrolly map n'utilise pas MapTiler correctement, je ne vois aucun
// canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* He was right about the fact for
// this beat too: `grep -c 'maplibregl\|api.maptiler.com'` over the delivered `danube-scrolly.html`
// returned 0, and the live DOM held no `<canvas>` at all — the page was a baked SVG plate and
// nothing else. The reasoning that kept the plate is preserved in `BRIEF.md` under the heading it
// was written as, marked overturned, because it was a real argument and not an oversight: this
// beat's camera never moves, so ONE capture can hold everything the reader will ever see.
//
// THE RULING IS IMPLEMENTED, AND THE RISK IS ENGINEERED AROUND RATHER THAN IGNORED:
//
//   1. **The camera is warmed before the reader sees the map.** `warmCameras` walks the camera
//      through MapLibre's own machinery and waits for `idle`, so the tiles are in the library's
//      tile cache before the live layer is revealed. Warming through the map itself cannot disagree
//      with the map, which a hand-rolled z/x/y enumerator can.
//   2. **The baked plate stays UNDERNEATH, never instead of.** It is the same DOM it always was,
//      under the map container and moved by the same camera transform, so a style failure, a
//      rotated key, a blocked `api.maptiler.com` or no network at all leaves the reader exactly the
//      picture this beat shipped before the ruling. The live layer is revealed on `load`, never
//      before.
//   3. **No controls, and no reader-driven camera.** The owner, same day: *"Pas de controls sur le
//      scrolly, le scroll pilote et la map doit prendre toute la largeur."* The map is constructed
//      `interactive: false` — no drag, no wheel, no double-click zoom, no keyboard pan, no touch,
//      no `NavigationControl`. This is a DELIBERATE DIFFERENCE from map × web, where R1 requires
//      the controls: there the reader's own gesture is the whole interaction, here the scroll is
//      the only thing that drives the piece and a reader-moved camera would be taken back on the
//      next scroll event. Recorded here and in `BRIEF.md` so nobody later "fixes" it.
//
// WHERE THIS COPY DIFFERS FROM ITS SIBLING'S, and it is one thing. In
// `mapscrolly-one-map-europe-carbon` the cameras are AUTHORED — four of them, known at build time —
// so its warm list is computed in node and shipped in the plan. This beat has ONE camera and it is
// not knowable in node: it is the contain fit of a 900×420 plate into whatever box the reader's
// viewport gives the graphic (web is a range, R2), so its zoom is 5.57 at 1600px and 3.48 at 375px.
// The warm list is therefore built in the BROWSER, from the first camera the driver resolves, and
// it has exactly one entry — the camera the reader is actually at, rather than three cameras of
// which two are for somebody else's screen. `plan.warmEnabled` is what `verify-live-tiles.mjs`'s
// `--no-warm` control turns off; the sibling empties `plan.warm` instead, which this shape has no
// equivalent for.
//
// ONE IMPLEMENTATION, USED TWICE, like `route-drive.mjs` beside it: the pure half is imported in
// node by the beat's own test, and the whole file is inlined into the delivered HTML by
// `render.mjs`, which strips the `export` keywords. Nothing here is imported from another skill or
// another beat — the twin duplicates helpers (`no-cross-skill-imports.test.ts`).
// `map-web/assets/live-map.mjs` and the sibling's `live-scroll-map.mjs` were READ, not
// imported; what is shared with them is the vocabulary (a plan in a JSON literal, a placeholder
// key, a layered page), not a line of code.

/** The delivery placeholder. R1b: the committed artifact never holds a real key — `deliver`
 *  substitutes at delivery. ASSEMBLED rather than written whole: this script is inside the file the
 *  substitution rewrites, so a literal here would become the key itself and the check below would
 *  refuse every delivered map. */
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
// and a map pixel are the same thing at the same zoom — which is what lets this beat's own vector
// overlay (nine territory shapes and one 911-point route) stay registered with live tiles without
// being re-projected: it is moved by the SAME transform, over a camera derived from the SAME
// numbers.

const DEG = 180 / Math.PI;

export function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function inverseMercatorY(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * DEG;
}

/** A point in the plate's own units → the longitude and latitude it stands for. Linear in
 *  longitude, linear in MERCATOR Y — never in latitude, which is the mistake this projection
 *  invites and which puts the camera degrees off while still looking like a map. */
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
 * relation at its own 512px tile size, so this is the bake's camera restated in the library's terms
 * rather than a second measurement of it.
 */
export function bakeZoomOf(geometry) {
  if (!(geometry.worldWidthPx > 0))
    throw new Error("this plate predates the camera facts: geometry.json carries no worldWidthPx");
  return Math.log2(geometry.worldWidthPx / 512);
}

/**
 * The live camera for one resolved plate camera.
 *
 * `containCamera` (in `route-drive.mjs`) answers where the plate sits inside the frame:
 * `x_frame = x_plate · scale + tx`. Inverted at the frame's own centre that is the plate point the
 * reader is looking at, which is the map's centre; and `scale` frame-pixels-per-plate-unit is
 * exactly one zoom level per doubling, so the live zoom is the bake's plus `log2(scale)`.
 *
 * ONE derivation, shared by the tiles and by the SVG overlay's transform, so they cannot drift
 * apart. Two derivations of one camera is the defect class this project has paid for twice.
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

// ── Warming: the answer to "a reader meets the map before its tiles do" ────────────────────────

/**
 * Walks the map through every warm position and waits for it to go quiet at each, so MapLibre's own
 * tile cache holds what the piece needs before the reader is shown anything live.
 *
 * `maxTileCacheSize` is raised at construction rather than here — a cache that evicts what it just
 * warmed is a warm that measures itself and delivers nothing.
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
      if (i >= views.length)
        return resolve({ warmed: views.length, ms: win ? win.performance.now() - started : 0 });
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
 * driver calls on every frame it paints.
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
    // THE SCROLL PILOTS, AND NOTHING ELSE DOES. The owner's ruling of 2026-08-10 in one option: no
    // drag, no wheel, no double-click zoom, no keyboard pan, no touch. A reader who moved this
    // camera would have it taken back on the next scroll event, which is worse than not offering
    // the gesture at all.
    interactive: false,
    attributionControl: false,
    // A cross-fade between zoom levels is MapLibre answering a camera the reader is no longer at.
    fadeDuration: 0,
    // Big enough to hold the warmed camera plus the edges a resize asks for. The default is derived
    // from the viewport and evicts more than this beat can afford on a phone.
    maxTileCacheSize: (options && options.tileCache) || 600,
    maxZoom: 22,
  });
  win.__dsMap = map;

  map.on("style.load", function () {
    // geo-discipline rule 7, applied to the LIVE style exactly as `bake.mjs` applies it to the
    // baked one: `dataviz-light` paints water GREY, which is indistinguishable from a no-data grey.
    // If the live map and the plate under it disagree about the colour of water, the reveal is
    // visible and the beat is broken.
    const water = ["Water", "Water shadow"];
    for (let i = 0; i < water.length; i++)
      if (map.getLayer(water[i])) map.setPaintProperty(water[i], "fill-color", plan.waterFill);
    // Rule 9: this beat draws the only marks. The provider's place names and boundary lines compete
    // with the nine territory fills and the numbered badges, live exactly as baked.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");
  });

  // The warm drives the camera itself, so a driver that resolves a camera while it runs must not
  // fight it. The last camera asked for is REMEMBERED and applied the moment the warm finishes —
  // and it is also what the warm itself is computed from, which is this copy's one real difference
  // from the sibling's: the camera is a function of the reader's own box, so only the browser knows
  // it. If the driver has not painted yet (it does, on `init`), the plan's build-time estimate is
  // warmed instead, so the warm is never skipped for want of a number.
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
    root.dataset.liveView =
      view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
  };

  map.once("load", function () {
    const at = pending || { center: plan.center, zoom: plan.zoom };
    const views = plan.warmEnabled === false ? [] : [at];
    warmCameras(map, views, {
      window: win,
      timeoutMs: (options && options.warmTimeoutMs) || 4000,
    }).then(function (warm) {
      root.dataset.liveWarm = String(warm.warmed) + ":" + Math.round(warm.ms);
      // Revealed by the container's own opacity rather than by a class the scaffold would have to
      // carry a stylesheet for: this beat owns its own layer and says so in one place.
      container.style.opacity = "1";
      root.classList.add("ds-live");
      doc.documentElement.classList.add("ds-live");
      map.resize();
      ready = true;
      const last = pending || at;
      map.jumpTo({ center: last.center, zoom: last.zoom });
      root.dataset.liveView =
        last.center[0].toFixed(4) + "," + last.center[1].toFixed(4) + "@" + last.zoom.toFixed(3);
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
