// RENAMED from `map-spec.mjs` on 2026-08-19. "Map" here was the verb — it MAPS editorial intent onto
// Datawrapper's metadata shape — and it never had anything to do with cartography. That was harmless
// until this skill gained a real map path — `test/map-treatments.test.ts` pins `d3-maps-choropleth`,
// `d3-maps-symbols` and `locator-map` reaching the delegated producer — at which point a file called
// `map-spec.mjs` beside genuine map work reads as the map producer, and is not one.
//
// Editorial intent in, Datawrapper metadata out — nothing else. There is no chart-type registry
// here: every function below runs the same way regardless of `spec.chartType` (`"d3-lines"`,
// `"d3-bars"`, whatever the editorial phase already chose). The Datawrapper-side field names
// (`source-name`, `custom-colors`, `range-annotations`, the annotation shapes themselves) are not
// invented here — they come straight from Datawrapper's own public TypeScript source and its
// default metadata literal. See `references/range-annotation-shape.md` for exactly which files and
// which independent cross-checks confirmed each one, and — the one thing that file is honest about
// not having — whether a live render in *this* environment actually drew the rule.

const TEXT_ANNOTATION_CONNECTOR_LINE_OFF = {
  enabled: false,
  type: "straight",
  circle: false,
  stroke: 1,
  arrowHead: "lines",
  circleStyle: "solid",
  circleRadius: 15,
  inheritColor: false,
  targetPadding: 4,
};

// The first column is the x/category axis and every remaining column is a value series. The first
// value series carries the single editorial accent today, but domains and uploaded data must cover
// every series: clipping or dropping a comparison series would change the selected treatment.
function columns(data) {
  const keys = Object.keys(data[0]);
  return { xKey: keys[0], yKey: keys[1], valueKeys: keys.slice(1) };
}

function domain(data, keys) {
  const selected = Array.isArray(keys) ? keys : [keys];
  const values = data
    .flatMap((row) => selected.map((key) => Number(row[key])))
    .filter(Number.isFinite);
  if (values.length === 0) throw new Error("a chart domain needs at least one numeric value");
  return [Math.min(...values), Math.max(...values)];
}

// Datawrapper reads a line's direct label straight off its CSV column header — send the header
// `co2Mt` and `co2Mt` is exactly what a reader sees printed on the chart. A raw field name is
// never an editorial label, so `buildChartPayload` never uses `yKey` on its own: it always goes
// through this resolver, and the CSV this skill uploads is rewritten to match (`renameValueColumn`,
// used by `produce.mjs`) so the two never disagree about what the series is called.
export function resolveSeriesLabel(spec) {
  if (spec.seriesLabel) return spec.seriesLabel;
  const { yKey } = columns(spec.data);
  return humanizeColumnName(yKey);
}

// The fallback when a caller gives no explicit `seriesLabel`: split camelCase/snake_case/kebab-case
// boundaries into words and title-case them. "co2Mt" -> "Co2 Mt", "annual_co2" -> "Annual Co2". Not
// beautiful — a caller who cares about the exact wording should pass `seriesLabel` — but never the
// bare identifier a reader would have to notice and fix by hand.
export function humanizeColumnName(key) {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

// The CSV this skill uploads has to carry the same column name the chart's own colour/label
// metadata refers to, or Datawrapper silently fails to match them. Only the value column is
// renamed — the x/category column is left alone.
export function renameValueColumn(data, seriesLabel) {
  const { yKey, valueKeys } = columns(data);
  if (yKey === seriesLabel) return data;
  if (valueKeys.includes(seriesLabel)) {
    throw new Error(`seriesLabel ${JSON.stringify(seriesLabel)} collides with another data column`);
  }
  return data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key === yKey ? seriesLabel : key, value]),
    ),
  );
}

// A bar/column mark encodes its value by LENGTH from a baseline, so the axis must keep zero in
// view — that is a real rule about the mark, not a per-type branch, and it is the same rule
// `chart-beat/references/static-discipline.md` already states ("zero is a rule about bars,
// not about lines"). Datawrapper's own type ids name the family directly (`d3-bars`,
// `column-chart`, `grouped-column-chart`, `stacked-column-chart`, ...), so this is one predicate
// on that name, not a table of per-type behaviour.
export function isBarEncoded(chartType) {
  return /bars|column/i.test(chartType);
}

const Y_RANGE_PAD = 0.08;

// A line/area/scatter mark encodes its value by POSITION, not length — anchoring it at zero (the
// Datawrapper default) compresses exactly the change the chart exists to show. This fits the axis
// to the data actually plotted, padded so the extremes aren't flush against the frame, and widened
// to include any y-axis range annotation's own value so a reference rule always lands inside the
// plot rather than at its floor or off it entirely.
export function computeYRange(spec, { pad = Y_RANGE_PAD } = {}) {
  const { valueKeys } = columns(spec.data);
  const values = spec.data
    .flatMap((row) => valueKeys.map((key) => Number(row[key])))
    .filter(Number.isFinite);
  for (const entry of spec.rangeAnnotations ?? []) {
    if ((entry.axis ?? "y") !== "y") continue;
    values.push(entry.value);
    if (entry.to !== undefined) values.push(entry.to);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) || 1;
  return [min - span * pad, max + span * pad];
}

