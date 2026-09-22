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

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { render } from "./render-web.mjs";
import { probeRevealedText, probeTypefaces } from "./typefaces.mjs";

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

/** WCAG relative luminance / contrast, on the colour strings `getComputedStyle` actually returns.
 *  Duplicated here rather than reached for across a skill boundary, same rule as everything else in
 *  this file.
 *
 *  TWO SPELLINGS, NOT ONE, AND THE SECOND IS THE ONE THAT MATTERS HERE. This used to strip every
 *  non-digit and split on commas, which reads `rgb(0, 0, 0)` correctly and reads
 *  `color(srgb 0.799843 0.845882 0.88502)` as NaN — and the chosen pill's background IS that second
 *  spelling, because `control-chrome.ts` paints it with `color-mix(in srgb, …)` and Chrome serialises
 *  a computed `color-mix` in the `color()` function. The contrast check therefore reported `NaN:1`
 *  on every beat with a control the moment it stopped being skipped, i.e. it had never once measured
 *  the thing it was written to measure. */
function parseColour(css) {
  const text = String(css).trim();
  const srgb = text.match(/^color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
  if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];
  const nums = text.match(/[\d.eE+-]+/g);
  if (!nums || nums.length < 3) return null;
  return nums.slice(0, 3).map((n) => Number(n) / 255);
}

