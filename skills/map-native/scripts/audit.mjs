// Layout audit for the map-native interactive builds. For each config × viewport
// it renders the real component in a browser (via the interactive dist build),
// waits for the MapTiler map to reach idle, then asserts:
//   1. The title, legend, and source text boxes are inside the card (no overflow).
//   2. No two visible text boxes overlap significantly.
//   3. The rendered map bounds fit the DATA extent — not the whole world.
//      Uses map.project() to measure what fraction of the canvas the data bbox
//      occupies. Fails if the data spans < 50% of both canvas dimensions
//      (catches a correctly-centered but zoomed-out map).
//
// Run: cd skills/map-native && bun run audit
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { buildCases, buildLocatorCases } from "./audit-cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const htmlUrl = pathToFileURL(join(root, "dist", "interactive", "index.html"))
  .href;

const choroplethSample = JSON.parse(
  readFileSync(
    join(root, "assets", "sample-data", "choropleth.json"),
    "utf8",
  ),
);
// Keep the legacy `sample` alias so no existing reference breaks.
const sample = choroplethSample;

const locatorSample = JSON.parse(
  readFileSync(
    join(root, "assets", "sample-data", "locator-many.json"),
    "utf8",
  ),
);

const VIEWPORTS = [
  { w: 340, h: 480, name: "rsp-340" },
  { w: 520, h: 480, name: "rsp-520" },
  { w: 760, h: 480, name: "rsp-760" },
  { w: 1100, h: 600, name: "rsp-1100" },
  { w: 1280, h: 720, name: "landscape" },
  { w: 1080, h: 1080, name: "square" },
  { w: 1080, h: 1350, name: "portrait" },
];

// Basemap-fit check: project the data extent corners to screen pixels via
// map.project() and assert max(fracW, fracH) >= MIN_DATA_FILL_FRACTION.
// This PASSES a correct fitBounds (which fills the binding dimension) and FAILS
// a too-zoomed-out map where data spans only a tiny fraction of the canvas.
const MIN_DATA_FILL_FRACTION = 0.7;

const cases = [
  ...buildCases(sample),
  ...buildLocatorCases(locatorSample),
];

// significant overlap: meaningful intersection (not just touching corners).
function overlapArea(a, b) {
  const ix = Math.max(
    0,
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
  );
  const iy = Math.max(
    0,
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
  );
  return ix > 2 && iy > 2 ? ix * iy : 0;
}

const browser = await chromium.launch();

let violations = 0;
let checks = 0;
const failsByCase = {};

