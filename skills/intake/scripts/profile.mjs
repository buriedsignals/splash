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

/**
 * Reads ONE already-isolated numeral token the way this project always reads a number: a
 * thousands-grouped integer ("14,205") is fine, a plain decimal ("1.7") is fine, but a comma this
 * function cannot place is refused with a recorded reason rather than guessed at — the same
 * refusal `profile.mjs`'s own column-level `typeOf` already gives a whole column, scaled down to
 * one token with no sibling values to settle it against. The only evidence a lone token can offer
 * for itself is its own trailing decimal tail ("14,205.5" settles itself as thousands-grouped,
 * because nobody writes a decimal comma followed by a thousands-grouped period); without one, a
 * comma-grouped token stays ambiguous.
 *
 * Returns `{ value }` for an unambiguous read, `{ ambiguous: true, reason }` for a numeral this
 * function can see but cannot resolve to one value, and `null` for a string that is not a numeral
 * at all. Never two numbers out of one token — the defect this exists to close, where a naive
 * digit-only regex split "14,205" into 14 and 205, and the French "1,7" into 1 and 7, and both
 * fragments then matched a column's range by coincidence.
 */
export function readNumericToken(raw) {
  const value = raw.trim();
  if (NUMERIC_RE.test(value) && Number.isFinite(Number(value))) return { value: Number(value) };
  if (THOUSANDS_RE.test(value)) {
    if (value.includes(".")) return { value: Number(value.replace(/,/g, "")) };
    return {
      ambiguous: true,
      reason: `"${value}" is ambiguous — could be a thousands-grouped number or a decimal comma, and nothing settles it`,
    };
  }
  if (value.includes(",")) {
    return {
      ambiguous: true,
      reason: `"${value}" carries a comma that is neither a thousands grouping nor a settled decimal — could be a French decimal comma or a malformed grouping, and nothing settles it`,
    };
  }
  return null;
}


// WHAT A UNIT MAY LEGITIMATELY BE, decided with the corpus in front of us (finding C1, round five).
//
// The reader that learned `"12 %"` in round one and was widened to a LEADING unit in round two
// typed `stress-y-rural-broadband`'s 186 place names — `Commune-001` … `Commune-186` — as a
// MEASURE: `number`, `unit: "Commune"`, `min: -186`, `sum: -17391`, with a denominator attached to
// it downstream. It read the alphabetic prefix as a unit and the hyphen as a minus sign. `COVID-19`
// reads as -19 the same way, and so does every case id, product code, region code and ISO
// designation shaped `<letters>-<digits>`.
//
// MEASURED over the 114 CSVs frozen in this tree, before deciding anything: the LEADING form
// matched twelve distinct tokens — `Commune`, `OWID_EU`, `Q`, `ci`, `ew`, `hv`, `nc`, `nn`, `pr`,
// `uu`, `March`, `term` — and not one of them is a measure. Every single one is an identifier or a
// month. The TRAILING form matched `%` (two stories, both real), `+` (an age band's open top,
// "80+") and `(Jan-Mar)` (a parenthesised aside on a year, `stress-o`). So the corpus says a unit
// is a MARK a number is measured in, never a word glued to an id, and this reader now accepts only:
//
//   - in FRONT of a number, a currency symbol and nothing else (Unicode `Sc`: `$`, `€`, `£`, `¥`,
//     …). No letters, ever — that arm is where the whole defect lived, and in this tree it has
//     never once carried a measure. A Unicode category rather than a list of currencies, so this
//     is not one more lexicon written against the language its first story happened to be in.
//   - AFTER a number, a short token of unit characters: letters (`kg`, `km`, `GWh`) and the marks a
//     measure carries (`%`, `‰`, `°`, `²`, `³`, `·`, `/`), currency symbols included. No hyphen, so
//     `19-COVID` is not nineteen COVIDs; no bracket, so `2025 (Jan-Mar)` is not a year in Jan-Mars;
//     and never a bare sign, so `80+` is not eighty of something.
//
// The numeric core is deliberately the SAME shape NUMERIC_RE accepts — this never widens what
// counts as a number, only what is allowed to sit next to one. "0x1F" is caught by neither form:
// the trailing form would leave "x1F" as the "unit", which contains a digit and so is not
// `[^\d\s]+`; the leading form requires a currency symbol, and "0x1F" starts with a digit.
const UNIT_SUFFIX_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*([^\d\s]+)$/;
const UNIT_PREFIX_RE = /^(\p{Sc})\s*([+-]?(?:\d+\.?\d*|\.\d+))$/u;

// The trailing token itself: at most eight characters, all of them unit characters, at least one of
// them a letter, a currency symbol or a measure mark — so a lone "/" is no more a unit than "+" is.
const UNIT_TOKEN_RE = /^(?=.*[\p{L}\p{Sc}%‰°])[\p{L}\p{Sc}%‰°²³·\/]{1,8}$/u;