function contrastRatio(a, b) {
  const lum = (css) => {
    const parsed = parseColour(css);
    if (!parsed || parsed.some((c) => !Number.isFinite(c))) return null;
    const [r, g, b2] = parsed.map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = [la, lb].sort((x, y) => y - x);
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
  const all = await page.evaluate(() => {
    const plot = document.querySelector(".chart-plot")?.getBoundingClientRect();
    return Array.prototype.map
      .call(document.querySelectorAll("[data-detail]"), (p) => {
        const r = p.getBoundingClientRect();
        return {
          name: p.getAttribute("data-year") ?? p.getAttribute("data-detail"),
          detail: p.getAttribute("data-detail"),
          isPoint: p.classList.contains("pt"),
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
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
      const el = document.elementFromPoint(p.x, p.y);
      if (!el) return { kind: "nothing" };
      const mark = el.closest("[data-detail]");
      if (mark) return { kind: "mark", detail: mark.getAttribute("data-detail") };
      if (el.closest(".hit-area") || el.classList.contains("hit-area"))
        return { kind: "hit-area" };
      return { kind: "other", what: `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}` };
    }, at);
    if (under.kind === "mark")
      return { details: [under.detail], why: "the mark under the pointer" };
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

  /**
   * AND THE ANSWER LANDS ON THE MARK IT NAMES — the rule nothing measured until now.
   *
   * `interaction.mjs` anchors the box on the mark rather than on the pointer, and the reason is
   * written there twice: the box for India sat over the United States, and on the grouped bar it
   * floated at whatever height the hand happened to be. Both defects were found by a human looking
   * at a page, both were fixed, and neither left a check behind — so the third instance was found
   * the same way, on a ranking whose hit points are parked in the right margin so the pointer can
   * be resolved by row. The answer rose in the margin, a screen away from the bar it named.
   *
   * Measured as OVERLAP, not as a distance: the box and the mark it names must share some column of
   * pixels. A tooltip clamped at the viewport edge, a mark wider than the box, a box wider than the
   * mark — all of those still overlap, and a box that names something on the other side of the page
   * does not.
   */
  let onItsMark = 0;
  let onItsMarkExpected = 0;
  for (const r of readings) {
    const own = probe(r.cx, r.cy);
    const want = await expectedAt(own);
    if (!want) continue;
    await page.mouse.move(own.x, own.y);
    await sleep(25);
    const placed = await page.evaluate(() => {
      const t = document.getElementById("tooltip");
      if (t.hidden) return null;
      const active =
        document.querySelector(".mark-active") ?? document.querySelector(".pt-active");
      if (!active) return null;
      const box = t.getBoundingClientRect();
      const mark = active.getBoundingClientRect();
      return {
        overlaps: box.right > mark.left && box.left < mark.right,
        box: [Math.round(box.left), Math.round(box.right)],
        mark: [Math.round(mark.left), Math.round(mark.right)],
      };
    });
    if (placed === null) continue;
    onItsMarkExpected += 1;
    if (placed.overlaps) onItsMark += 1;
    else
      failures.push(
        `${vp.label}: the answer for ${r.name} was drawn at x ${placed.box[0]}–${placed.box[1]} ` +
          `and the mark it names stands at ${placed.mark[0]}–${placed.mark[1]} — they do not ` +
          `overlap, so the box names something the reader is not looking at`,
      );
  }
  if (onItsMarkExpected > 0)
    check(
      onItsMark === onItsMarkExpected,
      `${vp.label}: the answer is drawn over the mark it names`,
      `${onItsMark}/${onItsMarkExpected}`,
    );
  else
    skip(
      `${vp.label}: where the answer is drawn`,
      "no mark reports itself active on hover, so there is nothing to measure it against",
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

/**
 * ITEM: the yardstick's own words, proven by a REAL click on each option.
 *
 * `verify-web.mjs` excludes `[data-level-rule]` from the default view, on the ground that those
 * words belong to an option nobody has chosen. This is the other half of that bargain: choose each
 * option in turn, at the pill's own centre so the click is hit-tested like a reader's, and require
 * that the words that option owns become drawn — and that no other option's do.
 */
async function checkLevel(page, tag) {
  const options = await page.evaluate(() => {
    const fs = document.querySelector("fieldset.chart-level");
    if (!fs) return null;
    return Array.prototype.map
      .call(fs.querySelectorAll("input[type=radio]"), (i) => i.id)
      .filter((id) => !id.endsWith("-none"));
  });
  if (!options) return;
  if (options.length === 0) {
    check(false, `${tag}: the yardstick offers an option to choose`, "none found");
    return;
  }
  for (const id of options) {
    const slug = id.replace(/^(?:chart|mw)-level-/, "");
    const box = await page.evaluate((radioId) => {
      const input = document.getElementById(radioId);
      const r = (input.closest("label") ?? input).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, id);
    await page.mouse.click(box.x, box.y);
    // WAIT FOR THE REVEAL TO SETTLE, AND DO NOT GUESS AT IT. `levelCss` fades a chosen option's
    // references in over the beat's own `revealMs` (220 ms in the corpus), so a fixed 80 ms sleep
    // read them MID-FADE — computed `opacity: 0.65` is not 1, and this check read it as "the words
    // were never drawn". It went green anyway on the only committed beat that had ever reached it,
    // because that beat's one revealed element carries `data-axis` too and its opacity never
    // transitions; the first beat to reveal an element that does fade found the hole
    // (`proof/web-donut-world-co2-share`). Settle on the animations the page itself reports.
    await page
      .evaluate(() =>
        Promise.all(
          document.getAnimations().map((a) => a.finished.catch(() => undefined)),
        ),
      )
      .catch(() => undefined);
    await sleep(80);
    const seen = await page.evaluate((chosen) => {
      const drawn = (el) => {
        const cs = getComputedStyle(el);
        return Number(cs.opacity) === 1 && cs.display !== "none" && cs.visibility !== "hidden";
      };
      const out = { mine: 0, mineDrawn: 0, others: 0, othersDrawn: 0, note: null };
      for (const el of document.querySelectorAll(".chart-plot .overlay [data-level-rule]")) {
        const mine = el.getAttribute("data-level-rule").split(":")[0] === chosen;
        if (mine) {
          out.mine += 1;
          if (drawn(el)) out.mineDrawn += 1;
        } else {
          out.others += 1;
          if (drawn(el)) out.othersDrawn += 1;
        }
      }
      const note = document.querySelector(`[data-level-note="${chosen}"]`);
      out.note = note && drawn(note) ? note.textContent.trim() : null;
      return out;
    }, slug);
    check(
      seen.mine > 0 && seen.mineDrawn === seen.mine && seen.othersDrawn === 0,
      `${tag}: choosing "${slug}" draws its own words on the plot and nobody else's`,
      `${seen.mineDrawn}/${seen.mine} of its own drawn, ${seen.othersDrawn} of ${seen.others} belonging to other options`,
    );
    check(
      Boolean(seen.note),
      `${tag}: choosing "${slug}" reveals the sentence the control owes the reader`,
      seen.note ? `"${seen.note.slice(0, 70)}…"` : "no sentence drawn",
    );
  }
}

/** ITEM: the view a reader LANDS ON already carries the whole claim.
 *
 *  True of every beat, whether or not it declares a control, so it is measured for every beat. It
 *  used to live inside the filter branch and therefore only ran on a beat that had no filter.
 */
async function checkDefaultView(page, tag) {
  // LET THE ENTRANCE LAND FIRST. A beat may animate its labels in (`assets/entrance.ts`), and this
  // check used to read the page 60 ms after the viewport changed — mid-fade, where the seed's own
  // reference, peak and end labels all compute to `opacity: 0`. It never showed, because on a beat
  // WITH a control this branch was never reached at all; the moment the control stopped being
  // skipped, the format's own seed reported three argument-bearing words as undrawn. The claim here
  // is about the picture a reader ends up looking at, not about a frame 60 ms into it; whether the
  // entrance is itself an ADDITION rather than a prerequisite is `scripts/verify-entrance.mjs`'s
  // question, not this one's.
  await freezeMotion(page);
  await page
    .evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    )
    .catch(() => undefined);
  await sleep(60);
  const rest = await page.evaluate(() => {
    const marks = Array.prototype.map.call(
      document.querySelectorAll("[data-detail], .seg, .pt"),
      (el) => Number(getComputedStyle(el).opacity),
    );
    const words = Array.prototype.map
      .call(
        document.querySelectorAll(
          // `:not([data-stack-total])` — a word whose visibility is OWNED BY A DECLARED CONTROL
          // is not part of the default view, and this check is about the default view. The
          // stack's sentences (`.stack-notes p`) have always been in exactly that position and
          // were never scanned only because they sit outside `.overlay`; a tower's total has to
          // sit ON the plot, at the top of the tower it measures, so it lands inside it. What
          // must stay true — that the reader lands on the whole claim with nothing dimmed — is
          // unchanged: the seven totals belong to seven options nobody has chosen.
          // `:not([data-fits-its-mark])` is the second exclusion and it is a DIFFERENT
          // ownership from the first. A stack total is hidden by a control nobody has touched;
          // one of these is a figure printed INSIDE its own mark, which its mark is sometimes
          // too small to hold — and that is not a decision a build can make, because the plot's
          // height in CSS pixels is not a function of its width (`.chart-figure` caps at
          // `100dvh`). `proof/webx-electricity-mix` asks a size container per band and measures
          // the answer in the reader's own pixels: of its eighteen bands, twelve are thick
          // enough for a line of the value register at 1280 wide and eleven at 375. A beat that made the
          // same call at build time would be right at one size and wrong at every other, which
          // is exactly what it used to do. Every one of those bands still answers its column's
          // hover, tap and Tab with the share to two decimals.
          //
          // THE HOLE THIS OPENS IS MEASURED RATHER THAN TRUSTED: a beat that marked every word
          // and drew none of them would slip past an exclusion alone, so the marked words get a
          // check of their own below.
          //
          // `:not([data-level-rule])` is the SAME ownership as the stack total's, one
          // vocabulary over. A yardstick's own reference and the name it writes at that
          // reference belong to an option nobody has chosen yet; they are drawn once, at their
          // own coordinate, and revealed by `:checked` (`assets/level.ts`). Counting them as
          // part of the default view would mean a beat could only ship a yardstick by drawing
          // every option's answer at once, which is the picture the control exists to avoid.
          // The hole it opens is held to something below, by clicking: the words a level owns
          // must actually become drawn when their own option is chosen.
          ".chart-title, .chart-caveat, .chart-source," +
            " .chart-plot .overlay *:not([data-stack-total]):not([data-fits-its-mark]):not([data-level-rule])",
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
    const fitted = Array.prototype.map
      .call(
        document.querySelectorAll(".chart-plot .overlay [data-fits-its-mark]"),
        (el) => {
          const cs = getComputedStyle(el);
          return {
            text: el.textContent.trim().slice(0, 30),
            drawn:
              Number(cs.opacity) === 1 &&
              cs.display !== "none" &&
              cs.visibility !== "hidden",
          };
        },
      )
      .filter((w) => w.text.length > 0);
    return { marks, words, fitted };
  });
  check(
    rest.marks.length > 0 && rest.marks.every((o) => o === 1),
    `${tag}: the default view dims nothing — the full claim is on screen`,
    `${rest.marks.length} marks, opacities ${[...new Set(rest.marks)].join("/")}`,
  );
  // The exclusion above, held to something. A figure printed inside its own mark is allowed to
  // go when the mark cannot hold it; a page on which they have ALL gone is a page that prints no
  // figures at all, and the exclusion would have made that invisible.
  if (rest.fitted.length)
    check(
      rest.fitted.some((w) => w.drawn),
      `${tag}: the figures printed inside their own marks are not all suppressed at once`,
      `${rest.fitted.filter((w) => w.drawn).length} of ${rest.fitted.length} drawn at this size`,
    );
  check(
    rest.words.length > 0 && rest.words.every((w) => w.opacity === 1 && !w.hidden),
    `${tag}: every argument-bearing word is drawn unconditionally`,
    `${rest.words.length} words checked`,
  );
  // THE EXCLUSION ABOVE, HELD TO SOMETHING, and held by CLICKING rather than by reading the
  // markup. A yardstick is radios plus generated CSS and nothing else, so this works with the
  // script disabled exactly as it works with it on — which is the whole claim `level.ts` makes
  // and the one a reader without JavaScript is owed. A beat that tagged every word
  // `data-level-rule` and wired no option to reveal it would slip past the exclusion alone.
  await checkLevel(page, tag);
}

// ===== the control surface =====
//
// THE SELECTOR CONTRACT, AND WHY IT IS THE ONE IT IS.
//
// Everything below this line used to be keyed on `fieldset.chart-filter` and on the ids
// `#period-all` / `#period-early` / `#period-late`, which belonged to a seed that has not existed
// for a long time. Two consequences, both measured rather than argued:
//
//   1. **The seed's own verification crashed.** `bun scripts/verify-web.mjs` with no `--file`
//      renders this skill's seed, whose control is `name="chart-filter"`, and the old checks read
//      `input[name=period]:checked` — `null.closest` mid-run, after six failures that were the
//      checker's own staleness rather than the page's.
//   2. **Every shipped beat took the skip branch, and the runner still exited 0.** Measured the day
//      this was rewritten, across the 58 committed web beats: 44 ship a control and NOT ONE of them
//      is a `chart-filter` with `period-*` ids. `proof/web-heatmap-coal-share-europe` reported
//      `99 passed, 0 failed, 5 skipped` with its entire cutoff control unverified;
//      `proof/web-calendar-heatmap-geneva` shipped the same way. A dead control shipped green.
//
// So the contract is taken from the ONE place a control is actually drawn — `assets/control-chrome.ts`,
// `controlChromeCss({ scope, name })` — rather than from a list of vocabulary names this file would
// have to be edited to extend:
//
//     <fieldset class="chart-NAME">
//       <legend>…the beat's own words…</legend>
//       <div class="options">
//         <label><input type="radio" name="…" id="…" [checked] [value]>…words…</label>
//         …
//       </div>
//     </fieldset>
//     <div class="NAME-notes" role="status"> <p data-SOMETHING-note="KEY">…</p> … </div>
//
// **A control is any `<fieldset>` on the page.** That is the whole discovery rule, and it is
// deliberately not "any of these 25 known stems": a beat may write its own vocabulary (measured:
// `proof/web-flow-map-danube` ships `chart-measure`, which exists in no assets directory), and a
// verifier that enumerated stems would have gone quiet on exactly the beat nobody else checked.
//
// THREE THINGS ARE READ OFF THE PAGE RATHER THAN DERIVED FROM THE STEM, because all three were
// measured to differ from it on committed beats:
//
//   - the radio group's `name` — `chart-restore` ships `name="chart-stack"`, `chart-measure` ships
//     `name="mw-stack"`, and six other beats ship a third spelling;
//   - the option's key — usually the `value` attribute, but `proof/web-sankey-electricity-sources`
//     ships radios with no `value` at all, so the key falls back to the id with the group's own
//     common prefix removed;
//   - the notes' attribute — `.restore-notes` holds `data-stack-note`, `.carry-notes` holds
//     `data-level-note`. Only the CONTAINER's class follows the stem, and that is what is matched.
//
// NOTHING HERE SKIPS. A beat with no fieldset has no control surface, which is a fact about the beat
// and is reported as a passing measurement; a beat WITH one gets every check below, and a fieldset
// that does not answer them goes red. The one skip that remains anywhere near a control is gone:
// "I do not know how to check this" was the defect.

/** How far apart two frames of the same rectangle really are, in DECODED PIXELS.
 *
 *  WHY NOT BYTE EQUALITY, WHICH IS WHAT THIS FILE USED TO DO. Two screenshots of an IDLE page, taken
 *  150 ms apart with no input, no animation and no keyframe rule anywhere in the document, are not
 *  byte-identical: measured on `proof/web-heatmap-coal-share-europe`, three consecutive frames of
 *  the same 1552x473 plot came back 38661, 38660 and 38661 bytes. Chrome's rasteriser jitters a
 *  handful of anti-aliased text edges between composites. A byte comparison therefore answers
 *  "did anything at all happen, including nothing" — it would call an idle page changed, and there
 *  is no threshold to loosen because a PNG byte count is not a picture. So both frames are DECODED
 *  on a canvas and compared per channel, and the caller is handed a pixel count it can weigh against
 *  that page's own measured jitter.
 *
 *  Decoded in a SEPARATE blank page, never in the page under test: drawing an `<img>` and a
 *  `<canvas>` into the document being verified would be the checker altering its own subject.
 *
 *  Duplicated rather than imported from `map-web`, which reached the same conclusion for the same
 *  reason — nothing in a skill may import out of it. */
const PIXEL_TOLERANCE = 6;

async function comparePixels(darkroom, a, b) {
  const url = (buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  return darkroom.evaluate(
    async (aUrl, bUrl, tolerance) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("frame failed to decode"));
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(aUrl), load(bUrl)]);
      if (ia.width !== ib.width || ia.height !== ib.height)
        return { sameSize: false, diffPixels: Infinity, totalPixels: 0 };
      const canvas = document.createElement("canvas");
      canvas.width = ia.width;
      canvas.height = ia.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(ia, 0, 0);
      const da = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(ib, 0, 0);
      const db = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let diffPixels = 0;
      for (let i = 0; i < da.length; i += 4)
        if (
          Math.abs(da[i] - db[i]) > tolerance ||
          Math.abs(da[i + 1] - db[i + 1]) > tolerance ||
          Math.abs(da[i + 2] - db[i + 2]) > tolerance
        )
          diffPixels += 1;
      return { sameSize: true, diffPixels, totalPixels: da.length / 4 };
    },
    url(a),
    url(b),
    PIXEL_TOLERANCE,
  );
}

/** THE DELIVERY PLACEHOLDER, ASSEMBLED RATHER THAN WRITTEN WHOLE — the same discipline
 *  `live-map.mjs` keeps, and for the same reason: nothing that carries this string may be
 *  substitutable by a key. */
const KEY_SENTINEL = "__MAPTILER" + "_KEY__";

/**
 * WHETHER THIS PAGE'S MARKS ARE A LIVE LAYER, AND WHETHER THAT LAYER IS UP.
 *
 * A map × web beat draws its marks as MapLibre layers over a provider's tiles, with the SSR'd
 * fallback underneath — and its control drives the layer, not an SVG. Three states, and telling
 * them apart is the whole point of this function:
 *
 *   - the page declares no live plan → an ordinary beat, nothing here applies;
 *   - it declares one whose style URL still carries the delivery placeholder → the layer CANNOT
 *     boot. `live-map.mjs` says so in writing: the committed artifact is always in this state, so a
 *     proof page does not spend a newsroom's tile quota. A frame comparison taken here measures the
 *     frozen fallback and nothing else;
 *   - it declares a keyed one → the layer boots asynchronously and the page states it itself, by
 *     putting `mw-live` on the root element inside `map.on("load")`.
 *
 * MEASURED, 2026-09-16, and this is why the function exists. Five committed map beats reported
 * `choosing "X" repaints the drawing — 0 of 828768 pixels differ`. On their keyed copies, driven in
 * a real browser with time for the layer to come up, every option moves 13 796 to 227 225 pixels.
 * The control was never dead; the verifier was reading a page whose marks had not been drawn yet.
 * An unknown reported as a defect is the same failure as an unknown reported as a pass.
 */
async function liveLayerState(page) {
  return page.evaluate((sentinel) => {
    const el = document.getElementById("mw-live-plan");
    if (!el) return { declares: false, keyed: null, up: false };
    let plan = null;
    try {
      plan = JSON.parse(el.textContent);
    } catch (err) {
      plan = null;
    }
    const url = plan && plan.styleUrl ? plan.styleUrl : "";
    return {
      declares: true,
      keyed: !!url && url.indexOf(sentinel) < 0,
      up: document.documentElement.classList.contains("mw-live"),
      layers: plan && plan.layers ? plan.layers.length : 0,
    };
  }, KEY_SENTINEL);
}

/** How long a keyed live layer is given to come up before its absence is reported as a measurement
 *  that could not be taken. Twelve seconds: the slowest of the five beats measured here reached
 *  `mw-live` at 6.1 s over a cold tile cache. */
const LIVE_LAYER_TIMEOUT_MS = 12000;
/** Once the layer is up its tiles keep arriving, so the rectangle is still moving. Two idle frames
 *  are taken until they agree to within this many pixels, or until the window closes — and whatever
 *  they still disagree about becomes the noise floor the existing jitter check reports. */
const LIVE_SETTLE_MS = 10000;

/**
 * WAIT FOR THE PAGE'S MARKS TO EXIST BEFORE MEASURING THEM, and say so when they never do.
 *
 * Returns the state the rest of the run has to reason with. It never makes anything green: a layer
 * that does not come up is reported, and a control that drives a layer which is not up is reported
 * in those words rather than as "this option changes nothing a reader can see".
 */
async function settleLiveLayer(page, darkroom, { scripting = true, tag = "" } = {}) {
  const first = await liveLayerState(page);
  if (!first.declares) return { ...first, required: false };

  if (!scripting) {
    // The honest statement of what a reader with scripting off is looking at: one frozen frame.
    // Not a pass — the control is still on the page and still does nothing for them.
    return { ...first, required: true, up: false, why: "scripting is off, so no live layer is ever mounted" };
  }
  if (!first.keyed)
    return {
      ...first,
      required: true,
      up: false,
      why: "this page's style URL still carries the delivery placeholder, so its live layer cannot boot",
    };

  const deadline = Date.now() + LIVE_LAYER_TIMEOUT_MS;
  let state = first;
  while (!state.up && Date.now() < deadline) {
    await sleep(200);
    state = await liveLayerState(page);
  }
  if (!state.up)
    return {
      ...state,
      required: true,
      why: `the page never put \`mw-live\` on its root element within ${LIVE_LAYER_TIMEOUT_MS} ms, so its ${state.layers} declared layers were never mounted`,
    };

  // The layer is up and its tiles are still arriving. Settle on the plot rather than on a timer.
  const clip = await page.evaluate(() => {
    const el = document.querySelector(".chart-plot");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.floor(r.left)),
      y: Math.max(0, Math.floor(r.top)),
      width: Math.ceil(r.width),
      height: Math.ceil(r.height),
    };
  });
  let settledAt = null;
  if (clip && clip.width > 0 && clip.height > 0) {
    const stop = Date.now() + LIVE_SETTLE_MS;
    while (Date.now() < stop) {
      const a = await page.screenshot({ clip, encoding: "binary" });
      await sleep(250);
      const b = await page.screenshot({ clip, encoding: "binary" });
      const { diffPixels, totalPixels } = await comparePixels(darkroom, a, b);
      if (diffPixels * 200 <= totalPixels) {
        settledAt = diffPixels;
        break;
      }
    }
  }
  return { ...state, required: true, settledAt };
}

/** A rectangle, its settled frame, and the jitter THAT rectangle actually shows on THIS page.
 *
 *  The floor is measured rather than chosen: two frames of the same idle rectangle, back to back,
 *  and whatever they disagree about is what this page's rasteriser does on its own. Anything a
 *  click has to beat is four times that, and never fewer than eight pixels — so a control that
 *  changes nothing cannot borrow the noise, and a page that is quiet gets a tight floor rather than
 *  a generous constant. It is also an anti-vacuity pin: a rectangle too noisy to compare says so. */
async function baselineOf(page, darkroom, clip) {
  const first = await page.screenshot({ clip, encoding: "binary" });
  await sleep(40);
  const second = await page.screenshot({ clip, encoding: "binary" });
  const jitter = await comparePixels(darkroom, first, second);
  return {
    clip,
    frame: second,
    noise: jitter.diffPixels,
    totalPixels: jitter.totalPixels,
    floor: Math.max(8, jitter.diffPixels * 4),
  };
}

/** Take every animation and transition on the page to its END STATE, instantly and deterministically.
 *
 *  Every assertion below compares two PNG frames of the same rectangle, so anything still moving
 *  when the shutter opens is a coin toss rather than a measurement: a chrome pill mid-fade, a
 *  vocabulary's own reveal mid-travel, a flow map's looping dash. Durations are collapsed rather
 *  than removed (`.001s`, one iteration) so a `forwards` animation still LANDS on the picture it was
 *  going to land on — what is frozen is the travel, never the destination. Injected from the
 *  automation world, so it holds with the page's own scripting disabled too. */
async function freezeMotion(page) {
  await page.evaluate(() => {
    if (document.getElementById("verify-freeze")) return;
    const style = document.createElement("style");
    style.id = "verify-freeze";
    style.textContent =
      "*, *::before, *::after { animation-duration: .001s !important;" +
      " animation-delay: 0s !important; animation-iteration-count: 1 !important;" +
      " transition-duration: .001s !important; transition-delay: 0s !important; }";
    document.head.appendChild(style);
  });
  await sleep(50);
}

/** Park the pointer off everything and take the keyboard off everything, then wait for the page to
 *  stop moving.
 *
 *  BOTH HALVES ARE LOAD-BEARING AND BOTH WERE ALMOST FORGOTTEN. `page.mouse.click` leaves the
 *  pointer ON the pill it just clicked, so `:hover { color: var(--ink) }` fires — and a frame taken
 *  there differs from the rest frame even with the whole chosen-state rule deleted, which is
 *  precisely a hollow guard. Clicking a radio also focuses it, so the focus outline would do the
 *  same job a second time. Neither may be allowed to stand in for the wash and the ring. */
async function quiesce(page) {
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
  });
  await page
    .evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    )
    .catch(() => undefined);
  await sleep(50);
}

