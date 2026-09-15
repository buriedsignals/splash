// THE COAL VIDEO AS A MAP PLAN — MapTiler's dataviz style, flat Web Mercator, every country drawn by the basemap; the
// twelve painted from MapTiler Countries (joined on `iso_a2`) beneath the basemap's water, ONE FILL LAYER PER COUNTRY so
// every bound paint is data-constant: its colour steps with its own reading as the bound `year` runs, its opacity
// arrives with its 2010 class. Poland's outline is a line layer; the regions' borders come with the close-up.

import { adjustToContrast, contrast, mix } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { cameraFields, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { BREAKS, classOf, FIRST, NEIGHBOURS, SUBJECT, YEARS } from "./beat.mjs";

export const STAGE = Object.freeze({ width: 1920, height: 1080 });
export const MAP_FIELDS = Object.freeze(["classes", "year", "ring", "regions"]);
const KEY = "__MAPTILER" + "_KEY__";
const LAYER = "administrative";
/** What the whole map holds: the twelve, from Ireland's longitude to Finland's north and Greece's south. */
export const BOUNDS = Object.freeze([[-11, 34.5], [34, 70.5]]);
/** The share of the stage the bounds are fitted into, on the tighter axis. */
const FIT = 0.92;
/** How much further in the close-up goes, at most; and the room a neighbour's word needs from the frame's edge. */
const CLOSE_UP_MAX = 1.6;
const NEIGHBOUR_ROOM = 380;
/** Where each of the twelve is named — `proof/video-choropleth-europe-lowcarbon/seats.json` (its provenance: the
 *  point of the largest Natural Earth 50 m ring farthest from its edge), copied for the twelve. */
export const SEATS = Object.freeze({
  BGR: [24.6815, 42.6358], CZE: [14.3338, 49.8162], DEU: [9.2966, 50.929], DNK: [9.0538, 56.0528],
  FIN: [26.5326, 62.7604], GBR: [-1.2104, 52.3507], GRC: [21.6546, 39.8063], HUN: [20.0387, 47.1727],
  NLD: [5.6324, 52.4525], POL: [19.5304, 52.2719], ROU: [24.9774, 45.8255], SVN: [14.9483, 46.0892],
});
export const ISO2 = Object.freeze({
  BGR: "BG", CZE: "CZ", DEU: "DE", DNK: "DK", FIN: "FI", GBR: "GB", GRC: "GR", HUN: "HU", NLD: "NL", POL: "PL", ROU: "RO", SVN: "SI",
});

export function camerasOf() {
  const [[w, s], [e, n]] = BOUNDS;
  const [x0, y1] = mercatorOf([w, s]);
  const [x1, y0] = mercatorOf([e, n]);
  const worldPx = FIT * Math.min(STAGE.width / (x1 - x0), STAGE.height / (y1 - y0));
  const zoom = Math.log2(worldPx / 512);
  const whole = cameraFields({ center: [(w + e) / 2, 0], zoom });
  whole.camY = (y0 + y1) / 2;
  // THE CLOSE-UP CENTRES THE SUBJECT on both axes, as close as its farthest named neighbour still leaves room for a word.
  const farthest = Math.max(...NEIGHBOURS.map((iso) => Math.abs(mercatorOf(SEATS[iso])[0] - mercatorOf(SEATS[SUBJECT])[0])));
  const closeZoom = Math.min(zoom + CLOSE_UP_MAX, Math.log2((STAGE.width / 2 - NEIGHBOUR_ROOM) / farthest / 512));
  const closeUp = cameraFields({ center: SEATS[SUBJECT], zoom: closeZoom });
  return { whole, closeUp };
}

/** The class fills, lightest to darkest: a NEUTRAL ramp from the direction's ground toward its own ink (map-beat's rule
 *  for a choropleth — the ramp colours every region, so the accent is spent on the subject alone). */
export const RAMP = Object.freeze({ to: 0.78, landApart: 1.3 });
export function classFillsOf(direction, land) {
  const { ink } = deriveFurniture(direction.ground);
  const n = BREAKS.length + 1;
  // THE PALEST CLASS IS NOT BARE LAND: « under 10 % » is a reading, « outside the twelve » is not, so the ramp starts at
  // the smallest dose off the ground that stands `landApart` from the basemap's land.
  let from = null;
  for (let dose = 0.06; dose <= 0.5 + 1e-9; dose += 0.01)
    if (contrast(mix(direction.ground, ink, dose), land) >= RAMP.landApart) {
      from = dose;
      break;
    }
  if (from === null) throw new Error(`no dose of the ink off ${direction.ground} stands ${RAMP.landApart}:1 from the land ${land}`);
  return Array.from({ length: n }, (_, i) => mix(direction.ground, ink, from + ((RAMP.to - from) * i) / (n - 1)));
}

/** A country's fill as the year runs: its class colour held through each year, crossfaded over a sliver either side
 *  of the step so the counter (which switches at the step) and the map agree. `t` is 0 at 2010, 1 at 2024. */
export function yearColourExpression(iso, share, fills) {
  const last = YEARS.length - 1;
  const sliver = 0.12 / last;
  const stops = [];
  YEARS.forEach((year, i) => {
    const c = fills[classOf(share(iso, year))];
    const t = i / last;
    if (i > 0) stops.push(t + sliver, c);
    else stops.push(0, c);
    if (i < last) stops.push((i + 1) / last - sliver, c);
  });
  return ["interpolate", ["linear"], { $state: "year" }, ...stops];
}

export function mapPlanFor({ direction, subject, cameras }) {
  const { grid } = deriveFurniture(direction.ground);
  const tints = plateTints(direction);
  const fills = classFillsOf(direction, tints.land);
  const n = fills.length;
  const hairline = direction.stroke?.hairline ?? 0.6;
  const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };
  const studied = subject.studySet.map((iso) => ISO2[iso]);
  const fillLayers = subject.studySet.map((iso) => ({
    id: `coal-${iso}`,
    type: "fill",
    beneath: "water",
    source: countries,
    sourceLayer: LAYER,
    filter: ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], ISO2[iso]]],
    paint: { "fill-color": fills[classOf(subject.share(iso, FIRST))], "fill-opacity": 0 },
    bindings: {
      "fill-color": yearColourExpression(iso, subject.share, fills),
      "fill-opacity": ["max", 0, ["min", 1, ["-", ["*", { $state: "classes" }, n], classOf(subject.share(iso, FIRST))]]],
    },
  }));
  const outlineInk = adjustToContrast(direction.accent, direction.ground, 4.5) ?? direction.accent;
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: tints.water, land: tints.land },
    referenceWidth: STAGE.width,
    referenceHeight: STAGE.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(cameras.whole) },
    fills,
    layers: [
      ...fillLayers,
      {
        id: "regions",
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", "level"], 1], ["match", ["get", "iso_a2"], studied, true, false]],
        paint: { "line-color": grid, "line-width": 0.5 * hairline, "line-opacity": 0 },
        bindings: { "line-opacity": { $state: "regions" } },
      },
      {
        id: "borders",
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["==", ["get", "level"], 0],
        paint: { "line-color": ["case", ["match", ["get", "iso_a2"], studied, true, false], grid, mix(tints.land, grid, 0.4)], "line-width": hairline },
      },
      // THE SUBJECT'S OUTLINE, in the accent over a halo of the ground: the one mark on the map that is not a class, read
      // on the dark fills and the pale ones alike.
      ...[
        ["subject-halo", direction.ground, 8],
        ["subject-outline", outlineInk, 3.5],
      ].map(([id, colour, width]) => ({
        id,
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], ISO2[SUBJECT]]],
        paint: { "line-color": colour, "line-width": width, "line-opacity": 0 },
        bindings: { "line-opacity": { $state: "ring" } },
      })),
    ],
  };
}
