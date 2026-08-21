// twin/skills/storyboard/scripts/ground-claim.mjs
//
// groundTakeaway checks a confirmed takeaway against the frozen data it describes. Three rounds
// of stress testing each taught it one more SHAPE (a range, a direction, a totality) and each time
// a later round walked straight past the shape it had not been taught. Round three did it four
// ways in one pass (2026-08-20/21): a false comparative nothing caught (a human added six numbers
// by hand), a misleading headline confirmed on a bare year number, a superlative with no numeral
// in it at all ("Germany has the most.") returning `[]` — invisible, not refused — and a number
// reader naive enough to split "14,205" into two range-tested fragments. A checker that only
// recognises shapes will always be one shape behind, so THIS round changes the CONTRACT instead of
// adding a fourth shape:
//   - every numeral this file reads is read by the same rule `intake/scripts/profile.mjs` reads
//     one by (`readNumericToken`, copied, not imported — see shape 0 below);
//   - a superlative or comparative claim is COMPUTED against the column's own values wherever that
//     is decidable, and named as unresolved otherwise, never dropped (shapes 8-9);
//   - the return value now carries COVERAGE beside the claims, so a takeaway nothing could be
//     placed in reads differently from one nothing was ever attempted on (see `computeCoverage`);
//   - a comparison over a period the frozen data itself marks incomplete refuses to confirm,
//     narrowly, by column name only (see `findCoverageColumn`).
//
// This is NOT a fact-checker (it knows nothing outside `profile`) and NOT a conformance engine
// (it never looks at a rendered chart or a spec). Everything it cannot actually check comes back
// "unverifiable" with a reason — it never returns "supported" for something it did not verify,
// because silence and confirmation must not look alike (a rule this branch has had to learn FOUR
// times now: shape 6's direction-word/pair agreement check, shape 7's totality check, and this
// round's coverage field, added specifically because "no claim shape fired" and "every claim fired
// and passed" used to be the same return value, `[]`).
//
// profile shape expected here:
//   {
//     columns: [{ name, type, min, max, sum }, ...],  // as intake's profileTable produces
//                                                  // (`sum` is the total of a numeric column, and
//                                                  // is what makes a part-to-whole takeaway
//                                                  // checkable at all — see shape 1b below)
//     rows: [{ [columnName]: value, ... }, ...],  // optional row-level data. Every frozen profile
//                                                  // this file has been run against so far omits
//                                                  // it entirely (`profileTable` never writes it —
//                                                  // see `intake/scripts/freeze.mjs`), so treat
//                                                  // "no `rows`" as the COMMON case, not the edge
//                                                  // one. Without it, any claim that needs a
//                                                  // specific row's value — a year's own figure
//                                                  // (shapes 2-4), or the entity an entity-named
//                                                  // superlative names (shape 8) — comes back
//                                                  // "unverifiable", naming what it could not
//                                                  // resolve, never "supported" or "contradicted".
//                                                  // Shape 9 is the one exception: a "more than
//                                                  // the others combined" claim can be REFUTED
//                                                  // from a column's own max and sum alone, with
//                                                  // no row needed — see shape 9 below.
//   }
//
// Claim shapes checked (see the module's test file and the SKILL.md for the full list this does
// NOT cover):
//   0. Every numeral token in this file — inside shapes 1a/1b and every other shape below that
//      reads a raw digit run out of the takeaway — is resolved through `readNumericToken`, COPIED
//      verbatim from `intake/scripts/profile.mjs` (registered in
//      `skills/splash/test/guard-copies-parity.test.ts`'s `COPIES`, this tree's rule against a
//      cross-skill import for a shared decision). A thousands-grouped integer ("14,205") or a
//      French decimal ("1,7") is ONE claim or none, never two independent fragments each tested
//      against a column's range by coincidence — the 2026-08-20/21 stress test's finding 4.
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
//   8. A SUPERLATIVE naming one entity — "<X> has the most", "<X> has/reports the highest/lowest",
//      "<X> leads", "<X> tops", "<X> ... more than any other". Decidable ONLY by resolving <X> to
//      its own row and reading its value against the column's own max (or min, for "lowest") — see
//      `resolveSuperlative`. Where `rows` is absent (the common case — see the profile-shape note
//      above) or <X> cannot be matched to any row, this is "unverifiable", NAMING <X> in the
//      detail — never `[]` (2026-08-20/21 stress test, finding 3: "Germany has the most." and
//      "Brazil leads the annual figures again." both returned `[]` before this round, indistinguish-
//      able from a takeaway with nothing checkable in it at all).
//   9. A COMPARISON naming one entity against the rest of a column combined — "<X> ... more than
//      the other N <plural> combined", "<X> ... more than all the others combined". Unlike shape
//      8, this is decidable in the REFUTING direction from the column's own MAX and SUM alone, no
//      `rows` required at all: for ANY row to exceed the sum of every other row, the row holding
//      the column's own maximum must in particular — so if even the max does not exceed the rest,
//      no entity, named or not, could make the claim true, and it is "contradicted" outright (see
//      `resolveCombined`). This is the exact arithmetic of the 2026-08-20/21 stress test's finding
//      1: "Brazil lost more forest than the other six countries combined" is false because
//      `loss_ha`'s own max (1,120,000) does not exceed its own sum minus that max (1,582,000) —
//      provable without ever knowing which row is Brazil's. The confirming direction (max DOES
//      exceed the rest) still needs `rows`, to confirm the NAMED entity is the one holding it.
//
// PARTIAL PERIODS, narrowly (finding 2). Shapes 2-4, 8 and 9 all read a period (usually a year) as
// directly comparable to another. `findCoverageColumn` detects, BY NAME ONLY — `months_covered` or
// `complete`/`coverage`, the two shapes the round-three stress stories actually carry
// (stress-j-partial-year-permits, stress-o-museum-visits) — a column marking some row's period
// incomplete, and every one of those shapes refuses to confirm anything while it is present, naming
// the column rather than guessing which row it affects. This is deliberately NOT a general
// incompleteness detector: it never reads a coverage column's VALUES, only whether the column
// exists at all, which is what keeps it narrow rather than a second natural-language parser guessing
// at what "incomplete" means. This is also why "Building permits collapse in 2026" — the bare
// numeral "2026", shape 1a, trivially inside the year column's range — no longer comes back
// "supported": `checkNumericRanges` carries the same guard for a bare year match.
//
// COVERAGE, so silence stops looking like confirmation (finding 3's other half). `groundTakeaway`
// now returns `{ claims, coverage }`; see `computeCoverage`'s own doc comment for the shape and,
// explicitly, who is expected to read it.
//
// Only a value that contradicts a fact this function DID establish comes back "contradicted": the
// year comparisons, the superlatives, the entity-vs-combined check, the trend-word/pair agreement
// check and the totality check, which read real rows, a real number pair, or a real column total.
// Everything the function merely failed to place is information for the journalist, not a refusal.

