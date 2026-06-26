// Datasets the layout audit renders. `buildCases(sample)` returns
// [{ type, label, config }]. Beyond the shipped sample, each type gets STRESS
// variants (long labels, many/few categories, extreme/equal/tiny values) so the
// audit proves the layout holds for arbitrary newsroom data, not just the sample.

const FILE = {
  line: "series.json",
  bar: "bars.json",
  scatter: "scatter.json",
  pie: "pie.json",
  stacked: "stacked.json",
  slope: "slope.json",
  grouped: "grouped.json",
  dumbbell: "dumbbell.json",
  "stacked-area": "stacked-area.json",
  heatmap: "heatmap.json",
  histogram: "histogram.json",
  diverging: "diverging-bar.json",
  waterfall: "waterfall.json",
  lollipop: "lollipop.json",
  pyramid: "population-pyramid.json",
  bullet: "bullet.json",
  "connected-scatter": "connected-scatter.json",
  marimekko: "marimekko.json",
  radar: "radar.json",
};

const LONG = "Manufacturing & logistics sector";
const clone = (o) => JSON.parse(JSON.stringify(o));

// per-type stress transforms; each returns extra cases for a given sample
const STRESS = {
  bar: (s) => {
    const long = clone(s);
    long.title = "A considerably longer headline that should wrap across several lines on a narrow phone screen without breaking";
    // distinct long labels (duplicate keys would collapse the band scale)
    long.rows = long.rows.map((r) => ({
      ...r,
      [s.catField]: `${r[s.catField]} manufacturing & logistics`,
    }));
    return [["long-labels", long]];
  },
  stacked: (s) => {
    const many = clone(s);
    many.seriesFields = ["Coal", "Gas", "Hydro", "Renewables", "Nuclear"];
    many.rows = many.rows.map((r) => ({ ...r, Nuclear: 8 }));
    return [["5-series", many]];
  },
  grouped: (s) => {
    const longCat = clone(s);
    longCat.rows = longCat.rows.map((r) => ({ ...r, [s.catField]: r[s.catField] + " metropolitan area" }));
    return [["long-cats", longCat]];
  },
  dumbbell: (s) => {
    const big = clone(s);
    big.rows = big.rows.map((r) => ({ ...r, [s.leftField]: r[s.leftField] * 100, [s.rightField]: r[s.rightField] * 100 }));
    return [["big-values", big]];
  },
  diverging: (s) => {
    const big = clone(s);
    big.rows = big.rows.map((r) => ({ ...r, [s.valField]: r[s.valField] * 1000 }));
    big.rows[0][s.catField] = LONG;
    return [["big+long", big]];
  },
  waterfall: (s) => {
    const tiny = clone(s);
    tiny.rows = [
      { label: "Opening", value: 1200, total: true },
      { label: "Grants", value: 600 },
      { label: "Fees", value: 5 },
      { label: "Salaries", value: -900 },
      { label: "Upkeep", value: -350 },
      { label: "Closing", value: 555, total: true },
    ];
    return [["tiny-step", tiny]];
  },
  lollipop: (s) => {
    const long = clone(s);
    long.rows = long.rows.map((r) => ({ ...r, [s.catField]: r[s.catField] + " district library" }));
    return [["long-cats", long]];
  },
  pyramid: (s) => {
    const big = clone(s);
    big.rows = big.rows.map((r) => ({ ...r, [s.leftField]: r[s.leftField] * 50, [s.rightField]: r[s.rightField] * 50 }));
    return [["big-values", big]];
  },
  histogram: (s) => {
    const wide = clone(s);
    wide.binWidth = 5;
    return [["narrow-bins", wide]];
  },
  marimekko: (s) => {
    const long = clone(s);
    long.columns = long.columns.map((c) => ({ ...c, label: c.label + " channel" }));
    return [["long-cols", long]];
  },
  bullet: (s) => {
    const long = clone(s);
    long.rows = long.rows.map((r) => ({ ...r, label: r.label + " performance indicator" }));
    return [["long-labels", long]];
  },
  "connected-scatter": (s) => {
    const big = clone(s);
    big.rows = big.rows.map((r) => ({ ...r, [s.xField]: r[s.xField] * 10 }));
    return [["big-x", big]];
  },
  radar: (s) => {
    // long axis labels + a 3rd series + an axis that hits a near-horizontal
    // spoke (the widest side-label case), to stress the rim gutter.
    const long = clone(s);
    long.axes = long.axes.map((a) => `${a} & wellbeing index`);
    long.series = [
      ...long.series,
      { label: "Parkview", values: long.axes.map((_, i) => (i % 2 ? 9 : 3)) },
    ];
    return [["long+3series", long]];
  },
};

export function buildCases(sample) {
  const cases = [];
  for (const [type, file] of Object.entries(FILE)) {
    const s = sample(file);
    cases.push({ type, label: "sample", config: s });
    for (const [label, cfg] of STRESS[type]?.(s) ?? [])
      cases.push({ type, label, config: cfg });
  }
  return cases;
}