/** Every control on the page, read off the page. See the contract note above for why each field is
 *  measured rather than derived from the class stem. */
async function discoverControls(page) {
  return page.evaluate(() => {
    const drawn = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        Number(cs.opacity) === 1 &&
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        r.width > 0 &&
        r.height > 0
      );
    };
    return Array.prototype.map.call(document.querySelectorAll("fieldset"), (fs, index) => {
      const stemClass = Array.prototype.find.call(fs.classList, (c) =>
        /^chart-[a-z][a-z0-9-]*$/.test(c),
      );
      const stem = stemClass ? stemClass.slice("chart-".length) : null;
      const radios = Array.prototype.slice.call(fs.querySelectorAll("input[type=radio]"));
      const inputs = Array.prototype.slice.call(fs.querySelectorAll("input, select, textarea, button"));
      const legend = fs.querySelector("legend");

      // The key: the `value` attribute where the beat wrote one, else the id with the group's own
      // longest shared id prefix removed (`chart-trace-nuclear` → `nuclear`), cut at a hyphen so a
      // key is never sliced through the middle of a word.
      const ids = radios.map((i) => i.id || "");
      let prefix = "";
      if (ids.length > 1 && ids.every(Boolean)) {
        let i = 0;
        while (i < ids[0].length && ids.every((id) => id[i] === ids[0][i])) i += 1;
        prefix = ids[0].slice(0, i).replace(/[^-]*$/, "");
      }

      const notesBox = stem ? document.querySelector(`.${stem}-notes`) : null;
      const notes = notesBox
        ? Array.prototype.map
            .call(notesBox.querySelectorAll("*"), (el) => {
              const attr = Array.prototype.find.call(el.attributes, (a) =>
                /^data-[a-z0-9-]+-note$/.test(a.name),
              );
              return attr ? { attr: attr.name, key: attr.value, drawn: drawn(el) } : null;
            })
            .filter(Boolean)
        : null;

      return {
        index,
        stem,
        className: fs.className,
        inFigure: !!fs.closest(".chart-figure"),
        legend: legend ? legend.textContent.trim() : null,
        names: Array.from(new Set(radios.map((i) => i.name))),
        radioCount: radios.length,
        // Anything in the fieldset that is NOT a native radio: the classic way a "designed" control
        // stops being one is a <button> or a <div role=radio> standing in for the real thing.
        foreignControls: inputs.length - radios.length,
        notesSelector: stem ? `.${stem}-notes` : null,
        notesPresent: !!notesBox,
        notesRole: notesBox ? notesBox.getAttribute("role") : null,
        notes,
        options: radios.map((i) => {
          const label = i.closest("label");
          const cs = getComputedStyle(i);
          return {
            id: i.id || null,
            key: i.getAttribute("value") || (i.id ? i.id.slice(prefix.length) : null),
            checked: i.checked,
            words: label ? label.textContent.trim() : null,
            ariaLabel: i.getAttribute("aria-label"),
            removedFromTree: cs.display === "none" || cs.visibility === "hidden",
          };
        }),
      };
    });
  });
}

