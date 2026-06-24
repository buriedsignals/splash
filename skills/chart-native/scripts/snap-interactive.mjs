// Interactive format proof: a STATIC PNG cannot show a hover (the 4th lesson in
// the log). So we drive the browser: load the single-file HTML, hover a data
// point, and screenshot the tooltip that appears.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = process.argv[2] ?? "/tmp/native-interactive.png";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 900, height: 560 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(join(root, "dist/interactive/index.html")).href);
await page.waitForSelector(".series-line");
await page.waitForTimeout(1700); // let the intro reveal settle before hovering

// hover the 3rd data point's invisible hit target (the COVID dip), then assert
// the tooltip actually rendered before screenshotting.
const hits = page.locator('circle[fill="transparent"]');
const n = await hits.count();
if (n === 0) throw new Error("no hover targets found — interactive build broken");
await hits.nth(2).hover({ force: true });
await page.waitForSelector(".tooltip", { timeout: 3000 });
const tip = await page.locator(".tooltip").textContent();
console.log("tooltip text:", tip);
await page.locator("#root > div").screenshot({ path: out });
await browser.close();
console.log("Wrote", out);
