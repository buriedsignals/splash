// twin/shared/map-beat/scrolly-live.mjs
//
// THE LIVE MAP UNDER A SCROLLY, DRIVEN BY THE PLAN. Inlined into the page by `inline.mjs` together
// with the trunk modules it calls (`scrolly.mjs`, `mount.mjs`, `style.mjs`), so it imports nothing:
// every name it uses is defined in the same script.
//
// Rulings it carries: the scroll pilots and nothing else does (`interactive: false`, no controls);
// MapLibre animates nothing (`fadeDuration: 0`, `jumpTo`, paint set per frame); the projection is the
// owner's globe; every card camera and the samples between them are warmed through MapLibre's own
// tile cache before the live layer is revealed; the per-card fallback images stay underneath.

const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

function warmScrollyCameras(map, cameras, samples, win, timeoutMs, zoomOffset) {
  const views = [];
  const shifted = function (view) {
    view.zoom += zoomOffset || 0;
    return view;
  };
  for (let i = 0; i < cameras.length; i++) {
    views.push(shifted(viewOf(cameras[i])));
    if (i + 1 < cameras.length) {
      const ts = [];
      for (let s = 1; s <= samples; s++) ts.push(s / (samples + 1));
      // AND ONE VIEW JUST PAST EACH INTEGER ZOOM THE TRAVEL CROSSES. The first frame at a new tile level
      // is the widest view that level ever shows, and uniform samples fall past it: on the choropleth
      // pilot (zoom 2.96 → 5.26, three samples) the zoom-3 tiles at the whole map's edges were never
      // fetched, and a slow scrub met 15 frames with a missing tile.
      const z0 = cameras[i].camZoom + (zoomOffset || 0);
      const z1 = cameras[i + 1].camZoom + (zoomOffset || 0);
      if (z0 !== z1)
        for (let level = Math.floor(Math.min(z0, z1)) + 1; level <= Math.max(z0, z1); level++) {
          // A tile level's widest view sits just above its integer, whichever way the travel goes.
          const past = level + 0.01;
          const t = (past - z0) / (z1 - z0);
          if (t > 0 && t < 1) ts.push(t);
        }
      ts.sort(function (a, b) {
        return a - b;
      });
      for (const t of ts) {
        const mix = {};
        for (const k of ["camX", "camY", "camZoom", "camBearing", "camPitch"])
          mix[k] = (cameras[i][k] ?? 0) + ((cameras[i + 1][k] ?? 0) - (cameras[i][k] ?? 0)) * t;
        views.push(shifted(viewOf(mix)));
      }
    }
  }
  let i = 0;
  const started = win.performance.now();
  return new Promise(function (resolve) {
    function next() {
      if (i >= views.length) return resolve({ warmed: views.length, ms: win.performance.now() - started });
      const view = views[i++];
      let done = false;
      const finish = function () {
        if (done) return;
        done = true;
        map.off("idle", finish);
        next();
      };
      map.once("idle", finish);
      map.jumpTo(view);
      win.setTimeout(finish, timeoutMs);
    }
    next();
  });
}

// EVERY BOUND PAINT PROPERTY GETS ITS TRANSITION KILLED, OR THE SCROLL DOES NOT OWN TIME. MapLibre
// eases every `setPaintProperty` over its own default 300ms — `fadeDuration: 0` only reaches symbol
// and raster crossfades, not this. There is no public `Map#setTransition` in 5.24.0 (checked against
// `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`: the only `setTransition` in the bundle belongs to
// the internal per-layer `Transitionable` class, never exposed on `Map`), so the public door is the
// one the style spec already gives every transitionable paint property: a sibling
// `<property>-transition` value, set through the same `setPaintProperty` the bindings use.
function disableBoundTransitions(map, plan) {
  for (const layer of plan.layers)
    for (const property in layer.bindings || {})
      map.setPaintProperty(layer.id, property + "-transition", { duration: 0, delay: 0 }, { validate: false });
}

function registerEmbeddedGlyphs(maplibregl, glyphs) {
  if (!glyphs) return null;
  maplibregl.addProtocol("splash-glyphs", async function (params) {
    const match = /^splash-glyphs:\/\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(params.url);
    const stack = match && glyphs[decodeURIComponent(match[1])];
    const b64 = stack && stack[match[2]];
    if (!b64) throw new Error(`no embedded glyphs for ${params.url}`);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return { data: bytes.buffer };
  });
  return "splash-glyphs://{fontstack}/{range}.pbf";
}

