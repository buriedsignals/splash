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
// ROUND FOUR (2026-08-21) opened HERE for the third consecutive time — five of the round's six
// leading findings were this file — and the lesson of the three rounds is that adding a sixth
// SHAPE would have been the same mistake a fourth time. What changed instead is WHAT A VERDICT IS
// ALLOWED TO MEAN:
//   - a numeral that merely falls inside a column's range is no longer "supported". It is
//     `consistent`, a verdict of its own that `propose.mjs`'s `groundingScalar` cannot close G1
//     on. `233` really is inside `incidents [96, 412]`, and so is `100`, the "k" of "100k", and
//     neither is evidence for the sentence it sits in (see `checkNumericRanges`);
//   - rows come from the FROZEN CSV now, not from a `profile.rows` no profile has ever carried,
//     so shape 8 decides instead of always refusing (see `readFrozenRows`);
//   - the superlative vocabulary is a stated list rather than four phrases, and a word whose
//     direction the data cannot supply ("worst") is REFUSED BY NAME rather than being invisible
//     (see `SUPERLATIVE_WORD_RE` and `resolveSuperlative`);
//   - the column a claim is about is read off the sentence when a table carries several measures,
//     and named when it cannot be (see `chooseValueColumn`) — nine of the twenty-one frozen
//     stories used to fail every superlative for this reason alone;
//   - a column the PROFILER refused is named, with its reason, on every claim it disarmed (see
//     `refusedColumnNote`);
//   - `coverage` gained `decided`, so a caller can tell a takeaway the data settled from one it
//     merely had a shape for.
//
// ROUND FIVE (2026-08-21) opened HERE for the FOURTH consecutive time, and this round every
// defect was in code round four had just written. What changed is not another shape and not
// another verdict — it is WHAT EVIDENCE A VERDICT IS ALLOWED TO REST ON:
//   - an "equals" may not be wider than the number it compares. `matchesAggregate`'s absolute
//     floor of 0.5 declared `0.61` — stress-u's 2025 AREA — equal to the sum of `volume_km3`
//     (0.482), 27% away, under `supported`. The window is now half a unit of the numeral's OWN
//     last written digit, or the relative 1%, whichever is wider, and never more than the smaller
//     of the two numbers being compared (see `roundingWindowOf`);
//   - a column is named by a WORD, not by a fragment of another. "surveyed" was matching the
//     refused column `survey_date`, so the claim the sentence actually made was never attempted —
//     including a FALSE one the frozen data refutes, which then closed G1 as `unverifiable`
//     (see `wordAppearsIn`);
//   - a numeral is placed against the column its own SENTENCE names, never against whichever
//     column happens to contain it: a survey year was "placed" inside a count of households, and
//     two clauses of one takeaway were decided against two different columns (see
//     `checkNumericRanges`, and `chooseValueColumn`'s new `named`);
//   - a bare calendar year is a PERIOD, and belongs to the period column or to nothing
//     (`looksLikeCalendarYear`);
//   - a stated multiplier is READ — "1.12 million" against a column in base units — but as an
//     ALTERNATIVE reading beside the numeral as written, because the column's own unit may
//     already carry the scale ("34 millions de tonnes" against `glace_fondue_mt`, which sums to
//     34). The table declares the four languages this tree has frozen a story in, and says so
//     rather than missing the fifth in silence (see `MULTIPLIER_WORDS`);
//   - a run of digits glued to a word on its left is not a number a sentence states
//     (`Commune-063` produced the claim `-063`, `consumption_m3` produced `3`);
//   - and a sentence boundary needs whitespace after it, so the "." inside "0.61" stops ending
//     one (`isSentenceEnd`, shared by `sentenceAround` and `clauseStart`).
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
//     rows: [{ [columnName]: value, ... }, ...],  // optional row-level data. NO frozen profile in
//                                                  // this tree carries it (`profileTable` never
//                                                  // writes it — see `intake/scripts/freeze.mjs`),
//                                                  // which is why `groundTakeaway`'s third
//                                                  // argument now accepts `{ csv }`: the text of
//                                                  // the story's own frozen `source/data.csv`,
//                                                  // read into rows by `readFrozenRows`. A
//                                                  // profile carrying its own `rows` still wins.
//                                                  // With NEITHER, any claim that needs a
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
//   1a. A numeric token in the takeaway that falls INSIDE the range of some numeric column —
//       `consistent`, NEVER `supported` (round four, finding 1): the numeral is placed, the
//       claim it sits in is not confirmed.
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
//   8. A SUPERLATIVE naming one entity — "<X> has the most", "<X> has/reports the highest/lowest/
//      largest/smallest/fewest/greatest/…", "<X> leads", "<X> tops", "<X> est en tête", "<X> ...
//      more than any other". Decidable ONLY by resolving <X> to its own row and reading its value
//      against the column's own max (or min) — see `resolveSuperlative`. Rows come from the
//      frozen CSV (`readFrozenRows`); where none was handed over, or <X> matches no row, or <X>
//      matches SEVERAL rows (a long-format table), or the word carries a polarity the data cannot
//      supply ("the worst"), or it names a rank rather than the extreme ("the second shortest"),
//      this is "unverifiable" NAMING what was missing — never `[]` (2026-08-20/21 stress test, finding 3: "Germany has the most." and
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

// ROWS, AND WHERE THEY COME FROM (round-four finding 2, 2026-08-21).
//
// Shape 8 has always needed `profile.rows`, and `intake`'s `profileTable` has never written one.
// Measured across the 21 frozen stories in `stories/`: every superlative ever put to this check,
// in every story, came back "unverifiable" for that one reason — a shape that could not decide
// anything, printing an honest-looking refusal. Three ways out were on the table: extend the
// profile, hand the check the frozen CSV, or delete the shape.
//   - Extending the profile decides nothing for any story that already exists: every
//     `source/profile.json` in the tree is FROZEN and would keep its rowless shape.
//   - Deleting the shape puts a false superlative back to being invisible, which is the defect.
// So the check reads the frozen TABLE itself. The caller passes `{ csv }` — the text of the
// story's own `source/data.csv` — and the rows are parsed here, read-only. Nothing is written and
// nothing is re-profiled; a caller with no CSV to hand behaves exactly as it did before, and a
// profile that carries its own `rows` still wins over the CSV.

// One CSV line, split on commas outside double quotes, with doubled quotes read as one quote.
// Deliberately small: this reads a table `intake` already froze and `profileTable` already
// accepted, not arbitrary CSV from the wild.
function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/**
 * The frozen table as rows — `[{ [columnName]: value }, ...]`, the exact shape shapes 8 and 9
 * already expected `profile.rows` to have. Every cell is read by `readNumericToken`, the SAME
 * rule `intake/scripts/profile.mjs` types a column by, so a cell this project calls ambiguous
 * ("1,7") stays text here rather than becoming a number by a second, looser rule. A cell that is
 * not a numeral at all — `stress-r`'s corrupt "term378" — stays exactly as written.
 */
export function readFrozenRows(csvText) {
  if (typeof csvText !== "string" || csvText.trim() === "") return [];
  const lines = csvText.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((name, i) => {
      const cell = cells[i] ?? "";
      const read = readNumericToken(cell);
      row[name] = read && !read.ambiguous ? read.value : cell;
    });
    return row;
  });
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT LANGUAGES THIS FILE'S NAME-BASED LEXICONS READ, AND WHAT THEY DO WHEN THEY MEET ANOTHER.
//
// ROUND FIVE, finding X1 — the round's structural theme. Every lexicon in this toolchain that
// decides something by matching WORDS was written against the language its first story happened to
// be in. `stress-x-tunisian-water`'s takeaway asserts `أكثر من غيرها` — "more than any other" — and
// the superlative vocabulary below produced NO CLAIM AT ALL for it: the one thing that beat asserts
// was never checked, and nothing anywhere said so. That is worse than a wrong verdict, because a
// wrong verdict is arguable and silence reads as a clean bill.
//
// ONE POLICY, applied to every name-based lexicon in this toolchain (`palette`'s
// `SUBJECT_CONVENTIONS`, `intake`'s denominator tokens, `isShareColumn` below, the superlative and
// comparison vocabularies below, `storyboard`'s `ATTRIBUTION_CUES`):
//
//   1. DECLARE the languages. `LEXICON_LANGUAGES` is that declaration, in code, where a reader of
//      the file meets it before the tables — the shape `MULTIPLIER_WORDS` above already took.
//   2. CARRY every language this tree has frozen a story in. English, French, Greek, Arabic.
//   3. When the text handed over is written in a script NONE of those languages uses, do not return
//      a silent negative. NAME the script that could not be read.
//
// The third rule is the one that matters, because the second can never be finished: a lexicon that
// has been taught four languages still meets a fifth. `scriptsNotRead` is how this file obeys it,
// and `groundTakeaway`'s `coverage.unreadable` is where the answer surfaces.
export const LEXICON_LANGUAGES = ["English", "French", "Greek", "Arabic"];

/** The languages, written the way a sentence handed to a journalist says them. */
export const LEXICON_LANGUAGES_SAID = "English, French, Greek and Arabic";

// The scripts those four languages are written in. A takeaway using only these is a takeaway this
// file's vocabularies are entitled to answer "no claim here" about.
const SCRIPTS_READ = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Arabic}]/u;

// THE LETTERS THOSE FOUR LANGUAGES ARE ACTUALLY WRITTEN WITH — the same declaration one level
// finer than `SCRIPTS_READ`, because that is the level round six's defect lived on. English is
// ASCII; French adds its own diacritics and nothing else; Greek and Arabic are whole scripts, and
// no other language in this tree is written in either. Anything else in the Latin script is a
// letter none of the four uses, which is the only thing a character test can honestly say.
const LETTERS_READ = /[a-z\u00e0\u00e2\u00e4\u00e6\u00e7\u00e8\u00e9\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u0153\u00f9\u00fb\u00fc\u00ff\p{Script=Greek}\p{Script=Arabic}]/iu;

// Named, not enumerated by Unicode block: a reader of a refusal needs the script's NAME, and a
// bare "some characters were unreadable" is the silence this whole mechanism exists to remove.
// The list is the writing systems a newsroom in this tree's own reach could plausibly file in;
// anything outside it lands on the catch-all below, which still names the codepoint.
const NAMED_SCRIPTS = [
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Thai", /\p{Script=Thai}/u],
  ["Armenian", /\p{Script=Armenian}/u],
  ["Georgian", /\p{Script=Georgian}/u],
  ["Ethiopic", /\p{Script=Ethiopic}/u],
];

/**
 * EVERY SCRIPT IN THIS TEXT THAT NONE OF `LEXICON_LANGUAGES` IS WRITTEN IN.
 *
 * Empty is the ordinary answer and means "this file's vocabularies were in a position to read this".
 * A non-empty answer is what turns "no claim found" from a verdict into a stated limit.
 */
export function scriptsNotRead(text) {
  const value = String(text ?? "");
  const found = NAMED_SCRIPTS.filter(([, re]) => re.test(value)).map(([name]) => name);
  if (found.length > 0) return found;
  // A letter this file can neither read nor name. Reported by its own codepoint rather than
  // swallowed — the point is never to answer in silence.
  const stray = [...value].find((ch) => /\p{L}/u.test(ch) && !SCRIPTS_READ.test(ch));
  return stray ? [`U+${stray.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`] : [];
}

/**
 * EVERY LETTER IN THIS TEXT THAT NONE OF `LEXICON_LANGUAGES` IS WRITTEN WITH.
 *
 * ROUND SIX, findings C1 and AD1 — `scriptsNotRead` one level finer, and the level the defect
 * actually lived on. Polish is written in the Latin script, so the script net returns `[]` for
 * `ludno\u015b\u0107` and every name-based lexicon here then gave a confident negative about a word it had
 * never been taught. Measured by the controller on one table and one sentence, with only the
 * denominator column's NAME changing language: `population` came back `unverifiable` (round four's
 * raw-count downgrade) and `ludno\u015b\u0107` came back `supported`. The missing word did not withhold a
 * prompt, it RAISED the verdict above the one an unreadable claim gets, which is the sharpest form
 * a silent lexicon gap can take.
 *
 * The four declared languages are written with a repertoire that can be written down, and
 * `LETTERS_READ` is it. A letter outside that repertoire is a letter none of the four is written
 * with — Polish `\u0144`, Czech `\u0159`, Turkish `\u011f`, Vietnamese `\u01a1`, Spanish `\u00f1`, German `\u00df` — and naming
 * it is how a check says "this is a fifth language" without being taught a fifth language. Letters
 * in a script `scriptsNotRead` already names are left to it, so the two nets report a gap once
 * between them and never twice.
 *
 * THE LIMIT, stated because it is real: an undeclared language written in plain ASCII — Dutch
 * `bevolking`, Italian `popolazione`, Indonesian `penduduk` — passes both nets, and no character
 * test can ever see it. So the callers of this function do not pretend otherwise: where a NEGATIVE
 * answer carries weight they name the four languages the negative was given in, in the detail the
 * journalist reads, rather than leaving that limit where only a maintainer would find it.
 */
export function lettersNotRead(text) {
  const value = String(text ?? "");
  const strange = [];
  for (const character of value) {
    if (!/\p{L}/u.test(character)) continue;
    if (!SCRIPTS_READ.test(character)) continue;
    if (LETTERS_READ.test(character)) continue;
    if (!strange.includes(character)) strange.push(character);
  }
  return strange;
}
// ─────────────────────────────────────────────────────────────────────────────────────────────

// The relative slack a rounded total is allowed against the exact sum of its column, so a takeaway
// writing "34" against a column summing to 33.8 still resolves.
const AGGREGATE_TOLERANCE = 0.01;

