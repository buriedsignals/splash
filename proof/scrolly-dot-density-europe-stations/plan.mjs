// THE DOT DENSITY SCROLLY AS A MAP PLAN — matching the validated video beat's visual treatment exactly
// (`proof/video-dot-density-europe-stations` on `quality/video`, owner 2026-09-15: « comme dans la vidéo »).
//
// Every bound paint is DATA-CONSTANT (`validateScrollyPlan`): MapLibre relays out a source whenever a
// data-driven paint changes, so a dot's growth into its weight is not one `["get", …]` radius per fuel. Stations
// are split by fuel and by the radius they grow to — one layer per (fuel, size bucket), each bucket's radius the
// root of its members' mean square (its drawn area is exactly theirs), no member differing from it by more than
// `BUCKET_PX` or `BUCKET_REL` of it. A SINGLE layer per bucket carries the whole journey: its radius grows
// continuously from the count-mode dot to the bucket's weight radius, bound to `weight`, the area carried
// linearly (`sqrt((1-w)·r0² + w·r1²)`) — there is no separate "count" and "weight" layer to cross-fade between.
// Nuclear draws last (on top) and additionally carries a ring that swells to hug the grown disc, its stroke
// thinning as it grows.

const clamp = (x) => ["max", 0, ["min", 1, x]];
/** A stepped-back station keeps this much of its ink, never zero — the video's own floor. */
const STEPPED_BACK = 0.18;
export const BUCKET_PX = 0.25;
export const BUCKET_REL = 0.04;

/** How far bucket `i` of `n` fuels has arrived, in `arrive` (0..1): equal slices, most numerous first. */
function reachedOf(i, n) {
  return clamp(["-", ["*", { $state: "arrive" }, n], i]);
}

/** THE SIZE BUCKETS OF ONE FUEL, largest first (a small station is never left under a large one within its own
 *  fuel). `stations` carry `w`, the radius at full weight, in px. Ported from the video's `map-plan.mjs`. */
export function bucketsOf(stations) {
  const sorted = [...stations].sort((a, b) => a.w - b.w);
  const out = [];
  let open = null;
  for (const s of sorted) {
    if (!open || s.w > open.from + Math.max(BUCKET_PX, BUCKET_REL * open.from)) {
      open = { from: s.w, members: [] };
      out.push(open);
    }
    open.members.push(s);
  }
  return out.map(({ members }) => ({ r1: Math.sqrt(members.reduce((a, s) => a + s.w * s.w, 0) / members.length), members })).reverse();
}

const points = (members) => ({
  type: "FeatureCollection",
  features: members.map((s) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
});
/** A dot's radius at the frame's weight: its area travels from the dot's to the bucket's, linearly. */
const grownRadius = (r0, r1) => ["sqrt", ["+", ["*", ["-", 1, { $state: "weight" }], r0 * r0], ["*", { $state: "weight" }, r1 * r1]]];

export function dotDensityPlan({ tints, fuels, stations, nuclear, colours, cameras, statesForCards, referenceWidth, referenceHeight, dotR, ringR, hairline, ringStroke }) {
  const layers = [];
  const rings = [];
  fuels.forEach((fuel, i) => {
    const reached = reachedOf(i, fuels.length);
    // Every ordinary dot steps back once the nuclear sites are isolated, but never to nothing — the video's
    // own floor, so the field is still legible as "everything else" rather than gone.
    const stepped = ["-", 1, ["*", 1 - STEPPED_BACK, { $state: "fade" }]];
    const shown = ["*", reached, stepped];
    // The fill lightens as the dots grow (the outline below is what separates them once they are large);
    // the outline itself only switches on once growth has started.
    const fill = ["*", shown, ["-", 1, ["*", 0.45, { $state: "weight" }]]];
    const edge = ["case", [">", { $state: "weight" }, 0], shown, 0];
    bucketsOf(stations[fuel]).forEach(({ r1, members }, b) => {
      layers.push({
        id: `dot-${fuel}-${b}`,
        type: "circle",
        data: points(members),
        paint: { "circle-color": colours.dot, "circle-radius": dotR, "circle-opacity": 0, "circle-stroke-color": colours.land, "circle-stroke-width": hairline, "circle-stroke-opacity": 0 },
        bindings: { "circle-radius": grownRadius(dotR, r1), "circle-opacity": fill, "circle-stroke-opacity": edge },
      });
    });
  });
  // NUCLEAR DRAWS LAST, ON TOP: the subject, never stepped back, its own fill and its ring — ported from the
  // video's own layer order (fuels in arrival order, the subject last).
  const nFill = ["*", { $state: "subject" }, ["-", 1, ["*", 0.45, { $state: "weight" }]]];
  const nEdge = ["case", [">", { $state: "weight" }, 0], { $state: "subject" }, 0];
  bucketsOf(nuclear).forEach(({ r1, members }, b) => {
    const data = points(members);
    layers.push({
      id: `dot-nuclear-${b}`,
      type: "circle",
      data,
      paint: { "circle-color": colours.subject, "circle-radius": dotR, "circle-opacity": 0, "circle-stroke-color": colours.land, "circle-stroke-width": hairline, "circle-stroke-opacity": 0 },
      bindings: { "circle-radius": grownRadius(dotR, r1), "circle-opacity": nFill, "circle-stroke-opacity": nEdge },
    });
    // THE RING SWELLS TO HUG THE GROWN DISC as it grows, its stroke thinning — MapLibre strokes OUTSIDE the
    // radius, so the ring's own radius is the swollen radius less half the (thinning) stroke.
    const grown = grownRadius(dotR, r1);
    const halfStroke = ["*", ringStroke / 2, ["-", 1, ["*", 0.4, { $state: "weight" }]]];
    rings.push({
      id: `ring-nuclear-${b}`,
      type: "circle",
      data,
      paint: { "circle-color": "rgba(0,0,0,0)", "circle-radius": ringR - ringStroke / 2, "circle-stroke-color": colours.subject, "circle-stroke-width": ringStroke, "circle-stroke-opacity": 0 },
      bindings: {
        "circle-radius": ["max", 0, ["-", ["max", ["*", ringR, ["-", 1, { $state: "weight" }]], grown], halfStroke]],
        "circle-stroke-width": ["*", ringStroke, ["-", 1, ["*", 0.4, { $state: "weight" }]]],
        "circle-stroke-opacity": { $state: "subject" },
      },
    });
  });

  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${"__MAPTILER" + "_KEY__"}`,
    styleName: "dataviz",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    warmSamples: 3,
    degreesPerPixel: 1,
    buckets: fuels.map((fuel) => ({ fuel, n: stations[fuel].length })),
    layers: [...layers, ...rings],
  };
}
