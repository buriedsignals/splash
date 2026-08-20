// twin/skills/intake/scripts/profile.mjs

// A plain decimal literal: optional sign, digits, optional exponent.
// Deliberately narrower than Number() — Number("0x10") is 16 and Number("Infinity")
// is a finite check away from slipping through; a blank/whitespace value never matches.
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

// A number a human wrote with US/UK thousands grouping: groups of exactly three
// digits separated by commas, with an optional decimal tail. "1,234.5" matches;
// "1,23" and "12,3456" (wrong grouping) do not, so they fall through to text —
// Number() is never trusted before this regex either.
const THOUSANDS_RE = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

function isNumeric(v) {
  return NUMERIC_RE.test(v) && Number.isFinite(Number(v));
}

function isThousandsShaped(v) {
  return THOUSANDS_RE.test(v);
}

function stripThousands(v) {
  return v.replace(/,/g, "");
}

// A unit riding along with a plain number, either trailing ("12 %") or leading ("$100"). The
// numeric core is deliberately the SAME shape NUMERIC_RE accepts — this never widens what counts
// as a number, only what is allowed to sit next to one. "0x1F" is not caught by either: the
// trailing form leaves "x1F" as the "unit", which contains a digit and so is not `[^\d\s]+`; the
// leading form requires the value to START with the unit, but "0x1F" starts with a digit.
const UNIT_SUFFIX_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*([^\d\s]+)$/;
const UNIT_PREFIX_RE = /^([^\d\s+-]+)\s*([+-]?(?:\d+\.?\d*|\.\d+))$/;

function splitUnit(v) {
  const suffix = v.match(UNIT_SUFFIX_RE);
  if (suffix) return { core: suffix[1], unit: suffix[2], raw: v };
  const prefix = v.match(UNIT_PREFIX_RE);
  if (prefix) return { core: prefix[2], unit: prefix[1], raw: v };
  return null;
}

// Decides a column's type AND, when a numeric-looking column is rejected, WHY —
// a profiler that rejects a column in silence is the defect this exists to close.
// It never guesses: "1,234" alone could be one thousand two hundred thirty-four
// or a decimal comma. Only a value that pairs a comma with a LATER decimal point
// (e.g. "1,234.5") settles the column, because that ordering never reverses —
// nobody writes a decimal comma followed by a thousands-grouped period.
function typeOf(values) {
  const present = values.filter((v) => v !== "");
  if (present.length === 0) return { type: "text" };
  if (present.every(isNumeric)) return { type: "number" };
  if (present.every((v) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v))) return { type: "date" };

  // A trailing or leading unit is READ — and recorded on the column, so a downstream axis can
  // label itself — only when EVERY present value carries the exact same unit and its core reads
  // as a plain number; anything less uniform (a differing unit, or a unit on only some of the
  // values) is refused as text, but never silently: this is the same class of defect as the
  // thousands-vs-decimal-comma ambiguity above, one step further out, and it gets the same
  // discipline — a reason is always recorded when a column looked numeric and was refused.
  const unitParses = present.map(splitUnit);
  if (unitParses.some((p) => p !== null)) {
    const allUnit = unitParses.every((p) => p !== null && isNumeric(p.core));
    if (allUnit) {
      const distinctUnits = new Set(unitParses.map((p) => p.unit));
      if (distinctUnits.size === 1) return { type: "number", unit: unitParses[0].unit };
      const differing = unitParses.find((p) => p.unit !== unitParses[0].unit);
      return {
        type: "text",
        reason: `looked numeric but the unit is not the same throughout the column ("${unitParses[0].raw}" vs "${differing.raw}") — nothing in the column says which unit is right`,
      };
    }
    const withUnit = unitParses.find((p) => p !== null);
    const without = present[unitParses.findIndex((p) => p === null)];
    return {
      type: "text",
      reason: `looked numeric but only some values carry a unit ("${withUnit.raw}" has one, "${without}" does not) — nothing settles whether the whole column is in that unit`,
    };
  }

  const numericLooking = present.filter((v) => isNumeric(v) || isThousandsShaped(v));
  if (numericLooking.length === 0) return { type: "text" };

  if (numericLooking.length === present.length) {
    const thousandsShaped = present.filter((v) => !isNumeric(v));
    const settled = thousandsShaped.some((v) => v.includes("."));
    if (settled) return { type: "number" };
    return {
      type: "text",
      reason: `looked numeric but "${thousandsShaped[0]}" is ambiguous — could be thousands-grouped or a decimal comma, and nothing else in the column settles it`,
    };
  }

  const offender = present.find((v) => !isNumeric(v) && !isThousandsShaped(v));
  return {
    type: "text",
    reason: `looked numeric but "${offender}" is not, so the column stays text`,
  };
}