/**
 * HOW MUCH ROUNDING THE NUMERAL ITSELF ADMITS TO — half a unit of its own last written digit.
 *
 * ROUND FIVE, finding U1. This used to be a flat absolute floor of 0.5, and its comment gave the
 * right reason for it ("so a small column (sum 9) is not held to a tolerance of 0.09") and the
 * wrong shape: 0.5 is the rounding window of an INTEGER, and the floor applied it to every numeral
 * whatever its precision. Measured on the frozen `stress-u-rhone-glacier`: `0.61` — the glacier's
 * 2025 AREA — was declared equal to the sum of `volume_km3` (0.482), 27% away, under `supported`,
 * the one verdict `groundingScalar` closes G1 on. For a sum of 0.482 the window was ±0.5, so any
 * value from −0.018 to 0.982 "equalled" it, and the smaller the column the wider the relative
 * window, without limit. **7 of the 27 frozen stories carry a column summing under 50.**
 *
 * A journalist writing "34" for a total of 33.8 has rounded to the unit, and half a unit is
 * exactly what they may be out by. A journalist writing "0.61" has rounded to the hundredth, and
 * half a hundredth is exactly what THEY may be out by. So the window is read off the numeral as
 * written rather than fixed: "34" → 0.5, "0.61" → 0.005, "14,205" → 0.5, "1.7" → 0.05. A token
 * with an exponent or nothing after a separator falls back to the integer window.
 */
function roundingWindowOf(raw) {
  const decimals = /^[+-]?[\d,]*\.(\d+)$/.exec(String(raw).trim());
  return decimals ? 0.5 * Math.pow(10, -decimals[1].length) : 0.5;
}

/**
 * Whether `value`, as the journalist WROTE it (`raw`), reads as the total of a column summing to
 * `sum`. Two bounds, and a match has to satisfy both:
 *   - the rounding window above, OR the relative slack, whichever is wider — a big column is
 *     allowed 1%, a small one is allowed the precision its own numeral was written to;
 *   - and NEVER more than the smaller of the two numbers being compared, which is the round-five
 *     rule stated plainly: the tolerance may not exceed the value it is comparing. Without it,
 *     "0" still "equals" a column summing to 0.4.
 */
function matchesAggregate(value, sum, roundingWindow) {
  if (sum === null || sum === undefined || !Number.isFinite(sum)) return false;
  const window = Math.max(roundingWindow ?? 0.5, Math.abs(sum) * AGGREGATE_TOLERANCE);
  const cannotExceed = Math.min(Math.abs(value), Math.abs(sum));
  return Math.abs(value - sum) <= Math.min(window, cannotExceed);
}

// A SCALE WORD STANDING BESIDE A NUMERAL. Round five, finding X7: journalists write "142 million
// cubic metres" and frozen tables store 142000000, so the one numeric reading this file can make
// was unavailable for the commonest way a number appears in a takeaway — "142" came back
// "could not be placed" for a reason that had nothing to do with the data.
//
// It is read as an ALTERNATIVE reading, never as a replacement, and that is the whole design.
// The Milan Cortina run's own takeaway says "34 millions de tonnes" against `glace_fondue_mt`,
// a column already IN megatonnes whose sum is exactly 34: multiplying there would destroy a
// reading that is correct. So both the numeral as written and the numeral times its stated scale
// are tried, and the detail says which one placed it. Where two readings would place it two
// different ways, neither is chosen — that is an ambiguity for the journalist, not a verdict.
//
// THE LANGUAGES THIS TABLE DECLARES: English, French, Greek and Arabic — the four this tree has
// frozen a story in. A scale word outside them is NOT read, and the numeral is then checked as
// written, which is exactly what this file did for every language before this round. That limit
// is stated in SKILL.md rather than left to be discovered. `billion` carries BOTH factors,
// because it is 10^9 in English and 10^12 in French and nothing in a takeaway settles which.
const MULTIPLIER_WORDS = new Map([
  ["thousand", [1e3]],
  ["thousands", [1e3]],
  ["million", [1e6]],
  ["millions", [1e6]],
  ["billion", [1e9, 1e12]],
  ["billions", [1e9, 1e12]],
  ["trillion", [1e12]],
  ["trillions", [1e12]],
  ["mille", [1e3]],
  ["milliard", [1e9]],
  ["milliards", [1e9]],
  ["\u03c7\u03b9\u03bb\u03b9\u03ac\u03b4\u03b5\u03c2", [1e3]],
  ["\u03b5\u03ba\u03b1\u03c4\u03bf\u03bc\u03bc\u03cd\u03c1\u03b9\u03bf", [1e6]],
  ["\u03b5\u03ba\u03b1\u03c4\u03bf\u03bc\u03bc\u03cd\u03c1\u03b9\u03b1", [1e6]],
  ["\u03b4\u03b9\u03c3\u03b5\u03ba\u03b1\u03c4\u03bf\u03bc\u03bc\u03cd\u03c1\u03b9\u03b1", [1e9]],
  ["\u0623\u0644\u0641", [1e3]],
  ["\u0645\u0644\u064a\u0648\u0646", [1e6]],
  ["\u0645\u0644\u0627\u064a\u064a\u0646", [1e6]],
  ["\u0645\u0644\u064a\u0627\u0631", [1e9]],
  ["\u0645\u0644\u064a\u0627\u0631\u0627\u062a", [1e9]],
]);

// The scale word immediately after a numeral, if this table declares it. Only ONE word, and only
// across spaces — "142 million" and never "142 cubic metres of the million".
const MULTIPLIER_AFTER_RE = /^[ \u00a0]*([\p{L}]+)/u;

