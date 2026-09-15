// twin/shared/map-beat/mount.mjs
//
// MOUNTING A PLAN IN A LIVE MAP, and the one class of mistake MapLibre swallows whole: an expression
// that is almost valid. `text-offset` accepts a literal pair, or ONE expression that returns a pair
// — but an ARRAY of expressions is neither, and the layer renders nothing at all. No warning, no
// error, just an empty layer that looks like a data problem for an hour.

import { styleDecisionFor } from "./style.mjs";

/** Property names whose value is a pair of numbers, and which therefore cannot be assembled from two
 *  expressions. */
const PAIR_PROPERTIES = ["text-offset", "icon-offset", "text-translate", "icon-translate"];

const isExpression = (v) => Array.isArray(v) && typeof v[0] === "string";

export function validateExpressions(plan) {
  const out = [];
  for (const layer of plan.layers) {
    for (const prop of PAIR_PROPERTIES) {
      const value = layer.layout?.[prop] ?? layer.paint?.[prop];
      if (value === undefined) continue;
      if (isExpression(value)) continue;
      if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number")) continue;
      out.push(
        `layer "${layer.id}": "${prop}" is an array of expressions — MapLibre rejects it and the layer draws nothing`,
      );
    }
  }
  return out;
}

/**
 * THE THREE THINGS A MARK'S RADIUS CAN MEAN, and why the plan has to say which. A circle on a map
 * answers one of three different questions, and MapLibre cannot tell them apart:
 *
 *   - `radius: "camera"` — the circle encodes a VALUE (a proportional symbol). Its size is derived
 *     from the camera once, at the fit, and then HELD in screen pixels: growing it with zoom would
 *     make the same number mean two things at two zooms.
 *   - `radius: "ground"` — the circle stands for a fixed piece of GROUND (a dot-density dot). Its
 *     ground area must be constant, so its screen radius doubles per zoom level, DURING the gesture
 *     and not only after it settles — an interpolation, never a number.
 *   - `radius: "fixed"` — a locator pin. The same screen size at every zoom, exactly as the plate
 *     drew it: a locator has no magnitude, so there is nothing for a camera to encode.
 *
 * A layer with no `radius` is a `fill`, a `line` or a `symbol`: geographic, reprojected by MapLibre
 * itself, and none of this applies.
 *
 * These lived in `map-web`'s own `live-map.mjs`, one byte-identical copy per web beat. They are the
 * plan contract, not a page mechanic — the still and the video ask the same question of the same
 * plan — so they live where the plan lives.
 */

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
 * A live map is not a plate. It has no aspect to preserve, because the canvas IS the container, and
 * the camera is fitted to the study set at runtime rather than restored from the plate. So the two
 * halves of one circle came apart: measured on the symbol seed at 1600 x 900, the canvas is
 * 1566 x 583, the camera fits ~32° of longitude across 1566px while the plate fitted ~48° across
 * 1000px, and `Math.min` gave 0.583 — drawing Paris at 36px on cartography that had grown by 1.57x.
 *
 * The honest quantity is GROUND: a mark covers the same piece of the world it covered when baked.
 * `degreesPerPixel` is recorded by the bake, so this is a ratio of two measured facts rather than
 * another constant:
 *
 *     scale = bake degrees-per-pixel ÷ live degrees-per-pixel
 *
 * which is exactly `2 ** (liveZoom − bakeZoom)`, since `degreesPerPixel = 360 / (512 · 2**zoom)`.
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

/** THE ONE PLACE `radius` IS TURNED INTO A PAINT VALUE. A `circle-radius` decided in two places is
 *  the "two numbers describing one circle" defect this format has already paid for twice: the halo
 *  and the mark, then the filter and the mark. `mountPlan` calls this, and so does the live layer
 *  when the camera moves — one derivation, two callers.
 *
 *  `scale` is `cameraScale`'s answer, passed in rather than recomputed: a caller that has already
 *  fitted the camera must not get a second answer from a second read of the same map. */
export function radiusPaintOf(layer, plan, scale) {
  if (layer.radius === "camera") return ["*", ["get", "r"], scale];
  if (layer.radius === "ground")
    return groundRadiusExpression(plan.bakeZoom, {
      floorPx: layer.radiusFloorPx,
      uniformRadius: layer.uniformRadius,
    });
  if (layer.radius === "fixed") return ["get", "r"];
  return null;
}

/**
 * HOW MUCH THE FURNITURE AROUND A MARK GROWS WITH THE CAMERA, which is the mark's own rule and not
 * a second one. A halo, a label gutter and a hit target are all stated in the bake's frame units,
 * and they have to travel with the circle they belong to — so a `fixed` pin, drawn at the same
 * screen size at every zoom, takes a halo at the same screen size too.
 *
 * This exists because the two came apart, measured on `proof/mapgen-locator-web` the moment the
 * radius strategies reached the trunk: its markers are pins drawn at 6px, and the painted halo
 * around them was `r · cameraScale · 2 + pad` — 40px of ring around a 12px pin at the live camera's
 * own 2.88x. Both halves were internally consistent and the guard could not see it, because the
 * guard was applying the camera rule to the mark as well. Same shape as the two defects
 * `references/map-web-discipline.md` already files under "one mark, two halves, two mechanisms",
 * and this is the third, so the rule is stated ONCE here and read by both halves.
 */
