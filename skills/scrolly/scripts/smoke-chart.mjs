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
  {
    // Defense-in-depth: an unsupported type must DEGRADE (clear message), never crash.
    type: "pie",
    sample: "assets/sample-data/pie-scrolly.json",
    unsupported: true,
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

  // Unsupported type → the scrolly must render a clear fallback (no <svg>, no crash).
  if (c.unsupported) {
    const bodyText = await page.evaluate(() => document.body.textContent ?? "");
    const hasSvg = await page.evaluate(() => !!document.querySelector("svg"));
    await page.close();
    if (errs.length) fail(`${c.type}: page error on unsupported type — ${errs[0]}`);
    if (hasSvg) fail(`${c.type}: rendered a chart for an unsupported type (expected fallback)`);
    if (!/not supported in a scrolly/.test(bodyText))
      fail(`${c.type}: no graceful fallback message for unsupported type`);
    console.log(`chart-scrolly smoke OK: ${c.type} (graceful fallback)`);
    continue;
  }

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
        // accent = the fill that appears on exactly ONE rect (the highlighted bar).
        const rects = [...document.querySelectorAll("svg rect")];
        const byFill = {};
        for (const r of rects) {
          const fl = r.getAttribute("fill");
          if (fl && fl !== "none") (byFill[fl] ??= []).push(r);
        }
        let accentRect = null;
        for (const arr of Object.values(byFill)) if (arr.length === 1) accentRect = arr[0];
        // accentY (does the accent MOVE?) + accentCat (WHICH bar — its category-axis label,
        // the leftmost svg text vertically overlapping the accented bar's row).
        let accentY = null;
        let accentCat = null;
        if (accentRect) {
          const rr = accentRect.getBoundingClientRect();
          accentY = Math.round(rr.top);
          const cy = rr.top + rr.height / 2;
          let bestX = Infinity;
          for (const t of document.querySelectorAll("svg text")) {
            const tr = t.getBoundingClientRect();
            if (tr.top <= cy && cy <= tr.bottom && tr.left < bestX) {
              bestX = tr.left;
              accentCat = t.textContent?.trim() ?? null;
            }
          }
        }
        // the visible caption = the .step card straddling the viewport centre.
        let caption = null;
        const cyc = window.innerHeight / 2;
        for (const el of document.querySelectorAll(".step")) {
          const r = el.getBoundingClientRect();
          if (r.top <= cyc && cyc <= r.bottom) {
            caption = el.textContent?.trim() ?? null;
            break;
          }
        }
        // all category labels (to distinguish "caption names another bar" from "caption is
        // the intro/takeaway description that names no bar").
        const cats = [...document.querySelectorAll("svg text")]
          .map((t) => t.textContent?.trim())
          .filter(Boolean);
        // scatter/line labels: the visible text tokens (outlier labels walk between reveals).
        const labels = cats;
        return { lineLen: Math.round(lineLen), accentY, accentCat, caption, cats, labels };
      }),
    );
  }
  await page.close();
  if (errs.length) fail(`${c.type}: page error — ${errs[0]}`);

  if (c.type === "line") {
    const full = Math.max(...snaps.map((s) => s.lineLen)) || 1;
    if (!(full > 5)) fail(`line: never drew a line`);
    // Head must not LAG the centred caption. Order the distinct reveal captions ("<x> — …")
    // by first appearance; when reveal r of R is centred the head should be ≈ r/(R-1) of the
    // full length. A head far BEHIND that (the ~one-step lag bug) fails. (Ahead is fine.)
    const revealCaps = [];
    for (const s of snaps) {
      const isReveal = s.caption && /^\s*[-\d.]+\s+—/u.test(s.caption);
      if (isReveal && !revealCaps.includes(s.caption)) revealCaps.push(s.caption);
    }
    if (revealCaps.length >= 2) {
      const R = revealCaps.length;
      for (const s of snaps) {
        const r = revealCaps.indexOf(s.caption);
        if (r < 0) continue;
        const expected = r / (R - 1);
        const frac = s.lineLen / full;
        if (frac + 0.25 < expected)
          fail(
            `line: head lags caption — reveal ${r + 1}/${R} centred but head only ${Math.round(frac * 100)}% drawn (expected ≈${Math.round(expected * 100)}%)`,
          );
      }
    }
  } else if (c.type === "bar") {
    // 1) the accent WALKS (≥2 distinct accented bars across scroll).
    const accents = new Set(snaps.map((s) => s.accentY).filter((y) => y !== null));
    if (accents.size < 2)
      fail(`bar: highlight did not walk — ${accents.size} distinct accented bar(s) across scroll`);
    // 2) the accent CORRESPONDS to its caption (the desync bug): at a settled reveal the
    //    caption must name the accented bar's category, and must NOT name a different bar.
    const reveals = snaps.filter((s) => s.accentCat && s.caption);
    let corresponded = 0;
    for (const s of reveals) {
      if (s.caption.includes(s.accentCat)) {
        corresponded++;
      } else if (s.cats.some((cat) => cat !== s.accentCat && s.caption.includes(cat))) {
        // caption names a DIFFERENT bar than the one accented → accent↔caption desync
        fail(
          `bar: accented "${s.accentCat}" but caption names another bar — "${s.caption}"`,
        );
      }
    }
    if (corresponded < 2)
      fail(`bar: accent↔caption never corresponded at a settled reveal (${corresponded})`);
  } else if (c.type === "scatter") {
    // Every entity NAMED in a reveal caption ("<Entity> — x, y") must have its point label
    // rendered in at least one snapshot where that caption is shown. Catches a captioned-
    // but-unlabelled outlier (the bottom-left-corner "Mexico" drop) that a mere
    // labels-change check is false-green on.
    const captioned = {}; // entity -> was its label ever present while captioned
    for (const s of snaps) {
      const m = s.caption && s.caption.match(/^(.+?)\s+—\s/u);
      if (!m) continue;
      const e = m[1].trim();
      captioned[e] = (captioned[e] ?? false) || s.labels.includes(e);
    }
    const named = Object.keys(captioned);
    if (named.length < 2)
      fail(`scatter: fewer than 2 outliers captioned across scroll (${named.length})`);
    const missing = named.filter((e) => !captioned[e]);
    if (missing.length)
      fail(`scatter: captioned but its point label never rendered — ${missing.join(", ")}`);
  }
  console.log(`chart-scrolly smoke OK: ${c.type}`);
}
await browser.close();
console.log("chart-scrolly smoke OK: all types");
