// `video-cold2-coal-share-europe` AS A MAP PLAN — MapTiler's dataviz style, flat Web Mercator, mounted once and driven by numbers: a camera
// in Mercator fields and the plan's bound fields, both from `mapStateAt` (`scene.mjs`). The plan's MapTiler URLs
// carry a key PLACEHOLDER, never the key: the runner's local proxy strips it (`throughProxy`) and holds the key.
//
// ONE FILL LAYER PER COUNTRY, because each country travels its own classes year by year: its `fill-color` is an
// `interpolate` over its own bound class POSITION (`k_<iso2>`, a float from `scene.mjs`), data-constant, and its
// `fill-opacity` arrives with its 2010 class, lowest first (`arrive`). Outside the twelve there is no layer: the
// basemap's own land.
//
// AN `interpolate`, NOT A `step`. MapLibre animates nothing here by design — the frame owns time — so a paint bound to
// a whole class number changes in ONE frame, and the map strobed: twelve fills still for ten frames, then a country
// swapping its entire colour at once. The ramp turns the same class scale into a colour a fractional class can be read
// at, so the change is carried by the frames between two years. The stops are the class colours themselves, so at a
// whole year every country is painted exactly the class the key names.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrast, mix } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { cameraFields, viewOf } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { fitBoundsMeet } from "../../skills/map-beat/scripts/video-placement.mjs";
import { BREAKS, NEIGHBOURS, SUBJECT } from "./subject.mjs";

export const STAGE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
/** MapTiler Countries: one `administrative` layer, `level` 0 the countries and 1 their regions, joined on `iso_a2`. */
export const COUNTRIES = Object.freeze({ type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` });
export const COUNTRIES_LAYER = "administrative";
/** What the whole map holds, [[west, south], [east, north]]: the twelve's mainland, Northern Ireland to Crete to Lapland. */
export const BOUNDS = Object.freeze([[-11, 34.6], [32, 70.2]]);
/** The share of the stage the bounds are fitted into, "meet". */
const FIT = 0.94;
/** How far the close-up closes in on the whole map, in zoom levels. */
const CLOSE_UP_ZOOM = 2.05;
/** How far the whole map is pushed east, in stage pixels: the Atlantic west of Iberia holds the key and a one-line credit. */
const WHOLE_EAST_PX = 220;
/** Where each word the overlay places is anchored, [lon, lat] (`seats.json`); `measure.mjs` measures each at every camera. */
export const SEATS = Object.freeze(JSON.parse(readFileSync(join(import.meta.dir, "seats.json"), "utf8")).seats);
/** The close-up's frame: the subject's seat and its neighbours', centred in Mercator. */
const CLOSE_UP_SEATS = [SUBJECT, ...NEIGHBOURS];

export function camerasOf() {
  const fitted = fitBoundsMeet({ bounds: BOUNDS, stage: STAGE, fit: FIT });
  const whole = { ...fitted, camX: fitted.camX - WHOLE_EAST_PX / (512 * 2 ** fitted.camZoom) };
  const subject = cameraFields({ center: SEATS[SUBJECT], zoom: whole.camZoom + CLOSE_UP_ZOOM });
  const others = CLOSE_UP_SEATS.map((code) => cameraFields({ center: SEATS[code], zoom: 0 }));
  // Centred on the subject vertically; horizontally between the subject and the mean of the three, so Germany's
  // name stays inside the frame while Poland stays nearest the centre.
  const meanX = others.reduce((a, c) => a + c.camX, 0) / others.length;
  return { whole, closeUp: { ...subject, camX: (subject.camX + meanX) / 2 } };
}

/** The class fills, lowest to highest: the accent ramped from near the ground to past itself toward the ink. */
export function classFillsOf(direction) {
  const { ink } = deriveFurniture(direction.ground);
  const low = mix(direction.accent, direction.ground, 0.72);
  const high = mix(direction.accent, ink, 0.35);
  const n = BREAKS.length + 1;
  return Array.from({ length: n }, (_, i) => mix(low, high, i / (n - 1)));
}

/** The palest class must not read as the land outside the twelve. */
export const PALEST_OVER_LAND = 1.5;

export function mapPlanFor({ direction, subject, cameras }) {
  const tints = plateTints(direction);
  const { ink } = deriveFurniture(direction.ground);
  const fills = classFillsOf(direction);
  const palest = contrast(fills[0], tints.land);
  if (palest < PALEST_OVER_LAND) throw new Error(`the palest class ${fills[0]} reads ${palest.toFixed(2)}:1 on the land, under ${PALEST_OVER_LAND}:1 — a low reading would read as outside the twelve`);
  const level0 = (codes) => ["all", ["==", ["get", "level"], 0], ["match", ["get", "iso_a2"], codes, true, false]];
  const ramp = (field) => ["interpolate", ["linear"], { $state: field }, ...fills.flatMap((f, i) => [i, f])];
  const countryLayers = subject.countries.map((c) => ({
    id: `fill-${c.iso2}`,
    type: "fill",
    beneath: "water",
    source: COUNTRIES,
    sourceLayer: COUNTRIES_LAYER,
    filter: level0([c.iso2]),
    paint: { "fill-color": fills[c.classes[0]], "fill-opacity": 0 },
    bindings: {
      "fill-color": ramp(`k_${c.iso2}`),
      "fill-opacity": ["max", 0, ["min", 1, ["-", ["*", { $state: "arrive" }, fills.length], c.classes[0]]]],
    },
  }));
  const twelve = subject.countries.map((c) => c.iso2);
  const closeCodes = subject.countries.filter((c) => [SUBJECT, ...NEIGHBOURS].includes(c.code)).map((c) => c.iso2);
  const poland = subject.countries.find((c) => c.code === SUBJECT).iso2;
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: tints.water, land: tints.land },
    referenceWidth: STAGE.width,
    referenceHeight: STAGE.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(cameras.whole) },
    layers: [
      ...countryLayers,
      {
        // A CAMERA THAT FOCUSES ON A COUNTRY SHOWS ITS REGIONS' BORDERS — secondary to the national border, with the close-up.
        id: "regions",
        type: "line",
        beneath: "water",
        source: COUNTRIES,
        sourceLayer: COUNTRIES_LAYER,
        filter: ["all", ["==", ["get", "level"], 1], ["match", ["get", "iso_a2"], closeCodes, true, false]],
        paint: { "line-color": direction.ground, "line-width": 0.6, "line-opacity": 0 },
        bindings: { "line-opacity": ["*", 0.55, { $state: "regions" }] },
      },
      {
        id: "borders",
        type: "line",
        beneath: "water",
        source: COUNTRIES,
        sourceLayer: COUNTRIES_LAYER,
        filter: level0(twelve),
        paint: { "line-color": direction.ground, "line-width": 1.2, "line-opacity": 0 },
        bindings: { "line-opacity": ["min", 1, ["*", { $state: "arrive" }, fills.length]] },
      },
      {
        id: "ring",
        type: "line",
        source: COUNTRIES,
        sourceLayer: COUNTRIES_LAYER,
        filter: level0([poland]),
        paint: { "line-color": ink, "line-width": 3, "line-opacity": 0 },
        bindings: { "line-opacity": { $state: "ring" } },
      },
    ],
  };
}

/** The fields the plan's bindings read (`{ $state: field }`) — `mapStateAt` returns every one. */
export const mapFieldsOf = (subject) => ["arrive", "regions", "ring", ...subject.countries.map((c) => `k_${c.iso2}`)];
