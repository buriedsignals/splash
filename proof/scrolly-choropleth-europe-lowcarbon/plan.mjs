// THE CHOROPLETH SCROLLY AS A MAP PLAN. Every mark inside the map is a MapLibre layer: the class fills
// read MapTiler Countries (the basemap's own tiles, joined by ISO A2 code), the names are symbol layers
// placed at the beat's seats, the odd one's ring is a circle layer. The scroll drives the camera and
// every paint through `$state` tokens (`shared/map-beat/scrolly.mjs`).
//
// THE TILESET, AS MEASURED on 2026-09-15 (`https://api.maptiler.com/tiles/countries/tiles.json`):
// maxzoom 11, source layer `administrative` with `level` (0 = country … 4) and `iso_a2`; a second layer
// `postal` from zoom 6 that this beat does not read.
//
// MALTA IS NOT A LEVEL-0 POLYGON AT A CONTINENTAL ZOOM. Measured on the same day with
// `querySourceFeatures`: its level-0 feature exists only from tile zoom 4; at tile zooms 2 and 3 the
// tiles carry Malta's level-1 councils and no level 0; at tile zoom 1 and below they carry nothing for
// Malta at all. A filter on `level == 0` alone therefore drops a reporting country from the whole map.
// So the codes named in `SMALL_BELOW_Z4` are also painted from their level-1 units, below zoom 4 only
// (above it the level-0 polygon is there and the two would double the paint).

export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
const SMALL_BELOW_Z4 = ["MT"];
const KEY = "__MAPTILER" + "_KEY__";

const clamp = (x) => ["max", 0, ["min", 1, x]];
/** easeInOutQuad, as a MapLibre expression over a bound number — the curve `reveal.mjs` eases a
 *  reading with, and the one the SVG driver applied once more to the travel before deciding a word. */
const ease = (t) => ["case", ["<", t, 0.5], ["*", 2, t, t], ["-", 1, ["/", ["^", ["+", ["*", -2, t], 2], 2], 2]]];

/** THE TRAVEL AND THE TWO MOMENTS A WORD MAY SHOW, exactly as `choropleth-drive.mjs` decided them
 *  when the map was SVG: the close-up's names only once the camera has arrived (the last quarter of
 *  the eased travel), the whole map's names only at rest (its first 8 %). A word placed while the
 *  camera moves piles onto its neighbours. */
export const travel = ease(clamp({ $state: "zoom" }));
export const arrived = clamp(["/", ["-", travel, 0.75], 0.25]);
export const atRest = clamp(["/", ["-", 0.08, travel], 0.08]);

const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