function multiplierAfter(text, end) {
  const m = MULTIPLIER_AFTER_RE.exec(text.slice(end));
  if (!m) return null;
  const factors = MULTIPLIER_WORDS.get(m[1].toLowerCase());
  if (!factors) return null;
  return { word: m[1], factors, end: end + m[0].length };
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

// ROUND SIX — THE SAME TWO SHAPES WITH THE DIRECTION WORD SECOND. Both patterns above demand the
// comparative BEFORE the first year, so "There were fewer kilns in 2020 than in 1990" was decided
// and "Kilns in 2020 were fewer than in 1990" produced no comparison at all — its two years fell
// through to the per-numeral range check and came back `consistent`, which decides nothing. English
// puts the subject first at least as often as the comparative, and the frozen corpus is full of it.
// The capture order differs (year, direction, year), so `extractComparisons` reads these separately.
const SINCE_EN_SECOND_RE =
  /\bin\s+(\d{4})\b[\s\S]{0,120}?\b(less|fewer|lower|below|smaller|more|higher|greater|above|larger)\b[\s\S]{0,60}?\bthan\b[\s\S]{0,60}?\bsince\s+(\d{4})\b/gi;

const PAIR_EN_SECOND_RE =
  /\bin\s+(\d{4})\b[\s\S]{0,120}?\b(less|fewer|lower|below|smaller|more|higher|greater|above|larger)\b[\s\S]{0,60}?\bthan\b[\s\S]{0,40}?\bin\s+(\d{4})\b/gi;

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

// THE SAME NAMES IN THE OTHER THREE LANGUAGES `LEXICON_LANGUAGES` DECLARES (round five, finding X1).
// Kept as whole-name STEMS matched against the column's own name tokens rather than folded into the
// substring regex above, and deliberately: `part` and `taux` are three- and four-letter French words
// that appear inside a dozen ordinary column names ("department", "taux" inside nothing, but "part"
// inside "partial", "departure", "participants"), and a fragment match on the refused-column path is
// the exact defect round five's finding T12 closed one function over. A stem is matched against a
// whole token, with `wordAppearsIn`'s own unicode boundaries, never as a substring of a longer word.
const SHARE_COLUMN_NAME_TOKENS = [
  "part",
  "parts",
  "pourcentage",
  "pourcentages",
  "taux",
  "proportion",
  "proportions",
  "\u03c0\u03bf\u03c3\u03bf\u03c3\u03c4\u03cc",
  "\u03c0\u03bf\u03c3\u03bf\u03c3\u03c4\u03ac",
  "\u03bc\u03b5\u03c1\u03af\u03b4\u03b9\u03bf",
  "\u0646\u0633\u0628\u0629",
  "\u0627\u0644\u0646\u0633\u0628\u0629",
  "\u0646\u0633\u0628",
  "\u0627\u0644\u0645\u0626\u0648\u064a\u0629",
  "\u0645\u0626\u0648\u064a\u0629",
  "\u062d\u0635\u0629",
  "\u0627\u0644\u062d\u0635\u0629",
];

function isShareColumn(column) {
  if (column.unit === "%" || SHARE_COLUMN_NAME_RE.test(column.name)) return true;
  const tokens = String(column.name)
    .split(NAME_TOKEN_SPLIT_RE)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  return tokens.some((token) => SHARE_COLUMN_NAME_TOKENS.includes(token));
}

// What "the whole" means for a share/percentage column, and how much rounding slack a takeaway
// is allowed before its total reads as genuinely off — mirrors AGGREGATE_TOLERANCE's own floor,
// not invented fresh for this shape.
const TOTALITY_WHOLE_VALUE = 100;
const TOTALITY_TOLERANCE = 1;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// ROUND SIX (2026-08-22), finding Z2 \u2014 THE RELATION A NUMERAL SITS UNDER, NOT ONLY THE NUMERAL.
//
// The round's headline, measured by the controller on the frozen `stress-z-budget-parts`:
//
//     "La somme des parts est sup\u00e9rieure \u00e0 100."   ("the sum of the parts is GREATER than 100")
//       -> supported | equals the sum of column "part_pct" (100)
//
// A sentence that DENIES equality was confirmed because the numeral in it matched the column's
// own sum. The check read the number and not the relation. So a numeral matched to a column TOTAL
// is now read together with the comparator that governs it: an equality is evidence for a sentence
// that asserts equality, and evidence AGAINST one that asserts a strict inequality.
//
// The vocabulary declares its languages, exactly as `MULTIPLIER_WORDS` and `SHARE_COLUMN_NAME_TOKENS`
// do \u2014 English, French, Greek and Arabic, the four `LEXICON_LANGUAGES` names. A comparator outside
// them is not read, and the numeral is then decided as an equality, which is what this file did for
// every language before this round; the limit is stated in SKILL.md rather than left to be found.
// `at-most`/`at-least` are tried BEFORE the strict pair, because "no more than" ends with "more
// than" and the anchored match would otherwise read the wrong relation out of the same words.
const RELATION_WINDOW = 48;

const RELATION_VOCABULARY = [
  [
    "at-least",
    ["at least", "no fewer than", "no less than", "au moins", "pas moins de", "\u03c4\u03bf\u03c5\u03bb\u03ac\u03c7\u03b9\u03c3\u03c4\u03bf\u03bd", "\u0644\u0627 \u064a\u0642\u0644 \u0639\u0646"],
  ],
  ["at-most", ["at most", "no more than", "au plus", "\u03c4\u03bf \u03c0\u03bf\u03bb\u03cd", "\u0644\u0627 \u064a\u0632\u064a\u062f \u0639\u0646"]],
  [
    "greater",
    [
      "more than", "greater than", "larger than", "higher than", "over", "above", "exceeds",
      "exceed", "exceeded", "beyond",
      "plus de", "plus que", "sup\u00e9rieur \u00e0", "sup\u00e9rieure \u00e0", "sup\u00e9rieurs \u00e0", "sup\u00e9rieures \u00e0",
      "d\u00e9passe", "d\u00e9passent", "au-del\u00e0 de",
      "\u03c0\u03ac\u03bd\u03c9 \u03b1\u03c0\u03cc", "\u03c0\u03b5\u03c1\u03b9\u03c3\u03c3\u03cc\u03c4\u03b5\u03c1\u03bf \u03b1\u03c0\u03cc", "\u03c0\u03b5\u03c1\u03b9\u03c3\u03c3\u03cc\u03c4\u03b5\u03c1\u03b1 \u03b1\u03c0\u03cc", "\u03c5\u03c0\u03b5\u03c1\u03b2\u03b1\u03af\u03bd\u03b5\u03b9",
      "\u0623\u0643\u062b\u0631 \u0645\u0646", "\u064a\u062a\u062c\u0627\u0648\u0632", "\u062a\u062a\u062c\u0627\u0648\u0632", "\u0641\u0648\u0642",
    ],
  ],
  [
    "less",
    [
      "less than", "fewer than", "smaller than", "lower than", "under", "below",
      "moins de", "moins que", "inf\u00e9rieur \u00e0", "inf\u00e9rieure \u00e0", "inf\u00e9rieurs \u00e0", "inf\u00e9rieures \u00e0",
      "en dessous de",
      "\u03ba\u03ac\u03c4\u03c9 \u03b1\u03c0\u03cc", "\u03bb\u03b9\u03b3\u03cc\u03c4\u03b5\u03c1\u03bf \u03b1\u03c0\u03cc", "\u03bb\u03b9\u03b3\u03cc\u03c4\u03b5\u03c1\u03b1 \u03b1\u03c0\u03cc",
      "\u0623\u0642\u0644 \u0645\u0646", "\u062f\u0648\u0646",
    ],
  ],
];

// Every phrase, compiled once, anchored to the END of the text that precedes the numeral: only
// whitespace (and the punctuation a language puts between a comparator and its number) may sit
// between the words and the digits, so nothing else in the sentence can be read as governing it.
const RELATION_PHRASE_META_RE = /[.*+?^${}()|[\]\\]/g;

const RELATION_MATCHERS = RELATION_VOCABULARY.map(([kind, phrases]) => [
  kind,
  phrases.map(
    (phrase) =>
      new RegExp(
        `(?<![\\p{L}\\p{N}])${phrase.replace(RELATION_PHRASE_META_RE, "\\$&").replace(/ /g, "\\s+")}\\s*$`,
        "iu",
      ),
  ),
]);

/** The comparator immediately governing the numeral that starts at `start`, or `null`. */
function relationBefore(text, start) {
  const before = text.slice(Math.max(0, start - RELATION_WINDOW), start);
  for (const [kind, matchers] of RELATION_MATCHERS) {
    for (const re of matchers) {
      const m = re.exec(before);
      if (m) return { kind, phrase: m[0].trim() };
    }
  }
  return null;
}

/** Whether a column's own total satisfies the relation the sentence asserted about `value`. */
function relationHolds(kind, total, value) {
  if (kind === "greater") return total > value;
  if (kind === "less") return total < value;
  if (kind === "at-least") return total >= value;
  if (kind === "at-most") return total <= value;
  return true;
}

/** The relation as a journalist reads it back, so a refusal quotes the claim it refused. */
function relationSaid(kind, value) {
  if (kind === "greater") return `greater than ${value}`;
  if (kind === "less") return `less than ${value}`;
  if (kind === "at-least") return `at least ${value}`;
  return `at most ${value}`;
}

// Floating-point addition over a frozen column produces 109.69999999999999 for six one-decimal
// cells. A total a journalist reads has to be written the way their own table writes it.
function tidyNumber(value) {
  return Number(Number(value).toFixed(10));
}

/**
 * A COLUMN'S TOTAL, OR ITS TWO TOTALS (round six, finding Z2's other half).
 *
 * `stress-z-budget-parts`'s `part_pct` reaches 100 only because a \u22129.7 provision write-back cancels
 * a +9.7 overshoot: its positive members sum to 109.7. A column carrying a negative member has a
 * NET total and a total of its positive parts, and those are two different numbers a sentence could
 * mean. Where the frozen rows are available both are computed and reported; where they are not, the
 * column's own `min` still says the column is signed, and that is said rather than passed over.
 */
function columnTotals(column, rows) {
  const net = { kind: "net", value: tidyNumber(column.sum) };
  if (!Number.isFinite(column.min) || column.min >= 0) return [net];
  const values = (Array.isArray(rows) ? rows : [])
    .map((r) => r[column.name])
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return [net];
  const positive = tidyNumber(values.filter((v) => v > 0).reduce((a, b) => a + b, 0));
  const negative = tidyNumber(values.filter((v) => v < 0).reduce((a, b) => a + b, 0));
  return [net, { kind: "positive", value: positive, negative }];
}

/** What a signed column has to say about itself, whenever one of its totals is offered as evidence. */
function cancellationNote(column, totals) {
  if (totals.length < 2) {
    if (Number.isFinite(column.min) && column.min < 0) {
      return ` \u2014 and note that "${column.name}" carries a negative member (its minimum is ${column.min}), so this total is a NET and not a sum of parts`;
    }
    return "";
  }
  const [net, positive] = totals;
  return ` \u2014 and note that "${column.name}" carries a negative member: its positive members sum to ${positive.value} and its negative members to ${positive.negative}, so its total of ${net.value} is a NET, reached by CANCELLATION, and not a sum of parts`;
}

// A number read out of a frozen cell and a number read out of a takeaway are the same number when
// they agree to the precision either was written to \u2014 never by `===` alone, which no decimal survives.
function sameNumber(a, b) {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Whether the frozen table holds `value` in `column`, verbatim \u2014 and which row does. */
function rowHolding(rows, column, value) {
  if (!Array.isArray(rows)) return null;
  return rows.find((r) => typeof r[column.name] === "number" && sameNumber(r[column.name], value)) ?? null;
}

/**
 * THE FROZEN TABLE SETTLES A THOUSANDS SEPARATOR (round six, beats AA and AC).
 *
 * `readNumericToken` refuses "238,530" because a lone token carries no evidence for itself: it
 * could be 238530 with a US/UK grouping or 238.530 with a decimal comma. That refusal is right
 * about the token and wrong about the SITUATION \u2014 this file is never handed a token alone, it is
 * handed a token and the frozen table the sentence is about, and the table settles it. On
 * `stress-aa-salary-spread`, 238530 is a cell of `annual_salary_eur` and 238.53 is nowhere; on
 * `stress-j-partial-year-permits`, 14205 is `permits_issued`'s own minimum and 14.205 is nowhere.
 *
 * Exactly ONE reading held by the table settles the numeral; two readings, or none, leave it
 * ambiguous \u2014 which is what keeps a French decimal comma from being read as a grouping wherever the
 * table cannot tell them apart. A token with more than one comma group settles itself: no language
 * writes two decimal commas in one number.
 *
 * `readNumericToken` itself is NOT touched. It is copied byte-for-byte from `intake/scripts/profile.mjs`
 * (registered in `skills/splash/test/guard-copies-parity.test.ts`'s `COPIES`) and it answers a
 * question about a token; this answers a different question, about a token AND a table, and lives
 * only here because only this file has the table.
 */
export function settleGroupedNumeral(raw, columns, rows) {
  const written = String(raw).trim();
  if (!THOUSANDS_RE.test(written) || written.includes(".")) return null;
  const grouped = Number(written.replace(/,/g, ""));
  const commas = (written.match(/,/g) ?? []).length;
  if (commas > 1) {
    return {
      value: grouped,
      settledNote: ` (reading "${written}" as ${grouped}: a numeral carrying two comma groups can only be a thousands grouping)`,
    };
  }
  const asDecimal = Number(written.replace(",", "."));
  const numeric = columns.filter((c) => c.type === "number");
  const heldBy = (candidate) =>
    numeric.find(
      (c) =>
        (Number.isFinite(c.min) && sameNumber(c.min, candidate)) ||
        (Number.isFinite(c.max) && sameNumber(c.max, candidate)) ||
        (Number.isFinite(c.sum) && sameNumber(c.sum, candidate)) ||
        rowHolding(rows, c, candidate) !== null,
    ) ?? null;
  const groupedIn = heldBy(grouped);
  const decimalIn = heldBy(asDecimal);
  if (groupedIn && !decimalIn) {
    return {
      value: grouped,
      settledNote: ` (reading "${written}" as ${grouped}: the frozen table holds that number in column "${groupedIn.name}" and holds ${asDecimal} nowhere, which is what settles the comma)`,
    };
  }
  if (decimalIn && !groupedIn) {
    return {
      value: asDecimal,
      settledNote: ` (reading "${written}" as the decimal ${asDecimal}: the frozen table holds that number in column "${decimalIn.name}" and holds ${grouped} nowhere, which is what settles the comma)`,
    };
  }
  return null;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// Shape 8 — a SUPERLATIVE naming one entity: "the most", "the highest"/"the lowest" (bare, no
// "since" or "ever" — SUPERLATIVE_SINCE_RE and SUPERLATIVE_EVER_RE above already own those two),
// "leads", "tops". Every one of these reduces to the same question — does the named entity's own
// row hold the column's max (or min, for "lowest")? — decidable only once that row is resolved
// (see resolveSuperlative for what happens when the profile carries no `rows` to resolve it
// against, which is every frozen profile this branch has seen so far).
//
// ROUND FOUR, finding 3: this vocabulary was FOUR phrases — "has the most", "the highest",
// "the lowest", "leads", "tops" — and 8 of the 12 ordinary superlatives the round-four corpus
// carries were invisible to it, including `the worst`, the false headline the whole round was
// built around ("Centro has the worst safety record in the city." → coverage
// {sentences: 1, evaluated: 0}). Invisible is the one thing this may not be, so the vocabulary is
// now a stated list, split three ways by what the data can actually settle:
//   - a MAXIMUM word ("most", "highest", "largest", …) points at the column's own max;
//   - a MINIMUM word ("lowest", "fewest", "smallest", …) at its own min;
//   - a POLAR word ("worst", "best", "worst-hit", …) points at whichever END OF THE COLUMN IS
//     BAD, and nothing in a profile says which that is: a high `incidents` is bad, a high
//     `households_with_heat_pump_pct` is good, and the profile records neither. So a polar word
//     is "unverifiable" NAMING the missing polarity — seen, refused, and explained.
// A RANK qualifier ("the second shortest") is a fourth case: it names a place that is not the
// extreme, which is the only thing this shape decides, so it is refused rather than misread as
// the extreme — `stress-p`'s own slot 3 says "the second shortest of the six", and reading that
// as "the shortest" would have produced a CONFIDENT FALSE CONTRADICTION.
const SUPERLATIVE_MAX_WORDS = new Set([
  "most",
  "highest",
  "largest",
  "biggest",
  "greatest",
  "longest",
  "strongest",
]);
const SUPERLATIVE_MIN_WORDS = new Set(["lowest", "smallest", "fewest", "shortest", "weakest", "least"]);
const SUPERLATIVE_POLAR_WORDS = new Set([
  "worst-hit",
  "hardest-hit",
  "worst",
  "best",
  "safest",
  "poorest",
  "richest",
  "healthiest",
  "cleanest",
  "dirtiest",
]);

// "the [second] worst-hit" — the rank qualifier is captured so it can be refused by name, and the
// hyphenated polar words come first in the alternation so "worst-hit" is never read as "worst".
const SUPERLATIVE_WORD_RE =
  /\bthe\s+(?:(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|next|joint|equal)[\s-]+)?(worst-hit|hardest-hit|most|highest|largest|biggest|greatest|longest|strongest|lowest|smallest|fewest|shortest|weakest|least|worst|best|safest|poorest|richest|healthiest|cleanest|dirtiest)\b/gi;

// The same polar words written without an article — "Attica was worst-hit" — which no "the"-
// anchored pattern can see.
const SUPERLATIVE_BARE_POLAR_RE = /\b(worst-hit|hardest-hit)\b/gi;

const LEADS_RE = /\bleads\b/gi;
const TOPS_RE = /\btops\b/gi;
// The French form of the same claim — `stress-n-chomage-cantons`'s own article says
// "Neuchâtel et Genève sont en tête", and this file already reads French comparisons (PAIR_FR_RE).
const LEADS_FR_RE = /\ben\s+t[êe]te\b/gi;

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE SAME SHAPE, IN THE OTHER THREE LANGUAGES THIS FILE DECLARES (round five, finding X1).
//
// Everything above this line is English, with `LEADS_FR_RE` the single French exception, and that is
// the whole defect: `stress-x-tunisian-water`'s takeaway — `تستهلك محافظة تونس أكثر من غيرها من
// المياه` — produced no claim of any kind, so the one assertion that beat makes was never put to the
// frozen table. The vocabularies below are the same three questions the English ones ask (does the
// named entity hold this column's MAXIMUM, its MINIMUM, or an end the data does not know is bad?),
// written in the other three languages `LEXICON_LANGUAGES` declares.
//
// `\b` IS NOT USED ANYWHERE HERE. It is ASCII-only, so it would misread every Greek and Arabic word
// in this block — the same reason `wordAppearsIn` below uses unicode property escapes. The boundary
// is `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])`, which is script-blind.
//
// The RANK qualifier is captured in each language for the same reason the English pattern captures
// it: "the second highest" is not the question this shape decides, and reading it as the extreme
// would produce a confident false contradiction.
const RANK_FR = "deuxi[èe]me|troisi[èe]me|quatri[èe]me|cinqui[èe]me|sixi[èe]me|septi[èe]me|huiti[èe]me|neuvi[èe]me|dixi[èe]me";
const RANK_EL = "δεύτερ|τρίτ|τέταρτ|πέμπτ|έκτ|έβδομ|όγδο";
const RANK_AR = "الثاني|الثالث|الرابع|الخامس|السادس";

// FRENCH. A superlative here is the article plus "plus"/"moins" plus an adjective — the construction
// itself carries the direction, so no adjective list is needed and none is invented. "le pire" and
// "le meilleur" are POLAR for exactly the reason their English equivalents are: nothing in a profile
// says which end of a column is the bad one.
const SUPERLATIVE_FR_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])l(?:e|a|es|')\\s+(?:(${RANK_FR})\\s+)?(plus|moins)\\s+(\\p{L}+)(?![\\p{L}\\p{N}])`,
  "giu",
);
const SUPERLATIVE_FR_POLAR_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])l(?:e|a|es|')\\s+(?:(${RANK_FR})\\s+)?(pires?|meilleures?|meilleurs?|meilleure|plus\\s+mauvais)(?![\\p{L}\\p{N}])`,
  "giu",
);

// GREEK. The superlative is carried by the adjective's own stem (-τερος / -τατος), so the stems are
// listed and the ending is left open — an article is optional because Greek routinely drops it in a
// headline ("Περισσότερα σχολεία από κάθε άλλη περιφέρεια").
const SUPERLATIVE_EL_MAX = "υψηλότερ|μεγαλύτερ|περισσότερ|μακρύτερ|ισχυρότερ";
const SUPERLATIVE_EL_MIN = "χαμηλότερ|μικρότερ|λιγότερ|συντομότερ|ασθενέστερ";
const SUPERLATIVE_EL_POLAR = "χειρότερ|καλύτερ|ασφαλέστερ|φτωχότερ|πλουσιότερ|καθαρότερ";
const SUPERLATIVE_EL_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(${RANK_EL})\\p{L}*\\s+)?(${SUPERLATIVE_EL_MAX}|${SUPERLATIVE_EL_MIN}|${SUPERLATIVE_EL_POLAR})\\p{L}*(?![\\p{L}\\p{N}])`,
  "giu",
);

// ARABIC. The elative takes the definite article when it is a superlative (`الأعلى` — "the highest")
// and stands bare when it is a comparative (`أعلى من` — "higher than"), so only the DEFINITE forms
// are read as shape 8. The bare forms are read by `MORE_THAN_ANY_OTHER_AR_RE` below, which is the
// construction `stress-x`'s own takeaway uses and the reason this block exists.
const SUPERLATIVE_AR_MAX = "الأكثر|الأعلى|الأكبر|الأطول|الأقوى|الأوفر";
const SUPERLATIVE_AR_MIN = "الأقل|الأدنى|الأصغر|الأقصر|الأضعف";
const SUPERLATIVE_AR_POLAR = "الأسوأ|الأفضل|الأنظف|الأفقر|الأغنى|الأسلم";
const SUPERLATIVE_AR_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(${RANK_AR})\\s+)?(${SUPERLATIVE_AR_MAX}|${SUPERLATIVE_AR_MIN}|${SUPERLATIVE_AR_POLAR})(?![\\p{L}\\p{N}])`,
  "gu",
);

