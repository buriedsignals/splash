// twin/skills/chart-web/scripts/verify-web.mjs
//
// The format's own verification, and the only place its three moving parts are actually proven.
//
// `references/web-discipline.md`, "Verification", already said the rule: an interactive, fluid
// format is verified by driving a real browser at several widths, never by reading markup and never
// by trusting a unit test. It said it and then left the doing to a human opening the file. This
// script is that human, written down — so the claim "hover works" is a measurement with a number
// beside it rather than a sentence somebody wrote after looking once.
//
// WHY IT DISPATCHES REAL INPUT AND NOTHING ELSE. This format has already shipped, once, a build
// where hover was completely dead: `.overlay` (the HTML layer carrying the reference/peak/end
// labels, sharing the `<svg>`'s own grid cell so a `%` position lands on the geometry it
// annotates) had no `pointer-events: none`, so it swallowed every mouse and touch event over the
// WHOLE plot before the `.hit-area` beneath it ever saw one. Nothing caught it: the markup was
// correct, every attribute a unit test could assert was present, and keyboard focus still worked —
// because `element.focus()` does not hit-test, so the entire keyboard path was blind to the defect.
// A verification allowed to call `.focus()`, `.click()`, or `dispatchEvent(new MouseEvent(...))`
// would have passed in that world, cheerfully. So this file uses ONLY `page.mouse.move` and
// `page.mouse.click` at real client coordinates — CDP input, dispatched at the OS-event level and
// hit-tested by the compositor exactly as a reader's own pointer is. If something invisible is
// sitting on top of the chart, these checks go red; that is their entire reason to exist.
// The hover checks deliberately include one probe placed on the CENTRE OF THE PEAK LABEL — an
// `.overlay` child, i.e. the precise pixel the old defect lived at — and require the tooltip to
// answer with that year's own reading.
//
// WHAT IT DOES NOT COVER, stated so it is not trusted past what it verifies:
//   - It reads text, geometry, opacity and colour. It does not look at the picture. A label
//     colliding with a line, a clipped mark, an ugly squat plot on a phone: none of that is
//     reachable from here. `--shots` writes PNGs at every width so a human still looks.
//   - One engine (Chrome). `:has()`, `dvh` and `@supports selector()` are the three features this
//     format leans on; all three are Baseline, none is verified here on Safari or Firefox.
//   - Touch is exercised as a pointer, not as a real finger: no multi-touch, no scroll-vs-tap
//     disambiguation, no 300ms tap delay.
//   - It cannot prove the ABSENCE of a defect it was not written to look for, which is why the
//     no-JS pass exists: it re-runs the filter with scripting off, and any behaviour that only
//     works because a script propped it up dies there rather than in production.
//
// Usage:
//   bun skills/chart-web/scripts/verify-web.mjs                 # renders the seed, verifies it
//   bun skills/chart-web/scripts/verify-web.mjs --file x.html   # verifies an existing beat
//   bun skills/chart-web/scripts/verify-web.mjs --shots --out /tmp/web-verify
//
// Exit code is 0 only when every check passed. Any failure prints the measurement that failed,
// with both numbers, and exits 1.

import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { render } from "./render-web.mjs";
import {
  duplicatedPayload,
  marksFromSource,
  pageLanguageMatchesStory,
  revealDashInScreenSpace,
} from "./verify-guards.mjs";
import {
  creditTracesToRecord,
  doubleHyphenInDeliveredText,
} from "./detect-delivered-text.mjs";
import { denominatorReadingStated } from "./detect-denominator-reading.mjs";
import { storyboardGateStatus } from "./storyboard-gate.mjs";
import { tableCarriesTheMarks } from "./detect-accessible-table.mjs";
import {
  FLOOR_FRACTION,
  graphicFillsItsFrame,
} from "./detect-fills-its-frame.mjs";
import { keyboardReachesEveryMark } from "./detect-reachable-by-keyboard.mjs";
import { staticFrameSurvives } from "./detect-degrades-without-javascript.mjs";
import { motionUnderReduce } from "./detect-honours-reduced-motion.mjs";
import {
  CEILING_BYTES,
  weightAgainstCeiling,
} from "./detect-weight-has-a-ceiling.mjs";
import { labelStacksFrom, mislabelledRows } from "./detect-label-rows.mjs";
import { rtlRunsAreIsolated } from "./detect-rtl-isolation.mjs";
import { inlineSvgOf, paintedLabelSvg, readPaintedGeometry } from "./painted-labels.mjs";
import { decisionsNotAsked } from "./verify-coverage.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** This skill's own root — what `decisionsNotAsked` derives the declared population from. */
const HERE_SKILL = resolve(HERE, "..");

/** The widths this format claims to work at, each paired with a REAL window height rather than a
 *  generous one — the fit rule is about the height a reader actually has, and a laptop reports far
 *  less of it than its screen's spec sheet does. 1600x800 and 1920x950 are the two that were
 *  measured overflowing (102px and 101px) before `.chart-figure` gained its `max-height`; 3440x900
 *  is the ultrawide case where the old aspect-ratio chain grew the figure to 1762px. */
const VIEWPORTS = [
  { w: 3440, h: 900, label: "ultrawide" },
  { w: 1920, h: 950, label: "desktop" },
  { w: 1600, h: 800, label: "laptop-wide" },
  { w: 1280, h: 720, label: "laptop" },
  { w: 1024, h: 768, label: "tablet-landscape" },
  { w: 768, h: 1024, label: "tablet" },
  { w: 375, h: 812, label: "phone" },
];

/** The widths the pointer/filter checks run at. Two, not seven: hover behaviour is not a function
 *  of width the way the fit is, but it IS a function of the plot being wide enough to separate
 *  eleven readings and narrow enough to bunch them — so one of each. */
const POINTER_VIEWPORTS = [
  { w: 1600, h: 800, label: "laptop-wide" },
  { w: 375, h: 812, label: "phone" },
];

/** Same shape as the copy in every other script in this repository that drives Chrome — duplicated,
 *  not imported, because nothing in a skill may import out of it. */
