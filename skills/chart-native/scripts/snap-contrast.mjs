// skills/chart-native/scripts/snap-contrast.mjs
// Render-time WCAG guard: every <text> in the built STATIC chart must clear 4.5:1
// against its REAL background (the mark/paper behind it, sampled from the live DOM).
// Catches "value label painted in the mark colour" (vermillion 3.87:1, orange
// 2.25:1) mechanically for ALL chart types — the systemic backstop a hand-passed
// textColors guard misses. Wired into produce.mjs after snap-proof; a violation
// fails the run before export.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { worstContrast, MIN_CONTRAST } from "../src/core/contrast-scan.ts";
import { chartDistSub } from "../src/build-paths.ts";
import { sampleTextContrast } from "./lib/sample-text-contrast.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chartDistSub(chart, "static"));

// F2 — policy (b): fills the journalist set via the brand profile. A label painted
// in one of these that fails WCAG is a RECORDED render-review concern, not a hard
// failure (the newsroom keeps its house colour). Any other low-contrast label — the
// auto path — still fails the run. Empty (no brand profile) → strict, as before.
const brandColors = new Set(
  (process.env.BRAND_EXPLICIT_COLORS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

// serve over http (module scripts get crossorigin -> blocked over file://)
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join(dist, p));
    res.writeHead(200, { "content-type": mime[p.slice(p.lastIndexOf("."))] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector("svg");
await page.waitForTimeout(2100); // let the reveal settle to progress=1

// In-page: for every visible <text>, sample the real background behind it at 3
// points (glyph hidden first), returning {text, fill, bgs[]}. Contrast is computed
// in node with the shared helper. The sampler itself lives in ./lib/sample-text-
// contrast.mjs, shared with snap-interactive-contrast.mjs (same engine, different dist).
const samples = await page.evaluate(sampleTextContrast);

await browser.close();
server.close();

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
    `[snap-contrast ${chart}] ${concerns.length} brand label(s) below ${MIN_CONTRAST}:1 — kept per the newsroom's house style (render-review concern, policy b).`,
  );
}
if (violations.length) {
  console.error(`[snap-contrast ${chart}] ${violations.length} text label(s) below ${MIN_CONTRAST}:1 WCAG contrast`);
  process.exit(1);
}
console.log(`[snap-contrast ${chart}] OK — ${samples.length} labels clear ${MIN_CONTRAST}:1${concerns.length ? ` (${concerns.length} brand concern[s] kept)` : ""}.`);