/** Which end of a column a non-English superlative points at, decided from the stem that matched. */
function foreignExtremeOf(word) {
  const w = String(word).toLowerCase();
  const inList = (list) => list.split("|").some((stem) => w.startsWith(stem.toLowerCase()));
  if (inList(SUPERLATIVE_EL_MAX) || inList(SUPERLATIVE_AR_MAX)) return "max";
  if (inList(SUPERLATIVE_EL_MIN) || inList(SUPERLATIVE_AR_MIN)) return "min";
  return null;
}

/** Whether a non-English superlative is POLAR — a judgement whose direction the data does not carry. */
function foreignPolarOf(word) {
  const w = String(word).toLowerCase();
  const inList = (list) => list.split("|").some((stem) => w.startsWith(stem.toLowerCase()));
  return inList(SUPERLATIVE_EL_POLAR) || inList(SUPERLATIVE_AR_POLAR) ? w : null;
}

// "more than any other", in the other three. `stress-x`'s own `أكثر من غيرها` is the Arabic form and
// is the acceptance case for this whole block; `غيرها` is "the others", `أي` is "any".
const MORE_THAN_ANY_OTHER_FR_RE =
  /(?<![\p{L}\p{N}])plus\s+(?:\p{L}+\s+){0,4}?que\s+(?:tout|toute|toutes|tous|n['’]importe\s+quel(?:le)?)(?![\p{L}\p{N}])/giu;
const MORE_THAN_ANY_OTHER_EL_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${SUPERLATIVE_EL_MAX})\\p{L}*\\s+(?:\\p{L}+\\s+){0,3}?από\\s+(?:κάθε|οποιαδήποτε|οποιοδήποτε)(?![\\p{L}\\p{N}])`,
  "giu",
);
const MORE_THAN_ANY_OTHER_AR_RE =
  /(?<![\p{L}\p{N}])(?:أكثر|أعلى|أكبر|أطول|أقوى|أوفر)\s+من\s+(?:غيره\p{L}?|أي(?:\s+\p{L}+)?|سائر|بقية|كل)(?![\p{L}\p{N}])/gu;

// "leads" / "tops", in the other three — the same claim as a bare superlative, phrased as a verb.
const LEADS_EL_RE = /(?<![\p{L}\p{N}])(?:προηγείται|κορυφής)(?![\p{L}\p{N}])/giu;
const LEADS_AR_RE = /(?<![\p{L}\p{N}])(?:تتصدر|يتصدر|المقدمة|الصدارة)(?![\p{L}\p{N}])/gu;
// ─────────────────────────────────────────────────────────────────────────────────────────────

function superlativeExtremeOf(word) {
  const w = word.toLowerCase();
  if (SUPERLATIVE_MAX_WORDS.has(w)) return "max";
  if (SUPERLATIVE_MIN_WORDS.has(w)) return "min";
  return null;
}

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
// A FULL STOP IS ONLY A FULL STOP WHEN SOMETHING FOLLOWS IT. Round five: both boundary scans
// below used `lastIndexOf(".")`, so the "." inside "0.61" ended a sentence and the "." inside
// "1.82" started one — on `stress-u-rhone-glacier`'s own takeaway that cut "area" out of the very
// sentence that names it, and the numeral could then be placed against no column at all. This is
// the same rule `splitIntoSentences` at the bottom of this file already applies (a boundary needs
// whitespace after it); the two scans just never shared it.
const SENTENCE_END_CHARS = [".", "!", "?"];

function isSentenceEnd(text, i) {
  const ch = text[i];
  if (ch === "\n") return true;
  if (!SENTENCE_END_CHARS.includes(ch)) return false;
  const next = text[i + 1];
  return next === undefined || /\s/.test(next);
}

function isClauseEnd(text, i) {
  return text[i] === ";" || isSentenceEnd(text, i);
}
// `\p{N}` is in the CHARACTER class and not in the START class, and both halves are deliberate.
// A journalist's row key is routinely alphanumeric -- `Commune-186`, a case number, a product code
// -- and until round five no story in this tree had one, so the name was silently cut at its first
// digit and "Commune-186" was refused as `could not resolve "Commune-"`. Digits are admitted INSIDE
// a name for that reason. They are not admitted at the START, and continuation still requires a
// capitalised word, so a bare numeral standing next to a name ("Germany 67.8") is never swallowed
// into it -- which is what keeps a number a claim rather than part of a subject.
const LEADING_CAPITAL_RE = /^\s*([A-ZÀ-Ý][\p{L}\p{N}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}\p{N}'’.-]*)*)/u;
const CAPITALISED_PHRASE_RE = /[A-ZÀ-Ý][\p{L}\p{N}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}\p{N}'’.-]*)*/gu;

function clauseStart(text, markerStart) {
  for (let i = markerStart - 1; i >= 0; i -= 1) if (isClauseEnd(text, i)) return i + 1;
  return 0;
}

// The SENTENCE a marker sits in — wider than its clause, because the measure a claim is about is
// often named on the other side of a semicolon ("Germany reports the highest clinic COUNT;
// Sweden the highest RATE"). Used only to decide WHICH COLUMN a claim is about (see
// `chooseValueColumn`), never which entity.
function sentenceAround(text, markerStart, markerEnd) {
  let from = -1;
  for (let i = markerStart - 1; i >= 0; i -= 1)
    if (isSentenceEnd(text, i)) {
      from = i;
      break;
    }
  let to = text.length;
  for (let i = markerEnd; i < text.length; i += 1)
    if (isSentenceEnd(text, i)) {
      to = i;
      break;
    }
  return text.slice(from + 1, to);
}

// Every entity the CLAUSE a shape-8/9 marker sits in could plausibly be about, best guess first.
// The clause's own leading capitalised phrase stays the primary answer — the measured assumption
// that a short editorial sentence puts its subject first, and the reason ";" ends a clause here
// ("Germany reports the highest count; Sweden the lowest" names each entity at the start of its
// own clause). What round four added is the FALLBACK: when the leading phrase resolves to no row
// at all — "In the ministry's own table, Brazil leads." leads with "In" — the other capitalised
// phrases in the same clause are tried, nearest to the marker first, instead of the claim being
// refused for an entity nobody meant. The fallback never overrides a leading phrase that DOES
// resolve, so a sentence naming several real entities is still read subject-first.
function entityCandidatesFor(text, markerStart) {
  const prefix = text.slice(clauseStart(text, markerStart), markerStart);
  const ordered = [];
  const push = (value) => {
    const v = (value ?? "").trim();
    if (v && !ordered.includes(v)) ordered.push(v);
  };
  const leading = LEADING_CAPITAL_RE.exec(prefix);
  if (leading) push(leading[1]);
  for (const m of [...prefix.matchAll(CAPITALISED_PHRASE_RE)].reverse()) push(m[0]);
  return ordered;
}

function entitySubjectFor(text, markerStart) {
  return entityCandidatesFor(text, markerStart)[0] ?? null;
}

// A row is resolved for an entity name by matching it, case-insensitively, against ANY text-typed
// value in that row — the profile's own header (`rows: [{ [columnName]: value, ... }]`) names no
// fixed "entity column", and none of shapes 8/9's fixtures (a country code column beside a country
// name column, e.g.) agree on one either.
// The names one written entity could be stored under: as written, without its possessive
// ("Brazil's" → "Brazil"), and without a leading article ("The Netherlands" → "Netherlands").
// Nothing looser — a prefix or fuzzy match would have made `stress-p`'s "Lisbon" resolve to the
// table's "Lisboa", which is a DIFFERENT spelling the journalist should be told about, not one
// this check should quietly paper over.
function entityKeys(entityName) {
  const base = entityName.trim().replace(/[.,;:]+$/, "");
  const bare = base.replace(/['’]s$/i, "");
  return [...new Set([base, bare, bare.replace(/^(the|le|la|les|l['’])\s+/i, "")])]
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);
}

// EVERY row an entity name matches, not the first. A long-format table (heat-pump's five rows per
// country) matches five, and one row's value says nothing about a claim made over all five — so
// the count is returned and the caller refuses rather than silently reading row one.
function resolveEntityRows(rows, entityName) {
  if (!rows || rows.length === 0) return [];
  const keys = entityKeys(entityName);
  return rows.filter((row) =>
    Object.values(row).some((v) => typeof v === "string" && keys.includes(v.trim().toLowerCase())),
  );
}

// The entity of `item` that the frozen table actually holds exactly one row for, tried in
// `entityCandidatesFor`'s own order. Returns the ambiguity instead when a candidate matches
// several rows and none matches exactly one.
function resolveClaimEntity(item, rows) {
  const candidates = item.entityCandidates ?? (item.entity ? [item.entity] : []);
  let ambiguous = null;
  for (const candidate of candidates) {
    const hits = resolveEntityRows(rows, candidate);
    if (hits.length === 1) return { name: candidate, row: hits[0] };
    if (hits.length > 1 && !ambiguous) ambiguous = { name: candidate, count: hits.length };
  }
  if (!ambiguous && candidates.length === 0) return resolveEntityWithoutCase(item, rows);
  return ambiguous ? { ambiguous } : {};
}

/**
 * THE ENTITY OF A CLAIM WRITTEN IN A SCRIPT WITH NO CASE (round five, finding X1).
 *
 * `entityCandidatesFor` reads a capitalised phrase, which is the whole of how this file has ever
 * identified who a claim is about. Arabic, Hebrew, Chinese, Japanese and Korean have no case, so on
 * every one of them it returns nothing and a superlative stops at "could not identify which entity
 * this claim is about" — a refusal about the script, reported as a refusal about the claim.
 *
 * So where there is no capitalisation to read, the FROZEN TABLE is read instead: a row key that
 * appears in the claim's own clause, as a word, is the entity that clause is about. Exactly one such
 * row resolves; several is an ambiguity reported by name, the same answer the cased path gives. This
 * runs ONLY when the cased path found no candidate at all, so nothing about a Latin or Greek
 * takeaway changes — measured across all 27 frozen stories, not one of them has an empty candidate
 * list in a cased script.
 *
 * Its own limit, stated: a table whose key column repeats a common word ("Total", "Other") would
 * resolve that row for any clause containing the word. The longest match wins for that reason, and
 * the ambiguity branch reports the rest.
 */
function resolveEntityWithoutCase(item, rows) {
  const clause = String(item.clause ?? "");
  if (!clause.trim() || !rows || rows.length === 0) return {};
  const named = new Map();
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value !== "string") continue;
      const key = value.trim();
      if (key.length < 2 || !wordAppearsIn(key, clause)) continue;
      if (!named.has(key)) named.set(key, []);
      named.get(key).push(row);
    }
  }
  const keys = [...named.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) if (named.get(key).length === 1) return { name: key, row: named.get(key)[0] };
  return keys.length > 0 ? { ambiguous: { name: keys[0], count: named.get(keys[0]).length } } : {};
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

// A bare four-digit token in the calendar range — "2025", never "2025.0" and never "14205". The
// one place this file is willing to read a numeral as a PERIOD rather than a measurement, shared
// by shape 6's date-range guard and by the numeral check's own placement rule below.
function looksLikeCalendarYear(raw) {
  return /^\d{4}$/.test(String(raw).trim()) && Number(raw) >= 1500 && Number(raw) <= 2100;
}

// A "from A to B" pair where both sides are a plausible four-digit calendar year is a date range
// ("from 2019 to 2022"), not a measured value pair — see the header's first bullet under shape 6.
function looksLikeYearSpan(rawA, rawB) {
  return looksLikeCalendarYear(rawA) && looksLikeCalendarYear(rawB);
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

  for (const m of text.matchAll(SINCE_EN_SECOND_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    found.push({
      kind: "since",
      direction: directionOf(m[2]),
      yearA: Number(m[1]),
      yearB: Number(m[3]),
      raw: m[0],
      ...span,
    });
  }

  for (const m of text.matchAll(PAIR_EN_SECOND_RE)) {
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
  const pushSuperlative = (span, fields) => {
    if (found.some((f) => overlaps(f, span))) return;
    const entityCandidates = entityCandidatesFor(text, span.start);
    found.push({
      kind: "superlative",
      entity: entityCandidates[0] ?? null,
      entityCandidates,
      // The clause itself, carried so an entity written in a CASELESS script can still be resolved —
      // see `resolveClaimEntity`. `entityCandidates` is built from capitalisation, which Arabic,
      // Hebrew and CJK do not have, so on those scripts it is always empty and the claim used to
      // stop at "could not identify which entity this claim is about".
      clause: text.slice(clauseStart(text, span.start), span.start),
      raw: text.slice(span.start, span.end),
      ...fields,
      ...span,
    });
  };

  const SUPERLATIVE_MARKERS = [
    { re: LEADS_RE, extreme: "max" },
    { re: TOPS_RE, extreme: "max" },
    { re: LEADS_FR_RE, extreme: "max" },
  ];
  for (const { re, extreme } of SUPERLATIVE_MARKERS) {
    for (const m of text.matchAll(re)) {
      pushSuperlative({ start: m.index, end: m.index + m[0].length }, { extreme });
    }
  }
  for (const m of text.matchAll(SUPERLATIVE_WORD_RE)) {
    const word = m[2].toLowerCase();
    pushSuperlative(
      { start: m.index, end: m.index + m[0].length },
      {
        extreme: superlativeExtremeOf(word),
        polarWord: SUPERLATIVE_POLAR_WORDS.has(word) ? word : null,
        rank: m[1] ? m[1].toLowerCase() : null,
      },
    );
  }
  for (const m of text.matchAll(SUPERLATIVE_BARE_POLAR_RE)) {
    pushSuperlative(
      { start: m.index, end: m.index + m[0].length },
      { extreme: null, polarWord: m[1].toLowerCase(), rank: null },
    );
  }

  // Shape 9 — "more than any other" (same question as shape 8) and "more than ... combined" (the
  // one shape decidable, in the refuting direction, from a column's own max and sum alone — see
  // resolveCombined). MORE_THAN_COMBINED_RE is tried first so a "more than the other N combined"
  // span is not first swallowed by MORE_THAN_ANY_OTHER_RE's own overlap check on a shared "more".
  for (const m of text.matchAll(MORE_THAN_COMBINED_RE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (found.some((f) => overlaps(f, span))) continue;
    const entityCandidates = entityCandidatesFor(text, span.start);
    found.push({
      kind: "combined",
      entity: entityCandidates[0] ?? null,
      entityCandidates,
      clause: text.slice(clauseStart(text, span.start), span.start),
      raw: m[0],
      ...span,
    });
  }
  for (const m of text.matchAll(MORE_THAN_ANY_OTHER_RE)) {
    pushSuperlative({ start: m.index, end: m.index + m[0].length }, { extreme: "max" });
  }

  // THE OTHER THREE LANGUAGES (round five, finding X1). Tried AFTER every English pattern and after
  // the English "more than any other", so a mixed-language takeaway still reads its English clause
  // the way it always did, and the overlap check keeps one phrase to one claim as everywhere else.
  //
  // ORDER INSIDE THIS BLOCK IS LOAD-BEARING: the "more than any other" forms come first, because
  // the Arabic elative they are built on (`أكثر`) is bare — `أكثر من غيرها` must be claimed as the
  // whole comparison before anything shorter can take part of it. `stress-x-tunisian-water` is that
  // exact sentence.
  for (const re of [MORE_THAN_ANY_OTHER_AR_RE, MORE_THAN_ANY_OTHER_FR_RE, MORE_THAN_ANY_OTHER_EL_RE]) {
    for (const m of text.matchAll(re)) {
      pushSuperlative({ start: m.index, end: m.index + m[0].length }, { extreme: "max" });
    }
  }
  for (const re of [LEADS_AR_RE, LEADS_EL_RE]) {
    for (const m of text.matchAll(re)) {
      pushSuperlative({ start: m.index, end: m.index + m[0].length }, { extreme: "max" });
    }
  }
  for (const m of text.matchAll(SUPERLATIVE_FR_RE)) {
    pushSuperlative(
      { start: m.index, end: m.index + m[0].length },
      { extreme: m[2].toLowerCase() === "moins" ? "min" : "max", polarWord: null, rank: m[1] ? m[1].toLowerCase() : null },
    );
  }
  for (const m of text.matchAll(SUPERLATIVE_FR_POLAR_RE)) {
    pushSuperlative(
      { start: m.index, end: m.index + m[0].length },
      { extreme: null, polarWord: m[2].toLowerCase(), rank: m[1] ? m[1].toLowerCase() : null },
    );
  }
  for (const re of [SUPERLATIVE_EL_RE, SUPERLATIVE_AR_RE]) {
    for (const m of text.matchAll(re)) {
      pushSuperlative(
        { start: m.index, end: m.index + m[0].length },
        { extreme: foreignExtremeOf(m[2]), polarWord: foreignPolarOf(m[2]), rank: m[1] ? m[1].toLowerCase() : null },
      );
    }
  }

  return found;
}

export function findYearColumn(columns) {
  const byName = columns.find((c) => /year|date|ann[ée]e/i.test(c.name));
  if (byName) return byName;
  return (
    columns.find(
      (c) => c.type === "number" && Number.isInteger(c.min) && Number.isInteger(c.max) && c.min >= 1500 && c.max <= 2100,
    ) ?? null
  );
}

// A MEASURE is a numeric column that is not the year column — a table's own x axis is not one of
// the things it measures. THIS IS THE SKILL'S ONE ANSWER TO "is `year` a measure?", and it lives
// here because this file has always given it. Round four's finding 23 was that `propose.mjs`'s
// `requirementFinding` answered the opposite way — counting `year` in `facts.numeric` AND
// `facts.temporal`, so a plain (year, value) table claimed two measures and satisfied
// `multiple-series` on the strength of its own x axis, in 9 of the 21 frozen stories. Two modules
// inside ONE skill, opposite answers. `propose.mjs` now imports `findYearColumn` and
// `measureColumns` from here rather than deciding again; that import is the whole of the fix, and
// it is not a cross-skill import — both modules are `storyboard`'s own.
// A COORDINATE IS NOT A MEASURE (round six, beat AC). `stress-ac-alcanede-kilns` carries
// `site_lat` and `site_lon`, and `stress-ab-emigration-flows` carries four of them; every
// superlative in either story came back "this profile carries 4 measures (… "site_lat", "site_lon")
// and the claim names none of them", so a geographic story could not decide a geographic claim.
// A latitude is where a row IS, not what it measures — the same statement `measureColumns` has
// always made about the year column.
//
// NAME AND VALUE BOTH HAVE TO AGREE, because "long" is an ordinary English word: a column is a
// coordinate when one of its own name tokens is a coordinate word AND its values stay inside the
// range that word can occupy (±90 for a latitude, ±180 for a longitude). `tunnel_long_m [900, 5400]`
// is a length and stays a measure. The vocabulary is the Latin abbreviations a frozen CSV header
// actually uses — the four `LEXICON_LANGUAGES` spell latitude and longitude the same way or do not
// abbreviate them at all — and a header outside it is not read, which is stated in SKILL.md.
const COORDINATE_NAME_TOKENS = new Set([
  "lat", "lats", "latitude", "latitudes", "latitud",
  "lon", "lons", "lng", "lng", "long", "longs", "longitude", "longitudes", "longitud",
]);

export function isCoordinateColumn(column) {
  if (column.type !== "number") return false;
  const tokens = String(column.name)
    .split(NAME_TOKEN_SPLIT_RE)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  const named = tokens.filter((t) => COORDINATE_NAME_TOKENS.has(t));
  if (named.length === 0) return false;
  const limit = named.some((t) => t.startsWith("lat")) ? 90 : 180;
  return (
    Number.isFinite(column.min) && Number.isFinite(column.max) && column.min >= -limit && column.max <= limit
  );
}

export function measureColumns(columns, yearColumn) {
  return columns.filter(
    (c) =>
      c.type === "number" &&
      c !== yearColumn &&
      !isCoordinateColumn(c) &&
      c.min !== null &&
      c.min !== undefined &&
      c.max !== null &&
      c.max !== undefined,
  );
}

// A column name, as the words a sentence could name it by. Tokens shorter than four characters
// are dropped: "km" inside `network_km` and "pct" inside `share_pct` match far too much English
// prose to be evidence of anything.
const NAME_TOKEN_SPLIT_RE = /[^\p{L}\p{N}]+/u;

function nameTokensOf(column) {
  return column.name
    .split(NAME_TOKEN_SPLIT_RE)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t));
}

// Anything in a column NAME that would otherwise be read as a regular expression. Column names
// come out of a frozen CSV header, so they are text this file does not control.
const REGEX_META_RE = /[.*+?^${}()|[\]\\]/g;

/**
 * Whether a column's own name token appears in the sentence AS A WORD.
 *
 * ROUND FIVE, finding T12. This was `haystack.includes(token)` — a bare substring test — and on
 * the frozen `stress-t-europe-recycling` the refused column `survey_date` claimed the sentence
 * "Germany has the highest recycling rate of any country SURVEYED in March 2025", because
 * "surveyed" contains "survey". The sentence used that word incidentally, about WHEN the figures
 * were collected; the claim it actually makes — Germany holds the maximum of `recycling_rate` —
 * was never attempted, and came back `unverifiable`. The same sentence with a false country came
 * back `unverifiable` too, which is a takeaway the frozen data REFUTES closing G1 in silence:
 * the exact shape this checker exists to prevent.
 *
 * The boundaries are unicode property escapes rather than `\b`, which is ASCII-only and would
 * misread every Greek and Arabic column name this tree has frozen. A trailing "s"/"es" on the
 * sentence's side is allowed, because a table names its column in the singular ("resident") as
 * often as the sentence names it in the plural ("residents"); nothing looser, since a looser
 * match is the defect being closed here.
 */
function wordAppearsIn(token, haystack) {
  const escaped = token.replace(REGEX_META_RE, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?:es|s)?(?![\\p{L}\\p{N}])`, "iu").test(haystack);
}