/** Every class stem the page's own stylesheet draws control chrome for.
 *
 *  `controlChromeCss` emits exactly one signature nothing else on the page emits — `.chart-NAME
 *  .options` — so a stem found here with no `<fieldset>` under it is chrome for a control that was
 *  never drawn. That is not hypothetical: `assets/filter.ts` was written because 21 of 21 committed
 *  pages shipped `.chart-filter` CSS and not one of them contained the fieldset. Dead machinery in
 *  a delivered file, and nothing mechanical ever said so. */
async function checkNoDeadControlChrome(page, drawnStems) {
  const styled = await page.evaluate(() => {
    let css = "";
    for (const sheet of Array.prototype.slice.call(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // a cross-origin sheet: not ours, and not our chrome
      }
      for (const rule of Array.prototype.slice.call(rules)) css += `${rule.cssText}\n`;
    }
    const found = new Set();
    for (const m of css.matchAll(/\.chart-([a-z][a-z0-9-]*)\s+\.options\b/g)) found.add(m[1]);
    for (const m of css.matchAll(/fieldset\.chart-([a-z][a-z0-9-]*)\b/g)) found.add(m[1]);
    return Array.from(found).sort();
  });
  const orphans = styled.filter((stem) => !drawnStems.includes(stem));
  check(
    orphans.length === 0,
    `chrome: every control this page STYLES is a control this page DRAWS`,
    orphans.length
      ? `${orphans.map((s) => `.chart-${s}`).join(", ")} — chrome for a control with no <fieldset>: dead machinery in a delivered file`
      : `${styled.length} styled / ${drawnStems.length} drawn${styled.length ? ` (${styled.map((s) => `.chart-${s}`).join(", ")})` : ""}`,
  );
}

/**
 * ITEM: EVERY control this beat ships, driven by real clicks, and judged on what the page REPAINTS.
 *
 * Reading values back out of the DOM is what a hollow guard does: `:checked` moving proves the
 * browser still implements radios, not that the beat wired anything to it. So the three assertions
 * that matter here are all frame comparisons of the SAME rectangle, taken with the pointer parked
 * and the keyboard blurred so neither `:hover` nor the focus ring can stand in for the answer:
 *
 *   1. choosing an option REPAINTS THE PLOT — the check a dead control fails;
 *   2. choosing it does not MOVE the plot — the whole reason `control-chrome.ts` reserves a row for
 *      the sentence, and the thing that makes (1) an honest pixel comparison rather than a
 *      comparison of two different rectangles;
 *   3. the chosen pill is PAINTED chosen — the wash, the ring and the darkened words, measured as a
 *      frame rather than as a computed style, because a computed style is a claim about the box and
 *      only the rendered frame is a claim about what a reader can see.
 */
