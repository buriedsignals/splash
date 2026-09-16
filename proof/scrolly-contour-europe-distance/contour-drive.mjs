// The painting function for the contour scrolly, inlined by `renderScrolly`'s `reveal` option AFTER the map
// runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap` are in
// scope.
//
// THE RUNTIME OWNS THE CAMERA AND EVERY PLAN LAYER'S PAINT: every isoline's, every number's and the summit's
// opacity are data-constant MapLibre expressions of `level`, `median` and `summit` (`plan.mjs`) — no JS needed
// for them. THIS FILE OWNS THE SWEEP, which is not a plan layer: a MapLibre `canvas` source, mounted once per
// map instance (`onShown`/`onReady` hand back the map itself) beneath the "outside" layer, its texels
// thresholded at `level` and uploaded on every frame that changes it (`play(); pause()`, ported from the
// validated video beat's own technique — an animated canvas source would keep the map repainting and never
// idle).
//
// A STATE, field by field:
//   level    how far inland the sweep has reached, in km; each line and its number arrive as it passes  0..~700
//   tint     the swept fill's presence — withdrawn on the last card                                     0..1
//   median   the median line and number drawn in the accent; a line within 50 km gives way to it         0..1
//   summit   the farthest point's mark and number                                                        0..1

const rgbOf = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/** The sweep's texels at `level`: a texel is filled when its distance is under `level`, the last `rimKm`
 *  under the front in the rim's colour. Ported from the validated video beat's `scene.mjs`. */
function paintSweep(px, bytes, { level, stepKm, rimKm, front, tint, rim }) {
  const [tr, tg, tb] = tint;
  const [rr, rg, rb] = rim;
  for (let i = 0, j = 0; i < bytes.length; i++, j += 4) {
    const b = bytes[i];
    const inside = b === 0 ? -1 : level - (b - 1) * stepKm;
    if (inside < 0) {
      px[j + 3] = 0;
      continue;
    }
    const edge = front && inside < rimKm;
    px[j] = edge ? rr : tr;
    px[j + 1] = edge ? rg : tg;
    px[j + 2] = edge ? rb : tb;
    px[j + 3] = 255;
  }
}

const SWEEP = "sweep";
const SWEEP_BENEATH = "outside";

function mountSweepOn(map, canvas, coordinates) {
  if (map.getSource(SWEEP)) return;
  map.addSource(SWEEP, { type: "canvas", canvas, coordinates, animate: false });
  if (!map.getLayer(SWEEP_BENEATH)) throw new Error(`the plan draws no "${SWEEP_BENEATH}" layer to mount the sweep beneath`);
  map.addLayer({ id: SWEEP, type: "raster", source: SWEEP, paint: { "raster-opacity": 0, "raster-fade-duration": 0, "raster-resampling": "linear" } }, SWEEP_BENEATH);
}

export function applyContourState(root, state) {
  if (!root.__contour) setUpContour(root);
  const c = root.__contour;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const shown = Boolean(c.handle && c.handle.map && c.handle.ready);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));
  c.fallbacks.forEach((img) => {
    const opacity = !shown && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  // ── the sweep: painted once per level, uploaded to every mounted map ──────────────────────────────
  const level = state.level;
  const key = level.toFixed(1);
  if (c.sweep.bytesDecoded && key !== c.painted) {
    c.painted = key;
    paintSweep(c.image.data, c.sweep.bytesDecoded, { level, stepKm: c.sweep.stepKm, rimKm: Math.max(c.sweep.stepKm * 2, 6), front: level < c.deepest, tint: c.tintRgb, rim: c.rimRgb });
    c.ctx.putImageData(c.image, 0, 0);
  }
  for (const map of c.handle ? c.handle.maps : []) {
    mountSweepOn(map, c.canvas, c.sweep.coordinates);
    const source = map.getSource(SWEEP);
    if (source) {
      source.play();
      source.pause();
    }
    if (map.getLayer(SWEEP)) map.setPaintProperty(SWEEP, "raster-opacity", clamp(state.tint), { validate: false });
  }

  // ── the count ──────────────────────────────────────────────────────────────────────────────────
  const km = Math.max(0, Math.min(Math.round(level), c.within.length - 1));
  const shownKm = level >= c.deepest ? Math.round(c.deepest) : km;
  const text = c.count.dataset.template.replace("{p}", String(Math.round(c.within[km]))).replace("{km}", String(shownKm));
  if (c.count.textContent !== text) c.count.textContent = text;
  const countOn = String(clamp(level / 20) * clamp(state.tint));
  c.count.style.opacity = countOn;
  c.countSwatch.style.opacity = countOn;
}

function setUpContour(root) {
  const data = JSON.parse(root.querySelector("[data-contour]").getAttribute("data-contour"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const repaint = () => {
    if (root.dataset.state) applyContourState(root, JSON.parse(root.dataset.state));
  };
  const canvas = document.createElement("canvas");
  canvas.width = data.sweep.cols;
  canvas.height = data.sweep.rows;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(data.sweep.cols, data.sweep.rows);
  const handle = initScrollyMap(root, plan, {
    window,
    preserveDrawingBuffer: /[?&]verify/.test(location.search),
    onShown: (map) => {
      mountSweepOn(map, canvas, data.sweep.coordinates);
      repaint();
    },
    onReady: (map) => {
      mountSweepOn(map, canvas, data.sweep.coordinates);
      repaint();
    },
  });
  root.__handle = handle;
  window.__scrollyMap = handle;
  const packed = Uint8Array.from(atob(data.sweep.bytes), (ch) => ch.charCodeAt(0));
  root.__contour = {
    ...data,
    plan,
    handle,
    canvas,
    ctx,
    image,
    tintRgb: rgbOf(data.colours.tint),
    rimRgb: rgbOf(data.colours.rim),
    painted: "",
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    cards: data.cards,
    count: root.querySelector('[data-part="count"]'),
    countSwatch: root.querySelector('[data-part="count-swatch"]'),
  };
  const c = root.__contour;
  c.sweep = { ...data.sweep, bytesDecoded: null };
  new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer().then((buffer) => {
    c.sweep.bytesDecoded = new Uint8Array(buffer);
    c.painted = "";
    if (root.dataset.state) applyContourState(root, JSON.parse(root.dataset.state));
  });
}
