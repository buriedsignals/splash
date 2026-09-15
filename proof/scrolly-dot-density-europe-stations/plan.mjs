// THE DOT DENSITY SCROLLY AS A MAP PLAN. Every station is a MapLibre circle layer over the basemap's own land and
// sea, bucketed by FUEL (not by rank: a dot density fills a field fuel by fuel, it does not stage a magnitude
// largest-first). Each bucket carries TWO layers — a tiny constant-screen-size dot ("count") and one whose radius
// is its capacity's area ("weight") — and the `weight` state cross-fades between them, so no bound paint ever
// reads a feature (`circle-radius` on a per-feature expression is set once, in `paint`, never in `bindings`; only
// `circle-opacity`, a plain number, is bound).
//
// AT A WEIGHT, THE SUBJECT IS THE FILL, NOT A RING (owner, 2026-09-15, reworking the first live pass: a black
// outline was lost once discs of up to ~110px fused into one mass). Nuclear draws solid in the accent; every
// other station a pale tint of it, so solar/wind visibly become dust beside the nuclear discs. Discs are capped
// well under the field's own fused-mass size (`weightLargestPx`, ~35-40px at the reference stage) and every
// weight layer is added LARGEST-BUCKET-FIRST, so a big disc never sits over a small one. A thin stroke in the
// page's own ground colour separates two overlapping discs with a gap, never a black outline.

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
    // LARGEST FIRST WITHIN THE LAYER TOO: a GeoJSON source draws its features in array order, so the biggest
    // disc is laid down before the small ones that would otherwise disappear under it.
    features: [...stations]
      .sort((a, b) => b.r - a.r)
      .map((s) => ({ type: "Feature", properties: { r: s.r }, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
  });
  const weightRadius = ["max", 0.6, ["*", ["get", "r"], weightLargestPx]];
  const stepBack = ["-", 1, { $state: "fade" }];

  const countLayers = [];
  // Every group's own WEIGHT layer, not yet ordered — sorted by descending max radius below so the group
  // holding the biggest discs is added (and so drawn) first.
  const weightGroups = [];
  buckets.forEach((bucket, i) => {
    const reached = reachedOf(i, buckets.length);
    countLayers.push({
      id: `count-${bucket.fuel}`,
      type: "circle",
      data: points(bucket.stations),
      // EVERY STATION DOT IS ONE TREATMENT: filled, no stroke, fully opaque. Density comes from the RADIUS
      // (`countRadius`, chosen small), not from opacity.
      paint: { "circle-radius": countRadius, "circle-color": colours.dot, "circle-opacity": 0 },
      bindings: { "circle-opacity": ["*", reached, ["-", 1, { $state: "weight" }], stepBack] },
    });
    weightGroups.push({
      maxR: Math.max(0, ...bucket.stations.map((s) => s.r)),
      layer: {
        id: `weight-${bucket.fuel}`,
        type: "circle",
        data: points(bucket.stations),
        // ORDINARY STATIONS ARE A PALE TINT OF THE ACCENT AT A WEIGHT — dust beside the nuclear discs, never the
        // dot's own strong colour: a field of solid strong discs is exactly the fused mass the owner rejected.
        paint: {
          "circle-radius": weightRadius,
          "circle-color": colours.paleFill,
          "circle-stroke-color": colours.strokeGround,
          "circle-stroke-width": 0.7,
          "circle-opacity": 0,
          "circle-stroke-opacity": 0,
        },
        bindings: { "circle-opacity": ["*", reached, { $state: "weight" }, stepBack], "circle-stroke-opacity": ["*", reached, { $state: "weight" }, stepBack] },
      },
    });
  });
  weightGroups.push({
    maxR: Math.max(0, ...nuclear.map((s) => s.r)),
    layer: {
      id: "weight-nuclear",
      type: "circle",
      data: points(nuclear),
      // THE SUBJECT'S OWN TREATMENT: solid, in the accent — the fill itself carries the distinction now, not a
      // ring lost once discs fuse (owner, 2026-09-15).
      paint: {
        "circle-radius": weightRadius,
        "circle-color": colours.dot,
        "circle-stroke-color": colours.strokeGround,
        "circle-stroke-width": 0.7,
        "circle-opacity": 0,
        "circle-stroke-opacity": 0,
      },
      bindings: { "circle-opacity": ["*", { $state: "subject" }, { $state: "weight" }], "circle-stroke-opacity": ["*", { $state: "subject" }, { $state: "weight" }] },
    },
  });
  const weightLayers = weightGroups.sort((a, b) => b.maxR - a.maxR).map((g) => g.layer);

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
    // WEIGHT LAYERS FIRST (largest-max group first, so every one of them sits UNDER the count layers and under
    // the nuclear ring below), then the count-mode dots, then the subject's count-mode ring — the three groups
    // never overlap in when they are visible (`weight`, `1 - weight`), so their relative order inside each
    // group is what matters, not across groups.
    layers: [
      ...weightLayers,
      ...countLayers,
      {
        id: "count-nuclear",
        type: "circle",
        data: points(nuclear),
        paint: { "circle-radius": countRadius, "circle-color": colours.dot, "circle-opacity": 0 },
        bindings: { "circle-opacity": ["*", { $state: "subject" }, ["-", 1, { $state: "weight" }]] },
      },
      // THE RING IS THE SUBJECT'S OWN TREATMENT AT A COUNT ONLY (kept as before): the ink, thin.
      {
        id: "ring-nuclear-count",
        type: "circle",
        data: points(nuclear),
        paint: { "circle-radius": 4, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": colours.ring, "circle-stroke-width": 1, "circle-stroke-opacity": 0 },
        bindings: { "circle-stroke-opacity": ["*", { $state: "subject" }, ["-", 1, { $state: "weight" }]] },
      },
    ],
  };
}
