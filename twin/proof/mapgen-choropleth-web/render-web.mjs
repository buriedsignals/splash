// twin/proof/mapgen-choropleth-web/render-web.mjs
//
// This beat's own third rung — the same role `twin-map-web/scripts/render-web.mjs` plays for the
// symbol-map genre: bakes/loads the plate, joins the frozen csv to the shapes, checks the claim
// against the ACTUAL joined values (not just asserting the title is true), and turns the result
// into one self-contained HTML file — two SSR'd SVGs (one per `WebLayout`), one always-rendered
// accessible table, one inlined interaction script, no external request once the plate is inlined
// as a data URI.
//
// `renderMapWeb` below is this beat's own copy of the genre's generic machinery (nothing here
// imports across proof/ beats or out of a skill); everything under the CONFIG block is this SEED
// beat's own words, data paths and claim.
//
// Usage:  bun proof/mapgen-choropleth-web/render-web.mjs [outDir]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { ChoroplethWeb, RegionTable, LAYOUTS } from "./ChoroplethWeb.tsx";
import {
  CO2_2023_STUDY,
  CO2_BREAKS,
  joinShapes,
  joinValues,
  valuesFromCsv,
} from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — this beat's own words, data and claim =====
const SEED = {
  ground: "#FFFFFF",
  accent: "#B2182B",
  title:
    "The Faroe Islands' per-capita CO₂ emissions are the highest of the 41 countries on this map — more than eight times Albania's, the lowest",
  source: "Global Carbon Budget 2025, via Our World in Data — 2023 data",
  basemapCredit: "shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap",
  legendCaption: "CO₂ emissions per capita, tonnes/person, 2023",
  caveat:
    "Territorial, per-capita figures: a small-population country can rank far above or below its neighbours on a small absolute change. This map states the ranking, not a cause.",
  alt:
    "A choropleth of 41 European countries shaded by 2023 per-capita CO2 emissions, in six classes " +
    "from under 2 to 10 tonnes and over. The Faroe Islands, outlined in this map's accent colour, " +
    "carry the darkest class at just over 13 tonnes per person, the highest on the map. Albania, " +
    "outlined in ink, carries the lightest class at about 1.6 tonnes per person, the lowest.",
};
const PLATE_SIZE = 496;
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same shapes. `ensurePlate` below bakes
// only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_VALUES_PATH = join(HERE, "co2-per-capita-2023.csv");
const DEFAULT_OUT_DIR = join(HERE, "render");
const OUTPUT_NAME = "choropleth.html";
const SUBJECT_KEY = "FRO";
const COMPARISON_KEY = "ALB";
// =========================================

/**
 * Reads the ACTUAL joined values and checks the claim against them — never just asserts the title
 * is true. Throws, loudly, naming exactly what failed, the same way
 * `twin-map-beat/assets/geo.ts`'s own `claimViolations` does for its own story.
 */
export function checkClaim(values) {
  const violations = [];
  const entries = [...values.entries()];
  const [maxKey, maxValue] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const [minKey, minValue] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  if (maxKey !== SUBJECT_KEY)
    violations.push(
      `the claimed subject is ${SUBJECT_KEY}, but the actual maximum of the 41 joined values is ${maxKey} (${maxValue})`,
    );
  if (minKey !== COMPARISON_KEY)
    violations.push(
      `the claimed comparison is ${COMPARISON_KEY}, but the actual minimum of the 41 joined values is ${minKey} (${minValue})`,
    );

  const subject = values.get(SUBJECT_KEY);
  const comparison = values.get(COMPARISON_KEY);
  if (subject === undefined || comparison === undefined)
    throw new Error(`cannot check the claim: no joined value for ${SUBJECT_KEY} or ${COMPARISON_KEY}`);
  const ratio = subject / comparison;
  if (!(ratio > 8))
    violations.push(
      `the claim says "more than eight times" but ${SUBJECT_KEY} (${subject}) / ${COMPARISON_KEY} (${comparison}) = ${ratio.toFixed(2)}, not above 8`,
    );

  if (violations.length > 0)
    throw new Error(`claim check failed:\n  ${violations.join("\n  ")}`);

  return { subject: { key: maxKey, value: maxValue }, comparison: { key: minKey, value: minValue }, ratio };
}

