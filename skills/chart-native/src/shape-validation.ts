// The fail-loud structural gate: before a mapper runs, assert the CSV actually fits
// the type's declared shape (native-types.ts). A mismatch throws a labeled error
// naming expected-vs-got, so a bad CSV can never silently mis-render. These are
// STRUCTURAL floors (can this even be drawn as this type); design maxima (≤3 series,
// ≤5 slices, baseline-0) are enforced later by the produce-time conformance guard.
import { NATIVE_TYPES, type NativeShape } from "./native-types";
import type { ParsedCsv } from "./csv";

export class ShapeMismatchError extends Error {
  constructor(id: string, shape: NativeShape, got: string) {
    super(`shape-validation: "${id}" expects a ${shape} CSV — ${got}`);
    this.name = "ShapeMismatchError";
  }
}

function seriesColumns(parsed: ParsedCsv): string[] {
  // numeric columns that are NOT the first (category/x) column
  const [first] = parsed.columns;
  return parsed.numericColumns.filter((c) => c !== first);
}

export function validateShape(id: string, parsed: ParsedCsv): void {
  const entry = NATIVE_TYPES.find((e) => e.id === id);
  if (!entry) return; // unknown ids are the mapper's concern (UnsupportedNativeType)
  const { shape } = entry;
  const nCols = parsed.columns.length;
  const nNum = parsed.numericColumns.length;

  // `fan` is declared "wide" but its convention is SPARSE-by-design (history
  // rows populate `actual` and leave the forecast columns blank; forecast rows
  // are the mirror) — `parsed.numericColumns` only counts columns that are
  // numeric on EVERY row, so a realistic fan CSV always has zero "series"
  // columns by that measure. Check the magic header names directly instead of
  // the generic wide/numeric-density rule.
  if (id === "fan") {
    const xField = parsed.columns[0];
    if (!parsed.numericColumns.includes(xField))
      throw new ShapeMismatchError(
        id,
        shape,
        `first column "${xField}" is not numeric — fan requires a numeric time axis in the first column`,
      );
    const headers = parsed.columns.slice(1);
    const loLevels = headers
      .map((c) => /^lo(\d+)$/.exec(c)?.[1])
      .filter(
        (n): n is string => n !== undefined && headers.includes(`hi${n}`),
      );
    // checkFanConformance (conformance.ts) requires levels.length >= 2 — mirror
    // that floor here so a 1-band fan fails fast at shape-validation instead of
    // dead-ending at produce.
    if (!headers.includes("central") || loLevels.length < 2)
      throw new ShapeMismatchError(
        id,
        shape,
        `got columns [${parsed.columns.join(",")}] — fan needs a "central" column plus ≥2 matched lo{n}/hi{n} confidence-band pairs`,
      );
    return;
  }

  switch (shape) {
    case "single":
      if (nCols < 2 || nNum < 1)
        throw new ShapeMismatchError(
          id,
          shape,
          `got ${nCols} columns / ${nNum} numeric (need ≥2 columns, ≥1 numeric value)`,
        );
      return;
    case "paired":
      if (nNum < 2)
        throw new ShapeMismatchError(
          id,
          shape,
          `got ${nNum} numeric columns (need ≥2 for the x/y or start/end pair)`,
        );
      return;
    case "wide":
      if (seriesColumns(parsed).length < 2)
        throw new ShapeMismatchError(
          id,
          shape,
          `got ${seriesColumns(parsed).length} numeric series after the category column (need ≥2)`,
        );
      return;
    case "distribution":
      if (nNum < 1)
        throw new ShapeMismatchError(
          id,
          shape,
          `got 0 numeric columns (need ≥1 column of raw values)`,
        );
      return;
    case "structural":
      // structural types are deferred (never in MAPPERS) — validateShape is not called for them
      return;
  }
}