function resolveChrome() {
  const candidates = [];
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
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

const failures = [];
let passes = 0;
const skips = [];

function check(ok, what, detail) {
  if (ok) {
    passes += 1;
    console.log(`  ok   ${what}${detail ? `  — ${detail}` : ""}`);
  } else {
    failures.push(`${what}${detail ? `  — ${detail}` : ""}`);
    console.log(`  FAIL ${what}${detail ? `  — ${detail}` : ""}`);
  }
}

/** A check that does not apply to THIS beat, announced rather than silently omitted. The summary
 *  reprints every one: a run that verified nothing must not be able to look like a run that
 *  verified everything, which is the failure mode a quiet `if (!el) return` produces. */
function skip(what, why) {
  skips.push(`${what} — ${why}`);
  console.log(`  skip ${what}  — ${why}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until the page has stopped MOVING, before measuring anything that a build would confound.
 *
 *  This format ships an entrance (`assets/entrance.ts`): layers fade, wipe and land under
 *  `animation-fill-mode: backwards`, so until the last one has run an element that is perfectly
 *  drawn reads back at `opacity: 0`. Measured on this skill's own seed while rewriting the filter
 *  checks: the source line came back at 0.37 and four filterable elements at zero, and every one of
 *  those was the CHECKER measuring a page mid-build — the same run with JavaScript disabled, and so
 *  with no entrance at all, was clean. A fixed sleep would be a guess at a duration the contract is
 *  free to change; `document.getAnimations()` is the page's own answer. The 4s ceiling is a
 *  backstop against an animation that never ends (a looping decoration nothing in this format
 *  ships), not the wait itself. */
async function settled(page) {
  await sleep(120); // the entrance is armed by an IntersectionObserver, so it may not have begun yet
  await page.evaluate(async () => {
    const running = document.getAnimations().map((animation) => animation.finished.catch(() => {}));
    await Promise.race([
      Promise.all(running),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  });
}

/** Every coordinate handed to `page.mouse.*` goes through here first.
 *
 *  PUPPETEER'S `mouse.move` SILENTLY DOES NOTHING AT FRACTIONAL COORDINATES. Measured by a
 *  migrating agent on a real beat: a probe at x=65.63 produced no hover at all, the identical probe
 *  at x=66 worked. Nothing throws, nothing warns — the tooltip simply never appears, which reads
 *  exactly like a broken chart and cost that agent a whole wrong verification round before the
 *  cause was found. Any probe computed from a `getBoundingClientRect` centre is fractional roughly
 *  half the time, so this is not an edge case: it is the default. Round at the boundary, once,
 *  rather than at each call site where one will eventually be forgotten. */
function probe(x, y) {
  return { x: Math.round(x), y: Math.round(y) };
}

/** WCAG relative luminance / contrast, on `rgb(r, g, b)` strings as `getComputedStyle` returns
 *  them. Duplicated here rather than reached for across a skill boundary, same rule as everything
 *  else in this file. */
function contrastRatio(a, b) {
  const lum = (css) => {
    const [r, g, b2] = css
      .replace(/[^\d,.]/g, "")
      .split(",")
      .slice(0, 3)
      .map((n) => Number(n) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ===== the checks =====

/** ITEM: a web beat must fit the visible window. Measured as the document's own scroll height
 *  against the window's inner height — the one number a reader experiences as "is there a
 *  scrollbar" — plus the source line's own bottom edge, because a figure can technically fit while
 *  its last line sits under the fold of a clipped ancestor. */
async function checkFit(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await sleep(60);
  const m = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height };
    };
    return {
      docH: document.documentElement.scrollHeight,
      docW: document.documentElement.scrollWidth,
      innerH: window.innerHeight,
      innerW: window.innerWidth,
      figure: box(".chart-figure"),
      plot: box(".chart-plot"),
      source: box(".chart-source"),
      xAxis: box(".chart-plot .x-axis"),
      filter: box(".chart-filter"),
    };
  });
  const vOverflow = m.docH - m.innerH;
  const hOverflow = m.docW - m.innerW;
  check(
    vOverflow <= 1,
    `${vp.label} ${vp.w}x${vp.h}: no vertical scroll inside the visual`,
    `document ${m.docH}px in a ${m.innerH}px window (overflow ${vOverflow}px)`,
  );
  check(
    hOverflow <= 1,
    `${vp.label} ${vp.w}x${vp.h}: no horizontal scroll`,
    `document ${m.docW}px in a ${m.innerW}px window`,
  );
  check(
    m.source.bottom <= m.innerH + 1,
    `${vp.label} ${vp.w}x${vp.h}: the source line is on screen`,
    `bottom at ${Math.round(m.source.bottom)}px of ${m.innerH}px`,
  );
  // Not every beat draws an x-axis row: a slope chart labels its own two ends, a ranking labels
  // its rows, a small-multiples grid labels each panel. Asserting the row exists crashed this
  // script outright on three shipped beats — a checker that dies on a sound beat is worse than one
  // that says nothing about it.
  if (m.xAxis)
    check(
      m.xAxis.bottom <= m.innerH + 1,
      `${vp.label} ${vp.w}x${vp.h}: the x-axis is on screen`,
      `bottom at ${Math.round(m.xAxis.bottom)}px of ${m.innerH}px`,
    );
  check(
    m.plot.h >= 100,
    `${vp.label} ${vp.w}x${vp.h}: the plot is still a chart, not a strip`,
    `plot ${Math.round(m.plot.w)}x${Math.round(m.plot.h)}`,
  );
  // ROUND-SIX FINDING AC1: `fills-its-frame` reached all eight producing skills and was called by
  // none of them. This is this format's call, and it belongs here rather than in `render-web.mjs`
  // for the reason the rule's own doc-comment gives: the fraction is `.chart-figure`'s own
  // `getBoundingClientRect` against the window it was opened in, which only a real browser at a
  // real width can answer — and this file is the browser, driven, over every width a beat ships at.
  // Every number above is already measured here; the one nobody was asking is the share of the
  // reader's window the graphic actually covers.
  const filled = graphicFillsItsFrame(
    (m.figure.w * m.figure.h) / (m.innerW * m.innerH),
    FLOOR_FRACTION,
  );
  asked.push("graphicFillsItsFrame");
  check(
    !filled.under,
    `${vp.label} ${vp.w}x${vp.h}: the graphic fills a real share of the window`,
    `${(filled.fraction * 100).toFixed(1)}% of the window against a ${(FLOOR_FRACTION * 100).toFixed(1)}% floor`,
  );
  return m;
}

/** ITEM: verify hovers really work — REAL pointer events at REAL coordinates.
 *  Three probes per reading, each one a `page.mouse.move` and nothing else:
 *    1. the reading's own circle,
 *    2. the same x at the plot's vertical middle (the `.hit-area` nearest-by-x path a phone
 *       reader uses, and the path the overlay defect killed),
 *    3. for the one reading that has an overlay label above it, the LABEL's own centre pixel —
 *       the exact place the old defect lived.
 *  Every probe asserts the tooltip is visible AND carries that reading's own `data-detail`. */
async function checkHover(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await sleep(60);

  // MARKS ARE DISCOVERED BY `[data-detail]`, NOT BY `.pt`. `.pt` is the SEED's own class for a
  // point on a line; it is not the format's contract and it is not what most beats draw. Measured
  // across the thirteen shipped web beats: all 13 carry `data-detail`, only 5 carry `.pt`, and the
  // hit element is called `bin-hit`, `segment-hit`, `step-hit`, `bar-hit`, `hit-row` or `row-hit`
  // depending on what the beat is a chart OF. `data-detail` is the real contract — it is the
  // attribute `assets/interaction.mjs` reads to fill the tooltip, and the one thing every beat must
  // bake server-side — so it is what this script probes. Keying on `.pt` made this verifier
  // unusable on eight beats out of thirteen.
  //
  // AND THE PIXEL AIMED AT IS ON THE MARK, NOT AT THE CENTRE OF ITS BOX. Finding 19 of stress round
  // four: this probe used `r.left + r.width / 2, r.top + r.height / 2` for every mark, which is the
  // right pixel for a circle, a bar or a cell and the WRONG one for a diagonal. A slopegraph's mark
  // is a straight line from one axis to the other, so its bounding box is the whole plot and its
  // box centre is the line's own midpoint — and two lines that cross share that pixel exactly.
  // Measured on this format's own committed slopegraph (`proof/web-co2-decline-slope`): 11 checks
  // failed, 26 of 30 marks answered, and every single failure was the CHECKER being wrong about a
  // sound beat — the tooltip named the country the reader was pointing at, while
  // `document.elementFromPoint` at the same ambiguous pixel named the country crossing it. No
  // slopegraph could pass. The same run with real pointer events at 15% and 85% along each line
  // answers 12 of 12.
  //
  // So a mark that has GEOMETRY is sampled along that geometry — `getPointAtLength` at 15% and 85%
  // of its own length, the two positions far enough from a mid-plot crossing to be unambiguous and
  // far enough from an endpoint to stay inside a rounded cap — and the first sample the compositor
  // agrees belongs to THIS mark is the pixel the probe uses. The box centre stays as the last
  // candidate and as the fallback, which keeps every non-diagonal beat probing exactly where it
  // did before, and keeps a genuinely occluded mark reporting the failure it should rather than
  // being quietly re-aimed until it passes.
  const all = await page.evaluate(() => {
    const plot = document.querySelector(".chart-plot")?.getBoundingClientRect();
    return Array.prototype.map
      .call(document.querySelectorAll("[data-detail]"), (p) => {
        const r = p.getBoundingClientRect();
        const candidates = [];
        // ONLY A STROKED, OPEN MARK IS SAMPLED ALONG ITS OWN LENGTH. `getTotalLength` exists on
        // every SVG geometry element, and on a closed one it returns the PERIMETER — so
        // `getPointAtLength` on a heatmap's `<rect>` walks its BORDER, and the probe lands on the
        // edge it shares with the cell above it. Measured while writing this: sampling every
        // geometry element reddened `more-heatmap-co2-per-capita-decades` and
        // `webx-world-population` with twelve "tooltip never appeared" each, at the exact y of a
        // row boundary. A filled shape IS its interior, and its box centre is already the right
        // pixel; a stroked open path IS its stroke, and its box centre may not be on it at all.
        const shape = p.tagName.toLowerCase();
        const strokedOpenMark =
          shape === "line" ||
          shape === "polyline" ||
          (shape === "path" && getComputedStyle(p).fill === "none");
        if (strokedOpenMark && typeof p.getTotalLength === "function" && typeof p.getPointAtLength === "function") {
          let length = 0;
          try {
            length = p.getTotalLength();
          } catch (error) {
            length = 0;
          }
          const ctm = p.getScreenCTM();
          if (length > 0 && ctm)
            for (const along of [0.15, 0.85]) {
              const local = p.getPointAtLength(length * along);
              candidates.push({
                x: ctm.a * local.x + ctm.c * local.y + ctm.e,
                y: ctm.b * local.x + ctm.d * local.y + ctm.f,
              });
            }
        }
        candidates.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        // BY THE READING, NOT BY THE ELEMENT. A beat may carry the same `data-detail` on both the
        // visible mark and the fat transparent hit path drawn over it (measured: the committed
        // slopegraph does), so an identity test rejects the mark's own pixel as somebody else's.
        // And the whole STACK is read, not the topmost element: two marks whose hit areas overlap
        // both cover the pixel, which is the fact the old probe could not represent.
        const mine = p.getAttribute("data-detail");
        let own = null;
        for (const candidate of candidates) {
          const covers = document.elementsFromPoint(candidate.x, candidate.y).some((el) => {
            const mark = el.closest("[data-detail]");
            return mark !== null && mark.getAttribute("data-detail") === mine;
          });
          if (covers) {
            own = candidate;
            break;
          }
        }
        const aim = own ?? candidates[candidates.length - 1];
        return {
          name: p.getAttribute("data-year") ?? p.getAttribute("data-detail"),
          detail: p.getAttribute("data-detail"),
          isPoint: p.classList.contains("pt"),
          cx: aim.x,
          cy: aim.y,
          w: r.width,
          h: r.height,
          midY: plot ? plot.top + plot.height / 2 : null,
        };
      })
      // A mark with no box cannot be pointed at — off-screen, zero-sized or display:none. Probing
      // it would report a false failure, so it is excluded here and counted below instead.
      .filter((p) => p.w > 0 && p.h > 0);
  });

  // A web beat whose readings answer nothing has no reason to be in this format at all
  // (`SKILL.md`, "When to use"): the honest use of interaction is the detail a static frame had to
  // omit. So this one is a FAILURE, never a skip.
  check(
    all.length >= 2,
    `${vp.label}: the beat has readings to hover at all`,
    `${all.length} marks carrying data-detail`,
  );
  if (all.length < 2) return;

  // Some beats draw hundreds of readings (measured: 224 in `webx-world-population`, 300 in
  // `weby-small-multiples-co2-per-capita`). Probing every one at every viewport turns a check into
  // a coffee break, so beyond a threshold this samples an even spread — always including the first
  // and the last, which are the two most likely to sit against an edge.
  const MAX_PROBES = 40;
  const readings =
    all.length <= MAX_PROBES
      ? all
      : Array.from({ length: MAX_PROBES }, (_, i) =>
          all[Math.round((i * (all.length - 1)) / (MAX_PROBES - 1))],
        );
  if (readings.length < all.length)
    console.log(
      `       (sampling ${readings.length} of ${all.length} marks, first and last included)`,
    );

  // The hit test itself, before a single event is sent: what does the compositor say is on top at
  // the plot's own centre? With the overlay defect this answers `.overlay`; correct, it answers the
  // svg's own `.hit-area`. Reported alongside the pointer probes because it names the CAUSE when
  // they fail, not just the symptom.
  // The nearest-by-x overlay is the POINT beats' own mechanism (`.hit-area` plus `.pt`); a bar,
  // bin or row beat resolves a pointer by the mark's own rectangle instead. Only claim the
  // hit-area contract where the beat actually ships it.
  const columnResolved = await page.evaluate(
    () => !!document.querySelector(".hit-area"),
  );

  if (columnResolved) {
    const topAtCentre = await page.evaluate(() => {
      const plot = document.querySelector(".chart-plot").getBoundingClientRect();
      const el = document.elementFromPoint(
        Math.round(plot.left + plot.width / 2),
        Math.round(plot.top + plot.height / 2),
      );
      if (!el) return { what: "none", inOverlay: false };
      return {
        what: `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`,
        inOverlay: !!el.closest(".overlay"),
      };
    });
    // The claim is that the OVERLAY is not eating the event, not that a hit area happens to sit at
    // this particular pixel. A small-multiples grid puts a gutter between panels at the plot's own
    // centre, and demanding `.hit-area` there failed a beat whose hover works perfectly — the
    // checker mistaking its own layout assumption for a defect.
    check(
      !topAtCentre.inOverlay,
      `${vp.label}: the pointer's own hit test is not swallowed by the overlay`,
      `topmost element at the plot centre is ${topAtCentre.what}`,
    );
  } else {
    skip(
      `${vp.label}: the plot-wide hit test`,
      "this beat resolves a pointer per mark, not through a shared .hit-area",
    );
  }

  /**
   * WHAT THE TOOLTIP MUST SAY AT A GIVEN PIXEL — asked of the page, never inferred from a class
   * name. Two rounds of this script guessed instead, and both guesses were wrong about beats that
   * were perfectly sound:
   *
   *   - "a `.pt` beat resolves by nearest x" — false for a SCATTER, where two countries share an
   *     x and the point under the cursor is whichever was painted last. It reported 73 failures on
   *     `web-income-life-expectancy`, every one of them the checker's error.
   *   - "the mark I aimed at is the mark that answers" — false wherever marks overlap, which on a
   *     375px phone is most dense beats.
   *
   * So: `elementFromPoint` decides. If the topmost thing at that pixel carries a `data-detail`,
   * that is the answer the tooltip owes. If it is the shared `.hit-area` instead, the beat routes
   * by nearest x (`assets/interaction.mjs`) and the answer is the nearest mark by x over ALL of
   * them — computed with a 1px tolerance so a tie does not decide the verdict, and over `all`
   * rather than the probe sample, which was the specific bug that made a 224-reading beat report
   * 1815 where 1817 was correct.
   */
  async function expectedAt(at) {
    const under = await page.evaluate((p) => {
      const stack = document.elementsFromPoint(p.x, p.y);
      const el = stack[0];
      if (!el) return { kind: "nothing" };
      // EVERY MARK COVERING THIS PIXEL, not only the topmost one. Finding 19 of stress round four:
      // asking for the topmost made a pixel two overlapping marks BOTH answer for into a single
      // right answer and a wrong one, and the format's own committed slopegraph — twelve lines with
      // 24px hit strokes, several of them within a few pixels of each other over their whole
      // length — could not pass. Every one of its eleven failures was the checker inventing a
      // truth: the tooltip named the line the reader was pointing at, and this function named the
      // line crossing it. Where marks do not overlap the stack holds exactly one and this is
      // exactly as strict as it was; where they do, a tooltip naming any of the marks under the
      // pointer is a correct answer and naming one that is NOT under it still fails.
      const details = [];
      for (const node of stack) {
        const mark = node.closest("[data-detail]");
        if (!mark) continue;
        const detail = mark.getAttribute("data-detail");
        if (!details.includes(detail)) details.push(detail);
      }
      if (details.length > 0) return { kind: "mark", details };
      if (el.closest(".hit-area") || el.classList.contains("hit-area"))
        return { kind: "hit-area" };
      return { kind: "other", what: `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}` };
    }, at);
    if (under.kind === "mark")
      return {
        details: under.details,
        why:
          under.details.length === 1
            ? "the mark under the pointer"
            : `one of the ${under.details.length} marks whose own hit areas cover this pixel`,
      };
    if (under.kind === "hit-area")
      // A SHARED HIT AREA MEANS THE BEAT PICKS THE READING, AND WHICH RULE IT PICKS BY IS ITS OWN
      // BUSINESS. The seed resolves by nearest x, which is right for a line; a SCATTER resolves by
      // nearest in BOTH axes, which is right for a cloud where two countries share an income. A
      // third guess at "the" rule would be wrong again — the first two were, and they invented 67
      // failures on a sound beat. What this script may honestly demand here is the invariant that
      // survives every rule: the tooltip APPEARS, and it names a reading this beat actually drew
      // rather than an invented string. Exact identity is still asserted wherever the page names
      // the mark itself, which is every probe aimed at a mark.
      return {
        details: all.map((m) => m.detail),
        why: "a real reading, through the shared hit area (the beat's own resolution rule)",
      };
    return null; // empty plot: nothing is owed, so nothing is asserted
  }

  async function tooltipNow() {
    return page.evaluate(() => {
      const t = document.getElementById("tooltip");
      return { hidden: t.hidden, text: t.textContent };
    });
  }

  let onMark = 0;
  let onMarkExpected = 0;
  let inColumn = 0;
  let inColumnExpected = 0;
  for (const r of readings) {
    const own = probe(r.cx, r.cy);
    const want = await expectedAt(own);
    if (want) {
      onMarkExpected += 1;
      await page.mouse.move(own.x, own.y);
      await sleep(25);
      const shown = await tooltipNow();
      if (!shown.hidden && want.details.includes(shown.text)) onMark += 1;
      else
        failures.push(
          `${vp.label}: hovering ${r.name} at (${own.x}, ${own.y}) — tooltip ${shown.hidden ? "never appeared" : `said "${shown.text}"`}, expected ${want.details.map((d) => `"${d}"`).join(" or ")} (${want.why})`,
        );
    }

    // The same probe again, but at the plot's mid-height rather than on the mark — the path a
    // phone reader takes, who must not be asked to land a tap on a 5px circle
    // (`web-discipline.md`, "Keyboard and touch"). Where a beat's marks are their own targets this
    // pixel is often empty plot, and `expectedAt` returns null, so nothing false is asserted.
    if (r.midY !== null) {
      const col = probe(r.cx, r.midY);
      const wantCol = await expectedAt(col);
      if (wantCol) {
        inColumnExpected += 1;
        await page.mouse.move(col.x, col.y);
        await sleep(25);
        const anywhere = await tooltipNow();
        if (!anywhere.hidden && wantCol.details.includes(anywhere.text)) inColumn += 1;
        else
          failures.push(
            `${vp.label}: hovering the plot at the ${r.name} x, mid-height (${col.x}, ${col.y}) — tooltip ${anywhere.hidden ? "never appeared" : `said "${anywhere.text}"`}, expected ${wantCol.details.map((d) => `"${d}"`).join(" or ")} (${wantCol.why})`,
          );
      }
    }
  }
  check(
    onMarkExpected > 0 && onMark === onMarkExpected,
    `${vp.label}: every reading answers a real pointer on its own mark`,
    `${onMark}/${onMarkExpected}`,
  );
  if (inColumnExpected > 0)
    check(
      inColumn === inColumnExpected,
      `${vp.label}: a pointer mid-plot answers with whatever is under it`,
      `${inColumn}/${inColumnExpected}`,
    );
  else
    skip(
      `${vp.label}: pointing mid-plot rather than at a mark`,
      "this beat's marks are their own targets, so mid-plot is empty ground",
    );

  // The regression probe: the centre of an `.overlay` child. This pixel is covered by an HTML
  // element that is NOT the chart; the tooltip must still answer, which is only true while
  // `.overlay` stays `pointer-events: none`.
  // Any `.overlay` child will do — not only the seed's own `.note.peak-label`. Beats annotate
  // different things and name their labels differently; what matters is that SOME HTML sits over
  // the plot and the pointer still reaches through it. The widest one is picked because it covers
  // the most pixels a reader might aim at.
  const label = await page.evaluate(() => {
    const els = Array.prototype.slice.call(
      document.querySelectorAll(".chart-plot .overlay *"),
    );
    let best = null;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (!best || r.width > best.w))
        best = {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          w: r.width,
          text: el.textContent,
        };
    }
    return best;
  });
  if (!label)
    skip(
      `${vp.label}: pointing THROUGH the overlay`,
      "this beat draws no HTML label over its plot",
    );
  if (label) {
    const at = probe(label.x, label.y);

    // THE ASSERTION IS THE HIT TEST, NOT THE TOOLTIP'S TEXT — and the first version of this probe
    // got that wrong twice on real beats. It asked "does the tooltip name the mark nearest this
    // label by x", which assumed (a) that nearest-by-x is how the beat resolves a pointer at all,
    // false for every row-shaped beat — a lollipop's marks are separated by Y — and (b) that the
    // nearest mark was in the probe SAMPLE, false on a 224-reading beat where sampling 40 left the
    // true nearest out and the check reported 1815 where 1817 was correct. Both were the checker
    // being wrong about a sound beat, which is the failure mode that costs the most trust.
    //
    // What the original defect actually was: `.overlay` with no `pointer-events: none` sat ON TOP
    // and ate the event. That is a statement about HIT TESTING and nothing else, it is true for
    // every chart shape, and `elementFromPoint` answers it exactly — it honours
    // `pointer-events: none`, so with the defect it returns the overlay, and without it returns
    // whatever the chart put underneath.
    const under = await page.evaluate((p) => {
      const el = document.elementFromPoint(p.x, p.y);
      if (!el) return null;
      const overlay = el.closest(".overlay");
      return {
        tag: el.tagName.toLowerCase(),
        cls: el.getAttribute("class") ?? "",
        inOverlay: !!overlay,
        detail: el.getAttribute("data-detail"),
      };
    }, at);
    check(
      under !== null && !under.inOverlay,
      `${vp.label}: a pointer ON an overlay label is not swallowed by it`,
      `at (${at.x}, ${at.y}) over "${label.text?.trim().slice(0, 40)}" the topmost element is ${under ? `${under.tag}.${under.cls}` : "nothing"}`,
    );

    // And where the thing underneath IS a hoverable mark, the tooltip must actually answer with
    // that mark's own detail — the full round trip, still driven by a real pointer. Where the
    // label happens to sit over empty plot, there is nothing to answer and nothing to assert.
    await page.mouse.move(at.x, at.y);
    await sleep(40);
    const shown = await page.evaluate(() => {
      const t = document.getElementById("tooltip");
      return { hidden: t.hidden, text: t.textContent };
    });
    if (under?.detail)
      check(
        !shown.hidden && shown.text === under.detail,
        `${vp.label}: the mark beneath that label answers the pointer`,
        `tooltip said ${shown.hidden ? "nothing" : `"${shown.text}"`}, expected "${under.detail}"`,
      );
    else if (columnResolved)
      check(
        !shown.hidden,
        `${vp.label}: pointing at the overlay still resolves to a reading through the hit area`,
        `tooltip said ${shown.hidden ? "nothing" : `"${shown.text}"`}`,
      );
    else
      skip(
        `${vp.label}: the tooltip's answer under the overlay label`,
        "the label sits over empty plot, so there is no mark to answer",
      );
  }

  // Leaving the plot clears it — the other half of an honest hover.
  await page.mouse.move(4, 4);
  await sleep(60);
  const cleared = await page.evaluate(() => document.getElementById("tooltip").hidden);
  check(cleared, `${vp.label}: the tooltip clears when the pointer leaves the plot`);
}

