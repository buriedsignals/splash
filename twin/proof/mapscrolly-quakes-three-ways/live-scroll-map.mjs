// THE LIVE MAPTILER LAYER UNDER THIS BEAT'S FOUR ENCODINGS.
//
// RULING R1, EXTENDED TO THE SCROLLY BY THE OWNER, 2026-08-10. He drove the sibling page and said:
// *"j'ai l'impression que le scrolly map n'utilise pas MapTiler correctement, je ne vois aucun
// canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* This page was in the same state
// and worse about it: `grep -c 'maplibregl\|api.maptiler.com'` over the delivered file returned 0,
// and its own source line BOASTED about it — *"the delivered file makes no request and carries no
// key"*. The argument that earned the plate is kept in `BRIEF.md` under the heading it was written
// as, marked overturned, because it was a real argument and not an oversight.
//
// This file is a DUPLICATE of `proof/mapscrolly-one-map-europe-carbon/live-scroll-map.mjs`, adapted,
// never an import of it: the twin duplicates helpers per beat (`no-cross-skill-imports.test.ts`) so
// a beat directory stays copy-pasteable on its own. `map-web/assets/live-map.mjs` is the map ×
// web sibling of both and was READ, not imported.
//
// ── WHAT IS DIFFERENT HERE, AND IT IS THE WHOLE ADAPTATION ─────────────────────────────────────
//
// The carbon beat FLIES a camera: four authored positions, the reader's scroll interpolating
// between them, so its warm walks the path and its `follow` runs on every animation frame. THIS
// beat's camera never moves — four encodings of one world, and the scroll changes what is DRAWN on
// it, not where it is pointed. Three consequences, each of which shows up below:
//
//   1. **There is exactly ONE camera to warm**, and it is the one the reader is already looking at.
//      The warm is kept — measured and reported rather than assumed away — because its job here is
//      still real, just smaller: the live layer is not revealed until that camera is quiet, so the
//      reveal never flashes grey. What it cannot do here is what it does on the carbon beat (buy
//      tiles the reader is about to scroll into), and the number this beat reports says so.
//   2. **The camera is not authored at build time — it is the CONTAIN FIT of the plate into
//      whatever box the reader's viewport gives the graphic.** So it is computed in the browser
//      (`fitCamera`) rather than in node, and recomputed on resize.
//   3. **The live layer lives OUTSIDE the frame stack.** The vehicle toggles `.step-frame` opacity
//      to swap encodings; a map inside one of those wrappers would blink out with it. The container
//      is SSR'd inside the first frame — so it is greppable in the committed file — and MOVED to be
//      the graphic's own first child before the map is constructed.
//
// ── THE FIT IS A CAMERA, AND IT IS MEASURED AGAINST THE ONE THE BROWSER ACTUALLY USED ──────────
//
// The four frames draw the plate and their marks in SVGs with `preserveAspectRatio="xMidYMid meet"`,
// which IS a contain-fit camera — declared once, in the markup, for the plate layer and the mark
// layer alike, so those two cannot drift from each other and so a reader with no JavaScript gets a
// correctly fitted map at EVERY width (this beat's own no-JS guarantee, measured in `BRIEF.md`).
// Replacing it with a CSS transform written by script would have traded that guarantee for a
// nominal SSR camera that is right at one viewport and wrong at the others.
//
// So the fit stays declarative and `fitCamera` RESTATES it in numbers for the live map — and
// because two opinions of one number is the defect class this project has now paid for three times
// (the mark radius, the scroll position, the camera), the two are reconciled by MEASUREMENT rather
// than by assertion: `cameraDrift` compares the computed camera against the browser's own
// `getScreenCTM()` on the mark layer, the boot publishes the worst disagreement onto the graphic as
// `data-fit-drift`, and a disagreement over half a pixel REFUSES the live layer and leaves the
// plate showing. A tile layer a half-pixel out of register with 14,057 marks is a map that lies
// quietly; this makes it fail loudly instead.

