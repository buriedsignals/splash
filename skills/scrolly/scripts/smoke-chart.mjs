// Chart-scrolly guardrail — builds each chart-scrolly sample (line, bar, scatter) and
// asserts the TYPE-ADAPTIVE behaviour renders and animates on scroll:
//   line    → the drawn polyline gets LONGER as you scroll (continuous reveal scrub).
//   bar     → the ACCENTED bar moves between reveal steps (ranked highlight walk).
//   scatter → the visible OUTLIER label changes between reveal steps (outlier walk).
// Plus, for every type, the regression the user reported: the figure title must appear
// EXACTLY ONCE (host header only — the embedded chart must suppress its own title/source).
//
// Run: bun scripts/smoke-chart.mjs   (from skills/scrolly). Exits non-zero on any failure.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const CASES = [
  {
    type: "line",
    sample: "assets/sample-data/line-scrolly.json",
    title: "The Arctic's summer sea ice has shrunk by nearly 40% since 1979",
  },
  {
    type: "bar",
    sample: "assets/sample-data/bar-scrolly.json",
    title: "Qatar emits seven times more CO₂ per person than France",
  },
  {
    type: "scatter",
    sample: "assets/sample-data/scatter-scrolly.json",
    title: "The US spends far more on health yet lives shorter lives",
  },
];

const FRACS = [0.12, 0.28, 0.44, 0.6, 0.76];
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

const browser = await chromium.launch();
for (const c of CASES) {
  const outDir = mkdtempSync(join(tmpdir(), `chart-scrolly-${c.type}-`));
  execFileSync("bun", [join(here, "produce.mjs"), join(root, c.sample), outDir], {
    stdio: "ignore",
    cwd: root,
  });
  const url = pathToFileURL(join(outDir, "scrolly.html")).href;
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("svg", { timeout: 15000 });

  // --- Regression: the title must render exactly once (host header only). ---
  const titleCount = await page.evaluate((t) => {
    let n = 0;
    for (const el of document.querySelectorAll("body *")) {
      // Count only VISIBLE leaf HTML nodes whose OWN text equals the title. Exclude SVG
      // metadata (the <svg><title> a11y element is invisible, not a visual duplicate) and
      // anything not laid out (offsetParent null / zero-box).
      if (el.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
      if (el.children.length !== 0 || el.textContent?.trim() !== t) continue;
      if (el.getClientRects().length === 0) continue;
      n++;
    }
    return n;
  }, c.title);
  if (titleCount !== 1)
    fail(`${c.type}: title rendered ${titleCount}× (expected 1 — embedded chart must suppress its own title)`);

  // Sample the SVG state at each scroll fraction.
  const snaps = [];
  for (const f of FRACS) {
    await page.evaluate((fr) => window.scrollTo(0, document.body.scrollHeight * fr), f);
    await page.waitForTimeout(650);
    snaps.push(
      await page.evaluate(() => {
        const strokePaths = [...document.querySelectorAll("svg path")].filter((el) => {
          const s = el.getAttribute("stroke");
          return s && s !== "none" && (el.getAttribute("fill") ?? "none") === "none";
        });
        const lineLen = Math.max(0, ...strokePaths.map((pp) => {
          try { return pp.getTotalLength(); } catch { return 0; }
        }));
        // accent = the fill that appears on exactly ONE rect (the highlighted bar);
        // record its y so we can prove the accent MOVES between reveals.
        const rects = [...document.querySelectorAll("svg rect")];
        const byFill = {};
        for (const r of rects) {
          const fl = r.getAttribute("fill");
          if (fl && fl !== "none") (byFill[fl] ??= []).push(Math.round(+r.getAttribute("y")));
        }
        let accentY = null;
        for (const ys of Object.values(byFill)) if (ys.length === 1) accentY = ys[0];
        // scatter/line labels: the visible text tokens (outlier labels walk between reveals).
        const labels = [...document.querySelectorAll("svg text")]
          .map((t) => t.textContent?.trim())
          .filter(Boolean);
        return { lineLen: Math.round(lineLen), accentY, labels };
      }),
    );
  }
  await page.close();
  if (errs.length) fail(`${c.type}: page error — ${errs[0]}`);

  if (c.type === "line") {
    const early = snaps[0].lineLen;
    const late = snaps[snaps.length - 1].lineLen;
    if (!(late > early + 5)) fail(`line: did not draw further on scroll (early=${early}, late=${late})`);
  } else if (c.type === "bar") {
    const accents = new Set(snaps.map((s) => s.accentY).filter((y) => y !== null));
    if (accents.size < 2)
      fail(`bar: highlight did not walk — ${accents.size} distinct accented bar(s) across scroll`);
  } else if (c.type === "scatter") {
    // The set of visible labels must CHANGE across reveals (a different outlier named).
    const sigs = new Set(snaps.map((s) => s.labels.slice().sort().join("|")));
    if (sigs.size < 2)
      fail(`scatter: outlier label did not walk — labels never changed across scroll`);
  }
  console.log(`chart-scrolly smoke OK: ${c.type}`);
}
await browser.close();
console.log("chart-scrolly smoke OK: all types");
