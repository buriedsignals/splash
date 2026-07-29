// The words the caption engines GENERATE, in the four languages the locale tables cover.
//
// This is FURNITURE, not translation: splash never produces text in a language: it picks the
// right row of a table that is written down. The same discipline as lib/newsroom/ui-copy.ts's
// sourceQuestionCopy, which has been four-language since the source-policy tranche.
//
// It exists because the three caption engines each branched on `isFrench()` — a BOOLEAN — so
// "the highest of the 12 shown" shipped inside an Italian scrolly and "a 4-fold gap" inside a
// German map story. A binary axis cannot carry four languages; the leak was structural.
//
// lib/core imports nothing, which is what makes this importable from all three engines.
import type { Lang } from "./locale";

export type StoryCopy = {
  lowest: string;
  highestOf: (n: number) => string;
  /** Articled ordinal, standalone ("the 3rd" / "le 1er" / "der 3." / "il 3º") — used where the
   *  caption reads as a bare descriptor, e.g. "Norway — 99%, the 3rd". */
  nth: (rank: number) => string;
  /** Articled WORD-form ordinal for small ranks ("the second" / "le deuxième" / "der zweite" /
   *  "il secondo"), falling back to `nth`'s numeral-suffix form beyond the word table (rank >
   *  10). Distinct from `nth`: this reads as prose inside a walked sentence ("Cyprus — 74
   *  nights, the second"), where the numeral-suffix form would read like a label, not a
   *  sentence. scrolly's magnitude walk and temporal sequence both use this — it is what their
   *  own local `ordinal()` computed before this table existed (en/fr bytes preserved exactly). */
  ordinalWord: (rank: number) => string;
  lowestRow: (label: string, value: string) => string;
  leads: (label: string, value: string) => string;
  /** "Label — value, <ordinal>" — the ordinal here is BARE (no leading article): chart-native's
   *  walk has always read "USA — 15 t, 2nd" / "Kenya — 8, 3e", never "…, the 2nd". Also
   *  map-native's own middle-rank magnitude wording ("Germany — 59%, 2nd"). */
  ranked: (label: string, value: string, rank: number) => string;
  /** map-native's own magnitude-reveal TAIL wording ("The long tail — Poland, 4%") — distinct
   *  from `lowestRow`'s "The lowest — …" (chart-native's phrasing/scrolly's `lowest`): the two
   *  engines diverged on wording before this table existed, and both engines' existing EN bytes
   *  are preserved verbatim here. */
  longTail: (label: string, value: string) => string;
  /** Between a region's name and its value in a map-story takeaway. A plain ASCII space, not
   *  the narrow no-break space that separates FR thousands (lib/core/locale.ts's FR_GROUP) —
   *  the two are different typographic conventions in this codebase (verified against the
   *  existing French goldens: "Source :", "Photo :", "Kenya : 75 %" all use U+0020). */
  captionSep: string;
  yearSpan: (n: number) => string;
  foldGap: (n: number) => string;
  photoLabel: string;
  /** "N years" / "N ans" / "N Jahre" / "N anni" — pluralized, matches the pluralization rule
   *  each language's own `yearSpan` already uses. */
  years: (n: number) => string;
  /** The earliest step of a temporal sequence: "the first" / "le premier" / "der erste" /
   *  "il primo" — always textually equal to `ordinalWord(1)`. */
  first: string;
  /** The latest step of a temporal sequence, no known span since the first. */
  mostRecent: string;
  /** The latest step, WITH the known span since the first ("the most recent, 24 years after
   *  the first"). Takes the already-pluralized `years` string. */
  mostRecentSince: (yearsStr: string) => string;
  /** An interior temporal step, WITH the known gap to the previous step ("the second, 12 years
   *  later"). Takes the already-computed ordinal (`ordinalWord`) and `years` strings. */
  laterBy: (ord: string, yearsStr: string) => string;
};