/** ITEM: verify the filter with REAL clicks — the picture changes, and the DEFAULT state already
 *  shows the whole claim. `page.mouse.click` at the pill's own centre, so the click is hit-tested
 *  like a reader's: a control covered by something else fails here. */
async function checkFilter(page, vp, { scripting = true } = {}) {
  const tag = scripting ? vp.label : `${vp.label} (no JS)`;
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await settled(page);

  // MOST BEATS SHIP NO FILTER, AND THAT IS THE CORRECT OUTCOME OF THIS SKILL'S OWN THREE-PART
  // TEST (`SKILL.md`, "When to use" — "most beats should not have one"). Measured across the
  // thirteen shipped web beats: none of them carries a filter. So a hard assumption that
  // `#period-late` exists made this whole script unusable on them, which is the wrong way round —
  // the format's own doctrine says the filter is the exception. Absent, the filter checks are
  // skipped ALOUD; present but malformed, they still fail.
  const filter = await page.evaluate(() => {
    const fs = document.querySelector("fieldset.chart-filter");
    if (!fs) return null;
    const options = Array.prototype.map.call(fs.querySelectorAll("input[type=radio]"), (input) => ({
      id: input.id,
      // The SLUG is the token the generated CSS matches `[data-filter~="…"]` on, and `filter.ts`
      // writes it into the radio's own `value` — read from the page rather than sliced off the id,
      // so an id convention that changes again does not silently empty this check.
      slug: input.value,
      label: (input.closest("label")?.textContent ?? "").trim(),
    }));
    // The UNFILTERED option is the one that is checked when the page loads, which is what
    // `filter.ts` guarantees and what a no-JS reader lands on. Falling back to the first option
    // rather than to a reserved id keeps this readable on a beat whose vocabulary changed again.
    const checked = fs.querySelector("input[type=radio]:checked");
    const all = checked?.id ?? options[0]?.id ?? null;
    return {
      all,
      options: options.map((option) => ({ ...option, isAll: option.id === all })),
    };
  });
  if (!filter) {
    skip(
      `${tag}: the filter's own behaviour`,
      "this beat ships no filter — the expected outcome of the three-part test in SKILL.md",
    );
    // The invariant the filter checks were REALLY protecting still applies to a beat without one:
    // the view a reader lands on must already carry the whole claim, with nothing dimmed and
    // every argument-bearing word drawn. That part is checked for every beat, filter or not.
    const rest = await page.evaluate(() => {
      const marks = Array.prototype.map.call(
        document.querySelectorAll("[data-detail], .seg, .pt"),
        (el) => Number(getComputedStyle(el).opacity),
      );
      const words = Array.prototype.map
        .call(
          document.querySelectorAll(
            ".chart-title, .chart-caveat, .chart-source, .chart-plot .overlay *",
          ),
          (el) => {
            const cs = getComputedStyle(el);
            return {
              text: el.textContent.trim().slice(0, 30),
              opacity: Number(cs.opacity),
              hidden: cs.display === "none" || cs.visibility === "hidden",
            };
          },
        )
        .filter((w) => w.text.length > 0);
      return { marks, words };
    });
    check(
      rest.marks.length > 0 && rest.marks.every((o) => o === 1),
      `${tag}: the default view dims nothing — the full claim is on screen`,
      `${rest.marks.length} marks, opacities ${[...new Set(rest.marks)].join("/")}`,
    );
    check(
      rest.words.length > 0 && rest.words.every((w) => w.opacity === 1 && !w.hidden),
      `${tag}: every argument-bearing word is drawn unconditionally`,
      `${rest.words.length} words checked`,
    );
    return;
  }
  check(
    filter.options.length >= 2,
    `${tag}: the filter is a real radio group`,
    `radios: ${filter.options.map((o) => o.id).join(", ") || "none"}`,
  );
  if (filter.options.length < 2) return;

  // THE FILTER'S OWN VOCABULARY, READ OFF THE PAGE. This block used to name `#period-all`,
  // `input[name=period]` and `.seg[data-period="early"]` — the ids ONE beat happened to use, in a
  // filter mechanism this format has since replaced. `assets/filter.ts` now derives every option's
  // id and token from the beat's own declaration (`chart-filter-<slug>`, `data-filter="<slug>"`,
  // one generated CSS rule per option), and nothing here had followed it: run with no `--file` at
  // all, against the format's OWN SEED, this script reported five false failures and then died on
  // `document.querySelector("#period-all").closest(...)` returning null. The command `SKILL.md`
  // tells a producer to run crashed on the one page this skill ships. So the option list, the
  // group's name and the unfiltered default are all read from the fieldset, and what an option
  // DOES is measured through the vocabulary the beat declared rather than through one beat's class
  // names.
  const state = () =>
    page.evaluate(
      (tokens) => {
        // A STRAIGHT STROKE HAS A ZERO-WIDTH BOX AND IS PERFECTLY VISIBLE. Requiring extent in BOTH
        // axes reported one element hidden on `proof/web-income-life-expectancy` at every viewport,
        // with and without scripting: a vertical `<line data-key="CUB">`, 0 x 18.1, `display:
        // inline`, `opacity: 1`, drawn on screen in the beat's own accent. The checker being wrong
        // about a sound beat. A mark is off the picture when it has NO extent at all.
        const drawn = (el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            cs.display !== "none" &&
            cs.visibility !== "hidden" &&
            Number(cs.opacity) > 0 &&
            (r.width > 0 || r.height > 0)
          );
        };
        const marks = { shown: {}, hidden: {} };
        for (const token of tokens) {
          marks.shown[token] = 0;
          marks.hidden[token] = 0;
        }
        for (const el of document.querySelectorAll("[data-filter]")) {
          const mine = (el.getAttribute("data-filter") ?? "").split(/\s+/).filter(Boolean);
          for (const token of mine)
            if (tokens.includes(token)) marks[drawn(el) ? "shown" : "hidden"][token] += 1;
        }
        const seen = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            text: el.textContent.trim(),
            opacity: Number(cs.opacity),
            display: cs.display,
            visibility: cs.visibility,
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        };
        const notes = {};
        for (const el of document.querySelectorAll("[data-filter-note]"))
          notes[el.getAttribute("data-filter-note")] = drawn(el);
        return {
          checked: (document.querySelector("fieldset.chart-filter input[type=radio]:checked") ?? {}).id ?? null,
          marks,
          notes,
          furniture: {
            title: seen(".chart-title"),
            caveat: seen(".chart-caveat"),
            source: seen(".chart-source"),
          },
        };
      },
      filter.options.map((option) => option.slug),
    );

  // THE FURNITURE THAT MUST SURVIVE EVERY OPTION, and only what every beat has. The old list named
  // `.note.reference-label`, `.note.peak-label` and `.end-label` — three annotations the seed
  // happens to draw — and reported a beat that annotates differently as a beat that lost its
  // argument. The title, the caveat and the source line are what `web-discipline.md` requires of
  // every beat in this format, and a filter may never take one away.
  const argumentIntact = (found, where) => {
    for (const [name, box] of Object.entries(found.furniture)) {
      check(
        box !== null && box.opacity === 1 && box.display !== "none" && box.visibility !== "hidden" && box.w > 0 && box.h > 0,
        `${tag}: ${where} — the ${name} is still fully drawn`,
        box ? `opacity ${box.opacity}, ${box.w}x${box.h}, "${box.text.slice(0, 40)}"` : "missing",
      );
    }
  };

  // DEFAULT — the only state a no-JS, no-CSS-override reader lands on. It must already carry the
  // whole claim: every mark the beat drew on screen, and no option's partial-view note showing.
  const initial = await state();
  check(
    initial.checked === filter.all,
    `${tag}: the default state is the unfiltered option`,
    `checked: ${initial.checked}, unfiltered option: ${filter.all}`,
  );
  const hiddenAtRest = filter.options
    .filter((option) => !option.isAll)
    .map((option) => initial.marks.hidden[option.slug])
    .reduce((a, b) => a + b, 0);
  const drawnAtRest = filter.options
    .filter((option) => !option.isAll)
    .map((option) => initial.marks.shown[option.slug])
    .reduce((a, b) => a + b, 0);
  check(
    drawnAtRest > 0 && hiddenAtRest === 0,
    `${tag}: the default view hides nothing — the full claim is on screen`,
    `${drawnAtRest} filterable element(s) drawn, ${hiddenAtRest} hidden`,
  );
  check(
    Object.values(initial.notes).every((shown) => shown === false),
    `${tag}: no partial-view note is showing before a reader chooses one`,
    `${Object.keys(initial.notes).length} note(s), ${Object.values(initial.notes).filter(Boolean).length} visible`,
  );
  argumentIntact(initial, "default");

  const optionBox = async (id) => {
    const r = await page.evaluate((sel) => {
      const input = document.querySelector(sel);
      const label = input.closest("label") ?? input;
      const b = label.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: Math.round(b.width), h: Math.round(b.height) };
    }, `#${id}`);
    // Rounded before it ever reaches page.mouse — see `probe`'s own comment for the fractional
    // coordinate that silently does nothing.
    return { ...r, ...probe(r.x, r.y) };
  };

  for (const option of filter.options) {
    if (option.isAll) continue;
    const box = await optionBox(option.id);
    // WCAG 2.2 SC 2.5.8 (minimum target size, 24x24 CSS px). Measured, because a treatment that
    // makes the LABEL the target and hides the native dot would silently be a worse target than the
    // plain radio it replaced.
    check(
      box.w >= 24 && box.h >= 24,
      `${tag}: the "${option.id}" control is a 24px+ target`,
      `${box.w}x${box.h}`,
    );
    await page.mouse.click(box.x, box.y);
    // SETTLED, not a fixed 200ms. An element the previous option had at `display: none` never ran
    // its entrance; brought back by this click it runs it NOW, and `animation-fill-mode: backwards`
    // holds it at `opacity: 0` through a delay this format's contract runs out to 1760ms. Measured
    // on the seed: four elements read as hidden 200ms after the click and as fully drawn once the
    // page stopped moving. What this check is about is the picture a reader ends up with.
    await settled(page);
    const after = await state();
    check(
      after.checked === option.id,
      `${tag}: a real click at (${box.x}, ${box.y}) selects ${option.id}`,
      `checked: ${after.checked}`,
    );
    // THE PICTURE REALLY CHANGED, both ways round: what this option keeps is on screen, and what
    // every OTHER option owns alone is gone. A filter that only ever adds is not a filter.
    check(
      after.marks.shown[option.slug] > 0 && after.marks.hidden[option.slug] === 0,
      `${tag}: ${option.id} keeps every element it declared`,
      `${after.marks.shown[option.slug]} drawn, ${after.marks.hidden[option.slug]} hidden`,
    );
    const elsewhere = filter.options
      .filter((other) => !other.isAll && other.slug !== option.slug)
      .map((other) => after.marks.shown[other.slug])
      .reduce((a, b) => a + b, 0);
    check(
      elsewhere === 0,
      `${tag}: ${option.id} takes the other options' elements off the picture`,
      `${elsewhere} element(s) from another option still drawn`,
    );
    // AND THE READER IS TOLD THIS IS A PARTIAL VIEW. `filter.ts` derives one sentence per option
    // for exactly this reason: a filtered view no longer states the whole claim the title makes.
    check(
      after.notes[option.slug] === true,
      `${tag}: ${option.id} shows its own partial-view note`,
      `note for "${option.slug}": ${after.notes[option.slug] === undefined ? "none declared" : after.notes[option.slug]}`,
    );
    argumentIntact(after, option.id);
  }

  // Back to the unfiltered view, by a real click, and everything must come back.
  const allBox = await optionBox(filter.all);
  await page.mouse.click(allBox.x, allBox.y);
  await settled(page);
  const restored = await state();
  const restoredHidden = filter.options
    .filter((option) => !option.isAll)
    .map((option) => restored.marks.hidden[option.slug])
    .reduce((a, b) => a + b, 0);
  check(
    restored.checked === filter.all && restoredHidden === 0,
    `${tag}: clicking back to the unfiltered option restores every element`,
    `checked ${restored.checked}, ${restoredHidden} element(s) still hidden`,
  );
}

