// twin/skills/twin-chart-web/scripts/render-web.mjs
//
// The render ladder's third rung. Rung one (`twin-chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; rung two (`twin-chart-video/scripts/render-video.mjs`) turns a
// Remotion composition into an mp4; this turns TWO React elements — the same component,
// desktop and narrow layout — into one self-contained HTML file: both SVGs SSR'd server-side,
// one inlined interaction script, no external request.
//
// It runs in node, which is why it is the piece that derives the furniture colours and measures
// every gutter: `deriveFurniture`/`measureText` live beside a native rasteriser
// (`twin-chart-beat/scripts/render-still.mjs`) that no browser bundle can load. Deriving here and
// passing ink/muted/grid/measure in as props keeps ONE implementation of the colour rule and the
// text-measurement rule across all three genres, exactly the pattern `render-video.mjs` already
// set.
//
// Usage:  bun skills/twin-chart-web/scripts/render-web.mjs [--data <csv>] [--out <path>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "../../twin-chart-beat/scripts/render-still.mjs";
import {
  EmissionsWeb,
  DESKTOP_LAYOUT,
  NARROW_LAYOUT,
} from "../assets/EmissionsWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The story's own constants — the same words `twin-chart-video/scripts/render-video.mjs` uses
 *  for the same beat, so the three genres never disagree about what the chart says. Duplicated
 *  rather than imported: importing `render-video.mjs` would also run its own top-level Remotion
 *  render as a side effect, which this script must not trigger. */
const BEAT = {
  entity: "Switzerland",
  firstYear: 1950,
  reference: 32.5,
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  source:
    "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  referenceLabel: "Niveau de 1967",
  peakLabel: "pic de 1973",
  limits:
    "Émissions territoriales seulement, hors biens importés et aviation internationale.",
  alt: "Courbe des émissions territoriales suisses de CO₂, 1950 à 2024 : une montée jusqu'à un pic en 1973, puis une baisse qui repasse sous le niveau de 1967 en 2024.",
};

/**
 * The frozen OWID series, tonnes to megatonnes, one country picked out of the multi-country CSV
 * the grapher endpoint actually returns. Simple `split(",")`, same as `render-video.mjs`'s own
 * parser — not RFC4180-quoted, which is fine for this file's own columns (no country name in this
 * dataset carries a comma).
 */
export function readingsFromCsv(csv, { entity, firstYear }) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Entity / Year / Annual CO₂ emissions column, got: ${header}`,
    );

  return rows
    .map((row) => row.split(","))
    .filter((cells) => cells[entityAt] === entity)
    .map((cells) => ({
      year: Number(cells[yearAt]),
      mt: Number(cells[valueAt]) / 1e6,
    }))
    .filter(
      (r) => Number.isFinite(r.year) && Number.isFinite(r.mt) && r.year >= firstYear,
    )
    .sort((a, b) => a.year - b.year);
}

/** Strips the `export` keyword from each top-level declaration so `interaction.mjs` — authored as
 *  an ES module for its own unit tests — can also run as a plain classic `<script>`: no
 *  `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that restricts module
 *  scripts. The file's own top-level `initAll()` call survives untouched and runs the moment the
 *  script tag is parsed, since it sits after the SVGs and the tooltip div in the HTML. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, grid }) {
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  --grid: ${grid};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  font-family: Helvetica, Arial, sans-serif;
}
.chart-figure { margin: 0; max-width: 900px; }
svg.chart { display: block; width: 100%; height: auto; }
/* Two pre-rendered layouts (web-discipline.md, "Responsive behaviour") — the narrow one hidden
   by default, swapped in below a fixed breakpoint. No layout is computed in the browser; the
   media query only chooses which server-rendered frame is on screen. */
svg.chart[data-layout="narrow"] { display: none; }
@media (max-width: 480px) {
  svg.chart[data-layout="desktop"] { display: none; }
  svg.chart[data-layout="narrow"] { display: block; }
}
.pt { cursor: pointer; }
.pt:hover, .pt:focus, .pt-active {
  fill: var(--muted);
  outline: none;
}
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
#tooltip {
  position: fixed;
  max-width: 220px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.3;
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--muted);
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
}
#tooltip[hidden] { display: none; }
`.trim();
}

async function render({ dataPath, outPath }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv, {
    entity: BEAT.entity,
    firstYear: BEAT.firstYear,
  });
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const furniture = deriveFurniture(BEAT.ground);
  const sharedProps = {
    data,
    title: BEAT.title,
    source: BEAT.source,
    alt: BEAT.alt,
    limits: BEAT.limits,
    ground: BEAT.ground,
    accent: BEAT.accent,
    reference: BEAT.reference,
    referenceLabel: BEAT.referenceLabel,
    peakLabel: BEAT.peakLabel,
    measure: measureText,
    ...furniture,
  };

  const desktopSvg = renderToStaticMarkup(
    createElement(EmissionsWeb, { ...sharedProps, layout: DESKTOP_LAYOUT }),
  );
  const narrowSvg = renderToStaticMarkup(
    createElement(EmissionsWeb, { ...sharedProps, layout: NARROW_LAYOUT }),
  );

  const interactionSource = await readFile(
    join(HERE, "../assets/interaction.mjs"),
    "utf8",
  );
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(BEAT.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: BEAT.ground, accent: BEAT.accent, ...furniture })}
</style>
</head>
<body>
<figure class="chart-figure">
${desktopSvg}
${narrowSvg}
</figure>
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html);
  return { outPath, readings: data.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const dataPath = resolve(flag("--data", "/tmp/web-twin/data.csv"));
  const outPath = resolve(flag("--out", "/tmp/web-twin/co2.html"));

  const { readings } = await render({ dataPath, outPath });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}

export { render, BEAT };
