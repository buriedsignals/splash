// Responsive proof for maps: the same interactive embed re-laid-out at several container
// widths. A static PNG can't show that the furniture (title / source / legend) stays
// visible and nothing overflows at narrow widths. Mirrors chart-native's snap-responsive.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? process.argv[2] ?? "/tmp";
const interactiveDir = process.env.SERVE_DIR ?? join(root, "dist", "interactive");
const url = pathToFileURL(join(interactiveDir, "index.html")).href;

const browser = await chromium.launch();
const failures = [];

for (const w of [360, 768, 1100, 1600]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const m = window.__map__;
      return (
        m &&
        m.getLayer &&
        (m.getLayer("choropleth-fill") || m.getLayer("symbol-circles"))
      );
    },
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2500); // let tiles + reveal settle

  await page
    .locator("#root > div")
    .first()
    .screenshot({ path: join(outDir, `responsive-${w}.png`) });

  const checks = await page.evaluate(() => {
    const inView = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.left >= -1 &&
        r.top >= -1 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
      );
    };
    return {
      scrollOk:
        document.documentElement.scrollWidth <= window.innerWidth + 1,
      titleOk: inView('[data-testid="map-title"]'),
      sourceOk: inView('[data-testid="map-source"]'),
      legendOk: inView('[data-testid="map-legend"]'),
    };
  });

  console.log(JSON.stringify({ w, ...checks }));
  for (const [k, ok] of Object.entries(checks))
    if (!ok) failures.push(`${w}px: ${k}`);
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error("RESPONSIVE FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("responsive: all widths pass");
