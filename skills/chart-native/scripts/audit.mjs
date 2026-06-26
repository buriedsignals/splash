// Layout audit — the automated stand-in for "look at every render". For each
// chart × dataset × viewport it renders the REAL component in a browser and
// asserts layout invariants on the live DOM:
//   1. no two visible text labels overlap (catches crowding / source-legend /
//      outer-label collisions),
//   2. every text label sits inside the chart card (catches outer-label overflow).
// Correctness is then proven at generation for arbitrary data, not eyeballed.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { buildCases } from "./audit-cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const url = pathToFileURL(
  join(root, "dist/audit/interactive/index.html"),
).href;

const sample = (f) =>
  JSON.parse(readFileSync(join(root, "assets/sample-data", f), "utf8"));

const VIEWPORTS = [
  { w: 340, h: 480, responsive: true, scale: 1, name: "rsp-340" },
  { w: 520, h: 480, responsive: true, scale: 1, name: "rsp-520" },
  { w: 760, h: 480, responsive: true, scale: 1, name: "rsp-760" },
  { w: 1100, h: 480, responsive: true, scale: 1, name: "rsp-1100" },
  { w: 840, h: 480, responsive: false, scale: 1, name: "fixed-840" },
  { w: 1080, h: 1350, responsive: false, scale: 1.7, name: "portrait" },
];

const cases = buildCases(sample); // [{ type, label, config }]

// reveal invariant: at progress 0 at most this fraction of the plot may be drawn
// (≈ 0 — a few antialiased pixels are tolerated, a visible mark is not).
const REVEAL_INK_MAX = 0.006;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(url);
await page.waitForFunction(() => typeof window.renderAudit === "function");

// in-page: render a chart and return all leaf text boxes (svg <text> + html
// title/subtitle/source/legend), with accumulated opacity, relative to the card.
const collect = async (type, config, vp) => {
  return page.evaluate(
    async ([type, config, vp]) => {
      window.renderAudit(type, config, vp.w, vp.h, vp.responsive, vp.scale, 1);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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
          (c) => (c.textContent || "").trim() && c.tagName.toLowerCase() !== "tspan",
        );
        const isLeafText = tag === "text" || !childHasText;
        if (!isLeafText) return;
        const op = effOpacity(el);
        if (op < 0.06) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        boxes.push({
          t: own.slice(0, 24),
          x: r.x - cb.x,
          y: r.y - cb.y,
          w: r.width,
          h: r.height,
        });
      });
      return { cardW: cb.width, cardH: cb.height, boxes };
    },
    [type, config, vp],
  );
};

// reveal invariant: render at progress 0 and count the VISIBLE (non-white) pixels
// in the plot. Rasterising the live SVG honours clipPath/opacity/size uniformly —
// so a clip-based wipe and an opacity fade are both judged by what actually shows.
// Responsive mode so the svg is the plot only (title/subtitle are flow-above it).
const revealVisible = (type, config) =>
  page.evaluate(
    async ([type, config]) => {
      window.renderAudit(type, config, 760, 480, true, 1, 0);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      const svg = document.querySelector("#root svg");
      if (!svg) return -1;
      const rect = svg.getBoundingClientRect();
      const xml = new XMLSerializer().serializeToString(svg);
      const url =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const W = Math.max(1, Math.ceil(rect.width));
      const H = Math.max(1, Math.ceil(rect.height));
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      let nonWhite = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i + 3] > 12 && (data[i] < 244 || data[i + 1] < 244 || data[i + 2] < 244))
          nonWhite++;
      return nonWhite / (W * H); // fraction of the plot that is "inked"
    },
    [type, config],
  );

