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
  /**
   * The FLOW family's three connective words (sankey, chord, arc). They live here rather
   * than in the components because the components had them as English literals — `"X to Y"`
   * in a sankey link's accessible name, `"39 out"` and `"most with …"` in a chord's tooltip —
   * and a French chart read them out in English to anyone using a screen reader or hovering a
   * ribbon. The render-time i18n gate could not see them: it checks the FURNITURE outside the
   * `<svg>` (title, subtitle, the Source footer), and these sit in an aria attribute and in
   * the tooltip's own DOM. Found by rendering the family in French and reading what the a11y
   * snap printed back.
   */
  flow: {
    /** joins the two ends of a link in an accessible name: "Solaire → Réseau" */
    to: string;
    /** qualifies an entity's outgoing total in a chord tooltip: "39 sortants" */
    outgoing: string;
    /** introduces an entity's biggest partners: "surtout avec Pâquis (50)" */
    mostWith: string;
  };
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
  fr: {
    decimal: ",",
    group: FR_GROUP,
    source: "Source :",
    flow: { to: "vers", outgoing: "sortants", mostWith: "surtout avec" },
  },
  de: {
    decimal: ",",
    group: ".",
    source: "Quelle:",
    flow: { to: "nach", outgoing: "abgehend", mostWith: "vor allem mit" },
  },
  it: {
    decimal: ",",
    group: ".",
    source: "Fonte:",
    flow: { to: "verso", outgoing: "in uscita", mostWith: "soprattutto con" },
  },
  en: {
    decimal: ".",
    group: ",",
    source: "Source:",
    flow: { to: "to", outgoing: "out", mostWith: "most with" },
  },
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
/** The FLOW family's connective words for a language (see `LocaleSpec.flow`). */
export function flowWords(lang?: Lang): LocaleSpec["flow"] {
  return localeFor(lang).flow;
}

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
 * The SPELLED-OUT forms of the typographic symbol units, one row per covered language.
 *
 * A symbol unit is the only kind whose written-out form says exactly, and only, what the
 * symbol says: "54 percent" and "54%" are the same statement to a reader. That is what
 * earns these units a word table and what keeps the table from growing without bound.
 *
 * MEASURED, over the 77 distinct (unit, subtitle) pairs this repo writes down: widening the
 * rule to these word forms changes exactly ONE composed subtitle, and the change removes an
 * append — nothing gains one. Five other pairs put a spelled-out form next to a unit this
 * table does NOT know, and both groups were checked rather than waved past:
 *   - four are "583 francs" against the unit "CHF" (lib/loop/angle.test.ts:15, :231, :270;
 *     lib/host/state.test.ts:311). An ISO currency code is NOT in the symbol class: it says
 *     WHICH franc, which "francs" does not, so "(CHF)" adds information rather than
 *     repeating it. Deliberately still appended, and locked by a test.
 *   - one is "million square kilometres" against "million km²" (lib/loop/assemble/
 *     chart-native.test.ts:11, scrolly.test.ts:13, brief.test.ts:15). That IS the same
 *     redundancy in kind — and it cannot occur, because it never reaches a composer that
 *     concatenates. `introWithUnit` (lib/loop/assemble/dw-chart.ts) is the ONLY place in the
 *     repo that appends a unit onto a sentence, and it exists only because ChartSpec has no
 *     unit field; every other assembler hands the unit to its engine as its OWN field
 *     (chart-native `unit` → `subtitle={config.unit}`, map-dw `unit` → legend suffix,
 *     map-native `unit`/`valueUnit`), where there is no prose to be redundant with. The
 *     sea-ice fixture is a chart-native/scrolly element and has no dw-chart route.
 *
 * Four languages because splash finishes deliverables in four (COVERED_LANGS,
 * language-coverage.ts) and the leak is not hypothetical: the defect this table closes
 * was reproduced live in BOTH English and French, on real published charts.
 * language-coverage.test.ts holds this table to the same row-per-language rule as
 * STORY_COPY, so a fifth language cannot be declared covered while this stays quaternary.
 *
 * Order within a row matters only in that a longer form must not be shadowed by a shorter
 * prefix of it; `unitStatedIn`'s word boundary is what actually settles that ("per cent"
 * cannot match inside "per cento"), so the rows read in the order a speaker would list
 * them.
 */
export const SYMBOL_UNIT_WORDS: Record<
  string,
  Record<string, readonly string[]>