/**
 * SSRs one React element per entry in `layouts` (the map itself), SSRs `table` ONCE, wraps both in
 * one self-contained HTML file and writes it to disk.
 */
async function renderMapWeb({ component, table, layouts, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);
  const svgs = layouts.map((layout) =>
    renderToStaticMarkup(
      createElement(component, { ...props, ...furniture, measure: measureText, layout }),
    ),
  );
  const tableHtml = renderToStaticMarkup(
    createElement(table, { rows: props.rows, ...furniture }),
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
/* Two pre-rendered layouts (map-web-discipline.md, "Responsive behaviour") — the narrow one hidden
   by default, swapped in below a fixed breakpoint. No layout is computed in the browser; the media
   query only chooses which server-rendered frame is on screen. */
svg.map[data-layout="narrow"] { display: none; }
@media (max-width: 480px) {
  svg.map[data-layout="desktop"] { display: none; }
  svg.map[data-layout="narrow"] { display: block; }
}
.pt { cursor: pointer; }
.pt:hover, .pt:focus, .pt-active {
  filter: brightness(0.85);
  outline: none;
}
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
}
.hit-proxy { cursor: pointer; }
#tooltip {
  position: fixed;
  max-width: 240px;
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
/* The accessible table (ChoroplethWeb.tsx's RegionTable): a real, always-visible table, not a
   screen-reader-only trick — see references/map-web-discipline.md, "The accessibility question". */
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

/** Bakes the plate if it is not already at `plateDir`. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
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

/** This beat's own runner: bakes the plate if missing, joins the shapes to the frozen csv, checks
 *  the claim against the actual joined values, and hands everything to `renderMapWeb`. The shapes
 *  themselves are read from the BAKED geometry (`bake-plate.mjs` already reads `countries.geojson`
 *  and joins on `ADM0_A3` before it ever writes `geometry.json`), so this runner takes only the
 *  values path and the plate directory, not a second shapes path. */
async function render({ valuesPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  // The shape-side join: every declared code must find a shape (`geo-choropleth.ts`'s own
  // `joinShapes`, thrown loud on a miss — this ran once already inside `bake-plate.mjs`, and runs
  // again here against the BAKED geometry so a stale plate directory cannot silently drop a shape).
  const shapes = joinShapes(CO2_2023_STUDY, geometry.shapes);

  // The value-side join: every declared code must find a value in the frozen csv
  // (`geo-discipline.md` rule 5, made real — no alias, no declared no-data: this beat's study set
  // is exactly the 41 codes both sources actually carry).
  const csv = await readFile(valuesPath, "utf8");
  const values = valuesFromCsv(csv);
  const { rows } = joinValues(CO2_2023_STUDY, values, { alias: {}, expectedNoData: [] });

  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));
  const named = shapes.map((shape) => ({
    key: shape.key,
    name: shape.name,
    rings: shape.rings,
    value: valueByKey.get(shape.key) ?? null,
  }));

  // The claim, checked against the ACTUAL joined values, not just asserted true in the title.
  const claim = checkClaim(values);

  const { outPath } = await renderMapWeb({
    component: ChoroplethWeb,
    table: RegionTable,
    layouts: LAYOUTS,
    props: {
      geometry: { frame: geometry.frame, shapes: named },
      rows: named,
      breaks: CO2_BREAKS,
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
  return { outPath, regions: named.length, claim };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const valuesPath = resolve(flag("--values", DEFAULT_VALUES_PATH));
  const plateDir = resolve(flag("--plate", DEFAULT_PLATE_DIR));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, regions, claim } = await render({ valuesPath, plateDir, outDir });
  console.log(
    `choropleth-web beat → ${outPath}  [${regions} regions]\n` +
      `claim: ${claim.subject.key} (${claim.subject.value}) / ${claim.comparison.key} (${claim.comparison.value}) = ${claim.ratio.toFixed(2)}x`,
  );
}

export { render, renderMapWeb, ensurePlate, loadPlate, SEED, PLATE_SIZE, DEFAULT_PLATE_DIR };
