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
// times already; the third time was the stress test of 2026-08-20 — see shape 6 below, where a
// direction word paired with an ordered number pair used to fall through to two independent
// range checks and come back "supported" twice on a sentence the data flatly contradicted).
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
//   6. A TREND word ("rose", "risen", "rising", "climbed", "grew", "increased", "up" / "fell",
//      "fallen", "dropped", "declined", "shrank", "down") paired with an ordered "from A to B"
//      number pair in the same takeaway, checked for AGREEMENT between the word's direction and
//      the pair's own order — not merely whether A and B each independently sit inside some
//      column's range, which is the check that let a "risen ... from 8.4% to 7.2%" sentence come
//      back "supported" twice (2026-08-20 stress test, stress-c-vacant-homes). Three deliberate
//      boundaries on this shape, all governed by "unverifiable, never silence, never confirmation"
//      for what it cannot see:
//        - A "from A to B" pair where BOTH numbers read as a plausible four-digit calendar year
//          (1500-2100, no decimal point — see `looksLikeYearSpan`) is treated as a date range, not
//          a value pair, and is left to the ordinary per-number range check (shape 1a), which
//          resolves it correctly on its own — those numbers are real years in the data, and
//          "supported" for them is not a guess, it is what checking a year against the year
//          column's range actually establishes. This is what keeps "fell ... from 2019 to 2022,
//          from 8.4% to 7.2%" from misreading the YEAR span as the value pair and flagging a false
//          contradiction against a direction word that was never about the years at all.
//        - A "from A to B" value pair (not a year span) with NO trend word within reach (120
//          characters either side — the same order of magnitude every other windowed pattern in
//          this file uses) is "unverifiable" if a trend word exists ANYWHERE ELSE in the takeaway
//          (the sentence is making a directional claim, it is just too far from this exact pair
//          for this regex-only check to responsibly pair the two), and is left unclaimed — to the
//          ordinary per-number range check — only when the takeaway contains no trend word at all,
//          i.e. is not making a directional claim in the first place.
//        - A trend word with NO "from A to B" number pair anywhere in the takeaway at all (e.g.
//          "Vacancy is climbing, year after year.") produces no claim. This was a deliberate call,
//          not an oversight: a column's `min`/`max` range carries no notion of *when* the min or
//          the max occurred, so there is no way to read a direction out of a range alone without
//          inventing an ordering the profile does not state — and `rows`, where present, is keyed
//          to a specific year or comparison this shape's regex does not extract, so reaching into
//          it here would be exactly the natural-language parser this function is built not to
//          become. Silence here is the same silence "Renewables overtook coal as the main source"
//          already gets: a sentence shape this function was never taught to recognise at all, not
//          a claim it recognised and declined to check.
//   7. A part-to-whole TOTALITY claim — "the whole of", "all of", "together ... make up", "100%" —
//      checked against `sum` on the ONE column identifiable as a share/percentage (by name, or by
//      the `unit: "%"` intake's profiler now records — see profile.mjs), because "the whole" only
//      has a fixed numeric meaning (100) for a column made of percentages; a plain measurement
//      column summing to, say, 34 has no independent number to call "the whole" against, so
//      totality is never checked there. Zero or more than one such column is "unverifiable", never
//      guessed at (2026-08-20 stress test, stress-e-electricity-mix: share_pct summed to 95.2
//      while the article said the six shares "make up the whole of national supply", and nothing
//      before this shape ever read `sum` against that claim at all).
//
// Only a value that contradicts a fact this function DID establish comes back "contradicted": the
// year comparisons, the superlatives, the trend-word/pair agreement check and the totality check,
// which read real rows, a real number pair, or a real column total. Everything the function merely
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

// Shape 6 — a trend word ("rose", "fell", ...) checked for agreement with an ordered "from A to
// B" number pair. Kept deliberately small and explicit rather than a generic "verb list" the way
// this file's other patterns are.
const TREND_UP_WORDS = new Set(["rose", "risen", "rising", "climbed", "grew", "increased", "up"]);
const TREND_DOWN_WORDS = new Set(["fell", "fallen", "dropped", "declined", "shrank", "down"]);
const TREND_DIRECTION_RE = /\b(rose|risen|rising|climbed|grew|increased|up|fell|fallen|dropped|declined|shrank|down)\b/gi;

