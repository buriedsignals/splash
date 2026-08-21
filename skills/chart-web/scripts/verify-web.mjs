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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { render } from "./render-web.mjs";
import {
  duplicatedPayload,
  marksFromSource,
  revealDashInScreenSpace,
} from "./verify-guards.mjs";
import { tableCarriesTheMarks } from "./detect-accessible-table.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

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
  await sleep(60);

  // MOST BEATS SHIP NO FILTER, AND THAT IS THE CORRECT OUTCOME OF THIS SKILL'S OWN THREE-PART
  // TEST (`SKILL.md`, "When to use" — "most beats should not have one"). Measured across the
  // thirteen shipped web beats: none of them carries a filter. So a hard assumption that
  // `#period-late` exists made this whole script unusable on them, which is the wrong way round —
  // the format's own doctrine says the filter is the exception. Absent, the filter checks are
  // skipped ALOUD; present but malformed, they still fail.
  const filter = await page.evaluate(() => {
    const fs = document.querySelector("fieldset.chart-filter");
    if (!fs) return null;
    const radios = Array.prototype.map.call(
      fs.querySelectorAll("input[type=radio]"),
      (i) => i.id,
    );
    return { radios };
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
    filter.radios.length >= 2,
    `${tag}: the filter is a real radio group`,
    `radios: ${filter.radios.join(", ") || "none"}`,
  );
  if (filter.radios.length < 2) return;

  const state = () =>
    page.evaluate(() => {
      const opacities = (sel) =>
        Array.prototype.map.call(document.querySelectorAll(sel), (el) =>
          Number(getComputedStyle(el).opacity),
        );
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
      const byPeriod = (period) => ({
        seg: opacities(`.seg[data-period="${period}"]`),
        pt: opacities(`.pt[data-period="${period}"]`),
      });
      return {
        checked: (document.querySelector("input[name=period]:checked") ?? {}).id ?? null,
        early: byPeriod("early"),
        late: byPeriod("late"),
        furniture: {
          title: seen(".chart-title"),
          caveat: seen(".chart-caveat"),
          source: seen(".chart-source"),
          reference: seen(".note.reference-label"),
          peak: seen(".note.peak-label"),
          end: seen(".end-label"),
        },
      };
    });

  const argumentIntact = (s, where) => {
    for (const [name, f] of Object.entries(s.furniture)) {
      check(
        f !== null && f.opacity === 1 && f.display !== "none" && f.visibility !== "hidden" && f.w > 0 && f.h > 0,
        `${tag}: ${where} — the ${name} is still fully drawn`,
        f ? `opacity ${f.opacity}, ${f.w}x${f.h}, "${f.text.slice(0, 40)}"` : "missing",
      );
    }
  };

  // DEFAULT — the only state a no-JS, no-CSS-override reader lands on. It must already carry the
  // whole claim: every segment and every point at full opacity, nothing dimmed.
  const initial = await state();
  check(initial.checked === "period-all", `${tag}: default state is "All years"`, `checked: ${initial.checked}`);
  const allFull = [...initial.early.seg, ...initial.late.seg, ...initial.early.pt, ...initial.late.pt];
  check(
    allFull.length > 0 && allFull.every((o) => o === 1),
    `${tag}: the default view dims nothing — the full claim is on screen`,
    `${allFull.length} marks, opacities ${[...new Set(allFull)].join("/")}`,
  );
  argumentIntact(initial, "default");

  const pillBox = async (id) => {
    const r = await page.evaluate((sel) => {
      const input = document.querySelector(sel);
      const label = input.closest("label");
      const b = label.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: Math.round(b.width), h: Math.round(b.height) };
    }, `#${id}`);
    // Rounded before it ever reaches page.mouse — see `probe`'s own comment for the fractional
    // coordinate that silently does nothing.
    return { ...r, ...probe(r.x, r.y) };
  };

  for (const [id, dimmed, kept] of [
    ["period-early", "late", "early"],
    ["period-late", "early", "late"],
  ]) {
    const box = await pillBox(id);
    // WCAG 2.2 SC 2.5.8 (minimum target size, 24x24 CSS px). Measured, because the pill treatment
    // makes the LABEL the target and hides the native dot — a shrunken pill would silently be a
    // worse target than the plain radio it replaced.
    check(
      box.w >= 24 && box.h >= 24,
      `${tag}: the "${id}" control is a 24px+ target`,
      `${box.w}x${box.h}`,
    );
    await page.mouse.click(box.x, box.y);
    await sleep(200); // past the 120ms opacity transition
    const after = await state();
    check(after.checked === id, `${tag}: a real click at (${Math.round(box.x)}, ${Math.round(box.y)}) selects ${id}`, `checked: ${after.checked}`);
    const dim = [...after[dimmed].seg, ...after[dimmed].pt];
    const full = [...after[kept].seg, ...after[kept].pt];
    check(
      dim.length > 0 && dim.every((o) => o > 0 && o < 0.5),
      `${tag}: ${id} dims the ${dimmed} marks — the picture really changed`,
      `${dim.length} marks at ${[...new Set(dim)].join("/")}`,
    );
    check(
      full.length > 0 && full.every((o) => o === 1),
      `${tag}: ${id} leaves the ${kept} marks untouched`,
      `${full.length} marks at ${[...new Set(full)].join("/")}`,
    );
    argumentIntact(after, id);
  }

  // Back to the default, by a real click, and the dimming must lift again.
  const allBox = await pillBox("period-all");
  await page.mouse.click(allBox.x, allBox.y);
  await sleep(200);
  const restored = await state();
  const restoredAll = [...restored.early.seg, ...restored.late.seg, ...restored.early.pt, ...restored.late.pt];
  check(
    restored.checked === "period-all" && restoredAll.every((o) => o === 1),
    `${tag}: clicking back to "All years" restores every mark`,
    `${restoredAll.length} marks at ${[...new Set(restoredAll)].join("/")}`,
  );
}

