// twin/skills/twin-map-web/scripts/render-web.mjs
//
// The map genre's own third rung, the same role `twin-chart-web/scripts/render-web.mjs` plays for
// charts: rung one and two of a map beat are the still and the video
// (`twin-map-beat/scripts/render-map.mjs`); this turns the SAME baked plate into one self-contained
// HTML file — one fluid SVG (geometry only) plus its full HTML overlay (furniture, controls), one
// always-rendered accessible table, one inlined interaction script, no external request once the
// plate is inlined as a data URI.
//
// It runs in node, which is why it derives the furniture colours: `deriveFurniture` lives beside a
// native rasteriser in this skill's OWN `./render-still.mjs` (a byte-identical copy of
// `twin-chart-beat`'s — a skill never imports another skill, so nothing under a skill may import
// out of it; `splash-twin/test/no-cross-skill-imports.test.ts` fails loud on any specifier that
// does).
//
// `renderMapWeb` below is the genre's own machinery and knows nothing of any one story: it takes
// the component, the accessible-table component and the props to call the first with, as
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
import { deriveFurniture } from "./render-still.mjs";
import { MapWebSeed, RegionTable, ZOOM_SCALE } from "../assets/MapWebSeed.tsx";
import { groupsOf, slugOf } from "../assets/geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults — what
// a journalist writing their own map-web beat replaces wholesale. Everything else in this file —
// `renderMapWeb` and its `{ component, table, props, outDir, name }` signature, `inlineable`,
// `escapeHtml`, `buildCss` — is this genre's own mechanics and is left alone.
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
  // Off — see SKILL.md's "When to use": thirteen points spread across a continent stay legible and
  // individually reachable at every tested width (1600/1024/768/375) without zooming. The
  // mechanism is real and unit-tested (test/render-web.test.ts exercises `zoomable: true`
  // directly) but this seed's own data does not warrant turning it on.
  zoomable: false,
};
// Baked generously so the plate stays at or near native resolution across the tested width range
// (375–1600px, minus the page's own 16px body padding on each side) rather than a narrow max-width
// that would leave gutters beside a full-bleed beat — see references/map-web-discipline.md, "Full
// width, genuinely", for the exact numbers this trades off.
const PLATE_SIZE = 1000;
const DEFAULT_PLATE_DIR = `/tmp/map-twin-web/plate-${PLATE_SIZE}`;
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/regions.json");
const DEFAULT_OUT_DIR = "/tmp/map-web-twin";
const OUTPUT_NAME = "population.html";
// =========================================

/**
 * SSRs the map component ONCE (no per-layout duplication — the fluid SVG plus its HTML overlay IS
 * the one responsive render, see `MapWebSeed.tsx`'s own header note), SSRs `table` ONCE, wraps both
 * in one self-contained HTML file and writes it to disk. Generic across every map-web beat: it does
 * not know a story's own point count or its own filter groups.
 */