async function checkControlSurface(page, darkroom, vp, { scripting = true } = {}) {
  const tag = scripting ? vp.label : `${vp.label} (no JS)`;
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await freezeMotion(page);
  await quiesce(page);

  const controls = await discoverControls(page);
  await checkNoDeadControlChrome(
    page,
    controls.map((c) => c.stem).filter(Boolean),
  );

  // WHAT THIS BEAT'S MARKS ARE, BEFORE ANY FRAME IS COMPARED. On a map beat the marks are MapLibre
  // layers; until they are mounted, every rectangle on this page shows the frozen fallback and a
  // comparison over it measures the checker's own timing.
  const live = await settleLiveLayer(page, darkroom, { scripting, tag });
  if (live.declares)
    check(
      live.up,
      `${tag}: this beat's marks are a live layer, and the layer is up`,
      live.up
        ? `mw-live is set, ${live.layers} layers mounted` +
          (live.settledAt === null
            ? " — the plot was still moving when the settle window closed"
            : `, the plot settled to ${live.settledAt} moving pixels`)
        : live.why,
    );

  // A beat with no control is a fact about the beat, not a check the runner could not perform —
  // and `SKILL.md`'s own three-part test says most beats should not have one. Announced as a
  // measurement, so the summary can never show a run that verified nothing as a clean run.
  if (controls.length === 0) {
    check(true, `${tag}: this beat declares no control`, "no <fieldset> on the page");
    return;
  }

  for (const control of controls) {
    const who = `${tag}: ${control.className || `fieldset #${control.index}`}`;

    // ── structure ────────────────────────────────────────────────────────────────────────────────
    check(
      !!control.stem,
      `${who} names its vocabulary with a chart-<name> class`,
      control.className
        ? `class "${control.className}"`
        : "no class at all — nothing can find its notes, its chrome or its stem",
    );
    check(
      control.inFigure,
      `${who} sits inside the figure it operates`,
      control.inFigure ? "inside .chart-figure" : "outside .chart-figure",
    );
    check(
      !!control.legend && control.legend.length > 0,
      `${who} is a <fieldset> with a <legend> that says what it narrows on`,
      control.legend ? `"${control.legend}"` : "no legend — an unnamed control",
    );
    check(
      control.radioCount >= 2,
      `${who} offers a real choice`,
      `${control.radioCount} native radios`,
    );
    check(
      control.foreignControls === 0,
      `${who} is native radios and nothing else`,
      `${control.foreignControls} non-radio control(s) inside the fieldset`,
    );
    check(
      control.names.length === 1 && !!control.names[0],
      `${who} is ONE radio group`,
      `name(s): ${control.names.join(", ") || "none"}`,
    );
    check(
      control.options.every((o) => !o.removedFromTree),
      `${who}: no radio is display:none / visibility:hidden`,
      `${control.options.filter((o) => o.removedFromTree).length} removed from the tree`,
    );
    check(
      control.options.every((o) => (o.words && o.words.length > 0) || (o.ariaLabel && o.ariaLabel.length > 0)),
      `${who}: every option carries its own words`,
      control.options.map((o) => o.words || o.ariaLabel || "∅").join(" | ").slice(0, 120),
    );
    check(
      control.options.filter((o) => o.checked).length === 1,
      `${who}: exactly one option is chosen when the reader lands`,
      `${control.options.filter((o) => o.checked).length} checked`,
    );
    if (control.radioCount < 2 || control.names.length !== 1 || !control.names[0]) continue;
    const initial = control.options.find((o) => o.checked);
    if (!initial) continue;

    // ── the rectangles every frame below is compared over ────────────────────────────────────────
    const boxOf = async (selector) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.max(0, Math.floor(r.left)),
          y: Math.max(0, Math.floor(r.top)),
          width: Math.ceil(r.width),
          height: Math.ceil(r.height),
        };
      }, selector);

    const plotBox = await boxOf(".chart-plot");
    check(!!plotBox && plotBox.width > 0 && plotBox.height > 0, `${who}: the plot it operates has a box`, plotBox ? `${plotBox.width}x${plotBox.height}` : "no .chart-plot");
    if (!plotBox) continue;

    // ── THE RESERVED NOTE ROW, MEASURED RATHER THAN INFERRED ─────────────────────────────────────
    //
    // This is the cause behind `choosing "X" does not move the drawing`, and it is checked
    // separately because that check's own message — two rectangles — never names it. Measured on
    // the corpus the day this was written: the note row was reserved by a hand-authored
    // `min-height` (1.5em, one line) while the sentence wrapped to three or four at a narrow width,
    // so 34 of 58 committed beats lost up to 53px of plot the moment a reader chose an option.
    //
    // The row can only be as deep as a sentence it can SEE. A sentence hidden by its display is out
    // of the container's flow and contributes no height, so a row holding four sentences that way
    // is as deep as whichever one happens to be showing — which is the jump, not a reservation.
    // `control-chrome.ts` stacks every sentence in one grid cell for exactly this reason, and that
    // only reserves anything if the unchosen sentences stay in flow (`visibility: hidden`).
    const noteRowOf = async (selector) =>
      page.evaluate((sel) => {
        const box = document.querySelector(sel);
        if (!box) return null;
        const isNote = (el) =>
          Array.prototype.find.call(el.attributes, (a) => /^data-[a-z0-9-]+-note$/.test(a.name));
        const sentences = Array.prototype.filter
          .call(box.querySelectorAll("*"), isNote)
          .map((el) => {
            const cs = getComputedStyle(el);
            return {
              key: isNote(el).value,
              height: Math.round(el.getBoundingClientRect().height),
              inFlow: cs.display !== "none",
              text: el.textContent.trim().slice(0, 48),
            };
          });
        return { height: Math.round(box.getBoundingClientRect().height), sentences };
      }, selector);

    const noteRowAtLanding = control.notesSelector ? await noteRowOf(control.notesSelector) : null;
    if (noteRowAtLanding && noteRowAtLanding.sentences.length) {
      const outOfFlow = noteRowAtLanding.sentences.filter((n) => !n.inFlow);
      check(
        outOfFlow.length === 0,
        `${who}: every sentence the note row reserves for is IN FLOW where the row can measure it`,
        outOfFlow.length
          ? `${outOfFlow.length} of ${noteRowAtLanding.sentences.length} sentences are taken out of the row's flow by their display (${outOfFlow
              .map((n) => n.key)
              .slice(0, 4)
              .join(", ")}) — the row cannot reserve depth for a sentence it cannot see. Hide them with \`visibility: hidden\` and reveal one with \`visibility: visible\`, so control-chrome's grid cell can stack them and take the depth of the deepest.`
          : `${noteRowAtLanding.sentences.length} sentences, all measurable`,
      );
      const deepest = noteRowAtLanding.sentences.reduce(
        (worst, n) => (n.height > worst.height ? n : worst),
        noteRowAtLanding.sentences[0],
      );
      const total = noteRowAtLanding.sentences.reduce((sum, n) => sum + n.height, 0);
      // BOTH SIDES, because both are defects and only one of them is visible as a jump. Too shallow
      // and the sentence pushes the drawing; too deep and the row is charging the plot for space no
      // sentence occupies — which is what a stack of in-flow sentences that are NOT in one grid cell
      // costs: measured on web-heatmap-europe-electricity at 375px, 270px of row for a 90px
      // sentence. The slack is for the paragraphs' own margins, which a vocabulary may set.
      const SLACK = 12;
      const tooShallow = noteRowAtLanding.height + 1 < deepest.height;
      // Only meaningful once every sentence is in flow: a row whose sentences are all removed by
      // their display measures 0px each, and "deeper than its deepest sentence" would then be the
      // check above's finding said a second time in the wrong units.
      const tooDeep =
        outOfFlow.length === 0 && noteRowAtLanding.height > deepest.height + SLACK;
      check(
        !tooShallow && !tooDeep,
        `${who}: the note row is exactly as deep as its deepest sentence`,
        `${control.notesSelector} is ${noteRowAtLanding.height}px; its deepest of ${noteRowAtLanding.sentences.length} sentences needs ${deepest.height}px ("${deepest.text}")` +
          (tooShallow
            ? ` — the row is shallower than the sentence it has to hold, so the sentence pushes the drawing`
            : "") +
          (tooDeep
            ? ` — the row is charging the plot for ${noteRowAtLanding.height - deepest.height}px no sentence occupies. All ${noteRowAtLanding.sentences.length} together are ${total}px, which is what they cost when they are in flow but NOT in one grid cell: control-chrome.ts puts them in one (grid-area: 1 / 1) so the row is the deepest rather than the sum.`
            : ""),
      );
    }

    const pillBox = async (id) =>
      page.evaluate((radioId) => {
        const input = document.getElementById(radioId);
        if (!input) return null;
        const el = input.closest("label") ?? input;
        const r = el.getBoundingClientRect();
        return {
          clip: {
            x: Math.max(0, Math.floor(r.left) - 3),
            y: Math.max(0, Math.floor(r.top) - 3),
            width: Math.ceil(r.width) + 6,
            height: Math.ceil(r.height) + 6,
          },
          w: Math.round(r.width),
          h: Math.round(r.height),
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
        };
      }, id);

    const shot = (clip) => page.screenshot({ clip, encoding: "binary" });
    const apart = async (a, b) => (await comparePixels(darkroom, a, b)).diffPixels;

    // The clip is taken ONCE, from the state a reader lands on, and reused for every frame. Two
    // shots of two different rectangles differ trivially, which would make the whole comparison
    // decorative; (2) below is what keeps this rectangle honest.
    const plotClip = { ...plotBox };
    const plotBase = await baselineOf(page, darkroom, plotClip);
    const plotAtRest = plotBase.frame;
    check(
      plotBase.noise * 4 < plotBase.totalPixels * 0.01,
      `${who}: the drawing is still enough between two frames to compare at all`,
      `${plotBase.noise}/${plotBase.totalPixels} pixels differ between two idle frames of the same ${plotClip.width}x${plotClip.height} rectangle — a click must beat ${plotBase.floor}`,
    );

    // Rest frames for every option that is NOT chosen yet, taken now, before anything is clicked.
    const geometry = new Map();
    const restPill = new Map();
    for (const option of control.options) {
      if (!option.id) continue;
      const box = await pillBox(option.id);
      if (!box) continue;
      geometry.set(option.id, box);
      check(
        box.w >= 24 && box.h >= 24,
        `${who}: the "${option.key ?? option.id}" option is a 24px+ target (WCAG 2.2 SC 2.5.8)`,
        `${box.w}x${box.h}`,
      );
      if (!option.checked) restPill.set(option.id, await baselineOf(page, darkroom, box.clip));
    }
    const chosenPillAtStart = geometry.has(initial.id)
      ? await baselineOf(page, darkroom, geometry.get(initial.id).clip)
      : null;

    // R5 — EVERY VALUE OF THE PARAMETER PAINTS ITS OWN PICTURE.
    //
    // `assertEventStates` transposed. A video compares state(i) to state(i-1) across its whole
    // sequence; a page has no sequence, but it has the values of ONE parameter, and the comparison
    // is exactly as mechanical. Until now each option was compared to the LANDING VIEW only, so two
    // options producing the same drawing both passed — which is how a page can offer a reader three
    // choices and give them two answers.
    const framesByOption = new Map();

    // R6 — AND WHAT THE BEAT SAID WOULD NOT MOVE, DOES NOT.
    //
    // The clause every authored `earns` in the catalogue carries — « sur un terrain dont aucun carré
    // ne bouge », « sous une légende qui ne change pas », "the two ends of every band stay exactly
    // where they are" — and the one nothing had ever measured. DECLARED as selectors rather than
    // inferred from what happens to be stable: inferring it would report whatever is stable as if it
    // had been promised, which is the same weakness as asking only whether a reading is new.
    const heldSelectors = await page.evaluate(() => {
      const figure = document.querySelector(".chart-figure[data-held-still]");
      const raw = figure ? figure.getAttribute("data-held-still") : "";
      return raw ? raw.split("|").filter(Boolean) : [];
    });
    const heldAtRest = new Map();
    for (const selector of heldSelectors) {
      const box = await boxOf(selector);
      if (!box || box.width < 1 || box.height < 1) continue;
      const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
      heldAtRest.set(selector, { clip, frame: await shot(clip) });
    }
    const heldBroken = new Map();

    // ── each option, chosen for real ─────────────────────────────────────────────────────────────
    const notesDrawnSomewhere = new Set();
    for (const option of control.options) {
      if (option.checked || !option.id || !geometry.has(option.id)) continue;
      const at = probe(geometry.get(option.id).cx, geometry.get(option.id).cy);

      // The hit test BEFORE the click, so a control covered by something else names its cause
      // rather than only its symptom.
      const topmost = await page.evaluate(
        (p) => {
          const el = document.elementFromPoint(p.x, p.y);
          return el ? { inside: !!el.closest("label"), what: `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}` } : null;
        },
        at,
      );
      check(
        !!topmost && topmost.inside,
        `${who}: a real click at the "${option.key}" pill lands on the pill`,
        topmost ? `topmost element there is ${topmost.what}` : "nothing at that pixel",
      );

      await page.mouse.click(at.x, at.y);
      await quiesce(page);

      const now = await page.evaluate(
        (name) => {
          const el = document.querySelector(`input[name="${name}"]:checked`);
          return el ? el.id : null;
        },
        control.names[0],
      );
      check(
        now === option.id,
        `${who}: the click chooses "${option.key}"`,
        `checked: ${now ?? "nothing"}`,
      );

      // (2) THE PLOT DID NOT MOVE. Its reserved note row is what buys this, and without it the
      // frame comparison below would be comparing two different rectangles.
      const movedTo = await boxOf(".chart-plot");
      const shifted =
        Math.abs(movedTo.x - plotBox.x) > 1 ||
        Math.abs(movedTo.y - plotBox.y) > 1 ||
        Math.abs(movedTo.width - plotBox.width) > 1 ||
        Math.abs(movedTo.height - plotBox.height) > 1;
      check(
        !shifted,
        `${who}: choosing "${option.key}" does not move the drawing`,
        `${plotBox.x},${plotBox.y} ${plotBox.width}x${plotBox.height} → ${movedTo.x},${movedTo.y} ${movedTo.width}x${movedTo.height}`,
      );

      // AND THE ROW THAT IS SUPPOSED TO HAVE PAID FOR IT. When the check above is red this is
      // almost always why, and this is the message that says so in the row's own units.
      if (noteRowAtLanding) {
        const rowNow = await noteRowOf(control.notesSelector);
        const grew = rowNow ? Math.abs(rowNow.height - noteRowAtLanding.height) > 1 : false;
        check(
          !grew,
          `${who}: choosing "${option.key}" does not change the note row's depth`,
          `${control.notesSelector} ${noteRowAtLanding.height}px → ${rowNow ? rowNow.height : "?"}px` +
            (grew
              ? ` — the row is reserved for one sentence and this one needs more. Reserve it by stacking every sentence in one grid cell (control-chrome.ts does this for every control) rather than by a min-height: the depth a sentence needs is a function of the READER'S width, so no build-time number is right at 1600 and at 375 at once.`
              : ""),
        );
      }

      // (1) THE PICTURE REALLY CHANGED. The one check a control wired to nothing cannot pass.
      const plotNow = await shot(plotClip);
      framesByOption.set(option.key, plotNow);
      for (const [selector, rest] of heldAtRest) {
        const moved = await apart(await shot(rest.clip), rest.frame);
        if (moved > plotBase.floor) heldBroken.set(`${selector} @ "${option.key}"`, moved);
      }
      const plotMoved = await apart(plotNow, plotAtRest);
      check(
        plotMoved > plotBase.floor,
        `${who}: choosing "${option.key}" repaints the drawing`,
        `${plotMoved} of ${plotBase.totalPixels} pixels differ from the landing view, against this rectangle's own ${plotBase.floor}-pixel noise floor${
          plotMoved > plotBase.floor
            ? ""
            : live.declares && !live.up
              ? // NOT "this option changes nothing a reader can see". The marks this option drives
                // were never drawn, so what was compared is the frozen fallback against itself —
                // which says nothing about the control and everything about the page's state.
                ` — but this beat's marks are a live layer and the layer is NOT up (${live.why}), so both frames are the frozen fallback and this comparison cannot see the control at all`
              : " — this option changes nothing a reader can see"
        }` +
          // SAID OUT LOUD RATHER THAN QUIETLY BANKED. The clip is the landing rectangle; if the
          // drawing moved out from under it, this comparison is between two different pieces of
          // the page and its green means nothing. The check above is the one to fix first.
          (shifted
            ? " — BUT the drawing moved under the clip, so this green is not evidence: fix the reserved note row first"
            : ""),
      );

      // (3) THE PILL IS PAINTED CHOSEN — wash, ring and darkened words, as a frame.
      const pillNow = await shot(geometry.get(option.id).clip);
      const before = restPill.get(option.id);
      const pillMoved = before ? await apart(pillNow, before.frame) : 0;
      check(
        !!before && pillMoved > before.floor,
        `${who}: the "${option.key}" pill is PAINTED as the chosen one`,
        before
          ? `${pillMoved} of ${before.totalPixels} pixels differ from its own rest frame, against a ${before.floor}-pixel floor${pillMoved > before.floor ? "" : " — nothing marks the chosen option except the invisible radio"}`
          : "no frame to compare",
      );

      // The sentence the control owes the reader: at most the chosen option's own, never another's.
      const notesNow = await page.evaluate((sel) => {
        const box = document.querySelector(sel);
        if (!box) return null;
        return Array.prototype.map
          .call(box.querySelectorAll("*"), (el) => {
            const attr = Array.prototype.find.call(el.attributes, (a) =>
              /^data-[a-z0-9-]+-note$/.test(a.name),
            );
            if (!attr) return null;
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              key: attr.value,
              drawn:
                Number(cs.opacity) === 1 &&
                cs.display !== "none" &&
                cs.visibility !== "hidden" &&
                r.width > 0 &&
                r.height > 0,
              text: el.textContent.trim().slice(0, 60),
            };
          })
          .filter(Boolean);
      }, control.notesSelector);
      if (notesNow && notesNow.length) {
        const shown = notesNow.filter((n) => n.drawn);
        for (const n of shown) notesDrawnSomewhere.add(n.key);
        check(
          shown.length <= 1 && shown.every((n) => n.key === option.key),
          `${who}: "${option.key}" draws its own sentence and nobody else's`,
          shown.length ? shown.map((n) => `${n.key}: "${n.text}"`).join(" + ") : "none drawn",
        );
      }
    }

    // The default pill, the other way round: it was chosen at the start and is at rest now, so the
    // same comparison can be made for it without ever needing a state the reader cannot reach.
    if (chosenPillAtStart && geometry.has(initial.id)) {
      const restNow = await shot(geometry.get(initial.id).clip);
      const moved = await apart(chosenPillAtStart.frame, restNow);
      check(
        moved > chosenPillAtStart.floor,
        `${who}: the landing option's pill is PAINTED as the chosen one`,
        `${moved} of ${chosenPillAtStart.totalPixels} pixels differ between its chosen and its rest frame, against a ${chosenPillAtStart.floor}-pixel floor${moved > chosenPillAtStart.floor ? "" : " — nothing marks the landing option"}`,
      );
    }

    // ── R5: pairwise, over the values of this parameter ─────────────────────────────────────────
    //
    // The landing view is one of the values, so its own frame joins the comparison: an option that
    // merely reproduces the view a reader landed on is as dead as two options reproducing each
    // other, and only a pairwise sweep sees both.
    const valueFrames = new Map([[`${initial.key ?? "the landing view"} (at rest)`, plotAtRest], ...framesByOption]);
    const valueKeys = [...valueFrames.keys()];
    const twins = [];
    for (let i = 0; i < valueKeys.length; i++)
      for (let j = i + 1; j < valueKeys.length; j++) {
        const differ = await apart(valueFrames.get(valueKeys[i]), valueFrames.get(valueKeys[j]));
        if (differ <= plotBase.floor)
          twins.push(`"${valueKeys[i]}" and "${valueKeys[j]}" (${differ}px apart)`);
      }
    if (valueKeys.length >= 2)
      check(
        twins.length === 0,
        `${who}: every value of this parameter paints its own picture`,
        twins.length === 0
          ? `${(valueKeys.length * (valueKeys.length - 1)) / 2} pairs compared, every one above this rectangle's ${plotBase.floor}-pixel floor`
          : `${twins.join(", ")} — a reader who moves between them operates a control while the picture stands still`,
      );

    // ── R6: and what the beat said would not move, did not ──────────────────────────────────────
    if (heldSelectors.length === 0)
      skip(
        `${who}: what this control holds still`,
        "the beat declares no `heldStill` selectors, so there is nothing it promised to hold",
      );
    else
      check(
        heldBroken.size === 0,
        `${who}: everything this beat holds still, holds`,
        heldBroken.size === 0
          ? `${heldAtRest.size} of ${heldSelectors.length} declared selector(s) identical at every value: ${[...heldAtRest.keys()].join(", ")}`
          : [...heldBroken].map(([at, px]) => `${at} moved by ${px}px`).join(", "),
      );

    // Every sentence in the note row belongs to an option a reader can actually choose. A note no
    // option reveals is markup nobody will ever read, and the row that reserves height for it is
    // height taken off the plot for nothing.
    if (control.notes && control.notes.length) {
      check(
        !!control.notesRole,
        `${who}: the note row is a live region`,
        `${control.notesSelector} role="${control.notesRole ?? "none"}"`,
      );
      const unreachable = Array.from(new Set(control.notes.map((n) => n.key))).filter(
        (k) => !notesDrawnSomewhere.has(k),
      );
      // The landing option's own note, if it has one, is drawn at load rather than by a click, so
      // it is credited here rather than counted against the row.
      const atLanding = control.notes.filter((n) => n.drawn).map((n) => n.key);
      const orphaned = unreachable.filter((k) => !atLanding.includes(k));
      check(
        orphaned.length === 0,
        `${who}: every sentence the note row reserves height for is reachable`,
        orphaned.length ? `never drawn by any option: ${orphaned.join(", ")}` : `${control.notes.length} sentences, all reachable`,
      );
    }

    // Back to where the reader landed, by a real click: the picture must come back exactly.
    if (geometry.has(initial.id)) {
      const home = geometry.get(initial.id);
      const at = probe(home.cx, home.cy);
      await page.mouse.click(at.x, at.y);
      await quiesce(page);
      const restored = await shot(plotClip);
      const drift = await apart(restored, plotAtRest);
      check(
        drift <= plotBase.floor,
        `${who}: choosing "${initial.key}" again restores the landing picture`,
        `${drift} of ${plotBase.totalPixels} pixels still differ from the landing view, against a ${plotBase.floor}-pixel noise floor`,
      );
    }
  }
}

