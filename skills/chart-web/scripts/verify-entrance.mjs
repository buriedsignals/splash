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
import puppeteer from "puppeteer-core";
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
  const segs = Array.prototype.slice.call(document.querySelectorAll(".seg"));
  let hit = 0;
  for (const seg of segs) {
    const r = seg.getBoundingClientRect();
    const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (stack.includes(seg)) hit += 1;
  }
  const dot = document.querySelector('[data-entrance-motion="land"]');
  const end = document.querySelector(".end-label");
  const figure = document.querySelector(".chart-figure");
  return {
    scaleX: Math.round(scaleX * 1000) / 1000,
    segsHit: hit,
    segsTotal: segs.length,
    dotWidth: dot ? Math.round(dot.getBoundingClientRect().width * 10) / 10 : null,
    endLabelOpacity: end ? Number(getComputedStyle(end).opacity) : null,
    headerOpacity: Number(getComputedStyle(document.querySelector(".chart-header")).opacity),
    animations: document.getAnimations().length,
    entered: figure ? figure.classList.contains("entered") : false,
  };
};

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
      report.passes[`${vp.label}/playing`] = { fronts, hits, samples };

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
      // instead, which is not the page's JavaScript.
      const noJs = await page.$eval(".chart-figure", (figure) => {
        const segs = Array.prototype.slice.call(document.querySelectorAll(".seg"));
        const end = document.querySelector(".end-label");
        const clip = document.querySelector('[data-entrance-motion="wipe"][width]');
        const matrix = clip ? getComputedStyle(clip).transform : "none";
        return {
          entered: figure.classList.contains("entered"),
          animations: document.getAnimations().length,
          transform: matrix,
          minOpacity: Math.min(
            ...Array.prototype.slice
              .call(document.querySelectorAll("[data-entrance-motion]"))
              .map((el) => Number(getComputedStyle(el).opacity)),
          ),
          segs: segs.length,
          endLabelOpacity: end ? Number(getComputedStyle(end).opacity) : null,
        };
      });
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
  if (pass.fronts) console.log(`${name}  wipe ${pass.fronts.join(" ")}  segments ${pass.hits.join(" ")}`);
  else if (pass.first) console.log(`${name}  animations ${pass.first.animations}  wipe ${pass.first.scaleX}  segments ${pass.first.segsHit}/${pass.first.segsTotal}`);
  else console.log(`${name}  entered ${pass.entered}  animations ${pass.animations}  transform ${pass.transform}  min opacity ${pass.minOpacity}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nentrance verified — ${Object.keys(report.passes).length} passes, 0 failures`);