function enOrdinal(n: number): string {
  const r100 = n % 100;
  const r10 = n % 10;
  const suffix =
    r100 >= 11 && r100 <= 13
      ? "th"
      : r10 === 1
        ? "st"
        : r10 === 2
          ? "nd"
          : r10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

// French ordinal, the standard journalistic abbreviation: 1er, 2e, 3e, 4e… (matches
// chart-native's pre-existing ordinalFr, byte for byte).
function frOrdinal(n: number): string {
  return n === 1 ? `${n}er` : `${n}e`;
}

// German ordinal: number + period ("3."), the standard de-DE convention.
function deOrdinal(n: number): string {
  return `${n}.`;
}

// Italian ordinal: number + masculine-ordinal indicator ("3º").
function itOrdinal(n: number): string {
  return `${n}º`;
}

// Word-form ordinals for the small ranks the sequence/walk uses ("the second" reads better
// than "the 2nd" inside a walked sentence), keyed by language. Beyond the table, each
// language's ordinalWord falls back to its own numeral-suffix form (matches the pre-existing
// chapters.ts behaviour byte for byte for en/fr — see story-copy.test.ts).
const ORDINAL_WORDS_EN = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];
const ORDINAL_WORDS_FR = [
  "premier",
  "deuxième",
  "troisième",
  "quatrième",
  "cinquième",
  "sixième",
  "septième",
  "huitième",
  "neuvième",
  "dixième",
];
// Standard German ordinal adjectives, definite-article form ("der erste", "der zweite"...).
const ORDINAL_WORDS_DE = [
  "erste",
  "zweite",
  "dritte",
  "vierte",
  "fünfte",
  "sechste",
  "siebte",
  "achte",
  "neunte",
  "zehnte",
];
// Standard Italian ordinal adjectives, already carrying their article's trailing space (or
// elision, for the one irregular row). "ottavo" is vowel-initial, so its article elides
// ("l'ottavo", not "il ottavo") — every other rank takes "il " (all consonant-initial).
const ORDINAL_WORDS_IT = [
  "il primo",
  "il secondo",
  "il terzo",
  "il quarto",
  "il quinto",
  "il sesto",
  "il settimo",
  "l'ottavo",
  "il nono",
  "il decimo",
];

const EN: StoryCopy = {
  lowest: "the lowest",
  highestOf: (n) => `the highest of the ${n} shown`,
  nth: (rank) => `the ${enOrdinal(rank)}`,
  ordinalWord: (rank) =>
    rank >= 1 && rank <= ORDINAL_WORDS_EN.length
      ? `the ${ORDINAL_WORDS_EN[rank - 1]}`
      : `the ${enOrdinal(rank)}`,
  lowestRow: (label, value) => `The lowest — ${label}, ${value}`,
  leads: (label, value) => `${label} leads — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${enOrdinal(rank)}`,
  longTail: (label, value) => `The long tail — ${label}, ${value}`,
  captionSep: ": ",
  yearSpan: (n) => ` — a ${n}-year span`,
  foldGap: (n) => ` — a ${n}-fold gap`,
  photoLabel: "Photo:",
  years: (n) => `${n} year${n === 1 ? "" : "s"}`,
  first: "the first",
  mostRecent: "the most recent",
  mostRecentSince: (yearsStr) => `the most recent, ${yearsStr} after the first`,
  laterBy: (ord, yearsStr) => `${ord}, ${yearsStr} later`,
};

const FR: StoryCopy = {
  lowest: "le plus bas",
  highestOf: (n) => `le plus élevé des ${n}`,
  nth: (rank) => `le ${frOrdinal(rank)}`,
  ordinalWord: (rank) =>
    rank >= 1 && rank <= ORDINAL_WORDS_FR.length
      ? `le ${ORDINAL_WORDS_FR[rank - 1]}`
      : `le ${frOrdinal(rank)}`,
  lowestRow: (label, value) => `Le plus bas — ${label}, ${value}`,
  leads: (label, value) => `${label} en tête — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${frOrdinal(rank)}`,
  // "Longue traîne" is the standard, dictionary-attested French translation of "long tail"
  // (the term's own French-language coinage, from Chris Anderson's "The Long Tail" → "La
  // Longue Traîne") — not an ad hoc invention.
  longTail: (label, value) => `La longue traîne — ${label}, ${value}`,
  // A plain ASCII space (U+0020) before the colon — French typography spaces the colon, but
  // this codebase's own goldens ("Source :" in lib/core/locale.ts, "Photo :" in Scrolly.tsx,
  // "Kenya : 75 %" in skills/map-native/tests/map-story.test.ts) all use a REGULAR space here,
  // never the narrow no-break space (U+202F) that FR_GROUP uses for thousands. Verified byte
  // for byte against those goldens — this is the one place this task's brief disagreed with
  // what actually shipped; the shipped byte wins.
  captionSep: " : ",
  yearSpan: (n) => ` — ${n} an${n === 1 ? "" : "s"} d'écart`,
  foldGap: (n) => ` — un écart de 1 à ${n}`,
  photoLabel: "Photo :",
  years: (n) => `${n} an${n === 1 ? "" : "s"}`,
  first: "le premier",
  mostRecent: "le plus récent",
  mostRecentSince: (yearsStr) => `le plus récent, ${yearsStr} après le premier`,
  laterBy: (ord, yearsStr) => `${ord}, ${yearsStr} plus tard`,
};