/** ITEM: every control stays a keyboard-operable radio group, and a keyboard reader can SEE where
 *  they are.
 *
 *  All of it measured off the live page: what Tab reaches, what the focus ring paints, what an
 *  arrow key does, and what the chosen pill's own contrast is. The focus check is a frame
 *  comparison for a recorded reason — an earlier version accepted an outline on EITHER the pill or
 *  the `<input>`, and passed against a copy with the pill's ring deleted, because the input still
 *  reported the user agent's `outline: auto 1px` while sitting at `opacity: 0`. A focus indicator
 *  that changes no pixel is not an indicator, whatever the cascade says about it. */
async function checkControlAffordance(page, darkroom, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await freezeMotion(page);
  await quiesce(page);

  const controls = await discoverControls(page);
  if (controls.length === 0) {
    check(true, `${vp.label}: this beat declares no control to reach or ring`, "no <fieldset> on the page");
    return;
  }

  for (const control of controls) {
    const who = `${vp.label}: ${control.className || `fieldset #${control.index}`}`;
    if (control.names.length !== 1 || !control.names[0] || control.radioCount < 2) continue;
    const group = control.names[0];

    // Keyboard reach, by real key presses from the top of the document — never `.focus()`, which
    // does not hit-test and would pass through a control buried under something else.
    await page.evaluate(() => {
      document.body.focus();
      if (document.activeElement && document.activeElement !== document.body)
        document.activeElement.blur();
    });
    let reached = null;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(
        (name) => {
          const a = document.activeElement;
          return a && a.name === name ? a.id : null;
        },
        group,
      );
    }
    check(!!reached, `${who}: Tab alone reaches the group`, reached ? `focus landed on ${reached}` : `never focused a "${group}" radio in 40 presses`);
    if (!reached) continue;

    const clip = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.floor(r.left) - 6),
        y: Math.max(0, Math.floor(r.top) - 6),
        width: Math.ceil(r.width) + 12,
        height: Math.ceil(r.height) + 12,
      };
    }, `fieldset.${control.className.split(/\s+/)[0]}`);
    if (clip) {
      await page.mouse.move(2, 2); // :hover may not stand in for the focus ring
      await sleep(60);
      const focusedShot = await page.screenshot({ clip, encoding: "binary" });
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await sleep(80);
      const rest = await baselineOf(page, darkroom, clip);
      const moved = (await comparePixels(darkroom, focusedShot, rest.frame)).diffPixels;
      check(
        moved > rest.floor,
        `${who}: keyboard focus changes what is on screen`,
        `${moved} of ${rest.totalPixels} pixels differ over a ${clip.width}x${clip.height} clip, against a ${rest.floor}-pixel noise floor${moved > rest.floor ? "" : " — nothing is drawn for focus"}`,
      );

      // ...and the cause, named, so a red above says WHERE to look. Only an indicator on something
      // that actually paints counts: an outline on a fully transparent input does not.
      await page.evaluate((id) => document.getElementById(id)?.focus(), reached);
      const ring = await page.evaluate((id) => {
        const input = document.getElementById(id);
        const label = input.closest("label") ?? input;
        const paints = (el) => {
          let o = 1;
          for (let n = el; n && n.nodeType === 1; n = n.parentElement)
            o *= Number(getComputedStyle(n).opacity);
          const r = el.getBoundingClientRect();
          return o > 0.05 && r.width > 0 && r.height > 0;
        };
        const ind = (el) => {
          const cs = getComputedStyle(el);
          return {
            outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
            hasOutline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
            hasShadow: cs.boxShadow !== "none",
            paints: paints(el),
          };
        };
        return { label: ind(label), input: ind(input) };
      }, reached);
      check(
        (ring.label.paints && (ring.label.hasOutline || ring.label.hasShadow)) ||
          (ring.input.paints && (ring.input.hasOutline || ring.input.hasShadow)),
        `${who}: the focus indicator is on something that actually paints`,
        `pill outline "${ring.label.outline}" (paints: ${ring.label.paints}), input outline "${ring.input.outline}" (paints: ${ring.input.paints})`,
      );
    }

    // Arrow keys move the selection — what a reader expects of a radio group, and the first thing a
    // hand-rolled widget loses.
    await page.evaluate((id) => document.getElementById(id)?.focus(), reached);
    const before = await page.evaluate((name) => document.querySelector(`input[name="${name}"]:checked`)?.id ?? null, group);
    await page.keyboard.press("ArrowRight");
    await sleep(120);
    const after = await page.evaluate((name) => document.querySelector(`input[name="${name}"]:checked`)?.id ?? null, group);
    check(after !== null && after !== before, `${who}: ArrowRight moves the selection`, `${before} → ${after}`);

    // The chosen pill's own legibility. The treatment washes the accent into the ground; whatever
    // ground a newsroom brings, the pair must still clear WCAG 1.4.3 for body text.
    const contrast = await page.evaluate((name) => {
      const input = document.querySelector(`input[name="${name}"]:checked`);
      if (!input) return null;
      const cs = getComputedStyle(input.closest("label") ?? input);
      return { fg: cs.color, bg: cs.backgroundColor };
    }, group);
    if (contrast) {
      const ratio = contrastRatio(contrast.fg, contrast.bg);
      // A pill whose background is fully transparent sits on the page's own ground, which is
      // measured elsewhere; there is no pair to weigh here. Anything else must be weighable, and a
      // colour this file cannot read is a FAILURE rather than a pass — `NaN >= 4.5` is false in
      // JavaScript, so an unparsed colour used to read as a red for the wrong reason and, before
      // that, as nothing at all.
      const transparent = /rgba\([^)]*,\s*0\s*\)/.test(contrast.bg) || contrast.bg === "transparent";
      check(
        transparent || (ratio !== null && ratio >= 4.5),
        `${who}: the chosen pill's own text clears 4.5:1`,
        transparent
          ? `${contrast.fg} on a transparent pill — weighed against the ground elsewhere`
          : `${contrast.fg} on ${contrast.bg} = ${ratio === null ? "UNREADABLE" : `${ratio.toFixed(2)}:1`}`,
      );
    }
  }
}

