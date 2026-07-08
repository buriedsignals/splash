// core/locale — deterministic, Intl-free number + furniture localization shared by
// every chart type. The article's language reaches the producer as `config.lang`
// (threaded from the suggester); a French deliverable must render "1 900" / "19,3"
// (narrow no-break space thousands, comma decimal) and "Source :" (space before the
// colon), not the English "1,900" / "19.3" / "Source:".
//
// Explicit FR/EN tables — NOT Intl.NumberFormat — because the number outputs must be
// byte-identical across Node, Remotion's render process, and the browser build. ICU
// locale data can differ between environments and versions; a small hand-rolled
// formatter is stable and unit-testable. Unknown langs fall back to English.

export type Lang = string;

// French thousands separator: the narrow no-break space (U+202F), the same glyph
// Intl.NumberFormat('fr-FR') and Datawrapper's fr-FR locale emit.
const FR_GROUP = " ";

/** True when the language tag is French (fr, fr-FR, fr-CH…), case-insensitive. */
export function isFrench(lang?: Lang): boolean {
  return typeof lang === "string" && lang.toLowerCase().startsWith("fr");
}

/** The decimal separator for the language: "," in French, "." otherwise. */
export function decimalSep(lang?: Lang): string {
  return isFrench(lang) ? "," : ".";
}

/** The thousands separator for the language: U+202F in French, "," otherwise. */
export function groupSep(lang?: Lang): string {
  return isFrench(lang) ? FR_GROUP : ",";
}

/** Group an integer-digit string in threes: "12345" → "12 345" / "12,345". */
function groupThousands(intDigits: string, sep: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Format a full (un-abbreviated) number for the language: 1900 → "1 900" / "1,900",
 * 19.3 → "19,3" / "19.3". The deterministic replacement for `Number.toLocaleString()`
 * (which is Intl-backed and environment-dependent).
 */
export function formatLocaleNumber(n: number, lang?: Lang): string {
  const group = groupSep(lang);
  const dec = decimalSep(lang);
  const sign = n < 0 ? "-" : "";
  const [intPart, fracPart] = String(Math.abs(n)).split(".");
  const grouped = groupThousands(intPart, group);
  return fracPart ? `${sign}${grouped}${dec}${fracPart}` : `${sign}${grouped}`;
}

/**
 * Apply just the locale DECIMAL separator to an already-formatted numeric string
 * (e.g. an abbreviated "1.9k" or "1.8M"): "1.9k" → "1,9k" in French, unchanged in
 * English. Only the last "." (the decimal point) is a candidate — abbreviated output
 * never carries a grouping separator, so a single replace is safe.
 */
export function localizeDecimal(s: string, lang?: Lang): string {
  return isFrench(lang) ? s.replace(".", ",") : s;
}

/** The localized "Source" furniture label: "Source :" in French (space before the
 *  colon, French typography), "Source:" otherwise. */
export function sourceLabel(lang?: Lang): string {
  return isFrench(lang) ? "Source :" : "Source:";
}
