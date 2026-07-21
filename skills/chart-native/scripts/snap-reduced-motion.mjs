// skills/chart-native/scripts/snap-reduced-motion.mjs
// Render-time guard: WCAG 2.3.3 (Animation from Interactions). The INTERACTIVE build's
// intro reveal (core/InteractiveChart.tsx) is a 2000ms rAF tween triggered on scroll-
// into-view; under `prefers-reduced-motion: reduce` it must skip straight to progress=1
// on first paint — a reduced-motion reader gets the full chart immediately, not a blank
// plot area waiting for a reveal it will never be shown playing. This asserts that
// contract against the ACTUAL built dist (not the source), the same way snap-tooltip-
// viewport/snap-tooltip-contrast assert their interaction contracts render-time:
//   (a) informational end-state, immediately — mark elements exist on first paint, no
//       reveal-settle wait.
//   (b) no long-running/looping animation — two DOM snapshots of the chart's own <svg>
//       taken ~900ms apart (well inside what would have been the 2000ms reveal window)
//       must be byte-identical; any mutation means something is still animating despite
//       the OS setting.
// Env: CHART (default "line").
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chartDistSub } from "../src/build-paths.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chartDistSub(chart, "interactive"));

const browser = await chromium.launch();
// Context-level `reducedMotion` emulates prefers-reduced-motion BEFORE any script on
// the page runs — the exact signal window.matchMedia("(prefers-reduced-motion:
// reduce)") reads inside InteractiveChart on its very first render (lib/core/motion.ts).
const page = await browser.newPage({
  viewport: { width: 900, height: 560 },
  reducedMotion: "reduce",
});
await page.goto(pathToFileURL(join(dist, "index.html")).href);
await page.waitForSelector("svg");

// (a) informational end-state, immediately — no reveal-settle wait. A non-reduced
// build needs ~1700ms before its marks finish drawing; a reduced-motion reader must
// see them on first paint. Mirrors snap-tooltip-viewport's universal mark selector
// (role="img" + tabindex="0" is wired by every *Chart.tsx, works across all types).
const marks = page.locator('[role="img"][tabindex="0"]');
const markCount = await marks.count();

const snapshotSvg = () =>
  page.locator("svg").first().evaluate((el) => el.outerHTML);
const svgAtLoad = await snapshotSvg();

// (b) no long-running/looping animation — sample again partway through what would
// have been the non-reduced reveal window. A live rAF loop (a reveal that ignored
// prefers-reduced-motion) would have mutated marker geometry/opacity by now.
await page.waitForTimeout(900);
const svgAfterWait = await snapshotSvg();

await browser.close();

const stable = svgAtLoad === svgAfterWait;
console.log(
  JSON.stringify({ chart, markCount, stable }, null, 2),
);

const violations = [];
if (markCount === 0) {
  violations.push(
    'no [role="img"][tabindex="0"] marks found on first paint — the chart appears blank under reduced motion (informational end-state missing)',
  );
}
if (!stable) {
  violations.push(
    "the chart's <svg> kept mutating after load under prefers-reduced-motion: reduce — a reveal/transition is not honoring the OS setting",
  );
}

if (violations.length) {
  console.error(`[snap-reduced-motion ${chart}] FAIL:`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(
  `[snap-reduced-motion ${chart}] OK — ${markCount} mark(s) render immediately, no animation after load under reduced motion.`,
);