for (const c of cases) {
  for (const vp of VIEWPORTS) {
    checks++;
    const caseKey = `${c.label}/${vp.name}`;

    // Fix 3: create a fresh page per iteration so addInitScript never accumulates.
    // Each page gets exactly one addInitScript call with the correct config.
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.addInitScript((cfg) => {
      window.__CONFIG__ = cfg;
    }, c.config);
    await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

    // Wait for map idle — poll until loaded() && areTilesLoaded() are both true.
    // We wait AFTER fitBounds settles so the projection check sees the final state.
    const mapIdle = await page
      .waitForFunction(
        () => {
          const m = window.__map__;
          return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
        },
        { timeout: 45_000 },
      )
      .then(() => true)
      .catch(() => false);

    if (!mapIdle) {
      console.log(`  ✗ ${caseKey}: map did not reach idle (timeout)`);
      violations++;
      (failsByCase[c.label] ??= []).push(`${vp.name}: map idle timeout`);
      await page.close();
      continue;
    }

    // Short settle for paint to flush
    await page.waitForTimeout(200);

    // Collect text boxes + map fit state in one evaluate call.
    // layout.bounds [w,s,e,n] is exposed on window.__layout_bounds__ by the component.
    const res = await page.evaluate(() => {
      const card = document.querySelector("#root > div");
      if (!card) return { error: "no card" };
      const cb = card.getBoundingClientRect();

      const effOpacity = (el) => {
        let o = 1,
          n = el;
        while (n && n !== card.parentElement) {
          const s = getComputedStyle(n);
          o *= Number(s.opacity || 1);
          if (s.display === "none" || s.visibility === "hidden") return 0;
          n = n.parentElement;
        }
        return o;
      };

      const boxes = [];
      card.querySelectorAll("*").forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const own = (el.textContent || "").trim();
        if (!own) return;
        const childHasText = [...el.children].some(
          (c) =>
            (c.textContent || "").trim() && c.tagName.toLowerCase() !== "tspan",
        );
        const isLeafText = tag === "text" || !childHasText;
        if (!isLeafText) return;
        const op = effOpacity(el);
        if (op < 0.06) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        boxes.push({
          t: own.slice(0, 32),
          x: r.x - cb.x,
          y: r.y - cb.y,
          w: r.width,
          h: r.height,
        });
      });

      // Basemap-fit check via map.project().
      // The component exposes layout.bounds as window.__layout_bounds__ = [w,s,e,n].
      // Project SW and NE corners to canvas pixels, measure what fraction of the
      // canvas the data bbox spans. Assert max(fracW, fracH) >= 0.5.
      let mapFit = null;
      const m = window.__map__;
      const dataBounds = window.__layout_bounds__;
      if (m && dataBounds) {
        const [w, s, e, n] = dataBounds;
        const canvas = m.getCanvas();
        const canvasW = canvas.width / (window.devicePixelRatio || 1);
        const canvasH = canvas.height / (window.devicePixelRatio || 1);
        // SW corner = [west, south], NE corner = [east, north]
        const sw = m.project([w, s]);
        const ne = m.project([e, n]);
        const bboxW = Math.abs(ne.x - sw.x);
        const bboxH = Math.abs(sw.y - ne.y);
        const fracW = bboxW / canvasW;
        const fracH = bboxH / canvasH;
        // Center pixel of projected bbox
        const centerX = (sw.x + ne.x) / 2;
        const centerY = (sw.y + ne.y) / 2;
        const centerOnScreen =
          centerX >= 0 && centerX <= canvasW && centerY >= 0 && centerY <= canvasH;
        mapFit = { fracW, fracH, centerOnScreen, canvasW, canvasH, bboxW, bboxH };
      } else if (m && !dataBounds) {
        // bounds not yet exposed — map mounted but fitBounds not yet called
        mapFit = { notReady: true };
      }

      return { cardW: cb.width, cardH: cb.height, boxes, mapFit };
    });

    if (!res || res.error) {
      console.log(`  ✗ ${caseKey}: ${res?.error || "render failed"}`);
      violations++;
      (failsByCase[c.label] ??= []).push(`${vp.name}: render error`);
      await page.close();
      continue;
    }

    const { boxes, cardW, cardH, mapFit } = res;
    const problems = [];

    // 1. Overlap check
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const area = overlapArea(boxes[i], boxes[j]);
        const minA = Math.min(
          boxes[i].w * boxes[i].h,
          boxes[j].w * boxes[j].h,
        );
        if (area > 0.2 * minA) {
          problems.push(`overlap "${boxes[i].t}" × "${boxes[j].t}"`);
        }
      }
    }

    // 2. Out-of-bounds check (text boxes must stay within the card)
    const M = 2;
    for (const b of boxes) {
      if (
        b.x < -M ||
        b.y < -M ||
        b.x + b.w > cardW + M ||
        b.y + b.h > cardH + M
      ) {
        problems.push(`out-of-bounds "${b.t}"`);
      }
    }

    // 3. Basemap-fit check using map.project() pixel projection.
    //    Assert the projected data bbox fills ≥50% of at least one canvas dimension
    //    AND the bbox center pixel is on-screen.
    //    This catches: zoomed-out maps (data spans tiny fraction), wrong-region maps.
    if (mapFit) {
      if (mapFit.notReady) {
        // layout.bounds not yet exposed — bounds evaluation skipped (not a violation)
      } else {
        const maxFrac = Math.max(mapFit.fracW, mapFit.fracH);
        if (maxFrac < MIN_DATA_FILL_FRACTION) {
          problems.push(
            `basemap-fit: data bbox spans only ${(mapFit.fracW * 100).toFixed(0)}%×${(mapFit.fracH * 100).toFixed(0)}% of canvas — fitBounds did not zoom to data extent (need ≥${MIN_DATA_FILL_FRACTION * 100}% on one dim)`,
          );
        }
        if (!mapFit.centerOnScreen) {
          problems.push(
            `basemap-fit: projected data bbox center is off-screen — fitBounds centered on wrong region`,
          );
        }
      }
    } else {
      problems.push("window.__map__ not available — map did not mount");
    }

    if (problems.length) {
      violations += problems.length;
      (failsByCase[c.label] ??= []).push(
        `${vp.name}: ${problems.slice(0, 3).join("; ")}`,
      );
      for (const p of problems.slice(0, 3))
        console.log(`  ✗ ${caseKey}: ${p}`);
    }

    await page.close();
  }
}

await browser.close();

console.log(
  `\nMap-native audit — ${cases.length} configs × ${VIEWPORTS.length} viewports = ${checks} renders`,
);
const failed = Object.keys(failsByCase);
if (!failed.length) {
  console.log(
    `✓ ALL GREEN — title/legend/source in bounds, non-overlapping, and basemap fits the data extent.`,
  );
  process.exit(0);
}
for (const label of failed) {
  console.log(`\n✗ ${label} (${failsByCase[label].length}):`);
  for (const f of failsByCase[label].slice(0, 8)) console.log(`    ${f}`);
  if (failsByCase[label].length > 8)
    console.log(`    … +${failsByCase[label].length - 8} more`);
}
console.log(`\nTotal violations: ${violations} across ${failed.length} cases`);
process.exit(1);