function columnIsNamedIn(column, haystack) {
  return nameTokensOf(column).some((t) => wordAppearsIn(t, haystack));
}

/**
 * WHICH COLUMN A CLAIM IS ABOUT. The old `findValueColumn` demanded there be exactly ONE numeric
 * column beside the year and returned `null` otherwise — measured across the 21 frozen stories,
 * NINE fall in that dead zone, so every superlative and every entity-vs-combined claim in nine
 * stories came back "cannot identify a single numeric value column" no matter what the sentence
 * said, and the refusal did not even name the candidates it was torn between.
 *
 * A sentence names its own measure — "schools", "trips", "incidents" — so when a table carries
 * several, the SENTENCE is asked. Exactly one candidate whose own name appears in the claim's
 * sentence wins; none, or more than one, is refused BY NAME so the journalist can settle it by
 * hand. Refusing when the sentence names two measures is not a weakness: `stress-q`'s takeaway
 * names `incidents` AND `residents`, and which of the two a superlative is about is exactly the
 * question round four's finding 5 says must be put to a human rather than guessed.
 */
function chooseValueColumn(columns, text) {
  const yearColumn = findYearColumn(columns);
  const candidates = measureColumns(columns, yearColumn);
  if (candidates.length === 0) {
    return {
      column: null,
      named: false,
      refusal: "this profile carries no numeric column with a range to check that against",
    };
  }
  const haystack = (text ?? "").toLowerCase();
  // THE COLUMN A CLAIM NAMES MAY BE ONE THE PROFILER REFUSED, and that possibility has to be
  // settled BEFORE any surviving measure is picked — otherwise the claim is decided against a
  // column nobody meant.
  //
  // `stress-a-energy-bills` answered "Denmark has the highest price." with `contradicted` —
  // `"Denmark"'s own value in "households" is 2700000, not the column's maximum` — refuting a claim
  // about PRICE with a count of HOUSEHOLDS, because ` price_eur ` is typed `text` for a thousands
  // separator and `households` was the only measure left standing. `contradicted` never closes G1,
  // so that is a correct takeaway blocked by a verdict about the wrong measure: the same
  // wrong-column error round four found in the numeral path (finding 1), reaching the one verdict
  // that stops the journey rather than merely overstating confidence.
  //
  // `stress-r-greek-schools` is the same shape with two measures instead of one: "σχολεία" names
  // BOTH the refused `σχολεία_2026` and the surviving `σχολεία_2020`, so a claim about the 2026
  // count would be decided against the 2020 one.
  //
  // A refused column is recognised by its recorded `reason`, never by being non-numeric: a `reason`
  // is the profiler saying "this LOOKED numeric and I would not guess", which is exactly the case
  // where the journalist has one cell to look at. A plainly textual column has no reason and is not
  // a candidate for anything.
  const meantButRefused = columns.filter(
    (c) => c.type !== "number" && typeof c.reason === "string" && c.reason.trim() !== "" &&
      columnIsNamedIn(c, haystack),
  );
  if (meantButRefused.length > 0) {
    return {
      column: null,
      named: false,
      refusal:
        `this claim names ${meantButRefused.map((c) => `"${c.name}"`).join(", ")}, which the profiler REFUSED to type` +
        ` (${meantButRefused.map((c) => c.reason).join("; ")}) — so the column the claim is about carries no range to check it against,` +
        ` and deciding it against ${candidates.map((c) => `"${c.name}"`).join(" or ")} instead would answer a question nobody asked`,
    };
  }
  // `named` is computed before the single-candidate shortcut because a caller needs to know
  // WHETHER the sentence named the column it got, not only which column that was: a table with
  // one measure hands its measure back whatever the sentence says, and "the sentence pointed at
  // this column" is a different fact from "there was nothing else to hand back".
  const named = candidates.filter((c) => columnIsNamedIn(c, haystack));
  if (candidates.length === 1) return { column: candidates[0], named: named.length === 1 };
  if (named.length === 1) return { column: named[0], named: true };
  const names = (list) => list.map((c) => `"${c.name}"`).join(", ");
  return {
    column: null,
    named: false,
    refusal:
      named.length === 0
        ? `this profile carries ${candidates.length} measures (${names(candidates)}) and the claim names none of them, so nothing says which one it is about`
        : `the claim names ${named.length} of this profile's measures (${names(named)}), so nothing says which one it is about`,
  };
}

// A COLUMN THE PROFILER REFUSED (round-four finding 6). `stress-r`'s `σχολεία_2026` is typed
// `text` for ONE corrupt cell in thirteen, so the takeaway's real numbers were never attempted
// and the verdict came back an "unverifiable" indistinguishable from a genuinely hard claim.
// Whenever this check fails to decide something numeric, it now says which column the profiler
// refused and why — the journalist can then look at one cell instead of at the whole method.
function refusedColumnNote(columns) {
  const refused = columns.filter(
    (c) => c.type !== "number" && typeof c.reason === "string" && c.reason.trim() !== "",
  );
  if (refused.length === 0) return "";
  const named = refused.map((c) => `"${c.name}" (${c.reason})`).join("; ");
  return ` — and note that the profiler REFUSED to type ${named}, so any number this claim makes about that column could not be attempted at all`;
}

