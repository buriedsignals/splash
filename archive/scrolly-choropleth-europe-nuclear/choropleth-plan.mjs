// proof/scrolly-choropleth-europe-nuclear's own live-map plan (shared/map-beat's own contract: `shared/map-beat/mount.mjs`,
// `shared/map-beat/scrolly.mjs`). FLAT WEB MERCATOR, no pitch/bearing (choropleth.md asks for none).
//
// Two data-constant fill layers, joined to MapTiler Countries by ISO A2 (`references/types/choropleth.md`):
//   "has-nuclear"  the 16 of 41 reporting countries with any nuclear generation in 2024
//   "top3"         the three that carry 69% of it (France, Russia, Spain), painted a second, deeper tint
// A country with no reading keeps the basemap's own land tint and no in-map label (the type's own
// precision requirement) — there is no explicit "missing" layer because that IS the unpainted default.

const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

const clamp = (v) => ["max", 0, ["min", 1, v]];
const byCode = (codes) => ["match", ["get", ISO], codes, true, false];

/** A ring drawn at a fixed piece of ground: its screen radius doubles per zoom level, one top-level
 *  interpolation (a zoom expression may not nest). */
const ringAt = (ringDegrees) => ["interpolate", ["exponential", 2], ["zoom"], 0, (ringDegrees * 512) / 360, 12, (ringDegrees * 512 * 4096) / 360];

const point = (coords, text) => ({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: text === undefined ? {} : { text }, geometry: { type: "Point", coordinates: coords } }],
});

export function nuclearChoroplethPlanOf({ tints, cameras, statesForCards, referenceWidth, referenceHeight, classFills, border, hasNuclear, top3, odd, ringDegrees, fonts }) {
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    warmSamples: 3,
    degreesPerPixel: 1,
    layers: [
      {
        id: "has-nuclear",
        type: "fill",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", LEVEL], 0], byCode(hasNuclear)],
        paint: { "fill-color": classFills[0], "fill-opacity": 0 },
        bindings: { "fill-opacity": clamp({ $state: "classes" }) },
      },
      {
        id: "top3",
        type: "fill",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", LEVEL], 0], byCode(top3)],
        paint: { "fill-color": classFills[1], "fill-opacity": 0 },
        bindings: { "fill-opacity": clamp({ $state: "classes2" }) },
      },
      {
        id: "borders",
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["==", ["get", LEVEL], 0],
        paint: { "line-color": border.color, "line-width": border.width },
      },
      {
        id: "odd-ring",
        type: "circle",
        data: point(odd.seat),
        paint: {
          "circle-radius": ringAt(ringDegrees),
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": fonts.accentInk,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0,
        },
        bindings: { "circle-stroke-opacity": clamp({ $state: "odd" }) },
      },
      {
        id: "odd-name",
        type: "symbol",
        data: point(odd.seat, odd.text),
        layout: {
          "text-field": ["get", "text"],
          "text-font": [fonts.face],
          "text-size": fonts.size,
          "text-offset": [0, -1.6],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": fonts.accentInk, "text-halo-color": tints.land, "text-halo-width": 1.5, "text-opacity": 0 },
        bindings: { "text-opacity": clamp({ $state: "odd" }) },
      },
    ],
  };
}