async function renderMapWeb({ component, table, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = renderToStaticMarkup(
    createElement(table, { points: props.geometry.points, ...furniture }),
  );

  const interactionSource = await readFile(join(HERE, "../assets/interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  const groups = groupsOf(props.geometry.points);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ...props, ...furniture, groups })}
</style>
</head>
<body>
<div class="map-web-page">
${mapHtml}
${tableHtml}
</div>
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
  return { outPath };
}

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * `groups`: this beat's own filter dimension (`geo-symbol.ts`'s `groupsOf`, the one place it is
 * computed — see that file's own header note on why it is shared rather than re-derived here).
 * Each group gets one `:has()` rule that hides every `.pt`/`.point-label`/table row NOT tagged with
 * it — pure CSS, so the filter (like the zoom toggle below it) works identically with the page's
 * own inline `<script>` absent entirely. `:has()` is the one modern-CSS assumption this genre now
 * makes (Chrome 105+/Safari 15.4+/Firefox 121+, all long-shipped in every evergreen browser this
 * self-contained HTML is built for) — accepted rather than hand-rolling a JS-only fallback for a
 * capability that only degrades to "the filter/zoom controls are inert, the unfiltered/unzoomed
 * view still renders complete" on anything older, which is exactly the guarantee this genre already
 * makes for JavaScript being off.
 */
function buildCss({ ground, accent, ink, muted, groups }) {
  const filterRules = groups
    .map((g) => {
      const id = `mw-filter-${slugOf(g)}`;
      const attr = escapeAttr(g);
      return [
        `.map-web-page:has(#${id}:checked) .pt:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) .point-label:not([data-group="${attr}"]) { display: none; }`,
        // The decorative SVG mark, too — otherwise a narrowed filter leaves every OTHER region's
        // circle sitting on the map with no label and no hit target, an ambiguous ghost rather
        // than a genuinely narrower map (caught by screenshotting the filtered state, not by
        // reading the markup).
        `.map-web-page:has(#${id}:checked) svg.map circle[data-group]:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) .region-table tbody tr:not([data-group="${attr}"]) { display: none; }`,
      ].join("\n");
    })
    .join("\n");

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
/* No max-width anywhere below: the beat takes the width its container gives it
   (map-web-discipline.md, "Full width, genuinely"). The only bound is the map frame's own
   aspect-ratio, which keeps the plate from ever stretching into a letterbox strip. */
.map-web-page, .map-web { width: 100%; }
.mw-title { font-size: 21px; font-weight: 700; margin: 0 0 4px; }
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
.mw-filter {
  border: 1px solid var(--muted);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 0 0 12px;
  font-size: 13px;
}
.mw-filter legend { font-size: 12px; font-weight: 600; padding: 0 4px; }
.mw-filter label { margin-right: 14px; white-space: nowrap; cursor: pointer; }
.mw-zoom-toggle-label { display: inline-block; font-size: 13px; margin: 0 0 8px; cursor: pointer; }
/* The viewport: aspect-ratio locked to the plate's own frame, so height grows WITH the width
   instead of staying fixed while the width alone stretches (the letterbox failure mode this genre
   exists to avoid). Not zoomed: overflow hidden, content exactly fills it, nothing to pan. */
.mw-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--muted);
}
.mw-viewport[tabindex] { outline-offset: 2px; }
.mw-viewport[tabindex]:focus-visible { outline: 2px solid var(--ink); }
.mw-zoomable { position: relative; width: 100%; height: 100%; }
svg.map { display: block; width: 100%; height: 100%; }
/* Furniture, in HTML: font-size is a fixed CSS number on every rule below, so it never tracks the
   container's own width the way an SVG-embedded <text> inside a scaling viewBox would. */
.point-label {
  position: absolute;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}
.point-label.subject { color: var(--accent); font-weight: 700; }
/* The interaction layer: a real <button>, fixed-CSS-pixel diameter — a legitimate touch/pointer
   target at every width, unlike an SVG hit-circle sized in frame units (see MapWebSeed.tsx's own
   HIT_TARGET_PX note). */
.pt {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
.pt:hover, .pt:focus, .pt.pt-active {
  background: var(--muted);
  opacity: 0.28;
  outline: none;
}
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  opacity: 1;
  background: transparent;
}
.mw-legend { margin: 14px 0 6px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 8px; }
.mw-legend-marks { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.mw-legend-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mw-legend-swatch { display: block; border-radius: 50%; border: 1px solid var(--muted); }
.mw-legend-value { font-size: 12px; color: var(--muted); }
.mw-subject { font-size: 12px; font-weight: 700; color: var(--accent); margin: 10px 0 4px; }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 0 0 16px; }
${filterRules}
/* The bounded zoom (map-web-discipline.md, "Pan and zoom"): unchecked (the default), the frame
   shows exactly the full claim — nothing argument-bearing lives only past this control. Checked,
   the viewport becomes natively scrollable and its content grows by the one fixed, capped factor
   (ZOOM_SCALE) — a reader cannot zoom further than that, so the plate never degrades into
   unreadable blur. */
.map-web-page:has(#mw-zoom-toggle:checked) .mw-viewport { overflow: auto; }
.map-web-page:has(#mw-zoom-toggle:checked) .mw-zoomable {
  width: ${ZOOM_SCALE * 100}%;
  height: ${ZOOM_SCALE * 100}%;
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
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 8px;
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
 *  seed component and `RegionTable` (imported above from this skill's own `assets/`) to the
 *  genre's generic `renderMapWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const points = JSON.parse(await readFile(dataPath, "utf8"));
  if (points.length < 2) throw new Error(`need at least two points, got ${points.length}`);

  // The bake's own points already carry `px`/`py`; the seed's data file carries `value`/`group`
  // — merge by key so `geometry.points` is the one shape both the map and the table read from.
  const byKey = new Map(points.map((p) => [p.key, p]));
  const merged = geometry.points.map((p) => ({ ...p, ...(byKey.get(p.key) ?? {}) }));

  const { outPath } = await renderMapWeb({
    component: MapWebSeed,
    table: RegionTable,
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
      zoomable: SEED.zoomable,
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