// interaction invariant: a tooltip anchors on the DATA ELEMENT under focus
// (every data point is keyboard-focusable, per interactive.md), NOT on the
// legend. Renders interactive, then: (1) focusing the first data element MUST
// open a tooltip — proving "point at a value to inspect it" and the keyboard
// a11y path; (2) hovering the legend MUST NOT open a tooltip — the legend only
// brings a series forward. Returns the list of problems (empty = conformant).
const interactionCheck = (type, config) =>
  page.evaluate(
    async ([type, config]) => {
      const raf = () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      const problems = [];
      window.renderAudit(type, config, 760, 480, true, 1, 1, true);
      await raf();
      const card = document.querySelector("#root > div");
      if (!card) return ["interactive render produced no card"];

      // (1) focus the first focusable DATA element → a tooltip must appear.
      const pt = card.querySelector("[tabindex]");
      if (!pt) {
        problems.push(
          "no keyboard-focusable data element (interactive.md: data points are focusable)",
        );
      } else {
        pt.focus();
        await raf();
        if (!document.querySelector(".tooltip"))
          problems.push(
            "focusing a data element opened no tooltip (tooltip must anchor on the data point)",
          );
        pt.blur();
        await raf();
        if (document.querySelector(".tooltip"))
          problems.push("tooltip lingered after the data element lost focus");
      }

      // (2) hover the legend (if any) → NO tooltip may open.
      const legend = card.querySelector(".chart-legend");
      if (legend) {
        const target = legend.querySelector("rect, text") || legend;
        for (const t of ["mouseover", "mouseenter"])
          target.dispatchEvent(
            new MouseEvent(t, { bubbles: true, cancelable: true }),
          );
        await raf();
        if (document.querySelector(".tooltip"))
          problems.push(
            "hovering the legend opened a tooltip (the legend may only highlight a series)",
          );
      }
      return problems;
    },
    [type, config],
  );

// significant overlap: meaningful intersection (not just touching corners /
// rotated-bbox grazing).
function overlapArea(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ix > 2 && iy > 2 ? ix * iy : 0;
}

let violations = 0;
let checks = 0;
const failsByType = {};

for (const c of cases) {
  for (const vp of VIEWPORTS) {
    checks++;
    const res = await collect(c.type, c.config, vp);
    if (!res || res.error) {
      console.log(`  ✗ ${c.type} [${c.label}] ${vp.name}: ${res?.error || "render failed"}`);
      violations++;
      (failsByType[c.type] ??= []).push(`${c.label}/${vp.name}: render`);
      continue;
    }
    const { boxes, cardW, cardH } = res;
    const problems = [];

    // overlaps
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const area = overlapArea(boxes[i], boxes[j]);
        const minA = Math.min(
          boxes[i].w * boxes[i].h,
          boxes[j].w * boxes[j].h,
        );
        if (area > 0.2 * minA)
          problems.push(`overlap "${boxes[i].t}" × "${boxes[j].t}"`);
      }

    // out of bounds (card)
    const M = 1.5;
    for (const b of boxes)
      if (b.x < -M || b.y < -M || b.x + b.w > cardW + M || b.y + b.h > cardH + M)
        problems.push(`out-of-bounds "${b.t}"`);

    if (problems.length) {
      violations += problems.length;
      const tag = `${c.label}/${vp.name}`;
      (failsByType[c.type] ??= []).push(`${tag}: ${problems.slice(0, 3).join("; ")}`);
    }
  }

  // reveal invariant — once per type (sample), data-independent: the plot is
  // ~blank at progress 0 (marks appear from nothing).
  if (c.label === "sample") {
    const frac = await revealVisible(c.type, c.config);
    if (frac > REVEAL_INK_MAX) {
      violations++;
      (failsByType[c.type] ??= []).push(
        `reveal: ${(frac * 100).toFixed(1)}% of the plot is drawn at progress 0 (should be ~0)`,
      );
    }
    // interaction invariant — tooltip anchors on the data element, not the legend.
    for (const problem of await interactionCheck(c.type, c.config)) {
      violations++;
      (failsByType[c.type] ??= []).push(`interaction: ${problem}`);
    }
  }
}

await browser.close();

console.log(`\nLayout audit — ${cases.length} datasets × ${VIEWPORTS.length} viewports = ${checks} renders`);
const types = Object.keys(failsByType);
if (!types.length) {
  console.log(
    `✓ ALL GREEN — no overlaps, nothing out of bounds, blank at progress 0, tooltip anchors on the data element (not the legend).`,
  );
  process.exit(0);
}
for (const t of types) {
  console.log(`\n✗ ${t} (${failsByType[t].length}):`);
  for (const f of failsByType[t].slice(0, 8)) console.log(`    ${f}`);
  if (failsByType[t].length > 8) console.log(`    … +${failsByType[t].length - 8} more`);
}
console.log(`\nTotal violations: ${violations} across ${types.length} types`);
process.exit(1);
