// twin/skills/twin-chart-web/scripts/render-web.mjs
//
// The render ladder's third rung. Rung one (`twin-chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; rung two (`twin-chart-video/scripts/render-video.mjs`) turns a
// Remotion composition into an mp4; this turns N React elements — the same component, one call
// per caller-supplied layout — into one self-contained HTML file: every SVG SSR'd server-side,
// one inlined interaction script, no external request.
//
// It runs in node, which is why it is the piece that derives the furniture colours and measures
// every gutter: `deriveFurniture`/`measureText` live beside a native rasteriser
// (`twin-chart-beat/scripts/render-still.mjs`) that no browser bundle can load. Deriving here and
// passing ink/muted/grid/measure in as props keeps ONE implementation of the colour rule and the
// text-measurement rule across all three genres, exactly the pattern `render-video.mjs` already
// set.
//
// `renderWeb` below is the genre's own machinery and knows nothing of any one story: it takes the
// component and the layouts to call it with as arguments, never reaches for one story's own
// constants by name. The `EmissionsWeb`/`LAYOUTS` import below, and everything under it (`BEAT`,
// `readingsFromCsv`, `render`, the CLI block), is the CO₂ beat's own runner — the same "a story's
// script happens to be filed beside the skill" shape `render-video.mjs` already has. A second beat
// would bring its own component, its own `LAYOUTS` array and its own runner; `renderWeb` itself
// would not change.
//
// Usage:  bun skills/twin-chart-web/scripts/render-web.mjs [outDir] [--data <csv>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "../../twin-chart-beat/scripts/render-still.mjs";
import { EmissionsWeb, LAYOUTS } from "../../../proof/co2-suisse/EmissionsWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * SSRs one React element per entry in `layouts`, wraps every resulting SVG in one self-contained
 * HTML file (title, css, inlined interaction script) and writes it to disk. Generic across every
 * web beat: it does not know a story's own frame widths, tick counts or numbers — only how many
 * layouts to render and how to stitch their SVGs together. Each entry of `layouts` is passed to
 * `component` verbatim as its `layout` prop; this function never reads a field off it directly, so
 * it is not coupled to any one story's layout shape.
 *
 * `props` carries everything the component needs BESIDES `layout` and the derived furniture/measure
 * (`title`/`source`/`ground`/`accent`/... — the story's own numbers). `deriveFurniture(props.ground)`
 * and `measureText` are supplied here, once, exactly as `render-video.mjs` supplies them to its own
 * composition — so every web beat shares one implementation of the colour rule and the
 * text-measurement rule, never a copy per story.
 */
async function renderWeb({ component, layouts, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);
  const svgs = layouts.map((layout) =>
    renderToStaticMarkup(
      createElement(component, {
        ...props,
        ...furniture,
        measure: measureText,
        layout,
      }),
    ),
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
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, accent: props.accent, ...furniture })}
</style>
</head>
<body>
<figure class="chart-figure">
${svgs.join("\n")}
</figure>
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath, layouts: layouts.length };
}

/** The CO₂ beat's own constants — the same words `twin-chart-video/scripts/render-video.mjs` uses
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

/** The CO₂ beat's own runner: reads its CSV, builds its props, hands its own component and its own
 *  two layouts (`EmissionsWeb`, `LAYOUTS`, imported above) to the skill's generic `renderWeb`. */
async function render({ dataPath, outDir, name = "co2.html" }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv, {
    entity: BEAT.entity,
    firstYear: BEAT.firstYear,
  });
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: EmissionsWeb,
    layouts: LAYOUTS,
    props: {
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
    },
    outDir,
    name,
  });
  return { outPath, readings: data.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", "/tmp/web-twin/data.csv"));
  const outDir = resolve(positional ?? flag("--out", "/tmp/web-twin"));

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}

export { render, renderWeb, BEAT };
