// THE LOCATOR SCROLLY AS A MAP PLAN. Every mark inside the map is a MapLibre layer over the basemap's own land and
// sea: Ukraine's fill and outline, its oblasts (MapTiler Countries, level 0 and level 1), the four largest stations
// and the subject's ring, all beat-drawn. The scroll drives the camera and every paint through `$state` tokens
// (`shared/map-beat/scrolly.mjs`).
//
// A LOCATOR CLOSES IN ON A POINT, so its choreography is not the proportional symbol's staggered field: the four
// stations arrive together (there are only four), the country steps forward, the camera travels once, and the
// station is ringed at the end — one gesture per card, not a field filling.
//
// PLACE NAMES ARE NOT BEAT LAYERS. MapTiler's own label layers ("Country labels", "City labels", the water name
// layers) already carry the three treatments the card needs — countries in capitals, settlements in lower case,
// water in italic — because that is how MapTiler's own dataviz style draws them. The plan only says which of those
// layers survive the trunk's sweep (`keepLabels`); the beat's own driver (`locator-drive.mjs`) filters them to the
// names this beat needs and drives their opacity. What the tiles cannot name — the station's own line (its capacity
// alongside its place name) and the Dnieper, which carries no water-name feature in this style — stays a beat layer.

export const LAYER = "administrative";
const KEY = "__MAPTILER" + "_KEY__";
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

const clamp = (x) => ["max", 0, ["min", 1, x]];

const NEAR_DEGREES = 2;
function valuesOf(stations) {
  return stations.map((s) => {
    const above = stations.some((o) => o !== s && o.lat < s.lat && s.lat - o.lat < NEAR_DEGREES && Math.abs(o.lon - s.lon) < NEAR_DEGREES);
    return { coords: [s.lon, s.lat], properties: { text: s.label, anchor: above ? "bottom" : "top", offset: [0, above ? -1.1 : 1.1] } };
  });
}

/** A CLOSE CAMERA THAT SEATS THE STATION BELOW THE CARD. The prose card is centred on the stage, so a camera
 *  centred on the station hid the ring and its label under the card that names them. `subject` and `places` are
 *  Web Mercator [x, y] (y south); the station lands at `seat` of the frame's height from the top, and the zoom eases
 *  out — never in — until every named place, with a margin, still fits above and below it. */
export function seatedCamera({ subject, places, zoom, reference, seat = 0.72, margin = 0.06 }) {
  const frameAt = (z) => reference.height / (512 * 2 ** z);
  const ys = places.map((p) => p[1]);
  const above = Math.max(0, subject[1] - Math.min(subject[1], ...ys));
  const below = Math.max(0, Math.max(subject[1], ...ys) - subject[1]);
  const needed = Math.max(above / (seat - margin), below / (1 - seat - margin));
  const fitted = needed > 0 ? Math.log2(reference.height / (needed * 512)) : zoom;
  const z = Math.min(zoom, fitted);
  const cy = subject[1] + (0.5 - seat) * frameAt(z);
  const lon = subject[0] * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI;
  return { center: [lon, lat], zoom: z };
}