/** ITEM: EVERY CONTROL THIS BEAT SHIPS, whatever it is — not only the filter this skill happens to
 *  build.
 *
 *  THE DEFECT THAT EARNED THIS. The real Ember beat ships a real, keyboard-operable control: a
 *  search box that moves focus to a named country. It is correctly not a filter — it hides nothing,
 *  narrows nothing, and the default frame already states everything the title claims — so it
 *  declares no `props.filter`, and `checkControlAffordance` skipped ENTIRELY:
 *
 *      skip laptop-wide: the filter control's own affordance — this beat ships no filter, so there
 *           is no control to reach or ring
 *
 *  Nothing checked that search box's Tab reach, its focus ring, its target size or its name. The
 *  format's verification assumed the only control a beat can have is the one the format itself
 *  builds — a population TYPED as `fieldset.chart-filter` rather than DERIVED from the page. A
 *  toggle, a selector or a scrubber was verified as if the beat had no control at all.
 *
 *  So the population is read off the page: everything focusable inside the figure that is not one
 *  of the graphic's own marks. Two exclusions, each with its reason. A `[data-detail]` element is a
 *  MARK — `reachable-by-keyboard` already drives all of them and a beat draws hundreds, so counting
 *  them here would bury the one control under 211 readings. The accessible table's own scroll
 *  container is the table's affordance, owned by `same-facts-without-the-picture`, and it operates
 *  no part of the graphic.
 *
 *  What is asked of each one is what a control OWES a reader who has no pointer: a name, a target
 *  big enough to hit, a real `Tab` that reaches it, and a focus indicator that changes actual
 *  pixels. The focused frame is taken DURING the Tab sweep, at the moment the keyboard lands on the
 *  control, because `element.focus()` does not match `:focus-visible` on every element type and a
 *  ring written for keyboard focus would read as missing. */