// A DENOMINATOR SITTING BESIDE A COUNT (round-four finding 5). Nothing in this toolchain reasoned
// about a count against its denominator until this round. `stress-q-safety-incidents` came back
// `supported` on "more than any other district" — a TRUE statement about raw counts standing in for
// a headline ("Centro has the worst safety record") that is FALSE per resident, with `residents`
// one column away: Centro is 205 incidents per 100,000 residents, Sul is 233.
// `stress-p-transport-ridership` inverts at the very top, Porto carrying 416 trips per resident
// against Lisboa's 393. Four of the twenty-one frozen stories carry an explicit denominator.
//
// Read off the column's own NAME, exactly as `intake/scripts/profile.mjs` reads it — the same
// token list, kept as its own copy here for the same reason `findYearColumn` is a second reading
// of `isSequenceColumn`'s heuristic rather than an import: this tree allows no cross-skill runtime
// import, and a shared decision that reaches a second skill is written out again where its reader
// can see it. Identity, never shape: "the bigger number is the denominator" would name
// `network_km` against `trips_millions`.
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
  // ROUND FIVE, finding C3 — the same shape as every other name-based lexicon in this toolchain.
  // `stress-x-tunisian-water` carries `\u0627\u0644\u0633\u0643\u0627\u0646` (population) one column from a consumption
  // column and no denominator candidate was reported: this list held English and French words with
  // two Greek ones added, so round four's fix was Latin-script only. It now declares the same four
  // languages every other lexicon in this tree declares — English, French, Greek, Arabic. The Greek
  // and Arabic entries beyond `\u03bc\u03b1\u03b8\u03b7\u03c4\u03ad\u03c2` and `\u0627\u0644\u0633\u0643\u0627\u0646` are AHEAD of the corpus and are said to
  // be: no frozen table names a Greek population column or an Arabic household one. Missing a word
  // here is SILENT — a count is drawn raw with its denominator one column away and nothing says so —
  // and widening the reader is not.
  "\u03c0\u03bb\u03b7\u03b8\u03c5\u03c3\u03bc\u03cc\u03c2",
  "\u03c0\u03bb\u03b7\u03b8\u03c5\u03c3\u03bc\u03bf\u03cd",
  "\u03c0\u03bb\u03b7\u03b8\u03c5\u03c3\u03bc\u03bf\u03af",
  "\u03ba\u03ac\u03c4\u03bf\u03b9\u03ba\u03bf\u03c2",
  "\u03ba\u03ac\u03c4\u03bf\u03b9\u03ba\u03bf\u03b9",
  "\u03ba\u03b1\u03c4\u03bf\u03af\u03ba\u03c9\u03bd",
  "\u03bd\u03bf\u03b9\u03ba\u03bf\u03ba\u03c5\u03c1\u03b9\u03cc",
  "\u03bd\u03bf\u03b9\u03ba\u03bf\u03ba\u03c5\u03c1\u03b9\u03ac",
  "\u03c6\u03bf\u03b9\u03c4\u03b7\u03c4\u03ae\u03c2",
  "\u03c6\u03bf\u03b9\u03c4\u03b7\u03c4\u03ad\u03c2",
  "\u03bc\u03b1\u03b8\u03b7\u03c4\u03ce\u03bd",
  "\u0627\u0644\u0633\u0643\u0627\u0646",
  "\u0633\u0643\u0627\u0646",
  "\u0633\u0627\u0643\u0646",
  "\u0646\u0633\u0645\u0629",
  "\u0646\u0633\u0645\u0627\u062a",
  "\u0627\u0644\u0623\u0633\u0631",
  "\u0623\u0633\u0631\u0629",
  "\u0623\u0633\u0631",
  "\u062a\u0644\u0645\u064a\u0630",
  "\u062a\u0644\u0627\u0645\u064a\u0630",
  "\u0637\u0627\u0644\u0628",
  "\u0637\u0644\u0627\u0628",
  "\u0627\u0644\u0637\u0644\u0627\u0628",
  "\u0645\u0642\u064a\u0645",
  "\u0645\u0642\u064a\u0645\u0648\u0646",
]);

function namesADenominator(name) {
  return name
    .split(NAME_TOKEN_SPLIT_RE)
    .some((token) => DENOMINATOR_NAME_TOKENS.has(token.toLowerCase()));
}

/** The numeric column a count in this table could be read against, or `null`. The year column is
 *  never one — a calendar year is an x axis, not a population. */
function findDenominatorColumn(columns) {
  const yearColumn = findYearColumn(columns);
  return (
    measureColumns(columns, yearColumn).find((c) => namesADenominator(c.name)) ?? null
  );
}

/** The column a row is NAMED by — the first text-typed column, which is where every frozen table
 *  in this tree puts its entity name. Only used to say WHO leads each ranking; a table with no
 *  text column simply gets a ranking with no names, never a wrong one. */
function labelColumnOf(columns) {
  return columns.find((c) => c.type === "text") ?? null;
}

/** The row that leads a ranking, and its own figure — by the raw column, and by the same column
 *  divided by the denominator. NEVER stored, never returned as a verdict, never written back into
 *  the profile: this is arithmetic done once to put two numbers in a sentence a journalist reads.
 *  A row whose value or denominator is not a number, or whose denominator is zero, is left out of
 *  the rate ranking rather than coerced into it. */
function leadersFor(rows, valueName, denominatorName, extreme) {
  const better = (a, b) => (extreme === "min" ? a < b : a > b);
  let raw = null;
  let rate = null;
  for (const row of rows) {
    const value = Number(row[valueName]);
    if (!Number.isFinite(value)) continue;
    if (raw === null || better(value, raw.value)) raw = { row, value };
    const denominator = Number(row[denominatorName]);
    if (!Number.isFinite(denominator) || denominator === 0) continue;
    const quotient = value / denominator;
    if (rate === null || better(quotient, rate.quotient)) rate = { row, value, denominator, quotient };
  }
  return { raw, rate };
}

const nameOf = (row, labelColumn) => (labelColumn ? String(row[labelColumn.name]) : "that row");

/** BOTH RANKINGS, IN WORDS, so the journalist chooses with the numbers in front of them.
 *
 *  Returns "" when the question does not arise: no denominator-shaped column in the table, or the
 *  claim is about the denominator itself. Otherwise it names the leader by the raw column and the
 *  leader per denominator, each with its own figure, and says out loud that the choice between
 *  them is not this check's to make.
 *
 *  The quotient is given as a bare ratio (`205 / 88000 = 0.00233`) rather than "per 100,000":
 *  scaling it would be choosing a unit the data never states, which is the same invention the
 *  profiler refuses one level up. */
function bothRankingsNote(columns, rows, valueColumn, extreme) {
  const denominator = findDenominatorColumn(columns);
  if (!denominator || denominator === valueColumn) return "";
  const opening = ` — and note that "${denominator.name}" sits beside "${valueColumn.name}" in the same table, so this claim reads one way as a raw "${valueColumn.name}" figure and another per "${denominator.name}"`;
  if (!rows || rows.length === 0) {
    return `${opening}; no rows were available here, so neither ranking could be computed — pass the story's own source/data.csv as \`{ csv }\` and both are named`;
  }
  const labelColumn = labelColumnOf(columns);
  const { raw, rate } = leadersFor(rows, valueColumn.name, denominator.name, extreme);
  if (!raw || !rate) return `${opening}; the frozen rows carry no usable pair of figures to rank either way`;
  const end = extreme === "min" ? "lowest" : "highest";
  const rawName = nameOf(raw.row, labelColumn);
  const rateName = nameOf(rate.row, labelColumn);
  const rateFigure = `${rate.value} / ${rate.denominator} = ${Number(rate.quotient.toPrecision(3))}`;
  const agreement =
    rawName === rateName
      ? `The two readings agree on "${rawName}" here, but the claim still does not say which of them it is making`
      : `The two readings do NOT agree, and which one this claim is about is the journalist's to settle, not this check's`;
  return `${opening}. By "${valueColumn.name}" alone the ${end} is "${rawName}" (${raw.value}); per "${denominator.name}" it is "${rateName}" (${rateFigure}). ${agreement}`;
}

// WHAT THIS FILE COULD NOT READ IN A COLUMN'S OWN NAME — the script net and the letter net asked
// together, so a gap is named once by whichever of the two can see it and never twice.
function namesNotRead(name) {
  return [...scriptsNotRead(name), ...lettersNotRead(name)];
}

/**
 * A DENOMINATOR THIS CHECK CANNOT READ THE NAME OF (round six, findings C1 and AD1).
 *
 * `findDenominatorColumn` above answers by matching a column's name tokens against a list written
 * in `LEXICON_LANGUAGES`. When the answer is NO, that no is only as good as the list: the
 * controller reproduced the whole defect on one table and one sentence, changing nothing but the
 * denominator column's name from `population` to `ludno\u015b\u0107`, and watched round four's raw-count
 * downgrade switch OFF. English came back `unverifiable`, Polish came back `supported` — the one
 * verdict that closes G1 — so the missing word did not withhold a prompt, it RAISED the verdict
 * above the one an unreadable claim gets.
 *
 * So a negative from a lexicon is only allowed to stand where the lexicon was in a position to
 * read the names it rejected. Where it was not, this says so and the caller withholds `supported`
 * exactly as it would for a denominator it COULD name: a check that cannot classify a numeric
 * column may not be more confident than one that can. It still never claims the unread column IS a
 * denominator — identity, never shape, unchanged — only that the question could not be put.
 */
function unreadDenominatorNote(columns, valueColumn) {
  const yearColumn = findYearColumn(columns);
  const unread = measureColumns(columns, yearColumn)
    .filter((c) => c !== valueColumn)
    .map((c) => ({ name: c.name, notRead: namesNotRead(c.name) }))
    .filter((c) => c.notRead.length > 0);
  if (unread.length === 0) return "";
  const named = unread
    .map((u) => `"${u.name}" (written with ${u.notRead.map((n) => `"${n}"`).join(", ")})`)
    .join("; ");
  return ` — and note that this table carries a numeric column whose own NAME this check cannot read: ${named}. Its denominator lexicon reads ${LEXICON_LANGUAGES_SAID} and nothing else, so it cannot say whether that column is a population, a household count or another denominator this claim would be a RAW count against. "supported" is WITHHELD rather than granted by default: a check that cannot classify a numeric column may not come back more confident than one that can`;
}

/**
 * THE LIMIT OF THE SAME LEXICON, STATED WHERE THE JOURNALIST READS IT (round six, finding C1).
 *
 * The letter net above catches a fifth language that spells itself differently. It cannot catch
 * one that does not: Dutch `bevolking`, Italian `popolazione` and Indonesian `penduduk` are plain
 * ASCII, and no character test will ever see them. That limit is real, so it is said out loud on
 * the verdict where it does damage — a raw-count superlative coming back `supported` — rather than
 * left in a comment only a maintainer of this file would ever meet. Nothing is downgraded here:
 * the columns really were read, and a negative given in four languages is still an answer. It is
 * an answer with a stated reach, which is the difference this whole mechanism is about.
 */
function denominatorLexiconLimitNote(columns, valueColumn) {
  const yearColumn = findYearColumn(columns);
  const siblings = measureColumns(columns, yearColumn).filter((c) => c !== valueColumn);
  if (siblings.length === 0) return "";
  return ` — and note that no column in this table NAMES a denominator, an answer given in ${LEXICON_LANGUAGES_SAID} and in no other language: beside "${valueColumn.name}" it read ${siblings.map((c) => `"${c.name}"`).join(", ")} and found no population word among them. A denominator named in a fifth language that spells itself in plain ASCII reads to this check exactly like no denominator at all, so this is confirmed as a RAW "${valueColumn.name}" figure and the per-capita reading, if this table carries one, is the journalist's to raise`;
}

/**
 * The wrapper shapes 8 and 9 come back through. It never re-decides anything and never divides
 * into a verdict: a `supported` raw-count superlative is DOWNGRADED to `unverifiable` while a
 * denominator candidate exists — that is the refusal to confirm — and every other verdict keeps
 * its own answer and gains the note. A `contradicted` claim stays contradicted: the data really
 * did refute the raw reading, and hiding that behind a question would be the same silence this
 * whole file exists to stop.
 */
function askAboutTheDenominator(result, item, profile, columns, sentence) {
  if (!result) return result;
  const chosen = chooseValueColumn(columns, sentence);
  if (!chosen.column) return result;
  const rows = Array.isArray(profile.rows) ? profile.rows : null;
  const note = bothRankingsNote(columns, rows, chosen.column, item.extreme ?? "max");
  // ROUND SIX. Three answers, not one: a denominator this check READ (the round-four downgrade,
  // unchanged), a numeric column whose name it could not read (the same withholding, for the same
  // reason — it is not in a position to say no), and neither, where the negative stands and the
  // reach of the lexicon that gave it is stated on the one verdict that closes G1.
  const unread = note === "" ? unreadDenominatorNote(columns, chosen.column) : "";
  const limit =
    note === "" && unread === "" && result.verdict === "supported"
      ? denominatorLexiconLimitNote(columns, chosen.column)
      : "";
  const appended = `${note}${unread}${limit}`;
  if (appended === "") return result;
  if (result.verdict !== "supported" || (note === "" && unread === "")) {
    return { ...result, detail: `${result.detail}${appended}` };
  }
  return {
    ...result,
    verdict: "unverifiable",
    detail: `${result.detail}${appended}`,
  };
}

