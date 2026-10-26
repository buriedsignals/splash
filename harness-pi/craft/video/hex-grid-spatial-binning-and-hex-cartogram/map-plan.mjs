// THE HEX GRID VIDEO'S GEOGRAPHIC PART AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15:
// « comme dans scrolly »; addendum §5: the form stays a live map while it shows geography, and leaves it for the cells).
//
// The basemap draws every country, flat Web Mercator. Read from MapTiler Countries and drawn beneath the basemap's
// water: every host in the neutral a cell has before it is classed; the origin hollow; every national border, and the
// origin's dashed edge over them. The cells are NOT the map's: `HexFrame.tsx` takes over with the same countries
// projected at this camera, and the fills leave (`fills`) once the SVG covers them, before anything moves.
//
// One fixed camera: the hosts' window fitted "meet" into the box the grid is laid out in, so the map and the grid stand
// in the same place and the key column stands on the Atlantic west of both.

import { cameraFields, lonLatOf, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";

// ── zone kit: carried from proof/video-locator-zaporizhzhia/map-plan.mjs (a beat cannot import another proof) ──

/**
 * A CAMERA THAT HOLDS A LON/LAT WINDOW "MEET" IN THE STAGE, centred on `center` (the window's Mercator middle when not
 * given): the zoom is the tighter of the two axes, each half of the window measured from the centre, so an off-centre
 * subject still keeps the whole window in frame.
 */
export function fitCamera({ west, east, south, north }, stage, center = null) {
  const [x0, y1] = mercatorOf([west, south]);
  const [x1, y0] = mercatorOf([east, north]);
  const [cx, cy] = center ? mercatorOf(center) : [(x0 + x1) / 2, (y0 + y1) / 2];
  const worldPx = Math.min(stage.width / 2 / Math.max(cx - x0, x1 - cx), stage.height / 2 / Math.max(cy - y0, y1 - cy));
  return cameraFields({ center: lonLatOf([cx, cy]), zoom: Math.log2(worldPx / 512) });
}

/** Where MapLibre draws [lon, lat] at a camera with no pitch, bearing or padding — checked against the measured map. */
export function projectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [stage.width / 2 + (x - camera.camX) * worldPx, stage.height / 2 + (y - camera.camY) * worldPx];
  };
}

/** The [lon, lat] MapLibre draws at a stage point, at the same camera. */
export function unprojectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return ([x, y]) => lonLatOf([camera.camX + (x - stage.width / 2) / worldPx, camera.camY + (y - stage.height / 2) / worldPx]);
}


export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
/** The hosts' window, [west, south, east, north]: Iceland to Ukraine, Cyprus to the North Cape. */
export const WINDOW = Object.freeze([-25, 34, 41, 71.5]);
/** Countries has no level-0 polygon for these below tile zoom 4 (Malta: the choropleth pilot's measurement; Liechtenstein
 *  as small): painted from their level-1 units there. */
const SMALL_BELOW_Z4 = ["MT", "LI"];
/** A seat in the open Atlantic, inside the camera: the colour of its cell is what « the sea » is. */
export const ATLANTIC = Object.freeze([-35, 50]);
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

/** ISO 3166-1 alpha-2, the code MapTiler Countries carries in `iso_a2`. Zone kit: the shared canonical table
 *  (`#shared/map-beat/iso-codes.mjs`), not the proof's grid-only copy. */
const ISO2 = ISO3_TO_ISO2;
export const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};

/** The one camera: the window held "meet" in the grid's box, centred in it. */
export function cameraOf(box, stage) {
  const [west, south, east, north] = WINDOW;
  const inBox = fitCamera({ west, south, east, north }, { width: box.w, height: box.h });
  // `fitCamera` centres on the stage; the box is off-centre, so the camera's centre moves by the box's offset.
  const worldPx = 512 * 2 ** inBox.camZoom;
  return { ...inBox, camX: inBox.camX - (box.x + box.w / 2 - stage.width / 2) / worldPx, camY: inBox.camY - (box.y + box.h / 2 - stage.height / 2) / worldPx };
}

/** The fields the plan's paints are bound to, besides the camera (`scene.mjs`, `mapStateAt`). */
export const MAP_FIELDS = Object.freeze(["fills"]);

const byLevel = (level, codes) => ["all", ["==", ["get", LEVEL], level], ["match", ["get", ISO], codes, true, false]];

/**
 * @param {{ cells: Array<{ code: string, origin: boolean }>, colours: any, strokes: { hairline: number, originDash: number[] }, camera: any }} input
 */
export function mapPlanFor({ cells, colours, strokes, camera }) {
  const fills = { $state: "fills" };
  const layers = [];
  const fillLayer = (id, codes, colour) => {
    const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
    const base = { type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, paint: { "fill-color": colour, "fill-opacity": 0 }, bindings: { "fill-opacity": fills } };
    layers.push({ id, ...base, filter: byLevel(0, codes) });
    if (small.length) layers.push({ id: `${id}-small`, ...base, maxzoom: 4, filter: byLevel(1, small) });
  };
  const hosts = cells.filter((c) => !c.origin).map((c) => iso2Of(c.code));
  const origin = cells.filter((c) => c.origin).map((c) => iso2Of(c.code));
  fillLayer("hosts", hosts, colours.neutral);
  fillLayer("origin", origin, colours.origin);
  layers.push(
    {
      id: "borders",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: ["==", ["get", LEVEL], 0],
      layout: { "line-join": "round" },
      paint: { "line-color": colours.border, "line-width": strokes.hairline },
    },
    {
      id: "origin-edge",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: byLevel(0, origin),
      layout: { "line-join": "round" },
      paint: { "line-color": colours.originEdge, "line-width": strokes.hairline, "line-dasharray": strokes.originDash.map((d) => d / strokes.hairline), "line-opacity": 0 },
      bindings: { "line-opacity": fills },
    },
  );
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: colours.sea, land: colours.land },
    referenceWidth: REFERENCE.width,
    referenceHeight: REFERENCE.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(camera) },
    layers,
  };
}

/** The seats `measure.mjs` projects on the real map: the Atlantic (what the sea is) and the window's corners — what
 *  `projectorOf` is checked against. */
export function mapSeatsOf() {
  const [west, south, east, north] = WINDOW;
  return { sea: [...ATLANTIC], northWest: [west, north], southEast: [east, south] };
}
