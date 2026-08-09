// twin/skills/twin-chart-web/scripts/render-web.mjs
//
// The render ladder's third rung. Rung one (`twin-chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; rung two (`twin-chart-video/scripts/render-video.mjs`) turns a
// Remotion composition into an mp4; this turns N React elements — the same component, one call
// per caller-supplied layout — into one self-contained HTML file: every SVG SSR'd server-side,
// one inlined interaction script, no external request.
//
// It runs in node, which is why it is the piece that derives the furniture colours and measures
// every gutter: `deriveFurniture`/`measureText` live beside a native rasteriser in this skill's OWN
// `./render-still.mjs` — a copy of `twin-chart-beat`'s, because a skill never imports another skill —
// which no browser bundle can load. Deriving here and passing ink/muted/grid/measure in as props
// keeps ONE implementation of the colour rule and the text-measurement rule per render, exactly the
// pattern `render-video.mjs` already set; the copies are kept in step by
// `splash-twin/test/helper-parity.test.ts`.
//
// `renderWeb` below is the genre's own machinery and knows nothing of any one story: it takes the
// component and the layouts to call it with as arguments, never reaches for one story's own
// constants by name. Everything under it (the CONFIG block, `render`, the CLI block) is the runner
// for THIS SKILL'S OWN SEED — `assets/ChartWebSeed.tsx`, drawn from `assets/sample-data/` — which is
// the same "the skill's script hosts its own worked values behind a labelled seam" shape Tom's own
// reference skills use (`map-explainer/scripts/prep-geo.mjs`'s `COUNTRIES`/`RIVER`/`ANCHOR_BBOX`,
// `cesium-flyover/scripts/prep-cesium-path.mjs`'s `START`).
//
// It is the seed's runner and not a story's for one hard reason: NOTHING IN THIS FILE MAY IMPORT OUT
// OF THIS SKILL. Until this was fixed, the line below read
// `import { EmissionsWeb, LAYOUTS } from "../../../proof/co2-suisse/EmissionsWeb.tsx"` — copy this
// skill into a journalist's root, which is the entire premise, and it would not build, because no
// copy carries that story workspace with it. A real beat writes its own runner in this shape beside
// its own story (`proof/co2-suisse/render-web.mjs` is exactly that), importing its own component and
// its own `LAYOUTS`; `renderWeb` itself does not change.
//
// Usage:  bun skills/twin-chart-web/scripts/render-web.mjs [outDir] [--data <json>]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { ChartWebSeed, LAYOUTS } from "../assets/ChartWebSeed.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults: what a
// journalist writing their own web beat replaces wholesale. Everything else in this file — `renderWeb`
// and its `{ component, layouts, props, outDir, name }` signature, `inlineable`, `escapeHtml`,
// `buildCss` — is this genre's own mechanics and is left alone.
/** The seed beat's own constants — the same words `scripts/render-preview.mjs` renders the seed's
 *  still with, so the skill's two renders never disagree about what the chart says. Duplicated
 *  rather than imported from that script: importing it would also run its own top-level Remotion-free
 *  resvg render as a side effect, which this script must not trigger. */
const SEED = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  subject: "the sample town",
  title: "Rainfall over the sample town fell by a third",
  source: "Sample data — not a real measurement",
  alt: "A line falling from 912 to 604 across eleven readings.",
};
/** Where the seed's own data lives, and what its own output is named. A real beat's runner points at
 *  its own frozen series and names its own file — a different story's data does not sit at this
 *  path, and a different beat is not named `rainfall.html`. */
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/rainfall.json");
const DEFAULT_OUT_DIR = "/tmp/web-twin";
const OUTPUT_NAME = "rainfall.html";
// =========================================

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

/** The seed beat's own runner: reads the seed's own `{ year, value }` series, builds its props, hands
 *  the seed component and its two layouts (`ChartWebSeed`, `LAYOUTS`, imported above from this
 *  skill's own `assets/`) to the genre's generic `renderWeb`. */
async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: ChartWebSeed,
    layouts: LAYOUTS,
    props: {
      data,
      title: SEED.title,
      source: SEED.source,
      alt: SEED.alt,
      subject: SEED.subject,
      ground: SEED.ground,
      accent: SEED.accent,
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
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}

export { render, renderWeb, SEED };
