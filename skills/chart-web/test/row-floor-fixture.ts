// A PAGE AS THIN AS THE ROW FLOOR NEEDS — ten rows of bars, a gutter, an x-axis row and a source
// line, assembled by the trunk's own `buildCss`, `stampRowFloor` and `webDocument`, so the page the
// tests measure is written by exactly the code a beat's page is. No typeface is embedded: the fit
// and the cell are what is measured, never a glyph. `spacerPx` stands in for furniture that is tall
// for a reason that is NOT the floor — the overflow a declared floor must not be allowed to excuse.
import {
  assertPlotCellIsItsViewBox,
  assertRowFloor,
  buildCss,
  stampRowFloor,
  webDocument,
} from "../scripts/render-web.mjs";

export const PLOT = { width: 800, height: 400 };
export const ROWS = 10;
export const PITCH = 40;
export const GUTTER_PX = 60;
export const AXIS_PX = 28;
export const FLOOR = {
  rows: ROWS,
  pitch: PITCH,
  px: 18,
  why: "Every row carries its name and a value at 12px on a ground chip; under 18px a row prints them over the next.",
};

/** `rounds` draws round marks over the bars — a row marker (r=6), a symbol spanning rows (r=60) and an
 *  ellipse — so the browser test can measure what the floor's counter-scale keeps round. */
export function rowMarkup({ spacerPx = 0, circleR = 0, rounds = false }: { spacerPx?: number; circleR?: number; rounds?: boolean } = {}) {
  const rows = Array.from({ length: ROWS }, (_, i) => i);
  const { width: W, height: H } = PLOT;
  return `<figure class="chart-figure" style="--title-size:24px;--title-weight:700;--subtitle-size:14px;--source-size:13px;--axis-size:12px;--note-size:12px;--label-size:14px;--label-weight:600">
<div class="chart-header"><h2 class="chart-title">Ten rows</h2>${spacerPx ? `<div style="height:${spacerPx}px"></div>` : ""}</div>
<div class="chart-plot" style="--y-gutter:${GUTTER_PX}px;--x-axis-h:${AXIS_PX}px;aspect-ratio:${W + GUTTER_PX} / ${H + AXIS_PX}">
<div class="y-axis">${rows.map((i) => `<span class="axis-label y" style="top:${(((i + 0.5) * PITCH) / H) * 100}%">Row ${i}</span>`).join("")}</div>
<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${rows
    .map((i) => `<rect x="0" y="${i * PITCH + 10}" width="${200 + i * 50}" height="20" fill="#555555"/>`)
    .join("")}${circleR ? `<circle cx="100" cy="100" r="${circleR}" fill="#0b7a75"/>` : ""}${
    rounds
      ? `<circle id="marker" cx="300" cy="50" r="6" fill="#0b7a75"/><circle id="symbol" cx="600" cy="200" r="60" fill="#0b7a75" fill-opacity="0.5"/><ellipse id="ellipse" cx="450" cy="300" rx="30" ry="15" fill="#0b7a75"/>`
      : ""
  }</svg>
<div class="overlay"></div>
<div class="x-axis"><span class="axis-label x" style="left:0%">0</span><span class="axis-label x" style="left:100%">100</span></div>
</div>
<p class="chart-source">Source: a fixture.</p>
</figure>`;
}

export const FURNITURE = { ground: "#ffffff", accent: "#0b7a75", ink: "#111111", muted: "#666666", grid: "#dddddd" };

/** The whole page, through the same three guards `renderWeb` runs before it writes one. */
export function rowPage({ spacerPx = 0, rowFloor = null as typeof FLOOR | null, rounds = false } = {}) {
  const markup = stampRowFloor(rowMarkup({ spacerPx, rounds }), rowFloor);
  const css = buildCss({ ...FURNITURE, plot: PLOT, rowFloor, fontStack: "Georgia, serif" });
  const html = webDocument({ lang: "en", title: "Row floor fixture", css, markup, script: "" });
  assertPlotCellIsItsViewBox(html);
  assertRowFloor(html, rowFloor);
  return html;
}
