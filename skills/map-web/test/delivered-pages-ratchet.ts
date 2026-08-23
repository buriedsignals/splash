/**
 * THE POPULATION THIS FORMAT'S CAPABILITY WALKS MEASURE, HELD AS A RATCHET OVER NAMES.
 *
 * ── THE DEFECT THAT EARNED THIS, TWICE ────────────────────────────────────────────────────────
 *
 * `chart-web` closed it on 2026-08-23 and argues it in full in its own
 * `test/delivered-pages-ratchet.ts`; this is the same closure for `map-web`, and the second half of
 * the argument was measured here the same afternoon. Five walks in this skill carried
 * `expect(files.length).toBe(12)` under a comment saying the next beat is EXPECTED to redden them
 * and that the number should then be bumped by hand. One story shipped — a world choropleth of
 * rabies deaths — and eight assertions in a skill its author was not allowed to edit went red at
 * once, over two files joining. Nothing about any of the eight had anything to do with what the
 * story did.
 *
 * A count says only that the total moved. It cannot say WHICH page went missing; one page dropping
 * while another joins leaves it green; and the edit that pays the tax honestly is
 * INDISTINGUISHABLE from the edit that papers over a page falling out of the walk. Both are `12`
 * becoming `14`.
 *
 * ── THE PROPERTY, INSTEAD ─────────────────────────────────────────────────────────────────────
 *
 * A page may JOIN the walk freely. No page that was in it may LEAVE without a red that NAMES it.
 *
 * Strictly stronger than the count on the failure the count was written for, and it costs a shipped
 * story nothing: every capability loop in this skill runs over what the walk FOUND, never over what
 * is recorded here, so a new page is driven on its first run.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────────────────────────
 *
 * `RECORDED_PAGES` MAY ONLY GROW. A path may be ADDED — that is a page joining, and it is free —
 * and a path may NEVER be REMOVED to make this green. Same discipline as
 * `map-web/scripts/detect-guard-wiring.mjs`'s `RECORDED_UNWIRED_DEBT` and
 * `splash/test/delivered-size-matches-the-pin.test.ts`'s `UNPINNED_BEATS`.
 *
 * THE LIMIT, NAMED: a page that joins is protected from here only once somebody records it. Until
 * then it is measured by every capability walk and is not under the ratchet. Re-record with
 *
 *     bun -e 'import {discoverMapWebPages} from "./skills/map-web/scripts/discover-pages.mjs";
 *             const r=process.cwd();
 *             console.log(discoverMapWebPages().map(p=>JSON.stringify(p.abs.slice(r.length+1))).join(",\n"))'
 *
 * and ADD what is new. Never delete a line to make a test pass.
 */

/** Every delivered `map-web` page recorded so far, repository-relative and sorted.
 *  Measured 2026-08-23: the 12 this skill's five counts stood at, plus the two
 *  `r9-map-web-reported-rabies-deaths` shipped. MAY ONLY GROW. */
export const RECORDED_PAGES = [
  "proof/mapgen-choropleth-web/renders/choropleth.html",
  "proof/mapgen-dot-web/dot-population.html",
  "proof/mapgen-hexgrid-web/hex-grid.html",
  "proof/mapgen-locator-web/locator.html",
  "proof/mapgen-symbol-web/quake-symbol.html",
  "skills/map-web/output-proof/population.html",
  "stories/r8-map-web-japan-bear-casualties/beats/1-bear-casualties-by-prefecture/renders/bear-casualties-by-prefecture.html",
  "stories/r8-map-web-japan-bear-casualties/export/1-bear-casualties-by-prefecture/bear-casualties-by-prefecture.html",
  "stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/renders/reported-rabies-deaths-2024.html",
  "stories/r9-map-web-reported-rabies-deaths/export/1-what-the-world-wrote-down/reported-rabies-deaths-2024.html",
  "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
  "stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/renders/where-the-routes-lead.html",
  "stories/stress-ab-emigration-flows/export/1-where-the-routes-lead/where-the-routes-lead.html",
  "stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/renders/housing-pressure-choropleth.html",
];

/** Every recorded page the walk no longer finds, by name. Empty is the only acceptable answer.
 *
 *  `found` is absolute (what `deliveredPages` returns); `root` is the twin's own directory, so the
 *  answer is stated in the same repository-relative form the record is written in. */
export function pagesThatLeftTheWalk(
  recorded: readonly string[],
  found: readonly string[],
  root: string,
): string[] {
  const still = new Set(found.map((path) => path.slice(root.length + 1)));
  return recorded.filter((path) => !still.has(path));
}

/** Every page the walk finds that is not yet under the ratchet. NOT a failure — a page joins
 *  freely — but printed by `test/population-ratchet.test.ts` so that a re-record is one copy away
 *  and the list cannot rot in silence. */
export function pagesThatJoinedTheWalk(
  recorded: readonly string[],
  found: readonly string[],
  root: string,
): string[] {
  const known = new Set(recorded);
  return found.map((path) => path.slice(root.length + 1)).filter((path) => !known.has(path));
}