async function checkControls(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await settled(page);

  const controls = await page.evaluate(() => {
    const figure = document.querySelector(".chart-figure") ?? document.body;
    const focusable =
      "a[href], button, input, select, textarea, summary, [tabindex]";
    const out = [];
    for (const el of figure.querySelectorAll(focusable)) {
      if (el.hasAttribute("data-detail")) continue;
      if (el.closest(".chart-accessible-table")) continue;
      if (el.getAttribute("tabindex") === "-1") continue;
      const style = getComputedStyle(el);
      const own = el.getBoundingClientRect();
      // WHICH BOX IS THE TARGET, and getting this wrong invents a failure on a sound beat — it did,
      // on the first run of this check: the real Ember beat's search box was reported 90x15 and
      // ringless because the box measured was its `<label for>`, the words "Find a country" beside
      // it, which is the control's NAME and not the thing a reader aims at or a ring is drawn on.
      //   · a control the treatment HIDES behind its own label — this format's segmented pill, where
      //     the native radio is `opacity: 0` — is aimed at through that label, so the label is the
      //     target;
      //   · a WRAPPING label contains the control, so its box is the control's own box or larger,
      //     and it is clickable: it is the target whenever there is one;
      //   · otherwise the control's own box is the target, and a `label[for]` sitting elsewhere on
      //     the page names it without being it.
      const associated = el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
        : null;
      const wrapping = el.closest("label");
      const painted =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        own.width > 0 &&
        own.height > 0;
      const target = wrapping ?? (painted ? el : (associated ?? el));
      const box = target.getBoundingClientRect();
      // A NAME IS WHAT A READER IS TOLD THE CONTROL IS FOR, and a placeholder is not one: it is
      // painted inside the field and disappears the moment the reader types. `aria-label`, an
      // `aria-labelledby` target, a `<label>`, or the control's own text — nothing else.
      const labelled = el.getAttribute("aria-labelledby");
      const name = (
        el.getAttribute("aria-label") ||
        (labelled ? (document.getElementById(labelled)?.textContent ?? "") : "") ||
        (el.closest("label") ?? associated)?.textContent ||
        el.textContent ||
        el.getAttribute("title") ||
        ""
      ).trim();
      out.push({
        key: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("type") ? `[${el.getAttribute("type")}]` : ""}`,
        // A RADIO GROUP IS ONE TAB STOP, and that is the browser's own behaviour, not a laxity:
        // Tab enters the group at its checked member and the arrow keys move within it (which
        // `checkControlAffordance` drives separately). Demanding that Tab land on every radio
        // reported this format's OWN seed as having two unreachable controls — the checker wrong
        // about a sound beat, which is the failure mode that costs the most trust here.
        stop: el.type === "radio" && el.name ? `radio:${el.name}` : null,
        name,
        w: Math.round(box.width),
        h: Math.round(box.height),
        painted,
        clip: {
          x: Math.max(0, box.left - 6),
          y: Math.max(0, box.top - 6),
          width: Math.min(box.width + 12, window.innerWidth),
          height: Math.min(box.height + 12, window.innerHeight),
        },
      });
    }
    return out;
  });

  if (controls.length === 0) {
    skip(
      `${vp.label}: every control this beat ships`,
      "this beat ships no control at all — no focusable element in the figure other than its own marks",
    );
    return;
  }

  // ONE Tab sweep, long enough to pass every focusable thing on the page: a beat draws hundreds of
  // marks and they are in the tab order before or after the controls, so a sweep sized to the
  // controls alone would report a control nobody can reach when the truth is that the sweep was
  // too short.
  const focusables = await page.evaluate(
    () =>
      (document.querySelector(".chart-figure") ?? document.body).querySelectorAll(
        "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])",
      ).length,
  );
  await page.mouse.move(2, 2); // park the pointer so :hover cannot confound a focus frame
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });
  const focusedShot = new Map();
  for (let press = 0; press < focusables + 5 && focusedShot.size < controls.length; press++) {
    await page.keyboard.press("Tab");
    const at = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.hasAttribute("data-detail")) return null;
      if (el.closest(".chart-accessible-table")) return null;
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("type") ? `[${el.getAttribute("type")}]` : ""}`;
    });
    const landed = at ? controls.find((one) => one.key === at) : null;
    if (!landed) continue;
    const control = controls.find(
      (one) => (landed.stop ? one.stop === landed.stop : one.key === landed.key) && !focusedShot.has(one.key),
    );
    if (!control) continue;
    const shot = await page.screenshot({ clip: control.clip, encoding: "binary" });
    // Every member of a group the keyboard has entered is reached; the frame is the one taken where
    // the focus actually is, which is the member the group hands focus to.
    for (const member of controls)
      if (landed.stop ? member.stop === landed.stop : member.key === control.key)
        focusedShot.set(member.key, member.key === landed.key ? shot : null);
  }
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
  });
  await sleep(80);

  for (const control of controls) {
    const named = `${control.key}${control.name ? ` "${control.name.slice(0, 40)}"` : ""}`;
    check(
      control.name.length > 0,
      `${vp.label}: the ${control.key} control carries its own name`,
      control.name ? `named "${control.name.slice(0, 60)}"` : "no aria-label, no label, no text — a placeholder is not a name",
    );
    // WCAG 2.2 SC 2.5.8, the same 24x24 the filter pill is measured against, asked of whatever this
    // beat's control turned out to be.
    check(
      control.w >= 24 && control.h >= 24,
      `${vp.label}: ${named} is a 24px+ target`,
      `${control.w}x${control.h}`,
    );
    const shot = focusedShot.get(control.key);
    check(
      focusedShot.has(control.key),
      `${vp.label}: Tab alone reaches ${named}`,
      focusedShot.has(control.key)
        ? control.stop
          ? `the keyboard entered its group (${control.stop})`
          : "the keyboard landed on it"
        : `${focusables + 5} presses from the top of the figure never landed on it`,
    );
    // A group member the keyboard did not itself land on has no focused frame of its own; the ring
    // is measured on the member focus actually went to, and on every standalone control.
    if (!shot) continue;
    const rest = await page.screenshot({ clip: control.clip, encoding: "binary" });
    const differs = (() => {
      if (shot.length !== rest.length) return true;
      for (let i = 0; i < shot.length; i++) if (shot[i] !== rest[i]) return true;
      return false;
    })();
    check(
      differs,
      `${vp.label}: keyboard focus on ${named} changes what is on screen`,
      `focused frame ${shot.length}B vs unfocused ${rest.length}B over a ${Math.round(control.clip.width)}x${Math.round(control.clip.height)} clip — ${differs ? "different" : "IDENTICAL, so nothing is drawn for focus"}`,
    );
  }
}