const DE: StoryCopy = {
  lowest: "der niedrigste",
  highestOf: (n) => `der höchste von ${n}`,
  nth: (rank) => `der ${deOrdinal(rank)}`,
  ordinalWord: (rank) =>
    rank >= 1 && rank <= ORDINAL_WORDS_DE.length
      ? `der ${ORDINAL_WORDS_DE[rank - 1]}`
      : `der ${deOrdinal(rank)}`,
  lowestRow: (label, value) => `Am niedrigsten — ${label}, ${value}`,
  leads: (label, value) => `${label} führt — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${deOrdinal(rank)}`,
  // "Der lange Schwanz" is the published German translation of "The Long Tail" (Chris
  // Anderson's book, Hanser Verlag 2007, ISBN 978-3-446-40990-3 — the German edition's own
  // title is "The Long Tail – der lange Schwanz"). The task's goal is a German walk with NO
  // English; the loanword "Long Tail" alone (an earlier draft of this row) is still literally
  // English words and would not satisfy that, so this row uses the translated half of the
  // published title instead.
  longTail: (label, value) => `Der lange Schwanz — ${label}, ${value}`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} Jahr${n === 1 ? "" : "e"} Abstand`,
  foldGap: (n) => ` — ein Verhältnis von 1 zu ${n}`,
  photoLabel: "Foto:",
  years: (n) => `${n} Jahr${n === 1 ? "" : "e"}`,
  first: "der erste",
  mostRecent: "der neueste",
  mostRecentSince: (yearsStr) => `der neueste, ${yearsStr} nach dem ersten`,
  laterBy: (ord, yearsStr) => `${ord}, ${yearsStr} später`,
};

const IT: StoryCopy = {
  lowest: "il più basso",
  highestOf: (n) => `il più alto dei ${n}`,
  nth: (rank) => `il ${itOrdinal(rank)}`,
  ordinalWord: (rank) =>
    rank >= 1 && rank <= ORDINAL_WORDS_IT.length
      ? ORDINAL_WORDS_IT[rank - 1]
      : `il ${itOrdinal(rank)}`,
  lowestRow: (label, value) => `Il più basso — ${label}, ${value}`,
  leads: (label, value) => `${label} in testa — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${itOrdinal(rank)}`,
  // "Coda lunga" is the standard, dictionary-attested Italian translation of "long tail" (the
  // same book's Italian title: "La coda lunga") — not an ad hoc invention.
  longTail: (label, value) => `La coda lunga — ${label}, ${value}`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} ann${n === 1 ? "o" : "i"} di scarto`,
  foldGap: (n) => ` — un divario di 1 a ${n}`,
  photoLabel: "Foto:",
  years: (n) => `${n} ann${n === 1 ? "o" : "i"}`,
  first: "il primo",
  mostRecent: "il più recente",
  mostRecentSince: (yearsStr) => `il più recente, ${yearsStr} dopo il primo`,
  laterBy: (ord, yearsStr) => `${ord}, ${yearsStr} dopo`,
};

export const STORY_COPY: Record<"en" | "fr" | "de" | "it", StoryCopy> = {
  en: EN,
  fr: FR,
  de: DE,
  it: IT,
};

/** The row for `lang`, by base subtag ("fr-CH" → fr). An uncovered tag falls back to English —
 *  intended as a safety net, not a shipping path: a later guard in this plan (the locale-reach
 *  guard) is meant to refuse an uncovered language at the offer before it ever reaches here. */
export function storyCopy(lang?: Lang): StoryCopy {
  const base =
    typeof lang === "string" ? lang.toLowerCase().split(/[-_]/)[0] : undefined;
  return (base && STORY_COPY[base as keyof typeof STORY_COPY]) || EN;
}
