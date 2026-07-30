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
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { worstContrast, MIN_CONTRAST, wcagMinContrast } from "../src/core/contrast-scan.ts";
import { chartDistSub } from "../src/build-paths.ts";
import { sampleTextContrast } from "./lib/sample-text-contrast.mjs";
import { groundOf } from "./lib/ground-of.mjs";
import { snapViewportFor, STATIC_DEVICE_SCALE } from "./lib/snap-viewport.mjs";
import {
  checkFurnitureI18n,
  collectFurnitureI18n,
  furnitureGateApplies,
} from "./lib/furniture-i18n.mjs";
import { lateRefusalSentence, recordLateRefusal } from "../../splash/src/late-refusal.ts";

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
const viewport = snapViewportFor(process.env.SPLASH_CHANNEL);
const page = await browser.newPage({ viewport, deviceScaleFactor: STATIC_DEVICE_SCALE });
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

// The interactive dist FLOWS taller than its plot box (header + source footer sit outside the
// height-constrained div, ChartFrame.tsx:188-215 and :225-247). Clipping there is the exact
// false-positive class snap-proof.mjs:83-90 records. Grow the window to the document.
const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
if (docHeight > viewport.height)
  await page.setViewportSize({ width: viewport.width, height: docHeight });

// Same sampling engine snap-contrast.mjs uses (./lib/sample-text-contrast.mjs) — for
// every visible <text>, hide the glyph and sample the real background behind it at 3
// points, worst-case. Contrast is computed in node below.
const ground = groundOf(process.env.CONFIG);
const samples = await page.evaluate(sampleTextContrast, ground);

// i18n FURNITURE GATE (P5) — same engine as snap-contrast.mjs, on THIS already-
// loaded interactive page (the most common delivery path): a non-English config's
// rendered furniture must carry the localized "Source" label, no English caption,
// no English-grouped numbers. CONFIG is what produce.mjs threads to every snap;
// manual runs without it skip the gate (English furniture is correct then).
const configPath = process.env.CONFIG;
const lang = configPath
  ? JSON.parse(await readFile(configPath, "utf8")).lang
  : undefined;
const i18nViolations = furnitureGateApplies(lang)
  ? checkFurnitureI18n(await page.evaluate(collectFurnitureI18n), lang)
  : [];

await browser.close();

const violations = [];
const concerns = [];
for (const s of samples) {
  const worst = worstContrast(s.fill, s.bgs);
  // WCAG SC 1.4.3: large text (≥24px, or ≥18.66px bold) is conformant at 3:1, not
  // 4.5:1 (see snap-contrast.mjs) — same per-sample floor on the interactive dist.
  const min = wcagMinContrast(s.fontPx ?? 0, s.bold ?? false);
  if (worst >= min) continue;
  const flagged = { ...s, worst: Number(worst.toFixed(2)), min };
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
  const r = {
    guard: "snap-interactive-contrast",
    subject: `${chart}/interactive`,
    reason: `${violations.length} text label(s) below ${MIN_CONTRAST}:1 against the page's real ground`,
    deviation:
      "raise the contrast of the failing label (a darker/lighter ink, or a different house " +
      "ground), then produce again — this is measured on the render, so it cannot be told at the offer",
  };
  console.error(lateRefusalSentence(r));
  // Named FIELDS, not the object — same defect and same shape as snap-contrast.mjs's
  // list (which see): `${v}` on a sample printed "✗ [object Object]".
  for (const v of violations)
    console.error(
      `  ✗ "${v.text}" (${v.fill}, ${v.fontPx}px${v.bold ? " bold" : ""}) — ${v.worst}:1 < ${v.min}:1`,
    );
  if (process.env.OUTDIR) recordLateRefusal(process.env.OUTDIR, r);
  process.exit(1);
}
if (i18nViolations.length) {
  console.error(`[snap-interactive-contrast ${chart}] i18n furniture gate (lang "${lang}") — ${i18nViolations.length} violation(s):`);
  for (const v of i18nViolations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`[snap-interactive-contrast ${chart}] OK — ${samples.length} labels clear their WCAG floor (${MIN_CONTRAST}:1, or 3:1 for large-scale text)${concerns.length ? ` (${concerns.length} brand concern[s] kept)` : ""}${furnitureGateApplies(lang) ? `; i18n furniture OK (lang "${lang}")` : ""}.`);
