// twin/skills/twin-chart-web/scripts/verify-web.mjs
//
// The genre's own verification, and the only place its three moving parts are actually proven.
//
// `references/web-discipline.md`, "Verification", already said the rule: an interactive, fluid
// genre is verified by driving a real browser at several widths, never by reading markup and never
// by trusting a unit test. It said it and then left the doing to a human opening the file. This
// script is that human, written down — so the claim "hover works" is a measurement with a number
// beside it rather than a sentence somebody wrote after looking once.
//
// WHY IT DISPATCHES REAL INPUT AND NOTHING ELSE. This genre has already shipped, once, a build
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
//     genre leans on; all three are Baseline, none is verified here on Safari or Firefox.
//   - Touch is exercised as a pointer, not as a real finger: no multi-touch, no scroll-vs-tap
//     disambiguation, no 300ms tap delay.
//   - It cannot prove the ABSENCE of a defect it was not written to look for, which is why the
//     no-JS pass exists: it re-runs the filter with scripting off, and any behaviour that only
//     works because a script propped it up dies there rather than in production.
//
// Usage:
//   bun skills/twin-chart-web/scripts/verify-web.mjs                 # renders the seed, verifies it
//   bun skills/twin-chart-web/scripts/verify-web.mjs --file x.html   # verifies an existing beat
//   bun skills/twin-chart-web/scripts/verify-web.mjs --shots --out /tmp/web-verify
//
// Exit code is 0 only when every check passed. Any failure prints the measurement that failed,
// with both numbers, and exits 1.

import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { render } from "./render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The widths this genre claims to work at, each paired with a REAL window height rather than a
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

function check(ok, what, detail) {
  if (ok) {
    passes += 1;
    console.log(`  ok   ${what}${detail ? `  — ${detail}` : ""}`);
  } else {
    failures.push(`${what}${detail ? `  — ${detail}` : ""}`);
    console.log(`  FAIL ${what}${detail ? `  — ${detail}` : ""}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const readings = await page.evaluate(() => {
    const plot = document.querySelector(".chart-plot").getBoundingClientRect();
    return Array.prototype.map.call(document.querySelectorAll(".pt"), (p) => {
      const r = p.getBoundingClientRect();
      return {
        year: p.getAttribute("data-year"),
        detail: p.getAttribute("data-detail"),
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        midY: plot.top + plot.height / 2,
      };
    });
  });
  check(readings.length >= 2, `${vp.label}: readings found to hover`, `${readings.length} points`);

  // The hit test itself, before a single event is sent: what does the compositor say is on top at
  // the plot's own centre? With the overlay defect this answers `.overlay`; correct, it answers the
  // svg's own `.hit-area`. Reported alongside the pointer probes because it names the CAUSE when
  // they fail, not just the symptom.
  const topAtCentre = await page.evaluate(() => {
    const plot = document.querySelector(".chart-plot").getBoundingClientRect();
    const el = document.elementFromPoint(
      plot.left + plot.width / 2,
      plot.top + plot.height / 2,
    );
    return el ? `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}` : "none";
  });
  check(
    topAtCentre.includes("hit-area"),
    `${vp.label}: the pointer's own hit test reaches the chart, not an overlay`,
    `topmost element at the plot centre is ${topAtCentre}`,
  );

  let onCircle = 0;
  let anywhereInPlot = 0;
  for (const r of readings) {
    await page.mouse.move(r.cx, r.cy);
    await sleep(25);
    const shown = await page.evaluate(() => {
      const t = document.getElementById("tooltip");
      return { hidden: t.hidden, text: t.textContent, active: document.querySelectorAll(".pt-active").length };
    });
    if (!shown.hidden && shown.text === r.detail && shown.active === 1) onCircle += 1;
    else
      failures.push(
        `${vp.label}: hovering the ${r.year} circle at (${Math.round(r.cx)}, ${Math.round(r.cy)}) — tooltip ${shown.hidden ? "never appeared" : `said "${shown.text}"`}, expected "${r.detail}"`,
      );

    await page.mouse.move(r.cx, r.midY);
    await sleep(25);
    const anywhere = await page.evaluate(() => {
      const t = document.getElementById("tooltip");
      return { hidden: t.hidden, text: t.textContent };
    });
    if (!anywhere.hidden && anywhere.text === r.detail) anywhereInPlot += 1;
    else
      failures.push(
        `${vp.label}: hovering the plot at the ${r.year} x, mid-height (${Math.round(r.cx)}, ${Math.round(r.midY)}) — tooltip ${anywhere.hidden ? "never appeared" : `said "${anywhere.text}"`}, expected "${r.detail}"`,
      );
  }
  check(
    onCircle === readings.length,
    `${vp.label}: every reading answers a real pointer on its own mark`,
    `${onCircle}/${readings.length}`,
  );
  check(
    anywhereInPlot === readings.length,
    `${vp.label}: every reading answers a real pointer anywhere in its column`,
    `${anywhereInPlot}/${readings.length}`,
  );

  // The regression probe: the centre of an `.overlay` child. This pixel is covered by an HTML
  // element that is NOT the chart; the tooltip must still answer, which is only true while
  // `.overlay` stays `pointer-events: none`.
  const label = await page.evaluate(() => {
    const el = document.querySelector(".chart-plot .overlay .note.peak-label");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: el.textContent };
  });
  if (label) {
    const nearest = readings.reduce((best, r) =>
      Math.abs(r.cx - label.x) < Math.abs(best.cx - label.x) ? r : best,
    );
    await page.mouse.move(label.x, label.y);
    await sleep(40);
    const shown = await page.evaluate(() => {
      const t = document.getElementById("tooltip");
      return { hidden: t.hidden, text: t.textContent };
    });
    check(
      !shown.hidden && shown.text === nearest.detail,
      `${vp.label}: a pointer ON the overlay label still reaches the chart beneath it`,
      `at (${Math.round(label.x)}, ${Math.round(label.y)}) over "${label.text}" the tooltip said ${shown.hidden ? "nothing" : `"${shown.text}"`}, expected "${nearest.detail}"`,
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

  const pillBox = (id) =>
    page.evaluate((sel) => {
      const input = document.querySelector(sel);
      const label = input.closest("label");
      const r = label.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) };
    }, `#${id}`);

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
      const r = await page.evaluate(() => {
        const p = document.querySelectorAll(".pt")[5];
        const b = p.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      });
      await page.mouse.move(r.x, r.y);
      await sleep(80);
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
      await page.evaluate(() => document.querySelector("#period-late").click());
      await sleep(200);
      await page.screenshot({ path: join(outDir, `filter-late-${vp.w}x${vp.h}.png`) });
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
        const r = document.querySelector(".chart-filter").getBoundingClientRect();
        return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: r.width + 16, height: r.height + 16 };
      });
      await page.screenshot({ path: join(outDir, `control-focus-${vp.w}.png`), clip: box });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${passes} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`\nfailures:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
if (wantShots) console.log(`screenshots → ${outDir}`);
