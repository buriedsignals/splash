// twin/skills/intake/scripts/profile.mjs
import { readHeader } from "./header.mjs";

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

// ────────────────────────────────────────────────────────────────────────────────────────────
// THE LEXICON DECLARATION, COPIED FROM `storyboard/scripts/ground-claim.mjs` BYTE FOR BYTE.
//
// This tree allows no cross-skill runtime import, so a decision that reaches a second skill is
// written out again where its reader can see it and held identical by
// `splash/test/guard-copies-parity.test.ts` — the same arrangement `readNumericToken` and the
// denominator tokens below already have. What follows is that file's own lexicon policy and its
// two coverage nets; this profiler's denominator detector is bound to the same four languages and
// so owes the same answer when it meets a fifth.
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
  // ROUND SIX, task LANG — THE SAME CONCEPT'S NAMES, MEASURED RATHER THAN REMEMBERED.
  //
  // Everything above this line is the hand-written floor and stays exactly as it was. What follows
  // is GENERATED: `scripts/concept-labels.mjs --write` copies it out of
  // `skills/doctrine/references/concept-labels.json`, which was measured once from Wikidata's own
  // labels and aliases for `human population`, `inhabitant`, `household`, `student` and
  // `schoolchild` — 165, 64, 68, 153 and 88 languages — and VENDORED. Nothing here reaches a
  // network, at runtime or at all: a lexicon that needs one is a lexicon that fails in a newsroom
  // without one. CLDR was measured first and does not carry these concepts — 1 of the 12 this
  // toolchain's three word lexicons key on, and that one is `percent`.
  //
  // ONLY TOKENS NO CHARACTER TEST IN THIS TREE CAN SEE are vendored: every letter in each one is a
  // letter one of the four declared languages is written with, which is exactly the half of the
  // problem `lettersNotRead` cannot reach. Dutch `bevolking` is that half — plain ASCII, and before
  // this list it produced no denominator, no unread sibling and no doubt at all. Polish `ludno\u015b\u0107`
  // is the other half and is deliberately NOT here: the letter net already names it, and reporting
  // a gap once between the two mechanisms is the rule both of them follow.
  // >>> generated: population — bun run scripts/concept-labels.mjs --write
  "abitante",
  "abitanti",
  "alumnado",
  "alumne",
  "alumno",
  "aluna",
  "alunna",
  "alunno",
  "aluno",
  "asukas",
  "asukasluku",
  "banor",
  "beboere",
  "befolkning",
  "befolkningstal",
  "bevolking",
  "bev\u00f6lkerung",
  "bewohner",
  "biztanle",
  "biztanlego",
  "biztanleria",
  "dalta",
  "daonra",
  "deixeble",
  "discente",
  "dweller",
  "einwohner",
  "elanik",
  "elev",
  "estudante",
  "estudantil",
  "estudiant",
  "estudiante",
  "folkeauke",
  "folkemengd",
  "folkesetnad",
  "folketal",
  "folkevekst",
  "gospodinjstvo",
  "gyventoja",
  "gyventojai",
  "gyventojas",
  "habitante",
  "habitantes",
  "haushalt",
  "huishouden",
  "husstand",
  "ikasle",
  "indbygger",
  "indbyggere",
  "infrau",
  "innbyggarar",
  "innbyggartal",
  "innbygger",
  "innbyggere",
  "innbyggjar",
  "innbyggjartal",
  "innfrau",
  "inwoner",
  "inwoners",
  "inwonertal",
  "kotitalous",
  "koululainen",
  "krajan",
  "lakos",
  "leerling",
  "leerlinge",
  "leibkond",
  "locuitor",
  "locuitori",
  "majapidamine",
  "mannfj\u00f6ldi",
  "mieszkaniec",
  "mokinys",
  "moksleivis",
  "morador",
  "nemandi",
  "nemi",
  "nx\u00ebn\u00ebs",
  "n\u00e9pesed\u00e9s",
  "n\u00e9pess\u00e9g",
  "n\u00fcfus",
  "obyvatel",
  "obyvatelka",
  "obyvatelstvo",
  "occupant",
  "opiskelija",
  "oppilas",
  "oturan",
  "peupl\u00e9",
  "popolazione",
  "popolazzjoni",
  "populacija",
  "populazio",
  "populazioa",
  "populiacija",
  "prebivalci",
  "prebivalec",
  "prebivalstvo",
  "rahvastik",
  "residentes",
  "resider",
  "sakin",
  "schoolboy",
  "schoolchild",
  "schoolgirl",
  "schulkind",
  "sch\u00fcler",
  "sch\u00fclerin",
  "skolbarn",
  "skolebarn",
  "skoleelev",
  "skolelev",
  "skolflicka",
  "skolniece",
  "skolnieks",
  "skolpojke",
  "stanovnik",
  "studentai",
  "studentas",
  "studente",
  "studenter",
  "studenterna",
  "studentessa",
  "studenti",
  "studentica",
  "studentin",
  "studentka",
  "student\u00eb",
  "studerade",
  "studerande",
  "studere",
  "studerede",
  "studerende",
  "studeret",
  "studierende",
  "studierender",
  "studierne",
  "studiet",
  "studine",
  "s\u00e2kin",
  "talebe",
  "talous",
  "tudeng",
  "tudengid",
  "uczniak",
  "v\u00e4est\u00f6",
  "v\u00e4est\u00f6luku",
  "v\u00e4kiluku",
  "yerli",
  "\u00e9tudiant",
  "\u00e9tudiante",
  "\u0627\u0644\u062a\u062c\u0645\u0639",
  "\u0627\u0644\u062a\u0644\u0627\u0645\u064a\u0630",
  "\u0627\u0644\u062a\u0644\u0645\u064a\u0630",
  "\u0627\u0644\u062a\u0644\u0645\u064a\u0630\u0629",
  "\u0627\u0644\u0637\u0627\u0644\u0628",
  "\u0627\u0644\u0637\u0627\u0644\u0628\u0629",
  "\u0627\u0644\u0637\u0644\u0628\u0629",
  "\u062a\u062c\u0645\u0639",
  "\u062a\u0644\u0645\u064a\u0630\u0629",
  "\u0637\u0627\u0644\u0628\u0629",
  "\u0637\u0644\u0628\u0629",
  // <<< generated
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

