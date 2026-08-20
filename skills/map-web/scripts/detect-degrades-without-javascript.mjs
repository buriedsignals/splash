/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts` — the same
 *  `GUARDS` convention this format's other two capability detectors use. */
export const GUARDS = ["staticFrameSurvives"];

/** THE MARK POPULATION, BEFORE AND AFTER JAVASCRIPT IS TAKEN AWAY — the same `page`, driven twice.
 *
 *  `page` is handed in already navigated, scripting on, at whatever URL its own delivered file
 *  lives at (`page.url()` is read back, never passed separately, so there is no second place for a
 *  caller to get the URL wrong). This counts the marks a `data-detail` attribute names — the exact
 *  convention `tableCarriesTheMarks` and `keyboardReachesEveryMark` already read a reading off of —
 *  ONCE as the page currently stands, then disables scripting and reloads the SAME page in place,
 *  and counts again.
 *
 *  WHY A COUNT, AND NOT A BOOLEAN. A page whose marks are built entirely by an inline script (a
 *  mount point empty until hydration) reports `marksWithJs > 0, marksWithout: 0` — the defect this
 *  capability exists to catch, a graphic that is not there at all with scripting off. A page whose
 *  marks are baked at SSR time and only wired for INTERACTION by a script — the discipline this
 *  format's own seed states in its numbered list ("not assembled by the inline script") — reports
 *  the two counts equal: nothing about the population changed, only what the reader can DO with it.
 *  A bare `marksWithout > 0` boolean would pass a page that silently lost 200 of its 300 marks the
 *  moment scripting went away; the count makes that loss visible rather than merely "still some".
 *
 *  `page.evaluate()` runs over the CDP `Runtime.evaluate` channel, which executes regardless of
 *  `setJavaScriptEnabled(false)` — that flag disables the PAGE's OWN `<script>` tags, not devtools
 *  evaluation — so both counts are read the same way, by the same code, and neither number depends
 *  on the harness itself being exempted from the very thing being measured. */
export async function staticFrameSurvives(page) {
  const marksWithJs = await page.evaluate(
    () => document.querySelectorAll("[data-detail]").length,
  );
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: "load" });
  const marksWithout = await page.evaluate(
    () => document.querySelectorAll("[data-detail]").length,
  );
  return { marksWithJs, marksWithout };
}