/** The water colour the BAKE painted onto this plate, so the live style paints the same one.
 *  DUPLICATED from `proof/mapgen-hexgrid-web/bake-plate.mjs`, which baked this beat's plate — the
 *  hex beat's own `geo-hex.ts` is frozen here byte-identical (`BRIEF.md` records its md5) and
 *  cannot gain a constant, so this beat's own new file carries it. geo-discipline rule 7: water is
 *  a blue tint, never the near-grey `dataviz-light` ships. */
export const WATER_FILL = "#aac9e0";

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

const DEG = 180 / Math.PI;

export function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function inverseMercatorY(y) {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * DEG;
}

/** A point in the plate's own units → the longitude and latitude it stands for. Linear in
 *  longitude and linear in MERCATOR Y — never in latitude, which is the mistake this projection
 *  invites and which looks exactly like a map while pointing at the wrong place. */
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
 * THE CAMERA THIS BEAT ACTUALLY USES: the plate contained in the frame, centred — the numeric
 * restatement of `preserveAspectRatio="xMidYMid meet"`, which is what the four frames' own SVGs
 * declare.
 *
 * `scale` is frame pixels per plate unit; `tx`/`ty` are where the plate's own origin lands inside
 * the frame. Same shape as the carbon beat's `resolveCamera` so `viewForCamera` below is the same
 * function, unchanged.
 */
export function fitCamera(frame, plate) {
  if (!(frame.width > 0 && frame.height > 0 && plate.width > 0 && plate.height > 0))
    throw new Error(
      `a contain fit needs a real box and a real plate; got frame ${frame.width}x${frame.height} ` +
        `and plate ${plate.width}x${plate.height}`,
    );
  const scale = Math.min(frame.width / plate.width, frame.height / plate.height);
  return {
    scale,
    tx: (frame.width - plate.width * scale) / 2,
    ty: (frame.height - plate.height * scale) / 2,
  };
}

/**
 * The live camera for one resolved plate camera.
 *
 * `x_frame = x_plate · scale + tx`, inverted at the frame's own centre, is the plate point the
 * reader is looking at, which is the map's centre; and `scale` plate-units-per-pixel is exactly one
 * zoom level per doubling, so the live zoom is the bake's plus `log2(scale)`.
 *
 * ONE derivation, shared by the tiles and by the marks, so they cannot disagree about where the
 * camera is.
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

/**
 * HOW MANY COPIES OF THE WORLD SIT BESIDE THE MIDDLE ONE in a frame this wide.
 *
 * The plate is the whole world (−179.9° to 179.9°), so the contain fit puts exactly one world in
 * the frame and leaves the slack on whichever axis did not bind — about 150px down each side of a
 * 1600px desktop. MapLibre fills that slack with a REPEAT of the far side of the world, and this is
 * the count of repeats a frame of `frameWidth` can show given a world `worldPx` across.
 *
 * `worldPx` is `geometry.worldWidthPx · camera.scale` — the bake's own world width scaled by the
 * fit, never a second measurement of it. Note it is not the same as the plate's drawn width: the
 * plate is 359.8° of the 360, so the world is 0.06% wider than the picture of it.
 */
export function worldRepeats(frameWidth, worldPx) {
  if (!(worldPx > 0)) return 0;
  return Math.max(0, Math.ceil((frameWidth / worldPx - 1) / 2));
}

/**
 * How far the camera this file COMPUTED sits from the one the browser actually drew, in frame
 * pixels, at the worst corner of the plate.
 *
 * `measured` is `{ scale, tx, ty }` read off the mark layer's own `getScreenCTM()`. The scale
 * disagreement is charged at the plate's own far corner (`plate.width · Δscale`), because a scale
 * error is invisible at the origin and largest at the edge — which is exactly where a reader would
 * see a dot sitting in the sea.
 */
export function cameraDrift(computed, measured, plate) {
  return Math.max(
    Math.abs(computed.tx - measured.tx),
    Math.abs(computed.ty - measured.ty),
    Math.abs(computed.scale - measured.scale) * plate.width,
    Math.abs(computed.scale - measured.scale) * plate.height,
  );
}

// ── Warming ────────────────────────────────────────────────────────────────────────────────────

