/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The failure this defends against: a delivered interactive artifact TELLS a reader — in the text a
 * screen reader reads aloud — that a reading is "available on hover, tap or keyboard focus", and one
 * of those three is not true. Before this file existed, nothing in this repository ever touched a
 * delivered artifact with a pointer. Measured at the time it was written: 80 test files, ZERO
 * dispatching a pointer, touch or mouse event, exactly ONE launching a browser at all (and that one
 * checks self-containment, not behaviour). Nine delivered artifacts made that promise; TWO were
 * false — `webx-life-expectancy` and `webx-world-population` cleared their tooltip on the
 * `pointerleave` a touch pointer fires the instant a finger lifts, so on a phone the reading
 * appeared and vanished inside one gesture. Both were found by a person deciding to drive a browser
 * for twenty minutes, which is the only thing that has ever verified an interaction claim here.
 *
 * The grounding guard (`claims-grounded-in-data.test.ts`) declares itself blind to non-numeric
 * claims ABOUT DATA. An interaction promise is a different kind of sentence — a functional assertion
 * about how the artifact behaves under a finger — and no guard was in that business, so none
 * declared itself blind to it, which is exactly why the whole layer read as covered. This file is
 * that guard, and its scope is deliberately one thing: the promise the artifact makes about its own
 * inputs, driven through the real input pipeline.
 *
 * `.focus()` MAY NEVER STAND IN FOR A POINTER, and this is the single most important rule here.
 * `HANDOVER.md` records the defect that taught it: an HTML overlay with no `pointer-events: none`
 * silently swallowed every hover while keyboard focus still worked, "because `.focus()` bypasses hit
 * testing, which is exactly why no test reached it." So the HOVER check moves a real mouse
 * (`page.mouse.move`) and the TAP check dispatches a real CDP touch sequence
 * (`Input.dispatchTouchEvent`: `touchStart` → 140ms → `touchEnd` → 300ms). `.focus()` appears in
 * this file only where it is the mechanism under test — the KEYBOARD promise — and never anywhere
 * else. A future edit that "simplifies" the hover check into a `.focus()` call re-opens the exact
 * hole this guard exists to close.
 *
 * EVERY PROBE COORDINATE IS ROUNDED TO AN INTEGER, and this is not cosmetic. Measured directly with
 * `puppeteer` in this tree: `page.mouse.move` at a FRACTIONAL coordinate silently does nothing —
 * x=65.63 produced no event at all, x=66 produced the hover. A checker that passes
 * `rect.left + rect.width / 2` straight through reports "hover is broken" on a perfectly sound
 * artifact, roughly half the time, depending on where a fluid layout happens to land.
 *
 * MARKS ARE DISCOVERED BY `data-detail`, NEVER BY CLASS. Measured across the delivered corpus, the
 * hit elements carry ELEVEN different class names — `pt`, `pt pt-named`, `cell`, `bin-hit`,
 * `row-hit`, `hit-row`, `segment-hit`, `step-hit`, `bar-hit`, `cat`, `node` — and every single one
 * of them carries `data-detail`. That attribute is also the honest source for WHAT the tooltip
 * should say: it is baked server-side from the beat's own frozen data, so comparing the tooltip's
 * text against it is a comparison against the beat's own numbers, not against anything this test
 * invents. Discovering by class would have missed six formats and quietly passed them.
 *
 * WHAT COUNTS AS A PROMISE, and why the bar is two-sided. A promise is read ONLY from text a screen
 * reader actually reads: the figure's `<desc>`, a `.visually-hidden`/`.sr-only` block, the
 * `.chart-caveat`/`figcaption`/`.chart-note` line, and an `aria-label` on a `figure`/`svg` ROOT. It
 * is never read from `<script>` or `<style>` — this matters more than it sounds: the format's own
 * interaction module is INLINED into every delivered file, and its doc-comments say "hover, tap and
 * keyboard" in twenty-three of the twenty-four artifacts, including every one that promises the
 * reader nothing at all. A guard that grepped the file text would have found a promise everywhere
 * and been unable to tell a contract from a comment. It is also never read from a MARK's own
 * `aria-label`/`data-detail`/`<title>` — those carry the reading itself ("Germany, 1987: 13.2 t"),
 * which is data, not a claim about inputs.
 *   Within that text, a SENTENCE is a promise only if it names an input word AND a reveal word,
 *   IN THE LANGUAGE THE PAGE DECLARES. Which words those are is not written in this file: it is a
 *   resource per language under `interaction-vocabulary/`, selected from the language the beat
 *   actually declared, and a beat in a language with no resource fails by name rather than passing
 *   quietly. See the vocabulary section below, and that directory's own README.
 *   Both halves are required because either alone produces false positives in this corpus's real
 *   prose. Measured phrasings that this two-sided rule correctly reads as promises, all different:
 *   "…has its own exact value on hover, tap or keyboard focus", "…is available on hover, tap or
 *   keyboard focus", "Each of the three delta bars reveals, on hover, tap or keyboard focus, …",
 *   "…hovering, tapping or focusing a row reveals its exact unrounded reading", "Hover, tap or tab
 *   to a row for its two readings", "…is available in exact figures via hover or keyboard focus",
 *   "…pointing at the chart, or tabbing to a reading, names the country, the year and its rank".
 *   Note `\btab\b` is word-bounded on purpose: two map beats ship an accessible TABLE and the word
 *   "table" must not be read as a keyboard promise.
 *
 * THE FIVE ASSERTIONS, precisely.
 *   1. PROMISED MODES ARE KEPT. For every mode the artifact's own accessible text promises, every
 *      probed mark must answer: the tooltip becomes visible and carries text. TAP is judged AFTER
 *      the finger lifts, not during — "shown during the gesture and gone the moment you let go" is
 *      the exact defect this was built for, and it looks perfect if you only measure during.
 *   2. THE TOOLTIP NEVER SPEAKS FOR ITSELF. Whatever it shows must be one of THIS artifact's own
 *      `data-detail` strings, byte for byte. A tooltip that invents a reading, or keeps showing a
 *      stale one from a previous mark, fails here.
 *   3. KEYBOARD FOCUS NAMES ITS OWN MARK. Where keyboard is promised, focusing mark *i* must show
 *      mark *i*'s own detail exactly — no nearest-neighbour tolerance, because focus has no
 *      ambiguity about which mark was addressed. Hover and tap are deliberately NOT held to this
 *      (see the blind spots below).
 *   4. THE TOOLTIP HIDES NOTHING, on every artifact whether it promises anything or not:
 *      `scrollHeight <= clientHeight + 1` and its rectangle wholly inside the window. This is the
 *      mechanical closure of D9 — a tooltip that carried 502px of country names inside a 218px box
 *      with `pointer-events: none`, so a wheel scrolled the bin underneath it and 57% of the list
 *      was unreachable by any input, while the beat's BRIEF promised it "scrolls internally".
 *   4b. THE TARGET IS THE MARK, NOT A SQUARE AT ITS ANCHOR. Every probed mark whose own drawn
 *      shape can be found in the page is also probed FOUR PIXELS INSIDE ITS OWN EDGES, and must
 *      answer there. Assertions 1-3 above are blind to this BY CONSTRUCTION — they probe the
 *      `data-detail` element's own centre, so a 28px button sitting on a 51px circle answers every
 *      time. The owner reported the consequence from a live page: on the symbol map the tooltip
 *      fires on a small inner disc rather than on entering the circle he can see.
 *
 *      THE RADIUS ASSERTED IS NEVER A SECOND CONSTANT. It is read off the drawn mark in the page —
 *      `svg [data-key]`, paired with the hit element by the key the hit element already carries —
 *      so a beat that changes its radius scale changes what this guard demands, in the same
 *      direction, without anyone editing this file. And inside the bounding box is not the same as
 *      ON the mark: each candidate point is tested against the element's real fill with
 *      `isPointInFill` in the SVG's own user space, and points that land off the painted shape are
 *      dropped. `mapgen-choropleth-web`'s Iceland is why — its box is 78px across and the top-left
 *      of that box is open sea, so a guard demanding an answer there would have been wrong about a
 *      correct artifact.
 *   5. AN INTERACTIVE ARTIFACT ANSWERS SOMETHING. Any file shipping both marks and a `#tooltip` must
 *      answer at least one input on at least one mark. A file where nothing at all responds is dead
 *      furniture regardless of what its prose says.
 *
 * WHAT IT PROVABLY DOES NOT CATCH — read this before trusting it for anything wider.
 *   1. IT CANNOT INVENT A PROMISE. If a beat's alt text words its contract in phrasing outside the
 *      vocabulary above ("tooltips throughout", "interrogate any mark"), the promise is not seen and
 *      the mode is never enforced. The two-sided input+reveal rule buys precision at exactly this
 *      cost. The mitigation is MEASURED rather than read: `PROMISE_CENSUS` pins how many pages this
 *      guard reads a promise off, per declared language, so a wording that drifts out of its
 *      vocabulary lowers the number and appears in a diff instead of switching the file off in
 *      silence. 54 of the 241 delivered pages carry a promise this guard can read today; the other
 *      187 word their contract outside it or make none, and are driven but not held to one.
 *   2. IT DOES NOT CHECK WHICH mark a POINTER resolved to. Measured, exact-match holds on 23 of 24
 *      artifacts but not on `mapgen-dot-web`, where hovering a dot's own centre legitimately
 *      resolves to a neighbouring dot 2px away — the map formats resolve by nearest mark, and dots
 *      overlap. Asserting exact identity for hover would fail a sound artifact, so assertion 2
 *      (membership in the artifact's own detail set) is what stands in its place. A resolver that
 *      answers with the WRONG-but-real neighbour is therefore not caught; a resolver that answers
 *      with a fabricated or stale string is.
 *   3. IT PROBES THREE MARKS PER ARTIFACT, not all of them — first, middle, last, plus replacements
 *      when one of those cannot be brought into the window. Three hundred readings are not driven;
 *      a beat where exactly one mark in the middle is dead can pass. The three chosen are the ones
 *      that have historically broken (an end mark sitting exactly on the `viewBox` edge killed four
 *      of three hundred readings in `weby-small-multiples` and was found by driving, not reasoning).
 *   4. IT DRIVES TWO VIEWPORTS, 1200×900 for pointer/keyboard and 390×844 with touch emulation for
 *      tap. A promise that holds at those two and breaks at 1600 or 375 is not caught here.
 *   5. IT SAYS NOTHING ABOUT FILTERS, pan/zoom, scroll vehicles, or any control that is not a
 *      per-mark tooltip. `mapmore-scrolly-danube` ships zero `data-detail` marks and no `#tooltip`
 *      and is skipped entirely — correctly, since it makes no per-mark promise, but that means the
 *      scrolly's own interaction is as unguarded as everything was before this file.
 *   6. IT IS BLIND TO WHETHER THE READING IS TRUE. `data-detail` is taken as ground truth for what
 *      the tooltip should say; whether "1987 · 77.3 years" matches the frozen CSV is
 *      `claims-grounded-in-data.test.ts`'s question, not this one's.
 *   7. TAP THAT SURVIVES BY ACCIDENT STILL PASSES. Measured: `webx-carbon-footprint` and three
 *      siblings keep their tooltip after a finger lifts not because `pointerleave` is guarded — it
 *      is not — but because tapping their mark also FOCUSES it, and the focus handler re-shows the
 *      tooltip a hundred milliseconds later. This guard measures behaviour, so it passes them, and
 *      it is right to: the reader gets the reading. But the mechanism is incidental, and a future
 *      change that makes those marks unfocusable would break tap on four beats at once.
 *   8a. A MARK WITH NO DRAWN SHAPE OF ITS OWN IS NOT EDGE-PROBED. Assertion 4b needs to find the
 *      mark in the page — a `[data-key]` inside the `<svg>` matching the hit element's key. Where a
 *      beat's hit element has no such twin, the mark is counted in the report as `no-drawn-mark`
 *      and the edge assertion has nothing to iterate.
 *
 *      This used to say "`mapgen-dot-web` is the whole of that today", AND THAT WAS FALSE. Counted:
 *      **5 of 29 delivered artifacts** carry any edge-measurable mark. `mapgen-dot-web` is one gap
 *      and it is the owner's own B6.14a — its hit elements sit at a country's anchor and the
 *      country's polygon carries no key, so a probe 60px inside France is MEASURED BY NOBODY, and
 *      closing it means ruling R1's `queryRenderedFeatures` rewrite. The larger gap is the whole
 *      CHART × WEB format: seventeen artifacts, `grep -c data-key` = **0** in every one of them,
 *      because that renderer's hit element is a transparent full-height `<rect class="bin-hit">`
 *      and no drawn mark is keyed at all. The argument that the band is deliberately wider than
 *      the mark it stands for is a good one and it is an argument, not a measurement.
 *
 *      What is fixed here is that none of this is silent any more: the vacuum is counted over the
 *      whole corpus and PINNED (`EDGE_UNMEASURABLE_ARTIFACTS`), and a beat's three directions are
 *      compared against each other, so a vacuum that grows, shrinks or moves turns red. See that
 *      constant for why the per-file table it replaced could not survive a 241-page corpus, and
 *      `docs/splash/2026-09-17-edge-measurability-owed.md` for what each format owes.
 *   8. IT REPORTS, BUT DOES NOT FAIL, a broken mode that was never promised. Measured today:
 *      `co2-suisse`, `web-income-life-expectancy` and `webz-bump-emitter-rank` all lose their
 *      tooltip when a finger lifts. None of them promises tap, so none of them fails — the contract
 *      is the prose, and the alternative (failing every artifact for every mode) would mean a beat
 *      that honestly limits itself to hover and keyboard could never be green.
 *
 * THE FALSE POSITIVE THAT SHAPED THIS FILE, since one is worth more than the rules it produced.
 * The first version of the driver picked marks by index and probed them where they sat. Nine
 * artifacts came back "hover broken on 2 of 3 marks" — every map beat and the heatmap. None was
 * broken: their marks simply sat below the fold of a 900px window, and `page.mouse.move` at a
 * y-coordinate outside the viewport does nothing at all, exactly as it does at a fractional one. A
 * second version scrolled each mark into view and passed the mark's index into the page — as a
 * STRING of a function, which `page.evaluate` treats as an expression and calls with no arguments,
 * so `i` was `undefined`, every probe reported "not in view", and the whole corpus came back
 * green-by-vacuum. Both bugs were in the CHECKER, both looked like findings, and this tree has two
 * other recorded instances of exactly that (a live `IntersectionObserver` reasserting a step
 * mid-measurement, and an unanchored `r="` regex reading a point's year as its radius). Hence the
 * explicit `probesUnreachable` accounting below, and hence assertion 5: a run where nothing could
 * be probed must be loud, never silently green.
 *
 * THE EDGE PROBE'S OWN MUTATION, run the same way in a copy under /tmp: `HIT_TARGET_PX` put back
 * as the SIZE rather than the floor in `QuakeSymbolWeb.tsx`, and the beat re-rendered. → 1 fail,
 * naming three marks, each with its drawn diameter, its target's diameter and which edges went
 * silent: "M9.1 · 2011 Great Tohoku Earthquake, Japan — drawn 53px across, target 28px, silent at
 * left, right, top". Before the fix the whole corpus reddened there without any mutation at all,
 * which was the first proof run.
 *
 * MUTATION-CHECKED BEFORE IT WAS FINISHED, in a copy under a temporary directory, never in this
 * tree — five agents were working here and mutating a shared file would have failed their work
 * instead of testing this one. The copy holds all 24 delivered `.html` and nothing else, and it is
 * green before each mutation and after each is reverted.
 *   (a) TAP RE-BROKEN — `pointerleave` unguarded again in `webx-life-expectancy`, the exact defect
 *       this guard was built for. → 1 fail: "· tap: 3 of 3 probed marks show nothing", naming the
 *       three silent marks by their own readings.
 *   (b) `pointer-events: none` DELETED from the HTML overlay in `webx-world-population`. → 2 fails,
 *       HOVER and TAP, and **keyboard stayed green** — which is this file's own thesis reproduced
 *       on demand: `.focus()` walks straight past the overlay that is swallowing every pointer, so
 *       a checker built on it would have called that artifact sound.
 *   (c) D9 RESTORED — `max-height: 220px; overflow-y: auto` put back on `webx-carbon-footprint`'s
 *       tooltip. → 1 fail: "3 tooltips hide content", one per probed bin.
 * Each mutation reddened only its own artifact's own assertion; the other 23 files and the other 80
 * test files stayed green, so every red is attributable to the thing that was broken.
 *
 * THE ROSTER AS MEASURED THE DAY THIS WAS WRITTEN — 24 delivered `.html`, every one driven, three
 * marks each. Read the "promises" column as the contract this file enforces and the mode columns as
 * what the artifact actually did; a mode that is 0/3 with no promise beside it is reported here and
 * deliberately NOT failed (blind spot 8).
 *
 *   ENFORCED — promises hover + tap + keyboard, all three kept 3/3:
 *     webx-carbon-footprint · webx-germany-bridge · webx-life-expectancy
 *     webx-wind-vs-solar · webx-world-population · weby-dumbbell-life-expectancy-gains
 *     weby-lollipop-co2-per-capita · weby-population-pyramid-switzerland
 *     weby-small-multiples-co2-per-capita · webz-diverging-bar-eu-per-capita
 *   ENFORCED — promises hover + keyboard only, both kept 3/3:
 *     weby-boxplot-france-co2-decades (tap 3/3 anyway) · webz-bump-emitter-rank (tap 0/3, and it
 *     promises no tap — the live class, reported not failed)
 *   NO PROMISE, all driven anyway:
 *     co2-suisse (tap 0/3) · web-income-life-expectancy (tap 0/3) — the same tap-clears-on-lift
 *     class as the two beats repaired here, in beats whose alt text does not claim tap
 *     mapgen-choropleth-web (tap 0/3) · mapgen-dot-web · mapgen-hexgrid-web · mapgen-locator-web
 *     mapgen-symbol-web · more-heatmap-co2-per-capita-decades · web-co2-decline-slope
 *     web-co2-ranking — all hover 3/3 and keyboard 3/3
 *   SKIPPED, correctly: mapmore-scrolly-danube — 0 marks, no `#tooltip`, no per-mark promise. Its
 *     scroll vehicle is as unguarded as everything was before this file (blind spot 5).
 *   Four artifacts report `unreachable 2` — `mapgen-choropleth-web`, `mapgen-hexgrid-web`,
 *     `mapgen-locator-web`, `more-heatmap-…`. Their first and last marks sit outside the window
 *     even after `scrollIntoView`, so the probe order fell through to replacements; three real
 *     marks were still driven on each. That counter exists so this can never be mistaken for
 *     success (see the false positive below).
 *
 * ── WHAT CHANGED ON 2026-09-17, AND WHAT IT FOUND ────────────────────────────────────────────
 *
 * The roster above describes a corpus of 24 delivered pages that no longer exists: ~85 beats moved
 * to `archive/`, and `proof/` is now 160 beats — 40 types x 4 exports — delivering 241 pages. Three
 * things in this file were measuring the old world, and this run is what each one cost.
 *
 *   1. THE PROMISE VOCABULARY WAS ENGLISH ONLY, and every beat in the corpus writes its prose in
 *      FRENCH. Every page read `promises [none]`, so assertions 1, 2 and 3 — the whole reason this
 *      file exists — were enforced on nothing at all, and the file was green about it. Making the
 *      list bilingual bought one corpus and would have gone blind again on the first German
 *      production, so the words are now a resource per language, discovered off
 *      `interaction-vocabulary/`, chosen by the language the beat DECLARES, and a language with no
 *      resource is a named failure. A pinned census keeps the switch visible; see `VOCABULARIES`,
 *      `declaredLanguage` and `PROMISE_CENSUS`.
 *   2. THE CONTRACT MOVED OUT OF THE ELEMENTS IT READ. The current renderer puts the reading
 *      contract in `<p class="chart-reading">` ("Lecture : …"), which `accessibleProse` did not
 *      read. 120 of 120 web pages carry one. Reading it is what turned the vocabulary fix into
 *      findings rather than a no-op.
 *   3. THE EDGE CENSUS WAS A ROW PER PAGE, hand-written, four rows against 241 pages. Replaced by
 *      a measured pin plus a three-directions-agree check; see `EDGE_UNMEASURABLE_ARTIFACTS`.
 *
 * WHAT (1) AND (2) TOGETHER FOUND, the first time this guard could read its own corpus: five beats
 * broke a promise their own prose makes — `web-area-swiss-co2` (hover and tap),
 * `web-cartogram-europe-lowcarbon`, `web-population-pyramid-switzerland` and
 * `web-sankey-electricity-sources` (tap), `web-streamgraph-swiss-electricity` (hover), across all
 * three directions each: 18 red assertions. ALL EIGHTEEN ARE CLOSED, by three repairs in
 * `chart-web/assets/interaction.mjs` and a re-render of those five beats — not by this file
 * softening anything. Each is written up where it lives, and the summary is:
 *
 *   - `pointerleave` was bound straight to the clear handler, and a touch pointer fires it as the
 *     finger LIFTS, so a tap opened a reading and wiped it inside one gesture. This is the original
 *     defect the guard was built for. See `leaveEndsTheReading`.
 *   - A page wires every `svg.chart` on it independently against ONE shared tooltip, and each
 *     chart's "the reader touched something else" handler asked about its OWN svg only — so on a
 *     three-chart page every tap was wiped by the neighbours. See `insideSomeChart`.
 *   - A series draws its first and last readings ON the plot's own border box, where the hit area
 *     cannot reach them: the pointer at those marks' centres is not over the svg at all. See the
 *     stage listener and `withinReach`.
 *
 * RUNTIME, and why it is where it is — see the note beside `CONCURRENCY`.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

// A cold Chrome launch plus twenty-four artifacts driven through three input modes is well past
// bun:test's 5s default.
setDefaultTimeout(600000);

/** How many artifacts are driven at once, and it is 1 BECAUSE PARALLELISM WAS MEASURED AND BOUGHT
 *  NOTHING. Whole corpus, three modes, three marks each, on this machine: CONCURRENCY 1 → 49.96s,
 *  4 → 48.98s, 8 → 47.86s **with 2 failures that were not defects** (the same probes pass at 1).
 *  The wall clock is almost entirely the fixed waits this file must spend letting the browser
 *  settle between a gesture and a reading, and those do not overlap the way a CPU-bound job would —
 *  Chrome throttles timers in pages that are not the front one. So the only thing raising this
 *  number changes is how often a run reports a defect that is really contention, which is a lesson
 *  this project has already paid for once (a suite of 80 harness cases at concurrency 4 produced 11
 *  timeouts and 8 "criticals", 11 of 11 clean when re-run sequentially). Do not raise it. */
const CONCURRENCY = 1;

/**
 * WHAT COUNTS AS A MARK, and why `[data-detail]` alone stopped being it.
 *
 * `data-detail` is still the discovery key — see the header for why class names never were. But
 * the MAP × WEB format, which entered the corpus after this file was written, also hangs
 * `data-detail` on the rows of its accessible readings table, the `<details class="mw-readings">`
 * disclosure a reader OPENS to read the numbers as text. Those rows are not hover targets: they
 * already carry their reading, they sit inside a closed disclosure below the frame, and the map's
 * own marks are MapLibre features with no DOM element of their own at all.
 *
 * Measured over one render of each of the 80 delivered beats: excluding the disclosure removes
 * marks from exactly SEVEN artifacts — `web-choropleth-…`, `web-contour-…`, `web-dot-density-…`,
 * `web-flow-map-…`, `web-hex-grid-…`, `web-locator-…`, `web-proportional-symbol-…` — and in all
 * seven it removes ALL of them (41, 13, 41, 31, 32, 43, 41 rows, 0 marks outside the table). No
 * chart × web page loses a single mark. So this is not a softening of the guard: it is the
 * difference between driving a map beat's marks and driving its footnote. Those seven were
 * reporting `marks 43 · unreachable 43 · answers false` — a table below the fold, measured as if
 * it were the artifact's interaction, on beats whose alt text promises nothing at all.
 *
 * The consequence, stated so it is not mistaken for coverage: a map × web page now reports zero
 * marks and is skipped exactly like a scrolly, and its live interaction stays guarded only by
 * `map-web`'s own key-gated tests (`skills/map-web/test/live-map.test.ts`, the `.live` lane).
 * Closing THAT is the `queryRenderedFeatures` rewrite this file's blind spot 8a already names.
 */
const MARK_SELECTOR = "[data-detail]:not(.mw-readings [data-detail])";

/** How many marks per artifact per mode. See blind spot 3. */
const PROBES_PER_ARTIFACT = 3;

type Mode = "hover" | "tap" | "keyboard";

type Probe = {
  index: number;
  detail: string;
  shown: boolean;
  text: string;
  /** Only meaningful when `shown` — the tooltip's own box against the window. */
  hidesContent: boolean;
  offWindow: boolean;
};

/** One probed mark's four EDGE readings — see the edge-probe section of the header. */
type EdgeProbe = {
  index: number;
  detail: string;
  /** The drawn mark's own width in CSS pixels, read off the page. */
  drawnPx: number;
  /** The hit target's own width in CSS pixels, read off the page. */
  targetPx: number;
  /** Which of the four inset points answered, by name. */
  silent: string[];
};

type ArtifactReport = {
  file: string;
  marks: number;
  hasTooltip: boolean;
  /** The language this page DECLARES, and where that declaration was read — see
   *  `declaredLanguage`. Empty when the page declares nothing anywhere. */
  language: string;
  languageSource: string;
  /** True when no `interaction-vocabulary/` resource answers for `language`, which is a red on its
   *  own: the promise this page makes was not read, and silence is exactly the defect. */
  vocabularyMissing: boolean;
  promises: Mode[];
  promiseSentences: string[];
  probes: Record<Mode, Probe[]>;
  probesUnreachable: number;
  edges: EdgeProbe[];
  /** Marks whose own drawn shape could not be found — see blind spot 9. */
  edgesUnderivable: number;
};

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `map-web/test/standalone.test.ts`'s own copy for why these are duplicated rather than
 *  imported (a skill's own scripts stay copy-pasteable). */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

function deliveredHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) deliveredHtml(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

// ── in-page helpers, all authored as strings/functions handed to `page.evaluate` ──────────────

/** Reads the one shared tooltip. `shown` is the union of the three ways this corpus hides it
 *  (`hidden`, `display:none`, `visibility:hidden`), so a beat that switches mechanism keeps being
 *  measured. Returned as a plain object because nothing but data crosses the CDP boundary. */
const READ_TOOLTIP = `(() => {
  const t = document.getElementById("tooltip");
  if (!t) return null;
  const cs = getComputedStyle(t);
  const r = t.getBoundingClientRect();
  return {
    shown: !t.hidden && cs.display !== "none" && cs.visibility !== "hidden",
    text: (t.textContent || "").trim(),
    hidesContent: t.scrollHeight > t.clientHeight + 1,
    offWindow: r.top < -0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5,
  };
})()`;

/** Brings mark `i` into the window and returns an INTEGER probe point — see the header on
 *  fractional coordinates. `inView` is what stops a silent no-op being read as a broken artifact. */
function aimAtMark(i: number, selector: string) {
  const mark = document.querySelectorAll(selector)[i] as
    | HTMLElement
    | undefined;
  if (!mark) return null;
  mark.scrollIntoView({ block: "center", inline: "center" });
  const r = mark.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  return {
    x,
    y,
    detail: (mark.getAttribute("data-detail") || "").trim(),
    inView:
      r.width > 0 &&
      r.height > 0 &&
      x >= 0 &&
      y >= 0 &&
      x < window.innerWidth &&
      y < window.innerHeight,
  };
}

/**
 * FOUR POINTS JUST INSIDE THE DRAWN MARK'S OWN EDGES, in the page's own coordinates.
 *
 * `aimAtMark` probes the hit element's own centre, which is why the existing checks are blind to a
 * target smaller than its mark BY CONSTRUCTION: a 28px button on a 51px circle answers at its
 * centre every time. The radius asserted here is never a second constant — it is READ OFF THE DRAWN
 * MARK in the page (`svg [data-key]`, the same key the hit element carries), so a beat that changes
 * its radius scale changes what this guard demands, automatically and in the same direction.
 *
 * Every coordinate is rounded to an integer for the reason the header gives: `page.mouse.move` at a
 * fractional coordinate silently does nothing, and `rect.right - INSET` is fractional on a fluid
 * layout about half the time.
 */
function aimAtMarkEdges(i: number, selector: string) {
  const INSET = 4;
  const hit = document.querySelectorAll(selector)[i] as HTMLElement | undefined;
  if (!hit) return null;
  const key = hit.getAttribute("data-key");
  if (!key) return { derivable: false as const };
  const drawn = document.querySelector(
    `svg [data-key="${key.replace(/"/g, '\\"')}"]`,
  ) as SVGGraphicsElement | null;
  if (!drawn) return { derivable: false as const };
  hit.scrollIntoView({ block: "center", inline: "center" });
  const d = drawn.getBoundingClientRect();
  const t = hit.getBoundingClientRect();
  if (d.width <= 2 * INSET || d.height <= 2 * INSET)
    return { derivable: false as const };
  const cx = Math.round(d.left + d.width / 2);
  const cy = Math.round(d.top + d.height / 2);
  // Inside the bounding box is not the same as ON the mark. Iceland's own polygon proves it: its
  // box is 78px across and the top-left of that box is open sea, so a probe there SHOULD get no
  // answer and a guard demanding one would be wrong. Each candidate is therefore tested against
  // the element's real fill — `isPointInFill`, in the SVG's own user space — and only the points
  // that land on painted mark are kept. For a circle all four survive; for a concave country some
  // do not, and those are not a promise anybody made.
  const ctm = drawn.getScreenCTM();
  const owner = drawn.ownerSVGElement ?? (drawn as unknown as SVGSVGElement);
  const onMark = (x: number, y: number) => {
    if (!ctm || typeof (drawn as any).isPointInFill !== "function") return true;
    const p = owner.createSVGPoint();
    p.x = x;
    p.y = y;
    const local = p.matrixTransform(ctm.inverse());
    try {
      return (drawn as any).isPointInFill(local);
    } catch {
      return true;
    }
  };
  const points = [
    { name: "left", x: Math.round(d.left + INSET), y: cy },
    { name: "right", x: Math.round(d.right - INSET), y: cy },
    { name: "top", x: cx, y: Math.round(d.top + INSET) },
    { name: "bottom", x: cx, y: Math.round(d.bottom - INSET) },
  ].filter(
    (p) =>
      p.x >= 0 &&
      p.y >= 0 &&
      p.x < window.innerWidth &&
      p.y < window.innerHeight &&
      onMark(p.x, p.y),
  );
  // Fewer than two points on painted mark is not a measurement, it is a coincidence.
  if (points.length < 2) return { derivable: false as const };
  return {
    derivable: true as const,
    detail: (hit.getAttribute("data-detail") || "").trim(),
    drawnPx: Math.round(d.width),
    targetPx: Math.round(t.width),
    points,
  };
}

function markCensus(selector: string) {
  const marks = Array.from(document.querySelectorAll(selector));
  return {
    count: marks.length,
    details: marks.map((m) => (m.getAttribute("data-detail") || "").trim()),
    hasTooltip: !!document.getElementById("tooltip"),
  };
}

/** The accessible text a screen reader reads, and NOTHING else — never `<script>`, never `<style>`,
 *  never a mark's own label. See the header: the format's interaction module is inlined into every
 *  artifact and its comments say "hover, tap and keyboard" in 23 of 24 files. */
function accessibleProse(): string[] {
  const parts: string[] = [];
  const push = (text: string | null) => {
    if (text && text.trim()) parts.push(text.replace(/\s+/g, " ").trim());
  };
  document.querySelectorAll("desc").forEach((n) => push(n.textContent));
  document
    .querySelectorAll(".visually-hidden, .sr-only")
    .forEach((n) => push(n.textContent));
  // `.chart-reading` is where the CURRENT renderer puts the reading contract — the "Lecture : …"
  // paragraph that tells a reader what the marks mean and what their inputs do. Measured
  // 2026-09-17: 120 of the 120 delivered web pages carry one, and it is the element the promise
  // sentences actually live in; reading only `.chart-caveat` beside it found the caveat and
  // missed the contract.
  document
    .querySelectorAll(".chart-caveat, figcaption, .chart-note, .chart-reading")
    .forEach((n) => push(n.textContent));
  document
    .querySelectorAll("figure[aria-label], svg[aria-label]")
    .forEach((n) => push(n.getAttribute("aria-label")));
  return parts;
}

// ── promise reading ───────────────────────────────────────────────────────────────────────────

/**
 * THE VOCABULARY IS A PER-LANGUAGE RESOURCE, AND THIS FILE HOLDS NO LIST OF LANGUAGES.
 *
 * What the words were before, and what it cost. `INPUT_WORDS`/`REVEAL_WORDS` were two constants in
 * this file, written in English, held against a corpus that is French from end to end. Every page
 * read `promises [none]`; assertions 1, 2 and 3 — the whole reason the file exists — were enforced
 * on nothing, and the file was green about it. Adding French beside English would have bought one
 * corpus and gone blind again the first time a newsroom files `languages: de`.
 *
 * THE RULE INSTEAD. Everything that IS the tool is written in English — code, comments, tests,
 * sheets. Everything the tool PRODUCES adapts to the language the journalist declared. A promise
 * sentence is produced. So its words are data, per language, discovered off the tree:
 * `interaction-vocabulary/<bcp47>.ts`, one file per language, and adding a language is adding one
 * file rather than editing this guard. `interaction-vocabulary/README.md` states what a file owes.
 *
 * AND A LANGUAGE WITH NO RESOURCE IS LOUD, NOT QUIET. `should be written in a language this guard
 * can read` fails per beat, naming the beat, the language it declared, and where that declaration
 * was read — because the failure mode being repaired here is precisely a guard that reads nothing
 * and reports success.
 */
type Vocabulary = {
  name: string;
  input: Record<Mode, RegExp>;
  reveal: RegExp;
};

const VOCABULARY_DIR = join(import.meta.dirname, "interaction-vocabulary");

/** BCP 47 as a filename: `fr.ts`, `pt-BR.ts`. Anything else in the directory (the README) is not a
 *  resource and is not guessed at. */
const VOCABULARY_FILE = /^([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)\.ts$/;

const VOCABULARIES = new Map<string, Vocabulary>();
for (const entry of readdirSync(VOCABULARY_DIR).sort()) {
  const named = VOCABULARY_FILE.exec(entry);
  if (!named) continue;
  const loaded = (await import(join(VOCABULARY_DIR, entry))).default as
    | Vocabulary
    | undefined;
  // A malformed resource is a broken guard, and a broken guard may not be a quiet one.
  if (
    !loaded ||
    typeof loaded.name !== "string" ||
    !(loaded.reveal instanceof RegExp) ||
    !loaded.input ||
    (["hover", "tap", "keyboard"] as Mode[]).some(
      (m) => !(loaded.input[m] instanceof RegExp),
    )
  )
    throw new Error(
      `interaction-vocabulary/${entry} does not export { name, input: { hover, tap, keyboard }, reveal } — see that directory's README.md`,
    );
  VOCABULARIES.set(named[1].toLowerCase(), loaded);
}

/** The tags this guard can read, for a failure message that tells a reader what to add. */
const VOCABULARY_TAGS = [...VOCABULARIES.keys()].sort();

/** `fr-CH` is French for this purpose: a region does not change which word promises a hover. The
 *  exact tag wins when a resource for it exists, so `pt-BR.ts` can differ from `pt.ts`. */
function vocabularyFor(language: string): Vocabulary | undefined {
  const tag = language.trim().toLowerCase();
  return VOCABULARIES.get(tag) ?? VOCABULARIES.get(tag.split("-")[0] ?? "");
}

/**
 * WHICH LANGUAGE A BEAT IS WRITTEN IN, read rather than assumed, in the order the declarations
 * actually bind.
 *
 *   1. THE PAGE'S OWN `<html lang>`. The most authoritative thing there is: it is the declaration
 *      the delivered artifact makes, to the same screen reader this guard reads its promise out
 *      of, and it is per page rather than per tree. 241 of the 241 delivered pages carry one.
 *   2. THE BEAT'S OWN FRONT MATTER. `proof/<beat>/BRIEF.md` carries a front-matter block on all
 *      160 beats; none names a language today, and a `language:` key there is read the moment one
 *      does — which is what a beat produced in a second language will carry.
 *   3. THE NEWSROOM PROFILE. `NEWSROOM.md`'s `languages:` (most-used first) or the older singular
 *      `language:`. This is the ladder that file's own prose already states for deciding a copy's
 *      language, read back here rather than re-invented.
 *
 * Nothing defaults. A page that answers none of the three is named by the same assertion that names
 * a language with no vocabulary, because "we could not tell" and "we cannot read it" are the same
 * failure from a reader's side.
 */
const NEWSROOM_LANGUAGE = (() => {
  const path = join(TWIN, "NEWSROOM.md");
  if (!existsSync(path)) return "";
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));
  if (!front) return "";
  const plural = /^languages:\s*(.+)$/m.exec(front[1]);
  if (plural)
    return (plural[1].split(",")[0] ?? "").replace(/["']/g, "").trim();
  const singular = /^language:\s*(.+)$/m.exec(front[1]);
  return singular ? singular[1].replace(/["']/g, "").trim() : "";
})();

function briefLanguage(file: string): string {
  const beat = relative(PROOF, file).split("/")[0];
  if (!beat) return "";
  const path = join(PROOF, beat, "BRIEF.md");
  if (!existsSync(path)) return "";
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));
  const named = front && /^language:\s*(.+)$/m.exec(front[1]);
  return named ? named[1].replace(/["']/g, "").trim() : "";
}

function declaredLanguage(
  file: string,
  pageLang: string,
): { language: string; source: string } {
  if (pageLang.trim())
    return { language: pageLang.trim(), source: "the page's own <html lang>" };
  const brief = briefLanguage(file);
  if (brief)
    return { language: brief, source: "the beat's BRIEF.md front matter" };
  if (NEWSROOM_LANGUAGE)
    return { language: NEWSROOM_LANGUAGE, source: "NEWSROOM.md" };
  return { language: "", source: "nothing — no declaration was found" };
}

export function promisesIn(
  prose: string[],
  vocabulary: Vocabulary,
): {
  modes: Mode[];
  sentences: string[];
} {
  const modes = new Set<Mode>();
  const sentences: string[] = [];
  for (const block of prose)
    for (const sentence of block.split(/(?<=[.;])\s+/)) {
      if (!vocabulary.reveal.test(sentence)) continue;
      const found = (Object.keys(vocabulary.input) as Mode[]).filter((m) =>
        vocabulary.input[m].test(sentence),
      );
      if (found.length === 0) continue;
      found.forEach((m) => modes.add(m));
      sentences.push(sentence.trim());
    }
  return { modes: [...modes], sentences };
}

// ── driving ───────────────────────────────────────────────────────────────────────────────────

/** Indices to probe: first, middle, last. Replacements are drawn from the rest of the list when one
 *  of those cannot be brought into the window, so a format that clips its edge marks is still
 *  measured on three real ones rather than silently on none. */
function probeOrder(count: number): number[] {
  const preferred = [...new Set([0, Math.floor(count / 2), count - 1])].filter(
    (i) => i >= 0,
  );
  const rest = Array.from({ length: count }, (_, i) => i).filter(
    (i) => !preferred.includes(i),
  );
  return [...preferred, ...rest];
}

async function driveArtifact(
  browser: Browser,
  file: string,
): Promise<ArtifactReport> {
  const url = "file://" + file;
  const report: ArtifactReport = {
    file: relative(TWIN, file),
    marks: 0,
    hasTooltip: false,
    language: "",
    languageSource: "",
    vocabularyMissing: false,
    promises: [],
    promiseSentences: [],
    probes: { hover: [], tap: [], keyboard: [] },
    probesUnreachable: 0,
    edges: [],
    edgesUnderivable: 0,
  };

  const desktop = await browser.newPage();
  try {
    await desktop.setViewport({ width: 1200, height: 900 });
    await desktop.goto(url, { waitUntil: "load" });

    const census = await desktop.evaluate(markCensus, MARK_SELECTOR);
    report.marks = census.count;
    report.hasTooltip = census.hasTooltip;
    const known = new Set(census.details);
    // THE LANGUAGE IS READ OFF THE PAGE BEFORE ITS PROMISE IS. Which words promise a hover is a
    // fact about the language the artifact was produced in, so the vocabulary is selected per page
    // and never assumed; a page whose language has no resource records that and promises nothing,
    // which its own assertion below turns into a named failure rather than a quiet pass.
    const { language, source } = declaredLanguage(
      file,
      (await desktop.evaluate(
        () => document.documentElement.getAttribute("lang") ?? "",
      )) as string,
    );
    report.language = language;
    report.languageSource = source;
    const vocabulary = language ? vocabularyFor(language) : undefined;
    report.vocabularyMissing = !vocabulary;
    const { modes, sentences } = vocabulary
      ? promisesIn(await desktop.evaluate(accessibleProse), vocabulary)
      : { modes: [] as Mode[], sentences: [] as string[] };
    report.promises = modes;
    report.promiseSentences = sentences;
    if (census.count === 0 || !census.hasTooltip) return report;

    let done = 0;
    for (const i of probeOrder(census.count)) {
      if (done >= PROBES_PER_ARTIFACT) break;
      const aim = await desktop.evaluate(aimAtMark, i, MARK_SELECTOR);
      if (!aim || !aim.inView) {
        report.probesUnreachable += 1;
        continue;
      }
      done += 1;

      // HOVER — a real mouse at an integer coordinate. Parked in the corner first so a move to a
      // mark is always a real crossing, never a no-op repeat of the previous position.
      await desktop.mouse.move(3, 3);
      await desktop.mouse.move(aim.x, aim.y);
      await new Promise((r) => setTimeout(r, 60));
      const hovered = (await desktop.evaluate(READ_TOOLTIP)) as Omit<
        Probe,
        "index" | "detail"
      >;
      report.probes.hover.push({ index: i, detail: aim.detail, ...hovered });

      // THE EDGES OF THE DRAWN MARK. The centre probe above answers whatever the hit element's
      // own size is; this one asks whether the target is the MARK. Four points, four real mouse
      // moves, each parked in the corner first so every move is a genuine crossing.
      const edges = await desktop.evaluate(aimAtMarkEdges, i, MARK_SELECTOR);
      if (!edges) {
        // nothing to probe — already counted as unreachable above
      } else if (!edges.derivable) report.edgesUnderivable += 1;
      else {
        const silent: string[] = [];
        for (const point of edges.points) {
          await desktop.mouse.move(3, 3);
          await desktop.mouse.move(point.x, point.y);
          await new Promise((r) => setTimeout(r, 60));
          const seen = (await desktop.evaluate(READ_TOOLTIP)) as Omit<
            Probe,
            "index" | "detail"
          >;
          if (!seen.shown || !seen.text) silent.push(point.name);
        }
        report.edges.push({
          index: i,
          detail: edges.detail,
          drawnPx: edges.drawnPx,
          targetPx: edges.targetPx,
          silent,
        });
      }

      // KEYBOARD — `.focus()` is the mechanism a keyboard reader actually uses, and this is the ONE
      // place in this file it is allowed to appear. It bypasses hit testing, so it can never stand
      // in for the hover above or the tap below.
      await desktop.mouse.move(3, 3);
      await new Promise((r) => setTimeout(r, 30));
      await desktop.evaluate(
        (j, selector) => {
          (document.querySelectorAll(selector)[j] as HTMLElement).focus();
        },
        i,
        MARK_SELECTOR,
      );
      await new Promise((r) => setTimeout(r, 50));
      const focused = (await desktop.evaluate(READ_TOOLTIP)) as Omit<
        Probe,
        "index" | "detail"
      >;
      report.probes.keyboard.push({ index: i, detail: aim.detail, ...focused });
      await desktop.evaluate(
        (j, selector) => {
          (document.querySelectorAll(selector)[j] as HTMLElement).blur();
        },
        i,
        MARK_SELECTOR,
      );
    }

    // Nothing above may leave a tooltip text this artifact does not own.
    for (const mode of ["hover", "keyboard"] as Mode[])
      for (const probe of report.probes[mode])
        if (probe.shown && !known.has(probe.text))
          probe.text = `UNKNOWN:${probe.text}`;
  } finally {
    await desktop.close();
  }

  // TAP — its own page, because touch emulation is a device state, not a per-call flag.
  const phone = await browser.newPage();
  try {
    await phone.emulate({
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    await phone.goto(url, { waitUntil: "load" });
    const census = await phone.evaluate(markCensus, MARK_SELECTOR);
    if (census.count === 0 || !census.hasTooltip) return report;
    const known = new Set(census.details);
    const cdp = await phone.createCDPSession();

    let done = 0;
    for (const i of probeOrder(census.count)) {
      if (done >= PROBES_PER_ARTIFACT) break;
      const aim = await phone.evaluate(aimAtMark, i, MARK_SELECTOR);
      if (!aim || !aim.inView) continue;
      done += 1;

      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: aim.x, y: aim.y, radiusX: 10, radiusY: 10, force: 1 },
        ],
      });
      await new Promise((r) => setTimeout(r, 140));
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      // The whole point: read AFTER the finger has lifted and the browser has fired the
      // `pointerleave` a destroyed touch pointer produces. 300ms also outlasts the synthesised
      // `click` that follows a tap.
      await new Promise((r) => setTimeout(r, 300));
      const after = (await phone.evaluate(READ_TOOLTIP)) as Omit<
        Probe,
        "index" | "detail"
      >;
      if (after.shown && !known.has(after.text))
        after.text = `UNKNOWN:${after.text}`;
      report.probes.tap.push({ index: i, detail: aim.detail, ...after });
    }
  } finally {
    await phone.close();
  }

  return report;
}

async function driveAll(files: string[]): Promise<ArtifactReport[]> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  try {
    const reports: ArtifactReport[] = [];
    for (let at = 0; at < files.length; at += CONCURRENCY)
      reports.push(
        ...(await Promise.all(
          files
            .slice(at, at + CONCURRENCY)
            .map((f) => driveArtifact(browser, f)),
        )),
      );
    return reports;
  } finally {
    await browser.close();
  }
}

// ── the run, once, at module load; the assertions read its result ─────────────────────────────

const FILES = deliveredHtml(PROOF);
const REPORTS = await driveAll(FILES);

/** One line per artifact, so a failure message carries the whole picture rather than one probe. */
function summary(r: ArtifactReport): string {
  const mode = (m: Mode) => {
    const p = r.probes[m];
    if (p.length === 0) return `${m} —`;
    return `${m} ${p.filter((x) => x.shown).length}/${p.length}`;
  };
  return [
    r.file,
    `marks ${r.marks}`,
    `lang ${r.language || "undeclared"}`,
    `promises [${r.promises.join(", ") || "none"}]`,
    mode("hover"),
    mode("tap"),
    mode("keyboard"),
    r.probesUnreachable ? `unreachable ${r.probesUnreachable}` : "",
    r.edges.length
      ? `edges ${r.edges.filter((e) => !e.silent.length).length}/${r.edges.length}`
      : "",
    r.edgesUnderivable ? `no-drawn-mark ${r.edgesUnderivable}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * THE EDGE PROBE'S OWN POPULATION, MEASURED — because it was counted, printed, and asserted about
 * nowhere.
 *
 * `report.edgesUnderivable` fed the summary line and nothing else: assertion 4b iterates
 * `report.edges`, so on an artifact where that array is empty the assertion passed by having
 * nothing to look at. Measured when this was first written: **5 of 29 delivered artifacts** had any
 * edge-derivable mark at all. The other 24 were green by vacuum.
 *
 * Making every artifact derivable is not this guard's work and cannot be: for the chart × web
 * format it means `chart-web` emitting a `data-key` on its drawn marks, and for the map formats it
 * means ruling R1's `queryRenderedFeatures` rewrite. What IS this guard's work is that the vacuum
 * stops being invisible.
 *
 * ── WHY THE PER-FILE TABLE WENT, 2026-09-17 ───────────────────────────────────────────────────
 *
 * It was a hand-written row per delivered page, and the corpus went from 29 delivered pages to
 * **241** (40 types x 4 exports, three directions each). Four rows survived the reorganisation and
 * 237 pages had none, so this file reported 278 failures of which 241 were "you have not written
 * my row yet" — a frozen list measuring a world that no longer exists, and loud enough to bury the
 * 37 findings underneath it. A row per page cannot be kept by hand at that size, and a guard
 * nobody can keep is a guard nobody reads.
 *
 * What replaces it measures the same two things off the tree:
 *
 *   1. THE THREE DIRECTIONS OF A BEAT AGREE. `creme`, `nocturne` and `rapport` are the same page
 *      drawn in three directions; a direction cannot change whether a mark is edge-measurable. So
 *      the three are compared against EACH OTHER — no list, and it holds for a beat added
 *      tomorrow. This is the half that catches an artifact going quiet, which is what the per-file
 *      row was for.
 *   2. THE VACUUM IS A PINNED NUMBER. How many mark-carrying artifacts have NO edge-measurable
 *      mark, as one integer over the whole corpus. It cannot be added to silently — a new
 *      unmeasurable format moves it and this line appears in the diff — and it is pinned rather
 *      than a ceiling so that an artifact BECOMING measurable is also red, which is how the two
 *      open rewrites above will announce themselves. Which formats make up the number, and what
 *      each owes, is written down in `docs/splash/2026-09-17-edge-measurability-owed.md`.
 */
const EDGE_UNMEASURABLE_ARTIFACTS = 97;

/**
 * HOW MANY PAGES THIS GUARD CAN ACTUALLY READ A PROMISE OUT OF, one row per DECLARED language.
 *
 * Every behavioural assertion in this file is conditional on a promise having been read — `if
 * (!report.promises.includes(mode)) return;` — so the vocabulary is the switch the whole file runs
 * through, and a vocabulary that matches nothing turns it off silently. That is not hypothetical:
 * it is what the English-only list did to an all-French corpus for as long as both existed, and
 * the file reported success the entire time. A count is the only thing that makes a switch
 * visible, so the count is written down.
 *
 * It is pinned rather than a floor for the same reason the edge vacuum is: a page whose prose stops
 * matching its language's vocabulary — a reworded reading contract, a resource edited wrong —
 * lowers the number and appears in a diff, and a page that starts making a promise raises it and
 * appears too. A beat delivered in a language nobody has written a resource for arrives as its own
 * row here AND as a named failure on that beat's `should be written in a language this guard can
 * read`.
 *
 * `undeclared` would be a row for pages carrying no `<html lang>`, no `language:` in their
 * `BRIEF.md` front matter and no `languages:` in `NEWSROOM.md`. There are none, and the row is
 * absent rather than zero so that one appearing is a change in this list.
 */
const PROMISE_CENSUS = ["fr: 54 of 241 pages"];

/**
 * A BEAT NOBODY HAS COMMITTED YET IS NOT CENSUSED. Seven sessions share this worktree, and an
 * in-flight `proof/<name>/` that git does not track shipped a delivered page within an hour of this
 * table landing — reddening every other session for a beat that is not in the repository. Its
 * artifact is still DRIVEN by every behavioural assertion in this file (hover, tap, keyboard, the
 * tooltip, the edges): those measure the page and need no record. Only the census, which compares
 * against something committed, skips it. Committing the beat brings it in, and then a missing row
 * is a real red. This is the same rule, for the same reason, as `scripts/matrix.mjs`'s `--check`.
 */
const UNTRACKED_BEATS = new Set(
  Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--others",
      "--directory",
      "--exclude-standard",
      "proof/",
    ],
    { cwd: TWIN },
  )
    .stdout.toString()
    .split("\n")
    .filter((line) => /^proof\/[^/]+\/$/.test(line.trim()))
    .map((line) => line.trim().slice(0, -1)),
);
const inUntrackedBeat = (file: string) =>
  [...UNTRACKED_BEATS].some((dir) => file.startsWith(`${dir}/`));

describe("every delivered interactive artifact keeps the promise its own alt text makes", () => {
  it("should hold the edge vacuum at the number that is written down", () => {
    // The corpus-wide half of what the per-file census used to do. An artifact carrying marks but
    // no edge-measurable one among them is green-by-vacuum on "answer wherever its own mark is
    // painted", so the count of those is pinned: a new unmeasurable format raises it, an artifact
    // that becomes measurable lowers it, and either way this line moves in a diff.
    const vacuum = REPORTS.filter(
      (r) => !inUntrackedBeat(r.file) && r.marks > 0 && r.edges.length === 0,
    ).map((r) => r.file);
    expect(
      `${vacuum.length} mark-carrying artifacts with no edge-measurable mark` +
        (vacuum.length ? `:\n  ${vacuum.join("\n  ")}` : ""),
    ).toStartWith(
      `${EDGE_UNMEASURABLE_ARTIFACTS} mark-carrying artifacts with no edge-measurable mark`,
    );
  });

  it("should measure a beat's three directions the same way", () => {
    // The per-artifact half. `creme`, `nocturne` and `rapport` are one page drawn three ways, so a
    // direction that changes whether a mark can be edge-measured — or how many marks the page has
    // at all — is a defect in that direction, and this finds it with no list to keep: the three
    // renders are compared against each other.
    const byBeat = new Map<string, ArtifactReport[]>();
    for (const r of REPORTS) {
      const beat = r.file.split("/").slice(0, 2).join("/");
      byBeat.set(beat, [...(byBeat.get(beat) ?? []), r]);
    }
    const disagreeing: string[] = [];
    for (const [beat, reports] of byBeat) {
      if (reports.length < 2) continue;
      const shape = (r: ArtifactReport) =>
        `${r.marks} marks, ${r.edges.length > 0 ? "some" : "no"} edge-measurable`;
      const shapes = new Set(reports.map(shape));
      if (shapes.size > 1)
        disagreeing.push(
          `${beat}: ${reports.map((r) => `${r.file.split("/").pop()} → ${shape(r)}`).join(" · ")}`,
        );
    }
    expect(disagreeing).toEqual([]);
  });

  it("should read a promise off as many pages as it is written down here", () => {
    // THE CENSUS THAT MAKES THE VOCABULARY LOAD-BEARING. Every behavioural assertion below is
    // conditional on a promise having been READ, so a vocabulary that matches nothing switches the
    // whole file off and reports success — which is exactly what happened for the life of the
    // English-only list. The count of pages whose prose this guard can actually read a promise out
    // of is therefore pinned, per declared language, in the same spirit as the edge vacuum above:
    // a page whose wording drifts out of its language's vocabulary drops the number and this line
    // moves in a diff, and a beat delivered in a new language appears here as its own row.
    const counted = new Map<string, { read: number; pages: number }>();
    for (const r of REPORTS) {
      if (inUntrackedBeat(r.file)) continue;
      const key = (r.language || "undeclared").toLowerCase();
      const row = counted.get(key) ?? { read: 0, pages: 0 };
      row.pages += 1;
      if (r.promises.length > 0) row.read += 1;
      counted.set(key, row);
    }
    const measured = [...counted.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, row]) => `${tag}: ${row.read} of ${row.pages} pages`);
    expect(measured.join("\n")).toBe(PROMISE_CENSUS.join("\n"));
  });

  it("should find delivered HTML to drive at all", () => {
    // Assertion 5's first half: a run that found nothing must be loud, not vacuously green.
    expect(`${FILES.length} delivered .html found under proof/`).toBe(
      `${REPORTS.length} delivered .html found under proof/`,
    );
    expect(REPORTS.length).toBeGreaterThan(15);
  });

  for (const report of REPORTS) {
    describe(report.file, () => {
      const interactive = report.marks > 0 && report.hasTooltip;

      it("should be written in a language this guard can read", () => {
        // NEVER QUIET. A beat in a language with no `interaction-vocabulary/` resource has its
        // promise unread, and every assertion below it is conditional on a promise — so without
        // this line the next production in German would go green having verified nothing, which is
        // the defect the per-language resources exist to close. The message names the beat, its
        // language, where that language was declared, and what to add.
        expect(
          `${report.file}: declared language "${report.language || "(none)"}" (from ${report.languageSource}) — ` +
            (report.vocabularyMissing
              ? `no promise vocabulary. Add skills/splash/test/interaction-vocabulary/${(report.language || "<tag>").toLowerCase()}.ts; this guard reads [${VOCABULARY_TAGS.join(", ")}]`
              : "vocabulary found"),
        ).toEndWith("vocabulary found");
      });

      it("should ship the marks and tooltip any interaction promise needs", () => {
        if (report.promises.length === 0) return;
        expect(
          `${report.file}: promises [${report.promises.join(", ")}] · marks ${report.marks} · #tooltip ${report.hasTooltip}`,
        ).toBe(
          `${report.file}: promises [${report.promises.join(", ")}] · marks ${report.marks} · #tooltip true`,
        );
      });

      it("should let a real pointer reach at least one of its marks", () => {
        if (!interactive) return;
        // Assertion 5's second half, and the guard against the checker bug described in the header:
        // "every probe was unreachable" must never read as success.
        expect(`${report.file}: probed ${report.probes.hover.length}`).not.toBe(
          `${report.file}: probed 0`,
        );
      });

      it("should answer at least one input on at least one mark", () => {
        if (!interactive) return;
        const answered =
          report.probes.hover.some((p) => p.shown) ||
          report.probes.keyboard.some((p) => p.shown) ||
          report.probes.tap.some((p) => p.shown);
        expect(`${summary(report)} → answers: ${answered}`).toBe(
          `${summary(report)} → answers: true`,
        );
      });

      for (const mode of ["hover", "tap", "keyboard"] as Mode[]) {
        it(`should keep its promise of ${mode}, if it makes one`, () => {
          if (!report.promises.includes(mode)) return;
          const probes = report.probes[mode];
          const dead = probes.filter((p) => !p.shown);
          expect(
            `${report.file} · ${mode}: ${dead.length} of ${probes.length} probed marks show nothing` +
              (dead.length
                ? `\n  promised by: ${report.promiseSentences.join(" | ")}` +
                  `\n  silent marks: ${dead.map((p) => `#${p.index} "${p.detail}"`).join(", ")}` +
                  (mode === "tap"
                    ? "\n  (tap is read AFTER the finger lifts — an unguarded `pointerleave` on a" +
                      " touch pointer wipes the tooltip the tap just opened)"
                    : "")
                : ""),
          ).toBe(
            `${report.file} · ${mode}: 0 of ${probes.length} probed marks show nothing`,
          );
        });
      }

      it("should answer wherever its own mark is painted, not only at its centre", () => {
        const failed = report.edges.filter((e) => e.silent.length > 0);
        expect(
          failed.length,
          `${report.file}: ${failed.length} mark(s) answer at their centre but not inside their own ` +
            `drawn edges — the hit target is smaller than the mark a reader is pointing at:\n  ` +
            failed
              .map(
                (e) =>
                  `"${e.detail}" — drawn ${e.drawnPx}px across, target ${e.targetPx}px, silent at ` +
                  `${e.silent.join(", ")}`,
              )
              .join("\n  "),
        ).toBe(0);
      });

      it("should never show a reading it does not own", () => {
        if (!interactive) return;
        const invented = (["hover", "tap", "keyboard"] as Mode[]).flatMap((m) =>
          report.probes[m]
            .filter((p) => p.shown && p.text.startsWith("UNKNOWN:"))
            .map((p) => `${m} #${p.index}: ${p.text}`),
        );
        expect(
          `${report.file}: ${invented.length} tooltip readings not in its own data-detail set` +
            (invented.length ? `\n  ${invented.join("\n  ")}` : ""),
        ).toBe(
          `${report.file}: 0 tooltip readings not in its own data-detail set`,
        );
      });

      it("should name the focused mark when it promises keyboard focus", () => {
        if (!report.promises.includes("keyboard")) return;
        const wrong = report.probes.keyboard.filter(
          (p) => p.shown && p.text !== p.detail,
        );
        expect(
          `${report.file}: ${wrong.length} focused marks answered with another mark's reading` +
            (wrong.length
              ? `\n  ${wrong.map((p) => `#${p.index} expected "${p.detail}" got "${p.text}"`).join("\n  ")}`
              : ""),
        ).toBe(
          `${report.file}: 0 focused marks answered with another mark's reading`,
        );
      });

      it("should not hide any of its tooltip's own content", () => {
        if (!interactive) return;
        // D9, mechanised. A tooltip that scrolls cannot be scrolled by any of the three inputs an
        // artifact promises (it is `pointer-events: none`, focus stays on the mark, and a finger
        // inside a fixed overlay fights the page), so overflow here is content no reader can reach.
        const hidden = (["hover", "tap", "keyboard"] as Mode[]).flatMap((m) =>
          report.probes[m]
            .filter((p) => p.shown && (p.hidesContent || p.offWindow))
            .map(
              (p) =>
                `${m} #${p.index}: ${p.hidesContent ? "overflows its own box" : ""}${p.hidesContent && p.offWindow ? " and " : ""}${p.offWindow ? "runs off the window" : ""}`,
            ),
        );
        expect(
          `${report.file}: ${hidden.length} tooltips hide content` +
            (hidden.length ? `\n  ${hidden.join("\n  ")}` : ""),
        ).toBe(`${report.file}: 0 tooltips hide content`);
      });
    });
  }
});
