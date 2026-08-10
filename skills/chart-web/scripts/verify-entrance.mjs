// twin/skills/chart-web/scripts/verify-entrance.mjs
//
// The entrance's own evidence. `verify-web.mjs` drives the fit, the hover and the filter; this
// drives the ARRIVAL, because none of the three instruments that file already has can see it.
//
// WHY THE REVEAL IS MEASURED AS GEOMETRY, TWICE. The failure this project has already met, on the
// scrolly, is a "reveal" that is an opacity fade over a finished picture: every attribute present,
// every check green, and a reader watching a static chart get less transparent. Nothing in the
// markup separates that from a reveal that builds. So two independent instruments:
//
//   - THE CLIP'S OWN scaleX, read out of the computed transform matrix. Exact, and the number the
//     CSS is actually running.
//   - HOW MANY OF THE BEAT'S SEGMENTS ARE HIT-TESTABLE at their own midpoints, through
//     `document.elementsFromPoint` at real client coordinates. Clipping affects hit-testing, so a
//     segment the wipe has not reached is not in the stack. An opacity fade reports ALL of them
//     from the first sample, which is the signature this instrument exists to tell apart.
//
// ── AND A THIRD, FOR THE REVEAL THAT IS NOT A CLIP AT ALL ────────────────────────────────────
//
// Both instruments above read A CLIP. That was the whole of this genre's reveal until the bar family
// arrived, and it is the reason the bar family could not be migrated: a left-to-right clip leaves
// every stem in a ranking the SAME length for two thirds of the build, so the intermediate frames
// assert that all fifteen countries are equal — the opposite of the claim. A lollipop entrance was
// built on the wipe, driven green by the two instruments above, and reverted on looking at it. **A
// green instrument that cannot see the defect is the defect.**
//
// So a bar-family beat DECLARES ITS MARKS (`data-entrance-key` on each one, written by
// `entrance.ts`'s `entranceLayer` when the beat asks for the `grow` motion) and this file measures,
// per mark, per frame:
//
//   - ITS PAINTED EXTENT, IN THE SAME UNIT FOR EVERY MARK. Not "how far along its own length is it",
//     which is a fraction and would hide exactly the defect: the mark's own settled geometry is
//     walked from its BASELINE toward its tip in FIXED STEPS of user units, and each step is
//     hit-tested through `document.elementsFromPoint` at real client coordinates, mapped through the
//     mark's PARENT screen CTM (the parent's, because the mark's own CTM carries the animation this
//     is measuring). Painted extent is how many of those steps answered.
//
//     Fixed steps rather than per-mark fractions is the whole point: under a clip wipe every stem
//     reports the SAME painted extent in user units while their settled extents differ, and that is
//     the signature this instrument exists to name. It is also clip-aware and transform-aware at
//     once — it asks what is on the screen, not what the markup says.
//
//   - ITS OWN SCALE FACTOR, off the computed transform matrix, on the axis the mark encodes its
//     reading along. Exact, independent of the hit test, and the same technique as the clip's.
//
// Three things are then asserted that the clip instruments cannot express: each mark's own extent
// GROWS; the marks do not all arrive on one clock (at some frame the spread across them is wide);
// and NO FRAME SHOWS THE MARKS ALL EQUAL unless they really are equal. The last one is the lollipop
// defect stated as arithmetic.
//
// WHY THE PAGE IS PUT BELOW A FOLD. The trigger is `IntersectionObserver`, because an embed can sit
// two screens down an article and an entrance that plays on load plays to nobody. So the harness
// reproduces an embed's real situation: the delivered file, byte for byte, with ONE article-height
// spacer inserted at the top of its `<body>` and nothing else changed. The first sample is taken
// BEFORE scrolling; if the entrance fired on load it would already be advancing there.
//
// THREE PASSES, and the second is the one that is not optional:
//   1. scripting on, below the fold  — the reveal must PROGRESS: strictly increasing, from nothing
//      to whole, with the conclusion's own label still invisible while its mark is arriving.
//   2. `prefers-reduced-motion: reduce` — the finished graphic, immediately, with NO intermediate
//      state: `document.getAnimations()` empty (the keyframes live inside
//      `@media (prefers-reduced-motion: no-preference)`, so under `reduce` there is nothing to
//      resolve at all) and the wipe already at 1 on the first sample after entry.
//   3. JavaScript disabled — the settled page, complete, with no `entered` class anywhere. The
//      entrance is never a precondition for reading.
//
// Usage:
//   bun skills/chart-web/scripts/verify-entrance.mjs                # renders the seed, drives it
//   bun skills/chart-web/scripts/verify-entrance.mjs --file x.html  # an existing beat
//   bun skills/chart-web/scripts/verify-entrance.mjs --out DIR      # + frames and report.json
//
// Exit code is 0 only when every check passed.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { render } from "./render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Same shape as the copy in every other script in this repository that drives Chrome. */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((p) => existsSync(p));
  if (!found)
    throw new Error(`no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

/** The delivered file with one article-height spacer above it — an embed's real situation. */
function belowTheFold(html) {
  return html.replace(
    /<body>/,
    `<body><div id="probe-spacer" style="height:220vh"></div>`,
  );
}

/** What the page is showing, right now, in numbers. Nothing here reads a class or an attribute to
 *  decide whether something is drawn: the wipe is a matrix and the segments are hit-tested. */
const READ = () => {
  const clip = document.querySelector('[data-entrance-motion="wipe"][width]');
  const matrix = clip ? getComputedStyle(clip).transform : "none";
  const scaleX = matrix === "none" ? 1 : Number(matrix.slice(matrix.indexOf("(") + 1).split(",")[0]);

  // WHAT IS HIT-TESTED, AND WHY IT IS NOT ALWAYS `.seg`.
  //
  // The seed splits its line into `.seg` paths because its FILTER needs each reading addressable,
  // and this instrument was written against that. No delivered beat is obliged to: a line beat that
  // declares no filter draws ONE `<path>`, a histogram draws `<rect>`s, a lollipop draws stems and
  // dots. Measured on `webx-life-expectancy`: zero `.seg` elements, so the sample set was empty and
  // every reading came back `0 of 0` — which this file's own check reports as a FAILURE rather than
  // a pass, so it never lied, but it also could not be run on fifteen of the sixteen beats waiting
  // to be migrated.
  //
  // So the sample set is now "whatever the wipe actually uncovers": the drawable elements inside the
  // clipped group, sampled at eleven points along a path's own length (`getPointAtLength`, mapped to
  // client coordinates through the element's own screen CTM — the `viewBox` and this genre's
  // `preserveAspectRatio="none"` stretch are both in that matrix) and at the centre otherwise.
  //
  // `.seg` STAYS THE PRIMARY when it is present, unchanged, so the numbers this instrument already
  // published for the seed are the same numbers. The fallback is only reached when there is nothing
  // named `.seg` to measure.
  //
  // Occlusion is not a confound in either form: `elementsFromPoint` returns the whole stack and the
  // test is `includes`, so a transparent `.pt` target sitting over the curve does not hide it. What
  // IS being measured is clipping, which removes an element from the stack entirely.
  //
  // A STROKE AND A REGION ARE SAMPLED DIFFERENTLY, and the distinction was measured rather than
  // anticipated. `webx-world-population` draws an AREA, and outline sampling — which reads a stroked
  // curve exactly right — reported 16 of 22 hittable on the SETTLED page. A probe named the six:
  // three on the area's closing baseline edge (y exactly 704, the element's own `bottom`, where
  // `elementsFromPoint` resolves to the div outside it) and three on its top outline. All eleven
  // samples on the sibling `fill="none"` line path hit. **A region's outline is its EDGE, and a
  // point on an edge belongs to neither side.**
  //
  // Nudging the edge point toward the bounding box's centre was tried first and is WRONG, which the
  // measurement said before the reasoning did: an area anchored to zero has its centre ABOVE its own
  // top outline, so the nudge walked out of the fill rather than into it, and the reading did not
  // move off 16. So a region is not sampled from its outline at all — it is asked where its own
  // interior is. Eleven columns across its `getBBox`, each scanned downward for the first point
  // `isPointInFill` accepts. That is exact for any shape, convex or not, and it is also the right
  // sample set for THIS measurement: eleven points spread across x is precisely what a left-to-right
  // wipe uncovers in order.
  const segs = Array.prototype.slice.call(document.querySelectorAll(".seg"));
  const samplesOf = (el) => {
    if (el.tagName.toLowerCase() === "path" && el.getTotalLength) {
      const ctm = el.getScreenCTM();
      if (!ctm) return [];
      const toScreen = (ux, uy) => {
        const s = new DOMPoint(ux, uy).matrixTransform(ctm);
        return [s.x, s.y];
      };
      const filled = getComputedStyle(el).fill !== "none";
      if (filled && el.isPointInFill) {
        const box = el.getBBox();
        const out = [];
        for (let i = 0; i < 11; i++) {
          const ux = box.x + ((i + 0.5) / 11) * box.width;
          for (let j = 1; j < 60; j++) {
            const uy = box.y + (j / 60) * box.height;
            if (el.isPointInFill(new DOMPoint(ux, uy))) {
              out.push(toScreen(ux, uy));
              break;
            }
          }
        }
        return out;
      }
      const length = el.getTotalLength();
      if (length > 0) {
        const out = [];
        for (let i = 0; i <= 10; i++) {
          const p = el.getPointAtLength((i / 10) * length);
          out.push(toScreen(p.x, p.y));
        }
        return out;
      }
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return [];
    return [[r.left + r.width / 2, r.top + r.height / 2]];
  };
  let marks = segs.map((seg) => {
    const r = seg.getBoundingClientRect();
    return { el: seg, points: [[r.left + r.width / 2, r.top + r.height / 2]] };
  });
  if (marks.length === 0) {
    const clipped = Array.prototype.slice.call(
      document.querySelectorAll("[clip-path]"),
    );
    for (const group of clipped)
      for (const el of Array.prototype.slice.call(
        group.querySelectorAll("path, rect, circle, line, polygon, polyline"),
      ))
        marks.push({ el, points: samplesOf(el) });
    marks = marks.filter((m) => m.points.length > 0);
  }
  let hit = 0;
  for (const mark of marks)
    for (const [x, y] of mark.points)
      if (document.elementsFromPoint(x, y).includes(mark.el)) hit += 1;
  const total = marks.reduce((n, m) => n + m.points.length, 0);
  // ── THE PER-MARK INSTRUMENT ────────────────────────────────────────────────────────────────
  //
  // The marks a BAR-FAMILY beat declared, each measured for how much of its own length is actually
  // painted, in a unit shared across every mark on the page. See this file's header for why a
  // fraction of the mark's own length would be the one reading that cannot see the defect.
  //
  // THE STEP IS ABSOLUTE AND SHARED. `STEP_DIVISIONS` divides the LONGEST mark, and every other mark
  // is walked in that same step, so a clip wipe standing at 40 % of the plot reports the identical
  // painted extent on a stem whose value is 12 and on one whose value is 3 — which is what an
  // instrument has to be able to say out loud before it can refuse it.
  //
  // THE BASELINE IS THE MARK'S OWN, read off `--e-ox`/`--e-oy` when the beat stated them (the `grow`
  // motion always does) and falling back to the near corner of the mark's own bounding box
  // otherwise. The fallback is what lets this instrument be pointed at a beat whose reveal is NOT
  // the per-mark one — which is the only way a mutation can prove the clause: strip the per-mark
  // growth, put the same declared marks under one clip, and the equality clause must go red.
  const markEls = Array.prototype.slice.call(
    document.querySelectorAll("[data-entrance-key]"),
  );
  const STEP_DIVISIONS = 40;
  const geometry = markEls.map((el) => {
    const cs = getComputedStyle(el);
    const box = el.getBBox(); // the element's OWN user units, before its own transform
    const sx = cs.getPropertyValue("--e-sx").trim();
    const axis = sx === "" ? (box.width >= box.height ? "x" : "y") : sx === "0" ? "x" : "y";
    const settled = axis === "x" ? box.width : box.height;
    const declaredOrigin = cs
      .getPropertyValue(axis === "x" ? "--e-ox" : "--e-oy")
      .trim();
    const low = axis === "x" ? box.x : box.y;
    const high = low + settled;
    // Which end the mark grows FROM. A declared origin names it exactly; without one, the end the
    // bounding box starts at, which is where a left-to-right or top-down reveal begins.
    const origin =
      declaredOrigin === ""
        ? low
        : Math.abs(parseFloat(declaredOrigin) - high) <
            Math.abs(parseFloat(declaredOrigin) - low)
          ? high
          : low;
    const tip = origin === high ? low : high;
    return { el, axis, settled, origin, tip, box };
  });
  const step =
    Math.max(1e-6, Math.max(0, ...geometry.map((g) => g.settled))) /
    STEP_DIVISIONS;
  const declaredMarks = geometry.map((g) => {
    const ctm = g.el.parentNode.getScreenCTM
      ? g.el.parentNode.getScreenCTM()
      : null;
    const cs = getComputedStyle(g.el);
    const matrix = cs.transform;
    const parts =
      matrix === "none"
        ? null
        : matrix
            .slice(matrix.indexOf("(") + 1, matrix.lastIndexOf(")"))
            .split(",")
            .map(Number);
    const scale = parts === null ? 1 : g.axis === "x" ? parts[0] : parts[3];
    let painted = 0;
    if (ctm && g.settled > 0) {
      const direction = g.tip >= g.origin ? 1 : -1;
      const across =
        g.axis === "x" ? g.box.y + g.box.height / 2 : g.box.x + g.box.width / 2;
      for (let d = step / 2; d < g.settled; d += step) {
        const along = g.origin + direction * d;
        const point = new DOMPoint(
          g.axis === "x" ? along : across,
          g.axis === "x" ? across : along,
        ).matrixTransform(ctm);
        if (document.elementsFromPoint(point.x, point.y).includes(g.el))
          painted += step;
      }
    }
    return {
      key: g.el.getAttribute("data-entrance-key"),
      axis: g.axis,
      settled: Math.round(g.settled * 100) / 100,
      painted: Math.round(Math.min(painted, g.settled) * 100) / 100,
      scale: Math.round(scale * 1000) / 1000,
    };
  });
  // The labels that STATE a mark's value, paired to their mark by name. The label rule is checked on
  // this pairing and not on "some label, some mark": in a cascade the first row's label is
  // legitimately painted while the last row's mark has not begun.
  const markLabels = Array.prototype.slice
    .call(document.querySelectorAll("[data-entrance-label]"))
    .map((el) => ({
      names: el.getAttribute("data-entrance-label"),
      opacity: Number(getComputedStyle(el).opacity),
    }));

  const dot = document.querySelector('[data-entrance-motion="land"]');
  const end = document.querySelector(".end-label");
  const figure = document.querySelector(".chart-figure");
  const layerOpacities = Array.prototype.slice
    .call(document.querySelectorAll("[data-entrance-motion]"))
    .map((el) => Number(getComputedStyle(el).opacity));
  return {
    scaleX: Math.round(scaleX * 1000) / 1000,
    hasClip: clip !== null,
    segsHit: hit,
    segsTotal: total,
    marks: declaredMarks,
    // The quantum of every painted reading on this page, published rather than re-derived: it is
    // the tolerance every comparison against a painted extent is entitled to, and a check that
    // invented its own (a mark's OWN settled/40) reported six short bars as unfinished on a page
    // that was complete.
    markStep: Math.round(step * 100) / 100,
    markLabels,
    dotWidth: dot ? Math.round(dot.getBoundingClientRect().width * 10) / 10 : null,
    endLabelOpacity: end ? Number(getComputedStyle(end).opacity) : null,
    headerOpacity: Number(getComputedStyle(document.querySelector(".chart-header")).opacity),
    minLayerOpacity: layerOpacities.length === 0 ? 1 : Math.min(...layerOpacities),
    transform: matrix,
    animations: document.getAnimations().length,
    entered: figure ? figure.classList.contains("entered") : false,
  };
};

/** One row per declared mark: its settled extent, and what was painted and scaled at every sample. */
function markSeries(samples) {
  return samples[0].marks.map((first) => ({
    key: first.key,
    axis: first.axis,
    settled: first.settled,
    painted: samples.map(
      (s) => (s.marks.find((m) => m.key === first.key) ?? {}).painted ?? null,
    ),
    scale: samples.map(
      (s) => (s.marks.find((m) => m.key === first.key) ?? {}).scale ?? null,
    ),
  }));
}

/**
 * What a per-mark reveal has to be true of, stated as arithmetic over the samples.
 *
 * The three clauses the clip instruments cannot express, plus the label rule paired mark by mark.
 * Each returns a sentence naming the numbers it read, because a failure whose message does not carry
 * its own evidence sends the next person back to the browser to find out what happened.
 */
function markFailures(samples, label) {
  const failures = [];
  const rows = markSeries(samples);
  // The quantum of the painted-extent reading — every mark is walked in this same step, so it is
  // also the tolerance every comparison against a painted extent is allowed. Published by the
  // reader rather than re-derived here, so the two can never disagree about it.
  const step = samples[0].markStep;
  const spread = (values) => Math.max(...values) - Math.min(...values);

  const keys = rows.map((r) => r.key);
  if (new Set(keys).size !== keys.length)
    failures.push(
      `${label}: two marks share a data-entrance-key (${keys.join(", ")}) — a label cannot be ` +
        `paired with the mark it names`,
    );

  // 1 — EACH MARK'S OWN EXTENT GROWS. Its own, not the picture's: this is the clause that separates
  // a mark arriving from a finished mark being uncovered or faded.
  for (const row of rows) {
    const painted = row.painted;
    if (painted.some((v) => v === null)) {
      failures.push(`${label}: mark ${row.key} vanished from the page mid-build`);
      continue;
    }
    if (!painted.every((v, i) => i === 0 || v >= painted[i - 1] - step))
      failures.push(
        `${label}: mark ${row.key} went backwards: ${painted.join(", ")} of ${row.settled}`,
      );
    if (painted[painted.length - 1] < row.settled - step)
      failures.push(
        `${label}: mark ${row.key} finished at ${painted[painted.length - 1]} of its own ` +
          `${row.settled} — the build must end on the settled graphic`,
      );
    if (Math.max(...row.scale) > 1.001)
      failures.push(
        `${label}: mark ${row.key} scaled past its own value (${row.scale.join(", ")}) — a mark that ` +
          `overshoots shows, for those frames, a reading the data does not contain`,
      );
    if (!row.scale.every((v, i) => i === 0 || v >= row.scale[i - 1] - 1e-9))
      failures.push(
        `${label}: mark ${row.key}'s own scale went backwards: ${row.scale.join(", ")}`,
      );
  }
  if (!rows.some((r) => r.painted[0] <= step))
    failures.push(
      `${label}: every one of the ${rows.length} marks already had extent at the first reading ` +
        `after entry (${rows.map((r) => `${r.key}=${r.painted[0]}`).join(", ")}) — nothing here is ` +
        `arriving, which is what an opacity fade over a finished picture measures like`,
    );
  // The SECOND instrument, independent of every hit test above: the marks' own transform matrices.
  // A reveal that uncovers finished marks — a clip, a mask, an opacity — leaves every one of these
  // at 1 for the whole build while the painted readings above still climb.
  if (!rows.some((r) => r.scale[0] <= 0.02) || !rows.every((r) => r.scale[r.scale.length - 1] === 1))
    failures.push(
      `${label}: no mark's own scale ran from nothing to whole (${rows
        .map((r) => `${r.key}:${r.scale[0]}→${r.scale[r.scale.length - 1]}`)
        .join(", ")}) — the marks are not growing, something else is uncovering them`,
    );

  // 2 — THEY DO NOT ALL ARRIVE ON ONE CLOCK. The cascade is the argument's order made visible; a
  // reveal that moves every mark together carries no order at all.
  const widest = Math.max(
    0,
    ...samples.map((s) =>
      spread(
        s.marks.map((m) => (m.settled > 0 ? m.painted / m.settled : 1)),
      ),
    ),
  );
  if (widest < 0.5)
    failures.push(
      `${label}: the widest spread between the marks' own progress at any one reading was ` +
        `${widest.toFixed(2)} — they arrive together, so the build states no order`,
    );

  // 3 — NO FRAME SHOWS THE MARKS ALL EQUAL UNLESS THEY REALLY ARE. **This is the clause the whole
  // motion exists for.** A left-to-right clip over a ranking leaves every stem exactly as long as
  // the wipe's own front, so for two thirds of the build the graphic asserts that all fifteen
  // countries are equal — measurable, and the reason the first lollipop entrance was reverted after
  // it had already been driven green by the two clip instruments.
  //
  // "Visible" is more than one step, so the opening frames — where nothing has arrived and every
  // mark reads zero — are not mistaken for a claim of equality. And it takes at least three marks,
  // and at least half of them, before an equal reading is called a claim rather than a coincidence
  // between two marks that happen to be crossing.
  for (let i = 0; i < samples.length; i++) {
    const visible = samples[i].marks.filter((m) => m.painted > step);
    if (visible.length < 3 || visible.length < samples[i].marks.length / 2) continue;
    if (spread(visible.map((m) => m.painted)) > step) continue;
    if (spread(visible.map((m) => m.settled)) <= 2 * step) continue;
    failures.push(
      `${label}: at reading ${i} all ${visible.length} visible marks were the same length ` +
        `(${visible.map((m) => m.painted).join(", ")}) while their own values are not ` +
        `(${visible.map((m) => m.settled).join(", ")}) — an intermediate frame is an assertion, and ` +
        `this one says they are equal`,
    );
    break;
  }

  // 4 — THE LABEL RULE, MARK BY MARK. Paired by name, because in a cascade the first mark's label is
  // legitimately painted while the last mark has not started; "some label is up and some mark is
  // still growing" cannot tell those apart.
  const settledOf = new Map(rows.map((r) => [r.key, r.settled]));
  for (const orphan of samples[0].markLabels.filter(
    (l) => !settledOf.has(l.names),
  ))
    failures.push(
      `${label}: a label names the mark "${orphan.names}", which no element declares — the label ` +
        `rule cannot be checked on it`,
    );
  for (let i = 0; i < samples.length; i++)
    for (const l of samples[i].markLabels) {
      const mark = samples[i].marks.find((m) => m.key === l.names);
      if (!mark || l.opacity <= 0.02) continue;
      // BOTH instruments, and each is here for a different failure. The mark's own SCALE is exact
      // and answers the per-mark question directly, which the painted extent cannot on a bar shorter
      // than the shared step — six of this beat's twenty-seven are. The PAINTED extent is what
      // catches a reveal that is not a per-mark growth at all, where every scale sits at 1 and only
      // what is on the screen changes.
      if (mark.scale < 0.9 || mark.painted < 0.9 * mark.settled - step) {
        failures.push(
          `${label}: at reading ${i} the label for ${l.names} was painted (opacity ${l.opacity}) ` +
            `while its own mark was ${mark.painted} of ${mark.settled} — a value label may not ` +
            `appear before the mark it names has arrived`,
        );
        i = samples.length;
        break;
      }
    }

  return failures;
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const outDir = argv.includes("--out") ? resolve(flag("--out")) : null;