// A plain decimal literal — copied verbatim from `intake/scripts/profile.mjs` so both skills'
// own numeral-shaped tokens are read by the exact same rule (see `readNumericToken`, below).
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

// A number a human wrote with US/UK thousands grouping — copied verbatim from
// `intake/scripts/profile.mjs`, the other half of this decision (registered in
// `skills/splash/test/guard-copies-parity.test.ts`'s `COPIES`).
const THOUSANDS_RE = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

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

// A numeral as written in free text: a thousands-grouped integer with an optional decimal tail
// ("14,205" or "14,205.5"), OR a run of digits with exactly one separator — period or comma —
// ("1.7", "1,7"), OR a plain run of digits ("42"). Tried in that order so a grouped thousand is
// captured WHOLE rather than falling through to the loose single-separator alternative one
// character at a time. This is what closes finding 4 (2026-08-20 stress test): the old
// `-?\d+(?:\.\d+)?` regex never matched a comma at all, so "14,205" was two independent matches
// ("14" and "205") and the French "1,7" was two more ("1" and "7") — each fragment then tested
// against a column's range ON ITS OWN, and could land inside one by coincidence. Every match this
// regex produces is now handed to `readNumericToken`, which decides whether it is one number or
// an ambiguity to refuse — never two numbers out of one token.
const NUMBER_RE = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+[.,]\d+|-?\d+/g;

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

// Shape 8 — a SUPERLATIVE naming one entity: "the most", "the highest"/"the lowest" (bare, no
// "since" or "ever" — SUPERLATIVE_SINCE_RE and SUPERLATIVE_EVER_RE above already own those two),
// "leads", "tops". Every one of these reduces to the same question — does the named entity's own
// row hold the column's max (or min, for "lowest")? — decidable only once that row is resolved
// (see resolveSuperlative for what happens when the profile carries no `rows` to resolve it
// against, which is every frozen profile this branch has seen so far).
const SUPERLATIVE_MOST_RE = /\bhas\s+the\s+most\b/gi;
const SUPERLATIVE_HL_RE = /\bthe\s+(highest|lowest)\b/gi;
const LEADS_RE = /\bleads\b/gi;
const TOPS_RE = /\btops\b/gi;

