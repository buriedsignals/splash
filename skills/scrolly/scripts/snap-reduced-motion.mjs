// skills/scrolly/scripts/snap-reduced-motion.mjs
// Render-time guard: WCAG 2.3.3 (Animation from Interactions), scrolly variant. Loads
// the built scrolly.html under an emulated `prefers-reduced-motion: reduce` and asserts:
//   (a) the sticky graphic shows a real informational end-state (not blank) on the
//       LAST step (the takeaway — what a reader who jumps straight to the end gets).
//   (b) nothing keeps animating after a genuine mid-story transition — two state
//       snapshots ~900ms apart (comfortably inside what would have been a 1200ms
//       camera flight, cf. scrolly-camera.ts's FLIGHT_DURATION, or a 600ms image
//       crossfade) must match. NOTE for the map track: the establish and takeaway
//       beats are often the SAME full-extent camera by narrative design (scrolly-
//       camera.ts's own comment: "an establish/takeaway transition ... widens to
//       [the extent]") — testing the last step's transition would be a no-op that
//       proves nothing. WHICH transition to test is therefore read off the story
//       itself: every step's settled camera is sampled first, and the pair that
//       actually moves nearest the middle is the one put under test. See
//       src/reduced-motion-verdict.ts for what that replaced and why.
// Track-agnostic: probes whichever of the three sticky-graphic kinds (map / chart /
// image) the built config produced, detected at runtime.
//   - map   (window.__map__, exposed by every Scrolly*Map component): camera
//     {center,zoom} must be identical at both snapshots — a live flyTo would have
//     moved it partway through a 1200ms flight; jumpTo (the reduced-motion path in
//     scrolly-camera.ts) is synchronous.
//   - image (ScrollyImage's crossfading <img> frames): the same single frame must be
//     the visible (opacity 1) one at both snapshots, and its CSS transition must be
//     "none" (ScrollyImage's hard-cut branch).
//   - chart (chart-native LineChart/BarChart/ScatterChart, embedded mode): the sticky
//     <svg> must contain actual drawn marks (not just axes) and stay byte-identical
//     across the two snapshots — chart-scrolly reveal is scroll-position-driven, never
//     timer-driven, so it is expected to already be static once scrolling stops.
// Env: SERVE_DIR (default <root>/dist).
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  chooseReducedMotionTransition,
  STILL_STORY_NOTE,
} from "../src/reduced-motion-verdict.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = process.env.SERVE_DIR ?? join(root, "dist");
const url = pathToFileURL(join(dist, "index.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 900, height: 700 },
  reducedMotion: "reduce",
});
await page.goto(url);

const steps = page.locator("[data-step-index]");
await steps.first().waitFor({ timeout: 15_000 });
const stepCount = await steps.count();
if (stepCount === 0) {
  console.error("[snap-reduced-motion scrolly] no scroll steps found — scrolly build broken");
  process.exit(1);
}

const track = await page.evaluate(() => {
  if (window.__map__) return "map";
  const sticky = document.querySelector('[data-testid="scrolly-sticky-graphic"]');
  if (sticky?.querySelector("img")) return "image";
  return "chart";
});

// Map track only: `window.__map__` is assigned right after construction, well before
// MapTiler's real network tile/style load resolves. Without waiting for that load, an
// early snapshot would race real network latency instead of the reduced-motion
// contract — catching a still-loading map (default constructor camera) and mistaking
// its later, ONE-TIME instant jumpTo (once loading finishes) for a lingering flyTo
// animation. Wait for the map to be genuinely ready first.
if (track === "map") {
  await page.waitForFunction(() => window.__map__?.loaded?.(), undefined, {
    timeout: 30_000,
  });
}

async function snapshotMap() {
  return page.evaluate(() => {
    const m = window.__map__;
    const c = m.getCenter();
    return {
      lng: Math.round(c.lng * 1e6) / 1e6,
      lat: Math.round(c.lat * 1e6) / 1e6,
      zoom: Math.round(m.getZoom() * 1e6) / 1e6,
      canvasNonBlank: (() => {
        const canvas = m.getCanvas();
        return canvas.width > 0 && canvas.height > 0;
      })(),
    };
  });
}

async function snapshotImage() {
  return page.evaluate(() => {
    const imgs = Array.from(
      document.querySelectorAll('[data-testid="scrolly-sticky-graphic"] img'),
    );
    const active = imgs.findIndex((img) => getComputedStyle(img).opacity === "1");
    const transitions = imgs.map((img) => getComputedStyle(img).transitionDuration);
    return { active, count: imgs.length, transitions };
  });
}

async function snapshotChart() {
  return page.evaluate(() => {
    const sticky = document.querySelector('[data-testid="scrolly-sticky-graphic"]');
    const svg = sticky?.querySelector("svg");
    if (!svg) return { markCount: 0, html: null };
    const markCount = svg.querySelectorAll("path,rect,circle,line,polygon").length;
    return { markCount, html: svg.outerHTML };
  });
}

