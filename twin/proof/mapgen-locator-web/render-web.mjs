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
  // The caveat and the alt are NOT here. Both used to be typed, and both were false of the picture
  // beside them: the alt called the orange tier "nearby" when the International Civil Defence
  // Organisation — an orange marker — is by nearest-neighbour distance the most isolated marker on
  // this map, and both sentences named the World Economic Forum as the eastern outlier while the
  // declutter had dropped its label in BOTH layouts. They are now built in `describeSeparation`
  // below, from the coordinates, and the marker keys they name are passed as `mustLabel` so the
  // render throws rather than ship words the reader cannot check against the frame.
};
const PLATE_SIZE = 420; // this beat's own DESKTOP_LAYOUT.mapSize — see bake-plate.mjs's own header
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same markers. `ensurePlate` below bakes
// only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "geneva-orgs.csv");
// And the OUTPUT defaults beside the beat too — where `locator.html` is actually committed. It
// used to default to `/tmp/map-web-locator-twin`, so running this script the obvious way produced
// a fresh file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
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

// ── Which markers stand apart, measured rather than described ────────────────────────────────────
// A category is not a place: "other intergovernmental bodies in orange nearby" attached a distance
// claim to a COLOUR, and that tier contains this map's most isolated marker. Separation is derived
// here for every marker without a typed threshold — each marker's distance to its nearest
// neighbour, sorted, split at the single LARGEST gap in that sorted list (one-dimensional natural
// breaks). On this data the gap is 2.29 km wide (0.96 → 3.25), five times the next largest, and it
// puts exactly two markers on the far side.
const EARTH_KM = 6371;
const RAD = Math.PI / 180;
function greatCircleKm(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];
/** The 8-point compass direction of `to` seen from `from` — read off the bearing, never typed. */
function headingFrom(from, to) {
  const bearing =
    (Math.atan2((to.lon - from.lon) * Math.cos(from.lat * RAD), to.lat - from.lat) / RAD + 360) %
    360;
  return COMPASS[Math.round(bearing / 45) % 8];
}

/**
 * The whole geometry of the words: the cluster, the organisation it is centred on, the markers that
 * stand outside it and how far and in which direction each one sits. Returns the caveat and the alt
 * built from those measurements, plus the keys the picture must therefore label.
 */