function trendDirectionOf(word) {
  const w = word.toLowerCase();
  if (TREND_UP_WORDS.has(w)) return "up";
  if (TREND_DOWN_WORDS.has(w)) return "down";
  return null;
}

// "from <A> to <B>", optionally each side carrying a trailing "%" — the shape the stress
// takeaway actually uses ("from 8.4% to 7.2%"). Deliberately does not try to cover every phrasing
// a trend could be written in ("A to B", "A, down to B", ...) — see the header for why this stays
// a regex over one recognised shape rather than a natural-language parser.
const FROM_TO_PAIR_RE = /\bfrom\s+(-?\d+(?:\.\d+)?)\s*%?\s*to\s+(-?\d+(?:\.\d+)?)\s*%?/gi;

// How far (in characters) a trend word is allowed to sit from a "from A to B" pair and still be
// read as describing it — the same order of magnitude every other windowed pattern above uses.
const TREND_WINDOW = 120;

// Shape 7 — a part-to-whole TOTALITY claim ("the whole of", "all of", "together ... make up",
// "100%"), checked against the ONE column that reads as a share/percentage — see resolveComparison
// for why it is restricted to that column rather than any numeric column the profile happens to
// carry, and the header for the shape's full reasoning.
const TOTALITY_WHOLE_RE = /\bthe\s+whole\s+of\b/gi;
const TOTALITY_ALL_RE = /\ball\s+of\b/gi;
const TOTALITY_TOGETHER_RE = /\btogether\b[\s\S]{0,40}?\bmake(?:s)?\s+up\b/gi;
const TOTALITY_PERCENT_RE = /\b100\s?%/g;
const TOTALITY_PATTERNS = [TOTALITY_WHOLE_RE, TOTALITY_ALL_RE, TOTALITY_TOGETHER_RE, TOTALITY_PERCENT_RE];

// A column this shape is willing to call "the whole" of — a share or a percentage, identified by
// its own name (the profile carries no other marker for this in the fixtures this file has seen)
// or by the `unit` intake's profiler records when a column's cells carry a literal "%" — never
// guessed onto an arbitrary numeric column just because a takeaway happens to use the word "whole".
const SHARE_COLUMN_NAME_RE = /pct|percent|proportion|share/i;

function isShareColumn(column) {
  return column.unit === "%" || SHARE_COLUMN_NAME_RE.test(column.name);
}

// What "the whole" means for a share/percentage column, and how much rounding slack a takeaway
// is allowed before its total reads as genuinely off — mirrors AGGREGATE_TOLERANCE's own floor,
// not invented fresh for this shape.
const TOTALITY_WHOLE_VALUE = 100;
const TOTALITY_TOLERANCE = 1;

// A "from A to B" pair where both sides are a plausible four-digit calendar year is a date range
// ("from 2019 to 2022"), not a measured value pair — see the header's first bullet under shape 6.
function looksLikeYearSpan(rawA, rawB) {
  const isYear = (raw) => /^\d{4}$/.test(raw) && Number(raw) >= 1500 && Number(raw) <= 2100;
  return isYear(rawA) && isYear(rawB);
}