let file = flag("--file", null);
if (!file) {
  const { outPath } = await render({
    dataPath: join(HERE, "../assets/sample-data/rainfall.json"),
    outDir: "/tmp/entrance-verify",
  });
  file = outPath;
}
const html = belowTheFold(readFileSync(resolve(file), "utf8"));

const failures = [];
const report = { file: resolve(file), passes: {} };
const check = (ok, message) => {
  if (!ok) failures.push(message);
  return ok;
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const VIEWPORTS = [
  { width: 1280, height: 800, label: "1280x800" },
  { width: 375, height: 812, label: "375x812" },
];

try {
  for (const vp of VIEWPORTS) {
    // ── pass 1: scripting on, below the fold ────────────────────────────────────────────────
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "load" });

      const beforeScroll = await page.evaluate(READ);
      check(
        beforeScroll.entered === false && beforeScroll.scaleX === 1,
        `${vp.label}: the entrance had already started before the figure was scrolled into view ` +
          `(entered=${beforeScroll.entered}, scaleX=${beforeScroll.scaleX}) — it must fire on view, not on load`,
      );

      const samples = [];
      await page.evaluate(() => {
        document.querySelector(".chart-figure").scrollIntoView({ block: "center" });
      });
      // Sampling starts when the CLASS LANDS, not when the scroll is requested. An
      // `IntersectionObserver` callback is delivered in a later task, so a first sample taken
      // straight after the scroll reads the settled page and looks exactly like a defect — which is
      // how this line came to be written rather than assumed.
      await page.waitForFunction(
        () => document.querySelector(".chart-figure").classList.contains("entered"),
        { timeout: 5000 },
      );
      for (let i = 0; i < 16; i++) {
        const sample = await page.evaluate(READ);
        samples.push(sample);
        if (outDir && [1, 4, 7, 15].includes(i)) {
          await mkdir(outDir, { recursive: true });
          await page.screenshot({ path: join(outDir, `${vp.label}-playing-${i}.png`) });
        }
        await new Promise((r) => setTimeout(r, 130));
      }
      const fronts = samples.map((s) => s.scaleX);
      const hits = samples.map((s) => s.segsHit);
      const markKeys = samples[0].marks.map((m) => m.key);
      report.passes[`${vp.label}/playing`] = {
        fronts,
        hits,
        marks: markKeys.length > 0 ? markSeries(samples) : undefined,
        samples,
      };

      // A page's reveal is measured by whichever instrument its own mechanism is visible to, and it
      // must be visible to at least one — a beat whose reveal is neither a clip nor a set of
      // declared marks is a beat this file cannot say anything about, which is worse than a
      // failure because it reads as a pass.
      check(
        samples[0].hasClip || markKeys.length > 0,
        `${vp.label}: the page declares an entrance but neither a clip wipe nor a single ` +
          `[data-entrance-key] mark — nothing here can measure whether its reveal builds`,
      );

      if (samples[0].hasClip) {
        check(
          new Set(fronts).size >= 4,
          `${vp.label}: the wipe took ${new Set(fronts).size} distinct value(s) across the build ` +
            `(${fronts.join(", ")}) — a reveal that is an opacity fade over a finished picture looks ` +
            `exactly like this`,
        );
        check(
          fronts[0] < 0.35 && fronts[fronts.length - 1] === 1,
          `${vp.label}: the wipe ran ${fronts[0]} → ${fronts[fronts.length - 1]}; it must start at ` +
            `nothing and finish whole`,
        );
        check(
          fronts.every((v, i) => i === 0 || v >= fronts[i - 1]),
          `${vp.label}: the wipe went backwards: ${fronts.join(", ")}`,
        );
        check(
          new Set(hits).size >= 3 && hits[0] < hits[hits.length - 1] &&
            hits[hits.length - 1] === samples[0].segsTotal,
          `${vp.label}: segments hit-testable went ${hits.join(", ")} of ${samples[0].segsTotal} — ` +
            `the curve must be genuinely uncovered, not merely faded in`,
        );
        // THE LABEL RULE, driven: the conclusion is the subject's own value in words, and it may not
        // be painted while the mark carrying it is still arriving.
        const arriving = samples.filter((s) => s.dotWidth !== null && s.dotWidth > 0.5 && s.scaleX < 1);
        check(
          arriving.every((s) => s.endLabelOpacity === null || s.endLabelOpacity < 0.02),
          `${vp.label}: the end label was painted while the curve was still drawing — a value label ` +
            `may not appear before the mark it names has arrived`,
        );
      }

      if (markKeys.length > 0) for (const f of markFailures(samples, vp.label)) check(false, f);
      await page.close();
    }

    // ── pass 2: prefers-reduced-motion: reduce ─────────────────────────────────────────────
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => {
        document.querySelector(".chart-figure").scrollIntoView({ block: "center" });
      });
      // The FIRST reading after entry, with no settling wait at all: under `reduce` there is no
      // intermediate state to miss, because there is no animation to be part-way through.
      const first = await page.evaluate(READ);
      await new Promise((r) => setTimeout(r, 400));
      const later = await page.evaluate(READ);
      report.passes[`${vp.label}/reduced-motion`] = { first, later };
      if (outDir) {
        await mkdir(outDir, { recursive: true });
        await page.screenshot({ path: join(outDir, `${vp.label}-reduced-motion.png`) });
      }
      check(
        first.animations === 0 && later.animations === 0,
        `${vp.label}: ${first.animations} animation(s) on entry and ${later.animations} after it ` +
          `resolved under prefers-reduced-motion: reduce — the keyframes must not exist there at all`,
      );
      check(
        first.scaleX === 1 && first.segsHit === first.segsTotal,
        `${vp.label}: under reduce the first reading after entry was scaleX=${first.scaleX}, ` +
          `${first.segsHit}/${first.segsTotal} segments — the finished graphic must appear ` +
          `immediately, with no intermediate frame`,
      );
      // The same claim for a per-mark reveal, and it needs its own sentence: `scaleX` is 1 on a page
      // that has no clip at all, so the clause above passes vacuously on every bar-family beat.
      const unarrived = first.marks.filter(
        (m) => m.scale !== 1 || m.painted < m.settled - first.markStep,
      );
      check(
        unarrived.length === 0,
        `${vp.label}: under reduce ${unarrived.length} mark(s) were still part-way at the first ` +
          `reading after entry (${unarrived
            .map((m) => `${m.key}=${m.painted}/${m.settled} scale ${m.scale}`)
            .join(", ")}) — the finished graphic must appear immediately`,
      );
      check(
        first.headerOpacity === 1 && (first.endLabelOpacity === null || first.endLabelOpacity === 1),
        `${vp.label}: under reduce something was still transparent (header ${first.headerOpacity}, ` +
          `end label ${first.endLabelOpacity})`,
      );
      await page.close();
    }

    // ── pass 3: JavaScript disabled ────────────────────────────────────────────────────────
    {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "load" });
      // `page.evaluate` needs scripting; the measurements come back through CDP's own evaluator
      // instead, which is not the page's JavaScript. It is the SAME reader the other two passes use
      // — it used to be a smaller hand-written copy, which is how a per-mark reveal could have shipped
      // with nothing checking the marks here at all.
      //
      // AND THE FIGURE IS SCROLLED TO FIRST, which the old copy did not need and this one does:
      // `elementsFromPoint` answers about the VIEWPORT, and the harness deliberately puts this file
      // two screens down. Reading it where it sits reported every mark at zero painted extent on a
      // page that is in fact complete — a false failure, and the first thing the per-mark instrument
      // said when it was pointed here.
      await page.$eval(".chart-figure", (figure) =>
        figure.scrollIntoView({ block: "center" }),
      );
      const noJs = await page.$eval(".chart-figure", READ);
      noJs.minOpacity = noJs.minLayerOpacity;
      report.passes[`${vp.label}/no-js`] = noJs;
      if (outDir) {
        await mkdir(outDir, { recursive: true });
        await page.screenshot({ path: join(outDir, `${vp.label}-no-js.png`) });
      }
      check(
        noJs.entered === false && noJs.animations === 0,
        `${vp.label}: with JavaScript disabled the figure was ${noJs.entered ? "" : "not "}entered ` +
          `and ${noJs.animations} animation(s) were running`,
      );
      check(
        noJs.minOpacity === 1 && noJs.transform === "none",
        `${vp.label}: with JavaScript disabled a layer was at opacity ${noJs.minOpacity} / ` +
          `transform ${noJs.transform} — the settled page must be complete`,
      );
      const short = noJs.marks.filter(
        (m) => m.scale !== 1 || m.painted < m.settled - noJs.markStep,
      );
      check(
        short.length === 0,
        `${vp.label}: with JavaScript disabled ${short.length} mark(s) were not at their own full ` +
          `length (${short.map((m) => `${m.key}=${m.painted}/${m.settled}`).join(", ")}) — a mark ` +
          `must never need the entrance to be readable`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (outDir) {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 1));
}

for (const [name, pass] of Object.entries(report.passes))
  if (pass.fronts) {
    console.log(`${name}  wipe ${pass.fronts.join(" ")}  segments ${pass.hits.join(" ")}`);
    // The per-mark readings are the evidence a bar-family beat rests on, so they are printed rather
    // than left in the report file: a reader has to be able to see that the marks did NOT move
    // together, and that no column of this table is flat across the marks.
    for (const row of pass.marks ?? [])
      console.log(
        `${name}    ${row.key} (${row.axis}, ${row.settled})  painted ${row.painted.join(" ")}`,
      );
  } else if (pass.first)
    console.log(`${name}  animations ${pass.first.animations}  wipe ${pass.first.scaleX}  segments ${pass.first.segsHit}/${pass.first.segsTotal}  marks ${pass.first.marks.length}`);
  else console.log(`${name}  entered ${pass.entered}  animations ${pass.animations}  transform ${pass.transform}  min opacity ${pass.minOpacity}  marks ${pass.marks.length}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nentrance verified — ${Object.keys(report.passes).length} passes, 0 failures`);
