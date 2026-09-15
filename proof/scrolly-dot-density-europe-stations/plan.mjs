// THE DOT DENSITY SCROLLY AS A MAP PLAN. Every station is a MapLibre circle layer over the basemap's own land and
// sea, bucketed by FUEL (not by rank: a dot density fills a field fuel by fuel, it does not stage a magnitude
// largest-first). Each bucket carries TWO layers — a tiny constant-screen-size dot ("count") and one whose radius
// is its capacity's area ("weight") — and the `weight` state cross-fades between them, so no bound paint ever
// reads a feature (`circle-radius` on a per-feature expression is set once, in `paint`, never in `bindings`; only
// `circle-opacity`, a plain number, is bound). The nuclear bucket additionally carries a ring, hollow at a count
// and outlining the fill at a weight, per the static plate's own rule.

const clamp = (x) => ["max", 0, ["min", 1, x]];

/** How far bucket `i` of `n` has arrived, in `arrive` (0..1): equal slices, most numerous first, the whole
 *  reveal landing inside the single card-1-to-card-2 transition — the technical floor's staggered fill, applied
 *  to fuel order rather than to rank. */
function reachedOf(i, n) {
  return clamp(["-", ["*", { $state: "arrive" }, n], i]);
}

export function dotDensityPlan({ tints, buckets, nuclear, colours, cameras, statesForCards, referenceWidth, referenceHeight, countRadius, weightLargestPx }) {
  const points = (stations) => ({
    type: "FeatureCollection",
    features: stations.map((s) => ({ type: "Feature", properties: { r: s.r }, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
  });
  const weightRadius = ["max", 0.6, ["*", ["get", "r"], weightLargestPx]];
  const layers = [];
  buckets.forEach((bucket, i) => {
    const reached = reachedOf(i, buckets.length);
    // Every ordinary dot steps back once the nuclear sites are isolated (`fade`), in both its modes.
    const stepBack = ["-", 1, { $state: "fade" }];
    layers.push({
      id: `count-${bucket.fuel}`,
      type: "circle",
      data: points(bucket.stations),
      paint: { "circle-radius": countRadius, "circle-color": colours.dot, "circle-opacity": 0 },
      bindings: { "circle-opacity": ["*", reached, ["-", 1, { $state: "weight" }], stepBack] },
    });
    layers.push({
      id: `weight-${bucket.fuel}`,
      type: "circle",
      data: points(bucket.stations),
      // AN ORDINARY DOT STAYS THE SAME COLOUR AT A WEIGHT AS AT A COUNT — no second, weaker neutral: a colour
      // diluted toward the land to look "faint" reads as mud once it sits ON the land (measured, owner 2026-09-15:
      // a grey at 3.09:1 against land, barely over the mark floor and easily lost under overlapping circles).
      paint: { "circle-radius": weightRadius, "circle-color": colours.dot, "circle-opacity": 0 },
      bindings: { "circle-opacity": ["*", reached, { $state: "weight" }, stepBack] },
    });
  });
  layers.push({
    id: "count-nuclear",
    type: "circle",
    data: points(nuclear),
    paint: { "circle-radius": countRadius, "circle-color": colours.dot, "circle-opacity": 0 },
    bindings: { "circle-opacity": ["*", { $state: "subject" }, ["-", 1, { $state: "weight" }]] },
  });
  layers.push({
    id: "weight-nuclear",
    type: "circle",
    // THE FAINT FILL UNDER THE SUBJECT'S RING IS THE RING'S OWN STRONG COLOUR AT LOW ALPHA, never a colour
    // pre-diluted toward the land: diluting the hex first is what turned the ordinary dots' weight-fill to mud
    // (see `weight-${fuel}`, above); alpha keeps the hue legible while still reading as "faint" under the ring.
    data: points(nuclear),
    paint: { "circle-radius": weightRadius, "circle-color": colours.ring, "circle-opacity": 0 },
    bindings: { "circle-opacity": ["*", { $state: "subject" }, { $state: "weight" }, 0.4] },
  });
  layers.push({
    id: "ring-nuclear-count",
    type: "circle",
    data: points(nuclear),
    paint: { "circle-radius": 4, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": colours.ring, "circle-stroke-width": 1.4, "circle-stroke-opacity": 0 },
    bindings: { "circle-stroke-opacity": ["*", { $state: "subject" }, ["-", 1, { $state: "weight" }]] },
  });
  layers.push({
    id: "ring-nuclear-weight",
    type: "circle",
    data: points(nuclear),
    paint: { "circle-radius": weightRadius, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": colours.ring, "circle-stroke-width": 1.4, "circle-stroke-opacity": 0 },
    bindings: { "circle-stroke-opacity": ["*", { $state: "subject" }, { $state: "weight" }] },
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
    buckets: buckets.map((b) => ({ fuel: b.fuel, n: b.stations.length })),
    layers,
  };
}