function distanceBetween(spanA, spanB) {
  if (spanA.end <= spanB.start) return spanB.start - spanA.end;
  if (spanB.end <= spanA.start) return spanA.start - spanB.end;
  return 0;
}

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

  // Shape 6 — trend word vs. the pair's own order. Computed once so every "from A to B" pair in
  // the takeaway can be matched against its nearest candidate.
  const trendWords = [...text.matchAll(TREND_DIRECTION_RE)].map((m) => ({
    word: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));

  for (const m of text.matchAll(FROM_TO_PAIR_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    if (looksLikeYearSpan(m[1], m[2])) continue; // a date range, not a value pair — see header

    const numA = Number(m[1]);
    const numB = Number(m[2]);

    let nearest = null;
    let nearestDistance = Infinity;
    for (const candidate of trendWords) {
      const d = distanceBetween(span, candidate);
      if (d < nearestDistance) {
        nearest = candidate;
        nearestDistance = d;
      }
    }

    if (nearest && nearestDistance <= TREND_WINDOW) {
      found.push({ kind: "trend", directionWord: nearest.word, numA, numB, raw: m[0], ...span });
    } else if (nearest) {
      // A trend word exists in this takeaway, just not close enough to this pair to pair
      // confidently with it — "unverifiable", never left to fall through to the per-number range
      // check, which would silently mark both numbers "supported" without ever reading the word.
      found.push({
        kind: "trend-unlinked",
        nearestWord: nearest.word,
        numA,
        numB,
        raw: m[0],
        ...span,
      });
    }
    // No trend word anywhere in the takeaway: not a directional claim at all — left unclaimed, to
    // the ordinary per-number range check (shape 1a).
  }

  // Shape 7 — a totality claim. One claim per takeaway, spanning the earliest trigger phrase to
  // the latest: "Together these make up the whole of national supply" trips both
  // TOTALITY_TOGETHER_RE and TOTALITY_WHOLE_RE on the same sentence, and that is one claim about
  // one column's sum, not two independent ones.
  const totalityMatches = [];
  for (const re of TOTALITY_PATTERNS) {
    for (const m of text.matchAll(re)) {
      totalityMatches.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  if (totalityMatches.length > 0) {
    totalityMatches.sort((a, b) => a.start - b.start);
    const first = totalityMatches[0];
    const last = totalityMatches[totalityMatches.length - 1];
    const span = { start: first.start, end: Math.max(first.end, last.end) };
    if (!found.some((f) => overlaps(f, span))) {
      found.push({ kind: "totality", raw: text.slice(span.start, span.end), ...span });
    }
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

  if (item.kind === "trend") {
    const wordDirection = trendDirectionOf(item.directionWord);
    const pairDirection = item.numB > item.numA ? "up" : item.numB < item.numA ? "down" : "flat";
    if (pairDirection === "flat") {
      return {
        claim,
        verdict: "unverifiable",
        detail: `both numbers in this pair are ${item.numA}, so no direction can be read from it`,
      };
    }
    const holds = wordDirection === pairDirection;
    return {
      claim,
      verdict: holds ? "supported" : "contradicted",
      detail: holds
        ? `"${item.directionWord}" agrees with the pair's own order: ${item.numA} to ${item.numB} is ${pairDirection === "up" ? "an increase" : "a decrease"}`
        : `"${item.directionWord}" claims a ${wordDirection === "up" ? "rise" : "fall"}, but the pair itself goes from ${item.numA} to ${item.numB}, which is ${pairDirection === "up" ? "a rise" : "a fall"}`,
    };
  }
  if (item.kind === "trend-unlinked") {
    return {
      claim,
      verdict: "unverifiable",
      detail: `a direction word ("${item.nearestWord}") appears in the takeaway but not close enough to the ${item.numA} to ${item.numB} pair to verify agreement with it`,
    };
  }

  if (item.kind === "first-time") {
    return { claim, verdict: "unverifiable", detail: "\"first time\" claims are not mechanically checked" };
  }

  if (item.kind === "totality") {
    const columns = Array.isArray(profile.columns) ? profile.columns : [];
    const shareColumns = columns.filter(
      (c) => c.type === "number" && c.sum !== null && c.sum !== undefined && isShareColumn(c),
    );
    if (shareColumns.length !== 1) {
      return {
        claim,
        verdict: "unverifiable",
        detail:
          shareColumns.length === 0
            ? "no share/percentage column in the profile to check this total against"
            : "more than one share/percentage column in the profile — cannot tell which this total claims to be the whole of",
      };
    }
    const column = shareColumns[0];
    const holds = Math.abs(column.sum - TOTALITY_WHOLE_VALUE) <= TOTALITY_TOLERANCE;
    return {
      claim,
      verdict: holds ? "supported" : "contradicted",
      detail: holds
        ? `column "${column.name}" sums to ${column.sum}, which is the whole (${TOTALITY_WHOLE_VALUE})`
        : `claims the whole, but column "${column.name}" sums to ${column.sum}, not ${TOTALITY_WHOLE_VALUE}`,
    };
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
