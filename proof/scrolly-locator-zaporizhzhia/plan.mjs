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
    features: entries.map((e) => ({ type: "Feature", properties: e.properties ?? {}, geometry: { type: "Point", coordinates: e.coords } })),
  });
  const wordLayer = (id, entries, layout, ink, halo, opacity) => ({
    id,
    type: "symbol",
    data: points(entries),
    layout: { "text-field": ["get", "text"], "text-allow-overlap": true, "text-ignore-placement": true, ...layout },
    paint: { "text-color": ink, "text-halo-color": halo, "text-halo-width": 1.5, "text-opacity": 0 },
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
        stations.filter((s) => !s.isSubject).map((s) => ({ coords: [s.lon, s.lat], text: s.label })),
        { "text-font": [fonts.axis], "text-size": fonts.axisSize, "text-offset": [0, 1.1], "text-anchor": "top" },
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
        { "text-font": [fonts.annot], "text-size": fonts.annotSize, "text-offset": [0, 1.4], "text-anchor": "top" },
        colours.accentInk,
        tints.land,
        { $state: "subject" },
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
