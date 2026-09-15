// THE FLOW MAP SCROLLY AS A MAP PLAN — matching the validated video beat's visual treatment
// (`proof/video-flow-map-ukraine-protection` on `quality/video`, owner 2026-09-15: « comme dans la vidéo »).
//
// The camera never moves (the static beat's own box: the origin and the ten drawn hosts, padded). Each drawn
// band is its own GeoJSON `line` layer, its bowed arc sampled once in Bun at that fixed camera and taken back
// to lon/lat; its opacity is a DATA-CONSTANT expression of the card-interpolated `bands` field (rank `i` arrives
// once `bands` passes `i + 1`) — `validateScrollyPlan` only refuses a binding that reads FEATURE data, and this
// reads only state. THE TRACE ITSELF is not a binding: a `line-gradient` reads `line-progress`, which
// `validateScrollyPlan` refuses. `flow-drive.mjs` cuts each band's arc at its own drawn share (`arcAt`, ported
// from the video's `scene.mjs`) and hands it to the band's source on every frame.
//
// Host and origin NAMES are drawn by the beat, in French, as HTML labels positioned by the live map's own
// projection each frame (`flow-drive.mjs`) — not MapTiler's native place labels, which serve English/local
// names, and not MapLibre symbol layers, which cannot bold a name on the `pair` card without a second style
// layer. The simplest faithful solution (noted in the report).

const clamp = (v) => ["max", 0, ["min", 1, v]];
/** How far the drawn band of rank `i` (0 = largest) has arrived, in the card-interpolated `bands` field. */
const arrivedOf = (i) => clamp(["-", { $state: "bands" }, i]);
/** The top two hosts' own colour, richer once `pair` names them together — a literal `case` on the state, read
 *  by MapLibre itself, never a feature. */
const pairedColour = (subject, plain) => ["case", [">", { $state: "pair" }, 0.5], subject, plain];

const lineFC = (coordinates) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }] });
const pointFC = (points) => ({ type: "FeatureCollection", features: points.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } })) });

/**
 * @param {{ tints: any, colours: any, camera: any, cameras: any[], statesForCards: any[], referenceWidth: number,
 *   referenceHeight: number, node: { seat: number[], r: number }, bands: Array<{ code: string, name: string,
 *   people: number, top: boolean, coordinates: number[][], cumulative: number[], width: number }>,
 *   seatDots: Array<{ code: string, seat: number[], top: boolean }>, others: number[][], dotR: number,
 *   othersR: number, hairline: number }} input
 */
export function flowMapPlan({ tints, colours, cameras, statesForCards, referenceWidth, referenceHeight, node, bands, seatDots, others, dotR, othersR, hairline }) {
  const bandLayers = bands.map((b, i) => ({
    id: `band-${b.code}`,
    type: "line",
    data: lineFC(b.coordinates),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": colours.band, "line-width": b.width, "line-opacity": 0 },
    bindings: b.top ? { "line-opacity": arrivedOf(i), "line-color": pairedColour(colours.subjectBand, colours.band) } : { "line-opacity": arrivedOf(i) },
  }));
  const seatLayers = seatDots.map((s, i) => ({
    id: `seat-${s.code}`,
    type: "circle",
    data: pointFC([s.seat]),
    paint: { "circle-radius": dotR, "circle-color": colours.band, "circle-stroke-color": colours.land, "circle-stroke-width": hairline, "circle-opacity": 0, "circle-stroke-opacity": 0 },
    bindings: s.top
      ? { "circle-opacity": arrivedOf(i), "circle-stroke-opacity": arrivedOf(i), "circle-color": pairedColour(colours.subjectBand, colours.band) }
      : { "circle-opacity": arrivedOf(i), "circle-stroke-opacity": arrivedOf(i) },
  }));
  const nodeLayer = {
    id: "node",
    type: "circle",
    data: pointFC([node.seat]),
    paint: { "circle-radius": node.r - hairline, "circle-color": colours.land, "circle-stroke-color": colours.node, "circle-stroke-width": hairline * 2, "circle-opacity": 1, "circle-stroke-opacity": 1 },
  };
  const othersLayer = {
    id: "others",
    type: "circle",
    data: pointFC(others),
    paint: { "circle-radius": othersR, "circle-color": colours.band, "circle-opacity": 0 },
    bindings: { "circle-opacity": { $state: "others" } },
  };
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${"__MAPTILER" + "_KEY__"}`,
    styleName: "dataviz",
    tints: { water: tints.water, land: tints.land },
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    warmSamples: 3,
    degreesPerPixel: 1,
    node,
    bands: bands.map(({ code, name, people, top, coordinates, cumulative, seatLonLat }) => ({ code, name, people, top, coordinates, cumulative, seat: seatLonLat })),
    layers: [nodeLayer, ...bandLayers, ...seatLayers, othersLayer],
  };
}
