/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts` — the same
 *  `GUARDS` convention `detect-accessible-table.mjs` uses for this format's first capability,
 *  extended to a second one that drives a live page rather than reading a delivered string. */
export const GUARDS = ["keyboardReachesEveryMark"];

/** TAB THROUGH THE DELIVERED PAGE, THE READER'S OWN GESTURE, NEVER `.focus()`.
 *
 *  `.focus()` proves an element CAN take focus; it says nothing about whether the reader's actual
 *  keyboard gets there, in the order a real Tab sequence would visit it, past whatever else on the
 *  page is focusable first. This drives `Tab` itself, at the CDP input level, and reads back
 *  `document.activeElement` after every press — the same reason `verify-web.mjs`'s own hover checks
 *  refuse `.focus()`/`.click()` for the mouse path (`references/web-discipline.md`).
 *
 *  A MARK is any element the delivered page's own `data-detail` attribute names as one — the exact
 *  convention `tableCarriesTheMarks` already reads a reading off of, so a second definition of
 *  "mark" never has to disagree with the first. For each one Tab actually lands on, this also asks
 *  whether the reader is TOLD anything: a non-empty accessible name (`aria-label`, falling back to
 *  `title`) on the focused element — what a screen reader announces and what a sighted keyboard
 *  user's browser tooltip shows. Not string identity against `data-detail` itself: `data-detail` is
 *  the exact, table-matching string one format's `tableCarriesTheMarks` compares verbatim, while an
 *  `aria-label` is free to phrase the same fact as a sentence (chart-web's own points read
 *  `aria-label="1950 : 10,3 Mt"` against a `data-detail` of `"1950 · 10,3 Mt"` — the same reading,
 *  worded for an ear rather than a table cell) and a check that demanded the exact string would
 *  refuse a page for phrasing its own accessible name in prose.
 *
 *  A generous buffer of extra `Tab` presses past the mark count absorbs whatever legitimate
 *  focusables a page has beyond its marks (a caption link, a filter control, the accessible table's
 *  own wrapper) without mistaking them for a missed mark: this only ever COUNTS a press that landed
 *  on a `data-detail` element, so an extra press elsewhere costs nothing and finds nothing. */
export async function keyboardReachesEveryMark(page) {
  const marks = await page.evaluate(() => document.querySelectorAll("[data-detail]").length);
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });
  const reached = new Map();
  const TAB_BUFFER = 10;
  for (let i = 0; i < marks + TAB_BUFFER; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.hasAttribute("data-detail")) return null;
      const name = (el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
      return { detail: el.getAttribute("data-detail"), hasName: name.length > 0 };
    });
    if (info) reached.set(info.detail, info.hasName);
  }
  return {
    marks,
    focusable: reached.size,
    detailShown: [...reached.values()].filter(Boolean).length,
  };
}
