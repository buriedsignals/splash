// The words the TIME family of chart types puts on a page — gantt (a span), candlestick
// (open/high/low/close, up/down), and the shared duration wording. One row per covered
// language, the same discipline as STORY_COPY and DATE_COPY: splash never PRODUCES text in a
// language, it picks the right row of a table that is written down.
//
// It exists because all three of these types shipped their words as English literals inside
// the component — "≈ 8 months", "…: open 5080, high 5120…", "to" — and every one of them
// lands somewhere a reader or a screen reader meets it. On the a11y path that is worse than
// on the canvas: the per-mark aria-label was the ONLY content a screen-reader user got from a
// candlestick, and it was English prose wrapping unlocalized digits, underneath a correctly
// French `altInsight`.
//
// lib/core imports nothing, which is what makes this importable from all three engines.
import type { Lang } from "./locale";

export interface TimeChartCopy {
  /** "8 months" / "8 mois" / "8 Monate" / "8 mesi" — pluralized per language. */
  months: (n: number) => string;
  /** "≈ 8 months" — the approximate-duration line of a gantt tooltip. The "≈" is a symbol,
   *  so only the noun is a row; kept as one function so a language that puts the marker
   *  elsewhere can. */
  aboutMonths: (n: number) => string;
  /**
   * A span's accessible name: "Land acquisition: from 3 Apr 2023 to 1 Dec 2024". Takes the
   * ALREADY-formatted date strings (date-locale's formatAtGrain), same convention as
   * STORY_COPY's value-taking members — the date table owns the dates, this table owns the
   * sentence around them.
   */
  spanAria: (label: string, from: string, to: string) => string;
  /** The four OHLC words, short enough for a tooltip. NOT initials: Italian's *massimo* and
   *  *minimo* both start with M, so an initial-based row would print "M" twice for the two
   *  opposite ends of the period's range. */
  ohlc: { open: string; high: string; low: string; close: string };
  /** A candle's accessible name. Takes the already-formatted date and the four already-
   *  localized numbers. */
  ohlcAria: (
    date: string,
    open: string,
    high: string,
    low: string,
    close: string,
  ) => string;
  /** The two direction legend labels. A candlestick's colours are a CONVENTION, not a
   *  self-describing category — so they are always named on the chart (see
   *  knowledge/references/chart/types/candlestick.md). */
  up: string;
  down: string;
  /** The legend's one-line gloss of what "up" means, so the reader never has to bring a
   *  market convention to the chart: "close ≥ open". Punctuation and the two OHLC words. */
  directionNote: (up: string, down: string) => string;
}

const EN: TimeChartCopy = {
  months: (n) => `${n} month${n > 1 ? "s" : ""}`,
  aboutMonths: (n) => `≈ ${n} month${n > 1 ? "s" : ""}`,
  spanAria: (label, from, to) => `${label}: from ${from} to ${to}`,
  ohlc: { open: "open", high: "high", low: "low", close: "close" },
  ohlcAria: (date, o, h, l, c) =>
    `${date}: open ${o}, high ${h}, low ${l}, close ${c}`,
  up: "Up",
  down: "Down",
  directionNote: (up, down) => `${up} = close ≥ open · ${down} = close < open`,
};

// French: "mois" is invariant in the plural — the English `-s` rule applied here is exactly
// the kind of leak this table closes.
const FR: TimeChartCopy = {
  months: (n) => `${n} mois`,
  aboutMonths: (n) => `≈ ${n} mois`,
  spanAria: (label, from, to) => `${label} : de ${from} à ${to}`,
  ohlc: {
    open: "ouverture",
    high: "plus haut",
    low: "plus bas",
    close: "clôture",
  },
  ohlcAria: (date, o, h, l, c) =>
    `${date} : ouverture ${o}, plus haut ${h}, plus bas ${l}, clôture ${c}`,
  up: "Hausse",
  down: "Baisse",
  directionNote: (up, down) =>
    `${up} = clôture ≥ ouverture · ${down} = clôture < ouverture`,
};

const DE: TimeChartCopy = {
  months: (n) => (n > 1 ? `${n} Monate` : `${n} Monat`),
  aboutMonths: (n) => (n > 1 ? `≈ ${n} Monate` : `≈ ${n} Monat`),
  spanAria: (label, from, to) => `${label}: von ${from} bis ${to}`,
  ohlc: {
    open: "Eröffnung",
    high: "Hoch",
    low: "Tief",
    close: "Schluss",
  },
  ohlcAria: (date, o, h, l, c) =>
    `${date}: Eröffnung ${o}, Hoch ${h}, Tief ${l}, Schluss ${c}`,
  up: "Anstieg",
  down: "Rückgang",
  directionNote: (up, down) =>
    `${up} = Schluss ≥ Eröffnung · ${down} = Schluss < Eröffnung`,
};

const IT: TimeChartCopy = {
  months: (n) => (n > 1 ? `${n} mesi` : `${n} mese`),
  aboutMonths: (n) => (n > 1 ? `≈ ${n} mesi` : `≈ ${n} mese`),
  spanAria: (label, from, to) => `${label}: da ${from} a ${to}`,
  ohlc: {
    open: "apertura",
    high: "massimo",
    low: "minimo",
    close: "chiusura",
  },
  ohlcAria: (date, o, h, l, c) =>
    `${date}: apertura ${o}, massimo ${h}, minimo ${l}, chiusura ${c}`,
  up: "Rialzo",
  down: "Ribasso",
  directionNote: (up, down) =>
    `${up} = chiusura ≥ apertura · ${down} = chiusura < apertura`,
};

export const TIME_CHART_COPY: Record<"en" | "fr" | "de" | "it", TimeChartCopy> =
  { en: EN, fr: FR, de: DE, it: IT };

/** The row for `lang`, by base subtag ("fr-CH" → fr); an uncovered tag falls back to English
 *  (the safety net, not a shipping path — `isCoveredLang` refuses at the offer). */
export function timeChartCopy(lang?: Lang): TimeChartCopy {
  const base =
    typeof lang === "string" ? lang.toLowerCase().split(/[-_]/)[0] : undefined;
  return (base && TIME_CHART_COPY[base as keyof typeof TIME_CHART_COPY]) || EN;
}
