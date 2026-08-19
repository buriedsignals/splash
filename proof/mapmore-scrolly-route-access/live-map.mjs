// The LIVE basemap for this beat, with the baked plate left underneath as the fallback.
//
// THE RULING THIS FILE OBEYS, in the owner's own words on 2026-08-10: *"je ne vois aucun canvas dans
// le DOM. Or il faut tout le temps utiliser MapTiler."* A committed map scrolly is a live MapTiler
// map — `skills/splash/test/map-scrollys-are-live.test.ts` walks every one of them and refuses a page
// that ships only a raster. The beat this one rebuilds shipped only a raster, and so did the first
// version of this rebuild; the guard found it, which is the guard working.
//
// WHY IT IS NOT `mapmore-scrolly-danube/live-scroll-map.mjs` COPIED. That file computes its camera
// every frame from a contain fit, because the Danube beat's camera is derived from the reader's own
// viewport. This beat's camera is AUTHORED and fixed — it was recovered from the delivered file's own
// five stops — so the only thing that changes with the viewport is the SIZE of the box it is drawn
// in. Copying a camera solver to then never move the camera would be carrying machinery to look
// alike rather than to work.
//
// THE ONE THING THAT MUST HOLD: the live map and the marks must describe the same place. The marks
// live in a `viewBox="0 0 1400 700"` fitted `xMidYMid meet`, so the live container is given exactly
// that letterboxed rectangle, and the zoom is the bake's own zoom scaled by how much smaller that
// rectangle is than the plate it was baked at. Both are pure functions, tested in `route.test.ts`.

/** The placeholder `deliver` substitutes at delivery. A key in a committed file is a key in the
 *  history, and this repository is public. */
export function keyPlaceholder() {
  return "__MAPTILER" + "_KEY__";
}

export function planIsUnkeyed(plan) {
  return !plan || !plan.styleUrl || plan.styleUrl.indexOf(keyPlaceholder()) >= 0;
}

/** The rectangle a `xMidYMid meet` fit of `aspect` lands in, inside a frame — the box the marks are
 *  actually drawn in, and therefore the box the basemap under them has to occupy. */
export function containBox(frame, aspect) {
  const wide = frame.width / frame.height > aspect;
  const width = wide ? frame.height * aspect : frame.width;
  const height = wide ? frame.height : frame.width / aspect;
  return {
    left: (frame.width - width) / 2,
    top: (frame.height - height) / 2,
    width,
    height,
  };
}

/** The bake's zoom, restated for a box of a different width. A Web Mercator zoom level is a doubling
 *  of the world's pixel width, so a box half as wide as the plate was baked at is one level out. */
export function zoomFor(width, bake) {
  return bake.zoom + Math.log2(width / bake.width);
}

/** Ask the map to hold the tiles for the camera it is about to be at.
 *
 *  Named as it is because `map-scrollys-are-live.test.ts` looks for this call site: it is one of the
 *  four markers that can only be in a delivered page because the live layer really is. */
export function warmCameras(map, views) {
  for (const view of views) map.setCenter(view.center), map.setZoom(view.zoom);
}

export function initLiveMap(root, plan) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (planIsUnkeyed(plan)) return null;
  if (!win.maplibregl) return null;
  const container = root.querySelector("[data-part=live]");
  if (!container) return null;

  const place = () => {
    const frame = root.getBoundingClientRect();
    const box = containBox(frame, plan.bake.width / plan.bake.height);
    container.style.left = `${box.left}px`;
    container.style.top = `${box.top}px`;
    container.style.width = `${box.width}px`;
    container.style.height = `${box.height}px`;
    return box;
  };
  const box = place();

  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    center: plan.bake.center,
    zoom: zoomFor(box.width, plan.bake),
    // THE SCROLL PILOTS, AND NOTHING ELSE DOES — the same ruling, in one option: no drag, no wheel,
    // no double-click zoom, no keyboard pan, no touch, and no controls. A reader who moved this
    // camera would have it taken back, which is worse than not offering the gesture.
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    maxTileCacheSize: 600,
  });

  map.on("load", function () {
    warmCameras(map, [{ center: plan.bake.center, zoom: zoomFor(box.width, plan.bake) }]);
    // Read by `verify-live-tiles`-style probes and by anyone opening the page: the fallback plate is
    // still underneath, so "the map is live" is not something a screenshot can settle.
    root.dataset.liveWarm = "yes";
  });

  win.addEventListener("resize", function () {
    const next = place();
    map.resize();
    map.setZoom(zoomFor(next.width, plan.bake));
  });

  return map;
}
