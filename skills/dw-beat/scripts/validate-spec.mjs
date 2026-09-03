// Fails loud on the first sign of drift between what a beat sends and what this producer actually
// reads — an unknown field is never silently ignored, because a silently-ignored field is exactly
// how a journalist's caveat or a house colour goes missing from a published chart without anyone
// noticing until they look at the render (and by then it's shipped).

const REQUIRED = ["takeaway", "limits", "credit", "effectiveDate", "language", "color", "chartType", "data", "format"];
// `markSize` is the ONE parameter added back where the styling came out (#47). A scatter's marks
// published at r = 2.5px — near-invisible at reading size — and nothing in the spec could change it,
// while six fields governed whether a caption was underlined. Mark size decides whether the data can
// be READ; that is an information-design decision and it is the trade this spec was getting wrong.
//
// `labelColumn` is deliberately NOT here. It would be per-chart-type, and the case that wanted it —
// a scatter of named places labelling itself — cannot reach this provider at all now that Scatter is
// unmapped (#44). Adding a field for a path nothing can take is how a thin spec stops being thin.
const OPTIONAL = ["textAnnotations", "rangeAnnotations", "seriesLabel", "markSize"];
const ALLOWED = new Set([...REQUIRED, ...OPTIONAL]);

// POSITION AND CONTENT, and nothing else — issue #47. This set carried six pure decorations
// (`bold`, `italic`, `underline`, `color`, `size`, `bg`) and, meanwhile, the spec had no way to say
// how big a mark should be. On a real published chart the journalist's own review note was "label
// positions are bad, marker sizes are too small": the spec could address neither, and the surface it
// did spend went on whether a caption is underlined.
//
// One house convention governs how an annotation LOOKS, the way the native path derives its
// furniture from the ground rather than asking per beat. An annotation that needs a different weight
// from every other annotation in the newsroom is a sign the chart is doing too much.
const TEXT_ANNOTATION_FIELDS = new Set([
  "x", "y", "text", "align", "dx", "dy", "width",
]);
const RANGE_ANNOTATION_FIELDS = new Set([
  "value", "label", "axis", "to", "color", "display", "strokeWidth", "strokeType",
]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ALIGNS = new Set(["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"]);
const STROKE_WIDTHS = new Set([1, 2, 3]);
const STROKE_TYPES = new Set(["solid", "dotted", "dashed"]);

function unknownKeys(obj, allowed) {
  return Object.keys(obj).filter((key) => !allowed.has(key));
}

function checkTextAnnotation(entry, index, errors) {
  const bad = unknownKeys(entry, TEXT_ANNOTATION_FIELDS);
  if (bad.length > 0) errors.push(`textAnnotations[${index}]: unknown field(s) ${bad.join(", ")}`);
  if (!entry.text) errors.push(`textAnnotations[${index}]: text is required`);
  if (entry.x === undefined && entry.y === undefined) {
    errors.push(`textAnnotations[${index}]: at least one of x or y is required`);
  }
  if (entry.align !== undefined && !ALIGNS.has(entry.align)) {
    errors.push(`textAnnotations[${index}]: align must be one of ${[...ALIGNS].join(", ")}`);
  }
}

function checkRangeAnnotation(entry, index, errors) {
  const bad = unknownKeys(entry, RANGE_ANNOTATION_FIELDS);
  if (bad.length > 0) errors.push(`rangeAnnotations[${index}]: unknown field(s) ${bad.join(", ")}`);
  if (typeof entry.value !== "number" || Number.isNaN(entry.value)) {
    errors.push(`rangeAnnotations[${index}]: value is required and must be a number`);
  }
  if (!entry.label) errors.push(`rangeAnnotations[${index}]: label is required — a rule with no label is not readable (references/range-annotation-shape.md)`);
  if (entry.axis !== undefined && entry.axis !== "x" && entry.axis !== "y") {
    errors.push(`rangeAnnotations[${index}]: axis must be "x" or "y"`);
  }
  if (entry.display !== undefined && entry.display !== "line" && entry.display !== "range") {
    errors.push(`rangeAnnotations[${index}]: display must be "line" or "range"`);
  }
  if (entry.to !== undefined && typeof entry.to !== "number") {
    errors.push(`rangeAnnotations[${index}]: to must be a number`);
  }
  if (entry.strokeWidth !== undefined && !STROKE_WIDTHS.has(entry.strokeWidth)) {
    errors.push(`rangeAnnotations[${index}]: strokeWidth must be 1, 2 or 3`);
  }
  if (entry.strokeType !== undefined && !STROKE_TYPES.has(entry.strokeType)) {
    errors.push(`rangeAnnotations[${index}]: strokeType must be one of ${[...STROKE_TYPES].join(", ")}`);
  }
}

// Throws a single Error carrying every problem found, not just the first — a beat re-running this
// after a fix should see everything wrong at once, not one field at a time.
// Datawrapper chart families whose marks take their colour from a data COLUMN rather than from the
// series label `custom-colors` is keyed by. One predicate on the type name, in the shape
// `isBarEncoded` already uses — not a per-type registry, which this skill deliberately does not have.
const COLOURED_BY_COLUMN = /scatter|bubble/i;

/** Measured off the defect: a published chart drew r = 2.5. Four is the smallest that reads. */
const MIN_MARK_SIZE = 4;

export function validateChartSpec(spec) {
  const errors = [];

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("ChartSpec must be an object");
  }

  const bad = unknownKeys(spec, ALLOWED);
  if (bad.length > 0) errors.push(`unknown field(s): ${bad.join(", ")}`);

  if (spec?.markSize !== undefined) {
    const size = spec.markSize;
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      errors.push("markSize must be a positive number of pixels");
    } else if (size < MIN_MARK_SIZE) {
      // The floor is the defect that produced this field: 2.5px marks on a published chart, which
      // the journalist read as "marker sizes are too small". A spec may go bigger; it may not
      // reproduce the thing that was wrong.
      errors.push(
        `markSize ${size} is under the ${MIN_MARK_SIZE}px floor — a mark smaller than this is not ` +
          `readable at publication size, which is the defect this field exists to prevent`,
      );
    }
  }

  // REFUSE A CHART THIS SPEC CANNOT COLOUR — issue #44. `ChartSpec` is line/bar-shaped: `color`
  // becomes `visualize["custom-colors"]` keyed by the resolved SERIES LABEL, which is how
  // Datawrapper colours a line or a bar. It colours a scatter by a COLUMN, so on a scatter that key
  // is written, accepted, and silently ignored — measured on a published chart, eight marks
  // rendered in Datawrapper's default blue while the newsroom's own accent sat unused in the
  // metadata. That is `palette`'s own stated defect class ("a newsroom's identity was collected and
  // then never used") reappearing at the provider boundary after being fixed on the native path.
  //
  // `Scatter (and bubble)` is unmapped in `datawrapper-chart-types.json` for this reason, so a
  // scatter should not reach here at all. This is the second line: a refusal BEFORE the first
  // network call, which is this skill's own stated discipline, rather than a chart that publishes
  // and looks plausible.
  if (COLOURED_BY_COLUMN.test(String(spec?.chartType ?? "")) && spec?.color) {
    errors.push(
      `chartType ${JSON.stringify(spec.chartType)} is coloured by a COLUMN, not by a series ` +
        `label, so this spec's \`color\` cannot reach its marks — Datawrapper would accept the ` +
        `key and ignore it, and the chart would publish in its default blue. \`color\` is required ` +
        `here and cannot be honoured there, so this treatment is not one this skill can produce: ` +
        `it is left unmapped in datawrapper-chart-types.json and belongs on the native path.`,
    );
  }

  for (const field of REQUIRED) {
    if (spec[field] === undefined || spec[field] === null || spec[field] === "") {
      errors.push(`${field} is required`);
    }
  }

  if (spec.format !== undefined && spec.format !== "static" && spec.format !== "web") {
    errors.push('format must be canonical Splash "static" or "web" — one pinned format per element');
  }

  if (spec.color !== undefined && !HEX_COLOR.test(spec.color)) {
    errors.push(`color must be a 6-digit hex string like "#0B7A75", got ${JSON.stringify(spec.color)}`);
  }

  if (spec.chartType !== undefined && (typeof spec.chartType !== "string" || spec.chartType.length === 0)) {
    errors.push("chartType must be a non-empty string — the raw Datawrapper type id, e.g. \"d3-lines\"");
  }

  if (spec.seriesLabel !== undefined && (typeof spec.seriesLabel !== "string" || spec.seriesLabel.length === 0)) {
    errors.push("seriesLabel must be a non-empty string when given");
  }

  if (spec.data !== undefined) {
    if (!Array.isArray(spec.data) || spec.data.length === 0) {
      errors.push("data must be a non-empty array of rows");
    } else {
      const keys = Object.keys(spec.data[0] ?? {});
      if (keys.length < 2) {
        errors.push("data rows need at least two columns (an x column and a value column)");
      }
    }
  }

  if (spec.textAnnotations !== undefined) {
    if (!Array.isArray(spec.textAnnotations)) errors.push("textAnnotations must be an array");
    else spec.textAnnotations.forEach((entry, index) => checkTextAnnotation(entry, index, errors));
  }

  if (spec.rangeAnnotations !== undefined) {
    if (!Array.isArray(spec.rangeAnnotations)) errors.push("rangeAnnotations must be an array");
    else spec.rangeAnnotations.forEach((entry, index) => checkRangeAnnotation(entry, index, errors));
  }

  if (errors.length > 0) {
    throw new Error(`ChartSpec is invalid:\n- ${errors.join("\n- ")}`);
  }

  return spec;
}