function splitUnit(v) {
  const suffix = v.match(UNIT_SUFFIX_RE);
  if (suffix && UNIT_TOKEN_RE.test(suffix[2])) return { core: suffix[1], unit: suffix[2], raw: v };
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

// A column's own NAME, read the same identity-based way the sequence check below reads a year
// column — never a guess from two columns' SHAPES. `mag` beside `type` (proof/map-quake-density:
// an earthquake's magnitude beside "earthquake"/"quarry blast") is exactly the false positive this
// guards against: `type` is a real category and happens to sit beside a number, but nothing in the
// data says it states that number's UNIT. Only a column literally named "unit"/"units" (English) or
// "unité"/"unités" (French) is trusted to make that claim.
const UNIT_COLUMN_NAME_RE = /^unit(e|é)?s?$/i;

// A DENOMINATOR, read off a column's own NAME (finding 5, stress round four). A count is not a
// rate: `stress-q-safety-incidents` ranks five districts by `incidents` while `residents` sits in
// the next column, and the article's headline ("Centro has the worst safety record") is true on the
// raw counts and false per resident — Centro is 205 incidents per 100,000 residents, Sul is 233.
// Nothing in this toolchain ever asked the question, in any of the four frozen stories that carry an
// explicit denominator (`residents`, `population`, `households`, `μαθητές_2026`).
//
// REPORTING, NEVER REPAIR — the discipline `gaps` and `mixedUnits` already follow in this file.
// This NEVER divides, never adds a rate column, never re-ranks anything: `stress-a-energy-bills`
// carries `households` beside `price_eur`, and its shipped beat draws `price_eur` RAW, correctly,
// because a household energy bill is already a per-household figure. A profiler that divided there
// would be inventing a number nobody claimed. So the profile says only that a denominator-shaped
// column is present, and names it; the journalist decides what it means.
//
// IDENTITY, NOT SHAPE — the same test `UNIT_COLUMN_NAME_RE` and `isSequenceColumn` already use.
// Two columns' shapes can never settle this: every table in this tree carries some numeric column
// beside another, and "the bigger one is the denominator" would name `network_km` against
// `trips_millions` and `incidents` against nothing. Only a column one of whose own name TOKENS is
// literally a population word is trusted to make the claim. The list is measured against the four
// frozen stories that carry one, in the languages they were written in, and is deliberately short:
// a word not on it is a column this profiler says nothing about, which is the honest answer.
const DENOMINATOR_NAME_TOKENS = new Set([
  "resident",
  "residents",
  "population",
  "populations",
  "inhabitant",
  "inhabitants",
  "habitant",
  "habitants",
  "household",
  "households",
  "menage",
  "menages",
  "m\u00e9nage",
  "m\u00e9nages",
  "pupil",
  "pupils",
  "student",
  "students",
  "\u03bc\u03b1\u03b8\u03b7\u03c4\u03ae\u03c2",
  "\u03bc\u03b1\u03b8\u03b7\u03c4\u03ad\u03c2",
  "eleve",
  "eleves",
  "\u00e9l\u00e8ve",
  "\u00e9l\u00e8ves",
]);

// A column name as the words it is made of — `\u03bc\u03b1\u03b8\u03b7\u03c4\u03ad\u03c2_2026` is "pupils" and a year, and the year
// suffix must not hide the word. Split on anything that is neither a letter nor a digit, which is
// the same splitting `storyboard`'s own `nameTokensOf` does for a different question.
const NAME_TOKEN_SPLIT_RE = /[^\p{L}\p{N}]+/u;

function namesADenominator(name) {
  return name
    .split(NAME_TOKEN_SPLIT_RE)
    .some((token) => DENOMINATOR_NAME_TOKENS.has(token.toLowerCase()));
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
    // `readNumericToken` reads each value the same way `ground-claim.mjs`'s copy does; its own
    // ambiguity refusal only ever fires on a token with no sibling evidence to settle it, so a
    // value here falls back to the column-level settling `typeOf` already computed (this column
    // would not be typed "number" at all otherwise) rather than being re-refused one token late.
    const numbers =
      type === "number"
        ? present.map((v) => {
            if (unit) return Number(splitUnit(v).core);
            const read = readNumericToken(v);
            return read && !read.ambiguous ? read.value : Number(stripThousands(v));
          })
        : [];
    // A PERCENTAGE ABOVE 100 — reported, never repaired (finding Y5, stress round five).
    // `stress-y-rural-broadband` carries 104.2 in a column the article itself calls a percentage,
    // and nothing anywhere in this toolchain noticed. What this profiler can HONESTLY know is
    // narrow, and the narrowness is the point: a column is a percentage when its own VALUES say so
    // — the uniform trailing "%" read above — and never when only its NAME says so. `broadband_pct`
    // is named for a percentage and the article calls it one; the DATA says nothing, and reading a
    // unit off a name is the same guess `UNIT_COLUMN_NAME_RE` and the denominator detector both
    // refuse to make about a sibling column. So a column that merely LOOKS like a percentage gets
    // no report here, and that limit is stated rather than papered over with a name match.
    // Never a verdict either: a share above 100 is either an error or a figure that was never a
    // share (an index, an occupancy, a change) — `stress-f-housing-pressure`'s Malta is "143 %".
    // This names the values and stops; nothing is clamped, dropped or re-scaled.
    const percentAboveHundred = unit === "%" ? numbers.filter((n) => n > 100) : [];
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
      // Which values a percentage column states above 100 — see percentAboveHundred above. Absent,
      // not null, when the column is not a percentage the DATA declared or has no such value.
      ...(percentAboveHundred.length
        ? { percentAboveHundred: { count: percentAboveHundred.length, values: percentAboveHundred } }
        : {}),
      // Which values a sequence-like column's own grain skips — see isSequenceColumn/findGaps.
      // `null` for any column where "gaps" is not a meaningful question, not merely an unanswered one.
      gaps,
      // Values themselves, kept only long enough for mixedUnitsOf (below) to check this column
      // against a sibling — never returned on the column itself.
      _values: values,
    };
  });
  // The denominator-shaped columns, named once for the whole table — see DENOMINATOR_NAME_TOKENS.
  // A column that IS one never carries the field itself: it is the thing counts are read against,
  // not a count with a denominator of its own.
  const denominators = columns.filter((c) => c.type === "number" && namesADenominator(c.name));
  for (const column of columns) {
    if (column.type === "number") {
      const mixedUnits = mixedUnitsOf(column, columns);
      if (mixedUnits) column.mixedUnits = mixedUnits;
      // A sequence column (`gaps` is the record that this profiler already decided it is one — a
      // calendar year, above all) is an x axis, not a count: dividing 2025 by a population says
      // nothing, so the question is not put there at all.
      const others = denominators.filter((c) => c !== column);
      if (others.length > 0 && column.gaps === null && !namesADenominator(column.name)) {
        // Several candidates are all named rather than the first one silently winning — a second
        // denominator nobody mentioned is the same silence this whole field exists to break.
        column.denominator =
          others.length === 1
            ? { column: others[0].name }
            : { column: others[0].name, others: others.slice(1).map((c) => c.name) };
      }
    }
    delete column._values;
  }
  return { rowCount: body.length, columns, duplicates: findDuplicateRows(body) };
}