/** ITEM: the filter controls must read as a considered treatment AND stay a keyboard-operable
 *  radio group. Everything here is measured off the live page: what Tab reaches, what the focus
 *  ring computes to, and what the checked pill's own contrast is. */
async function checkControlAffordance(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await settled(page);

  const present = await page.evaluate(
    () => !!document.querySelector("fieldset.chart-filter"),
  );
  if (!present) {
    skip(
      `${vp.label}: the filter control's own affordance`,
      "this beat ships no filter, so there is no control to reach or ring",
    );
    return;
  }

  const structure = await page.evaluate(() => {
    const fs = document.querySelector("fieldset.chart-filter");
    const inputs = Array.prototype.slice.call(fs.querySelectorAll("input[type=radio]"));
    return {
      isFieldset: !!fs,
      hasLegend: !!(fs && fs.querySelector("legend")),
      legendText: fs && fs.querySelector("legend") ? fs.querySelector("legend").textContent.trim() : null,
      radios: inputs.length,
      allNativeRadios: inputs.every((i) => i.tagName === "INPUT" && i.type === "radio"),
      // A hidden-from-the-tree control is the classic way a "designed" filter stops being a
      // control at all. Neither is allowed here, so both are measured.
      removedFromTree: inputs.filter((i) => {
        const cs = getComputedStyle(i);
        return cs.display === "none" || cs.visibility === "hidden";
      }).length,
      labelledBy: inputs.map((i) => (i.closest("label") ? i.closest("label").textContent.trim() : null)),
    };
  });
  check(structure.isFieldset && structure.hasLegend, `control: still a <fieldset> with a <legend>`, `legend "${structure.legendText}"`);
  // AT LEAST TWO, not exactly three. `filter.ts` derives the option list from the beat's own
  // declaration and refuses fewer than two ("a beat that does not need a filter declares none"); a
  // beat with four bands is as legitimate as one with three, and the hard 3 here was the seed's
  // own option count read as the format's contract.
  check(structure.radios >= 2 && structure.allNativeRadios, `control: still native radios, at least two`, `${structure.radios} found`);
  check(structure.removedFromTree === 0, `control: no radio is display:none / visibility:hidden`, `${structure.removedFromTree} removed`);
  check(
    structure.labelledBy.every((t) => t && t.length > 0),
    `control: every radio carries its own visible label text`,
    structure.labelledBy.join(" | "),
  );

  // Keyboard reach, by real key presses from the top of the document — not `.focus()`.
  await page.evaluate(() => {
    document.body.focus();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  });
  let reached = null;
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => {
      const a = document.activeElement;
      return a && a.closest("fieldset.chart-filter") && a.type === "radio" ? a.id : null;
    });
  }
  check(!!reached, `control: Tab alone reaches the radio group`, `focus landed on ${reached}`);

  if (reached) {
    // THE FOCUS RING, MEASURED IN PIXELS RATHER THAN IN COMPUTED STYLE — and the reason is a
    // defect this check itself had. The first version of it accepted an outline on EITHER the
    // pill or the `<input>`, and passed against a deliberately broken copy with the pill's ring
    // deleted: the input still reported the user agent's own `outline: auto 1px`, which paints
    // absolutely nothing, because the segmented treatment makes that input `opacity: 0`. A
    // computed style is a claim about the box; only the rendered frame is a claim about what a
    // reader can see. So: screenshot the control with nothing focused, screenshot it again with
    // the keyboard on it, and require the two frames to DIFFER. A focus indicator that changes no
    // pixel is not an indicator, whatever the cascade says about it.
    const clip = await page.evaluate(() => {
      const r = document.querySelector(".chart-filter").getBoundingClientRect();
      return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: r.width + 12, height: r.height + 12 };
    });
    await page.mouse.move(2, 2); // park the pointer off the control so :hover cannot confound this
    const focusedShot = await page.screenshot({ clip, encoding: "binary" });
    await page.evaluate(() => document.activeElement.blur());
    await sleep(80);
    const restShot = await page.screenshot({ clip, encoding: "binary" });
    // Byte comparison written out rather than `Buffer.equals`: `page.screenshot` hands back a
    // plain `Uint8Array` here, and calling a Buffer method on it throws — which is how this very
    // check was first caught only comparing LENGTHS.
    const differs = (() => {
      if (focusedShot.length !== restShot.length) return true;
      for (let i = 0; i < focusedShot.length; i++)
        if (focusedShot[i] !== restShot[i]) return true;
      return false;
    })();
    check(
      differs,
      `control: keyboard focus changes what is on screen`,
      `focused frame ${focusedShot.length}B vs unfocused ${restShot.length}B over a ${Math.round(clip.width)}x${Math.round(clip.height)} clip — ${differs ? "different" : "IDENTICAL, so nothing is drawn for focus"}`,
    );

    // ...and the cause, named, so a failure above says WHERE to look. Only an indicator the
    // reader can actually see counts: an outline on a fully transparent input does not.
    await page.evaluate(() =>
      document.querySelector("fieldset.chart-filter input[type=radio]").focus(),
    );
    const ring = await page.evaluate(() => {
      const input = document.querySelector("fieldset.chart-filter input[type=radio]");
      const label = input.closest("label");
      const paints = (el) => {
        let o = 1;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
        const r = el.getBoundingClientRect();
        return o > 0.05 && r.width > 0 && r.height > 0;
      };
      const ind = (el) => {
        const cs = getComputedStyle(el);
        return {
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          boxShadow: cs.boxShadow,
          hasOutline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
          hasShadow: cs.boxShadow !== "none",
          paints: paints(el),
        };
      };
      return { label: ind(label), input: ind(input) };
    });
    const visible =
      (ring.label.paints && (ring.label.hasOutline || ring.label.hasShadow)) ||
      (ring.input.paints && (ring.input.hasOutline || ring.input.hasShadow));
    check(
      visible,
      `control: the focus indicator is on something that actually paints`,
      `pill outline "${ring.label.outline}" (paints: ${ring.label.paints}), input outline "${ring.input.outline}" (paints: ${ring.input.paints})`,
    );

    // Arrow keys move the selection — the behaviour a reader expects from a radio group, and the
    // one a hand-rolled widget usually loses.
    const before = await page.evaluate(
      () => document.querySelector("fieldset.chart-filter input[type=radio]:checked").id,
    );
    await page.keyboard.press("ArrowRight");
    await sleep(120);
    const after = await page.evaluate(
      () => document.querySelector("fieldset.chart-filter input[type=radio]:checked").id,
    );
    check(after !== before, `control: ArrowRight moves the selection`, `${before} → ${after}`);
  }

  // The checked pill's own legibility. The treatment inverts to ink-on-ground; whatever ground a
  // newsroom brings, the pair must still clear WCAG 1.4.3 for body text.
  const contrast = await page.evaluate(() => {
    const input = document.querySelector("fieldset.chart-filter input[type=radio]:checked");
    const label = input.closest("label");
    const cs = getComputedStyle(label);
    return { fg: cs.color, bg: cs.backgroundColor };
  });
  const ratio = contrastRatio(contrast.fg, contrast.bg);
  const opaque = !/rgba\([^)]*,\s*0\s*\)/.test(contrast.bg);
  check(
    !opaque || ratio >= 4.5,
    `control: the checked pill's own text clears 4.5:1`,
    `${contrast.fg} on ${contrast.bg} = ${ratio.toFixed(2)}:1`,
  );
}

// ===== the run =====

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const wantShots = argv.includes("--shots");
const outDir = resolve(flag("--out", "/tmp/web-twin-verify"));

let filePath = flag("--file", null);
if (!filePath) {
  const { outPath } = await render({
    dataPath: join(HERE, "../assets/sample-data/rainfall.json"),
    outDir,
  });
  filePath = outPath;
  console.log(`rendered the seed → ${filePath}`);
}
filePath = resolve(filePath);
if (!existsSync(filePath)) throw new Error(`no such beat: ${filePath}`);

