// a11y proof: data points are keyboard-focusable (tooltip on focus, not just
// hover) and the source is a real link. A static PNG can't show either.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const distInteractive =
  chart === "line" ? "dist/interactive" : `dist/${chart}/interactive`;
// the focusable data-mark element differs per chart type
const markSel =
  chart === "bar"
    ? 'rect[role="img"][tabindex="0"]'
    : 'circle[role="img"][tabindex="0"]';
const out = process.argv[2] ?? "/tmp/native-a11y.png";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(root, distInteractive, "index.html")).href);
await page.waitForSelector("svg");
await page.waitForTimeout(2100); // let the reveal settle

// 1) keyboard focus a data mark -> tooltip appears (no mouse)
const pts = page.locator(markSel);
const n = await pts.count();
const before = await page.locator(".tooltip").count();
await pts.nth(2).focus();
await page.waitForSelector(".tooltip", { timeout: 3000 });
const tip = await page.locator(".tooltip").textContent();
const ariaSample = await pts.nth(2).getAttribute("aria-label");

// 2) source is a real link with href
const srcHref = await page.locator("a[href]").first().getAttribute("href");

console.log(JSON.stringify({ focusablePoints: n, tooltipBeforeFocus: before, tooltipAfterFocus: tip, pointAria: ariaSample, sourceHref: srcHref }, null, 2));
await page.locator("#root > div").screenshot({ path: out });
await browser.close();
