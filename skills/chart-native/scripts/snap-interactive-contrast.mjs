// skills/chart-native/scripts/snap-interactive-contrast.mjs
// Render-time WCAG guard: every <text> in the built INTERACTIVE chart must clear
// 4.5:1 against its REAL background — the interactive-render counterpart of
// snap-contrast.mjs (the static-build guard). *Chart.tsx renders the SAME axis/
// value/direct labels in interactive mode as in static (InteractiveLineChart etc.
// just wrap the static component with the responsive/reveal shell — see mount.tsx),
// so a mark-coloured label (vermillion 3.87:1, orange 2.25:1) is exactly as real a
// bug on the interactive dist as on the static one.
//
// Why this script exists as a SEPARATE guard rather than a mode of snap-contrast.mjs:
// the single-format-produce-export redesign made produce.mjs build ONLY the
// requested format — for "interactive" it no longer builds the static dist at all,
// so snap-contrast.mjs (which reads dist/<chart>/static) has nothing to check and
// was simply never called on that path. Article-web interactive is the most common
// delivery path, so a low-contrast label there was shipping unguarded. This script
// closes that gap by running the SAME WCAG-sampling engine (./lib/sample-text-
// contrast.mjs, extracted from snap-contrast.mjs) against the interactive dist
// instead — reusing the exact detection logic, not reinventing it.
//
// Loading model: unlike the static dist (separate module scripts → needs an http
// server, see snap-contrast.mjs), the interactive dist is a SINGLE self-contained
// file (vite-plugin-singlefile, see vite.config.ts's `interactive` branch) — so it
// opens directly over file://, the same way snap-tooltip-contrast.mjs and
// snap-tooltip-viewport.mjs already do for this dist.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { worstContrast, MIN_CONTRAST } from "../src/core/contrast-scan.ts";
import { chartDistSub } from "../src/build-paths.ts";
import { sampleTextContrast } from "./lib/sample-text-contrast.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chartDistSub(chart, "interactive"));

// F2 — policy (b), identical to snap-contrast.mjs: a label painted in one of the
// journalist's own brand colours that fails WCAG is a RECORDED render-review
// concern, not a hard failure. Any other low-contrast label — the auto path —
// still fails the run. Empty (no brand profile) → strict, as before.
const brandColors = new Set(
  (process.env.BRAND_EXPLICIT_COLORS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(dist, "index.html")).href);
await page.waitForSelector("svg");
// Unlike the static build (fixed at progress=1), the interactive build plays a REAL
// intro reveal (InteractiveChart's rAF clock — see core/InteractiveChart.tsx) before
// its labels reach final opacity/position. Most types default durationMs=2000; a
// handful (beeswarm, bump, calendar, chord, sankey, sunburst, streamgraph) run
// 2200ms. Wait past the slowest of those with margin so every sample is taken at a
// fully-settled progress=1, matching snap-contrast.mjs's "final frame" guarantee —
// sampling mid-reveal could catch a label at a transient (not shipped) position.
await page.waitForTimeout(2500);

// Same sampling engine snap-contrast.mjs uses (./lib/sample-text-contrast.mjs) — for
// every visible <text>, hide the glyph and sample the real background behind it at 3
// points, worst-case. Contrast is computed in node below.
const samples = await page.evaluate(sampleTextContrast);

await browser.close();

const violations = [];
const concerns = [];
for (const s of samples) {
  const worst = worstContrast(s.fill, s.bgs);
  if (worst >= MIN_CONTRAST) continue;
  const flagged = { ...s, worst: Number(worst.toFixed(2)) };
  // A failing label in a brand-explicit fill is downgraded to a concern (policy b).
  if (brandColors.has(s.fill.toUpperCase())) concerns.push(flagged);
  else violations.push(flagged);
}

console.log(JSON.stringify({ chart, checked: samples.length, violations, concerns }, null, 2));
if (concerns.length) {
  console.log(
    `[snap-interactive-contrast ${chart}] ${concerns.length} brand label(s) below ${MIN_CONTRAST}:1 — kept per the newsroom's house style (render-review concern, policy b).`,
  );
}
if (violations.length) {
  console.error(`[snap-interactive-contrast ${chart}] ${violations.length} text label(s) below ${MIN_CONTRAST}:1 WCAG contrast`);
  process.exit(1);
}
console.log(`[snap-interactive-contrast ${chart}] OK — ${samples.length} labels clear ${MIN_CONTRAST}:1${concerns.length ? ` (${concerns.length} brand concern[s] kept)` : ""}.`);