export function markScaleOf(plan, scale, layerId = "mw-marks") {
  const layer = (plan.layers || []).find((l) => l.id === layerId);
  /** `camera` and `ground` reach the same multiplier at a settled camera — `cameraScale` IS
   *  `2 ** (zoom − bakeZoom)` — so only a pin stands apart. */
  return (layer && layer.radius) === "fixed" ? 1 : scale;
}

/** One MapLibre source per distinct vector URL, so two layers reading the same tiles fetch them once;
 *  a GeoJSON layer keeps a source named after itself, as before. */
export function sourceIdOf(layer) {
  if (layer.source && layer.source.url) return `src:${layer.source.url.replace(/[?#].*$/, "")}`;
  return layer.id;
}

/**
 * WHERE A PLAN LAYER GOES IN THE BASEMAP'S STACK. By default above every style layer. `beneath: "water"`
 * puts it before the style's first water fill, found by the rule the style sweep tints water by
 * (`styleDecisionFor`), so the basemap's own sea draws the coast over it.
 *
 * THE TWO COASTLINES (spec §1.3). A choropleth filled from MapTiler Countries carries that tileset's
 * coast, generalised per zoom, on top of the basemap's finer one: measured on the choropleth pilot, the
 * fills stood 1.5–3.6 CSS px over the basemap's sea at the Norwegian fjords, Dalmatia and the Aegean.
 * Beneath the water, the coarser coast is hidden under the sea and the inland borders are unchanged.
 */
export function beforeIdFor(map, layer) {
  if (layer.beneath === undefined) return undefined;
  if (layer.beneath !== "water")
    throw new Error(`layer "${layer.id}" asks to be drawn beneath "${layer.beneath}"; a plan layer can only go beneath "water"`);
  const water = map.getStyle().layers.find((l) => styleDecisionFor(l).tint === "water");
  if (!water)
    throw new Error(`layer "${layer.id}" is drawn beneath the basemap's water, and the style has no water fill to go beneath`);
  return water.id;
}

/** Run inside the page, where it calls `sourceIdOf`, `beforeIdFor` and `radiusPaintOf`: a page gets it
 *  with the rest of the trunk through `scrollyMapScript()`, never as its own `toString()`.
 *  Sources first, then layers in plan order — a leader drawn over its own word is a scratch.
 *
 *  A layer that declares a `radius` strategy gets its `circle-radius` from `radiusPaintOf` rather
 *  than from its own paint. Adding a circle layer with NO radius at all would draw MapLibre's own
 *  default 5px for one frame, which is a visible flash of the wrong circle — so the strategy is
 *  applied at mount, and a camera-scaled layer is re-derived once the camera has actually fitted.
 *
 *  A layer that reads a VECTOR source must name its source layer: without one MapLibre adds a layer
 *  that matches no feature and draws nothing, silently — the empty-layer shape again. */
export function mountPlan(map, plan) {
  for (const layer of plan.layers) {
    const id = sourceIdOf(layer);
    if (map.getSource(id)) continue;
    if (layer.source) {
      if (!layer.sourceLayer)
        throw new Error(`layer "${layer.id}" reads a vector source and names no source layer — it would draw nothing`);
      map.addSource(id, { type: layer.source.type, url: layer.source.url });
    } else map.addSource(id, { type: "geojson", data: layer.data });
  }
  for (const layer of plan.layers) {
    const paint = { ...(layer.paint || {}) };
    if (layer.radius) paint["circle-radius"] = radiusPaintOf(layer, plan, cameraScale(plan, map));
    map.addLayer(
      {
        id: layer.id,
        type: layer.type,
        source: sourceIdOf(layer),
        ...(layer.sourceLayer ? { "source-layer": layer.sourceLayer } : {}),
        ...(layer.filter ? { filter: layer.filter } : {}),
        ...(layer.minzoom === undefined ? {} : { minzoom: layer.minzoom }),
        ...(layer.maxzoom === undefined ? {} : { maxzoom: layer.maxzoom }),
        ...(layer.layout ? { layout: layer.layout } : {}),
        ...(Object.keys(paint).length ? { paint } : {}),
      },
      beforeIdFor(map, layer),
    );
    // MAPLIBRE REFUSES AN INVALID LAYER WITH AN `error` EVENT, NOT A THROW, and adds nothing: a layer missing from
    // every frame with every guard green (the proportional symbol scrolly's station name, 2026-09-15).
    if (typeof map.getLayer === "function" && !map.getLayer(layer.id))
      throw new Error(`layer "${layer.id}" was refused by the map and is not drawn — its spec is invalid (see the map's error event)`);
  }
}