// `id` is the caller's to choose (deterministic strings, not a random generator — this skill adds
// no id-generation dependency) so a repeat run against the same spec produces byte-identical
// metadata, which is exactly what makes a produce.mjs run reproducible and its tests stable.
export function buildTextAnnotation(entry, id) {
  const { x, y, text, ...style } = entry;
  const position = {};
  if (x !== undefined) position.x = x;
  if (y !== undefined) position.y = y;

  return {
    id,
    text,
    position,
    align: style.align ?? "tl",
    dx: style.dx ?? 0,
    dy: style.dy ?? 0,
    bg: style.bg ?? false,
    width: style.width ?? 20,
    bold: style.bold ?? false,
    italic: style.italic ?? false,
    underline: style.underline ?? false,
    color: style.color ?? false,
    size: style.size ?? 14,
    showMobile: true,
    showDesktop: true,
    mobileFallback: true,
    connectorLine: TEXT_ANNOTATION_CONNECTOR_LINE_OFF,
  };
}

// One editorial entry (`{ value, label }` — "the reader must see the curve come back under this
// level") expands into Datawrapper's two realities: the rule itself (`range-annotations`, which
// has no field to carry text at all) and its label (`text-annotations`, positioned at the rule's
// far edge on its own axis, just clear of the line). Both come from this one function so a beat
// never has to remember the pairing is required.
export function buildRangeAnnotation(entry, index, data, houseColor) {
  const { xKey, valueKeys } = columns(data);
  const axis = entry.axis ?? "y";
  const display = entry.display ?? (entry.to !== undefined ? "range" : "line");
  const color = entry.color ?? houseColor;
  const strokeWidth = entry.strokeWidth ?? 2;
  const strokeType = entry.strokeType ?? "solid";
  const opacity = display === "range" ? 20 : 100;

  let position;
  let labelPosition;
  if (axis === "y") {
    const [xMin, xMax] = domain(data, xKey);
    position = { x0: xMin, x1: xMax, y0: entry.value, y1: entry.to ?? entry.value };
    labelPosition = { x: xMax, y: entry.value };
  } else {
    const [yMin, yMax] = domain(data, valueKeys);
    position = { x0: entry.value, x1: entry.to ?? entry.value, y0: yMin, y1: yMax };
    labelPosition = { x: entry.value, y: yMax };
  }

  const rule = {
    id: `range-${index}`,
    position,
    display,
    type: axis,
    color,
    opacity,
    strokeWidth,
    strokeType,
  };

  const label = buildTextAnnotation(
    {
      x: labelPosition.x,
      y: labelPosition.y,
      text: entry.label,
      align: axis === "y" ? "br" : "tr",
      dy: axis === "y" ? -6 : 0,
      color,
    },
    `range-${index}-label`,
  );

  return { rule, label };
}

export function buildChartPayload(spec) {
  const seriesLabel = resolveSeriesLabel(spec);

  const textAnnotations = (spec.textAnnotations ?? []).map((entry, index) =>
    buildTextAnnotation(entry, `label-${index}`),
  );
  const rangeEntries = (spec.rangeAnnotations ?? []).map((entry, index) =>
    buildRangeAnnotation(entry, index, spec.data, spec.color),
  );

  const visualize = {
    "custom-colors": { [seriesLabel]: spec.color },
    "text-annotations": [...textAnnotations, ...rangeEntries.map((entry) => entry.label)],
    "range-annotations": rangeEntries.map((entry) => entry.rule),
  };
  // FINDING 6 (round-three stress), measured live against published chart `1u88u`: `custom-colors`
  // keyed by the resolved series label was sent and stored (`GET /v3/charts/1u88u` echoed it back
  // verbatim), and the published embed's bars still rendered in Datawrapper's own default blue.
  // Isolated live by PATCHing `base-color` and `custom-colors` to two DIFFERENT hex values on that
  // same chart and reading the exported PNG's own pixels back: a single-series bar/column chart is
  // painted from `visualize["base-color"]`, never from `custom-colors` — that key is what a
  // genuinely multi-series bar chart would need, and it is left in place because it costs nothing
  // to keep sending. This is not the plan-gated attribution limitation's shape — nothing here is
  // account-tier-gated, it is a field this producer never sent.
  if (isBarEncoded(spec.chartType)) {
    visualize["base-color"] = spec.color;
  } else {
    visualize["custom-range-y"] = computeYRange(spec).map(String);
  }

  return {
    title: spec.takeaway,
    type: spec.chartType,
    language: spec.language,
    metadata: {
      describe: {
        intro: spec.limits,
        "source-name": `${spec.credit}, ${spec.effectiveDate}`,
      },
      visualize,
      // Confirmed live (references/range-annotation-shape.md §4): this is the real field
      // (`chartTypes.ts`'s own `publish['force-attribution']`), and setting it false is correct on
      // every account. On a free/personal token it does not visibly remove the "Created with
      // Datawrapper" credit — that removal is plan-gated (Pro/Business/Enterprise) — but this is
      // still the one lever this project's code controls, and it costs nothing to set correctly.
      publish: { "force-attribution": false },
    },
  };
}