/**
 * Walks the map through every warm position and waits for it to go quiet at each, so MapLibre's own
 * tile cache holds what the piece needs before the reader is shown anything live.
 *
 * On THIS beat there is one position, because the camera never moves. Kept, and reported, for the
 * job it still does: nothing is revealed until the tiles for that one camera have arrived, so the
 * reveal is a map appearing rather than a grey grid filling in. Its cost is measured in
 * `verify-live-tiles.mjs` against the same page run with `--no-warm`.
 *
 * Every wait is bounded. A tile server that never answers must not leave the reader on a blank
 * container: the warm gives up, the live layer is revealed anyway, and the baked plate underneath
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

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * THE MARKS REPEAT WITH THE WORLD, because a MapTiler layer would.
 *
 * This is the one thing this beat had to build that the carbon beat does not need, and it was
 * DRIVEN into existence rather than designed. With the world repeating (MapLibre's default) the
 * side bands of a 1600px frame showed 38° of longitude — Kamchatka, Japan, Australia and New
 * Zealand on the left, the Americas' Pacific margin on the right — drawn a second time with NONE of
 * this beat's dots on them, beside a paragraph reading *"every earthquake … 14,057 of them, one dot
 * each"*. Photographed: `drive/1600x900-worldcopies-bare.png` — bottom left, Australia and New
 * Zealand with not one dot on them; right edge, the Americas' Pacific margin the same. The empty
 * coasts are the most seismically active on earth.
 *
 * The obvious answer was to switch the repeat OFF, and it is the wrong one, which is worth writing
 * down because it looked right in a screenshot: MapLibre refuses to show anything beyond the
 * world's own edges, so `renderWorldCopies: false` silently CONSTRAINS the camera to cover the
 * container. Measured at 1600×900 — the layer asked for zoom 1.340 and the map sat at 1.644, and
 * the plate's north-west corner projected to (0, −94) while the marks drew it at (153, 0). A
 * hundred and fifty pixels of misregistration that a settled screenshot reads as a perfectly good
 * map, because every dot is still near a coastline; only the numbers say which one.
 *
 * So the world repeats and the marks repeat with it. That is not an invention: a GeoJSON source in
 * MapLibre is drawn once per visible world copy for exactly this reason, and this beat's marks are
 * an SVG overlay only because they were baked before the map was live. Each copy is a `<use>` of
 * the frame's own mark layer — one reference, no duplicated geometry, no second copy of a 240 kB
 * dot path in the delivered file — inside a box the same size as the frame, translated by one whole
 * world. The copies are built by SCRIPT and only once the live layer is up: with no JavaScript
 * there is no live basemap under the bands either, and dots floating on bare ground would be worse
 * than the letterbox this beat has always had.
 */
export function syncWorldRepeats(graphic, camera, geometry) {
  const doc = graphic.ownerDocument;
  const rect = graphic.getBoundingClientRect();
  const worldPx = geometry.worldWidthPx * camera.scale;
  const copies = worldRepeats(rect.width, worldPx);
  const wanted = [];
  for (let k = 1; k <= copies; k++) wanted.push(-k, k);

  const frames = graphic.querySelectorAll(".step-frame");
  for (let f = 0; f < frames.length; f++) {
    const marks = frames[f].querySelector("[data-part=marks]");
    // The DATA group, never the whole mark layer: the annotation beside it — the one ring the
    // step's own paragraph names — must stay singular. See `MapFrames.tsx`, "the surface and the
    // annotation are two groups".
    const surface = marks && marks.querySelector("[data-part=surface]");
    if (!surface) continue;
    if (!surface.id) surface.id = "qm-surface-" + f;
    let host = frames[f].querySelector("[data-part=repeats]");
    if (!host) {
      host = doc.createElement("div");
      host.setAttribute("data-part", "repeats");
      host.style.cssText = "position:absolute;inset:0;pointer-events:none";
      // Between the plate and the marks, so a repeat can never sit over the reading the beat is
      // actually about.
      marks.parentNode.insertBefore(host, marks);
    }
    if (host.childElementCount !== wanted.length) {
      while (host.firstChild) host.removeChild(host.firstChild);
      for (let i = 0; i < wanted.length; i++) {
        const wrap = doc.createElement("div");
        wrap.style.cssText = "position:absolute;inset:0";
        wrap.dataset.copy = String(wanted[i]);
        const svg = doc.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 " + geometry.frame.width + " " + geometry.frame.height);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        const use = doc.createElementNS(SVG_NS, "use");
        use.setAttribute("href", "#" + surface.id);
        svg.appendChild(use);
        wrap.appendChild(svg);
        host.appendChild(wrap);
      }
    }
    for (let i = 0; i < host.children.length; i++) {
      const child = host.children[i];
      child.style.transform = "translateX(" + Number(child.dataset.copy) * worldPx + "px)";
    }
  }
  return { copies: copies, worldPx: worldPx };
}