export function choroplethPlan({ tints, classFills, missingFill, border, shares, breaks, top, odd, neighbours, missing, waters, words, cameras, statesForCards, fonts, referenceWidth, referenceHeight, ringDegrees }) {
  const classOf = (v) => breaks.filter((b) => v >= b).length;
  const n = classFills.length;
  // ONE FILL LAYER PER GROUP OF COUNTRIES THAT MOVE TOGETHER — a class, and whether the filter keeps it —
  // so every bound opacity is data-constant. A single layer whose opacity read each feature's code
  // (`["match", ["get", "iso_a2"], …]`) made MapLibre reload every Countries tile on every scroll frame
  // (`validateScrollyPlan` now refuses that shape).
  const groups = new Map();
  const studied = [];
  for (const [iso2, value] of Object.entries(shares)) {
    studied.push(iso2);
    if (value === null) continue;
    const klass = classOf(value);
    const kept = top.includes(iso2);
    const id = `class-${klass}${kept ? "-kept" : ""}`;
    if (!groups.has(id)) groups.set(id, { id, klass, kept, members: [] });
    groups.get(id).members.push(iso2);
  }
  const classLayers = [];
  for (const g of [...groups.values()].sort((a, b) => a.klass - b.klass || a.kept - b.kept)) {
    // A class is reached when `classes · n` passes its index: opacity climbs from 0 to 1 over one step;
    // a country under the floor steps back to bare land as `filter` rises.
    const reached = clamp(["-", ["*", { $state: "classes" }, n], g.klass]);
    const paint = { paint: { "fill-color": classFills[g.klass], "fill-opacity": 0 }, bindings: { "fill-opacity": g.kept ? reached : ["*", reached, ["-", 1, { $state: "filter" }]] } };
    const byCode = ["match", ["get", ISO], g.members, true, false];
    classLayers.push({ id: g.id, type: "fill", source: countries, sourceLayer: LAYER, filter: ["all", ["==", ["get", LEVEL], 0], byCode], ...paint });
    const small = g.members.filter((code) => SMALL_BELOW_Z4.includes(code));
    if (small.length)
      classLayers.push({
        id: `${g.id}-small`,
        type: "fill",
        source: countries,
        sourceLayer: LAYER,
        maxzoom: 4,
        filter: ["all", ["==", ["get", LEVEL], 1], ["match", ["get", ISO], small, true, false]],
        ...paint,
      });
  }
  const points = (entries) => ({
    type: "FeatureCollection",
    features: entries.map((e) => ({ type: "Feature", properties: { text: e.text }, geometry: { type: "Point", coordinates: e.seat } })),
  });
  const wordLayer = (id, entries, face, size, tracking, ink, halo, opacity) => ({
    id,
    type: "symbol",
    data: points(entries),
    layout: {
      "text-field": ["get", "text"],
      "text-font": [face],
      "text-size": size,
      "text-letter-spacing": tracking,
      "text-max-width": 100,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": ink, "text-halo-color": halo, "text-halo-width": 1.5, "text-opacity": 0 },
    bindings: { "text-opacity": opacity },
  });
  const studiedMatch = ["match", ["get", ISO], studied, 1, 0];
  // A ring drawn at a fixed piece of GROUND, as the SVG's r = 22 frame units was: its screen radius
  // doubles per zoom level, stated as one top-level interpolation (a zoom expression may not nest).
  const ringAt = (z) => (ringDegrees * 512 * 2 ** z) / 360;
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    oddSeat: odd.seat,
    warmSamples: 3,
    degreesPerPixel: 1,
    layers: [
      ...classLayers,
      {
        id: "missing",
        type: "fill",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", LEVEL], 0], ["match", ["get", ISO], missing.map((m) => m.iso2), true, false]],
        // NO COLOUR BEFORE THE CLASSES: the neutral of a country with no reading arrives with the first class
        // (owner, 2026-09-15: « on l'affiche qu'après, sinon ça fait bizarre »), and the filter leaves it.
        paint: { "fill-color": missingFill, "fill-opacity": 0 },
        bindings: { "fill-opacity": clamp(["*", { $state: "classes" }, classFills.length]) },
      },
      {
        id: "borders",
        type: "line",
        source: countries,
        sourceLayer: LAYER,
        filter: ["==", ["get", LEVEL], 0],
        paint: { "line-color": ["case", ["==", studiedMatch, 1], border.studied, border.other], "line-width": border.width },
      },
      wordLayer("water-names", waters, fonts.annot, fonts.annotSize, fonts.annotTracking, fonts.waterInk, tints.water, ["-", 1, travel]),
      {
        id: "odd-ring",
        type: "circle",
        data: points([odd]),
        paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, ringAt(0), 12, ringAt(12)],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": fonts.accentInk,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0,
        },
        bindings: { "circle-stroke-opacity": ["*", { $state: "odd" }, ["max", arrived, atRest]] },
      },
      wordLayer("top-names", words.top, fonts.axis, fonts.axisSize, fonts.axisTracking, fonts.topInk, fonts.topHalo, ["*", { $state: "top" }, atRest]),
      wordLayer("neighbour-names", neighbours, fonts.axis, fonts.axisSize, fonts.axisTracking, fonts.ink, tints.land, ["*", { $state: "odd" }, arrived]),
    ],
  };
}