/** ITEM: the words on the page are set in the typeface the page asked for, and not in the bridge
 *  behind it.
 *
 *  This is the one check that can see the defect this format shipped for its whole life: a
 *  `font-family` naming a Google family that the page never carried, so every reader saw Georgia or
 *  Helvetica and nothing anywhere said so. It is deliberately three measurements rather than one —
 *  `probeTypefaces` in `./typefaces.mjs` documents why each is needed — and the decisive one is the
 *  width differential, because a family the TEST MACHINE happens to have installed satisfies
 *  everything except that.
 *
 *  Verified by mutation on 2026-09-13: with the `@font-face` block stripped out of the rendered
 *  page, this section goes from 18 green to 12 red. */
async function checkTypefaces(page) {
  const { uses, declared } = await page.evaluate(probeTypefaces);

  if (uses.length === 0) {
    skip(`typeface`, `this beat sets no text in a named family — every word is in a generic stack`);
    return;
  }

  for (const use of uses) {
    const who = `${use.family} ${use.weight} ${use.style}`;
    check(
      use.hasFace,
      `typeface: the page CARRIES ${use.family}`,
      `${use.nodes} text node${use.nodes === 1 ? "" : "s"} ask for it; document.fonts ${
        use.hasFace ? "holds a face for it" : "holds NONE — nothing was embedded, so the reader sees " + use.fallbackStack
      }`,
    );
    if (!use.hasFace) continue;
    check(use.hasExactFace, `typeface: ${who} is carried at that weight and style`);
    check(
      use.covers,
      `typeface: ${use.family} covers all ${use.characters} characters this beat sets in it`,
      use.uncovered.length > 0
        ? `no embedded unicode-range reaches ${use.uncovered.join(", ")} — ${use.uncovered.length === 1 ? "that glyph is" : "those glyphs are"} drawn by the fallback`
        : use.loaded
          ? undefined
          : `the faces for it never loaded — the embedded bytes are not a font this browser can read`,
    );
    // THE MEASUREMENT THAT CANNOT BE FAKED. Same string, same size, same weight: once in the
    // element's own stack, once in that stack with the intended family taken out. Equal means the
    // browser is already drawing the fallback.
    const delta = Math.abs(use.widthWithFirst - use.widthWithoutFirst);
    check(
      delta > 0.5,
      `typeface: ${who} really DRAWS, not its fallback`,
      `${use.widthWithFirst.toFixed(1)}px in "${use.stack}" against ${use.widthWithoutFirst.toFixed(1)}px in "${use.fallbackStack}" — ${delta.toFixed(1)}px apart`,
    );
  }

  // Not a failure, but never silent: a face the page carries and no word uses is dead weight in a
  // file a newsroom ships, and the static scan that chose it is conservative on purpose.
  const used = new Set(uses.map((u) => `${u.family}|${u.weight}|${u.style}`));
  const announced = new Set();
  for (const face of declared)
    if (
      face.status === "unloaded" &&
      !used.has(`${face.family}|${face.weight}|${face.style}`) &&
      !announced.has(`${face.family}|${face.weight}|${face.style}`) &&
      announced.add(`${face.family}|${face.weight}|${face.style}`)
    )
      skip(
        `typeface: ${face.family} ${face.weight} ${face.style} is carried and never used`,
        `dead weight — the build-time scan attributes a font-weight declared with no family of its own to the page's body family`,
      );
}

