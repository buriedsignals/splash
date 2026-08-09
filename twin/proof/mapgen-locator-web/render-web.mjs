// twin/proof/mapgen-locator-web/render-web.mjs
//
// The web genre, applied to a LOCATOR beat for the first time in this project (locator existed
// only as a static beat until this one — `proof/map-geneva-locator`). Turns the SAME baked plate
// `bake-plate.mjs` produces into one self-contained HTML file: two SSR'd SVGs (one per
// `WebLayout`), one always-rendered accessible table (`OrgTable`), one inlined interaction
// script, no external request once the plate is inlined as a data URI.
//
// This is this beat's OWN copy of `twin-map-web/scripts/render-web.mjs`'s machinery, adapted to
// this beat's own component (`LocatorWeb`), table (`OrgTable`) and layouts — nothing here imports
// out of `twin-map-web` or across beats (a beat's own render script is its own, the same rule
// `geo-locator.ts`'s own header states for the pure core).
//
// Usage:  bun proof/mapgen-locator-web/render-web.mjs [outDir] [--data <csv>]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { LocatorWeb, OrgTable, LAYOUTS } from "./LocatorWeb.tsx";
import { orgsFromCsv } from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
const BEAT = {
  ground: "#FFFFFF",
  title: "Eleven international organisations headquartered in and around Geneva",
  source:
    "Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Category",
  caveat:
    "A locator marks position only — marker size does not encode a value. Coordinates are each " +
    "organisation's own Wikidata point, not a street address; the World Economic Forum's is in " +
    "Cologny, east of the main cluster.",
  alt:
    "Map of central Geneva. Eleven markers, all the same size, show international organisations " +
    "headquartered in the city, coloured by category: UN system agencies in blue cluster around " +
    "the Palais des Nations in the north, other intergovernmental bodies in orange nearby, and " +
    "other international bodies in green including the World Economic Forum to the east in Cologny.",
};
const PLATE_SIZE = 420; // this beat's own DESKTOP_LAYOUT.mapSize — see bake-plate.mjs's own header
const DEFAULT_PLATE_DIR = `/tmp/map-twin-web-locator/plate-${PLATE_SIZE}`;
const DEFAULT_DATA_PATH = join(HERE, "geneva-orgs.csv");
const DEFAULT_OUT_DIR = "/tmp/map-web-locator-twin";
const OUTPUT_NAME = "locator.html";
// =========================================

/**
 * SSRs one React element per entry in `layouts` (the map itself), SSRs `table` ONCE (the same
 * eleven readings do not need saying twice per layout), wraps both in one self-contained HTML
 * file and writes it to disk.
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

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, ...furniture })}
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

function buildCss({ ground, ink, muted }) {
  return `
:root {
  --ground: ${ground};
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
/* Two pre-rendered layouts — the narrow one hidden by default, swapped in below a fixed
   breakpoint. No layout is computed in the browser; the media query only chooses which
   server-rendered frame is on screen. */
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
/* The accessible table (LocatorWeb.tsx's OrgTable): a real, always-visible table, not a
   screen-reader-only trick. Styled plainly enough to read as a data table, not hidden or
   shrunk to decoration. */
.org-table {
  max-width: 860px;
  border-collapse: collapse;
  font-size: 14px;
}
.org-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.org-table th, .org-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
}
`.trim();
}

/** Bakes the plate if it is not already at `plateDir`. */
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

/** This beat's own runner: bakes the plate if missing, reads the eleven orgs from the frozen csv,
 *  hands `LocatorWeb`, `OrgTable` and `LAYOUTS` to the genre's generic `renderMapWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const orgs = orgsFromCsv(await readFile(dataPath, "utf8"));
  if (orgs.length < 1) throw new Error(`need at least one organisation, got ${orgs.length}`);

  // The bake's own points already carry `px`/`py` keyed by `key`; `orgsFromCsv` is the source of
  // truth for name/category/priority — merge by key so `geometry.points` is the one shape both
  // the map and the table read from.
  const pxOf = new Map(geometry.points.map((p) => [p.key, { px: p.px, py: p.py }]));
  const merged = orgs.map((o) => {
    const proj = pxOf.get(o.key);
    if (!proj) throw new Error(`bake has no projected point for ${o.key} (${o.name})`);
    return { ...o, ...proj };
  });
  if (merged.length !== orgs.length)
    throw new Error(`merge dropped rows: ${orgs.length} orgs, ${merged.length} merged`);

  const { outPath } = await renderMapWeb({
    component: LocatorWeb,
    table: OrgTable,
    layouts: LAYOUTS,
    props: {
      geometry: { ...geometry, points: merged },
      plate,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat: BEAT.caveat,
      alt: BEAT.alt,
      ground: BEAT.ground,
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
  console.log(`locator-web beat → ${outPath}  [${points} points]`);
}

export {
  render,
  renderMapWeb,
  ensurePlate,
  loadPlate,
  BEAT,
  PLATE_SIZE,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