function initScrollyMap(root, plan, options) {
  const win = (options && options.window) || root.ownerDocument.defaultView;
  if (!plan || !plan.styleUrl || plan.styleUrl.indexOf(KEY_PLACEHOLDER) >= 0) return null;
  if (!win.maplibregl) return null;
  const container = root.querySelector('[data-part="live"]');
  if (!container) return null;

  const glyphsUrl = registerEmbeddedGlyphs(win.maplibregl, plan.glyphs);
  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    ...viewOf(plan.cameras[0]),
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    maxTileCacheSize: 800,
    canvasContextAttributes: { preserveDrawingBuffer: !!(options && options.preserveDrawingBuffer) },
  });
  // Cameras are authored for `plan.referenceWidth` (and `plan.referenceHeight`, when a plan names
  // one); a smaller stage sees the same ground `zoomShiftFor` levels further out, so a phone — and a
  // wide, short desktop — keeps the card's whole subject in view.
  const handle = { map: map, plan: plan, root: root, ready: false, pending: null, failed: false };
  handle.zoomOffset = function () {
    return zoomShiftFor(plan, container.clientWidth, container.clientHeight);
  };
  // A REAL PAGE HAS NO `window.applyScrollyMap`. `renderScrolly` wraps the reveal driver (and the
  // inlined runtime beside it) in an IIFE, so the module-scope function below is not a global there
  // — only what a caller reaches off the handle itself is. The pilot driver sets `window.__scrollyMap
  // = handle`; a guard reaches this the same way it reaches `handle.map`.
  handle.apply = function (state) {
    applyScrollyMap(handle, state);
  };
  // THE FIRST CAUSE WINS. A mount failure and a later runtime "error" event can both reach here;
  // only the first is kept, so a reader debugging a blank map reads what actually broke it rather
  // than whatever fired last.
  const fail = function (message) {
    if (handle.failed) return;
    handle.failed = true;
    root.dataset.liveError = message;
  };

  map.once("style.load", function () {
    try {
      if (plan.projection) map.setProjection({ type: plan.projection });
      if (glyphsUrl) map.setGlyphs(glyphsUrl);
      assertLiveStyleAnswered(applyLiveStyle(map, { tints: plan.tints, keepLabels: (plan.keepLabels || []).map((s) => new RegExp(s, "i")) }), plan.styleName || plan.styleUrl);
      mountPlan(map, plan);
      disableBoundTransitions(map, plan);
    } catch (err) {
      fail((err && err.message) || "the live style failed to mount");
    }
  });

  map.once("load", function () {
    const samples = plan.warmSamples === undefined ? 3 : plan.warmSamples;
    warmScrollyCameras(map, plan.cameras, samples, win, (options && options.warmTimeoutMs) || 4000, handle.zoomOffset()).then(function (warm) {
      root.dataset.liveWarm = warm.warmed + ":" + Math.round(warm.ms);
      // A FAILED MOUNT NEVER REVEALS. The warm still ran — it touches only the camera, not the
      // layers a failed mount may never have added — but a live layer nobody finished painting is
      // worse than the fallback plate underneath it, so neither `ready` nor the reveal happens.
      if (handle.failed) return;
      // THE CAMERA IS RESTORED BEFORE THE REVEAL, NOT AFTER. The warm's own last `jumpTo` leaves
      // the camera on the last card; revealing before this would show a reader the wrong end of the
      // beat for one frame. `ready` is set first because `applyScrollyMap` itself gates on it —
      // otherwise this call would only queue itself back into `pending`.
      //
      // `plan.cameras` carries pure camera fields (`cameraFields`'s own output) — no bound field a
      // layer's `bindings` might read, like `reveal`. The per-card STATE those bindings need lives in
      // `plan.statesForCards`, when a beat has any: the first card's camera, overlaid with the first
      // card's full state so a binding resolves to what card 1 actually paints rather than throwing.
      try {
        handle.ready = true;
        applyScrollyMap(handle, handle.pending || { ...plan.cameras[0], ...(plan.statesForCards && plan.statesForCards[0]) });
        handle.pending = null;
        container.style.opacity = "1";
        if (options && options.onReady) options.onReady(map);
      } catch (err) {
        fail((err && err.message) || "the live map failed to restore its first camera");
      }
    });
  });

  map.on("error", function (event) {
    fail((event && event.error && event.error.message) || "map error");
  });
  return handle;
}

function applyScrollyMap(handle, state) {
  if (!handle) return;
  if (!handle.ready) {
    handle.pending = state;
    return;
  }
  const view = viewOf(state);
  view.zoom += handle.zoomOffset();
  handle.map.jumpTo(view);
  for (const layer of handle.plan.layers)
    for (const property in layer.bindings || {})
      handle.map.setPaintProperty(layer.id, property, bindState(layer.bindings[property], state), { validate: false });
  handle.root.dataset.liveView = view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
}
