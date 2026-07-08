// skills/chart-native/scripts/snap-tooltip-contrast.mjs
// Render-time WCAG guard for the INTERACTIVE hover/focus TOOLTIP. snap-contrast.mjs
// samples the STATIC build's SVG <text> fills — it cannot see this class of bug: the
// tooltip is an HTML `.tooltip` div, present only on hover/focus in the INTERACTIVE
// build, coloured via CSS `color` (not SVG `fill`) on an opaque `background:
// COLORS.ink` shell that is `pointer-events:none`. Catches "tooltip name painted in
// the mark hue" (the class Task 1 fixed across Bump/Chord/Candlestick/Radar/
// Sunburst/Waffle/Beeswarm/DivergingStacked/Sankey/Parallel) mechanically, for ALL
// chart types, at produce time, before export.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { worstContrast, MIN_CONTRAST } from "../src/core/contrast-scan.ts";
import { chartDistSub } from "../src/build-paths.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chartDistSub(chart, "interactive"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(dist, "index.html")).href);
await page.waitForSelector("svg");
await page.waitForTimeout(1700); // let the intro reveal settle before focusing marks

// The focusable data mark's SVG TAG differs per type (circle/rect/path/g), but
// role="img" + tabindex="0" is the universal marker every *Chart.tsx wires for
// "focus/hover this -> a tooltip appears" (`role={interactive ? "img" : undefined}`,
// `tabIndex={interactive ? 0 : undefined}`). A tag-restricted selector (mirroring
// snap-a11y.mjs's small per-tag table) was tried first and found to silently MISS
// most of Task 1's 10 fixed types: e.g. Chord's marks are <path>, not <circle>, so
// `circle[role="img"][tabindex="0"]` (that table's fallback) matches 0 elements for
// it — verified empirically — while the tag-agnostic selector below correctly finds
// its 5 group arcs. We use `.focus()` rather than `.hover()` for the same reason
// snap-a11y.mjs / snap-proof.mjs do: focus doesn't depend on pointer geometry (an
// arc's bounding-box centre can sit outside its own filled area, so a coordinate-based
// hover can silently miss), so it works uniformly across every mark shape.
const marks = page.locator('[role="img"][tabindex="0"]');
const total = await marks.count();
if (total === 0) {
  console.error(`[snap-tooltip-contrast ${chart}] no focusable data mark found — interactive build broken`);
  process.exit(1);
}
const N = Math.min(total, 12); // first ~12 marks: enough to cover every series/category

const toHex = (rgbLike) => {
  const h = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${h(rgbLike.r)}${h(rgbLike.g)}${h(rgbLike.b)}`;
};

const violations = [];
let checked = 0;
for (let i = 0; i < N; i++) {
  await marks.nth(i).focus();
  try {
    await page.waitForSelector(".tooltip", { timeout: 1500 });
  } catch {
    continue; // this role="img" element didn't open a tooltip — not every one is a data mark
  }
  await page.waitForTimeout(120); // let the DOM settle after the hover-state update

  // In-page: for each text-bearing node inside .tooltip, resolve its EFFECTIVE
  // colour (own `color` composited with its own CSS `opacity`) and the nearest
  // ancestor with an OPAQUE backgroundColor (walking `el.parentElement` up — NOT
  // `elementsFromPoint`, because the tooltip shell is `pointer-events:none`, so
  // hit-testing at its screen position returns the SVG mark BEHIND it, the wrong
  // background). Nodes under `aria-hidden="true"` (the decorative colour swatch
  // Task 1 introduced) are SKIPPED: they carry the series hue on purpose and are
  // never exposed to assistive tech, so WCAG 1.4.3 (text contrast) does not apply
  // to them — checking them would false-fail every one of Task 1's fixes.
  const nodes = await page.evaluate(() => {
    const toRgba = (str) => {
      const m = str && str.match(/[\d.]+/g);
      if (!m) return null;
      const [r, g, b, a] = m.map(Number);
      return { r, g, b, a: a === undefined ? 1 : a };
    };
    // Known limitation: stops at the first ancestor whose OWN backgroundColor is
    // non-transparent and treats it as fully opaque (matches snap-contrast.mjs's
    // convention). Every tooltip shell today is a solid `COLORS.ink` — a future
    // semi-transparent tooltip background would need this to composite upward too.
    const opaqueBg = (el) => {
      let node = el.parentElement;
      while (node) {
        const bg = toRgba(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0) return bg;
        node = node.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 }; // fell off the top: assume page white
    };
    const out = [];
    for (const el of document.querySelectorAll(".tooltip strong, .tooltip span, .tooltip div")) {
      if (el.closest('[aria-hidden="true"]')) continue; // decorative swatch — exempt
      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
      );
      if (!ownText) continue; // pure layout wrapper, no text of its own
      const cs = getComputedStyle(el);
      const fg = toRgba(cs.color);
      if (!fg) continue;
      const elOpacity = Number(cs.opacity);
      const alpha = fg.a * (Number.isFinite(elOpacity) ? elOpacity : 1);
      const bg = opaqueBg(el);
      // composite fg (with its effective alpha) over bg -> the opaque colour a
      // viewer actually sees
      const eff = {
        r: fg.r * alpha + bg.r * (1 - alpha),
        g: fg.g * alpha + bg.g * (1 - alpha),
        b: fg.b * alpha + bg.b * (1 - alpha),
      };
      out.push({ text: el.textContent.trim(), fg: eff, bg });
    }
    return out;
  });

  for (const n of nodes) {
    checked++;
    const fill = toHex(n.fg);
    const bgHex = toHex(n.bg);
    const worst = worstContrast(fill, [bgHex]);
    if (worst < MIN_CONTRAST) {
      violations.push({ mark: i, text: n.text, fill, bg: bgHex, worst: Number(worst.toFixed(2)) });
    }
  }
}

await browser.close();

console.log(JSON.stringify({ chart, marksHovered: N, checked, violations }, null, 2));

// `total === 0` above catches "no focusable marks at all" (interactive build broken
// at the DOM level). This is the OTHER half: marks exist and were focused (total > 0),
// but NOT ONE of them ever surfaced a `.tooltip` text node across all N attempts — the
// hover/focus->tooltip mechanism itself is broken (e.g. a `.tooltip` class rename, or
// a focus/mouseenter handler regression). Without this guard `checked === 0` implies
// `violations.length === 0` (nothing was ever sampled to violate), so control would
// fall through to the "OK" log below and this harness would silently PASS while
// checking nothing — the exact vacuity this fail-hard produce gate must not allow.
if (checked === 0) {
  console.error(
    `[snap-tooltip-contrast ${chart}] no tooltip text was ever observed across ${N} focused marks — the hover/focus→tooltip mechanism appears broken (CSS class rename? focus handler regression?)`,
  );
  process.exit(1);
}
if (violations.length) {
  console.error(
    `[snap-tooltip-contrast ${chart}] ${violations.length} tooltip text node(s) below ${MIN_CONTRAST}:1 WCAG contrast`,
  );
  for (const v of violations) {
    console.error(`  - mark #${v.mark} "${v.text}": ${v.fill} on ${v.bg} = ${v.worst}:1`);
  }
  process.exit(1);
}
console.log(
  `[snap-tooltip-contrast ${chart}] OK — ${checked} tooltip text node(s) across ${N} mark(s) clear ${MIN_CONTRAST}:1.`,
);