function rowValue(rows, yearField, valueField, year) {
  const row = rows.find((r) => Number(r[yearField]) === year);
  if (!row) return undefined;
  const v = row[valueField];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function resolveComparison(item, profile, text) {
  const claim = item.raw.trim();
  const columns = Array.isArray(profile.columns) ? profile.columns : [];
  // The sentence the marker sits in, so `chooseValueColumn` can ask which measure this claim
  // names when the table carries several.
  const sentence = sentenceAround(text ?? item.raw, item.start ?? 0, item.end ?? (item.raw ?? "").length);

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
            ? `no share/percentage column in the profile to check this total against — this decision reads a column's own name in ${LEXICON_LANGUAGES_SAID}, or its recorded unit "%", and read ${columns.length === 0 ? "no columns at all" : columns.map((c) => `"${c.name}"`).join(", ")}${scriptsNotRead(columns.map((c) => c.name).join(" ")).length > 0 ? `; ${scriptsNotRead(columns.map((c) => c.name).join(" ")).join(", ")} is a script it has no share vocabulary for` : ""}${lettersNotRead(columns.map((c) => c.name).join(" ")).length > 0 ? `; and ${lettersNotRead(columns.map((c) => c.name).join(" ")).map((l) => `"${l}"`).join(", ")} ${lettersNotRead(columns.map((c) => c.name).join(" ")).length === 1 ? "is a letter" : "are letters"} none of those four is written with, so at least one of these names is in a fifth language and this decision has no share vocabulary for it` : ""}`
            : "more than one share/percentage column in the profile — cannot tell which this total claims to be the whole of",
      };
    }
    const column = shareColumns[0];
    const holds = Math.abs(column.sum - TOTALITY_WHOLE_VALUE) <= TOTALITY_TOLERANCE;
    // ROUND SIX, finding Z2 — PARTS THAT CANCEL ARE NOT PARTS OF A WHOLE. `stress-z-budget-parts`
    // returned `supported` here: `part_pct` sums to exactly 100 and the claim said the parts make
    // the whole. It does so only because a −9.7 provision write-back cancels a +9.7 overshoot —
    // the positive parts sum to 109.7 — so the 100 is an arithmetic coincidence and confirming a
    // totality on it is the sharpest form of the wrong evidence this round is about.
    //
    // The rule is deliberately asymmetric, and this is the whole of it: a CONFIRMATION requires
    // non-negative parts, a REFUTATION does not. A column that misses the whole misses it whichever
    // total you take, so `stress-e-electricity-mix` (share_pct summing to 95.2 against an article
    // claiming the whole) still comes back `contradicted` — it simply now says the column is signed
    // too. Only the confirming direction is withdrawn, and it is withdrawn by name, never in silence.
    const totals = columnTotals(column, profile.rows);
    const cancels = Number.isFinite(column.min) && column.min < 0;
    if (holds && cancels) {
      return {
        claim,
        verdict: "unverifiable",
        detail:
          `column "${column.name}" sums to ${column.sum}, which is the whole (${TOTALITY_WHOLE_VALUE}) —` +
          ` but it reaches that total by CANCELLATION, not by addition${cancellationNote(column, totals)}.` +
          ` Parts that cancel are not parts of a whole, so this claim cannot be confirmed against this column`,
      };
    }
    return {
      claim,
      verdict: holds ? "supported" : "contradicted",
      detail:
        (holds
          ? `column "${column.name}" sums to ${column.sum}, which is the whole (${TOTALITY_WHOLE_VALUE})`
          : `claims the whole, but column "${column.name}" sums to ${column.sum}, not ${TOTALITY_WHOLE_VALUE}`) +
        cancellationNote(column, totals),
    };
  }

  // Shapes 8 and 9 both rank one entity against a column. A count read against a denominator can
  // rank the other way round entirely (round-four finding 5), so both come back through
  // `askAboutTheDenominator` before a verdict leaves this function.
  if (item.kind === "superlative")
    return askAboutTheDenominator(
      resolveSuperlative(item, profile, claim, columns, sentence),
      item,
      profile,
      columns,
      sentence,
    );
  if (item.kind === "combined")
    return askAboutTheDenominator(
      resolveCombined(item, profile, claim, columns, sentence),
      item,
      profile,
      columns,
      sentence,
    );

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
  const chosen = chooseValueColumn(columns, sentence);
  const valueColumn = chosen.column;
  if (!yearColumn || !valueColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `${yearColumn ? chosen.refusal : "cannot identify a year column in this profile"}${refusedColumnNote(columns)}`,
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
function resolveSuperlative(item, profile, claim, columns, sentence) {
  const refused = refusedColumnNote(columns);
  const coverageColumn = findCoverageColumn(columns);
  if (coverageColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `profile carries a "${coverageColumn.name}" column marking a row's period incomplete — a superlative over this data cannot be confirmed without knowing which rows it affects`,
    };
  }

  // A RANK that is not the extreme. This shape decides one question — does the named entity hold
  // the column's own max or min — and "the second shortest" is not that question. Refused by
  // name rather than read as the extreme, which would have contradicted a true sentence.
  if (item.rank) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `this names the ${item.rank} place, not the extreme — this check only decides whether a named entity holds a column's own maximum or minimum`,
    };
  }

  // A POLAR word, whose direction the data does not carry (finding 3).
  if (item.polarWord || !item.extreme) {
    const word = item.polarWord ?? claim;
    return {
      claim,
      verdict: "unverifiable",
      detail: `"${word}" is a judgement, not a direction: this check would need the POLARITY of the column it is about — whether a HIGH value here is the bad end or the good one — and a profile records no such thing, so which end of the column "${word}" points at cannot be established${refused}`,
    };
  }

  const chosen = chooseValueColumn(columns, sentence);
  const valueColumn = chosen.column;
  if (!valueColumn) {
    return { claim, verdict: "unverifiable", detail: `${chosen.refusal}${refused}` };
  }

  if (!item.entity && !String(item.clause ?? "").trim()) {
    return { claim, verdict: "unverifiable", detail: "could not identify which entity this claim is about" };
  }

  const extreme = item.extreme === "min" ? valueColumn.min : valueColumn.max;
  const extremeName = item.extreme === "min" ? "minimum" : "maximum";
  const rows = Array.isArray(profile.rows) ? profile.rows : null;
  if (!rows || rows.length === 0) {
    return {
      claim,
      verdict: "unverifiable",
      // NOT the same answer as "the frozen table has no such row" below, and the difference is the
      // whole point: this branch means the CALLER never handed over a table, so the check was
      // never in a position to decide. Round four found the previous version of this shape
      // returning `unverifiable` for every superlative in every story and reading, to anyone
      // downstream, exactly like an honest "the data cannot settle this". A refusal that does not
      // name what would lift it is that defect wearing a longer sentence, so this one names the
      // argument. `storyboard/SKILL.md` and `references/exchange.md` both spell the call with it.
      detail: `could not resolve "${item.entity}" to a row: no frozen table was handed to this check, and no profile in this tree carries rows — pass the story's own source/data.csv as \`{ csv }\` and this claim becomes decidable`,
    };
  }

  const resolved = resolveClaimEntity(item, rows);
  if (resolved.ambiguous) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `"${resolved.ambiguous.name}" matches ${resolved.ambiguous.count} rows in the frozen table — a claim about one entity cannot be decided from several of its rows`,
    };
  }
  if (!resolved.row) {
    return { claim, verdict: "unverifiable", detail: `could not resolve "${item.entity}" to a row in the frozen data` };
  }

  const value = Number(resolved.row[valueColumn.name]);
  if (Number.isNaN(value)) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `row for "${resolved.name}" has no numeric value in column "${valueColumn.name}"${refused}`,
    };
  }

  const holds = value === extreme;
  return {
    claim,
    verdict: holds ? "supported" : "contradicted",
    detail: holds
      ? `"${resolved.name}"'s own value in "${valueColumn.name}" (${value}) is the column's ${extremeName} (${extreme})`
      : `"${resolved.name}"'s own value in "${valueColumn.name}" is ${value}, not the column's ${extremeName} (${extreme})`,
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
function resolveCombined(item, profile, claim, columns, sentence) {
  const refused = refusedColumnNote(columns);
  const coverageColumn = findCoverageColumn(columns);
  if (coverageColumn) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `profile carries a "${coverageColumn.name}" column marking a row's period incomplete — this comparison cannot be confirmed without knowing which rows it affects`,
    };
  }

  const chosen = chooseValueColumn(columns, sentence);
  const valueColumn = chosen.column;
  if (!valueColumn || valueColumn.sum === null || valueColumn.sum === undefined) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `${valueColumn ? `column "${valueColumn.name}" carries no total, and this comparison is decided against one` : chosen.refusal}${refused}`,
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
    return { claim, verdict: "unverifiable", detail: `${arithmeticNote}, but "${item.entity}" cannot be resolved to a row — neither the profile nor any frozen table handed to this check carries row-level data` };
  }
  const resolved = resolveClaimEntity(item, rows);
  if (resolved.ambiguous) {
    return {
      claim,
      verdict: "unverifiable",
      detail: `${arithmeticNote}, but "${resolved.ambiguous.name}" matches ${resolved.ambiguous.count} rows in the frozen table — a claim about one entity cannot be decided from several of its rows`,
    };
  }
  if (!resolved.row) {
    return { claim, verdict: "unverifiable", detail: `${arithmeticNote}, but "${item.entity}" could not be resolved to a row` };
  }
  const value = Number(resolved.row[valueColumn.name]);
  const holds = !Number.isNaN(value) && value === valueColumn.max;
  return {
    claim,
    verdict: holds ? "supported" : "contradicted",
    detail: holds
      ? `"${resolved.name}"'s own value in "${valueColumn.name}" (${value}) exceeds the sum of the rest (${restSum})`
      : `"${resolved.name}"'s own value in "${valueColumn.name}" is ${Number.isNaN(value) ? "not numeric" : value}, not the column's maximum (${valueColumn.max}) needed for this comparison`,
  };
}