// Shape 9 — "<entity> ... more than any other <noun>" (same question as shape 8, phrased as a
// comparison) and "<entity> ... more than the other(s) ... combined" / "... more than all the
// others combined" — the one shape in this file decidable from a column's own MAX and SUM alone,
// with no row resolution required, in the REFUTING direction: see resolveCombined for the
// argument (2026-08-20 round-three stress test, stress-m-forest-loss, finding 1 — "Brazil lost
// more forest than the other six countries combined" is false, and provably so from
// `loss_ha`'s own max (1,120,000) and sum (2,702,000) alone, without ever knowing which row is
// Brazil's).
const MORE_THAN_ANY_OTHER_RE = /\bmore\b[\s\S]{0,40}?\bthan\s+any\s+other\b/gi;
const MORE_THAN_COMBINED_RE = /\bmore\b[\s\S]{0,40}?\bthan\s+(?:the\s+other|all(?:\s+the)?)\b[\s\S]{0,40}?\bcombined\b/gi;

// The leading capitalised phrase of the CLAUSE a shape-8/9 marker sits in — the entity the claim
// is about, on the (measured, not invented) assumption that a short editorial sentence puts its
// subject first: "Brazil lost more forest than the other six countries combined" names Brazil
// before the verb, and "Germany reports the highest count; Sweden the lowest" names each entity
// at the start of its own clause, which is why ";", not just ". ! ?", ends a clause here — without
// it the second half of that exact sentence resolves to "Germany" again, the wrong entity, one
// clause too early. Returns `null` when the clause has no leading capital at all (a sentence
// starting lowercase, or a marker sitting at position 0).
function entitySubjectFor(text, markerStart) {
  let boundary = -1;
  for (const ch of [".", "!", "?", "\n", ";"]) {
    const idx = text.lastIndexOf(ch, markerStart - 1);
    if (idx > boundary) boundary = idx;
  }
  const prefix = text.slice(boundary + 1, markerStart);
  const m = /^\s*([A-ZÀ-Ý][\p{L}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}'’.-]*)*)/u.exec(prefix);
  return m ? m[1].trim() : null;
}

// A row is resolved for an entity name by matching it, case-insensitively, against ANY text-typed
// value in that row — the profile's own header (`rows: [{ [columnName]: value, ... }]`) names no
// fixed "entity column", and none of shapes 8/9's fixtures (a country code column beside a country
// name column, e.g.) agree on one either.
function resolveEntityRow(rows, entityName) {
  if (!rows || rows.length === 0) return null;
  const target = entityName.trim().toLowerCase();
  return (
    rows.find((row) =>
      Object.values(row).some((v) => typeof v === "string" && v.trim().toLowerCase() === target),
    ) ?? null
  );
}

// A column this shape refuses to treat a period as fully comparable within, when it marks a row's
// own period incomplete — a coverage count (`months_covered`) or a completeness flag (`complete`),
// the two shapes the round-three stress stories actually carry (stress-j-partial-year-permits,
// stress-o-museum-visits). Detected by the column's own NAME only, deliberately: this never reads
// a row's VALUE to guess at incompleteness in general (a `complete` column could as easily read
// "partial" or "no" — the point is the column exists at all, not what it says), which is what
// keeps this "narrow" rather than a general incompleteness detector no fixture asked for.
const COVERAGE_COLUMN_NAME_RE = /^months?_covered$|^coverage$|^complete(ness)?$/i;

function findCoverageColumn(columns) {
  return columns.find((c) => COVERAGE_COLUMN_NAME_RE.test(c.name)) ?? null;
}

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

  // Shape 8 — bare superlatives naming one entity. Each marker regex is tried in turn; a match
  // that overlaps a span an earlier, more specific pattern already claimed is skipped, the same
  // rule every other extraction in this function follows (this is what keeps SUPERLATIVE_HL_RE
  // from re-claiming the "highest"/"lowest" a SINCE_EN_RE or SUPERLATIVE_EVER_RE match already
  // owns).
  const SUPERLATIVE_MARKERS = [
    { re: SUPERLATIVE_MOST_RE, extreme: "max" },
    { re: LEADS_RE, extreme: "max" },
    { re: TOPS_RE, extreme: "max" },
  ];
  for (const { re, extreme } of SUPERLATIVE_MARKERS) {
    for (const m of text.matchAll(re)) {
      const span = { start: m.index, end: m.index + m[0].length };
      if (found.some((f) => overlaps(f, span))) continue;
      found.push({ kind: "superlative", extreme, entity: entitySubjectFor(text, span.start), raw: m[0], ...span });
    }
  }
  for (const m of text.matchAll(SUPERLATIVE_HL_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    const extreme = m[1].toLowerCase() === "lowest" ? "min" : "max";
    found.push({ kind: "superlative", extreme, entity: entitySubjectFor(text, span.start), raw: m[0], ...span });
  }

  // Shape 9 — "more than any other" (same question as shape 8) and "more than ... combined" (the
  // one shape decidable, in the refuting direction, from a column's own max and sum alone — see
  // resolveCombined). MORE_THAN_COMBINED_RE is tried first so a "more than the other N combined"
  // span is not first swallowed by MORE_THAN_ANY_OTHER_RE's own overlap check on a shared "more".
  for (const m of text.matchAll(MORE_THAN_COMBINED_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({ kind: "combined", entity: entitySubjectFor(text, span.start), raw: m[0], ...span });
  }
  for (const m of text.matchAll(MORE_THAN_ANY_OTHER_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({ kind: "superlative", extreme: "max", entity: entitySubjectFor(text, span.start), raw: m[0], ...span });
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
  const columns = Array.isArray(profile.columns) ? profile.columns : [];

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

  if (item.kind === "superlative") return resolveSuperlative(item, profile, claim, columns);
  if (item.kind === "combined") return resolveCombined(item, profile, claim, columns);

  if (!item.direction) {
    return { claim, verdict: "unverifiable", detail: "comparison direction word not recognised" };
  }

  // Partial periods, narrowly (finding 2). A "since"/"pair"/"ever" comparison reads two or more
  // YEARS as directly comparable; a coverage-marking column says at least one row in this profile
  // is not a full period, and this shape has no way to know whether the years THIS claim names are
  // among the affected ones without resolving rows this profile does not carry either — so it
  // refuses rather than guess, naming the column rather than the row.
  const coverageColumn = findCoverageColumn(columns);
  if (coverageColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `profile carries a "${coverageColumn.name}" column marking a row's period incomplete — a comparison over this data cannot be confirmed without knowing which rows it affects`,
    };
  }

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

// Shape 8 — a bare superlative naming one entity ("has the most", "the highest"/"the lowest",
// "leads", "tops", "more than any other"). Decidable only by resolving `item.entity` to its own
// row and reading its value against the column's extreme — there is no aggregate-only shortcut
// for this shape the way there is for shape 9's "combined" claim (see resolveCombined): knowing
// the column's max says nothing about whether the NAMED entity is the one holding it.
function resolveSuperlative(item, profile, claim, columns) {
  const coverageColumn = findCoverageColumn(columns);
  if (coverageColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `profile carries a "${coverageColumn.name}" column marking a row's period incomplete — a superlative over this data cannot be confirmed without knowing which rows it affects`,
    };
  }

  const yearColumn = findYearColumn(columns);
  const valueColumn = findValueColumn(columns, yearColumn);
  if (!valueColumn || valueColumn.min === null || valueColumn.min === undefined || valueColumn.max === null || valueColumn.max === undefined) {
    return {
      claim,
      verdict: "unverifiable",
      detail: "cannot identify a single numeric value column with a range in this profile to check this superlative against",
    };
  }

  if (!item.entity) {
    return { claim, verdict: "unverifiable", detail: "could not identify which entity this claim is about" };
  }

  const extreme = item.extreme === "min" ? valueColumn.min : valueColumn.max;
  const extremeName = item.extreme === "min" ? "minimum" : "maximum";
  const rows = Array.isArray(profile.rows) ? profile.rows : null;
  if (!rows || rows.length === 0) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `could not resolve "${item.entity}" to a row — profile has no row-level data`,
    };
  }

  const row = resolveEntityRow(rows, item.entity);
  if (!row) {
    return { claim, verdict: "unverifiable", detail: `could not resolve "${item.entity}" to a row in the frozen data` };
  }

  const value = Number(row[valueColumn.name]);
  if (Number.isNaN(value)) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `row for "${item.entity}" has no numeric value in column "${valueColumn.name}"`,
    };
  }

  const holds = value === extreme;
  return {
    claim,
    verdict: holds ? "supported" : "contradicted",
    detail: holds
      ? `"${item.entity}"'s own value in "${valueColumn.name}" (${value}) is the column's ${extremeName} (${extreme})`
      : `"${item.entity}"'s own value in "${valueColumn.name}" is ${value}, not the column's ${extremeName} (${extreme})`,
  };
}

