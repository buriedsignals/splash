// core/locale — deterministic, Intl-free number + furniture localization for map-native,
// mirroring chart-native/src/core/locale.ts (the two skills ship independently, so the
// helper is duplicated the same way csv.ts / conformance helpers are). The article's
// language reaches the producer as `config.lang`; a French deliverable renders "1 900"
// / "19,3" (narrow no-break space thousands, comma decimal) and "Source :" (space before
// the colon), never the English "1,900" / "19.3" / "Source:".
//
// Explicit FR/EN tables — NOT Number.toLocaleString() / Intl — because the outputs must
// be byte-identical across Node, Remotion's render process, and the browser build. ICU
// locale data varies between environments; a hand-rolled formatter is stable + testable.
// This is also the deterministic replacement for the `.toLocaleString()` calls the map
// components used (which silently rendered "1,900" under an en-locale Node).

export type Lang = string;

// French thousands separator: the narrow no-break space (U+202F), the same glyph
// Intl.NumberFormat('fr-FR') and Datawrapper's fr-FR locale emit.
const FR_GROUP = " ";

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

function groupThousands(intDigits: string, sep: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Localize an ASCII numeric STRING (decimal ".", no grouping) — preserves the exact
 * decimal places the caller chose (e.g. a toFixed(2) "0.00" stays two decimals):
 * "12000" → "12 000" / "12,000"; "0.02" → "0,02" / "0.02".
 */
export function localizeNumberString(s: string, lang?: Lang): string {
  const group = groupSep(lang);
  const dec = decimalSep(lang);
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [intPart, fracPart] = body.split(".");
  const grouped = groupThousands(intPart, group);
  return (
    (neg ? "-" : "") +
    (fracPart !== undefined ? `${grouped}${dec}${fracPart}` : grouped)
  );
}

/**
 * Format a full (un-abbreviated) number for the language: 1900 → "1 900" / "1,900",
 * 19.3 → "19,3" / "19.3". The deterministic replacement for `Number.toLocaleString()`.
 */
export function formatLocaleNumber(n: number, lang?: Lang): string {
  return localizeNumberString(String(n), lang);
}

/**
 * Apply just the locale DECIMAL separator to an already-formatted numeric string
 * (e.g. an abbreviated "1.2M"): "1.2M" → "1,2M" in French, unchanged in English.
 */
export function localizeDecimal(s: string, lang?: Lang): string {
  return isFrench(lang) ? s.replace(".", ",") : s;
}

/** The localized "Source" furniture label: "Source :" in French, "Source:" otherwise. */
export function sourceLabel(lang?: Lang): string {
  return isFrench(lang) ? "Source :" : "Source:";
}
