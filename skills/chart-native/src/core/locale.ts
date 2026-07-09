// core/locale — deterministic, Intl-free number + furniture localization shared by
// every chart type. The article's language reaches the producer as `config.lang`
// (threaded from the suggester); a French deliverable must render "1 900" / "19,3"
// (narrow no-break space thousands, comma decimal) and "Source :" (space before the
// colon), a German one "1.900" / "19,3" / "Quelle:", an Italian one "Fonte:", not the
// English "1,900" / "19.3" / "Source:".
//
// Explicit per-language TABLE — NOT Intl.NumberFormat — because the number outputs
// must be byte-identical across Node, Remotion's render process, and the browser
// build. ICU locale data can differ between environments and versions; a small
// hand-rolled formatter is stable and unit-testable. Unknown langs fall back to
// English. Adding a language = one row here; every chart type inherits it for free.

export type Lang = string;

// French thousands separator: the narrow no-break space (U+202F), the same glyph
// Intl.NumberFormat('fr-FR') and Datawrapper's fr-FR locale emit.
const FR_GROUP = " ";

/** Per-language number + furniture conventions (all Intl-free, deterministic). */
export interface LocaleSpec {
  /** decimal separator */
  decimal: string;
  /** thousands / grouping separator */
  group: string;
  /** the full "Source" furniture label, incl. colon + any locale spacing */
  source: string;
}

// Grounded conventions:
//   fr — comma decimal, U+202F thousands, "Source :" (French spaces the colon).
//   de — comma decimal, period thousands, "Quelle:" (standard de-DE typography).
//   it — comma decimal, period thousands, "Fonte:" (standard it-IT typography).
//   en — period decimal, comma thousands, "Source:" (the default / fallback).
// A region variant (e.g. "de-CH") resolves to its base language unless it has its
// OWN row (see localeFor's full-tag-first lookup) — so a Swiss-German apostrophe
// thousands ("1'900") can be added later as a "de-CH" row without touching callers.
const LOCALES: Record<string, LocaleSpec> = {
  fr: { decimal: ",", group: FR_GROUP, source: "Source :" },
  de: { decimal: ",", group: ".", source: "Quelle:" },
  it: { decimal: ",", group: ".", source: "Fonte:" },
  en: { decimal: ".", group: ",", source: "Source:" },
};

const EN = LOCALES.en;

/** The resolved locale spec for a tag: exact tag → base subtag → English fallback. */
export function localeFor(lang?: Lang): LocaleSpec {
  if (typeof lang !== "string") return EN;
  const tag = lang.toLowerCase();
  if (LOCALES[tag]) return LOCALES[tag]; // e.g. a future "de-ch" row wins
  const base = tag.split("-")[0]; // "de-CH" → "de"
  return LOCALES[base] ?? EN;
}

/** True when the language tag is French (fr, fr-FR, fr-CH…), case-insensitive.
 *  Kept for the scrolly ordinal path (chart-story.ts) which is French-specific. */
export function isFrench(lang?: Lang): boolean {
  return typeof lang === "string" && lang.toLowerCase().startsWith("fr");
}

/** The decimal separator for the language ("," in fr/de/it, "." in English). */
export function decimalSep(lang?: Lang): string {
  return localeFor(lang).decimal;
}

/** The thousands separator for the language (U+202F in fr, "." in de/it, "," in en). */
export function groupSep(lang?: Lang): string {
  return localeFor(lang).group;
}

/** Group an integer-digit string in threes: "12345" → "12 345" / "12.345" / "12,345". */
function groupThousands(intDigits: string, sep: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Format a full (un-abbreviated) number for the language: 1900 → "1 900" / "1.900" /
 * "1,900", 19.3 → "19,3" / "19.3". The deterministic replacement for
 * `Number.toLocaleString()` (which is Intl-backed and environment-dependent).
 */
export function formatLocaleNumber(n: number, lang?: Lang): string {
  const { group, decimal } = localeFor(lang);
  const sign = n < 0 ? "-" : "";
  const [intPart, fracPart] = String(Math.abs(n)).split(".");
  const grouped = groupThousands(intPart, group);
  return fracPart
    ? `${sign}${grouped}${decimal}${fracPart}`
    : `${sign}${grouped}`;
}

/**
 * Apply just the locale DECIMAL separator to an already-formatted numeric string
 * (e.g. an abbreviated "1.9k" or "1.8M"): "1.9k" → "1,9k" in fr/de/it, unchanged in
 * English. Only the last "." (the decimal point) is a candidate — abbreviated output
 * never carries a grouping separator, so a single replace is safe.
 */
export function localizeDecimal(s: string, lang?: Lang): string {
  const { decimal } = localeFor(lang);
  return decimal === "." ? s : s.replace(".", decimal);
}

/** The localized "Source" furniture label: "Source :" (fr), "Quelle:" (de),
 *  "Fonte:" (it), "Source:" (en / unknown). */
export function sourceLabel(lang?: Lang): string {
  return localeFor(lang).source;
}