// Shape 9 — "<entity> ... more than the other(s)/all the others ... combined". Unlike shape 8,
// this one is decidable in the REFUTING direction from the column's own MAX and SUM alone, with
// no row resolution needed at all: for ANY row to exceed the sum of every other row, in
// particular the row holding the column's own maximum must — so if even the maximum does not
// exceed the sum of the rest, no entity, named or not, could make this claim true, and it is
// "contradicted" regardless of which row the takeaway actually names (2026-08-20 round-three
// stress test, stress-m-forest-loss, finding 1). The positive direction (max DOES exceed the
// rest) still needs the row resolved, to confirm the NAMED entity is the one holding that max —
// a country whose own value is not the max cannot be "more than everyone else combined" even if
// some other row in the column could be.
function resolveCombined(item, profile, claim, columns) {
  const coverageColumn = findCoverageColumn(columns);
  if (coverageColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `profile carries a "${coverageColumn.name}" column marking a row's period incomplete — this comparison cannot be confirmed without knowing which rows it affects`,
    };
  }

  const yearColumn = findYearColumn(columns);
  const valueColumn = findValueColumn(columns, yearColumn);
  if (!valueColumn || valueColumn.max === null || valueColumn.max === undefined || valueColumn.sum === null || valueColumn.sum === undefined) {
    return {
      claim,
      verdict: "unverifiable",
      detail: "cannot identify a single numeric value column with a maximum and a sum in this profile to check this comparison against",
    };
  }

  const restSum = valueColumn.sum - valueColumn.max;
  if (valueColumn.max <= restSum) {
    return {
      claim,
      verdict: "contradicted",
      detail: `even the largest single value in "${valueColumn.name}" (${valueColumn.max}) does not exceed the sum of the rest (${restSum}) — no row in this column could make this claim true`,
    };
  }

  const rows = Array.isArray(profile.rows) ? profile.rows : null;
  const arithmeticNote = `the largest value in "${valueColumn.name}" (${valueColumn.max}) does exceed the rest (${restSum})`;
  if (!item.entity) {
    return { claim, verdict: "unverifiable", detail: `${arithmeticNote}, but no entity could be identified to confirm which row that is` };
  }
  if (!rows || rows.length === 0) {
    return { claim, verdict: "unverifiable", detail: `${arithmeticNote}, but "${item.entity}" cannot be resolved to a row — profile has no row-level data` };
  }
  const row = resolveEntityRow(rows, item.entity);
  if (!row) {
    return { claim, verdict: "unverifiable", detail: `${arithmeticNote}, but "${item.entity}" could not be resolved to a row` };
  }
  const value = Number(row[valueColumn.name]);
  const holds = !Number.isNaN(value) && value === valueColumn.max;
  return {
    claim,
    verdict: holds ? "supported" : "contradicted",
    detail: holds
      ? `"${item.entity}"'s own value in "${valueColumn.name}" (${value}) exceeds the sum of the rest (${restSum})`
      : `"${item.entity}"'s own value in "${valueColumn.name}" is ${Number.isNaN(value) ? "not numeric" : value}, not the column's maximum (${valueColumn.max}) needed for this comparison`,
  };
}

