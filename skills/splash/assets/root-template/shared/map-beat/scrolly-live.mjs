// twin/shared/map-beat/scrolly-live.mjs
//
// THE LIVE MAP UNDER A SCROLLY, DRIVEN BY THE PLAN. Inlined into the page by `inline.mjs` together
// with the trunk modules it calls (`scrolly.mjs`, `mount.mjs`, `style.mjs`), so it imports nothing:
// every name it uses is defined in the same script.
//
// Rulings it carries: the scroll pilots and nothing else does (`interactive: false`, no controls);
// MapLibre animates nothing (`fadeDuration: 0`, `jumpTo`, paint set per frame); the projection is the
// plan's, flat Web Mercator by default; every card camera and the samples between them are warmed through MapLibre's own
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
  // Cameras are authored for `plan.referenceWidth` (and `plan.referenceHeight`, when a plan names
  // one); a smaller stage sees the same ground `zoomShiftFor` levels further out, so a phone — and a
  // wide, short desktop — keeps the card's whole subject in view.
  const handle = { map: null, maps: [], plan: plan, root: root, ready: false, pending: null, last: null, failed: false };
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
  const firstState = function () {
    return handle.last || handle.pending || { ...plan.cameras[0], ...(plan.statesForCards && plan.statesForCards[0]) };
  };

  // TWO MAPS, BECAUSE THE WARM AND THE READER CANNOT SHARE ONE CAMERA. The warm walks every card's
  // camera through MapLibre's own tile cache, which moves the camera, so it cannot run on the map the
  // reader is looking at. It used to run on the only map, hidden until it finished — and measured on
  // the choropleth pilot (Apple M2 Max, cold profile) that was 8 s of warm and a reveal 11.1 s after
  // the page loaded: a reader's first scroll stepped through the frozen card images and never saw a
  // class arrive, while the second pass read well.
  //
  // So the SHOWN map is revealed as soon as its first view is drawn and follows the scroll from then
  // on, and the WARM map runs the warm hidden beside it. When the warm is done the warm map takes the
  // reader's current state, draws it, and replaces the shown one — so the guarantee the guards hold
  // (no missing tile after `data-live-warm`) is still about the map on screen.
  const layerOf = function (hidden) {
    const el = root.ownerDocument.createElement("div");
    el.style.cssText = "position:absolute;inset:0;" + (hidden ? "opacity:0;pointer-events:none" : "");
    container.appendChild(el);
    return el;
  };
  const makeMap = function (el) {
    const map = new win.maplibregl.Map({
      container: el,
      style: plan.styleUrl,
      ...viewOf(plan.cameras[0]),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      maxTileCacheSize: 800,
      canvasContextAttributes: { preserveDrawingBuffer: !!(options && options.preserveDrawingBuffer) },
    });
    map.once("style.load", function () {
      try {
        // A flat Web Mercator map unless the plan names another projection (owner's ruling, addendum §7.1).
        map.setProjection({ type: plan.projection || "mercator" });
        if (glyphsUrl) map.setGlyphs(glyphsUrl);
        assertLiveStyleAnswered(applyLiveStyle(map, { tints: plan.tints, keepLabels: (plan.keepLabels || []).map((s) => new RegExp(s, "i")) }), plan.styleName || plan.styleUrl);
        mountPlan(map, plan);
        disableBoundTransitions(map, plan);
      } catch (err) {
        fail((err && err.message) || "the live style failed to mount");
      }
    });
    map.on("error", function (event) {
      fail((event && event.error && event.error.message) || "map error");
    });
    return map;
  };
  const paintOn = function (map, state) {
    const view = viewOf(state);
    view.zoom += handle.zoomOffset();
    map.jumpTo(view);
    for (const layer of plan.layers)
      for (const property in layer.bindings || {})
        map.setPaintProperty(layer.id, property, bindState(layer.bindings[property], state), { validate: false });
    return view;
  };
  handle.paintOn = paintOn;

  const shownEl = layerOf(false);
  const warmEl = layerOf(true);
  const shown = makeMap(shownEl);
  const warmMap = makeMap(warmEl);
  let replaced = false;

  // THE SHOWN MAP: revealed once its first view is drawn, on the reader's state so far. `plan.cameras`
  // carries pure camera fields; the per-card STATE a binding needs lives in `plan.statesForCards`, so
  // card 1's full state is overlaid when no scroll has happened yet.
  shown.once("load", function () {
    shown.once("idle", function () {
      if (handle.failed || replaced) return;
      try {
        handle.map = shown;
        handle.maps = [shown];
        handle.ready = true;
        applyScrollyMap(handle, firstState());
        handle.pending = null;
        container.style.opacity = "1";
        root.dataset.liveShown = String(Math.round(win.performance.now()));
        if (options && options.onShown) options.onShown(shown);
      } catch (err) {
        fail((err && err.message) || "the live map failed to restore its first camera");
      }
    });
    // The first idle only comes once something renders.
    shown.triggerRepaint();
  });

  warmMap.once("load", function () {
    const samples = plan.warmSamples === undefined ? 3 : plan.warmSamples;
    warmScrollyCameras(warmMap, plan.cameras, samples, win, (options && options.warmTimeoutMs) || 4000, handle.zoomOffset()).then(function (warm) {
      // A FAILED MOUNT NEVER REVEALS. The warm still ran — it touches only the camera, not the layers a
      // failed mount may never have added — but a live layer nobody finished painting is worse than the
      // fallback plate underneath it.
      if (handle.failed) {
        root.dataset.liveWarm = warm.warmed + ":" + Math.round(warm.ms);
        return;
      }
      try {
        // THE WARM MAP TAKES THE READER'S STATE BEFORE IT IS SHOWN, and follows the scroll alongside
        // the shown map until it has drawn it, so the swap never shows the warm's last camera.
        paintOn(warmMap, firstState());
        handle.maps = handle.ready ? [handle.map, warmMap] : [warmMap];
        warmMap.once("idle", function () {
          if (handle.failed) return;
          paintOn(warmMap, firstState());
          replaced = true;
          warmEl.style.opacity = "1";
          warmEl.style.pointerEvents = "";
          handle.map = warmMap;
          handle.maps = [warmMap];
          handle.ready = true;
          handle.pending = null;
          container.style.opacity = "1";
          shown.remove();
          shownEl.remove();
          root.dataset.liveWarm = warm.warmed + ":" + Math.round(warm.ms);
          if (options && options.onReady) options.onReady(warmMap);
        });
        warmMap.triggerRepaint();
      } catch (err) {
        fail((err && err.message) || "the live map failed to restore its first camera");
      }
    });
  });

  return handle;
}

function applyScrollyMap(handle, state) {
  if (!handle) return;
  handle.last = state;
  if (!handle.ready) {
    handle.pending = state;
    return;
  }
  let view = null;
  for (const map of handle.maps) view = handle.paintOn(map, state);
  if (view) handle.root.dataset.liveView = view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
}
