// THE LOCATOR VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans scrolly »).
//
// The basemap draws every country, its own labels removed by the dataviz style transform. Read from MapTiler Countries
// and drawn beneath the basemap's water: Ukraine's tint (`level` 0, `iso_a2` UA) bound to `country`, its regions'
// borders (`level` 1) bound to `regions`, every national border. The station is a ring and a dot (circle layers), the
// ring closing from its continental radius onto the station as the camera travels (`zoom`); « UKRAINE » on the
// continent a symbol layer. The close-up's places — the dots, the countries, the settlements, the waters — are added by
// `withNames` once they are placed on the measured map, bound to `names`. Every binding is data-constant.
//
// The frame drives the camera in Web Mercator numbers (`scene.mjs`, `mapStateAt`): two fixed cameras, the whole map and
// the close-up centred on the station, and the eased travel between them.

import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { cameraFields, lonLatOf, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";

export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
/** The country the story is in, as Countries codes it. */
export const FOCUS_ISO2 = "UA";
/** A seat in the open Black Sea, inside both cameras: the colour of its cell is what « the sea » is. */
export const BLACK_SEA = Object.freeze([34, 43.2]);
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

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

/**
 * THE CAMERA RAISED INTO ITS OWN BAND. MapLibre draws the camera's centre at the middle of the VIEWPORT, and the
 * viewport is the whole frame — the map is mounted on it and `measure.mjs` photographs it there. Fitted into a band
 * shorter than the frame and left centred, half of what the fit just bought would be drawn under the ground band.
 * So the camera moves SOUTH by half the band's height, in the world units of its own zoom, which moves the ground
 * NORTH on the frame by the same amount — the shift `camAlignY: -1` resolves to on a live stage
 * (`shared/map-beat/scrolly.mjs`, `stageViewOf`), baked in here because the video jumps straight to `viewOf`.
 */
const raisedBy = (camera, spare) => (spare <= 0 ? camera : { ...camera, camY: camera.camY + spare / 2 / (512 * 2 ** camera.camZoom) });

/**
 * The two fixed cameras: Europe's window, and the still's window centred on the station.
 *
 * @param {{ width: number, height: number } | null} [mapBand]  The ground the two windows are fitted into when the
 *   frame stacks a band of the direction's ground under the map (`build.mjs`, `bandFor`). Absent: the whole frame.
 */
export function camerasOf(subject, window, stage, mapBand = null) {
  const { biggest } = subject;
  const fit = mapBand ?? stage;
  const spare = stage.height - fit.height;
  return {
    whole: raisedBy(fitCamera(window, fit), spare),
    closeUp: raisedBy(fitCamera(subject.closeWindow, fit, [biggest.lon, biggest.lat]), spare),
  };
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

const trackingEm = (r) => Number(r.letterSpacing ?? 0) / Number(r.fontSize);
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const points = (items) => ({
  type: "FeatureCollection",
  features: items.map(({ at, text }) => ({ type: "Feature", properties: text === undefined ? {} : { text }, geometry: { type: "Point", coordinates: at.map(r6) } })),
});
const wordLayer = (id, { at, text, register, ink, halo, haloColour }, opacity) => ({
  id,
  type: "symbol",
  data: points([{ at, text }]),
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
  bindings: { "text-opacity": opacity },
});

/**
 * THE PLAN THE MAP IS MEASURED ON: Ukraine's tint, its regions and every border beneath the water; the station's ring
 * and dot; « UKRAINE » on the continent, gone as the camera leaves.
 *
 * @param {{ station: number[], overviewName: { at: number[], text: string, halo: number }, colours: any,
 *   strokes: { border: number, region: number, ring: number }, rings: { far: number, near: number }, dotR: number,
 *   registers: { area: any }, cameras: { whole: any } }} input
 */
export function mapPlanFor({ station, overviewName, colours, strokes, rings, dotR, registers, cameras, stage = REFERENCE }) {
  const zoom = { $state: "zoom" };
  const country = { $state: "country" };
  const layers = [
    {
      id: "story",
      type: "fill",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: ["all", ["==", ["get", LEVEL], 0], ["==", ["get", ISO], FOCUS_ISO2]],
      paint: { "fill-color": colours.story, "fill-opacity": 0 },
      bindings: { "fill-opacity": country },
    },
    // A CAMERA THAT FOCUSES ON A COUNTRY SHOWS ITS REGIONS' BORDERS (owner, 2026-09-14): Ukraine's level-1 units,
    // thinner and paler than a national border, arriving with the close-up. Beneath the water, where their coast is.
    {
      id: "regions",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: ["all", ["==", ["get", LEVEL], 1], ["==", ["get", ISO], FOCUS_ISO2]],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": colours.region, "line-width": strokes.region, "line-opacity": 0 },
      bindings: { "line-opacity": { $state: "regions" } },
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
    {
      id: "station-ring",
      type: "circle",
      data: points([{ at: station }]),
      // MapLibre strokes outside the radius: the SVG ring's radius less half the stroke, closing with the travel.
      paint: { "circle-color": colours.ring, "circle-opacity": 0, "circle-radius": rings.far - strokes.ring / 2, "circle-stroke-color": colours.ring, "circle-stroke-width": strokes.ring, "circle-stroke-opacity": 0 },
      bindings: { "circle-radius": ["-", ["+", rings.far, ["*", rings.near - rings.far, zoom]], strokes.ring / 2], "circle-stroke-opacity": country },
    },
    {
      id: "station-dot",
      type: "circle",
      data: points([{ at: station }]),
      paint: { "circle-color": colours.ring, "circle-radius": 1.8 * dotR, "circle-opacity": 0 },
      bindings: { "circle-opacity": country },
    },
    wordLayer("overview-name", { ...overviewName, register: registers.area, ink: colours.text.area, haloColour: colours.story }, ["*", country, ["-", 1, ["min", 1, ["*", 3, zoom]]]]),
  ];
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    // The water convention is taken (PALETTE.md): the sea a tint of the water hue, the land a step off the ground.
    tints: { water: colours.sea, land: colours.land },
    // THE STAGE THE CAMERA WAS AUTHORED FOR, which is the stage this run draws at — not 1920 x 1080. A consumer that
    // re-fits a plan to its own stage (`zoomShiftFor`) shifts the zoom by the ratio to these numbers, so a portrait
    // plan that declared the landscape frame would hand it a ratio it never had.
    referenceWidth: stage.width,
    referenceHeight: stage.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(cameras.whole) },
    layers,
  };
}

/**
 * THE CLOSE-UP'S PLACES, added once they are placed on the measured map, under the station's marks and bound to
 * `names`: the six settlements' dots, then every name centred on the box `build.mjs` chose — countries, settlements,
 * waters — each in its register's face and ink, its halo the measured colour under it.
 *
 * @param {{ dots: number[][], names: Array<{ key: string, at: number[], text: string, register: any, ink: string,
 *   halo: number, haloColour: string }>, colours: any, strokes: { border: number }, dotR: number }} input
 */
export function withNames(plan, { dots, names, colours, strokes, dotR }) {
  const shown = { $state: "names" };
  const layers = [
    {
      id: "place-dots",
      type: "circle",
      data: points(dots.map((at) => ({ at }))),
      // The SVG dot's radius less half its stroke, which MapLibre draws outside.
      paint: { "circle-color": colours.land, "circle-radius": dotR - (1.5 * strokes.border) / 2, "circle-opacity": 0, "circle-stroke-color": colours.text.settlement, "circle-stroke-width": 1.5 * strokes.border, "circle-stroke-opacity": 0 },
      bindings: { "circle-opacity": shown, "circle-stroke-opacity": shown },
    },
    ...names.map((n) => wordLayer(`name-${n.key}`, n, shown)),
  ];
  const at = plan.layers.findIndex((l) => l.id === "station-ring");
  return { ...plan, layers: [...plan.layers.slice(0, at), ...layers, ...plan.layers.slice(at)] };
}

/** The seats `measure.mjs` projects on the real map: the Black Sea (what the sea is), the station, and the corners of
 *  the close-up's window — what `projectorOf` is checked against. */
export function mapSeatsOf(subject) {
  const w = subject.closeWindow;
  return { sea: [...BLACK_SEA], station: [subject.biggest.lon, subject.biggest.lat], northWest: [w.west, w.north], southEast: [w.east, w.south] };
}
