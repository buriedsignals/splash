// twin/skills/storyboard/scripts/ground-claim.mjs
//
// groundTakeaway checks a confirmed takeaway against the frozen data it describes, for exactly
// one class of failure: a number or a direction the frozen data itself contradicts. It is the
// narrow guard that would have caught the trial's Norway beat (twin/TRIAL-THREE-BEATS.md): a
// takeaway claiming "2024 was below every year since 1993" while the fetched series gives
// 2024 = 37.18 against 1993 = 35.95 — stated in a title above a chart that visibly shows the
// opposite, and caught by nothing in the toolkit before this.
//
// This is NOT a fact-checker (it knows nothing outside `profile`) and NOT a conformance engine
// (it never looks at a rendered chart or a spec). Everything it cannot actually check comes back
// "unverifiable" with a reason — it never returns "supported" for something it did not verify,
// because silence and confirmation must not look alike (a rule this branch has had to learn three
// times already).
//
// profile shape expected here:
//   {
//     columns: [{ name, type, min, max, sum }, ...],  // as intake's profileTable produces
//                                                  // (`sum` is the total of a numeric column, and
//                                                  // is what makes a part-to-whole takeaway
//                                                  // checkable at all — see shape 1b below)
//     rows: [{ [columnName]: value, ... }, ...],  // optional row-level data. Without it, any
//                                                  // claim that needs a specific year's value
//                                                  // comes back "unverifiable", never "supported"
//                                                  // or "contradicted".
//   }
//
// Claim shapes checked (see the module's test file and the SKILL.md for the full list this does
// NOT cover):
//   1a. A numeric token in the takeaway that falls INSIDE the range of some numeric column.
//   1b. A numeric token that equals a numeric column's `sum` within AGGREGATE_TOLERANCE — a
//       part-to-whole total, "34 = 14 + 11 + 9". A number this function can place in NEITHER way is
//       "unverifiable", never "contradicted": a total is by construction >= the max of the column
//       it sums, so reading "I could not place this number" as "the data refutes this number"
//       refused every part-to-whole takeaway ever written. That is a measured defect, not a
//       hypothetical (twin/FEEDBACK-2026-08-10.md, A13), and the else branch below is where it lived.
//   2. "X in <year A> (is/was) less/more than (in) <year B>" — both years present in the data.
//   3. "X in <year A> ... less/more than ... since <year B>" and "the lowest/highest since <year>"
//      — checked against every row in the claimed window, not just the boundary year.
//   4. "highest/lowest ever" — checked against every row in the profile.
//   5. "first time" claims — always unverifiable; there is no mechanical check for this shape.
//
// Only a value that contradicts a fact this function DID establish comes back "contradicted": the
// year comparisons and the superlatives, which read real rows. Everything the function merely
// failed to place is information for the journalist, not a refusal.

const NUMBER_RE = /-?\d+(?:\.\d+)?/g;

// The relative slack a rounded total is allowed against the exact sum of its column, so a takeaway
// writing "34" against a column summing to 33.8 still resolves. Absolute floor of 0.5 so a small
// column (sum 9) is not held to a tolerance of 0.09.
const AGGREGATE_TOLERANCE = 0.01;

function matchesAggregate(value, sum) {
  if (sum === null || sum === undefined || !Number.isFinite(sum)) return false;
  return Math.abs(value - sum) <= Math.max(0.5, Math.abs(sum) * AGGREGATE_TOLERANCE);
}

const LESS_RE = /^(less|fewer|lower|below|smaller|moins)$/i;
const MORE_RE = /^(more|higher|greater|above|larger|plus)$/i;

function directionOf(word) {
  if (LESS_RE.test(word)) return "less";
  if (MORE_RE.test(word)) return "more";
  return null;
}

// "less/lower/... in <yearA> than ... since <yearB>" — the exact Norway shape ("less CO2 in 2024
// than in any year since 1993") and its "more/higher" mirror.
const SINCE_EN_RE =
  /\b(less|fewer|lower|below|smaller|more|higher|greater|above|larger)\b[\s\S]{0,120}?\bin\s+(\d{4})\b[\s\S]{0,120}?\bthan\b[\s\S]{0,60}?\bsince\s+(\d{4})\b/gi;

// "less/lower/... in <yearA> than (in) <yearB>" — a plain two-year comparison, no "since".
const PAIR_EN_RE =
  /\b(less|fewer|lower|below|smaller|more|higher|greater|above|larger)\b[\s\S]{0,120}?\bin\s+(\d{4})\b[\s\S]{0,120}?\bthan\b[\s\S]{0,40}?\bin\s+(\d{4})\b/gi;

