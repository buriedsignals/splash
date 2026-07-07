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

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chart === "line" ? "dist/static" : `dist/${chart}/static`);

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
// in node with the shared helper.
const samples = await page.evaluate(() => {
  const toHex = (rgb) => {
    const m = rgb && rgb.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    if (a === 0) return null; // transparent → not a background
    const h = (n) => Math.round(n).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  };
  const bgAt = (x, y, glyph) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === glyph) continue;
      const fillAttr = el.getAttribute && el.getAttribute("fill");
      if (fillAttr && fillAttr !== "none") {
        const hx = toHex(getComputedStyle(el).fill);
        if (hx) return hx;
      }
      const bc = toHex(getComputedStyle(el).backgroundColor);
      if (bc) return bc;
    }
    return "#ffffff"; // the paper
  };
  const out = [];
  for (const t of Array.from(document.querySelectorAll("text"))) {
    const s = (t.textContent || "").trim();
    if (!s) continue;
    const cs = getComputedStyle(t);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    const fill = toHex(cs.fill);
    if (!fill) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const y = r.top + r.height / 2;
    const prev = t.style.visibility;
    t.style.visibility = "hidden"; // remove glyph + its halo before sampling
    const bgs = [0.2, 0.5, 0.8].map((f) => bgAt(r.left + r.width * f, y, t));
    t.style.visibility = prev;
    out.push({ text: s, fill, bgs });
  }
  return out;
});

await browser.close();
server.close();

const violations = [];
for (const s of samples) {
  const worst = worstContrast(s.fill, s.bgs);
  if (worst < MIN_CONTRAST) violations.push({ ...s, worst: Number(worst.toFixed(2)) });
}

console.log(JSON.stringify({ chart, checked: samples.length, violations }, null, 2));
if (violations.length) {
  console.error(`[snap-contrast ${chart}] ${violations.length} text label(s) below ${MIN_CONTRAST}:1 WCAG contrast`);
  process.exit(1);
}
console.log(`[snap-contrast ${chart}] OK — ${samples.length} labels clear ${MIN_CONTRAST}:1.`);
