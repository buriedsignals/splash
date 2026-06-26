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
  boxplot: "boxplot.json",
  bump: "bump.json",
  beeswarm: "beeswarm.json",
  treemap: "treemap.json",
  "diverging-stacked": "diverging-stacked.json",
  sankey: "sankey.json",
  streamgraph: "streamgraph.json",
  gantt: "gantt.json",
  fan: "fan.json",
  calendar: "calendar.json",
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
  calendar: (s) => {
    // a short ~10-week window (fewer columns → bigger cells) to stress the grid
    // centring and the colourbar at low column counts.
    const short = clone(s);
    short.days = s.days.slice(60, 130);
    return [["short-window", short]];
  },
  fan: (s) => {
    // 1000× the values (wide y-axis labels) to stress the left gutter + ticks.
    const big = clone(s);
    big.rows = big.rows.map((r) => {
      const o = { ...r };
      for (const k of Object.keys(o)) if (k !== s.xField) o[k] = o[k] * 1000;
      return o;
    });
    return [["big-values", big]];
  },
  gantt: (s) => {
    // long row labels + a very short span (must still render a visible bar) +
    // an extra row (tighter band).
    const long = clone(s);
    long.items = long.items.map((it) => ({
      ...it,
      label: `${it.label} (programme workstream)`,
    }));
    long.items.push({
      label: "Final inspection sign-off",
      start: "2028-02",
      end: "2028-03",
      category: "Handover",
    });
    return [["long+short", long]];
  },
  streamgraph: (s) => {
    // a 7th series + a spikier final step, to stress the wiggle baseline and the
    // in-band label threshold (thin bands must drop their label, not overflow).
    const more = clone(s);
    more.seriesFields = [...more.seriesFields, "Newsletters"];
    more.rows = more.rows.map((r, i) => ({ ...r, Newsletters: 1 + i * 2 }));
    return [["7-series", more]];
  },
  sankey: (s) => {
    // long node labels (stress the gutters) + an extra small source (tighter
    // stacking + a thin ribbon that must still be visible).
    const long = clone(s);
    long.nodes = long.nodes.map((n) => ({ ...n, label: `${n.label} supply` }));
    long.nodes.push({
      id: "biomass",
      label: "Biomass & waste-to-energy",
      column: 0,
      category: "Biomass",
    });
    long.rampNodes = [...(long.rampNodes ?? []), "Biomass"];
    long.links.push({ source: "biomass", target: "grid", value: 4 });
    // rebalance a use so totals still conserve (grid now 104 in / keep out=104)
    long.links.find((l) => l.target === "homes").value = 44;
    return [["long+extra", long]];
  },
  "diverging-stacked": (s) => {
    // long item labels (stress the gutter) + a heavily-negative row (the whole
    // bar pushed left, the percent axis must stretch that way).
    const long = clone(s);
    long.items = long.items.map((it) => ({
      ...it,
      label: `${it.label} in the borough`,
    }));
    long.items.push({
      label: "Street cleaning services overall",
      values: [40, 35, 12, 9, 4],
    });
    return [["long+neg", long]];
  },
  treemap: (s) => {
    // long labels + extra tiny items + one dominant cell — stress the in-cell
    // label truncation and the tiny-cell "no label" threshold.
    const long = clone(s);
    long.items = long.items.map((it) => ({
      ...it,
      label: `${it.label} & associated services`,
    }));
    long.items[0].value = 1800; // one cell dominates
    long.items.push(
      { label: "Coroner & registration", value: 8, category: "Corporate" },
      { label: "Trading standards", value: 6, category: "Corporate" },
      { label: "Allotments", value: 3, category: "Place" },
    );
    return [["long+tiny", long]];
  },
  beeswarm: (s) => {
    // a dense swarm (3× the points, clustered) to stress the dodge + the
    // fit-into-band scaling (dots must stay in bounds at every viewport).
    const dense = clone(s);
    const extra = [];
    for (let k = 0; k < s.points.length * 2; k++) {
      const base = s.points[k % s.points.length];
      extra.push({ value: base.value + (k % 3), category: base.category });
    }
    dense.points = [...s.points, ...extra];
    return [["dense", dense]];
  },
  bump: (s) => {
    // long item labels (stress the right gutter) + an 8th rank (taller grid).
    const long = clone(s);
    long.items = long.items.map((it) => ({
      ...it,
      label: `${it.label} & on-demand services`,
    }));
    long.items.push(
      { label: "Podcasts & audio", ranks: [6, 6, 6, 6] },
      { label: "Print & magazines", ranks: [7, 7, 7, 7] },
      { label: "Outdoor & billboards", ranks: [8, 8, 8, 8] },
    );
    return [["long+8ranks", long]];
  },
  boxplot: (s) => {
    // long category labels + a near-degenerate (tiny-spread) group + big values
    // with extra outliers, to stress the gutter, the median line, and the domain.
    const long = clone(s);
    long.categories = long.categories.map((c) => ({
      ...c,
      label: `${c.label} metropolitan travel zone`,
      values: c.values.map((v) => v * 10),
    }));
    long.categories.push({
      label: "Old town conservation district",
      values: [400, 401, 402, 402, 403, 404, 900],
    });
    return [["long+outliers", long]];
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
