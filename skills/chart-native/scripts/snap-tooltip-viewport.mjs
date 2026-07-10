// skills/chart-native/scripts/snap-tooltip-viewport.mjs
// Render-time guard that the INTERACTIVE hover/focus TOOLTIP stays inside its chart.
// Each *Chart.tsx positions its `.tooltip` to the RIGHT of / ABOVE the hovered mark
// with `whiteSpace: nowrap` and no bounds check, so a mark near the right/top edge
// pushes the tooltip off-screen and its text clips (reported on a scatter's rightmost
// point and a bar's top bar). core/ChartFrame wraps every tooltip in a ClampedTooltip
// that measures and flips/clamps it back in-bounds — this harness asserts the property
// mechanically for EVERY chart type at produce time, before export, at a NARROW embed
// width (where a right-edge tooltip overflows the most) and a wide one.
//
// Container = the tooltip's offsetParent (the ClampedTooltip wrapper, which fills the
// plot box exactly). The tooltip must sit inside [margin, size - margin] of it; when a
// tooltip is larger than the plot box the top-left edge must stay pinned at the margin
// (so the anchor + the start of the text stay visible) — this mirrors clampOffset's
// contract and tests/tooltip-clamp.test.ts's assertInside.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chartDistSub } from "../src/build-paths.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chartDistSub(chart, "interactive"));
const MARGIN = 8;
const TOL = 1.5; // sub-pixel rounding slack
const WIDTHS = [380, 1100]; // narrow (worst overflow) + a standard embed width

const browser = await chromium.launch();

const violations = [];
let checked = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 640 } });
  await page.goto(pathToFileURL(join(dist, "index.html")).href);
  await page.waitForSelector("svg");
  await page.waitForTimeout(1700); // let the intro reveal settle before focusing marks

  // Same universal marker snap-tooltip-contrast.mjs uses: role="img" + tabindex="0"
  // is wired by every *Chart.tsx for "focus/hover this → a tooltip appears", and
  // works across every mark shape (circle/rect/path/g). focus() (not hover()) so it
  // doesn't depend on pointer geometry.
  const marks = page.locator('[role="img"][tabindex="0"]');
  const total = await marks.count();
  if (total === 0) {
    await page.close();
    continue;
  }
  const N = Math.min(total, 16);
  for (let i = 0; i < N; i++) {
    await marks.nth(i).focus();
    try {
      await page.waitForSelector(".tooltip", { timeout: 1200 });
    } catch {
      continue; // this role="img" element didn't open a tooltip
    }
    await page.waitForTimeout(80); // let the clamp's layout-effect settle
    const m = await page.evaluate(() => {
      const tip = document.querySelector(".tooltip");
      // The clamp lives on the ClampedTooltip wrapper (tip.parentElement) as a
      // `transform: translate(dx,dy)`. Measuring tip against THAT wrapper cancels the
      // shift (both move together) → we must measure against the wrapper's PARENT, the
      // `position:relative` plot container the wrapper is `inset:0` over. tip's rect
      // relative to it == natural + clamp shift == the clamped on-screen position.
      const box = tip && tip.parentElement && tip.parentElement.parentElement;
      if (!tip || !box) return null;
      const t = tip.getBoundingClientRect();
      const c = box.getBoundingClientRect();
      return {
        t: { left: t.left, right: t.right, top: t.top, bottom: t.bottom, width: t.width, height: t.height },
        c: { left: c.left, right: c.right, top: c.top, bottom: c.bottom, width: c.width, height: c.height },
      };
    });
    if (!m) continue;
    checked++;
    const { t, c } = m;
    const fails = [];
    // top-left corner must always be inside (>= margin) — the pinned anchor
    if (t.left < c.left + MARGIN - TOL) fails.push("left");
    if (t.top < c.top + MARGIN - TOL) fails.push("top");
    // right/bottom must be inside when the tooltip fits within the box
    if (t.width <= c.width - 2 * MARGIN && t.right > c.right - MARGIN + TOL) fails.push("right");
    if (t.height <= c.height - 2 * MARGIN && t.bottom > c.bottom - MARGIN + TOL) fails.push("bottom");
    if (fails.length) {
      violations.push({
        width,
        mark: i,
        edges: fails,
        tip: { left: Math.round(t.left), right: Math.round(t.right), top: Math.round(t.top), bottom: Math.round(t.bottom) },
        box: { left: Math.round(c.left), right: Math.round(c.right), top: Math.round(c.top), bottom: Math.round(c.bottom) },
      });
    }
  }
  await page.close();
}

await browser.close();

console.log(JSON.stringify({ chart, widths: WIDTHS, checked, violations }, null, 2));

// Mirror snap-tooltip-contrast's vacuity guard: marks existed but not one ever
// surfaced a tooltip across all widths → the hover/focus→tooltip mechanism is broken
// (a `.tooltip` class rename, a focus-handler regression), which would otherwise let
// this harness silently PASS while asserting nothing.
if (checked === 0) {
  console.error(
    `[snap-tooltip-viewport ${chart}] no tooltip was ever observed — the hover/focus→tooltip mechanism appears broken (CSS class rename? focus handler regression?)`,
  );
  process.exit(1);
}
if (violations.length) {
  console.error(
    `[snap-tooltip-viewport ${chart}] ${violations.length} tooltip(s) overflow their plot box (text would clip off-screen):`,
  );
  for (const v of violations) {
    console.error(
      `  - @${v.width}px mark #${v.mark} overflows [${v.edges.join(",")}]: tip ${JSON.stringify(v.tip)} vs box ${JSON.stringify(v.box)}`,
    );
  }
  process.exit(1);
}
console.log(
  `[snap-tooltip-viewport ${chart}] OK — ${checked} tooltip(s) stay inside the plot box across ${WIDTHS.join("/")}px.`,
);