> = {
  "%": {
    en: ["percent", "per cent"],
    fr: ["pour cent"],
    de: ["Prozent"],
    it: ["per cento"],
  },
  "‰": {
    en: ["per mille", "permille"],
    fr: ["pour mille"],
    de: ["Promille"],
    it: ["per mille"],
  },
};

/** Whether a string's own edge character is alphanumeric at all — the question of whether
 *  a boundary assertion is needed there in the first place. A symbol edge ("€/m²"'s "€",
 *  "%") can never run on into an adjacent word, so it needs no assertion. */
const EDGE_ALNUM = /[\p{L}\p{N}]/u;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `needle` as its own TOKEN: bounded by non-letters, case-insensitively.
 *
 *  The boundary excludes LETTERS only (`\p{L}`), not digits, on both edges — a deliberate,
 *  explicit choice, not an accident of the character class: a number glued directly onto
 *  the unit ("12km", "500g", "3h30") is the ordinary, no-space value+unit convention, and
 *  IS the unit already stated, on either side. Only an adjacent LETTER means the run
 *  continues into an unrelated word ("moyen", "logements", "percentage", "pourcentage"),
 *  so only letters block a match. The needle is untrusted (a unit comes from a brief) and
 *  is escaped before it is ever interpolated into a pattern.
 *
 *  A naked substring test is wrong for any unit that is a single ordinary letter ("m", "t",
 *  "h", "g"): almost every sentence carries that letter buried in some unrelated word, and a
 *  check without the boundary silently swallowed the unit every time, never appending it.
 *
 *  Matching stays case-insensitive, which the German row needs ("Prozent" is capitalized as a
 *  noun and lowercase mid-compound) and which a single-letter unit pays a small price for:
 *  "M." at the start of an abbreviated name ("selon M. Dupont") can in principle be read as
 *  the unit "m" already stated. Accepted — the false positive needs a standalone capital
 *  letter immediately followed by a non-letter, no report of it firing exists, and narrowing
 *  it would mean matching case-sensitively only for length-1 units, a second special case for
 *  a residual with no observed instance. */
function tokenPattern(needle: string): RegExp {
  // Unicode-aware edge chars — needle[0]/needle[len-1] index UTF-16 code units and would
  // slice an astral character in half; nothing under test is astral, but the spread is free.
  const chars = [...needle];
  const first = chars[0]!;
  const last = chars[chars.length - 1]!;
  const left = EDGE_ALNUM.test(first) ? String.raw`(?<!\p{L})` : "";
  const right = EDGE_ALNUM.test(last) ? String.raw`(?!\p{L})` : "";
  return new RegExp(`${left}${escapeRegExp(needle)}${right}`, "iu");
}

/**
 * The text in `text` that ALREADY STATES `unit` to a reader — the symbol as its own token,
 * or, for a symbol unit, its spelled-out form in any of the four covered languages —
 * or `undefined` when the sentence does not state the unit at all.
 *
 * It answers with the MATCHED BYTES, not with a boolean, because two callers need
 * different halves of the same fact and must never disagree about it:
 *   - the dw-chart assembler (lib/loop/assemble/dw-chart.ts) appends "(unit)" to the
 *     printed subtitle only when this is undefined;
 *   - the furniture expectation (lib/loop/verify.ts) tells capture WHICH string to go
 *     looking for on the published page, and when the append did not happen the evidence
 *     the reader actually sees is the word form, not the symbol.
 * A boolean would have left the second caller guessing, and a capture that goes looking
 * for "%" on a page that correctly says "percent" files a blocking finding on a good chart.
 *
 * No `lang` parameter, on purpose, and it is not an omission: the question is what the
 * JOURNALIST'S OWN SENTENCE says, and that sentence's language is whatever they wrote it
 * in — often before any `lang` is pinned on the run at all. Every covered language's forms
 * are therefore tried. There is no false positive to trade against: "Prozent" appearing in
 * an English subtitle still means the reader has been told.
 */
export function unitStatedIn(
  text: string,
  unit: string | undefined,
): string | undefined {
  const u = unit?.trim();
  if (!u) return undefined;
  const rows = SYMBOL_UNIT_WORDS[u];
  const needles = [u, ...(rows ? Object.values(rows).flat() : [])];
  for (const needle of needles) {
    const m = tokenPattern(needle).exec(text);
    if (m) return m[0];
  }
  return undefined;
}

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
