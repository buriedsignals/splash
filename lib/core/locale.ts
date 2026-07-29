// core/locale — deterministic, Intl-free number + furniture localization shared by
// every engine (chart-native, map-native, and — via SOURCE_LABELS bytes replicated in
// core/i18n-furniture.ts — dw-chart / map-dw). Previously duplicated as chart-native's
// and map-native's own `src/core/locale.ts`; both now live here.
//
// The article's language reaches the producer as `config.lang` (threaded from the
// suggester); a French deliverable must render "1 900" / "19,3" (narrow no-break space
// thousands, comma decimal) and "Source :" (space before the colon), a German one
// "1.900" / "19,3" / "Quelle:", an Italian one "Fonte:", not the English "1,900" /
// "19.3" / "Source:".
//
// Explicit per-language TABLE — NOT Intl.NumberFormat — because the number outputs
// must be byte-identical across Node, Remotion's render process, and the browser
// build. ICU locale data can differ between environments and versions; a small
// hand-rolled formatter is stable and unit-testable. Unknown langs fall back to
// English. Adding a language = one row here; every engine inherits it for free.
//
// MERGE NOTE (shared-core extraction): chart-native's mirror already carried the full
// fr/de/it/en table (`LocaleSpec` + `localeFor`); map-native's mirror had DRIFTED to an
// `isFrench`-binary check — de/it silently fell back to English-style separators and
// the English "Source:" furniture (a real, tracked gap: CLAUDE.md backlog "sourceLabel
// map-native FR-seul (gap de/it)"). This module adopts chart-native's fuller table as
// the single implementation, which closes that gap for map-native as an intentional
// side effect of the extraction — see lib/core/locale.test.ts for the parity evidence
// (map-native's own fr/en-tested range is unchanged; de/it now resolve correctly).

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
 *  Kept for the scrolly ordinal path (chart-story.ts) which is French-specific, and
 *  for map-native's French-narrow-space branch in `labelWithUnit` below. */
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
 * Localize an ASCII numeric STRING (decimal ".", no grouping) — preserves the exact
 * decimal places the caller chose (e.g. a toFixed(2) "0.00" stays two decimals):
 * "12000" → "12 000" / "12.000" / "12,000"; "0.02" → "0,02" / "0.02". Used where the
 * caller already has a formatted-ASCII string rather than a raw `number` (e.g.
 * map-native's legend bin-boundary formatter, which must not re-round via `String(n)`).
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

/**
 * A direct chart-mark value label: an integer prints bare — "52", never a
 * parasitic "52.0" — a fractional value keeps ONE decimal place, and both then
 * take the language's separators ("3 200" fr / "3.200" de / "3,200" en... the
 * grouping half; "52,4" fr / "52.4" en for the decimal half). This is the ONE
 * expression behind chart-native's ten locally-bound `fmt`/`fmtVal` closures
 * (Boxplot, Bullet, Combo, DotStrip, Lollipop, Parallel, Sankey, Slope, Violin,
 * Waffle each write `(v) => localizeValueLabel(v, config.lang)` once, binding
 * their own config's `lang` — not re-implementing the bare-integer/one-decimal
 * rule) instead of repeating this body across eleven files, which is exactly
 * the duplication a French chart's "52.0" bug and this function close.
 */
export function localizeValueLabel(v: number, lang?: Lang): string {
  return localizeNumberString(
    Number.isInteger(v) ? String(v) : v.toFixed(1),
    lang,
  );
}

// A direct value label only carries its unit when the unit is SHORT ("%", "€",
// "km") — a walked/highlighted value must read complete on its own ("34,2 %",
// the rule map-native's conformance already enforces for symbol labels). A LONG
// unit ("millions de nuitées") stays in the subtitle: repeating it on every
// label is noise. 3 chars covers the symbol and short-abbreviation units
// (%, €, $, km, kg, °C) without letting word units through.
export const SHORT_UNIT_MAX_CHARS = 3;

// Units that are typographic SYMBOLS rather than words/abbreviations — in
// English (and Italian) these attach directly to the number ("34.2%"), while
// word units take a space ("34.2 km"). chart-native's `unitSuffix` set (%, ‰
// only) — kept narrower than map-native's `labelWithUnit` set below on purpose,
// unchanged from the pre-extraction behaviour of either call site.
const SYMBOL_UNIT = /^[%‰]/;

/**
 * The locale-aware suffix (separator + unit) a direct value label appends for a
 * SHORT unit, or "" when the unit is long/blank (the label stays a bare number).
 *   fr/de → narrow no-break space (U+202F) before every unit, "%" included
 *           ("34,2 %") — French typography / DIN 5008, the same convention as
 *           the FR thousands separator above.
 *   en/it (and fallback) → "%"-type symbols attach directly ("34.2%"); word
 *           units take a regular space ("34.2 km").
 */
export function unitSuffix(unit: string | undefined, lang?: Lang): string {
  const u = unit?.trim();
  if (!u || u.length > SHORT_UNIT_MAX_CHARS) return "";
  const base =
    typeof lang === "string" ? lang.toLowerCase().split("-")[0] : "en";
  if (base === "fr" || base === "de") return `${FR_GROUP}${u}`;
  return SYMBOL_UNIT.test(u) ? u : ` ${u}`;
}

// map-native's symbol set additionally carries currency suffixes ("$bn", "€m") — the
// existing sample + its locked test ("296$bn") depend on those attaching without a
// space in English. Kept as its own const (deliberately not merged with SYMBOL_UNIT
// above) so chart-native's unitSuffix behaviour is untouched by the extraction.
const SYMBOL_UNIT_WITH_CURRENCY = /^[%‰$€£¥]/;

/**
 * Assemble a value label with its unit, spaced per locale convention (map-native's
 * direct-label path — a symbol map's callout keeps a word unit instead of dropping it
 * to the subtitle, the whole point of a symbol callout being the value+unit pair).
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
  // The SAME base-language test `unitSuffix` uses (:171-173). These two were the only two
  // helpers of this file that disagreed about German: unitSuffix spaced "70 %" and
  // labelWithUnit printed "70%", on the same deliverable.
  const base =
    typeof lang === "string" ? lang.toLowerCase().split("-")[0] : "en";
  if (short && (base === "fr" || base === "de"))
    return `${valueText}${FR_GROUP}${u}`;
  if (short && SYMBOL_UNIT_WITH_CURRENCY.test(u)) return `${valueText}${u}`;
  return `${valueText} ${u}`;
}