const snapshot = track === "map" ? snapshotMap : track === "image" ? snapshotImage : snapshotChart;
const goToStep = (idx) => steps.nth(idx).scrollIntoViewIfNeeded();

const violations = [];
let before, after, endState, verdict;

if (track === "map") {
  // WHICH pair to test is read off the story, not guessed from the step count. Walk every
  // step once and record where its camera settles. Each settle is generous enough for the
  // 1200ms flight this build would perform if it were IGNORING reduced motion — and the
  // error direction is safe either way: a scan that caught a camera mid-flight would report
  // MORE distinct steps, never fewer, so it can only send the timing assertion below to a
  // real transition, never hide one.
  const settledCameras = [];
  for (let i = 0; i < stepCount; i++) {
    await goToStep(i);
    await page.waitForTimeout(1400);
    settledCameras.push(await snapshot());
  }
  verdict = chooseReducedMotionTransition(settledCameras);

  if (verdict.kind === "still") {
    // Not a violation, and not something to paper over either: every step of this story
    // frames the same box, so there is no flight whose lingering could be tested. Say so.
    console.log(`[snap-reduced-motion scrolly] STILL STORY — ${STILL_STORY_NOTE}.`);
    before = after = settledCameras[0];
  } else {
    const { from, to } = verdict;
    // Settle fully on the step BEFORE the one under test — this just establishes the
    // natural "from" camera the app would have, not part of the timing assertion.
    await goToStep(from);
    await page.waitForTimeout(1400);
    const baseline = await snapshot();

    // Trigger the transition under test, then sample twice: almost immediately (would
    // catch mid-flight motion) and again ~900ms later.
    await goToStep(to);
    await page.waitForTimeout(80);
    before = await snapshot();
    await page.waitForTimeout(900);
    after = await snapshot();

    // The scan said this pair moves. Re-confirm it on the pair actually under test (extra
    // margin past a full 1200ms flight): if it does not move here, the two passes disagree
    // and the timing check below proved nothing — report that rather than rubber-stamp it.
    await page.waitForTimeout(500);
    const settled = await snapshot();
    const moved =
      settled.lng !== baseline.lng || settled.lat !== baseline.lat || settled.zoom !== baseline.zoom;
    if (!moved) {
      violations.push(
        `step ${to} settled on step ${from}'s camera (${JSON.stringify(baseline)}) on the second pass, after moving away from it on the first — the map is not landing on the same frame twice for the same step, so nothing about lingering animation could be tested here`,
      );
    } else if (before.lng !== after.lng || before.lat !== after.lat || before.zoom !== after.zoom) {
      violations.push(
        `camera kept moving after settling under reduced motion (before=${JSON.stringify(before)} after=${JSON.stringify(after)}) — flyTo is not honoring prefers-reduced-motion`,
      );
    }
  }

  // Informational end-state: the LAST step (takeaway) must render, not blank.
  await goToStep(stepCount - 1);
  await page.waitForTimeout(300);
  endState = await snapshot();
  if (!endState.canvasNonBlank) {
    violations.push("map canvas has zero size on the takeaway step — appears blank under reduced motion");
  }
} else {
  await goToStep(stepCount - 1);
  await page.waitForTimeout(300); // let the IntersectionObserver callback + the
  // (instant, reduced-motion) reveal/crossfade settle before the first snapshot.
  before = await snapshot();
  await page.waitForTimeout(900);
  after = await snapshot();
  endState = before;

  if (track === "image") {
    if (before.count === 0) {
      violations.push("no image frames found — image scrolly appears blank");
    } else if (before.active === -1) {
      violations.push(
        "no frame is fully visible (opacity 1) on the takeaway step — appears blank under reduced motion",
      );
    }
    if (before.transitions.some((t) => t !== "0s")) {
      violations.push(
        `expected transition:none (computed duration 0s) on every frame under reduced motion, got ${JSON.stringify(before.transitions)}`,
      );
    }
    if (before.active !== after.active) {
      violations.push(
        `visible frame changed with no user interaction (before=${before.active} after=${after.active}) — a lingering crossfade is still running`,
      );
    }
  } else {
    if (before.markCount === 0) {
      violations.push(
        "no drawn marks (path/rect/circle/line/polygon) in the sticky chart — appears blank under reduced motion",
      );
    }
    if (before.html !== after.html) {
      violations.push(
        "the chart's sticky <svg> kept mutating after settling under reduced motion — a reveal/transition is not honoring the OS setting",
      );
    }
  }
}

await browser.close();

console.log(JSON.stringify({ track, stepCount, verdict, before, after, endState }, null, 2));

if (violations.length) {
  console.error("[snap-reduced-motion scrolly] FAIL:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`[snap-reduced-motion scrolly] OK — ${track} track shows its end-state and stays stable under reduced motion.`);
