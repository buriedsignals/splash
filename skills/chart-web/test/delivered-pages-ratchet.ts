/**
 * THE POPULATION THIS FORMAT'S FOUR CAPABILITY WALKS MEASURE, HELD AS A RATCHET OVER NAMES.
 *
 * ── THE DEFECT THAT EARNED THIS ───────────────────────────────────────────────────────────────
 *
 * `test/accessible-table`, `test/degrades-without-javascript`, `test/keyboard-reach`,
 * `test/reduced-motion` and `test/weight-ceiling` each carried `expect(files.length).toBe(24)`,
 * with the same paragraph above it in all five: *"a walk of this shape is exactly the kind of check
 * that silently drops a page … A 25th delivered beat SHOULD turn this red — bump the number here
 * and in its four siblings."*
 *
 * The reasoning was right and the instrument was wrong. A count says only that the total moved; it
 * cannot say WHICH page went missing, and — worse — dropping one page while another joins leaves it
 * green. And the maintenance it asks for is a tax paid five times per shipped story, so it will
 * eventually be paid without reading, and the edit that pays it is INDISTINGUISHABLE from the edit
 * that papers over a page falling out of the walk. Both are `24` becoming `25`.
 *
 * ── THE PROPERTY, INSTEAD ─────────────────────────────────────────────────────────────────────
 *
 * A page may JOIN the walk freely. No page that was in it may LEAVE without a red that NAMES it.
 *
 * That is strictly stronger than the count on the failure the count was written for (it survives
 * one-in-one-out, and it prints the path of the page that vanished), and it costs a shipped story
 * nothing: a new page is driven by all five capabilities on its very first run, because every one of
 * those loops runs over what the walk FOUND, never over what is recorded here.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────────────────────────
 *
 * `RECORDED_PAGES` MAY ONLY GROW. A path may be ADDED — that is a page joining, and it is free —
 * and a path may NEVER be REMOVED to make this green; removing one is exactly the defect this
 * refuses, and it is now a diff that says so in words instead of a digit that does not. Same
 * discipline as `map-web/scripts/detect-guard-wiring.mjs`'s `RECORDED_UNWIRED_DEBT` (which may only
 * shrink) and `splash/test/delivered-size-matches-the-pin.test.ts`'s `UNPINNED_BEATS`: the ratchet
 * is the direction, and the direction is stated in the shape of the file.
 *
 * THE LIMIT, NAMED: a page that joins is protected from here only once somebody records it. Until
 * then it is measured by all five capabilities and is not under the ratchet. Re-record with
 *
 *     bun -e 'import {deliveredPages} from "./skills/chart-web/scripts/delivered-pages.mjs";
 *             const r=process.cwd();
 *             console.log(deliveredPages(r).map(p=>JSON.stringify(p.slice(r.length+1))).join(",\n"))'
 *
 * and ADD what is new. Never delete a line to make a test pass.
 */

/** Every delivered `chart-web` page recorded so far, repository-relative and sorted.
 *  Measured 2026-08-23, after round eight: the 24 recorded on 2026-08-22 plus
 *  `r8-chart-web-eu-organic-farmland`, which joined by shipping. MAY ONLY GROW. */
export const RECORDED_PAGES = [
  "proof/co2-suisse/co2.html",
  "proof/more-heatmap-co2-per-capita-decades/co2-heatmap.html",
  "proof/web-co2-decline-slope/co2-decline-slope.html",
  "proof/web-co2-ranking/dist/co2-ranking.html",
  "proof/web-income-life-expectancy/income-life-expectancy.html",
  "proof/webx-carbon-footprint/carbon-footprint.html",
  "proof/webx-electricity-mix/electricity-mix.html",
  "proof/webx-germany-bridge/germany-bridge.html",
  "proof/webx-life-expectancy/life-expectancy.html",
  "proof/webx-wind-vs-solar/wind-vs-solar.html",
  "proof/webx-world-population/world-population.html",
  "proof/weby-boxplot-france-co2-decades/boxplot-france-co2-decades.html",
  "proof/weby-dumbbell-life-expectancy-gains/dumbbell-life-expectancy-gains.html",
  "proof/weby-lollipop-co2-per-capita/lollipop-co2-per-capita.html",
  "proof/weby-population-pyramid-switzerland/population-pyramid-switzerland.html",
  "proof/weby-small-multiples-co2-per-capita/small-multiples-co2-per-capita.html",
  "proof/webz-bump-emitter-rank/bump-emitter-rank.html",
  "proof/webz-diverging-bar-eu-per-capita/diverging-bar-eu-per-capita.html",
  "stories/heat-pump-adoption-across-europe/beats/1-the-gap-that-persists/renders/slope.html",
  "stories/r8-chart-web-eu-organic-farmland/beats/1-distance-to-the-target/renders/distance-to-the-target.html",
  "stories/real-ember-renewables-share/beats/1-where-your-country-sits/renders/where-your-country-sits.html",
  "stories/stress-d-asylum-gap/beats/asylum-applications-gap/asylum-applications-gap.html",
  "stories/stress-k-flat-inspections/beats/1-flat-inspections/renders/flat-inspections.html",
  "stories/stress-p-transport-ridership/beats/2-trips-per-resident/renders/trips-per-resident.html",
  "stories/stress-z-budget-parts/beats/1-postes-du-budget/renders/postes-du-budget.html",
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
