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
    if (i + 1 < cameras.length)
      for (let s = 1; s <= samples; s++) {
        const t = s / (samples + 1);
        const mix = {};
        for (const k of ["camX", "camY", "camZoom", "camBearing", "camPitch"])
          mix[k] = (cameras[i][k] ?? 0) + ((cameras[i + 1][k] ?? 0) - (cameras[i][k] ?? 0)) * t;
        views.push(shifted(viewOf(mix)));
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
  });
  // Cameras are authored for `plan.referenceWidth`; a narrower stage sees the same ground one
  // log2(width ratio) zoom level further out, so a phone keeps the card's whole subject in view.
  const handle = { map: map, plan: plan, root: root, ready: false, pending: null };
  handle.zoomOffset = function () {
    return plan.referenceWidth ? Math.log2(container.clientWidth / plan.referenceWidth) : 0;
  };

  map.once("style.load", function () {
    if (plan.projection) map.setProjection({ type: plan.projection });
    if (glyphsUrl) map.setGlyphs(glyphsUrl);
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: plan.tints, keepLabels: (plan.keepLabels || []).map((s) => new RegExp(s, "i")) }), plan.styleName || plan.styleUrl);
    mountPlan(map, plan);
  });

  map.once("load", function () {
    const samples = plan.warmSamples === undefined ? 3 : plan.warmSamples;
    warmScrollyCameras(map, plan.cameras, samples, win, (options && options.warmTimeoutMs) || 4000, handle.zoomOffset()).then(function (warm) {
      root.dataset.liveWarm = warm.warmed + ":" + Math.round(warm.ms);
      container.style.opacity = "1";
      handle.ready = true;
      if (handle.pending) applyScrollyMap(handle, handle.pending);
      if (options && options.onReady) options.onReady(map);
    });
  });

  map.on("error", function (event) {
    root.dataset.liveError = (event && event.error && event.error.message) || "map error";
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