export function locatorPlan({
  tints,
  subjectCountryIso,
  stations,
  subject,
  places,
  colours,
  fonts,
  cameras,
  statesForCards,
  referenceWidth,
  referenceHeight,
  radiusPx,
  subjectRadiusPx,
  placeDotPx,
}) {
  const points = (entries) => ({
    type: "FeatureCollection",
    // Kit patch: the proof's word layers hand `{ coords, text }` and this kept only `e.properties`, so every
    // word layer (the values, the subject's name, the river) drew nothing — live and in the card images.
    features: entries.map((e) => ({ type: "Feature", properties: e.properties ?? (e.text === undefined ? {} : { text: e.text }), geometry: { type: "Point", coordinates: e.coords } })),
  });
  const wordLayer = (id, entries, layout, ink, halo, opacity, haloWidth = 1.5) => ({
    id,
    type: "symbol",
    data: points(entries),
    layout: { "text-field": ["get", "text"], "text-allow-overlap": true, "text-ignore-placement": true, ...layout },
    paint: { "text-color": ink, "text-halo-color": halo, "text-halo-width": haloWidth, "text-opacity": 0 },
    bindings: { "text-opacity": opacity },
  });

  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    warmSamples: 3,
    degreesPerPixel: 1,
    // Survives the trunk's label sweep (`applyLiveStyle`): every native layer this beat filters and drives itself.
    keepLabels: ["^Country labels$", "^City labels$", "^Town labels$", "^Village labels$", "^Place labels$", "^State labels$", "^Sea labels$", "^Ocean labels$", "^Lakeline labels$"],
    layers: [
      {
        id: "ua-nodata",
        type: "fill",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], subjectCountryIso]],
        paint: { "fill-color": colours.unreported, "fill-opacity": 0 },
        bindings: { "fill-opacity": clamp({ $state: "country" }) },
      },
      {
        id: "ua-outline",
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", "level"], 0], ["==", ["get", "iso_a2"], subjectCountryIso]],
        paint: { "line-color": colours.accentMark, "line-width": 1.8, "line-opacity": 0 },
        bindings: { "line-opacity": clamp({ $state: "country" }) },
      },
      {
        id: "ua-oblasts",
        type: "line",
        beneath: "water",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", "level"], 1], ["==", ["get", "iso_a2"], subjectCountryIso]],
        paint: { "line-color": colours.regionLine, "line-width": 0.7, "line-dasharray": [3, 2], "line-opacity": 0 },
        // The oblasts come with the close-up: at the whole-map camera they would be a grey smear inside the country.
        bindings: { "line-opacity": clamp({ $state: "zoom" }) },
      },
      {
        id: "stations",
        type: "circle",
        data: points(stations.map((s) => ({ coords: [s.lon, s.lat], properties: { r: s.r } }))),
        // A CONSTANT SCREEN SIZE at every zoom, like the SVG's own (`r / ppu`): the four stations are only ever
        // seen at the whole-map camera, which never moves while they are visible, so a plain per-feature multiple
        // (no `["zoom"]`) is the honest expression — nothing here has to survive a zoom it is never drawn through.
        paint: { "circle-radius": ["max", 2.5, ["*", ["get", "r"], radiusPx]], "circle-color": colours.stationDot, "circle-opacity": 0 },
        bindings: { "circle-opacity": { $state: "tops" } },
      },
      wordLayer(
        "station-values",
        // A value goes BELOW its dot, unless another station sits just below it: then above, so two neighbours'
        // values never print one over the other (gx-locator scrolly, 2026-11-19: "5 460 MW" on "5 320 MW").
        valuesOf(stations.filter((s) => !s.isSubject)),
        { "text-font": [fonts.axis], "text-size": fonts.axisSize, "text-offset": ["get", "offset"], "text-anchor": ["get", "anchor"] },
        colours.inkOnLand,
        tints.land,
        { $state: "tops" },
      ),
      {
        id: "subject-ring",
        type: "circle",
        data: points([{ coords: [subject.lon, subject.lat] }]),
        paint: {
          "circle-radius": subjectRadiusPx.rest,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": colours.accentMark,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0,
        },
        bindings: {
          "circle-radius": ["interpolate", ["linear"], { $state: "subject" }, 0, subjectRadiusPx.rest, 1, subjectRadiusPx.named],
          "circle-stroke-opacity": ["max", { $state: "subject" }, { $state: "tops" }],
        },
      },
      wordLayer(
        "subject-name",
        [{ coords: [subject.lon, subject.lat], text: subject.label }],
        // One line: MapLibre's default 10-em wrap broke the name inside its number ("6 / 000 MW").
        // Set on the side of the station away from the river's word (mvq144: "Dniepr" sat under a name set below).
        { "text-font": [fonts.annot], "text-size": fonts.annotSize, ...(subject.riverAt?.[1] < subject.lat ? { "text-offset": [0, -1.4], "text-anchor": "bottom" } : { "text-offset": [0, 1.4], "text-anchor": "top" }), "text-max-width": 40 },
        // It sits on the country's grey fill, not the land: its ink is measured against that fill, and a land halo
        // wide enough to stand on (mvq144: the land-measured accent on a hairline halo read weakly).
        colours.nameInk,
        tints.land,
        { $state: "subject" },
        2.5,
      ),
      wordLayer(
        "dnieper",
        [{ coords: subject.riverAt, text: subject.riverLabel }],
        { "text-font": [fonts.waterFace], "text-size": fonts.waterSize },
        colours.waterInk,
        "rgba(0,0,0,0)",
        { $state: "places" },
      ),
      {
        id: "place-dots",
        type: "circle",
        // The dot next to a settlement's name: MapTiler's place labels carry no icon, so the mark — never the
        // word — is the beat's own (owner ruling, 2026-09-15: the tiles cannot draw what they do not have).
        data: points(places.map((p) => ({ coords: [p.lon, p.lat] }))),
        paint: { "circle-radius": placeDotPx, "circle-color": tints.land, "circle-stroke-color": colours.inkOnLand, "circle-stroke-width": 1.2, "circle-opacity": 0, "circle-stroke-opacity": 0 },
        bindings: { "circle-opacity": { $state: "places" }, "circle-stroke-opacity": { $state: "places" } },
      },
    ],
  };
}