/** The mark layer's own placement, read off the browser rather than computed — the second opinion
 *  `cameraDrift` exists to reconcile. `getScreenCTM()` on an SVG with a viewBox returns the matrix
 *  the browser resolved `preserveAspectRatio` to: `a` is the scale, `e`/`f` the viewBox origin in
 *  screen coordinates. Expressed relative to the graphic's own box, that is a `{ scale, tx, ty }`
 *  in exactly the units `fitCamera` returns. */
export function measuredCamera(svg, frameRect) {
  if (!svg || !svg.getScreenCTM) return null;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return { scale: ctm.a, tx: ctm.e - frameRect.left, ty: ctm.f - frameRect.top };
}

/**
 * Boots the live map behind this beat's four encodings and hands back a `point()` the boot calls
 * once and on every resize.
 *
 * Everything that can fail returns null and leaves the baked plate showing: no library on the page,
 * no plan, an unsubstituted key, no container, no mark layer, a fit the browser disagrees with.
 * There is no error state a reader sees, because the plate IS the error state and it is the picture
 * this beat shipped before the ruling.
 */
export function initLiveQuakeMap(graphic, plan, options) {
  const doc = graphic.ownerDocument;
  const win = doc.defaultView;
  if (planIsUnkeyed(plan)) return null;
  if (!win.maplibregl) return null;
  const container = graphic.querySelector("[data-part=live]");
  if (!container) return null;
  // OUT of the frame stack, whose wrappers the vehicle fades between encodings, and UNDER it: the
  // graphic's own first child, so the four transparent frames paint over the tiles.
  graphic.insertBefore(container, graphic.firstChild);

  const plate = plan.geometry.frame;
  const frameOf = function () {
    const rect = graphic.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  };

  const first = frameOf();
  const opening = viewForCamera(fitCamera(first, plate), first, plan.geometry);

  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    center: opening.center,
    zoom: opening.zoom,
    // THE SCROLL PILOTS, AND NOTHING ELSE DOES. The owner's ruling of 2026-08-10 in one option:
    // no drag, no wheel, no double-click zoom, no keyboard pan, no touch, and no NavigationControl
    // below. This is a DELIBERATE DIFFERENCE from map × web, where R1 requires the controls — there
    // the reader's own exploration is the point; here the camera belongs to the piece, and a reader
    // who moved it would be looking at a world the marks are no longer registered with. Recorded as
    // a distinction between the two genres rather than left as an omission.
    interactive: false,
    attributionControl: false,
    // A cross-fade between zoom levels is MapLibre answering a camera the reader is no longer at.
    fadeDuration: 0,
    // The world at this beat's own fit is SMALLER than the frame at every desktop width — 836 plate
    // units of world inside a 1600px box. What fills the difference is `plan.renderWorldCopies`,
    // and it is the one visual decision this layer makes; `BRIEF.md` records what was seen at each
    // setting and why this beat ended where it did.
    renderWorldCopies: plan.renderWorldCopies !== false,
    // NEGATIVE ZOOM IS REAL HERE and MapLibre's own default floor of 0 would silently clamp it. At
    // 375×812 the contain fit puts the whole world in 375px, which is zoom −0.45; clamped to 0 the
    // tiles would sit at 512px against marks drawn at 375 and every dot would be in the wrong sea.
    // −2 is the library's own lower bound (`setMinZoom` throws below it).
    minZoom: -2,
    maxZoom: 22,
    maxTileCacheSize: (options && options.tileCache) || 400,
  });
  win.__qmMap = map;

  map.on("style.load", function () {
    // geo-discipline rule 7, applied to the LIVE style exactly as the bake applied it to the baked
    // one. If the live map and the plate under it disagree about the colour of water, the reveal is
    // visible and the beat is broken.
    const water = ["Water", "Water shadow"];
    for (let i = 0; i < water.length; i++)
      if (map.getLayer(water[i])) map.setPaintProperty(water[i], "fill-color", plan.waterFill);
    // Rule 9: this beat draws the only marks on this plate, and the bake hid the provider's place
    // names and borders for it. A live layer that put them back would put 14,057 dots on top of a
    // basemap the beat never designed against.
    const layers = map.getStyle().layers;
    for (let i = 0; i < layers.length; i++)
      if (layers[i].type === "symbol" || /border|boundary|admin/i.test(layers[i].id))
        map.setLayoutProperty(layers[i].id, "visibility", "none");
    // Outside the world — the letterbox this beat has always had, at the ground the newsroom's own
    // palette named, so the live page and its fallback letterbox the same colour.
    if (plan.ground) {
      for (let i = 0; i < layers.length; i++)
        if (layers[i].type === "background")
          map.setPaintProperty(layers[i].id, "background-color", plan.ground);
    }
  });

  let ready = false;
  const point = function () {
    const frame = frameOf();
    if (!(frame.width > 0 && frame.height > 0)) return null;
    const camera = fitCamera(frame, plate);
    const view = viewForCamera(camera, frame, plan.geometry);
    // THE RECONCILIATION, on every camera this layer sets rather than once at boot: a resize
    // changes the fit, and a browser that resolved `preserveAspectRatio` differently from
    // `fitCamera` at 1600px would do it again at 900px.
    const marks = graphic.querySelector(".step-frame.active [data-part=marks]");
    const measured = measuredCamera(marks, frame);
    const drift = measured ? cameraDrift(camera, measured, plate) : null;
    if (drift !== null) graphic.dataset.fitDrift = drift.toFixed(3);
    if (drift !== null && drift > 0.5) {
      // Loud, and it costs the reader nothing: the plate comes back, the tiles go away, and the
      // page is the one this beat shipped for a week.
      graphic.dataset.liveError = "fit drift " + drift.toFixed(3) + "px — the live camera and the marks disagree";
      doc.documentElement.classList.remove("qm-live");
      container.style.opacity = "0";
      return null;
    }
    if (ready) {
      map.jumpTo({ center: view.center, zoom: view.zoom });
      graphic.dataset.liveView =
        view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
      // The marks follow the world copies MapLibre draws beside the middle one, and they are only
      // ever built once the live layer is up — see `syncWorldRepeats`.
      const repeats = syncWorldRepeats(graphic, camera, plan.geometry);
      graphic.dataset.worldCopies = String(repeats.copies) + "@" + Math.round(repeats.worldPx);
    }
    return view;
  };

  map.once("load", function () {
    const view = point() || opening;
    const views = (plan.warm === false ? [] : [view]);
    warmCameras(map, views, {
      window: win,
      timeoutMs: (options && options.warmTimeoutMs) || 4000,
    }).then(function (warm) {
      graphic.dataset.liveWarm = String(warm.warmed) + ":" + Math.round(warm.ms);
      ready = true;
      // Revealed by the container's own opacity, and the plate is hidden by a class on the document
      // — one place, four frames, and nothing to keep in step per frame.
      container.style.opacity = "1";
      doc.documentElement.classList.add("qm-live");
      map.resize();
      point();
      if (options && options.onReady) options.onReady(map);
    });
  });

  map.on("error", function (event) {
    // Never a thrown error and never a console the reader cannot see: the plate is underneath and
    // the page stays readable. The state is PUBLISHED so a driving run can assert on it, which is
    // the difference between a silent fallback and a hidden one.
    graphic.dataset.liveError = (event && event.error && event.error.message) || "map error";
  });

  return { map: map, point: point };
}