// FINDING 8 (stress round three): `stress-l-mixed-unit-clinics`'s own `value` column reports a
// COUNT of clinics for four countries (910-1880) and a RATE per 100,000 for four others
// (17.2-21.9), with a sibling `unit` column saying which. The profile ranged the whole column as
// one measure — a single choropleth ramp over it would paint a COUNT and a RATE on one scale,
// which says nothing true about the world.
//
// Reporting, never repair: this never splits, re-scales or drops a value — it only says the
// numeric column is not one measure, and names the column that says so.
//
// HOW A UNIT COLUMN IS TOLD APART FROM A CATEGORY COLUMN THAT HAPPENS TO SIT BESIDE A NUMBER.
// Two columns' SHAPES alone can never settle this: `mag` beside `type` (proof/map-quake-density,
// an earthquake's magnitude beside "earthquake"/"quarry blast") has the identical shape — one
// numeric column, one text column with more than one distinct value — and `type` is a real
// category, not a claim about what unit `mag` is measured in. The only thing that tells them apart
// is the sibling column's own NAME: only a column literally read by `UNIT_COLUMN_NAME_RE`
// ("unit"/"units"/"unité"/"unités") is trusted to state a unit at all, the same identity-based
// test `isSequenceColumn` already uses to find a year column rather than guessing from an integer
// range alone. A unit column that names only ONE unit throughout is not a partition either — every
// row agrees, so the numeric column really is one measure, and mixedUnits stays unset.
function mixedUnitsOf(column, columns) {
  const unitColumn = columns.find((c) => c !== column && UNIT_COLUMN_NAME_RE.test(c.name));
  if (!unitColumn) return null;
  const groups = [];
  column._values.forEach((value, index) => {
    if (value === "") return;
    const label = unitColumn._values[index];
    if (!label || label === "") return;
    if (!groups.includes(label)) groups.push(label);
  });
  if (groups.length < 2) return null;
  return { column: unitColumn.name, groups };
}
