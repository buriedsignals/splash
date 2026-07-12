// skills/chart-native/scripts/snap-label-fit.mjs
// Render-time label-fit guard: every rendered text node (svg <text> — its box
// unions its tspans — plus the HTML furniture ChartFrame emits: title,
// subtitle, source line) must sit fully inside its clip bounds — the chart
// card (what static.png crops to, see snap-proof.mjs) intersected with every
// clipping ancestor (svg roots: svg overflow is hidden by default, so the svg
// rect IS the clip box; plus any overflow:hidden/clip element). The
// core/text.ts fitters (truncate, endLabelGutterPx, verticalCatLines, rotated
// helpers) prevent overflow only IF a renderer calls them; nothing asserted a
// renderer actually did — a missed call ships a silently clipped label,
// exactly the class of the stacked-area right-gutter clip ("Renouvelables 280"
// → "Renouvelables 28"). Wired fail-hard into produce.mjs on the static AND
// interactive paths, right after the contrast snaps.
//
// Rotated text needs no special handling: getBoundingClientRect returns the
// axis-aligned box OF the rotated element — exactly what must fit.
//
// TARGET=static (default) reads the static dist over a local http server
// (module scripts get crossorigin → blocked over file://, same as
// snap-contrast.mjs). TARGET=interactive opens the self-contained interactive
// dist over file:// and waits out the intro reveal (same loading model as
// snap-interactive-contrast.mjs). DIST overrides the dist dir (tests).
//
// OUT OF SCOPE v1:
//   - label-vs-label overlap: intentional overlays and legends make it
//     false-positive-prone; `bun run audit` covers it at test time.
//   - contrast: snap-contrast.mjs / snap-interactive-contrast.mjs own it.
//   - video: the mp4 frames render through Remotion's own bundle, not this
//     dist, so there is no built page to load here. The video DOM is the same
//     *Chart.tsx component tree (same fitters), but that is indirect coverage
//     only — NOT render-asserted (a follow-up, like map-native below).
//   - map-native: its GL canvas text is unreachable via DOM (same asymmetry
//     snap-contrast has).
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import {
  LABEL_FIT_TOLERANCE_PX,
  intersectBoxes,
  isFitViolation,
  overflowPx,
  worstOverflowPx,
} from "../src/core/label-fit.ts";
import { chartDistSub } from "../src/build-paths.ts";
import { collectTextBoxes } from "./lib/collect-text-boxes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const target = process.env.TARGET === "interactive" ? "interactive" : "static";
const dist = process.env.DIST ?? join(root, chartDistSub(chart, target));

// The screenshot/crop box: snap-proof.mjs screenshots exactly this element for
// static.png, and the interactive embed is width-bounded by it.
const CANVAS_SELECTOR = "#root > div";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 900, height: 560 },
  deviceScaleFactor: 2,
});

let server;
if (target === "static") {
  // serve over http (module scripts get crossorigin -> blocked over file://)
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  server = createServer(async (req, res) => {
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
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForSelector("svg");
  await page.waitForTimeout(2100); // let the reveal settle to progress=1 (as snap-contrast)
} else {
  // single self-contained file (vite-plugin-singlefile) → opens over file://
  await page.goto(pathToFileURL(join(dist, "index.html")).href);
  await page.waitForSelector("svg");
  // wait past the slowest intro reveal (2200ms + margin, as snap-interactive-contrast)
  await page.waitForTimeout(2500);
}

const { canvas, items } = await page.evaluate(collectTextBoxes, CANVAS_SELECTOR);

await browser.close();
server?.close();

// VACUITY GUARDS — a broken selector or an empty render must not pass silently
// (same convention as snap-proof's "no focusable data element found" throw).
if (!canvas) {
  console.error(`[snap-label-fit ${chart}/${target}] no chart card matches "${CANVAS_SELECTOR}" — nothing was checked`);
  process.exit(1);
}
if (items.length === 0) {
  console.error(`[snap-label-fit ${chart}/${target}] ZERO text nodes found — a chart always has furniture text; refusing to pass an empty check`);
  process.exit(1);
}

const violations = [];
let worst = 0;
for (const it of items) {
  // clip bounds = the card ∩ every clipping ancestor (svg roots, overflow:hidden)
  const bounds = it.clips.reduce(intersectBoxes, canvas);
  const over = worstOverflowPx(it.box, bounds);
  worst = Math.max(worst, over);
  if (isFitViolation(it.box, bounds, LABEL_FIT_TOLERANCE_PX)) {
    violations.push({
      kind: it.kind,
      text: it.text,
      overflowPx: Object.fromEntries(
        Object.entries(overflowPx(it.box, bounds)).map(([k, v]) => [k, Number(v.toFixed(2))]),
      ),
    });
  }
}

console.log(
  JSON.stringify(
    { chart, target, checked: items.length, tolerancePx: LABEL_FIT_TOLERANCE_PX, worstOverflowPx: Number(worst.toFixed(2)), violations },
    null,
    2,
  ),
);
if (violations.length) {
  console.error(
    `[snap-label-fit ${chart}/${target}] ${violations.length} text label(s) clipped — outside the card/svg bounds by more than ${LABEL_FIT_TOLERANCE_PX}px`,
  );
  process.exit(1);
}
console.log(
  `[snap-label-fit ${chart}/${target}] OK — ${items.length} text nodes fit their clip bounds (worst overflow ${worst.toFixed(2)}px ≤ ${LABEL_FIT_TOLERANCE_PX}px).`,
);
