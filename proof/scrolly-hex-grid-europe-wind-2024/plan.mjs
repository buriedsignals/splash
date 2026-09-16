// SCAFFOLD: scaffolded --from proof/scrolly-hex-grid-europe-protection — this file is that beat's own code, renamed for this one. The
// header comment below, and every region marked SCAFFOLD:, describe proof/scrolly-hex-grid-europe-protection's own subject; rewrite them
// for this beat's. Read proof/scrolly-hex-grid-europe-protection/BRIEF.md alongside this code before changing the choreography.
// THE HEX GRID'S GEOGRAPHIC BACKDROP AS A MAP PLAN (addendum 2026-09-15 §5: a live map while the form shows
// geography, no basemap once it leaves it).
//
// UNLIKE THE CARTOGRAM, this beat's grid is "designed, not measured" (its own BRIEF, precision) — the hex cells
// never claim to sit at their country's exact position, on the map or off it. So the live map here is a plain,
// UNCHANGING backdrop: every host country the same neutral, Ukraine hollow and dashed, every border — never bound
// to the scroll at all. What the scroll owns is the hex layer entirely (`hex-drive.mjs`, unchanged): the map
// simply fades out under it as the grid leaves the map for the honeycomb ranking (`rank`), and fades back in as
// it returns (cards 5–6). One fixed camera throughout: moving it to chase the abstract grid's own "zoom" gesture
// would separate two coordinate spaces that were never the same one.

import { cameraFields, lonLatOf, mercatorOf } from "#shared/map-beat/scrolly.mjs";

const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
const SMALL_BELOW_Z4 = ["MT", "LI"];
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

/** The camera fitting a [west, south, east, north] window "meet" into a stage, centred. */
// SCAFFOLD: marks — the layers this function returns are proof/scrolly-hex-grid-europe-protection's own. Adapt the geometry, the
// bindings and the buckets for this beat's own subject; keep the $state contract (a binding must stay
// data-constant — validateScrollyPlan refuses one that reads a per-feature property).
export function fitCamera({ west, south, east, north }, stage) {
  const [x0, y1] = mercatorOf([west, south]);
  const [x1, y0] = mercatorOf([east, north]);
  const worldPx = Math.min(stage.width / (x1 - x0), stage.height / (y1 - y0));
  return cameraFields({ center: lonLatOf([(x0 + x1) / 2, (y0 + y1) / 2]), zoom: Math.log2(worldPx / 512) });
}

/** ISO 3166-1 alpha-2 for every code the grid places (hosts + Ukraine). */
const ISO2 = {
  ISL: "IS", NOR: "NO", SWE: "SE", FIN: "FI", IRL: "IE", DNK: "DK", EST: "EE", LVA: "LV", NLD: "NL", DEU: "DE",
  POL: "PL", LTU: "LT", UKR: "UA", BEL: "BE", LUX: "LU", CHE: "CH", CZE: "CZ", SVK: "SK", HUN: "HU", ROU: "RO",
  PRT: "PT", ESP: "ES", FRA: "FR", LIE: "LI", AUT: "AT", SVN: "SI", HRV: "HR", BGR: "BG", MLT: "MT", ITA: "IT",
  GRC: "GR", CYP: "CY", GBR: "GB", TUR: "TR", RUS: "RU", SRB: "RS", BIH: "BA", MNE: "ME", MKD: "MK", MDA: "MD",
  BLR: "BY", ALB: "AL",
};
export const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};

const byLevel0 = (codes) => ["all", ["==", ["get", LEVEL], 0], ["match", ["get", ISO], codes, true, false]];
const byLevel1 = (codes) => ["all", ["==", ["get", LEVEL], 1], ["match", ["get", ISO], codes, true, false]];

/**
 * @param {{ hosts: string[], origin: string, colours: { sea: string, land: string, neutral: string,
 *   originFill: string, originEdge: string, border: string }, strokes: { border: number }, camera: any,
 *   referenceWidth: number, referenceHeight: number }} input
 */
export function hexMapPlan({ hosts, origin = null, colours, strokes, camera, referenceWidth, referenceHeight }) {
  const codes = hosts.map(iso2Of);
  const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
  const originCode = origin ? iso2Of(origin) : null;
  const fillLayer = (id, list, colour, maxzoom) => ({
    id,
    type: "fill",
    beneath: "water",
    source: countries,
    sourceLayer: LAYER,
    ...(maxzoom ? { maxzoom } : {}),
    filter: maxzoom ? byLevel1(list) : byLevel0(list),
    paint: { "fill-color": colour, "fill-opacity": 1 },
  });
  const layers = [
    fillLayer("hosts", codes, colours.neutral),
    ...(small.length ? [fillLayer("hosts-small", small, colours.neutral, 4)] : []),
    // ADAPTED: no origin country in this subject — every reporting country is a "host", so the dashed hollow-country
    // layer (a device for a country that is a source, not itself measured) is skipped when `origin` is null.
    ...(originCode ? [fillLayer("origin", [originCode], colours.originFill)] : []),
    ...(originCode
      ? [{
          id: "origin-edge",
          type: "line",
          beneath: "water",
          source: countries,
          sourceLayer: LAYER,
          filter: byLevel0([originCode]),
          layout: { "line-join": "round" },
          paint: { "line-color": colours.originEdge, "line-width": strokes.border * 1.6, "line-dasharray": [3, 2] },
        }]
      : []),
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
  ];
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    tints: { water: colours.sea, land: colours.land },
    cameras: [camera],
    statesForCards: [{ ...camera }],
    referenceWidth,
    referenceHeight,
    warmSamples: 0,
    degreesPerPixel: 1,
    layers,
  };
}