function checkNumericRanges(text, columns, consumedSpans) {
  const claims = [];
  const seen = new Set();
  const numericColumns = columns.filter((c) => c.type === "number" && c.min !== null && c.min !== undefined && c.max !== null && c.max !== undefined);
  const yearColumn = findYearColumn(columns);
  const coverageColumn = findCoverageColumn(columns);

  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    if (consumedSpans.some(([s, e]) => start < e && end > s)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);

    // One number reader, shared with `intake/scripts/profile.mjs` (finding 4) — a token this
    // regex matched but `readNumericToken` cannot resolve to one value is ONE unverifiable claim,
    // never two independent fragments silently re-tested against a column's range.
    const read = readNumericToken(raw);
    if (!read) continue;
    if (read.ambiguous) {
      claims.push({ claim: raw, verdict: "unverifiable", detail: read.reason });
      continue;
    }

    if (numericColumns.length === 0) {
      claims.push({ claim: raw, verdict: "unverifiable", detail: "profile has no numeric column with a range to check against" });
      continue;
    }

    const value = read.value;
    const inRange = numericColumns.filter((c) => value >= c.min && value <= c.max);
    if (inRange.length > 0) {
      // Partial periods, narrowly (finding 2). A bare numeral landing inside the YEAR column's
      // range reads as "this period is comparable to the others" — a coverage-marking column says
      // the profile itself carries at least one period that is not, and this check has no row
      // data to know whether THIS numeral is the affected one, so it refuses to confirm rather
      // than guess: the exact stress-j-partial-year-permits shape ("Building permits collapse in
      // 2026" — "2026" alone, trivially inside `year`'s range, used to come back "supported" with
      // `months_covered` recording that row at 3 of 12 months).
      if (coverageColumn && yearColumn && inRange.includes(yearColumn)) {
        claims.push({
          claim: raw,
          verdict: "unverifiable",
          detail: `"${raw}" falls inside "${yearColumn.name}"'s range, but the profile carries a "${coverageColumn.name}" column marking some period incomplete — a bare year cannot be confirmed comparable without knowing which row that is`,
        });
        continue;
      }
      claims.push({
        claim: raw,
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
        claim: raw,
        verdict: "supported",
        detail: `equals the sum of column "${summed.name}" (${summed.sum})`,
      });
      continue;
    }

    // Neither a member of a range nor a column total. That is this function failing to place the
    // number, which is not the same fact as the data refuting it — see the header.
    claims.push({
      claim: raw,
      verdict: "unverifiable",
      detail: `could not be placed in any numeric column's range or total (${numericColumns
        .map((c) => `"${c.name}" [${c.min}, ${c.max}]${c.sum === null || c.sum === undefined ? "" : `, sum ${c.sum}`}`)
        .join(", ")}) — this check has no way to confirm or refute it`,
    });
  }
  return claims;
}

