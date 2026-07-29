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
  lowestRow: (label: string, value: string) => string;
  leads: (label: string, value: string) => string;
  /** "Label — value, <ordinal>" — the ordinal here is BARE (no leading article): chart-native's
   *  walk has always read "USA — 15 t, 2nd" / "Kenya — 8, 3e", never "…, the 2nd". */
  ranked: (label: string, value: string, rank: number) => string;
  /** Between a region's name and its value in a map-story takeaway. A plain ASCII space, not
   *  the narrow no-break space that separates FR thousands (lib/core/locale.ts's FR_GROUP) —
   *  the two are different typographic conventions in this codebase (verified against the
   *  existing French goldens: "Source :", "Photo :", "Kenya : 75 %" all use U+0020). */
  captionSep: string;
  yearSpan: (n: number) => string;
  foldGap: (n: number) => string;
  photoLabel: string;
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

const EN: StoryCopy = {
  lowest: "the lowest",
  highestOf: (n) => `the highest of the ${n} shown`,
  nth: (rank) => `the ${enOrdinal(rank)}`,
  lowestRow: (label, value) => `The lowest — ${label}, ${value}`,
  leads: (label, value) => `${label} leads — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${enOrdinal(rank)}`,
  captionSep: ": ",
  yearSpan: (n) => ` — a ${n}-year span`,
  foldGap: (n) => ` — a ${n}-fold gap`,
  photoLabel: "Photo:",
};

const FR: StoryCopy = {
  lowest: "le plus bas",
  highestOf: (n) => `le plus élevé des ${n}`,
  nth: (rank) => `le ${frOrdinal(rank)}`,
  lowestRow: (label, value) => `Le plus bas — ${label}, ${value}`,
  leads: (label, value) => `${label} en tête — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${frOrdinal(rank)}`,
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
};

const DE: StoryCopy = {
  lowest: "der niedrigste",
  highestOf: (n) => `der höchste von ${n}`,
  nth: (rank) => `der ${deOrdinal(rank)}`,
  lowestRow: (label, value) => `Am niedrigsten — ${label}, ${value}`,
  leads: (label, value) => `${label} führt — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${deOrdinal(rank)}`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} Jahr${n === 1 ? "" : "e"} Abstand`,
  foldGap: (n) => ` — ein Verhältnis von 1 zu ${n}`,
  photoLabel: "Foto:",
};

const IT: StoryCopy = {
  lowest: "il più basso",
  highestOf: (n) => `il più alto dei ${n}`,
  nth: (rank) => `il ${itOrdinal(rank)}`,
  lowestRow: (label, value) => `Il più basso — ${label}, ${value}`,
  leads: (label, value) => `${label} in testa — ${value}`,
  ranked: (label, value, rank) => `${label} — ${value}, ${itOrdinal(rank)}`,
  captionSep: ": ",
  yearSpan: (n) => ` — ${n} ann${n === 1 ? "o" : "i"} di scarto`,
  foldGap: (n) => ` — un divario di 1 a ${n}`,
  photoLabel: "Foto:",
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