// A column reports its gaps only when it plausibly IS a sequence, where skipping a step is
// itself information — a calendar year is one; a price, a percentage, a headcount are not,
// because any two rows in those columns can legitimately sit any distance apart, and reporting
// "gaps" there would just be inventing a step size nobody claimed. The test is the column's own
// IDENTITY, not its statistics: a name that reads as a year/date/année, or (name-agnostic, for a
// column like "year" with no better name at hand) an integer range that only a calendar year
// would plausibly sit in — the exact heuristic storyboard's ground-claim.mjs already uses to find
// the year column for its own checks (`findYearColumn`), reused here rather than invented twice.
// `date`-typed columns qualify too, but only when every value is a plain four-digit year: this
// profiler's `date` type also accepts "YYYY-MM" and "YYYY-MM-DD", and a mixed-granularity column
// has no single well-defined step, so it is left unflagged rather than guessed at.
const SEQUENCE_NAME_RE = /year|date|ann[ée]e/i;

function isSequenceColumn(name, type, sequenceValues) {
  if (sequenceValues.length < 2) return false;
  if (type === "date") return true; // sequenceValues is already restricted to plain years — see below
  if (type !== "number") return false;
  if (!sequenceValues.every(Number.isInteger)) return false;
  if (SEQUENCE_NAME_RE.test(name)) return true;
  return sequenceValues.every((n) => n >= 1500 && n <= 2100);
}

// Which points the sequence's own grain skips, between its lowest and highest value. The grain is
// the SMALLEST step actually observed between two consecutive distinct values — never assumed to
// be 1 — so a column paced every 5 years with nothing missing is not flagged just for not
// counting by one; only a step that column itself establishes can be reported as broken.
// Reporting only: this never repairs, fills or interpolates a missing value.
function findGaps(sequenceValues) {
  const distinct = [...new Set(sequenceValues)].sort((a, b) => a - b);
  if (distinct.length < 2) return [];
  let step = Infinity;
  for (let i = 1; i < distinct.length; i++) step = Math.min(step, distinct[i] - distinct[i - 1]);
  if (!Number.isFinite(step) || step <= 0) return [];
  const present = new Set(distinct);
  const gaps = [];
  for (let v = distinct[0]; v <= distinct[distinct.length - 1]; v += step) {
    if (!present.has(v)) gaps.push(v);
  }
  return gaps;
}

// A row is duplicated when it repeats another row's DATA byte-for-byte —
// reported, never removed: the journalist decides what a repeated row means.
function findDuplicateRows(body) {
  const groups = new Map();
  body.forEach((row, index) => {
    const key = JSON.stringify(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  const rows = [];
  for (const indices of groups.values()) {
    if (indices.length > 1) {
      rows.push({ values: [...body[indices[0]]], indices, occurrences: indices.length });
    }
  }
  return { count: rows.length, rows };
}

export function profileTable(rows) {
  const [rawHeader = [], ...body] = rows;
  // A header name is metadata, not data — trim it. A value's own leading or
  // trailing space stays exactly as written; the journalist's data is not ours
  // to rewrite (e.g. "Netherlands, the" as a value must round-trip untouched).
  const header = rawHeader.map((name) => name.trim());
  const columns = header.map((name, index) => {
    const values = body.map((row) => (row[index] ?? "").trim());
    const { type, reason, unit } = typeOf(values);
    const present = values.filter((v) => v !== "");
    const numbers =
      type === "number"
        ? present.map((v) => Number(unit ? splitUnit(v).core : stripThousands(v)))
        : [];
    // Only a plain four-digit year reads unambiguously as one step of a date column's sequence —
    // see isSequenceColumn's header for why "YYYY-MM"/"YYYY-MM-DD" are left out here.
    const sequenceValues =
      type === "number" ? numbers : type === "date" && present.every((v) => /^\d{4}$/.test(v)) ? present.map(Number) : [];
    const gaps = isSequenceColumn(name, type, sequenceValues) ? findGaps(sequenceValues) : null;
    return {
      name,
      type,
      ...(reason ? { reason } : {}),
      ...(unit ? { unit } : {}),
      missing: values.filter((v) => v === "").length,
      distinct: new Set(values.filter((v) => v !== "")).size,
      min: numbers.length ? Math.min(...numbers) : null,
      max: numbers.length ? Math.max(...numbers) : null,
      // The column total, beside its range. A takeaway citing a part-to-whole total ("34 million
      // tonnes" against rows of 14, 11 and 9) cites a number that is by construction OUTSIDE the
      // range of the column it sums, so without this the only check that can see it reads it as a
      // number the data refutes — which is exactly what it did (storyboard's ground-claim.mjs).
      sum: numbers.length ? numbers.reduce((a, b) => a + b, 0) : null,
      // Which values a sequence-like column's own grain skips — see isSequenceColumn/findGaps.
      // `null` for any column where "gaps" is not a meaningful question, not merely an unanswered one.
      gaps,
    };
  });
  return { rowCount: body.length, columns, duplicates: findDuplicateRows(body) };
}