// THE DIRECTORY THE PAGE SITS IN, which is what a beat's own record is read from. Four of this
// skill's decisions take a beat directory and walk UP it for the story that froze the data; handed
// the page's own directory they answer about this beat, and handed a page outside any story they
// say so in their own `reason` rather than failing. Passed as the page's directory, never as a
// separate argument, so there is no second place for a caller to get it wrong.
const beatDir = beatDirOf(filePath);

/** The BEAT directory a delivered page belongs to, not merely the directory the file sits in.
 *
 *  The two are the same under `proof/`, where a runner writes its page beside itself, and they are
 *  NOT the same in a story: `splash`'s own layout puts the editable render in
 *  `stories/<story>/beats/<beat>/renders/<page>.html`, one level down. Handed `renders/`,
 *  `creditTracesToRecord` and `doubleHyphenInDeliveredText` look for deliveries named after
 *  `renders` and find none — measured on the real Ember beat, which HAD been delivered and came
 *  back "nothing has been delivered from this beat". So the nearest ancestor that is a direct child
 *  of a `beats/` directory wins, and the file's own directory is the fallback. */
function beatDirOf(page) {
  let dir = dirname(resolve(page));
  for (let up = 0; up < 6; up++) {
    if (basename(dirname(dir)) === "beats") return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dirname(resolve(page));
}

/** The story language recorded at Gate 2, read the same way `storyboardGateStatus` reads the
 *  takeaway: the nearest `STORYBOARD.md` above the beat, and one field out of its front matter.
 *  `null` when there is no storyboard above this page — a seed render, a scratch file — and the
 *  language check then says so instead of comparing against an empty string, which `<html lang>`
 *  could never equal and which would read as a defect in the page.
 *
 *  A LOCAL READER, and the limit is named: `skills/storyboard` owns the format and nothing in a
 *  skill may import out of another one, so this reads the one scalar it needs rather than
 *  reaching for that parser. A storyboard that stops writing `language:` in front matter makes
 *  this `null` and the check skip aloud — never silently pass. */
function recordedLanguage(startDir) {
  let dir = resolve(startDir);
  for (let up = 0; up < 6; up++) {
    const path = join(dir, "STORYBOARD.md");
    if (existsSync(path)) {
      const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(path, "utf8"));
      const found = front ? /^language:[ \t]*([^\n]+)$/m.exec(front[1]) : null;
      // Front matter is free to quote a scalar, and this compares against `<html lang>` — measured
      // on two story beats whose storyboards write `language: "en"`, where the unstripped value
      // failed a page that says exactly `en`.
      return found ? found[1].trim().replace(/^["']|["']$/g, "") : null;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Every declared decision this run actually asked, collected as it asks them and handed to
 *  `decisionsNotAsked` at the end. A LIST BUILT BY THE ASKING, never a list typed beside it: a
 *  name appended here without the call above it is the one mistake this whole section exists to
 *  make impossible, and it would show up as a decision reported "asked" with no measurement
 *  printed for it. */
const asked = [];

// ===== CARGO — what the shipped file CONTAINS, before anything is driven =====
//
// The decisions this format reaches that need no browser, run on the artifact itself rather than on
// the page a browser renders from it: making them wait behind a browser would only make them
// skippable. Two live in `verify-guards.mjs`; the accessible table
// (`same-facts-without-the-picture`, `doctrine/references/guard-catalogue.json`) lives in
// `detect-accessible-table.mjs` because it is a capability rather than a guard, and this is where
// its declared `GUARDS` name is actually run against the file `render` just wrote.
//
// `weightAgainstCeiling` and `rtlRunsAreIsolated` JOINED THIS SECTION in the round that found the
// command driving two of its own eighteen declarations. The weight one is a `statSync` and was
// never anywhere but a test. The right-to-left one had a worse problem than being unwired: it walks
// a beat directory for `.svg` FILES, and this format writes none — its geometry is an INLINE `<svg>`
// in one HTML page — so on every chart-web beat it answered `{"applies":false,"reason":"this beat
// drew no .svg"}`, a sentence that is false about a page that is mostly SVG and that a producer
// reading it would take as a clean bill. The decision is not touched (it is byte-identical across
// seven skills, `splash/test/guard-copies-parity.test.ts`); what it is HANDED is: the SVG this page
// actually draws, written out with the extension it walks for.
{
  const html = readFileSync(filePath, "utf8");
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  const twice = duplicatedPayload(html);
  asked.push("duplicatedPayload");
  const measuring = revealDashInScreenSpace(marksFromSource(html, basename(filePath)));
  asked.push("revealDashInScreenSpace");
  const table = tableCarriesTheMarks(html);
  asked.push("tableCarriesTheMarks");
  console.log(`\nCARGO — what the file carries`);
  for (const found of twice)
    console.log(
      `  FAIL  ${found.copies} copies of one ${mb(found.bytes)} MB asset inlined, ${mb(found.wastedBytes)} MB wasted`,
    );
  for (const id of measuring)
    console.log(`  FAIL  ${id} reveals with a dash that measures its own path under a non-scaling stroke`);
  for (const value of table.missing)
    console.log(`  FAIL  the accessible table is missing a mark's own fact: ${value}`);
  if (!twice.length && !measuring.length && !table.missing.length)
    console.log(
      `  ok    every asset inlined once; every dash drawn in the path's own units; the table carries all ${table.marks} marks`,
    );
  else process.exitCode = 1;

  const bytes = statSync(filePath).size;
  const weight = weightAgainstCeiling(bytes, CEILING_BYTES);
  asked.push("weightAgainstCeiling");
  check(
    !weight.over,
    `weight-has-a-ceiling: the delivered file against this format's own ceiling`,
    `${weight.bytes} B against a ${weight.ceiling} B ceiling`,
  );

  const svgs = inlineSvgOf(html);
  const drawnSvg = mkdtempSync(join(tmpdir(), "chart-web-rtl-"));
  svgs.forEach((svg, at) => writeFileSync(join(drawnSvg, `inline-${at}.svg`), svg));
  const rtl = rtlRunsAreIsolated(drawnSvg);
  asked.push("rtlRunsAreIsolated");
  if (!rtl.applies)
    skip(
      `rtl-runs-carry-their-direction`,
      `${rtl.reason} — read over the ${svgs.length} inline <svg> block(s) this page draws, written out as files for it`,
    );
  else {
    for (const hit of rtl.hits) console.log(`  FAIL  ${hit}`);
    check(
      rtl.clean,
      `rtl-runs-carry-their-direction: every right-to-left run carries its own direction`,
      `${rtl.rtlRuns} right-to-left run(s) in ${svgs.length} inline <svg> block(s)`,
    );
  }
  // THE HALF THIS RULE DOES NOT JUDGE, said out loud rather than left to be assumed away. Its
  // subject is resvg's paragraph level inside an SVG; every WORD this format draws is an HTML
  // element over the geometry, and nothing above looked at one. A page whose prose is Arabic or
  // Hebrew is not cleared by the line above, and a producer has to know which half was read.
  const htmlRtlLetters = (
    html
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .match(/[֐-׿؀-ۿ܀-ݏހ-޿ࡠ-ࣿיִ-﷿ﹰ-﻿]/g) ?? []
  ).length;
  skip(
    `rtl-runs-carry-their-direction, outside the SVG`,
    `this rule's subject is a run inside an SVG; the ${htmlRtlLetters} right-to-left letter(s) this page draws in HTML over the geometry are laid out by the reader's browser and were not read by it`,
  );

  const language = recordedLanguage(beatDir);
  // ASKED EITHER WAY. A question this run PUT to the beat and could not answer because the beat has
  // no storyboard above it is not the same thing as a declaration nothing wires, and the summary
  // must not print them as the same thing: the skip line below already says which it is.
  asked.push("pageLanguageMatchesStory");
  if (language === null)
    skip(
      `page-declares-story-language`,
      "no STORYBOARD.md above this page records a language, so there is nothing to declare it against",
    );
  else {
    check(
      pageLanguageMatchesStory(html, language),
      `page-declares-story-language: <html lang> is the language the storyboard recorded`,
      `storyboard says "${language}", page says "${/<html[^>]*\slang="([^"]*)"/i.exec(html)?.[1] ?? "nothing"}"`,
    );
  }
}

// ===== BEAT RECORD — the four decisions that read the beat's own directory =====
//
// Every one of these takes a beat directory and walks up it. None of them needed a browser and none
// of them was ever called by anything a producer runs: `check-guard-wiring.mjs` recorded all four as
// debt. Handed the page's own directory they answer about THIS beat; handed a page with no story
// above it they return `{applies:false}` with their own reason, which is printed rather than
// swallowed — a run that could not ask a question must not look like a run that asked and liked the
// answer.
{
  console.log(`\nBEAT RECORD — what the directory around this page says`);
  const report = (decision, rule, verdict, ok, detail) => {
    asked.push(decision);
    if (verdict.applies === false) skip(rule, verdict.reason);
    else check(ok, rule, detail);
  };

  const gate = storyboardGateStatus(beatDir);
  asked.push("storyboardGateStatus");
  if (!gate.found)
    skip("storyboard-gate-is-visible", "no STORYBOARD.md above this page");
  else
    check(
      gate.closed,
      `storyboard-gate-is-visible: Gate 2 is closed above this beat`,
      `takeaway ${gate.closed ? "recorded" : "MISSING"} in ${gate.path ?? "STORYBOARD.md"}`,
    );

  const denominator = denominatorReadingStated(beatDir);
  report(
    "denominatorReadingStated",
    "denominator-reading-is-stated",
    denominator,
    denominator.stated !== false,
    JSON.stringify(denominator),
  );

  const credit = creditTracesToRecord(beatDir);
  report(
    "creditTracesToRecord",
    "credit-traces-to-the-record",
    credit,
    (credit.unattested ?? []).length === 0,
    (credit.unattested ?? []).join(" | ") || "every delivery states a credit the frozen record carries",
  );

  const hyphens = doubleHyphenInDeliveredText(beatDir);
  report(
    "doubleHyphenInDeliveredText",
    "double-hyphen-reaches-a-reader",
    hyphens,
    (hyphens.hits ?? []).length === 0,
    (hyphens.hits ?? []).join(" | ") || "no delivered text reaches a reader with a double hyphen in it",
  );
}
if (wantShots) await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome() });
try {
  console.log(`\nFIT — the whole beat inside the visible window`);
  {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    for (const vp of VIEWPORTS) {
      await checkFit(page, vp);
      if (wantShots) {
        const shot = join(outDir, `fit-${vp.w}x${vp.h}.png`);
        await page.screenshot({ path: shot });
      }
    }
    await page.close();
  }

  console.log(`\nHOVER — real pointer events at real coordinates`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkHover(page, vp);
    if (wantShots) {
      // A screenshot WITH the pointer parked on a reading, so the tooltip is in the frame a human
      // looks at rather than only in an assertion.
      // A mark from the middle of whatever this beat draws — `[data-detail]`, not `.pt`, for the
      // same reason the probes use it. This block indexed `.pt[5]` and crashed the whole run on
      // every beat that draws bins, bars or rows instead of points.
      const r = await page.evaluate(() => {
        const marks = document.querySelectorAll("[data-detail]");
        if (marks.length === 0) return null;
        const b = marks[Math.floor(marks.length / 2)].getBoundingClientRect();
        return {
          x: Math.round(b.left + b.width / 2),
          y: Math.round(b.top + b.height / 2),
        };
      });
      if (r) {
        await page.mouse.move(r.x, r.y);
        await sleep(80);
      }
      await page.screenshot({ path: join(outDir, `hover-${vp.w}x${vp.h}.png`) });
    }
    await page.close();
  }

  console.log(`\nFILTER — real clicks, with scripting on`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkFilter(page, vp);
    if (wantShots) {
      // Only when the beat HAS a filter — the same conditionality the checks themselves use. This
      // line assumed `#period-late` and crashed the run on every filterless beat, which is all
      // fifteen shipped ones.
      const filtered = await page.evaluate(() => {
        const last = document.querySelector(
          "fieldset.chart-filter input[type=radio]:last-of-type",
        );
        if (!last) return false;
        last.click();
        return true;
      });
      if (filtered) {
        await sleep(200);
        await page.screenshot({
          path: join(outDir, `filter-${vp.w}x${vp.h}.png`),
        });
      }
    }
    await page.close();
  }

  console.log(`\nFILTER — real clicks, with JavaScript DISABLED`);
  {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    // `page.evaluate` still works with scripting off (it runs in the automation world), so the
    // measurements below are honest: the PAGE's own inline script never ran.
    const ranAnyway = await page.evaluate(() => !!document.querySelector(".pt-active"));
    check(!ranAnyway, `no JS: the page's own script really did not run`);
    await checkFilter(page, POINTER_VIEWPORTS[0], { scripting: false });
    if (wantShots) await page.screenshot({ path: join(outDir, `nojs-filter.png`) });
    await page.close();
  }

  console.log(`\nCONTROL — every control this beat ships, and the filter's own radio-group contract`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkControls(page, vp);
    await checkControlAffordance(page, vp);
    if (wantShots) {
      // One Tab from a blurred document lands on the group's own checked radio — so this frame is
      // the focus ring as a keyboard reader sees it, not a frame taken after focus moved on.
      await page.evaluate(() => {
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      });
      await page.keyboard.press("Tab");
      await sleep(80);
      const box = await page.evaluate(() => {
        const el = document.querySelector(".chart-filter");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.max(0, r.left - 8),
          y: Math.max(0, r.top - 8),
          width: r.width + 16,
          height: r.height + 16,
        };
      });
      // No filter, no control to photograph — the last of the `.chart-filter` assumptions that
      // crashed this script on the fifteen beats that ship without one.
      if (box)
        await page.screenshot({
          path: join(outDir, `control-focus-${vp.w}.png`),
          clip: box,
        });
    }
    await page.close();
  }

  // ===== CAPABILITIES — what this format PROMISES a reader, driven against this page =====
  //
  // Three of them need a live browser, which is why they sat in `test/` for two rounds: that
  // directory walks the skill's own beats under `proof/`, so a beat in `stories/` — every beat a
  // journalist will ever make — was outside the walk and none of the three ever ran against one.
  // Measured on the real Ember story: this command printed 63 green checks having asked neither
  // whether a keyboard reaches a single one of the page's 211 marks, nor whether any of them
  // survives with scripting off, nor whether the build stops for a reader who asked for less
  // motion. Here they are asked of the file this run was given, whatever directory it lives in.
  console.log(`\nCAPABILITIES — what this format promises a reader, on this page`);
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 1 });
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    const reach = await keyboardReachesEveryMark(page);
    asked.push("keyboardReachesEveryMark");
    check(
      reach.marks > 0 && reach.focusable === reach.marks && reach.detailShown === reach.marks,
      `reachable-by-keyboard: Tab alone reaches every mark, and every one names itself`,
      `${reach.focusable}/${reach.marks} reached by Tab, ${reach.detailShown}/${reach.marks} carrying an accessible name`,
    );
    await page.close();
  }
  {
    // Its own page: `staticFrameSurvives` turns scripting off and reloads in place, so a page it
    // has finished with is no longer the page the other checks measured.
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 1 });
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    const survives = await staticFrameSurvives(page);
    asked.push("staticFrameSurvives");
    check(
      survives.marksWithJs > 0 && survives.marksWithout === survives.marksWithJs,
      `degrades-without-javascript: the marks are there with the script gone`,
      `${survives.marksWithJs} marks with scripting on, ${survives.marksWithout} with it off`,
    );
    await page.close();
  }
  {
    // BOTH CONDITIONS, because one of them alone proves nothing. A page that never animates
    // reports zero moved frames under `reduce` and would read as a page correctly holding still;
    // the `no-preference` reading is what says whether there was any motion to suppress. When
    // both are zero this beat has no build, and that is reported as a skip rather than a pass —
    // the difference between "the promise was kept" and "the promise was never tested".
    const moved = {};
    for (const value of ["no-preference", "reduce"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value }]);
      await page.goto(`file://${filePath}`, { waitUntil: "load" });
      moved[value] = await motionUnderReduce(page);
      await page.close();
    }
    asked.push("motionUnderReduce");
    if (moved["no-preference"].movedFrames === 0)
      skip(
        `honours-reduced-motion`,
        `this beat animates nothing to suppress — 0 of ${moved["no-preference"].totalFrames} sampled frames moved under no-preference, so the reduce reading below (0) confirms nothing`,
      );
    else
      check(
        moved.reduce.movedFrames === 0,
        `honours-reduced-motion: nothing interpolates for a reader who asked for less motion`,
        `${moved["no-preference"].movedFrames}/${moved["no-preference"].totalFrames} frames moved under no-preference, ${moved.reduce.movedFrames}/${moved.reduce.totalFrames} under reduce`,
      );
  }
  {
    // THE LABELS THIS FORMAT ACTUALLY PAINTS, handed to a decision written for a rasterised still.
    // `labelStacksFrom` reads SVG `<text>`; this format draws every word as HTML over the geometry,
    // so on every chart-web beat it read zero labels and `mislabelledRows` could not fire — a
    // requirement that cannot fire, which reads as coverage and is worse than a missing one.
    // `painted-labels.mjs` measures the laid-out page and writes what it paints in the notation the
    // decision reads; nothing about the decision changes. The two are composed HERE in the one
    // order that type-checks — `labelStacksFrom` returns `{stacks, links}` and `mislabelledRows`
    // takes them apart — because handing it the object throws `stacks.map is not a function` from
    // inside this skill, which is what a story beat's own runner did.
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 1 });
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    const painted = await readPaintedGeometry(page);
    await page.close();
    const { stacks, links } = labelStacksFrom(paintedLabelSvg(painted));
    const crossings = mislabelledRows(stacks, links);
    asked.push("mislabelledRows");
    for (const crossing of crossings) console.log(`  FAIL  ${crossing}`);
    if (stacks.length === 0)
      skip(
        `labels-name-their-own-row`,
        `no de-collided label stack on this page — ${painted.labels.length} painted label(s) and ${painted.lines.length} drawn line(s), none of them a leader running from a label to the mark it names, and this rule recognises a moved label only by its leader`,
      );
    else
      check(
        crossings.length === 0,
        `labels-name-their-own-row: every de-collided label names its own row`,
        `${stacks.length} stack(s), ${links.length} joining mark(s), ${crossings.length} crossing(s)`,
      );
  }
} finally {
  await browser.close();
}