// French pair form: "En <yearA>, ... moins/plus ... qu'en <yearB>" — the Swiss proof takeaway's
// own shape ("En 2024, la Suisse a émis moins de CO₂ ... qu'en 1967").
const PAIR_FR_RE = /\ben\s+(\d{4})\s*,[\s\S]{0,120}?\b(moins|plus)\b[\s\S]{0,120}?\bqu['’]?en\s+(\d{4})\b/gi;

// "<yearA> ... lowest/highest ... since <yearB>" — a superlative phrased without "less/more...than".
const SUPERLATIVE_SINCE_RE = /\b(\d{4})\b[\s\S]{0,60}?\b(lowest|highest)\b[\s\S]{0,40}?\bsince\s+(\d{4})\b/gi;

// "lowest/highest ... ever" — checked against the whole profile, anchored on the nearest year.
const SUPERLATIVE_EVER_RE = /\b(lowest|highest)\b[\s\S]{0,20}?\bever\b/gi;
const YEAR_NEAR_RE = /\b(\d{4})\b/g;

const FIRST_TIME_RE = /\bfirst\s+time\b/gi;

function overlaps(a, b) {
  return a.start < b.end && a.end > b.start;
}

// Every comparison/superlative phrase this function recognises, in the order they are tried. A
// later pattern is skipped where it would just re-describe a span an earlier pattern already
// claimed (this only matters for the SUPERLATIVE_SINCE_RE / SINCE_EN_RE overlap in practice — the
// two require different keyword sets, "lowest/highest" versus "less/more", so real double-matches
// are rare, but a takeaway is free-text and this keeps the output to one claim per phrase).
function extractComparisons(text) {
  const found = [];

  for (const m of text.matchAll(SINCE_EN_RE)) {
    found.push({
      kind: "since",
      direction: directionOf(m[1]),
      yearA: Number(m[2]),
      yearB: Number(m[3]),
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  for (const m of text.matchAll(PAIR_EN_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({
      kind: "pair",
      direction: directionOf(m[1]),
      yearA: Number(m[2]),
      yearB: Number(m[3]),
      raw: m[0],
      ...span,
    });
  }

  for (const m of text.matchAll(PAIR_FR_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({
      kind: "pair",
      direction: directionOf(m[2]),
      yearA: Number(m[1]),
      yearB: Number(m[3]),
      raw: m[0],
      ...span,
    });
  }

  for (const m of text.matchAll(SUPERLATIVE_SINCE_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({
      kind: "since",
      direction: m[2].toLowerCase() === "lowest" ? "less" : "more",
      yearA: Number(m[1]),
      yearB: Number(m[3]),
      raw: m[0],
      ...span,
    });
  }

  for (const m of text.matchAll(SUPERLATIVE_EVER_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    const direction = m[1].toLowerCase() === "lowest" ? "less" : "more";
    const windowStart = Math.max(0, m.index - 80);
    const windowEnd = Math.min(text.length, m.index + m[0].length + 80);
    const years = [...text.slice(windowStart, windowEnd).matchAll(YEAR_NEAR_RE)];
    if (years.length === 0) {
      found.push({ kind: "ever-unanchored", raw: m[0], ...span });
    } else {
      found.push({ kind: "ever", direction, yearA: Number(years[0][1]), raw: m[0], ...span });
    }
  }

  for (const m of text.matchAll(FIRST_TIME_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({ kind: "first-time", raw: m[0], ...span });
  }

  return found;
}

function findYearColumn(columns) {
  const byName = columns.find((c) => /year|date|ann[ée]e/i.test(c.name));
  if (byName) return byName;
  return (
    columns.find(
      (c) => c.type === "number" && Number.isInteger(c.min) && Number.isInteger(c.max) && c.min >= 1500 && c.max <= 2100,
    ) ?? null
  );
}

function findValueColumn(columns, yearColumn) {
  const candidates = columns.filter((c) => c.type === "number" && c !== yearColumn);
  return candidates.length === 1 ? candidates[0] : null;
}

function rowValue(rows, yearField, valueField, year) {
  const row = rows.find((r) => Number(r[yearField]) === year);
  if (!row) return undefined;
  const v = row[valueField];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function resolveComparison(item, profile) {
  const claim = item.raw.trim();

  if (item.kind === "first-time") {
    return { claim, verdict: "unverifiable", detail: "\"first time\" claims are not mechanically checked" };
  }
  if (!item.direction) {
    return { claim, verdict: "unverifiable", detail: "comparison direction word not recognised" };
  }

  const columns = Array.isArray(profile.columns) ? profile.columns : [];
  const yearColumn = findYearColumn(columns);
  const valueColumn = findValueColumn(columns, yearColumn);
  if (!yearColumn || !valueColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: "cannot identify a single year column and a single value column in this profile",
    };
  }

  const rows = Array.isArray(profile.rows) ? profile.rows : null;
  if (!rows || rows.length === 0) {
    return { claim, verdict: "unverifiable", detail: "profile has no row-level data to check this comparison against" };
  }

  if (item.kind === "ever-unanchored") {
    return { claim, verdict: "unverifiable", detail: "no year found near this superlative to anchor the check on" };
  }

  const valueA = rowValue(rows, yearColumn.name, valueColumn.name, item.yearA);
  if (valueA === undefined) {
    return { claim, verdict: "unverifiable", detail: `year ${item.yearA} is not present in the frozen data` };
  }

  if (item.kind === "pair") {
    const valueB = rowValue(rows, yearColumn.name, valueColumn.name, item.yearB);
    if (valueB === undefined) {
      return { claim, verdict: "unverifiable", detail: `year ${item.yearB} is not present in the frozen data` };
    }
    const holds = item.direction === "less" ? valueA < valueB : valueA > valueB;
    return {
      claim,
      verdict: holds ? "supported" : "contradicted",
      detail: `${valueColumn.name} in ${item.yearA} = ${valueA}, in ${item.yearB} = ${valueB}`,
    };
  }

  // "since" (windowed against the claimed range) and "ever" (windowed against the whole profile).
  const windowRows =
    item.kind === "ever"
      ? rows.filter((r) => Number(r[yearColumn.name]) !== item.yearA)
      : rows.filter((r) => {
          const y = Number(r[yearColumn.name]);
          const lo = Math.min(item.yearA, item.yearB);
          const hi = Math.max(item.yearA, item.yearB);
          return y >= lo && y <= hi && y !== item.yearA;
        });

  if (windowRows.length === 0) {
    return { claim, verdict: "unverifiable", detail: "no other data points in the claimed window to compare against" };
  }

  const violator =
    item.direction === "less"
      ? windowRows.find((r) => Number(r[valueColumn.name]) <= valueA)
      : windowRows.find((r) => Number(r[valueColumn.name]) >= valueA);

  if (violator) {
    const y = violator[yearColumn.name];
    const v = violator[valueColumn.name];
    return {
      claim,
      verdict: "contradicted",
      detail: `${valueColumn.name} in ${item.yearA} = ${valueA} is not ${item.direction} than ${valueColumn.name} in ${y} = ${v}`,
    };
  }
  return {
    claim,
    verdict: "supported",
    detail: `${valueColumn.name} in ${item.yearA} = ${valueA} is ${item.direction === "less" ? "less than every" : "more than every"} other year checked`,
  };
}

function checkNumericRanges(text, columns, consumedSpans) {
  const claims = [];
  const seen = new Set();
  const numericColumns = columns.filter((c) => c.type === "number" && c.min !== null && c.min !== undefined && c.max !== null && c.max !== undefined);

  for (const m of text.matchAll(NUMBER_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (consumedSpans.some(([s, e]) => start < e && end > s)) continue;
    if (seen.has(m[0])) continue;
    seen.add(m[0]);

    if (numericColumns.length === 0) {
      claims.push({ claim: m[0], verdict: "unverifiable", detail: "profile has no numeric column with a range to check against" });
      continue;
    }

    const value = Number(m[0]);
    const inRange = numericColumns.filter((c) => value >= c.min && value <= c.max);
    if (inRange.length > 0) {
      claims.push({
        claim: m[0],
        verdict: "supported",
        detail: `within the range of column "${inRange[0].name}" [${inRange[0].min}, ${inRange[0].max}]`,
      });
      continue;
    }

    // A total is not a member of the column it sums — it is >= that column's max, by construction.
    // Checking it against `sum` is the only way a part-to-whole takeaway ("34 million tonnes, of
    // which less than half…") can be confirmed rather than merely tolerated.
    const summed = numericColumns.find((c) => matchesAggregate(value, c.sum));
    if (summed) {
      claims.push({
        claim: m[0],
        verdict: "supported",
        detail: `equals the sum of column "${summed.name}" (${summed.sum})`,
      });
      continue;
    }

    // Neither a member of a range nor a column total. That is this function failing to place the
    // number, which is not the same fact as the data refuting it — see the header.
    claims.push({
      claim: m[0],
      verdict: "unverifiable",
      detail: `could not be placed in any numeric column's range or total (${numericColumns
        .map((c) => `"${c.name}" [${c.min}, ${c.max}]${c.sum === null || c.sum === undefined ? "" : `, sum ${c.sum}`}`)
        .join(", ")}) — this check has no way to confirm or refute it`,
    });
  }
  return claims;
}

export function groundTakeaway(takeaway, profile) {
  if (!takeaway || typeof takeaway !== "string") return [];
  const p = profile ?? {};
  const columns = Array.isArray(p.columns) ? p.columns : [];

  const comparisons = extractComparisons(takeaway);
  const claims = comparisons.map((item) => resolveComparison(item, p));

  const consumedSpans = comparisons.map((c) => [c.start, c.end]);
  claims.push(...checkNumericRanges(takeaway, columns, consumedSpans));

  return claims;
}
