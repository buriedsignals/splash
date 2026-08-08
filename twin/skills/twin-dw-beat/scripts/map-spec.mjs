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

// The first column is the x/category axis, the second is the value series a chart's colour and a
// range annotation's off-axis span are read from. A beat with more than two columns (small
// multiples, several series) still gets a sensible single accent and a sensible span from this —
// widening it to a per-series colour map is a real future need, not a guess to make now (Files).
function columns(data) {
  const keys = Object.keys(data[0]);
  return { xKey: keys[0], yKey: keys[1] };
}

function domain(data, key) {
  const values = data.map((row) => Number(row[key]));
  return [Math.min(...values), Math.max(...values)];
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
  const { xKey, yKey } = columns(data);
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
    const [yMin, yMax] = domain(data, yKey);
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
  const { yKey } = columns(spec.data);

  const textAnnotations = (spec.textAnnotations ?? []).map((entry, index) =>
    buildTextAnnotation(entry, `label-${index}`),
  );
  const rangeEntries = (spec.rangeAnnotations ?? []).map((entry, index) =>
    buildRangeAnnotation(entry, index, spec.data, spec.color),
  );

  return {
    title: spec.takeaway,
    type: spec.chartType,
    language: spec.language,
    metadata: {
      describe: {
        intro: spec.limits,
        "source-name": `${spec.credit}, ${spec.effectiveDate}`,
      },
      visualize: {
        "custom-colors": { [yKey]: spec.color },
        "text-annotations": [...textAnnotations, ...rangeEntries.map((entry) => entry.label)],
        "range-annotations": rangeEntries.map((entry) => entry.rule),
      },
    },
  };
}
