// ONE HOME for the region hover popup's string, because it had two and they disagreed.
//
// A real run shipped « Genève — 157détenus / 100 000 hab. » in a live choropleth tooltip while
// the legend directly beneath it, which routes through the shared bin formatter, read
// « 43–65,8 détenus / 100 000 hab. » on the same render. The cause was bare concatenation,
// `${shownValue}${valueUnit}`, in ChoroplethMap.tsx — and the identical line in
// skills/scrolly's ScrollyMap.tsx, which is the map-scrolly the public page promises.
//
// A single-character unit hides the defect entirely ("16%" is correct), which is why it survived
// review after review: only a WORD unit shows it, and the type sheets' examples are mostly "%".
// So this is not just a call to `labelWithUnit` at two sites — it is one function both renderers
// call, with the word-unit case locked by its own test. A fix applied at N of N+1 sites is the
// failure mode this repo names by hand elsewhere (lib/geo/resolve-for-produce.ts:171-176).
import { formatLocaleNumber, labelWithUnit } from "./locale";

/**
 * The popup body for one region: its name, an em dash, and its value carried with its unit.
 * `value` may already be a string (a categorical or pre-formatted cell); a number is localized.
 */
export function regionPopupHtml(
  name: string,
  value: unknown,
  valueUnit: string | undefined,
  lang: string | undefined,
): string {
  const shown =
    typeof value === "number" ? formatLocaleNumber(value, lang) : String(value);
  return `<strong>${name} — ${labelWithUnit(shown, valueUnit, lang)}</strong>`;
}
