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
}

await browser.close();

console.log(`\nLayout audit — ${cases.length} datasets × ${VIEWPORTS.length} viewports = ${checks} renders`);
const types = Object.keys(failsByType);
if (!types.length) {
  console.log(`✓ ALL GREEN — no overlaps, nothing out of bounds.`);
  process.exit(0);
}
for (const t of types) {
  console.log(`\n✗ ${t} (${failsByType[t].length}):`);
  for (const f of failsByType[t].slice(0, 8)) console.log(`    ${f}`);
  if (failsByType[t].length > 8) console.log(`    … +${failsByType[t].length - 8} more`);
}
console.log(`\nTotal violations: ${violations} across ${types.length} types`);
process.exit(1);
