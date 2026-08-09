// twin/skills/twin-map-web/scripts/render-web.mjs
//
// The map genre's own third rung, the same role `twin-chart-web/scripts/render-web.mjs` plays for
// charts: rung one and two of a map beat are the still and the video
// (`twin-map-beat/scripts/render-map.mjs`); this turns the SAME baked plate into one self-contained
// HTML file — two SSR'd SVGs (one per `WebLayout`), one always-rendered accessible table, one
// inlined interaction script, no external request once the plate is inlined as a data URI.
//
// It runs in node, which is why it derives the furniture colours and measures every gutter:
// `deriveFurniture`/`measureText` live beside a native rasteriser in this skill's OWN
// `./render-still.mjs` (a byte-identical copy of `twin-chart-beat`'s — a skill never imports
// another skill, so nothing under a skill may import out of it;
// `splash-twin/test/no-cross-skill-imports.test.ts` fails loud on any specifier that does).
//
// `renderMapWeb` below is the genre's own machinery and knows nothing of any one story: it takes
// the component, the accessible-table component and the layouts to call the first with, as
// arguments — never reaches for one story's own constants by name. Everything under it (the
// CONFIG block, `ensurePlate`, `render`, the CLI block) is the runner for THIS SKILL'S OWN SEED —
// `assets/MapWebSeed.tsx`, drawn from `assets/sample-data/regions.json` — the same "the skill's
// script hosts its own worked values behind a labelled seam" shape `twin-chart-web`'s own
// `render-web.mjs` uses.
//
// Usage:  bun skills/twin-map-web/scripts/render-web.mjs [outDir] [--data <json>]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { MapWebSeed, RegionTable, LAYOUTS } from "../assets/MapWebSeed.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults — what
// a journalist writing their own map-web beat replaces wholesale. Everything else in this file —
// `renderMapWeb` and its `{ component, table, layouts, props, outDir, name }` signature,
// `inlineable`, `escapeHtml`, `buildCss` — is this genre's own mechanics and is left alone.
const SEED = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "A sample of major European metro-area populations",
  source: "Sample data — not a real measurement",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Population, millions",
  caveat: "Sample data for demonstration purposes, not a census figure.",
  alt:
    "A map of Europe with thirteen circles, one per sample metro area, sized by population. " +
    "Paris draws the largest circle; Dublin the smallest.",
};
const PLATE_SIZE = 496;
const DEFAULT_PLATE_DIR = `/tmp/map-twin-web/plate-${PLATE_SIZE}`;
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/regions.json");
const DEFAULT_OUT_DIR = "/tmp/map-web-twin";
const OUTPUT_NAME = "population.html";
// =========================================

/**
 * SSRs one React element per entry in `layouts` (the map itself), SSRs `table` ONCE (the same
 * readings do not need saying twice per layout — see `MapWebSeed.tsx`'s own doc-comment on
 * `RegionTable`), wraps both in one self-contained HTML file and writes it to disk. Generic across
 * every map-web beat: it does not know a story's own frame widths or point count.
 */
async function renderMapWeb({ component, table, layouts, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);
  const svgs = layouts.map((layout) =>
    renderToStaticMarkup(
      createElement(component, { ...props, ...furniture, measure: measureText, layout }),
    ),
  );
  const tableHtml = renderToStaticMarkup(
    createElement(table, { points: props.geometry.points, ...furniture }),
  );

  const interactionSource = await readFile(join(HERE, "../assets/interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, accent: props.accent, ...furniture })}
</style>
</head>
<body>
<figure class="map-figure">
${svgs.join("\n")}
</figure>
${tableHtml}
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

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted }) {
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 16px;
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
.map-figure { margin: 0 0 24px; max-width: 860px; }
svg.map { display: block; width: 100%; height: auto; }
/* Two pre-rendered layouts (map-web-discipline.md, "Responsive behaviour") — the narrow one
   hidden by default, swapped in below a fixed breakpoint. No layout is computed in the browser;
   the media query only chooses which server-rendered frame is on screen. */
svg.map[data-layout="narrow"] { display: none; }
@media (max-width: 480px) {
  svg.map[data-layout="desktop"] { display: none; }
  svg.map[data-layout="narrow"] { display: block; }
}
.pt { cursor: pointer; }
.pt:hover, .pt:focus, .pt-active {
  fill: var(--muted);
  fill-opacity: 0.28;
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
/* The accessible table (MapWebSeed.tsx's RegionTable): a real, always-visible table, not a
   screen-reader-only trick — see references/map-web-discipline.md, "The accessibility
   question". Styled plainly enough to read as a data table, not hidden or shrunk to decoration. */
.region-table {
  max-width: 860px;
  border-collapse: collapse;
  font-size: 14px;
}
.region-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.region-table th, .region-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
}
.region-table tr.subject th, .region-table tr.subject td {
  color: var(--accent);
  font-weight: 700;
}
`.trim();
}

/** Bakes the plate if it is not already at `PLATE_DIR` — the same "bake once, reuse" shape
 *  `twin-map-beat/scripts/render-preview.mjs` uses for its own seed. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png")))
    return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [join(HERE, "bake-plate.mjs"), "--size", String(PLATE_SIZE), "--out", plateDir],
    { cwd: resolve(HERE, "../../.."), stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake-plate.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

/** The seed beat's own runner: bakes the plate if missing, reads the seed's own points, hands the
 *  seed component and its two layouts (`MapWebSeed`, `RegionTable`, `LAYOUTS`, imported above from
 *  this skill's own `assets/`) to the genre's generic `renderMapWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const points = JSON.parse(await readFile(dataPath, "utf8"));
  if (points.length < 2) throw new Error(`need at least two points, got ${points.length}`);

  // The bake's own points already carry `px`/`py`; the seed's data file carries `value` — merge
  // by key so `geometry.points` is the one shape both the map and the table read from.
  const valueByKey = new Map(points.map((p) => [p.key, p.value]));
  const merged = geometry.points.map((p) => ({ ...p, value: valueByKey.get(p.key) ?? p.value }));

  const { outPath } = await renderMapWeb({
    component: MapWebSeed,
    table: RegionTable,
    layouts: LAYOUTS,
    props: {
      geometry: { ...geometry, points: merged },
      plate,
      title: SEED.title,
      source: SEED.source,
      basemapCredit: SEED.basemapCredit,
      legendCaption: SEED.legendCaption,
      caveat: SEED.caveat,
      alt: SEED.alt,
      ground: SEED.ground,
      accent: SEED.accent,
    },
    outDir,
    name,
  });
  return { outPath, points: merged.length };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const plateDir = resolve(flag("--plate", DEFAULT_PLATE_DIR));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, points } = await render({ dataPath, plateDir, outDir });
  console.log(`map-web beat → ${outPath}  [${points} points]`);
}

export {
  render,
  renderMapWeb,
  ensurePlate,
  loadPlate,
  SEED,
  PLATE_SIZE,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