function checkNumericRanges(text, columns, consumedSpans, table = {}) {
  const claims = [];
  const seen = new Set();
  const numericColumns = columns.filter((c) => c.type === "number" && c.min !== null && c.min !== undefined && c.max !== null && c.max !== undefined);
  const yearColumn = findYearColumn(columns);
  const coverageColumn = findCoverageColumn(columns);
  // ROUND SIX — the frozen table itself, not only its profile. Rows settle a thousands separator,
  // confirm that a numeral is a value the table actually holds, and split a signed column's total
  // into the two totals it really has; `rowCount` and a column's `missing` are the two structural
  // facts a takeaway's numerals were never allowed to be about (beat AA: "240 employees" and "6
  // returned no salary" both came back "could not be placed").
  const rows = Array.isArray(table.rows) ? table.rows : null;
  const rowCount = Number.isFinite(table.rowCount) ? table.rowCount : null;
  const labelColumn = labelColumnOf(columns);
  const rowSaid = (row) => {
    if (labelColumn) return `"${String(row[labelColumn.name])}"`;
    if (yearColumn && row[yearColumn.name] !== undefined) return `the row for ${row[yearColumn.name]}`;
    return "one of its rows";
  };

  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    if (consumedSpans.some(([s, e]) => start < e && end > s)) continue;

    // A RUN OF DIGITS GLUED TO A WORD IS NOT A NUMBER THE SENTENCE STATES. Round five, finding
    // X7's second half: `consumption_m3` produced a claim "3", and `Commune-063` — a real
    // identifier out of `stress-y-rural-broadband`'s own STORYBOARD.md — produced "-063", the
    // hyphen read as a minus sign. Both were then reported as unplaceable numbers, which is
    // noise a journalist has to read past, and the second is the same shape the profiler's own
    // `Commune-001` -> -1 defect wears one module over. Only the LEFT side is decisive: a letter
    // AFTER a numeral is usually its unit ("104.2%", "5km"), while a letter BEFORE it is an
    // identifier.
    if (start > 0 && /[\p{L}_]/u.test(text[start - 1])) continue;

    // One number reader, shared with `intake/scripts/profile.mjs` (finding 4) — a token this
    // regex matched but `readNumericToken` cannot resolve to one value is ONE unverifiable claim,
    // never two independent fragments silently re-tested against a column's range.
    //
    // ROUND SIX: a token `readNumericToken` calls ambiguous gets ONE more question put to it, and
    // only one — not "what could this token be" but "which of its two readings does the frozen
    // table actually hold" (see `settleGroupedNumeral`). The token reader itself is untouched: it
    // is a byte-identical copy of intake's and it answers about a token alone, which is a
    // different question from the one this file is in a position to ask.
    const token = readNumericToken(raw);
    if (!token) continue;
    const settled = token.ambiguous ? settleGroupedNumeral(raw, columns, rows) : null;
    const read = settled ?? token;
    const settledNote = settled ? settled.settledNote : "";

    // The numeral AND the scale word beside it are one claim: "1.12 million" is what the
    // sentence says, and quoting back "1.12" alone would hide the reading that placed it.
    const multiplier = read.ambiguous ? null : multiplierAfter(text, end);
    const claimText = multiplier ? text.slice(start, multiplier.end) : raw;
    if (seen.has(claimText)) continue;
    seen.add(claimText);
    const say = (verdict, detail) => claims.push({ claim: claimText, verdict, detail: `${detail}${settledNote}` });

    if (read.ambiguous) {
      claims.push({ claim: claimText, verdict: "unverifiable", detail: read.reason });
      continue;
    }

    if (numericColumns.length === 0) {
      say("unverifiable", "profile has no numeric column with a range to check against");
      continue;
    }

    // EVERY READING THIS NUMERAL HAS, best-known first — as written, then once for each factor
    // its stated scale word could carry. The rounding window travels with the reading: "2.7
    // million" is rounded to the hundred thousand, not to the tenth.
    const window = roundingWindowOf(raw);
    const readings = [{ value: read.value, window, note: "" }];
    for (const factor of multiplier ? multiplier.factors : []) {
      readings.push({
        value: read.value * factor,
        window: window * factor,
        note: ` (reading the stated "${multiplier.word}" as a multiplier: ${read.value * factor})`,
      });
    }
    const value = read.value;

    // ROUND SIX, finding Z2 — THE COMPARATOR THAT GOVERNS THIS NUMERAL, read before any evidence
    // is offered for it. See `relationBefore` for the whole argument; in one line, an equality is
    // evidence FOR a sentence asserting equality and evidence AGAINST one asserting an inequality,
    // and reading the numeral without the relation is how "the sum of the parts is GREATER than
    // 100" came back `supported` on a column summing to exactly 100.
    const relation = relationBefore(text, start);

    // A part-to-whole TOTAL is tried FIRST, because it is the one numeric reading here that can
    // actually fail: a column's `sum` is a single number computed from every row, and a takeaway
    // hitting it within tolerance has been CONFIRMED, not merely placed. Two guards keep that
    // from degenerating: the year column is never a total (a six-row 2025 column "sums" to
    // 12150), and neither is a column whose sum equals its own min or max — `stress-s`'s one-row
    // `year` sums to exactly 2026, so without this the very numeral finding 4 is about would come
    // back "equals the sum of column year", a worse tautology than the one it replaced.
    const totalCandidates = numericColumns.filter(
      (c) =>
        c !== yearColumn &&
        c.sum !== null &&
        c.sum !== undefined &&
        c.sum !== c.min &&
        c.sum !== c.max,
    );
    let summed = null;
    for (const reading of readings) {
      const hit = totalCandidates.find((c) => matchesAggregate(reading.value, c.sum, reading.window));
      if (hit) {
        summed = { column: hit, reading };
        break;
      }
    }
    if (summed) {
      const column = summed.column;
      const totals = columnTotals(column, rows);
      const note = cancellationNote(column, totals);
      if (!relation) {
        say("supported", `equals the sum of column "${column.name}" (${column.sum})${summed.reading.note}${note}`);
        continue;
      }
      // The sentence asserts a RELATION about this total, so the total is put to that relation
      // rather than to equality. A column carrying a negative member has two totals (its net and
      // its positive parts) and they can answer differently — `stress-z-budget-parts` nets to 100
      // and its positive parts sum to 109.7, so "supérieure à 100" is false of one and true of the
      // other. Two answers is not a verdict; it is a question for the journalist, named as one.
      const said = relationSaid(relation.kind, summed.reading.value);
      const answers = totals.map((t) => relationHolds(relation.kind, t.value, summed.reading.value));
      const listed = totals
        .map((t) => (t.kind === "positive" ? `its positive members alone sum to ${t.value}` : `it sums to ${t.value}`))
        .join(", and ");
      if (answers.every(Boolean)) {
        say("supported", `this sentence claims a total ${said}, and column "${column.name}" satisfies it — ${listed}${summed.reading.note}${note}`);
      } else if (answers.every((a) => !a)) {
        say("contradicted", `this sentence claims a total ${said}, and column "${column.name}" does not satisfy it — ${listed}${summed.reading.note}${note}`);
      } else {
        say(
          "unverifiable",
          `this sentence claims a total ${said}, and column "${column.name}" answers that TWO WAYS — ${listed}${note}. Which of the two totals this sentence means is not decidable here`,
        );
      }
      continue;
    }

    // WHICH COLUMN THIS NUMERAL IS EVEN ALLOWED TO BE PLACED IN (round five, finding T13 and the
    // "consistent" question). A range hit used to be taken from `numericColumns` in profile
    // order, with nothing asked about whether that column was plausibly the sentence's subject —
    // so on `stress-y-rural-broadband` the survey year `2025` was "placed" inside
    // `households [240, 47933]` and reported `consistent`, and on `stress-t-europe-recycling` a
    // sentence whose superlative was refused for want of a named column had its own numeral
    // placed in `collected_kt` anyway: two clauses of one sentence decided against two different
    // columns. So the numeral is now put to the SAME question every other shape in this file
    // asks — `chooseValueColumn` on its own sentence — and a numeral the sentence gives no
    // column for is reported unplaced, naming where it would have landed, rather than placed by
    // arithmetic alone.
    const sentence = sentenceAround(text, start, end);
    const chosen = chooseValueColumn(columns, sentence);
    const wouldLandIn = [
      ...new Set(readings.flatMap((r) => numericColumns.filter((c) => r.value >= c.min && r.value <= c.max))),
    ];
    const rangeOf = (list) => list.map((c) => `"${c.name}" [${c.min}, ${c.max}]`).join(", ");
    const readingsTried =
      readings.length > 1 ? ` (read both as written and as ${readings[readings.length - 1].value})` : "";
    let target = chosen.column;

    // A BARE CALENDAR YEAR IS A PERIOD, not a measurement — and ROUND SIX splits that rule in two,
    // because round five's version decided both halves the same way and was wrong about each of
    // them once. `stress-ac-alcanede-kilns` says "the kilns employed 1,860 people in 1980": `1860`
    // is `workers`' own maximum and it was placed on the PERIOD column, which cannot hold it;
    // `stress-ab-emigration-flows` has no period column at all, and its survey year `2025` landed
    // inside `people_2025 [1900, 18400]` and came back `consistent`, which is the coincidence
    // round five's own finding T13 was about, reached by the other road.
    //
    // The frozen table decides both. A year-shaped numeral belongs to the period column when that
    // column's own range covers it; otherwise it belongs to the column this sentence names ONLY IF
    // that column actually HOLDS the number, which is what tells a measure value shaped like a year
    // from a year placed among measurements by arithmetic. Neither: refused, naming both misses.
    const periodColumn =
      yearColumn && yearColumn.type === "number" && Number.isFinite(yearColumn.min) && Number.isFinite(yearColumn.max)
        ? yearColumn
        : null;
    if (looksLikeCalendarYear(raw) && !multiplier) {
      const inPeriod = periodColumn !== null && value >= periodColumn.min && value <= periodColumn.max;
      const holder = chosen.column && rowHolding(rows, chosen.column, value) ? chosen.column : null;
      if (inPeriod) target = periodColumn;
      else if (holder) target = holder;
      else {
        say(
          "unverifiable",
          `"${raw}" reads as a calendar year` +
            (periodColumn
              ? `, and this profile's period column ${rangeOf([periodColumn])} does not cover it`
              : `, and this profile carries no period column to place it against`) +
            (chosen.column
              ? `; the column this sentence names, "${chosen.column.name}", does not hold that value in any frozen row either, so placing it there would be a coincidence`
              : `; and ${chosen.refusal}`) +
            (wouldLandIn.length > 0 ? ` (it does fall inside ${rangeOf(wouldLandIn)})` : "") +
            refusedColumnNote(columns),
        );
        continue;
      }
    }

    if (!target) {
      say(
        "unverifiable",
        `"${claimText}" was not placed: ${chosen.refusal}` +
          (wouldLandIn.length > 0 ? ` (it would fall inside ${rangeOf(wouldLandIn)})` : "") +
          refusedColumnNote(columns),
      );
      continue;
    }

    const placed = readings.find((r) => r.value >= target.min && r.value <= target.max);
    if (placed) {
      // Partial periods, narrowly (finding 2). A bare numeral landing inside the YEAR column's
      // range reads as "this period is comparable to the others" — a coverage-marking column says
      // the profile itself carries at least one period that is not, and this check has no row
      // data to know whether THIS numeral is the affected one, so it refuses to confirm rather
      // than guess: the exact stress-j-partial-year-permits shape ("Building permits collapse in
      // 2026" — "2026" alone, trivially inside `year`'s range, used to come back "supported" with
      // `months_covered` recording that row at 3 of 12 months).
      if (coverageColumn && target === yearColumn) {
        say(
          "unverifiable",
          `"${raw}" falls inside "${yearColumn.name}"'s range, but the profile carries a "${coverageColumn.name}" column marking some period incomplete — a bare year cannot be confirmed comparable without knowing which row that is`,
        );
        continue;
      }
      const degenerate = target.min === target.max;

      // ROUND SIX, beat AA — WHAT A RANGE HIT ACTUALLY MATCHED, said out loud. The verdict does not
      // move: a numeral equal to a column's `min` or `max`, or held verbatim in one of its rows, is
      // `consistent` and NEVER `supported`, which is round four's rule and this round re-states it
      // rather than trading it away. What was wrong was the EVIDENCE. `238530` — the number
      // `stress-aa-salary-spread`'s chart prints as the highest salary — came back "within the range
      // of column annual_salary_eur [14664, 238530]", an answer that hides the fact it IS that
      // maximum; a journalist reading it cannot tell an exact hit from a numeral that merely fell
      // between two bounds. So the detail now names the match, and only the detail.
      //
      // A DEGENERATE column keeps its own sentence (min === max is a check that cannot fail), and a
      // bare calendar year keeps the period column's, because "the table covers 2026" is not a fact
      // about a measurement at all.
      let matched = "";
      if (!degenerate && !looksLikeCalendarYear(raw)) {
        if (sameNumber(placed.value, target.max)) {
          matched = ` — and it is exactly that column's maximum (${target.max})`;
        } else if (sameNumber(placed.value, target.min)) {
          matched = ` — and it is exactly that column's minimum (${target.min})`;
        } else {
          const row = rowHolding(rows, target, placed.value);
          if (row) matched = ` — and the frozen table holds it verbatim for ${rowSaid(row)}`;
        }
      }

      // ROUND FOUR, finding 1 — the verdict that says what a range hit is actually worth. A
      // numeral sitting between a column's min and its max has been PLACED: it is the right order
      // of magnitude, in the right units, for a column this table carries. That is a real and
      // useful fact and it is still reported. What it is NOT is editorial support: `233` falls
      // inside `incidents [96, 412]` and `100` — the "k" of "100k" — does too, and neither is
      // evidence for the sentence they sit in. "consistent" is therefore its own verdict, and
      // `propose.mjs`'s `groundingScalar` cannot close G1 on it (see `resolveGrounding`).
      say(
        "consistent",
        (degenerate
          ? `"${claimText}" equals the only value column "${target.name}" holds (${target.min}) — a range whose min and max are the same value is a check that CANNOT FAIL, so this places the numeral and confirms nothing`
          : `within the range of column "${target.name}" [${target.min}, ${target.max}]${matched} — that places the numeral, it does not confirm the claim it sits in`) + placed.note,
      );
      continue;
    }

    // ROUND SIX, beat AA — `rowCount` AND `column.missing` ARE A NUMERAL'S HOME. The chart the beat
    // shipped prints "234 of the company's 240 employees; 6 returned no salary". Both of those
    // numbers are stated by the frozen profile — `rowCount` is 240, `annual_salary_eur.missing` is
    // 6 — and both came back "could not be placed in the column this sentence names", because the
    // only homes a numeral had were a column's range and a column's sum. They are tried only once a
    // numeral has FAILED to be a member of the column its sentence names, so a numeral that is
    // plausibly a measurement is never re-read as a fact about the table's shape instead; and a
    // relation excludes them for the same reason it excludes an exact match above.
    if (!relation) {
      if (rowCount !== null && sameNumber(value, rowCount)) {
        say("supported", `equals the number of rows the frozen table carries (${rowCount})`);
        continue;
      }
      const blankIn = [target, ...columns].find(
        (c) => c && Number.isFinite(c.missing) && c.missing > 0 && sameNumber(value, c.missing),
      );
      if (blankIn) {
        say("supported", `equals the number of blank cells column "${blankIn.name}" carries (${blankIn.missing}), as the frozen profile records them`);
        continue;
      }
    }

    // Neither a member of the column this sentence is about nor a column total. That is this
    // function failing to place the number, which is not the same fact as the data refuting it —
    // see the header.
    say(
      "unverifiable",
      `could not be placed in the column this sentence names, "${target.name}" [${target.min}, ${target.max}]${target.sum === null || target.sum === undefined ? "" : `, sum ${target.sum}`}, nor read as any column's total${readingsTried}` +
        (wouldLandIn.length > 0 ? ` (it does fall inside ${rangeOf(wouldLandIn)}, which this sentence does not name)` : "") +
        ` — this check has no way to confirm or refute it${refusedColumnNote(columns)}`,
    );
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
//
// ROUND FOUR, finding 4 adds `decided`. `evaluated` answers "did this function have a shape for
// that sentence at all", which is the distinction round three needed; it does NOT answer "did the
// frozen data settle anything in it", and a caller collapsing N verdicts into one scalar needs
// that second number. A sentence is DECIDED once it produced at least one claim the data actually
// resolved — `supported` or `contradicted`. A `consistent` numeral does not decide a sentence:
// placing "2026" inside `year [2026, 2026]` is a check that cannot fail, and the scalar it used
// to close G1 with is precisely what this field exists to prevent.
function computeCoverage(text, claims) {
  const sentences = splitIntoSentences(text);
  const claimsIn = (sentence) => claims.filter((c) => sentence.includes(c.claim));
  const unevaluated = sentences.filter((sentence) => claimsIn(sentence).length === 0);
  const decided = sentences.filter((sentence) =>
    claimsIn(sentence).some((c) => c.verdict === "supported" || c.verdict === "contradicted"),
  );
  return {
    sentences: sentences.length,
    evaluated: sentences.length - unevaluated.length,
    decided: decided.length,
    unevaluated,
    // THE STATED MISS (round five, finding X1). `unevaluated` says WHICH sentences produced nothing;
    // this says whether the reason might be that this file's vocabularies were never in a position
    // to read them at all. Empty is the ordinary answer and is itself information: it means a
    // sentence that produced no claim produced none for a reason other than its script.
    unreadable: scriptsNotRead(text),
    // ROUND SIX, finding C1 — the same miss one level finer, and the level it was actually hiding
    // on. `stress-ad-polish-hospital-beds` asserts a superlative (`najwi\u0119cej`) in Polish, which is
    // written in the Latin script, so `unreadable` above came back EMPTY and this function reported
    // a confident "I read this sentence and there was nothing to check". A letter none of the four
    // declared languages is written with says the sentence is in a fifth language without this file
    // being taught one.
    unreadableLetters: lettersNotRead(text),
  };
}

// Returns `{ claims, coverage }` — see `computeCoverage` above for what `coverage` reports and
// who reads it. `claims` keeps its own established shape (one `{ claim, verdict, detail }` entry
// per recognised claim); this wraps it rather than changing it, so every existing reader of the
// array itself only has to learn the one extra level.
export function groundTakeaway(takeaway, profile, options = {}) {
  if (!takeaway || typeof takeaway !== "string") {
    return {
      claims: [],
      coverage: { sentences: 0, evaluated: 0, decided: 0, unevaluated: [], unreadable: [], unreadableLetters: [] },
    };
  }
  const base = profile ?? {};
  const columns = Array.isArray(base.columns) ? base.columns : [];
  // Rows: the profile's own if it carries them (no frozen profile in this tree does), otherwise
  // the frozen CSV the caller handed over. See `readFrozenRows` for why this is where they come
  // from now.
  const rows = Array.isArray(base.rows)
    ? base.rows
    : typeof options.csv === "string"
      ? readFrozenRows(options.csv)
      : null;
  const p = rows ? { ...base, rows } : base;

  const comparisons = extractComparisons(takeaway);
  const claims = comparisons.map((item) => resolveComparison(item, p, takeaway));

  const consumedSpans = comparisons.map((c) => [c.start, c.end]);
  claims.push(...checkNumericRanges(takeaway, columns, consumedSpans, { rows, rowCount: base.rowCount }));

  return { claims, coverage: computeCoverage(takeaway, claims) };
}