/** ITEM: the words a reader PROVOKES are set in the typeface the page asked for too.
 *
 *  The defect the cut introduces and `checkTypefaces` above cannot see: each face now carries a
 *  LIST of characters rather than Google's whole latin subset, and a character outside that list is
 *  drawn by the bridge. On the initial page that is loud. In a tooltip it is invisible until a
 *  reader hovers — and `document.fonts.check()` answers `true` about it, because a character
 *  outside every declared range needs no custom font at all.
 *
 *  So `probeRevealedText` DRIVES the page through its own handlers — every filter control clicked,
 *  every `[data-detail]` focused, which is the same `show()` a pointer goes through — and measures
 *  what appeared, against the stack it appeared in.
 *
 *  Verified by mutation on 2026-09-13: with one character cut out of the page's own subset, this
 *  section names it and goes red; with the @font-face block stripped, the width differential reads
 *  0.0px apart. */
async function checkRevealedTypefaces(page) {
  const { uses, controls, targets, revealed, unshown } = await page.evaluate(probeRevealedText);
  check(
    targets === 0 || revealed > 0,
    `interaction: the page's own handler really showed a detail string`,
    `${revealed}/${targets} of this beat's [data-detail] marks put their string in the tooltip` +
      (unshown.length > 0 ? `; ${unshown.length} never did — ${JSON.stringify(unshown.slice(0, 3))}` : "") +
      `, across ${controls} filter control${controls === 1 ? "" : "s"}`,
  );
  if (uses.length === 0) {
    skip(`interaction`, `nothing this beat reveals is set in a named family`);
    return;
  }
  for (const use of uses) {
    const who = `${use.family} ${use.weight} ${use.style}`;
    check(
      use.uncovered.length === 0,
      `interaction: ${use.family} sets all ${use.characters} characters this beat can reveal (${use.from.join(", ")})`,
      use.uncovered.length > 0
        ? `the subset carried for it does not reach ${use.uncovered.join(", ")} — ${use.uncovered.length === 1 ? "that glyph is" : "those glyphs are"} drawn by ${use.fallbackStack}, and only a reader who hovers sees it`
        : undefined,
    );
    const delta = Math.abs(use.widthWithFirst - use.widthWithoutFirst);
    check(
      delta > 0.5,
      `interaction: ${who} really DRAWS the words it reveals, not its fallback`,
      `${use.widthWithFirst.toFixed(1)}px in "${use.stack}" against ${use.widthWithoutFirst.toFixed(1)}px in "${use.fallbackStack}" — ${delta.toFixed(1)}px apart`,
    );
  }
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

/**
 * A MAP BEAT IS VERIFIED IN THE STATE PRODUCTION SHIPS IT, WHICH IS NOT THE STATE IT IS COMMITTED
 * IN.
 *
 * `live-map.mjs` keeps the real key out of the repository, so a committed map × web page always
 * carries the delivery placeholder and its live layer never boots. Its marks are those layers. A
 * run over that file measures the frozen fallback and reports a working control as dead — measured
 * on five beats on 2026-09-16, all five green the moment their keyed copy was driven instead.
 *
 * The renderer writes that keyed copy beside the committed one as `<direction>.local.html`, and
 * `.gitignore` keeps it out of the tree. So: a page whose live layer cannot boot is redirected to
 * the keyed copy standing next to it, out loud. If there is none, the run continues on the
 * placeholder page and every check that depends on the layer reports that it could not be taken —
 * never a skip, and never a quiet green.
 */
{
  const sentinel = "__MAPTILER" + "_KEY__";
  const page = await readFile(filePath, "utf8");
  const declaresLive = page.includes('id="mw-live-plan"');
  if (declaresLive && page.includes(sentinel)) {
    const keyed = filePath.replace(/\.html$/, ".local.html");
    if (existsSync(keyed) && !(await readFile(keyed, "utf8")).includes(sentinel)) {
      console.log(
        `this beat's marks are a live layer and ${basename(filePath)} carries the delivery ` +
          `placeholder instead of a key, so its layer cannot boot. Verifying the keyed copy that ` +
          `stands beside it — ${basename(keyed)} — which is the page a reader is actually served.`,
      );
      filePath = keyed;
    } else {
      console.log(
        `WARNING: this beat's marks are a live layer, ${basename(filePath)} carries the delivery ` +
          `placeholder instead of a key, and no keyed copy stands beside it. Its layers will never ` +
          `mount, and every check below that depends on them reports a measurement that could not ` +
          `be taken rather than a result.`,
      );
    }
  }
}

if (wantShots) await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome() });
// A blank page that exists only to DECODE frames. The comparison needs an `<img>` and a `<canvas>`,
// and putting either into the page under test would be the checker altering its own subject.
const darkroom = await browser.newPage();
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

  console.log(`\nTYPEFACE — the face the page asked for is the face the reader is shown`);
  {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkTypefaces(page);
    await page.close();
  }

  console.log(`\nTYPEFACE UNDER INTERACTION — every word a reader can provoke, in the face that was chosen`);
  {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkRevealedTypefaces(page);
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

  console.log(`\nDEFAULT VIEW — the picture a reader lands on carries the whole claim`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await sleep(60);
    await checkDefaultView(page, vp.label);
    await page.close();
  }

  console.log(`\nCONTROLS — every control this beat ships, driven by real clicks`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkControlSurface(page, darkroom, vp);
    if (wantShots) {
      // The LAST option of the LAST control, chosen for real — whatever vocabulary it is. This
      // block used to read `fieldset.chart-filter … :last-of-type` and photographed nothing at all
      // on the 44 committed beats whose control is not a filter.
      const chose = await page.evaluate(() => {
        const sets = document.querySelectorAll("fieldset");
        if (!sets.length) return false;
        const radios = sets[sets.length - 1].querySelectorAll("input[type=radio]");
        if (!radios.length) return false;
        radios[radios.length - 1].click();
        return true;
      });
      if (chose) {
        await sleep(200);
        await page.screenshot({ path: join(outDir, `control-chosen-${vp.w}x${vp.h}.png`) });
      }
    }
    await page.close();
  }

  console.log(`\nCONTROLS — the same controls, with JavaScript DISABLED`);
  {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    // `page.evaluate` still works with scripting off (it runs in the automation world), so the
    // measurements below are honest: the PAGE's own inline script never ran.
    const ranAnyway = await page.evaluate(() => !!document.querySelector(".pt-active"));
    check(!ranAnyway, `no JS: the page's own script really did not run`);
    await checkDefaultView(page, `${POINTER_VIEWPORTS[0].label} (no JS)`);
    await checkControlSurface(page, darkroom, POINTER_VIEWPORTS[0], { scripting: false });
    if (wantShots) await page.screenshot({ path: join(outDir, `nojs-controls.png`) });
    await page.close();
  }

  console.log(`\nCONTROLS — still keyboard-operable radio groups, with a ring a reader can see`);
  for (const vp of POINTER_VIEWPORTS) {
    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: "load" });
    await checkControlAffordance(page, darkroom, vp);
    if (wantShots) {
      // One Tab from a blurred document lands on the group's own checked radio — so this frame is
      // the focus ring as a keyboard reader sees it, not a frame taken after focus moved on.
      await page.evaluate(() => {
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      });
      await page.keyboard.press("Tab");
      await sleep(80);
      const box = await page.evaluate(() => {
        const el = document.querySelector("fieldset");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.max(0, r.left - 8),
          y: Math.max(0, r.top - 8),
          width: r.width + 16,
          height: r.height + 16,
        };
      });
      // No fieldset, no control to photograph.
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
