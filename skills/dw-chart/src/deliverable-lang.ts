// WHAT LANGUAGE THIS DELIVERABLE IS IN — resolved by the producer, not remembered by a model.
//
// THE DEFECT (registry E18), observed at the render on the 2026-08-05 host run: a journey held
// entirely in French, whose chart title carries the French confirmed takeaway, shipped
// `28,400,000` and « Created with Datawrapper ». Datawrapper localises numbers and dates from the
// chart's `language` field, and every piece downstream of that field already existed and had been
// verified LIVE against the real API (`dwLocale`, produce.ts's `language` patch). The missing link
// was upstream: `ChartSpec.lang` is documented as "set by the suggester from the article language"
// and NOTHING set it — a prose claim naming a producer that does not exist.
//
// WHY THE PRODUCER AND NOT THE PROSE. An orchestrator that must remember to thread a language will
// forget it, which is precisely what happened; the run had a newsroom profile declaring `lang: fr`
// sitting next to it the whole time. The install already knows what language the newsroom
// delivers in, so the producer asks instead of hoping. Same shape as E17: the component that needs
// a fact reads it where the fact lives.
//
// WHAT IT DELIBERATELY DOES NOT DO: invent a locale. An install that declares nothing keeps
// Datawrapper's own default rather than being guessed at — guessing is how a German newsroom ends
// up shipping French decimals, which is worse than the English default it would have had.
import { loadDecor } from "../../../lib/newsroom/decor";

/**
 * The BCP-47 language the deliverable should be rendered in.
 *
 * @param specLang the language the spec names, when it names one — it always wins, because a
 *   journalist (or a suggester reading the article) is a better source than the house default.
 * @param root the install to read the house delivery language from. Explicit in tests; absent in
 *   production, where `loadDecor` resolves the install's own root.
 * @returns the language, or `undefined` when neither says — never a guess.
 */
export function resolveDeliverableLang(
  specLang: string | undefined,
  root?: string,
): string | undefined {
  // SHAPE-CHECKED, both sources. A BCP-47 tag is letters, optionally a region — and a profile is
  // a file a journalist edits by hand, so it can hold anything. Measured while writing this: a
  // malformed NEWSROOM-PROFILE.md yields the string "[unclosed", which without this guard would
  // have been sent to Datawrapper as the chart's locale. Refusing an ill-formed tag keeps DW's own
  // default, which is the outcome this whole resolver is trying to improve on — never a worse one.
  const wellFormed = (t: string | undefined): string | undefined =>
    t && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(t) ? t : undefined;

  const named = wellFormed(specLang?.trim());
  if (named) return named;
  try {
    // An explicit dir is a READ (decor.ts:122) — this must never write a brand.json into a
    // directory it was merely asked about.
    return wellFormed(loadDecor(root ?? undefined).language.content?.trim());
  } catch {
    // A profile that cannot be read is not a reason to fail a render: the chart still ships, in
    // Datawrapper's default locale, exactly as it did before this resolver existed.
    return undefined;
  }
}
