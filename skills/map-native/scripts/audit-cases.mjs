// Datasets the layout audit renders. `buildCases(sample)` returns
// [{ label, config }] — one entry per config variant. Beyond the
// shipped sample, two stress cases prove the layout holds for
// adversarial data: a world-wide spread with one dominant outlier,
// and a config that includes no-data regions.

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
