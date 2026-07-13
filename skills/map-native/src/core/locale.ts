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

// A directly-labelled value must read complete on its own ("7,4 magnitude"), so the unit
// is appended at the label-assembly site with locale-aware spacing. Mirrors
// chart-native/src/core/locale.ts's `unitSuffix` rule + threshold, with one deliberate
// difference: a symbol map's direct label KEEPS a word unit (attaching a space) instead of
// dropping it to the subtitle — the whole point of a symbol callout is the value+unit pair.
// 3 chars covers the symbol/short-abbreviation units (%, €, $bn, km, kg) without letting a
// word unit ("magnitude", "habitants") through as "short".
export const SHORT_UNIT_MAX_CHARS = 3;

// Units that are typographic SYMBOLS (percent, per-mille, currency) rather than
// words/abbreviations — in English these attach directly to the number ("70%", "296$bn").
// chart-native's rule only lists %/‰; symbol maps additionally carry currency suffixes
// ("$bn", "€m"), and the existing sample + its locked test ("296$bn") depend on those
// attaching, so the currency glyphs are included here.
const SYMBOL_UNIT = /^[%‰$€£¥]/;

/**
 * Assemble a value label with its unit, spaced per locale convention.
 *   - no/blank unit → the bare value ("181").
 *   - French → a narrow no-break space (U+202F) before every SHORT unit ("70 %",
 *     "296 $bn") — the same DIN/French convention as the FR thousands separator.
 *   - English (and fallback) → a SHORT symbol/currency unit attaches ("70%", "296$bn");
 *     a short NON-symbol unit ("km") takes a regular space ("34 km").
 *   - a WORD unit ("magnitude", "habitants", any length > SHORT_UNIT_MAX_CHARS) always
 *     takes a regular space, in every language ("7,4 magnitude") — the fix for the
 *     reported "7magnitude" defect. A caller-supplied leading space is normalized away
 *     first so the story-callout path (which historically pre-spaced its unit) is stable.
 */
export function labelWithUnit(
  valueText: string,
  unit: string | undefined,
  lang?: Lang,
): string {
  const u = unit?.trim();
  if (!u) return valueText;
  const short = u.length <= SHORT_UNIT_MAX_CHARS;
  if (short && isFrench(lang)) return `${valueText}${FR_GROUP}${u}`;
  if (short && SYMBOL_UNIT.test(u)) return `${valueText}${u}`;
  return `${valueText} ${u}`;
}
