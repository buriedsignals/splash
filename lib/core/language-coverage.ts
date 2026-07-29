// WHICH languages splash can finish a deliverable in — and the refusal it owes when asked for
// another one.
//
// The refusal is stated AT THE OFFER, never at delivery. A fifth language does not fail
// loudly today: Datawrapper's own locale map covers seven tags (dwLocale,
// skills/dw-chart/src/spec-to-metadata.ts), so a Spanish run renders Spanish NUMBERS under a
// literal English "Source:" — a mixed deliverable nobody chose. Offering a form and then
// handing back that is worse than not offering it.
//
// This list is a DEBT, not a state. docs/splash/language-debt.md records what each uncovered
// language needs; the list grows when a row is written, and this module is the one place that
// has to change.

export const COVERED_LANGS = ["en", "fr", "de", "it"] as const;

function base(lang: string): string {
  return lang.toLowerCase().split(/[-_]/)[0] ?? "";
}

/** True when the furniture tables have a row for `lang` — or when there is no language at all
 *  (a run that never declared one is not a run in a fifth language; it is a run in the
 *  default, which is covered by construction).
 *
 *  Membership in COVERED_LANGS alone, not a proxy read through `localeFor`: `localeFor` falls
 *  back to the EN row for any tag it does not know, so "the resolved source label differs from
 *  English's" can only ever be true for a tag that already HAS its own row with distinct
 *  furniture (today: fr, de, it) — exactly the set COVERED_LANGS already names. Checked by
 *  hand for every branch this function must answer (localeFor("es") resolves to the same EN
 *  object localeFor("en") does, so their `.source` is identical; localeFor("fr"/"de"/"it")
 *  each carry a distinct `.source`) — the extra clause could only ever repeat this list, never
 *  correct it, so it is not carried here. */
export function isCoveredLang(lang: string | undefined): boolean {
  if (typeof lang !== "string" || !lang.trim()) return true;
  const b = base(lang.trim());
  return (COVERED_LANGS as readonly string[]).includes(b);
}

/** What the journalist is told, at the offer. Names the languages that ARE covered, because a
 *  refusal that does not say what would work is a dead end. */
export function uncoveredLanguageRefusal(lang: string): string {
  const others = COVERED_LANGS.filter((l) => l !== "en").join(", ");
  return (
    `this run is in "${lang}", and splash has no furniture written for it — a deliverable ` +
    `would carry ${lang} numbers under an English "Source:" caption, which is a mix nobody ` +
    `chose. English, ${others} are covered; bring the article in one of those, or add the ` +
    `row (docs/splash/language-debt.md says what a row needs)`
  );
}
