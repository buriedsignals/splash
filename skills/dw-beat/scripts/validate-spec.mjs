// Fails loud on the first sign of drift between what a beat sends and what this producer actually
// reads — an unknown field is never silently ignored, because a silently-ignored field is exactly
// how a journalist's caveat or a house colour goes missing from a published chart without anyone
// noticing until they look at the render (and by then it's shipped).

const REQUIRED = ["takeaway", "limits", "credit", "effectiveDate", "language", "color", "chartType", "data", "format"];
const OPTIONAL = ["textAnnotations", "rangeAnnotations", "seriesLabel"];
const ALLOWED = new Set([...REQUIRED, ...OPTIONAL]);

const TEXT_ANNOTATION_FIELDS = new Set([
  "x", "y", "text", "bold", "italic", "underline", "color", "size", "align", "dx", "dy", "bg", "width",
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
export function validateChartSpec(spec) {
  const errors = [];

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("ChartSpec must be an object");
  }

  const bad = unknownKeys(spec, ALLOWED);
  if (bad.length > 0) errors.push(`unknown field(s): ${bad.join(", ")}`);

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