// WHAT THIS PROFILER COULD NOT READ IN A COLUMN'S OWN NAME — the script net and the letter net
// asked together, so a gap is named once by whichever of the two can see it and never twice.
function namesNotRead(name) {
  return [...scriptsNotRead(name), ...lettersNotRead(name)];
}

// A DENOMINATOR THIS PROFILER CANNOT NAME (round six, finding C2).
//
// `namesADenominator` answers by matching name tokens against a list written in four languages,
// and until this round a NO from that list was reported as nothing at all — the same empty answer
// a table with no denominator in it gets. `stress-ad-polish-hospital-beds` carries `ludność`
// (population) one column from `łóżka_szpitalne`; the article's own second paragraph raises the
// per-capita reading, and this profile said nothing. Adding Polish would close that table and
// leave the next one exactly as silent, so what is closed here is the SHAPE: a lexicon's negative
// is reported with its own reach when the names it rejected were names it could not read.
//
// It still never claims an unread column IS a denominator — identity, never shape, unchanged, and
// `denominator` above stays the only field that names one. This names the columns whose language
// this profiler does not read, so the journalist can put the question this profiler could not.
function unreadSiblingsOf(column, columns) {
  return columns
    .filter((c) => c !== column && c.type === "number" && namesNotRead(c.name).length > 0)
    .map((c) => ({ name: c.name, notRead: namesNotRead(c.name) }));
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

// ==================================================================================================
// THE PANEL — one row per entity per period, which is the shape of essentially all open data, and
// the shape this profiler could not describe at all until three real Our World in Data stories were
// run end to end against it.
//
// What the three frozen files carry, and what the profile said about it:
//
//   * 3 900 rows of `entity, code, year, events` (wildfires), 7 585 (renewable share), 21 565 (life
//     expectancy). Every profile described four columns of a flat table. `rowCount` was read as a
//     count of subjects; it is 260 entities x 15 periods.
//   * NINE of the wildfire file's 260 "entities" are AGGREGATES of the other rows — `World`, six
//     continents, `European Union (27)`, `Europe (excl. Russia)`. The article's own question was
//     "where is the count heaviest"; taken off the file it answers *the World*, then *Africa*, then
//     a country. The only signals in the profile were `entity.distinct 260` against
//     `code.distinct 259`, which point at the ONE aggregate with no code, not at the nine.
//   * `year.gaps: []` over `[1900, 2025]` reads as full coverage. The Ember file carries 245
//     entities in 2022 and 114 in 2025 — a full RANGE is not full COVERAGE.
//   * `duplicates: 0` is true (no repeated ROW) and reads as an answer to a question about repeated
//     subjects that it never asked: there are 260 rows per year.
//
// Everything below is DERIVED from the table. There is no list of aggregate names anywhere in this
// file, deliberately: a hand-typed "World, Africa, Asia…" is the exact shape this repository has
// been burned by, and it would leave `ASEAN (Ember)` and `Europe (excl. Russia)` invisible.
// ==================================================================================================

/** A period column is an x axis, not a measure. `year.sum = 7 874 100` was the largest-looking
 *  number in the wildfire profile and it is the total of a calendar. Withheld, and the withholding
 *  is said rather than left to read like a text column's empty total. */
const SEQUENCE_TOTAL_WITHHELD =
  "no total: this column is a sequence (see gaps), and the sum of a period is not a measure of anything";

// ==================================================================================================
// COPIED FROM `storyboard/scripts/ground-claim.mjs`, BYTE FOR BYTE (see COPIES in
// `splash/test/guard-copies-parity.test.ts`). Two skills must not answer "is this a panel, and which
// column names its subject" differently about the same frozen file: the profiler would say panel and
// the grounding check would say flat table, and the second is the one that decides a gate.
//
// `findYearColumn` comes with it because `panelShapeOf` calls it and nothing else here does. It is
// NOT yet walked by the copies test: that test anchors a declaration on the doc comment immediately
// above it, and storyboard's copy carries none, so registering it would fail on the anchor rather
// than on a drift. Its copy is byte-identical today and the two must move together.
//
// MEASURED WHERE IT AND THIS FILE'S OWN `isSequenceColumn` DISAGREE, over the 36 frozen tables:
// `findYearColumn` picks a column by NAME with no test of its values, so on
// `stress-t-europe-recycling` it names `survey_date` — a TEXT column holding "2025-03-01",
// "01/03/2025" and "March 2025" — as the period, where `isSequenceColumn` refuses it and this
// profile's own `gaps` is `null` for every column in that table. One skill with two answers to
// "which column is the period" is the round-four defect `measureColumns` names in its own header, so
// where the two disagree this profiler publishes the disagreement (`panel.periodNotASequence`)
// rather than a period its own typing refuses. The fix belongs in the ONE decision, in both copies:
// prefer a column the table's own values make a sequence, and fall back to the name.
// ==================================================================================================
/**
 * THE SHAPE OF A PANEL, DERIVED FROM THE ROWS (three real stories, 2026-08-22).
 *
 * Every fixture this file was built against holds ONE row per period, and every check below was
 * written on that assumption. Real open data is not that shape: Our World in Data, the World Bank,
 * Eurostat and Ember all publish one row per ENTITY per period, and on a 7,585-row file "higher in
 * 2023 than in 2000" was answered from `ASEAN (Ember)`'s rows — the first rows of those years —
 * for a sentence about the world, and came back `supported`. The same reading came back
 * `contradicted`, the verdict that BLOCKS G1, on a true sentence about Ghana.
 *
 * So the shape is established before anything is read out of the table, and it is DERIVED, never
 * named: a table is a panel when one period value carries more than one row, and the column that
 * keys those rows apart is the text column whose value is unique WITHIN every period. That test is
 * arithmetic on the table in hand; a list of column names ("entity", "country", "iso3") would have
 * been a population typed rather than derived, which is the defect this repository keeps finding.
 *
 * Where several columns key the rows apart — the Ember file's `entity` and `code` both do — the one
 * that is never blank wins, then the one carrying more distinct values, then the leftmost. `code`
 * is blank on 645 of those rows, and a key that is sometimes absent cannot name a subject.
 */
export function panelShapeOf(columns, rows) {
  const periodColumn = findYearColumn(Array.isArray(columns) ? columns : []);
  if (!periodColumn || !Array.isArray(rows) || rows.length === 0) return { isPanel: false, periodColumn: periodColumn ?? null, entityColumn: null };
  const perPeriod = new Map();
  for (const row of rows) {
    const key = String(row[periodColumn.name]);
    perPeriod.set(key, (perPeriod.get(key) ?? 0) + 1);
  }
  const rowsPerPeriod = Math.max(...perPeriod.values());
  if (rowsPerPeriod <= 1) return { isPanel: false, periodColumn, entityColumn: null };

  const keyed = [];
  for (const column of columns.filter((c) => c.type === "text")) {
    const seen = new Set();
    const values = new Set();
    let blank = 0;
    let collides = false;
    for (const row of rows) {
      const raw = row[column.name];
      const written = raw === null || raw === undefined ? "" : String(raw).trim();
      if (written === "") {
        blank += 1;
        continue;
      }
      const lower = written.toLowerCase();
      values.add(lower);
      // A separator written as an ESCAPE, not as the byte itself. A raw NUL in the source makes
      // every text tool treat this 200 KB file as binary — `grep -rn` skips it in silence, which
      // is a worse defect than the collision it prevents. `\u0000` cannot appear in a CSV cell,
      // so "2025" + "a" and "2025a" + "" still key apart.
      const pair = `${row[periodColumn.name]}\u0000${lower}`;
      if (seen.has(pair)) {
        collides = true;
        break;
      }
      seen.add(pair);
    }
    if (collides || values.size < 2) continue;
    keyed.push({ column, blank, distinct: values.size, at: columns.indexOf(column) });
  }
  keyed.sort((a, b) => a.blank - b.blank || b.distinct - a.distinct || a.at - b.at);
  return {
    isPanel: true,
    periodColumn,
    entityColumn: keyed[0]?.column ?? null,
    rowsPerPeriod,
    periods: perPeriod.size,
  };
}
/**
 * THE COLUMN A TABLE'S PERIODS LIVE IN — decided by NAME AND VALUE, never by name alone.
 *
 * This used to return the first column whose name carried "year", "date" or "année", with nothing
 * asked about what it held, and two frozen stories show what that costs. `stress-aa-salary-spread`
 * carries `years_service [0, 34]` — a TENURE, one of the things that table measures — and it was
 * taken as the period column, so it was struck out of `measureColumns` and every panel question was
 * asked about it. `stress-t-europe-recycling` carries a text `survey_date` written three different
 * ways ("2025-03-01", "01/03/2025", "March 2025"), which is a period nothing can compare as a
 * number, and `isSequenceColumn` in `intake/scripts/profile.mjs` already said so — two decisions in
 * this tree disagreeing about the same column.
 *
 * So the same rule the coordinate test below already states applies here: the name proposes and the
 * values decide. A column named for a period whose values are not period-shaped is not the period
 * column; a column of period-shaped values is, whatever it is called. A table with neither has no
 * period column, which is an answer — and a better one than a tenure.
 */
export function findYearColumn(columns) {
  const holdsPeriods = (c) =>
    c.type === "number" && Number.isInteger(c.min) && Number.isInteger(c.max) && c.min >= 1500 && c.max <= 2100;
  const namesAPeriod = (c) => /year|date|ann[ée]e/i.test(c.name);
  // A NUMERIC column named for a period has made a claim its own values can be held to, and
  // `years_service [0, 34]` fails it. A TEXT one has made no such claim — "2025-03-01" is a period
  // this file cannot compare as a number, which is a different fact and one `intake`'s
  // `periodNotASequence` says out loud rather than settling here.
  const named = columns.filter((c) => namesAPeriod(c) && (c.type !== "number" || holdsPeriods(c)));
  return named.find(holdsPeriods) ?? named[0] ?? columns.find(holdsPeriods) ?? null;
}

/** HOW MANY ENTITIES EACH PERIOD CARRIES. `findGaps` answers about the SEQUENCE — which steps are
 *  missing between the lowest and the highest — and a year present for 114 subjects and absent for
 *  131 is not a missing step. Both numbers are true and only together are they a picture: Ember's
 *  own article quotes the profile's "246 entities from 1900 to 2025" while 1900 holds two series and
 *  2025 holds 114. A producer reaching for "the latest year" — the obvious move — silently drops
 *  more than half the world. */
function coverageOf(entity, period, rowCount) {
  const seen = new Map();
  for (let i = 0; i < rowCount; i++) {
    const p = period._values[i];
    const subject = entity._values[i];
    if (subject === "") continue;
    if (!seen.has(p)) seen.set(p, new Set());
    seen.get(p).add(subject);
  }
  const byPeriod = [...seen]
    .map(([p, subjects]) => ({ period: Number(p), entities: subjects.size }))
    .sort((a, b) => a.period - b.period);
  let fullest = byPeriod[0];
  let thinnest = byPeriod[0];
  for (const step of byPeriod) {
    if (step.entities > fullest.entities) fullest = step;
    if (step.entities < thinnest.entities) thinnest = step;
  }
  return { byPeriod, fullest: { ...fullest }, thinnest: { ...thinnest } };
}

/** A value's SHAPE, so a code unlike every other code can be seen without knowing what codes look
 *  like. Letters collapse to `A`/`a` and digits to `9`, everything else stays: `AFG` is `AAA`,
 *  `OWID_WRL` is `AAAA_AAA`, `OWID_EU27` is `AAAA_AA99`. */
function shapeOf(value) {
  return value.replace(/\p{Lu}/gu, "A").replace(/\p{Ll}/gu, "a").replace(/\p{Nd}/gu, "9");
}

/** THE TABLE'S OWN STRUCTURE, PROPOSING — never deciding. A published panel carries a code column
 *  beside its entity column, one code per entity, and the aggregates in it are exactly the rows the
 *  publisher could not give a country code to: `World` is `OWID_WRL` where 248 rows are `AAA`, and
 *  `Europe (excl. Russia)` has no code at all.
 *
 *  This is a PROPOSAL and it over-reaches by construction: the same test sweeps in Kosovo, Northern
 *  Cyprus and Akrotiri and Dhekelia, which are places, not sums. That is why what it returns is
 *  never called an aggregate on its own — arithmetic decides where it can, and what is left is
 *  reported as the weaker evidence it is.
 *
 *  The dominant shape has to be a MAJORITY of the coded entities, because "the shape the rest have"
 *  is only a fact when there is a rest; a code column of many shapes answers nothing, and says so.
 *
 *  A code column is found by its RELATION to the entity column — one value per entity, blanks
 *  allowed — never by being named "code", which is the same identity-not-shape test
 *  `UNIT_COLUMN_NAME_RE` and `DENOMINATOR_NAME_TOKENS` make for their own questions. */
function structurallyUnlikeRows(entity, period, columns, rowCount) {
  for (const c of columns) {
    if (c === entity || c === period || c.type !== "text") continue;
    const byEntity = new Map();
    let functional = true;
    for (let i = 0; i < rowCount && functional; i++) {
      const name = entity._values[i];
      const value = c._values[i];
      if (!byEntity.has(name)) byEntity.set(name, value);
      else if (byEntity.get(name) !== value) functional = false;
    }
    if (!functional) continue;
    const shapes = new Map();
    let coded = 0;
    for (const value of byEntity.values()) {
      if (value === "") continue;
      coded += 1;
      const shape = shapeOf(value);
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    }
    if (coded === 0) continue;
    // A CODE NAMES EACH SUBJECT ONCE, and that is what tells a code column apart from a CATEGORY
    // column that also happens to hold one value per entity. Measured on `stress-aa-salary-spread`:
    // `department` is one value per employee, five values over 240 of them, and its majority shape
    // covers about 60% of them — so without this it proposed 96 employees as aggregate candidates on
    // a salary table. `code` in the three real panels is injective in every one: 259 codes for 259
    // coded entities, 226 for 226, 247 for 247.
    if (new Set([...byEntity.values()].filter((v) => v !== "")).size !== coded) continue;
    let dominant = null;
    let dominantCount = 0;
    for (const [shape, count] of shapes) {
      if (count > dominantCount) {
        dominant = shape;
        dominantCount = count;
      }
    }
    if (dominantCount * 2 <= coded) continue;
    const proposed = [];
    for (const [name, value] of byEntity) {
      if (value === "") proposed.push({ entity: name, proposedBy: "code-missing", code: null });
      else if (shapeOf(value) !== dominant)
        proposed.push({ entity: name, proposedBy: "code-shape", code: value });
    }
    return {
      column: c.name,
      shape: dominant,
      entitiesWithThatShape: dominantCount,
      entitiesCoded: coded,
      proposed,
    };
  }
  return null;
}

/** How many decimal places the column's own values are WRITTEN with — the only honest source for
 *  how close two sums have to be before they are the same number. A column of integers is compared
 *  exactly; a column of rounded decimals is allowed the rounding it declares, and nothing more. */
function writtenDecimals(values) {
  let most = 0;
  for (const value of values) {
    const dot = value.indexOf(".");
    if (dot >= 0) most = Math.max(most, value.length - dot - 1);
  }
  return most;
}

/** The exhaustive subset search runs over the rows the structure proposed. Where the structure
 *  answers nothing, it can still run over EVERY entity — but only while the table is small enough
 *  that "every subset" is a real number of subsets. Above this, the search is not run and says so;
 *  a search that quietly answered "no aggregates" on a table it never looked at would be worse than
 *  no search at all. */
const AGGREGATE_SEARCH_ENTITY_CEILING = 16;

/** HOW MANY PERIODS A WITNESS HAS TO SURVIVE BEFORE IT IS EVIDENCE OF ANYTHING.
 *
 *  A subset that adds up ONCE is a coincidence, and on a small table it is a frequent one:
 *  measured on `stress-b-piped-water` — nine countries, one row each, all of them 2022 — the search
 *  returned `Bosnia & Herz.`, `Macedonia` and `Republic of Moldova` as aggregates, because with nine
 *  numbers and a single period some subset adds up to almost any of them. `panelShapeOf` calls that
 *  file a panel, correctly for its own question (a period carrying several rows is a period a claim
 *  must name a subject in), and it carries no repetition at all for this one.
 *
 *  So a candidate present in fewer than two periods is not searched, and every decision carries the
 *  number of periods its witness held across, so its weight is readable rather than assumed.
 */
const AGGREGATE_MIN_PERIODS = 2;

/** A hard ceiling on the work, so a pathological table cannot hang a phase that is supposed to be
 *  silent. Exhausting it is REPORTED, never swallowed: "found none" and "stopped looking" are two
 *  different answers. */
const AGGREGATE_SEARCH_NODE_BUDGET = 200_000;

/** WHICH ROWS ARE SUMS OF OTHER ROWS, decided by arithmetic.
 *
 *  For each candidate row C, this looks for a set of OTHER rows whose values add up to C's in EVERY
 *  period C appears in. One period proves nothing — with 260 numbers, some subset adds up to almost
 *  anything — but the same set holding across fifteen periods is not a coincidence, and that is the
 *  whole strength of the test.
 *
 *  TWO SEARCHES PER CANDIDATE, and the pair is what promotes the members:
 *    1. over the proposed rows alone. For `World` this returns the six continents.
 *    2. with every row the structure did NOT propose taken as one block. For `World` this returns
 *       those 248 rows plus Kosovo, Northern Cyprus and Akrotiri and Dhekelia — the 251 real places.
 *  When both exist and share no row, two disjoint sets of this table's own rows add up to the same
 *  total in every period. The small set therefore stands in for the large one, which is what makes
 *  its members aggregates too — and it is an argument from the numbers, not from the names.
 *
 *  Non-negative columns only. The pruning that makes the search finish ("a partial sum already past
 *  the target cannot be completed") is only valid while nothing can bring a sum back down, and a
 *  signed column is a different question this does not put.
 *
 *  A witness of ONE row is refused: "A equals B in every period" is two identical series, which is
 *  worth knowing and is not an aggregate. */
function aggregatesByArithmetic({ entity, period, columns, rowCount, over, candidates }) {
  const periods = [...new Set(period._values)].map(Number).sort((a, b) => a - b);
  const periodIndex = new Map(periods.map((p, i) => [i, p].reverse()));
  const measures = columns.filter((c) => c.type === "number" && c.gaps === null && c.min !== null && c.min >= 0);
  const searchable = new Set(over);
  const decidable = new Set(candidates);
  const budget = { nodes: 0, exhausted: false };

  for (const measure of measures) {
    const vectors = new Map();
    const presence = new Map();
    for (let i = 0; i < rowCount; i++) {
      const name = entity._values[i];
      const value = measure._rowNumbers[i];
      if (value === null) continue;
      if (!vectors.has(name)) {
        vectors.set(name, new Float64Array(periods.length));
        presence.set(name, new Uint8Array(periods.length));
      }
      const at = periodIndex.get(Number(period._values[i]));
      vectors.get(name)[at] = value;
      presence.get(name)[at] = 1;
    }
    const decimals = writtenDecimals(measure._values.filter((v) => v !== ""));
    const exact = measure._rowNumbers.every((n) => n === null || Number.isInteger(n));
    const unit = exact ? 0 : 0.5 * 10 ** -decimals;
    const names = [...vectors.keys()];
    const outside = names.filter((n) => !searchable.has(n));

    const found = new Map();
    for (const candidate of names) {
      if (!decidable.has(candidate)) continue;
      const target = vectors.get(candidate);
      const here = presence.get(candidate);
      const at = [];
      for (let i = 0; i < periods.length; i++) if (here[i]) at.push(i);
      if (at.length < AGGREGATE_MIN_PERIODS) continue;
      const project = (vector) => at.reduce((sum, i) => sum + vector[i], 0);
      const targetScalar = project(target);
      const items = names
        .filter((n) => n !== candidate && searchable.has(n))
        .map((n) => ({ name: n, vector: vectors.get(n), scalar: project(vectors.get(n)) }))
        .sort((a, b) => b.scalar - a.scalar);
      const block =
        outside.length > 0
          ? outside.reduce((sum, n) => {
              const v = vectors.get(n);
              for (let i = 0; i < at.length; i++) sum[at[i]] += v[at[i]];
              return sum;
            }, new Float64Array(periods.length))
          : null;

      const matches = (running, size) => {
        const slack = unit * (size + 1) + 1e-9 * (1 + Math.abs(targetScalar));
        for (const i of at) if (Math.abs(running[i] - target[i]) > slack) return false;
        return true;
      };

      const search = (withBlock) => {
        if (withBlock && block === null) return null;
        const start = new Float64Array(periods.length);
        let startScalar = 0;
        let startSize = 0;
        if (withBlock) {
          for (const i of at) start[i] = block[i];
          startScalar = project(block);
          startSize = outside.length;
        }
        const suffix = new Float64Array(items.length + 1);
        for (let i = items.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + items[i].scalar;
        let best = null;
        const walk = (index, running, scalar, chosen) => {
          if (budget.nodes >= AGGREGATE_SEARCH_NODE_BUDGET) {
            budget.exhausted = true;
            return;
          }
          budget.nodes += 1;
          const slack = unit * (chosen.length + startSize + 1) + 1e-9 * (1 + Math.abs(targetScalar));
          if (scalar > targetScalar + slack) return;
          if (chosen.length + startSize >= 2 && Math.abs(scalar - targetScalar) <= slack) {
            if (matches(running, chosen.length + startSize) && (best === null || chosen.length < best.length)) {
              best = [...chosen];
            }
          }
          if (index >= items.length) return;
          if (scalar + suffix[index] < targetScalar - slack) return;
          const item = items[index];
          const next = Float64Array.from(running);
          for (const i of at) next[i] += item.vector[i];
          chosen.push(item.name);
          walk(index + 1, next, scalar + item.scalar, chosen);
          chosen.pop();
          walk(index + 1, running, scalar, chosen);
        };
        walk(0, start, startScalar, []);
        return best;
      };

      const alone = search(false);
      const withBlock = search(true);
      if (alone === null && withBlock === null) continue;
      const disjoint =
        alone !== null && withBlock !== null && !alone.some((n) => withBlock.includes(n));
      found.set(candidate, {
        entity: candidate,
        decidedBy: "arithmetic",
        column: measure.name,
        periods: at.length,
        members: alone ?? [...outside, ...withBlock],
        ...(disjoint
          ? {
              alsoSummedBy: withBlock.length + outside.length,
              detail: `two sets of this table's own rows that share no row add up to "${candidate}" in all ${at.length} periods: the ${alone.length} named here, and ${withBlock.length + outside.length} rows the structural test did not propose`,
            }
          : {
              detail: `these rows add up to "${candidate}" in all ${at.length} periods`,
            }),
      });
      if (disjoint) {
        for (const member of alone) {
          if (found.has(member)) continue;
          found.set(member, {
            entity: member,
            decidedBy: "arithmetic",
            column: measure.name,
            periods: at.length,
            memberOf: candidate,
            detail: `one of ${alone.length} rows that add up to "${candidate}" in all ${at.length} periods, a set sharing no row with the ${withBlock.length + outside.length} rows that also add up to it — so it stands in for a group of them`,
          });
        }
      }
    }
    if (found.size > 0) {
      return { decided: [...found.values()], column: measure.name, budget, measuresTried: measures.map((c) => c.name) };
    }
  }
  return { decided: [], column: null, budget, measuresTried: measures.map((c) => c.name) };
}

/** WHICH ROWS ARE AGGREGATES OF THE OTHER ROWS — the arithmetic answer and the structural proposal,
 *  reported apart, with which test answered on every row. */
function aggregatesOf(entity, period, columns, rowCount) {
  const structure = structurallyUnlikeRows(entity, period, columns, rowCount);
  const entities = entity.distinct;
  // WHAT THE SEARCH IS RUN OVER. A structural proposal of two rows or more narrows it to those
  // rows, which is what makes an exhaustive subset search finish on a 260-entity table. With no
  // proposal, a table small enough to enumerate is searched WHOLE — a fixture with a `Total` row
  // and no code column at all is still decided. Above that, nothing is searched, and the profile
  // says so rather than reporting "no aggregates" about a table it never looked at.
  const proposed = (structure?.proposed ?? []).map((p) => p.entity);
  const small = entities <= AGGREGATE_SEARCH_ENTITY_CEILING;
  const over = proposed.length >= 2 ? proposed : small ? [...new Set(entity._values)] : null;
  const reach =
    proposed.length >= 2
      ? `the ${proposed.length} rows the "${structure.column}" column's own shape sets apart`
      : `every one of the ${entities} entities`;
  let arithmetic;
  let decided = [];
  const periods = new Set(period._values.filter((v) => v !== "")).size;
  if (periods < AGGREGATE_MIN_PERIODS) {
    arithmetic = {
      ran: false,
      reason: `this table carries ${periods} period, and a set of rows that adds up once is a coincidence rather than an aggregate — see AGGREGATE_MIN_PERIODS`,
    };
  } else if (proposed.length === 0) {
    // THE STRUCTURE PROPOSES AND THE ARITHMETIC DECIDES, in that order, and a candidate nothing set
    // apart is not put to the arithmetic at all. Measured on `heat-pump-adoption-across-europe`:
    // ten countries over five years, and Poland plus the United Kingdom add up to the Netherlands
    // EXACTLY in all five — 5 + 3, 7 + 4, 10 + 5, 13 + 7, 17 + 9 — which is a coincidence between
    // three independent percentages and would have been reported as an aggregate. Five periods over
    // nine other rows is not enough repetition to rule that out; fifteen over eleven is, and the
    // rows the code column sets apart are the ones worth spending it on.
    //
    // The limit this leaves, said rather than hidden: an aggregate whose code is shaped like every
    // other row's is not reached here at all.
    arithmetic = {
      ran: false,
      reason: `the structural test set no row of this table apart, so there was no candidate to put to the arithmetic — a set of rows that happens to add up to another is a coincidence until something else says that row is different`,
    };
  } else if (over === null) {
    arithmetic = {
      ran: false,
      reason: `no structural test proposed two rows or more on this table and it carries ${entities} entities, more than the ${AGGREGATE_SEARCH_ENTITY_CEILING} an exhaustive subset search can be run over — nothing here was checked by arithmetic`,
    };
  } else {
    const result = aggregatesByArithmetic({ entity, period, columns, rowCount, over, candidates: proposed });
    decided = result.decided;
    arithmetic = {
      ran: true,
      over: reach,
      column: result.column,
      nodes: result.budget.nodes,
      exhausted: result.budget.exhausted,
      measuresTried: result.measuresTried,
    };
  }
  const byArithmetic = decided;
  const named = new Set(decided.map((d) => d.entity));
  const byStructure = (structure?.proposed ?? []).filter((p) => !named.has(p.entity));
  return {
    says:
      "an aggregate here is a row of this table that is the SUM of other rows of the same table. byArithmetic is DECIDED from the numbers: the same set of rows adds up to it in every period. byStructure is a proposal and nothing more — a row whose code is shaped unlike the rest of the column, or missing from it — and it also sweeps in places whose code is merely unusual. Take a proposal as a question to put to the journalist, never as an answer.",
    byArithmetic,
    byStructure,
    arithmetic,
    structure: structure
      ? {
          column: structure.column,
          shape: structure.shape,
          entitiesWithThatShape: structure.entitiesWithThatShape,
          entitiesCoded: structure.entitiesCoded,
        }
      : { answered: false, reason: "no column of this table holds one stable code per entity with a shape most of them share" },
  };
}

// A STATED INCOMPLETENESS IS PROSE, AND THE GUARD DOWNSTREAM LOOKS FOR A COLUMN.
//
// The wildfire dataset states the single most dangerous fact about itself in its own description
// line — "Number of wildfires. The 2026 data is incomplete and was last updated 21 August 2026." —
// which `intake` freezes into `article.md` as prose and never as a column. `storyboard`'s partial-
// period guard matches a COLUMN NAME (`^months?_covered$|^coverage$|^complete(ness)?$`), so eight
// months of 2026 read as a full year beside fourteen complete ones, and its 370 394 world fires
// read as a 41% collapse.
//
// This carries the claim onto the profile as a first-class field, with the sentence that made it,
// so the guard has something to read. It is a CLAIM, not a fact: the profiler cannot check whether
// a period really is short, only that the journalist's own frozen prose says so, and the sentence
// travels with the claim for exactly that reason.
//
// THE REACH IS DECLARED, because a lexicon's silence must not read as a clean bill — the same
// policy `denominatorUnread` states for the denominator list one section up. Two languages here,
// not four: these are the words this author can write correctly, and a dataset stating its
// incompleteness in Greek or Arabic is a gap named out loud rather than a guess made quietly.
const INCOMPLETENESS_WORDS = [
  "incomplete",
  "partial",
  "partially",
  "preliminary",
  "provisional",
  "year to date",
  "year-to-date",
  "incomplet",
  "incomplets",
  "incomplète",
  "incomplètes",
  "partiel",
  "partiels",
  "partielle",
  "partielles",
  "préliminaire",
  "préliminaires",
  "provisoire",
  "provisoires",
];

const INCOMPLETENESS_LANGUAGES_SAID = "English and French";

/** The frozen prose as sentences.
 *
 *  A markdown draft is not one paragraph: a heading carries no full stop, so joining it to what
 *  follows would hand back "# Fires The 2026 data is incomplete." as one sentence and put the
 *  headline into a quotation the journalist never wrote. So a blank line ends a sentence the way a
 *  full stop does, heading and blockquote markers are dropped, a sentence that wrapped across two
 *  lines is rejoined, and the split takes a full stop even where a quotation closed over it
 *  (`…incomplete."*` is exactly how the wildfire article quotes the line that earned this field).
 *  The emphasis and quote marks are then trimmed off both ends of what is left. */
function sentencesOf(prose) {
  const blocks = prose.split(/\r?\n\s*\r?\n/);
  const sentences = [];
  for (const block of blocks) {
    const flat = block
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*>+\s?/, "").replace(/^\s*#{1,6}\s+/, ""))
      .join(" ")
      .replace(/\s+/g, " ");
    for (const sentence of flat
      .replace(/([.!?])(["'*_”»)\]]*)\s+/g, "$1$2\u0001")
      .split("\u0001")) {
      const trimmed = sentence.replace(/^[\s"'*_“”«»(]+/, "").replace(/[\s"'*_“”«»)]+$/, "");
      if (trimmed !== "") sentences.push(trimmed);
    }
  }
  return sentences;
}

/** A CLAIM OF INCOMPLETENESS ABOUT A PERIOD THIS TABLE HOLDS, read off the frozen prose. A sentence
 *  qualifies when it carries one of the declared words AND a numeral that is one of the period
 *  column's own values — the numeral is what ties the claim to a row of the table, and without it a
 *  sentence about an incomplete argument would read as a sentence about an incomplete year. */
function statedIncompletenessOf(prose, period) {
  const words = INCOMPLETENESS_WORDS;
  const base = { reads: INCOMPLETENESS_LANGUAGES_SAID, words, column: period.name };
  if (typeof prose !== "string" || prose.trim() === "") {
    return {
      ...base,
      readProse: false,
      claims: [],
      says: `no prose was handed to this profiler, so nothing was read: this is not a statement that the "${period.name}" column is complete`,
    };
  }
  const held = new Set(period._values.filter((v) => v !== "").map(Number));
  const claims = [];
  const seen = new Set();
  for (const sentence of sentencesOf(prose)) {
    const lower = sentence.toLowerCase();
    const said = words.find((word) =>
      new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(lower),
    );
    if (!said) continue;
    for (const numeral of sentence.match(/\d+/g) ?? []) {
      const value = Number(numeral);
      if (!held.has(value)) continue;
      const key = `${value}\u0000${sentence}`;
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push({ period: value, column: period.name, word: said, sentence });
    }
  }
  return {
    ...base,
    readProse: true,
    claims,
    says:
      claims.length > 0
        ? `the frozen prose states that a period this table holds is incomplete — a CLAIM the journalist wrote, carried here with the sentence that made it, never a fact this profiler checked`
        : `the frozen prose states no incompleteness in ${INCOMPLETENESS_LANGUAGES_SAID}; a dataset that states one in another language is not read here`,
  };
}

/** THE DENOMINATOR OF A PANEL IS A DIFFERENT FILE, so this table's silence about one is not an
 *  answer. `findDenominatorColumn` looks in the same table; every country panel published one
 *  indicator per file — Our World in Data, Eurostat, the World Bank — keeps its population and its
 *  area somewhere else. "The Democratic Republic of Congo recorded more wildfires in 2025 than any
 *  other country" is true of the raw column and is an artefact of savanna burning across 2.3
 *  million km2, and nothing in the run said so.
 *
 *  The limit cannot be removed by a profiler: it cannot fetch the other file. What it can do is stop
 *  its own silence from reading as "asked and answered", which is what this sentence is for. */
const DENOMINATOR_NOT_IN_THIS_TABLE =
  "this table holds no denominator-shaped column, and a panel published one indicator per file keeps its denominator — population, area, households — in a different file; so nothing here can decide whether this column should be read per head, and this silence is not evidence that it should not be";

export function profileTable(rows, { prose } = {}) {
  // WHERE THE HEADER IS, AND WHAT ITS BLANK NAMES MEAN — `readHeader`, argued at length in
  // `scripts/header.mjs`. This used to be `const [rawHeader = [], ...body] = rows`, and round eight
  // froze two publishers' files that broke it in opposite directions: Destatis's used range
  // overshoots its table by 16 unnamed, empty columns (profiled as 16 columns named `""`), and the
  // SLF puts three banner lines above its header (profiled as ONE column named after the institute,
  // over 1,409 rows, on a file with 21 columns and 1,406 rows). Both wrote a record the bytes deny
  // and neither could observe it. Nothing is edited here — `freezeSource` writes the publisher's
  // bytes through untouched — and every change this reading makes to the NAMES is reported on the
  // profile itself as `header`.
  //
  // A header name is metadata, not data — trim it. A value's own leading or
  // trailing space stays exactly as written; the journalist's data is not ours
  // to rewrite (e.g. "Netherlands, the" as a value must round-trip untouched).
  const reading = readHeader(rows);
  const header = reading.names;
  const body = reading.body;
  const columns = header.map((name, index) => {
    const values = body.map((row) => (row[index] ?? "").trim());
    const { type, reason, unit } = typeOf(values);
    const present = values.filter((v) => v !== "");
    // `readNumericToken` reads each value the same way `ground-claim.mjs`'s copy does; its own
    // ambiguity refusal only ever fires on a token with no sibling evidence to settle it, so a
    // value here falls back to the column-level settling `typeOf` already computed (this column
    // would not be typed "number" at all otherwise) rather than being re-refused one token late.
    // Kept ROW BY ROW, blanks as null, because the panel below has to line a value up with the row
    // it came from — an entity and a period — and a list of the present values alone cannot.
    // `numbers` is the same list with the blanks dropped, exactly as it always was.
    const rowNumbers =
      type === "number"
        ? values.map((v) => {
            if (v === "") return null;
            if (unit) return Number(splitUnit(v).core);
            const read = readNumericToken(v);
            return read && !read.ambiguous ? read.value : Number(stripThousands(v));
          })
        : [];
    const numbers = rowNumbers.filter((n) => n !== null);
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
      // A SEQUENCE HAS NO TOTAL. `year.sum = 7 874 100` was reported for a column `isSequenceColumn`
      // had already recognised as a period, and it was the largest-looking number in the profile.
      // See SEQUENCE_TOTAL_WITHHELD.
      sum: gaps === null && numbers.length ? numbers.reduce((a, b) => a + b, 0) : null,
      ...(gaps !== null && numbers.length ? { sumWithheld: SEQUENCE_TOTAL_WITHHELD } : {}),
      // Which values a percentage column states above 100 — see percentAboveHundred above. Absent,
      // not null, when the column is not a percentage the DATA declared or has no such value.
      ...(percentAboveHundred.length
        ? { percentAboveHundred: { count: percentAboveHundred.length, values: percentAboveHundred } }
        : {}),
      // Which values a sequence-like column's own grain skips — see isSequenceColumn/findGaps.
      // `null` for any column where "gaps" is not a meaningful question, not merely an unanswered one.
      gaps,
      // Values themselves, kept only long enough for mixedUnitsOf (below) to check this column
      // against a sibling, and for the panel to line a value up with its own row — never returned
      // on the column itself.
      _values: values,
      _rowNumbers: rowNumbers,
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
      // The same question the named-denominator branch below puts, for a sibling whose name this
      // profiler cannot read at all — see `unreadSiblingsOf`. Reported beside `denominator` rather
      // than folded into it: one is a column this profiler NAMED, the other is a column it could
      // not read, and a reader that cannot tell them apart has been handed a guess.
      const unread = unreadSiblingsOf(column, columns);
      if (unread.length > 0 && column.gaps === null) {
        column.denominatorUnread = {
          reads: LEXICON_LANGUAGES_SAID,
          columns: unread.map((u) => u.name),
          charactersNotRead: [...new Set(unread.flatMap((u) => u.notRead))],
        };
      }
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
  }

  // THE PANEL — see the block above `SEQUENCE_TOTAL_WITHHELD`. Decided after the columns, because
  // every question it puts is a question about columns this profiler has already typed: which one
  // is a sequence, which one has no blank in it, which ones are non-negative measures.
  // ONE DECISION, NOT TWO: `panelShapeOf` is `storyboard`'s, copied byte for byte, so the profile
  // and the grounding check cannot disagree about whether a frozen file is a panel or about which
  // column names its subject. What is added here is what a PROFILE owes and a check does not: how
  // many entities each period carries, whether the panel is balanced, and which rows are sums of
  // other rows.
  const records = body.map((row) => Object.fromEntries(columns.map((c, i) => [c.name, (row[i] ?? "").trim()])));
  const shape = panelShapeOf(columns, records);
  const key = shape.isPanel && shape.entityColumn ? { entity: shape.entityColumn, period: shape.periodColumn } : null;
  let panel = null;
  if (key) {
    const coverage = coverageOf(key.entity, key.period, body.length);
    const rowsPerPeriod = coverage.byPeriod.map((p) => p.entities);
    panel = {
      entity: key.entity.name,
      period: key.period.name,
      entities: key.entity.distinct,
      periods: shape.periods,
      rowsPerPeriod: { min: Math.min(...rowsPerPeriod), max: Math.max(...rowsPerPeriod) },
      balanced: key.entity.distinct * shape.periods === body.length,
      says: `one row per entity per period: every ("${key.entity.name}", "${key.period.name}") pair in this table is unique, so rowCount (${body.length}) counts readings, never subjects — there are ${key.entity.distinct} of those`,
      decidedBy: `every ("${key.entity.name}", "${key.period.name}") pair is unique across all ${body.length} rows, and "${key.entity.name}" holds no blank`,
      coverage: {
        ...coverage,
        says: `a period's own step being present is not the same as every entity being present in it: the fullest period here carries ${coverage.fullest.entities} entities and the thinnest carries ${coverage.thinnest.entities}`,
      },
      aggregates: aggregatesOf(key.entity, key.period, columns, body.length),
      // WHERE THE SHARED DERIVATION AND THIS PROFILER'S OWN TYPING DISAGREE. `panelShapeOf` finds the
      // period column by NAME (`findYearColumn`); `isSequenceColumn` finds it by the column's own
      // VALUES and records the answer as `gaps`. Measured over the 36 frozen tables they part once:
      // `stress-t-europe-recycling`'s `survey_date` holds "2025-03-01", "01/03/2025" and "March 2025",
      // is named the period by the first and refused by the second. Said out loud rather than settled
      // quietly in favour of either, because a profile that names a period its own typing will not
      // stand behind has handed the next phase a guess.
      ...(key.period.gaps === null
        ? {
            periodNotASequence: {
              says: `"${key.period.name}" was read as the period from its NAME, and this profiler's own typing does not make it a sequence — its gaps are null, so nothing here can say which steps it skips`,
              column: key.period.name,
              type: key.period.type,
            },
          }
        : {}),
    };
    // ON THE PERIOD COLUMN ITSELF, because `gaps: []` is where a reader looks and on the Ember file
    // it is true and misleading: every year from 1900 to 2025 is present, 2022 carries 245 entities
    // and 2025 carries 114. Absent — not false — when coverage really is flat, so the field only
    // ever appears where there is something to see.
    if (key.period.gaps !== null && coverage.fullest.entities !== coverage.thinnest.entities) {
      key.period.gapsAreNotCoverage = {
        says: "every step of this sequence is present; that is not the same as every entity being present at every step, and this column's own coverage is not flat",
        fullest: coverage.fullest,
        thinnest: coverage.thinnest,
      };
    }
    // THE DENOMINATOR OF A PANEL IS A DIFFERENT FILE — see DENOMINATOR_NOT_IN_THIS_TABLE. Said only
    // on a measure column that got no denominator answer at all, so it never argues with one.
    for (const column of columns) {
      if (column.type !== "number" || column.gaps !== null) continue;
      if (column.denominator || column.denominatorUnread || namesADenominator(column.name)) continue;
      column.denominatorNotInThisTable = { says: DENOMINATOR_NOT_IN_THIS_TABLE, reads: LEXICON_LANGUAGES_SAID };
    }
  }

  // A STATED INCOMPLETENESS — see statedIncompletenessOf. Emitted whenever this table HAS a period
  // for a sentence to be about, claims or no claims: the empty answer is the one a downstream guard
  // has to be able to tell apart from a field that was never written.
  const period = columns.find((c) => c.gaps !== null);
  const statedIncompleteness = period ? statedIncompletenessOf(prose, period) : null;

  for (const column of columns) {
    delete column._values;
    delete column._rowNumbers;
  }
  return {
    rowCount: body.length,
    columns,
    duplicates: findDuplicateRows(body),
    panel,
    // WHAT READING THIS FILE'S HEADER COST, on the record every later phase reasons from. Absent —
    // not null, and not an empty object — when the first row was the header and every column
    // carried a name, so the field only ever appears where there is something to see, and a reader
    // can tell "nothing to say" from "never asked". `says` is the sentence; `banner`, `dropped` and
    // `renamed` are what it is a summary of.
    ...(reading.says
      ? {
          header: {
            says: reading.says,
            headerAt: reading.headerAt,
            banner: reading.banner,
            dropped: reading.dropped,
            renamed: reading.renamed,
          },
        }
      : {}),
    ...(statedIncompleteness ? { statedIncompleteness } : {}),
  };
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
