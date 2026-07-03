// Datasets the layout audit renders.
//
// `buildCases(sample)` — choropleth cases. Returns [{ label, config }], one
// entry per config variant. Beyond the shipped sample, two stress cases prove
// the layout holds for adversarial data: a world-wide spread with one dominant
// outlier, and a config that includes no-data regions.
//
// `buildLocatorCases(sample)` — locator cases. Returns [{ label, config }]
// using the locator-many sample as base. Two stress cases exercise dense
// category labelling and a no-category single-style map.

const clone = (o) => JSON.parse(JSON.stringify(o));

export function buildCases(sample) {
  const cases = [];

  // 1. Sample — the committed choropleth.json (8 European countries)
  cases.push({ label: "sample", config: sample });

  // 2. Stress: world spread + dominant outlier (Norway at 99 vs most at 10–20)
  //    Also adds non-European countries to verify the basemap fits to DATA extent
  //    (must not show the whole globe — the rendered bounds should stay near Europe).
  const worldStress = clone(sample);
  worldStress.title =
    "Global renewable electricity share — dominant outlier stress test";
  worldStress.rows = [
    // European cluster (the story region)
    { code: "NOR", share: 99 },
    { code: "SWE", share: 68 },
    { code: "DEU", share: 59 },
    { code: "FRA", share: 27 },
    { code: "ESP", share: 44 },
    { code: "ITA", share: 41 },
    { code: "POL", share: 21 },
    { code: "GBR", share: 48 },
    // A few non-European points to widen the extent (but still not the whole globe)
    { code: "MAR", share: 14 }, // Morocco — south of Europe
    { code: "TUN", share: 11 }, // Tunisia
    { code: "TUR", share: 32 }, // Turkey — east
  ];
  cases.push({ label: "world-dominant-outlier", config: worldStress });

  // 3. Stress: no-data regions — all but 3 countries have no data.
  //    Layout must render the legend + title without crashing, and the
  //    basemap should fit just the 3 data countries.
  const noDataStress = clone(sample);
  noDataStress.title =
    "Sparse data — legend and basemap fit with only 3 data countries";
  noDataStress.rows = [
    { code: "DEU", share: 59 },
    { code: "FRA", share: 27 },
    { code: "ESP", share: 44 },
  ];
  cases.push({ label: "no-data-regions", config: noDataStress });

  return cases;
}

// ---------------------------------------------------------------------------
// Dot-density cases
// ---------------------------------------------------------------------------

export function buildDotDensityCases(sample) {
  const cases = [];

  // 1. Sample — the committed dot-density-multi.json (9 European countries, 3 energy categories)
  cases.push({ label: "dot-density-sample", config: sample });

  // 2. Stress: univariate — drop the categories array to exercise the monochrome / single-field
  //    path and verify the legend renders "1 dot = N units" without a colour swatch.
  const univariate = clone(sample);
  univariate.title =
    "Total electricity generation per country — univariate dot density";
  univariate.description =
    "Aggregate generation (all sources) in 2023. Each dot represents a fixed number of TWh.";
  delete univariate.categories;
  univariate.valueField = "coal"; // arbitrary single field for the stress pass
  cases.push({ label: "dot-density-univariate", config: univariate });

  // 3. Stress: high-value outlier (Germany coal × 10) — auto dotValue must still hit the
  //    readable target; the cap guard must fire if the total overshoots ~10 000 dots.
  const outlier = clone(sample);
  outlier.title =
    "European power mix — dominant-outlier dotValue stress test";
  outlier.rows = sample.rows.map((r) =>
    r.iso_a3 === "DEU" ? { ...r, coal: r.coal * 10 } : r
  );
  cases.push({ label: "dot-density-dominant-outlier", config: outlier });

  return cases;
}

// ---------------------------------------------------------------------------
// Hex-grid cases
// ---------------------------------------------------------------------------

export function buildHexGridCases(sample) {
  const cases = [];

  // 1. Sample — the committed hex-grid-count.json (road-traffic incidents across Britain)
  cases.push({ label: "hex-grid-sample", config: sample });

  // 2. Stress: square bins — exercises the squareGrid path and verifies the legend
  //    still renders with the correct aggregate label and BLUES scale.
  const squareBins = clone(sample);
  squareBins.title = "Road-traffic incident clusters — square-bin variant";
  squareBins.description =
    "Same dataset as the sample, rendered with square spatial bins instead of hexagons.";
  squareBins.binShape = "square";
  cases.push({ label: "hex-grid-square-bins", config: squareBins });

  // 3. Stress: sparse cluster — only the London points (lat < 52), to verify the
  //    basemap fits a small geographic extent and the auto cell-size does not produce
  //    a grid with zero populated cells.
  const londonOnly = clone(sample);
  londonOnly.title = "London road-traffic incident density — sparse cluster";
  londonOnly.description =
    "Only Greater London incidents — tests basemap-fit on a small geographic extent.";
  londonOnly.points = sample.points.filter((p) => p.lat < 52 && p.lon > -1.1);
  cases.push({ label: "hex-grid-sparse-cluster", config: londonOnly });

  return cases;
}

// ---------------------------------------------------------------------------
// Cartogram cases
// ---------------------------------------------------------------------------

export function buildCartogramCases(scaledSample, gridSample) {
  const cases = [];

  // 1. Sample — the committed cartogram-scaled.json (18 Eurasian emitters, CO₂ Mt)
  cases.push({ label: "cartogram-scaled-sample", config: scaledSample });

  // 2. Sample — the committed cartogram-grid.json (18 European countries, renewable %)
  cases.push({ label: "cartogram-grid-sample", config: gridSample });

  // 3. Stress: grid with diverging scale — exercises the diverging bin path and
  //    verifies the uniform-cell invariant holds with a non-default scaleType.
  const divergingGrid = clone(gridSample);
  divergingGrid.title =
    "European renewable share vs 50% target — diverging grid cartogram";
  divergingGrid.description =
    "Same dataset as the grid sample, rendered with a diverging colour scale centred on 50%.";
  divergingGrid.scaleType = "diverging";
  cases.push({ label: "cartogram-grid-diverging", config: divergingGrid });

  return cases;
}

// ---------------------------------------------------------------------------
// Locator cases
// ---------------------------------------------------------------------------

export function buildLocatorCases(sample) {
  const cases = [];

  // 1. Sample — the committed locator-many.json (40 European landmark sites, 4 categories)
  cases.push({ label: "locator-sample", config: sample });

  // 2. Stress: dot style with no categories — exercises the no-legend path and
  //    verifies the basemap fits to the data extent without a category legend panel.
  const noCategory = clone(sample);
  noCategory.title = "European landmark sites — uncategorised dot map";
  noCategory.description =
    "Same 40 sites without category encoding — no colour legend, plain dots.";
  noCategory.markerStyle = "dot";
  noCategory.markers = sample.markers.map(({ category: _cat, ...rest }) => rest);
  cases.push({ label: "locator-no-categories", config: noCategory });

  // 3. Stress: pin style with a reduced high-priority-only set (6 sites) — verifies the
  //    basemap fits a sparse set and labels do not collide at low density.
  const sparse = clone(sample);
  sparse.title = "Six landmark sites — sparse pin map";
  sparse.description = "Only the highest-priority sites across Europe.";
  sparse.markerStyle = "pin";
  sparse.markers = sample.markers
    .filter((m) => (m.priority ?? 0) >= 3)
    .slice(0, 6);
  cases.push({ label: "locator-sparse-pins", config: sparse });

  return cases;
}