export function describeSeparation(orgs) {
  const nearest = orgs.map((o) => ({
    org: o,
    km: Math.min(
      ...orgs.filter((x) => x.key !== o.key).map((x) => greatCircleKm(o.lat, o.lon, x.lat, x.lon)),
    ),
  }));
  const byNearest = [...nearest].sort((a, b) => a.km - b.km);
  let splitAt = byNearest.length;
  let widestGap = -Infinity;
  for (let i = 1; i < byNearest.length; i++) {
    const gap = byNearest[i].km - byNearest[i - 1].km;
    if (gap > widestGap) {
      widestGap = gap;
      splitAt = i;
    }
  }
  const clustered = byNearest.slice(0, splitAt).map((x) => x.org);
  const apartRows = byNearest.slice(splitAt);
  if (apartRows.length === 0 || clustered.length === 0)
    throw new Error("the nearest-neighbour split produced an empty side — check the coordinates.");

  const centre = {
    lat: clustered.reduce((sum, o) => sum + o.lat, 0) / clustered.length,
    lon: clustered.reduce((sum, o) => sum + o.lon, 0) / clustered.length,
  };
  const clusterRadiusKm = Math.max(
    ...clustered.map((o) => greatCircleKm(centre.lat, centre.lon, o.lat, o.lon)),
  );
  // Which organisation the cluster is centred ON, rather than a landmark typed from memory …
  const anchor = clustered
    .map((o) => ({ o, km: greatCircleKm(centre.lat, centre.lon, o.lat, o.lon) }))
    .sort((a, b) => a.km - b.km)[0].o;
  // … and the spread measured FROM THAT ANCHOR, because a radius around the centroid is not a
  // radius around the organisation the sentence names.
  const anchorRadiusKm = Math.max(
    ...clustered.map((o) => greatCircleKm(anchor.lat, anchor.lon, o.lat, o.lon)),
  );

  const apart = apartRows
    .map(({ org, km }) => ({
      org,
      nearestKm: km,
      km: greatCircleKm(centre.lat, centre.lon, org.lat, org.lon),
      heading: headingFrom(centre, org),
    }))
    // East first, so the words run left-to-right across the frame the reader is looking at.
    .sort((a, b) => b.org.lon - a.org.lon);

  const categoryCount = (name) => orgs.filter((o) => o.category === name).length;
  const apartPhrase = (withCategory) => {
    const parts = apart.map(
      (a) =>
        `the ${a.org.name}${withCategory ? ` (${a.org.category.toLowerCase()})` : ""} ` +
        `${a.km.toFixed(1)} km ${a.heading}`,
    );
    return parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  };

  // Number agreement follows the count, which follows the data — a mutation that moved one outlier
  // back into the cluster printed "1 stand apart … both labelled" until this was derived too.
  const lone = apart.length === 1;
  const labelledClause = lone
    ? "labelled on the map"
    : apart.length === 2
      ? "both labelled on the map"
      : "all labelled on the map";

  const caveat =
    "A locator marks position only — marker size does not encode a value. Coordinates are each " +
    `organisation's own Wikidata point, not a street address. ${clustered.length} of the ` +
    `${orgs.length} sit within ${clusterRadiusKm.toFixed(1)} km of their common centre; ` +
    `${apart.length} ${lone ? "stands" : "stand"} apart from that cluster: ${apartPhrase(false)}, ` +
    `${labelledClause}.`;
  const alt =
    `Map of central Geneva. ${orgs.length} markers, all the same size, show international ` +
    `organisations headquartered in the city, coloured by category: ${categoryCount("UN system")} ` +
    `UN system agencies in blue, ${categoryCount("Other intergovernmental")} other ` +
    `intergovernmental bodies in orange and ${categoryCount("Other international body")} other ` +
    `international bodies in green. Colour is not position: ${clustered.length} of the markers, ` +
    `from all three categories, sit together within ${anchorRadiusKm.toFixed(1)} km of the ` +
    `${anchor.name}, while ${apart.length} ${lone ? "stands" : "stand"} alone in the frame and ` +
    `${lone ? "is" : "are"} labelled beside ${lone ? "its own point" : "their own points"} — ` +
    `${apartPhrase(true)} of that cluster.`;

  return {
    caveat,
    alt,
    apart,
    clustered,
    anchor,
    widestGap,
    clusterRadiusKm,
    anchorRadiusKm,
    mustLabel: apart.map((a) => a.org.key),
  };
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

  const separation = describeSeparation(orgs);
  console.log(
    `separation: widest gap in nearest-neighbour distance is ${separation.widestGap.toFixed(2)} km — ` +
      `${separation.clustered.length} clustered (within ${separation.clusterRadiusKm.toFixed(1)} km ` +
      `of their centre, anchored on ${separation.anchor.name}), ${separation.apart.length} apart:`,
  );
  for (const a of separation.apart)
    console.log(
      `  ${a.org.name} — ${a.km.toFixed(2)} km ${a.heading} of the cluster centre, ` +
        `nearest neighbour ${a.nearestKm.toFixed(2)} km, promoted to the front of the label priority.`,
    );

  // A beat that names an organisation in its furniture has declared it important, and the type's
  // own doctrine says a declared priority is the correct lever for importance. The promotion
  // travels on the geometry the component draws; the baked priorities on disk are left alone.
  const apartKeys = new Set(separation.mustLabel);
  const points = merged.map((p) => (apartKeys.has(p.key) ? { ...p, priority: -1 } : p));

  const { outPath } = await renderMapWeb({
    component: LocatorWeb,
    table: OrgTable,
    layouts: LAYOUTS,
    props: {
      geometry: { ...geometry, points },
      plate,
      mustLabel: separation.mustLabel,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat: separation.caveat,
      alt: separation.alt,
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