// A takeaway split into sentences the crude way — on ". ! ?" followed by whitespace — for
// `computeCoverage` below. Not a natural-language sentence splitter (it does not know an
// abbreviation from a full stop); it only has to be good enough to tell one editorial claim apart
// from the next in the short, single-topic takeaways this function is ever handed.
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=\S)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// COVERAGE, so silence stops looking like confirmation (finding 3, and the theme of this whole
// redesign). A sentence is "evaluated" once it produced AT LEAST ONE claim of ANY verdict,
// including "unverifiable" — the distinction this exists to draw is not verdict-by-verdict, it is
// "this function looked at this sentence and had something, however inconclusive, to say about
// it" versus "this sentence produced nothing at all," which is exactly the difference between
// "Germany has the most." after this redesign (one unverifiable claim, naming "Germany" as
// unresolved) and before it (`[]`, indistinguishable from a takeaway with nothing checkable in it
// at all). `unevaluated` names those UNTOUCHED sentences verbatim, so a takeaway that is entirely
// unverifiable-but-checked reads differently, in this field, from one this function never had any
// shape for.
//
// THE CALLER THIS IS FOR: `propose.mjs`'s `resolveGrounding`, which folds `coverage` into the G1
// detail string it hands the journalist. A caller that reads `claims` and ignores `coverage` is
// exactly the next version of this defect — silence dressed as confirmation one layer up instead
// of one layer down — which is why `resolveGrounding` is where this is actually read, not left as
// a field nothing consults.
function computeCoverage(text, claims) {
  const sentences = splitIntoSentences(text);
  const unevaluated = sentences.filter((sentence) => !claims.some((c) => sentence.includes(c.claim)));
  return {
    sentences: sentences.length,
    evaluated: sentences.length - unevaluated.length,
    unevaluated,
  };
}

// Returns `{ claims, coverage }` — see `computeCoverage` above for what `coverage` reports and
// who reads it. `claims` keeps its own established shape (one `{ claim, verdict, detail }` entry
// per recognised claim); this wraps it rather than changing it, so every existing reader of the
// array itself only has to learn the one extra level.
export function groundTakeaway(takeaway, profile) {
  if (!takeaway || typeof takeaway !== "string") {
    return { claims: [], coverage: { sentences: 0, evaluated: 0, unevaluated: [] } };
  }
  const p = profile ?? {};
  const columns = Array.isArray(p.columns) ? p.columns : [];

  const comparisons = extractComparisons(takeaway);
  const claims = comparisons.map((item) => resolveComparison(item, p));

  const consumedSpans = comparisons.map((c) => [c.start, c.end]);
  claims.push(...checkNumericRanges(takeaway, columns, consumedSpans));

  return { claims, coverage: computeCoverage(takeaway, claims) };
}
