// THE LIVE MAPTILER LAYER UNDER THIS BEAT'S CAMERA.
//
// RULING R1, EXTENDED TO THE SCROLLY BY THE OWNER, 2026-08-10: *"j'ai l'impression que le scrolly
// map n'utilise pas MapTiler correctement, je ne vois aucun canvas dans le DOM. Or il faut tout le
// temps utiliser MapTiler."* And, the same day, the two things that are TRUE OF A SCROLLY and not of
// map × web: *"Pas de controls sur le scrolly, le scroll pilote et la map doit prendre toute la
// largeur."*
//
// A COPY of `proof/mapscrolly-one-map-europe-carbon/live-scroll-map.mjs`, adapted, never imported —
// a beat's inputs and outputs live in its own folder. **What is identical**: the placeholder key and
// `planIsUnkeyed`, the warm (the cameras are authored, so they are walked through MapLibre's own tile
// cache before the live layer is revealed), `interactive: false`, `fadeDuration: 0`, the raised tile
// cache, the water and label overrides, the reveal on `load`, and the fact that everything which can
// fail returns null instead of throwing. **What differs, and why**: that beat inverts a camera out of
// a BAKED PLATE's units (`plateToLonLat`, `bakeZoomOf`, `viewForCamera`); this beat has no plate, so
// its camera is authored in longitude / mercator-y / extent and `compose.mjs`'s `resolveCamera`
// already yields `{ center, zoom }` in MapLibre's own terms. Those three functions therefore do not
// exist here rather than existing unused.
//
// AND THE CONSEQUENCE OF HAVING NO PLATE, STATED RATHER THAN DISCOVERED. The sibling keeps its plate
// UNDERNEATH the tiles as the fallback layer, so a blocked host or a rotated key leaves the reader
// the picture the beat shipped before the ruling. This beat cannot: a plate holds one camera to
// within about 2× of magnification and this beat's flight covers about 11×. What is underneath here
// instead is the beat's OWN drawn geography — the park's outline and the glacier's, real OSM shapes
// frozen beside the beat and moved by the same camera — plus the scale bar. That is a weaker fallback
// than a basemap and it is named as such in `BRIEF.md`; it is not nothing, and it is honest about
// being the beat's own drawing rather than somebody's tiles.

/** The delivery placeholder. R1b: the committed artifact never holds a real key — `twin-deliver`
 *  substitutes at delivery. ASSEMBLED rather than written whole, for the reason the sibling records:
 *  this script is inside the file the substitution rewrites, so a literal here would become the key
 *  itself and the check below would refuse every delivered map. */
export function keyPlaceholder() {
  return "__MAPTILER" + "_KEY__";
}

/** True while the page still carries the placeholder — the state every COMMITTED proof artifact is
 *  in, and the reason a proof page never spends a newsroom's tile quota. */
export function planIsUnkeyed(plan) {
  return !plan || !plan.styleUrl || plan.styleUrl.indexOf(keyPlaceholder()) >= 0;
}

/**
 * Every camera the piece can be at, sampled. The authored states are the corners of the path; the
 * reader spends most of a scroll BETWEEN them, at zooms and centres no authored state has, so the
 * midpoints are warmed too. Only the legs where the map is actually on the screen are worth warming,
 * so the caller passes the range rather than this file assuming the whole piece is a map.
 */
export function warmPositions(from, to, samplesPerLeg) {
  const out = [];
  for (let i = from; i < to; i++) for (let s = 0; s < samplesPerLeg; s++) out.push(i + s / samplesPerLeg);
  out.push(to);
  return out;
}

/**
 * Walks the map through every warm position and waits for it to go quiet at each, so MapLibre's own
 * tile cache holds what the whole piece needs before the reader is shown anything live. Warming
 * through the map itself cannot disagree with the map, which a hand-rolled z/x/y enumerator could.
 *
 * Every wait is bounded: a tile server that never answers must not leave the reader on a blank
 * container forever. The warm gives up, the live layer is revealed anyway, and the beat's own drawn
 * geography is what shows through wherever a tile is missing.
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

/* eslint-env browser */

/**
 * Boots the live map under this beat's own overlay and hands back a `follow(view)` the composition
 * driver calls on every frame it paints.
 *
 * Everything that can fail returns null and leaves the drawn geography showing: no library on the
 * page, no plan, an unsubstituted key, no container. There is no error state a reader sees.
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
    // THE SCROLL PILOTS, AND NOTHING ELSE DOES — the owner's ruling in one option: no drag, no
    // wheel, no double-click zoom, no keyboard pan, no touch, and no zoom/compass control added
    // anywhere in this file — `scroll.test.ts` scans this source for the class name. A reader who
    // moved this camera would have it taken back on the next scroll event, which is worse than not
    // offering the gesture at all. This is a DIFFERENCE from map × web, where R1 requires controls.
    interactive: false,
    attributionControl: false,
    // A cross-fade between zoom levels is MapLibre answering a camera the reader is no longer at.
    fadeDuration: 0,
    // Big enough to hold the whole warmed path; the viewport-derived default evicts the opening
    // camera somewhere around the third reading, which turns a warm into a measurement of nothing.
    maxTileCacheSize: (options && options.tileCache) || 600,
    maxZoom: 22,
  });
  win.__msMap = map;

  map.on("style.load", function () {
    // geo-discipline rule 9: this beat draws the only labels it wants read — the viewpoint and the
    // glacier. A provider's place names compete with them and with the two outlines drawn over the
    // tiles — and so does the provider's own ADMINISTRATIVE BOUNDARY, which was found running as a
    // black rule across the top of the park camera, competing with the park outline this beat draws
    // itself. Same rule, same reason.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");
  });

  // The warm drives the camera itself, so a reader who scrolls while it runs must not fight it. The
  // last camera the driver asked for is REMEMBERED and applied the moment the warm finishes, which
  // is also what makes the reveal land on the reader's actual position rather than the opening one.
  let ready = false;
  let pending = null;
  const follow = function (view) {
    if (!(view && Number.isFinite(view.zoom))) return;
    if (!ready) {
      pending = view;
      return;
    }
    map.jumpTo({ center: view.center, zoom: view.zoom });
    root.dataset.liveView = view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
  };

  map.once("load", function () {
    warmCameras(map, plan.warm || [], { window: win, timeoutMs: (options && options.warmTimeoutMs) || 4000 }).then(
      function (warm) {
        root.dataset.liveWarm = String(warm.warmed) + ":" + Math.round(warm.ms);
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
      },
    );
  });

  map.on("error", function (event) {
    // Never a thrown error and never a console the reader cannot see. The state is PUBLISHED so a
    // driving run can assert on it, which is the difference between a silent fallback and a hidden
    // one.
    root.dataset.liveError = (event && event.error && event.error.message) || "map error";
  });

  return { map: map, follow: follow };
}
