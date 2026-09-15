// THE PROPORTIONAL SYMBOL SCROLLY AS A MAP PLAN. Every mark inside the map is a MapLibre layer over the basemap's
// own land and sea: one hollow circle per station at its coordinates, and the largest station's name as a symbol
// layer. The scroll drives the camera and every paint through `$state` tokens (`shared/map-beat/scrolly.mjs`).
//
// "LARGEST FIRST" WITHOUT READING A FEATURE IN A BINDING. A binding that reads feature data makes MapLibre re-lay
// out the whole source on every scroll frame (`validateScrollyPlan` refuses it). So the stations are split into
// rank bands — the largest, 2–10, 11–100, 101 to the plate's cut, the cut to 1,000, the rest — and each band
// into nuclear and not, one layer and one GeoJSON source each. A band's opacity climbs as the count the reader
// has scrolled to passes through its ranks; every binding is a number of the state.
//
// THE RADIUS IS SET ONCE, AT MOUNT, AS ONE ZOOM INTERPOLATION: circle area ∝ capacity, and the screen radius of
// the largest station grows by 2^(GROWTH · Δzoom) — the SVG beat's gentle close-up growth, `(ppu ratio)^0.35`.
// `["exponential", 2^GROWTH]` between two stops is exactly that curve (`c · b^z` is affine in `b^z`), so the
// radius is true at every zoom a travel passes, and no frame sets it.

const GROWTH = 0.35;
const Z_LOW = 0;
const Z_HIGH = 16;
/** The SVG's floor on a station's radius, before its growth. */
const FLOOR_PX = 0.7;

const clamp = (x) => ["max", 0, ["min", 1, x]];
/** easeInOutQuad over a bound number: the curve the SVG driver eased the travel with. */
const ease = (t) => ["case", ["<", t, 0.5], ["*", 2, t, t], ["-", 1, ["/", ["^", ["+", ["*", -2, t], 2], 2], 2]]];

/** How many stations stand, largest first: `10^level`. */
export const count = ["^", 10, { $state: "level" }];
const subject = clamp({ $state: "subject" });
const travel = ease(clamp({ $state: "zoom" }));
/** The stroke the field is drawn with: thinner once more than a thousand stand, as the SVG drew it. */
const baseWidth = ["case", [">", count, 1000], 0.8, 1.3];

/** THE LARGEST STATION'S SCREEN RADIUS AT A ZOOM, in CSS px: `largestPx` at `anchorZoom`, grown by 2^(GROWTH · Δz). */
export const largestRadiusAt = (largestPx, anchorZoom, zoom) => largestPx * 2 ** (GROWTH * (zoom - anchorZoom));

/** A station's ring, its STROKE CENTRED on the radius its capacity's area gives it: MapLibre strokes a circle
 *  outside `circle-radius`, so the radius is taken in by half the stroke (`inset`). `r` is √(MW / largest MW). */
function radiusExpression(largestPx, anchorZoom, inset) {
  const at = (z) => ["max", 0.2, ["-", ["*", ["max", FLOOR_PX / largestPx, ["get", "r"]], largestRadiusAt(largestPx, anchorZoom, z)], inset]];
  return ["interpolate", ["exponential", 2 ** GROWTH], ["zoom"], Z_LOW, at(Z_LOW), Z_HIGH, at(Z_HIGH)];
}

export function proportionalPlan({ tints, bands, colours, fonts, largest, cameras, statesForCards, referenceWidth, referenceHeight, radius }) {
  const points = (stations) => ({
    type: "FeatureCollection",
    features: stations.map((s) => ({ type: "Feature", properties: { r: s.r }, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
  });
  // A band reached as the count passes its ranks: 0 before its first, 1 at its last.
  const reached = (band) => clamp(["/", ["-", count, band.from - 1], band.to - band.from + 1]);
  const ring = (inset) => radiusExpression(radius.largestPx, radius.anchorZoom, inset);
  const others = [];
  const halos = [];
  const nuclear = [];
  for (const band of bands) {
    if (band.others.length)
      others.push({
        id: `band-${band.from}-${band.to}`,
        type: "circle",
        data: points(band.others),
        paint: { "circle-radius": ring(0.65), "circle-opacity": 0, "circle-stroke-color": colours.circle, "circle-stroke-width": 1.3, "circle-stroke-opacity": 0 },
        // Every other station steps back while nuclear is isolated.
        bindings: { "circle-stroke-opacity": ["*", reached(band), ["-", 1, ["*", 0.8, subject]], 0.9], "circle-stroke-width": baseWidth },
      });
    if (band.nuclear.length) {
      // A nuclear site stands whatever its rank once nuclear is isolated.
      const shown = ["max", reached(band), subject];
      halos.push({
        id: `band-${band.from}-${band.to}-nuclear-halo`,
        type: "circle",
        data: points(band.nuclear),
        paint: { "circle-radius": ring(1.7), "circle-opacity": 0, "circle-stroke-color": tints.land, "circle-stroke-width": 3.4, "circle-stroke-opacity": 0 },
        bindings: { "circle-stroke-opacity": ["*", shown, subject] },
      });
      nuclear.push({
        id: `band-${band.from}-${band.to}-nuclear`,
        type: "circle",
        data: points(band.nuclear),
        paint: { "circle-radius": ring(0.65), "circle-opacity": 0, "circle-stroke-color": colours.circle, "circle-stroke-width": 1.3, "circle-stroke-opacity": 0 },
        // In the circle's hue among the others, in the ink when isolated.
        bindings: {
          "circle-stroke-opacity": shown,
          "circle-stroke-color": ["interpolate", ["linear"], subject, 0, colours.circle, 1, colours.subject],
          "circle-stroke-width": ["+", baseWidth, ["*", ["-", 1.8, baseWidth], subject]],
        },
      });
    }
  }
  // THE LARGEST STATION NAMED BESIDE ITS CIRCLE: to its west, clear of the stage's east edge on a phone, pushed out
  // by the circle's own radius at every zoom (a paint translate, so it follows the zoom continuously).
  const gap = 6;
  const nameOffset = (z) => ["literal", [-(largestRadiusAt(radius.largestPx, radius.anchorZoom, z) + gap), 0]];
  const name = {
    id: "largest-name",
    type: "symbol",
    data: points([{ lon: largest.lon, lat: largest.lat, r: 1 }]),
    layout: {
      "text-field": largest.text,
      "text-font": [fonts.annot],
      "text-size": fonts.annotSize,
      "text-letter-spacing": fonts.annotTracking,
      "text-anchor": "right",
      "text-max-width": 100,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": fonts.ink,
      "text-halo-color": tints.land,
      "text-halo-width": 2,
      "text-opacity": 0,
      "text-translate": ["interpolate", ["exponential", 2 ** GROWTH], ["zoom"], Z_LOW, nameOffset(Z_LOW), Z_HIGH, nameOffset(Z_HIGH)],
    },
    bindings: { "text-opacity": ["*", clamp({ $state: "largest" }), ["-", 1, travel]] },
  };
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${"__MAPTILER" + "_KEY__"}`,
    styleName: "dataviz",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    radius,
    warmSamples: 3,
    degreesPerPixel: 1,
    layers: [...others, ...halos, ...nuclear, name],
  };
}
