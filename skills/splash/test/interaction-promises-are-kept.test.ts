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
 *   Within that text, a SENTENCE is a promise only if it names an input word AND a reveal word:
 *   - input:  `hover`/`hovering`, `tap`/`tapping`, `keyboard`, `focus`/`focusing`, `tab`/`tabbing`,
 *             `pointing at`
 *   - reveal: `available`, `reachable`, `reveal(s)`, `show(s)`, `names`, `for its`, `has its own`,
 *             `prints`
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
 *      cost. The mitigation is the report this file prints on failure and the roster below: it lists
 *      every artifact and every promise it FOUND, so a beat missing from that list is visible to a
 *      person reading, which is not the same as being guarded.
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
 *      What is fixed here is that none of this is silent any more: `EDGE_CENSUS` records the pair
 *      per artifact with its reason and every artifact asserts against its row, so a vacuum that
 *      grows, shrinks or moves turns red. See that table.
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
 *     webx-carbon-footprint · webx-electricity-mix · webx-germany-bridge · webx-life-expectancy
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
 * RUNTIME, and why it is where it is — see the note beside `CONCURRENCY`.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer, { type Browser } from "puppeteer";

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
function aimAtMark(i: number) {
  const mark = document.querySelectorAll("[data-detail]")[i] as
    HTMLElement | undefined;
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
function aimAtMarkEdges(i: number) {
  const INSET = 4;
  const hit = document.querySelectorAll("[data-detail]")[i] as
    HTMLElement | undefined;
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

function markCensus() {
  const marks = Array.from(document.querySelectorAll("[data-detail]"));
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
  document
    .querySelectorAll(".chart-caveat, figcaption, .chart-note")
    .forEach((n) => push(n.textContent));
  document
    .querySelectorAll("figure[aria-label], svg[aria-label]")
    .forEach((n) => push(n.getAttribute("aria-label")));
  return parts;
}

// ── promise reading ───────────────────────────────────────────────────────────────────────────

const INPUT_WORDS: Record<Mode, RegExp> = {
  hover: /\bhover(s|ing)?\b|\bpointing at\b/i,
  tap: /\btap(s|ping)?\b/i,
  // `\btab\b` is word-bounded so the two map beats' accessible TABLE never reads as a keyboard
  // promise.
  keyboard: /\bkeyboard\b|\bfocus(es|ing)?\b|\btab(s|bing)?\b/i,
};

const REVEAL_WORDS =
  /\bavailable\b|\breachable\b|\breveals?\b|\bshows?\b|\bnames\b|\bfor its\b|\bhas its own\b|\bprints\b/i;

export function promisesIn(prose: string[]): {
  modes: Mode[];
  sentences: string[];
} {
  const modes = new Set<Mode>();
  const sentences: string[] = [];
  for (const block of prose)
    for (const sentence of block.split(/(?<=[.;])\s+/)) {
      if (!REVEAL_WORDS.test(sentence)) continue;
      const found = (Object.keys(INPUT_WORDS) as Mode[]).filter((m) =>
        INPUT_WORDS[m].test(sentence),
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

    const census = await desktop.evaluate(markCensus);
    report.marks = census.count;
    report.hasTooltip = census.hasTooltip;
    const known = new Set(census.details);
    const { modes, sentences } = promisesIn(
      await desktop.evaluate(accessibleProse),
    );
    report.promises = modes;
    report.promiseSentences = sentences;
    if (census.count === 0 || !census.hasTooltip) return report;

    let done = 0;
    for (const i of probeOrder(census.count)) {
      if (done >= PROBES_PER_ARTIFACT) break;
      const aim = await desktop.evaluate(aimAtMark, i);
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
      const edges = await desktop.evaluate(aimAtMarkEdges, i);
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
      await desktop.evaluate((j) => {
        (document.querySelectorAll("[data-detail]")[j] as HTMLElement).focus();
      }, i);
      await new Promise((r) => setTimeout(r, 50));
      const focused = (await desktop.evaluate(READ_TOOLTIP)) as Omit<
        Probe,
        "index" | "detail"
      >;
      report.probes.keyboard.push({ index: i, detail: aim.detail, ...focused });
      await desktop.evaluate((j) => {
        (document.querySelectorAll("[data-detail]")[j] as HTMLElement).blur();
      }, i);
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
    const census = await phone.evaluate(markCensus);
    if (census.count === 0 || !census.hasTooltip) return report;
    const known = new Set(census.details);
    const cdp = await phone.createCDPSession();

    let done = 0;
    for (const i of probeOrder(census.count)) {
      if (done >= PROBES_PER_ARTIFACT) break;
      const aim = await phone.evaluate(aimAtMark, i);
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
 * THE EDGE PROBE'S OWN POPULATION, PINNED — because it was counted, printed, and asserted about
 * nowhere.
 *
 * `report.edgesUnderivable` fed the summary line and nothing else: assertion 4b iterates
 * `report.edges`, so on an artifact where that array is empty the assertion passed by having
 * nothing to look at. Measured when this was written: **5 of 29 delivered artifacts** have any
 * edge-derivable mark at all. The other 24 were green by vacuum, `mapgen-dot-web` — the one beat
 * the owner reported for this mechanism (B6.14a) — among them.
 *
 * Making all 29 derivable is not this guard's work and cannot be: for the chart-web format it means
 * `chart-web` emitting a `data-key` on its drawn marks, and for `mapgen-dot-web` it means
 * ruling R1's `queryRenderedFeatures` rewrite. What IS this guard's work is that the vacuum stops
 * being invisible. So each artifact records WHETHER any of its marks can be edge-measured at all,
 * and how many marks were probed, with the reason — and asserts it, per artifact, below.
 *
 * What that buys, exactly:
 *   - an artifact that STOPS being edge-measurable turns red instead of going quiet;
 *   - a NEW artifact arrives with no row and turns red, so somebody has to say which of these
 *     reasons it is;
 *   - a row that is no longer true — an artifact that has BECOME measurable — turns red too, which
 *     is how the two open items above will announce themselves when they land.
 *
 * IT RECORDS A BOOLEAN AND A COUNT, NOT THE EXACT SPLIT, and the reason is measured rather than
 * assumed. `mapgen-choropleth-web` returns 1-of-3 measurable in one checkout of this tree and
 * 2-of-3 in another — stable across repeated runs in each, different between them. That is the
 * knife edge `aimAtMarkEdges` deliberately sits on: a concave country needs at least two of its
 * four inset points to land on painted fill, and Iceland has fractionally more or less of its
 * bounding box over open sea depending on where a fluid layout lands. Pinning the split would make
 * this guard cry wolf on a correct artifact, which is the failure this file's own header spends a
 * paragraph on. Whether an artifact can be measured AT ALL does not move.
 *
 * ITS OWN MUTATIONS, run in copies of the tree under /tmp on 2026-08-11, never here. Both of these
 * were GREEN before this table existed — the first because assertion 4b had an empty array to
 * iterate, the second because nothing counted the artifacts at all.
 *
 *   strip `data-key` off the drawn `<circle>`s of `quake-symbol.html`, leaving its hit buttons
 *   keyed — i.e. arrive silently at `mapgen-dot-web`'s state:
 *
 *     Expected: "proof/mapgen-symbol-web/quake-symbol.html: some mark is edge-measurable, 3 probed"
 *     Received: "proof/mapgen-symbol-web/quake-symbol.html: NO mark is edge-measurable, 3 probed"
 *     (fail) … proof/mapgen-symbol-web/quake-symbol.html > should edge-probe as many of its marks
 *            as its recorded census says
 *      320 pass · 1 fail
 *
 *   a thirtieth delivered artifact appears with no row:
 *
 *     + "proof/fake-new-web/fake.html",
 *     (fail) … > should hold an edge-probe census row for every artifact it drives, and none for
 *            an artifact it does not
 *     Expected: "proof/fake-new-web/fake.html has a census row: true"
 *     Received: "proof/fake-new-web/fake.html has a census row: false"
 *      330 pass · 2 fail
 */
const EDGE_CENSUS: Record<string, { measurable: boolean; probed: number }> = {
  // ── map × web: the hit element's `data-key` names a drawn `<path>`/`<circle>`, so the probe
  //    has a mark to measure. This is the population assertion 4b was written for.
  "proof/mapgen-hexgrid-web/hex-grid.html": { measurable: true, probed: 3 },
  "proof/mapgen-locator-web/locator.html": { measurable: true, probed: 3 },
  "proof/mapgen-symbol-web/quake-symbol.html": { measurable: true, probed: 3 },
  // One or two of its three probed countries are concave enough that fewer than two inset points
  // land on painted mark — Iceland's bounding box is mostly open sea. Which of the two it is moves
  // between checkouts, which is why this table records "measurable at all" and not the split.
  "proof/mapgen-choropleth-web/renders/choropleth.html": {
    measurable: true,
    probed: 3,
  },
  // ── the beat the owner reported, and the row this table said would "turn red when it lands".
  //    It did, on the first run after the country outlines gained a `data-key` (2026-08-23, while
  //    map-web was earning `marksStrandedWithNoChannel`, which could not see this beat either).
  //    It landed as a finding, not as a clean flip: with the key in place assertion 4b immediately
  //    reported "Germany — drawn 90px across, target 28px, silent at right" — the exact B6.14a gap
  //    this beat's own live layer closes and its FALLBACK never did, invisible for as long as the
  //    polygon was anonymous. Two things were wrong and both are fixed in that beat:
  //    `interaction.mjs` now forwards a pointer on `.region[data-key]` to the button of the same
  //    key (only the nine countries too small to point at keep a pointer-active disc), and the
  //    decorative dots and the baked plate are pointer-transparent — measured with
  //    `elementFromPoint`, a DOT was the topmost element at two of Germany's four probe points and
  //    the plate at a third, so the forwarding alone was wired and still silent.
  "proof/mapgen-dot-web/dot-population.html": { measurable: true, probed: 3 },
  // ── chart × web: the format emits NO `data-key` anywhere — 0 occurrences in every one of these
  //    files. Its hit element is a transparent full-height band (`<rect class="bin-hit">`)
  //    deliberately WIDER than the mark it stands for, so "the target is smaller than the mark"
  //    cannot arise the way it did on the map formats. That is an argument about the renderer, not
  //    a measurement: nothing here proves it, and until `chart-web` keys its drawn marks
  //    nothing can.
  "proof/co2-suisse/co2.html": { measurable: false, probed: 3 },
  "proof/more-heatmap-co2-per-capita-decades/co2-heatmap.html": {
    measurable: false,
    probed: 3,
  },
  "proof/web-co2-decline-slope/co2-decline-slope.html": {
    measurable: false,
    probed: 3,
  },
  "proof/web-co2-ranking/dist/co2-ranking.html": {
    measurable: false,
    probed: 3,
  },
  "proof/web-income-life-expectancy/income-life-expectancy.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-carbon-footprint/carbon-footprint.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-electricity-mix/electricity-mix.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-germany-bridge/germany-bridge.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-life-expectancy/life-expectancy.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-wind-vs-solar/wind-vs-solar.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webx-world-population/world-population.html": {
    measurable: false,
    probed: 3,
  },
  "proof/weby-boxplot-france-co2-decades/boxplot-france-co2-decades.html": {
    measurable: false,
    probed: 3,
  },
  "proof/weby-dumbbell-life-expectancy-gains/dumbbell-life-expectancy-gains.html":
    { measurable: false, probed: 3 },
  "proof/weby-lollipop-co2-per-capita/lollipop-co2-per-capita.html": {
    measurable: false,
    probed: 3,
  },
  "proof/weby-population-pyramid-switzerland/population-pyramid-switzerland.html":
    { measurable: false, probed: 3 },
  "proof/weby-small-multiples-co2-per-capita/small-multiples-co2-per-capita.html":
    { measurable: false, probed: 3 },
  "proof/webz-bump-emitter-rank/bump-emitter-rank.html": {
    measurable: false,
    probed: 3,
  },
  "proof/webz-diverging-bar-eu-per-capita/diverging-bar-eu-per-capita.html": {
    measurable: false,
    probed: 3,
  },
  // ── scrolly: no per-mark tooltip, so nothing is probed at all and nothing should be.
  "proof/mapmore-scrolly-route-access/render/route-access.html": {
    measurable: false,
    probed: 0,
  },
  "proof/mapmore-scrolly-danube/render/danube-scrolly.html": {
    measurable: false,
    probed: 0,
  },
  "proof/mapscrolly-one-map-europe-carbon/render/one-map-four-readings.html": {
    measurable: false,
    probed: 0,
  },
  "proof/mapscrolly-quakes-three-ways/render/quakes-four-maps.html": {
    measurable: false,
    probed: 0,
  },
  "proof/scrolly-chart-eu-carbon/render/eu-carbon-four-charts.html": {
    measurable: false,
    probed: 0,
  },
  "proof/scrolly-image-grinnell-glacier/render/grinnell-glacier.html": {
    measurable: false,
    probed: 0,
  },
  "proof/scrolly-mixed-grinnell-ice/render/three-media-one-glacier.html": {
    measurable: false,
    probed: 0,
  },
  "proof/scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html":
    { measurable: false, probed: 0 },
};

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
  it("should hold an edge-probe census row for every artifact it drives, and none for an artifact it does not", () => {
    const driven = REPORTS.map((r) => r.file)
      .filter((f) => !inUntrackedBeat(f))
      .sort();
    const recorded = Object.keys(EDGE_CENSUS).sort();
    expect([
      driven.filter((f) => !recorded.includes(f)),
      recorded.filter((f) => !driven.includes(f)),
    ]).toEqual([[], []]);
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

      it("should edge-probe as many of its marks as its recorded census says", () => {
        if (inUntrackedBeat(report.file)) return; // see UNTRACKED_BEATS above
        const recorded = EDGE_CENSUS[report.file];
        // The premise, pinned: without a row the assertion below would compare undefined to
        // undefined. The roster check above is what catches that; this makes it local too.
        expect(`${report.file} has a census row: ${!!recorded}`).toBe(
          `${report.file} has a census row: true`,
        );
        expect(
          `${report.file}: ${report.edges.length > 0 ? "some" : "NO"} mark is edge-measurable, ` +
            `${report.edges.length + report.edgesUnderivable} probed`,
        ).toBe(
          `${report.file}: ${recorded.measurable ? "some" : "NO"} mark is edge-measurable, ` +
            `${recorded.probed} probed`,
        );
      });

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
