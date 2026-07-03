// Narrative pattern classification for a choropleth value field.
//
// Defect #3: the map/scrolly story was ALWAYS framed as "the highest / the
// lowest" — a fixed max/min template. That is honest for a RANKING (a rate or a
// count), but it lies about a TEMPORAL field (e.g. the year same-sex marriage
// took effect per country): the real story there is the SEQUENCE / diffusion
// over time, not "high year vs low year".
//
// This classifier decides, deterministically, which honest narrative a value
// field deserves:
//   - "temporal"    → a year/date/ordinal step: tell the sequence (first → … →
//                     most recent), NEVER "highest/lowest".
//   - "magnitude"   → a rate/count/magnitude: keep the max/min ranking reveals.
//   - "categorical" → a discrete label with no order: falls back to ranking for
//                     now (noted; a dedicated pattern is future work).
//
// An explicit hint (config.valueKind, set by ②) wins. Otherwise we infer from
// the field name and the values. Default when unknown = "magnitude" so nothing
// regresses (current behaviour).

export type NarrativePattern = "temporal" | "magnitude" | "categorical";

// The explicit hint a config may carry (② sets it when routing a diffusion /
// temporal field to a map). Same string set as NarrativePattern.
export type ValueKind = NarrativePattern;

// Field names that name a point in time. Matched case-insensitively as a whole
// word / token so "year", "Year enacted", "date", "yr" all hit, but "layer" or
// "yearning" do not.
const TEMPORAL_NAME = /(^|[^a-z])(year|yr|date|datetime|timestamp)([^a-z]|$)/i;

// A plausible range for integer calendar years appearing as data values. Kept
// wide enough for historical data but tight enough that a rate/count (e.g. 0–100
// %, populations) never accidentally reads as "years".
const YEAR_MIN = 1000;
const YEAR_MAX = 2200;

function looksLikeYears(values: number[]): boolean {
  if (values.length === 0) return false;
  return values.every(
    (v) => Number.isInteger(v) && v >= YEAR_MIN && v <= YEAR_MAX,
  );
}

// Deterministic classification.
//   hint       — explicit config.valueKind ("temporal" | "magnitude" |
//                "categorical"); when present and valid it wins outright.
//   fieldName  — the value field name (config.valueField).
//   values     — the numeric values actually present (nulls already dropped).
export function classifyNarrativePattern(input: {
  hint?: string;
  fieldName?: string;
  values: number[];
}): NarrativePattern {
  const { hint, fieldName, values } = input;

  // 1. Explicit hint wins.
  if (hint === "temporal" || hint === "magnitude" || hint === "categorical")
    return hint;

  // 2. Infer temporal from the field name (year/date/…) OR from the values
  //    themselves looking like calendar years. A named-temporal field is
  //    temporal even if its integer values happen to fall outside the year
  //    range, because the name is the stronger signal.
  const namedTemporal = !!fieldName && TEMPORAL_NAME.test(fieldName);
  if (namedTemporal || looksLikeYears(values)) return "temporal";

  // 3. Default: magnitude (ranking). Preserves the pre-fix behaviour.
  return "magnitude";
}