// ===== WHAT THIS RUN DID NOT ASK =====
//
// Derived from the `GUARDS` arrays this skill ships, never typed beside them: a decision added to
// this skill and wired to nothing is reported here by name on the next run, and
// `test/verify-coverage.test.ts` goes red. A name with no recorded reason is a failure rather than
// a line of prose, because "not asked" with no argument attached is the false confirmation this
// section exists to end.
{
  const notAsked = decisionsNotAsked(HERE_SKILL, asked);
  console.log(`\nNOT ASKED — declarations this run could not put to one delivered page`);
  for (const { name, reason } of notAsked) {
    if (reason) console.log(`  n/a   ${name} — ${reason}`);
    else
      failures.push(
        `${name} is declared by this skill, this command did not ask it, and no reason is recorded in verify-coverage.mjs. Wire it into this run, or record why one delivered page cannot answer it.`,
      );
  }
  const distinct = new Set(asked).size;
  console.log(
    `  ${distinct} of ${distinct + notAsked.length} declared decisions asked of this page`,
  );
}

console.log(
  `\n${passes} checks passed, ${failures.length} failed, ${skips.length} skipped`,
);
if (skips.length) {
  console.log(`\nskipped (each one a check this beat's own shape does not have):`);
  for (const s of skips) console.log(`  - ${s}`);
}
if (failures.length) {
  console.log(`\nfailures:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
if (wantShots) console.log(`screenshots → ${outDir}`);