/** ITEM: the filter controls must read as a considered treatment AND stay a keyboard-operable
 *  radio group. Everything here is measured off the live page: what Tab reaches, what the focus
 *  ring computes to, and what the checked pill's own contrast is. */
async function checkControlAffordance(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await sleep(60);

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
    const inputs = Array.prototype.slice.call(document.querySelectorAll("input[name=period]"));
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
  check(structure.radios === 3 && structure.allNativeRadios, `control: still three native radios`, `${structure.radios} found`);
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
      return a && a.name === "period" ? a.id : null;
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
    await page.evaluate(() => document.querySelector("#period-all").focus());
    const ring = await page.evaluate(() => {
      const input = document.querySelector("#period-all");
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
    const before = await page.evaluate(() => document.querySelector("input[name=period]:checked").id);
    await page.keyboard.press("ArrowRight");
    await sleep(120);
    const after = await page.evaluate(() => document.querySelector("input[name=period]:checked").id);
    check(after !== before, `control: ArrowRight moves the selection`, `${before} → ${after}`);
  }

  // The checked pill's own legibility. The treatment inverts to ink-on-ground; whatever ground a
  // newsroom brings, the pair must still clear WCAG 1.4.3 for body text.
  const contrast = await page.evaluate(() => {
    const input = document.querySelector("input[name=period]:checked");
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

// ===== CARGO — what the shipped file CONTAINS, before anything is driven =====
//
// Three decisions this format reaches, run on the artifact itself rather than on the page a browser
// renders from it: they need no browser, so making them wait behind one would only make them
// skippable. Two live in `verify-guards.mjs`; the third, the accessible table
// (`same-facts-without-the-picture`, `doctrine/references/guard-catalogue.json`), lives in
// `detect-accessible-table.mjs` because it is a capability rather than a guard, and this is where
// its declared `GUARDS` name is actually run against the file `render` just wrote.
{
  const html = readFileSync(filePath, "utf8");
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  const twice = duplicatedPayload(html);
  const measuring = revealDashInScreenSpace(marksFromSource(html, basename(filePath)));
  const table = tableCarriesTheMarks(html);
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

  console.log(`\nCONTROL — the filter is still a keyboard-operable radio group`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
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
} finally {
  await browser.close();
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
