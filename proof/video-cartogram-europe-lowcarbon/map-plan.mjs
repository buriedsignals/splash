// THE CARTOGRAM VIDEO'S GEOGRAPHIC PART AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15:
// « comme dans scrolly »; addendum §5: the form stays a live map while it shows geography, and leaves it for the tiles).
//
// The basemap draws every country, flat Web Mercator. Read from MapTiler Countries and drawn beneath the basemap's
// water: every studied country in its class, lowest first, over the neutral it had before its class arrived — one fill
// layer per class and per role (the widest, which the focus keeps; every other, which it steps back), so every bound
// opacity is data-constant; the unreported country hollow, its edge dashed; every national border. « RUSSIE · 36 % » a
// symbol layer, added by `withName` once it is placed. The morph is NOT the map's: `CartogramFrame.tsx` takes over with
// the same shapes projected at this camera, and the fills leave (`fills`) once the SVG covers them.
//
// One fixed camera: the beat's window fitted "meet" into the frame's content box, centred on the stage.

import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { viewOf } from "#shared/map-beat/scrolly.mjs";
import { iso2Of } from "../video-choropleth-europe-lowcarbon/build.mjs";
import { fitCamera, projectorOf, unprojectorOf } from "../video-locator-zaporizhzhia/map-plan.mjs";
import { WINDOW } from "./subject.mjs";

export { iso2Of, projectorOf, unprojectorOf };
export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
/** Malta has no level-0 polygon below tile zoom 4 (the choropleth pilot's measurement): painted from its councils there. */
const SMALL_BELOW_Z4 = ["MT"];
/** A seat in the open Atlantic, inside the camera: the colour of its cell is what « the sea » is. */
export const ATLANTIC = Object.freeze([-35, 45]);
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

/** The one camera: the window [west, south, east, north] held "meet" in the content box, the box centred on the stage. */
export function cameraOf(content) {
  const [west, south, east, north] = WINDOW;
  return fitCamera({ west, south, east, north }, { width: content.w, height: content.h });
}

/** The fields the plan's paints are bound to, besides the camera (`scene.mjs`, `mapStateAt`). */
export const MAP_FIELDS = Object.freeze(["reached0", "reached1", "reached2", "reached3", "reached4", "neutral0", "neutral1", "neutral2", "neutral3", "neutral4", "others", "fills", "widest"]);

const trackingEm = (r) => Number(r.letterSpacing ?? 0) / Number(r.fontSize);
const byLevel0 = (codes) => ["all", ["==", ["get", LEVEL], 0], ["match", ["get", ISO], codes, true, false]];
const byLevel1 = (codes) => ["all", ["==", ["get", LEVEL], 1], ["match", ["get", ISO], codes, true, false]];

/**
 * @param {{ countries: Array<{ iso: string, classIndex: number|null }>, widest: string, colours: any,
 *   strokes: { border: number, missingDash: number[] }, camera: any }} input
 */
export function mapPlanFor({ countries: studied, widest, colours, strokes, camera, stage = REFERENCE }) {
  const n = colours.classFills.length;
  const fills = { $state: "fills" };
  const others = { $state: "others" };
  const layers = [];
  const fillLayer = (id, codes, colour, opacity) => {
    const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
    const base = { type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, paint: { "fill-color": colour, "fill-opacity": 0 }, bindings: { "fill-opacity": opacity } };
    layers.push({ id, ...base, filter: byLevel0(codes) });
    if (small.length) layers.push({ id: `${id}-small`, ...base, maxzoom: 4, filter: byLevel1(small) });
  };
  for (let k = 0; k < n; k++)
    for (const role of ["others", "widest"]) {
      const codes = studied.filter((c) => c.classIndex === k && (c.iso === widest) === (role === "widest")).map((c) => iso2Of(c.iso));
      if (!codes.length) continue;
      const suffix = role === "widest" ? "-widest" : "";
      const kept = role === "widest" ? [fills] : [others, fills];
      fillLayer(`neutral-${k}${suffix}`, codes, colours.neutral, ["*", { $state: `neutral${k}` }, ...kept]);
      fillLayer(`class-${k}${suffix}`, codes, colours.classFills[k], ["*", { $state: `reached${k}` }, ...kept]);
    }
  const missing = studied.filter((c) => c.classIndex === null).map((c) => iso2Of(c.iso));
  const stepped = ["*", others, fills];
  fillLayer("missing", missing, colours.ground, stepped);
  layers.push(
    {
      id: "missing-edge",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: byLevel0(missing),
      layout: { "line-join": "round" },
      paint: { "line-color": colours.missingEdge, "line-width": strokes.border, "line-dasharray": strokes.missingDash.map((d) => d / strokes.border), "line-opacity": 0 },
      bindings: { "line-opacity": stepped },
    },
    {
      id: "borders",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: ["==", ["get", LEVEL], 0],
      layout: { "line-join": "round" },
      paint: { "line-color": colours.border, "line-width": strokes.border },
    },
  );
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: colours.sea, land: colours.land },
    // THE STAGE THE CAMERA WAS AUTHORED FOR, which is the stage this run draws at — not 1920 x 1080. A consumer
    // that re-fits a plan to its own stage (`zoomShiftFor`) shifts the zoom by the ratio to these numbers, so a
    // portrait plan that declared the landscape frame would hand it a ratio it never had.
    referenceWidth: stage.width,
    referenceHeight: stage.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(camera) },
    layers,
  };
}

/**
 * THE WIDEST COUNTRY NAMED, once it is placed: a symbol layer centred on the box `build.mjs` chose inside its shape,
 * bound to `widest`, above every fill.
 *
 * @param {{ at: number[], text: string, register: any, ink: string, halo: number, haloColour: string }} name
 */
export function withName(plan, { at, text, register, ink, halo, haloColour }) {
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  return {
    ...plan,
    layers: [
      ...plan.layers,
      {
        id: "widest-name",
        type: "symbol",
        data: { type: "FeatureCollection", features: [{ type: "Feature", properties: { text }, geometry: { type: "Point", coordinates: at.map(r6) } }] },
        layout: {
          "text-field": ["get", "text"],
          "text-font": [maptilerFace(register)],
          "text-size": register.fontSize,
          "text-letter-spacing": trackingEm(register),
          "text-anchor": "center",
          "text-max-width": 100,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": ink, "text-halo-color": haloColour, "text-halo-width": halo / 2, "text-opacity": 0 },
        bindings: { "text-opacity": { $state: "widest" } },
      },
    ],
  };
}

/** The seats `measure.mjs` projects on the real map: the Atlantic (what the sea is) and the window's corners — what
 *  `projectorOf` is checked against. */
export function mapSeatsOf() {
  const [west, south, east, north] = WINDOW;
  return { sea: [...ATLANTIC], northWest: [west, north], southEast: [east, south] };
}
