// twin/proof/mapgen-dot-web/render-web.mjs
//
// The WEB genre of the dot-density map: the same 42-country World Bank file
// `proof/mapmore-dot-population` ships as a still, turned into ONE self-contained HTML file — one
// fluid SVG carrying geometry only (plate, outlines, ~3,000 dots), one HTML overlay carrying every
// word and the bounded zoom control, the accessible table this beat opts into, one inlined
// interaction script, and no external request once the plate is inlined as a data URI.
//
// This is this beat's OWN copy of `twin-map-web/scripts/render-web.mjs`'s machinery, adapted to a
// type that skill's seed does not carry. Nothing here imports out of a skill or across beats, except
// `#shared/twin-chart-beat/render-still.mjs` for `readPalette` — the one module in this tree that
// reads a recorded colour answer.
//
// EVERY NUMBER A READER SEES IS COMPUTED HERE, from the frozen csv and the frozen plate, and printed
// before the render. The claim is asserted against the data first: that the five countries the title
// names really are the five largest, that they really do hold more than half the mapped population,
// and that four of them would not. The dot value is derived from the total rather than chosen, and
// the render then asserts that every dot it drew landed inside the frame — a dot scattered outside
// it is invisible, which would make a country's cloud understate its own population.
//
// Usage:  bun proof/mapgen-dot-web/render-web.mjs [outDir] [--data <csv>]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { deriveFurniture } from "./render-still.mjs";
import { DotDensityWeb, CountryTable, NAMED, ZOOM_SCALE } from "./DotDensityWeb.tsx";
import {
  parsePopulationCsv,
  joinPopulation,
  chooseDotValue,
  scatterInParts,
  partsInFrame,
  cloudAnchor,
  shapeAnchor,
  fillTightness,
  readingOrder,
  en,
} from "./geo-dot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — this beat's own story =====
const BEAT = {
  source: "Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
};
const PLATE_SIZE = "1000x1000";
// FROZEN BESIDE THE BEAT, for the same reason the csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could be neither reproduced nor audited. `ensurePlate` bakes only
// when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "population-europe-2023.csv");
// And the OUTPUT lands beside the beat, where `dot-population.html` is committed — never a scratch
// directory, which would print a path, exit zero and leave the committed artifact stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "dot-population.html";
/** Natural Earth's shape code against the World Bank's own for Kosovo — the same class of mismatch
 *  every join in this tree has to declare rather than discover. */
const ALIAS = { KOS: "XKX" };
// ==========================================

/**
 * SSRs the map component once, SSRs the table when the beat asked for it, wraps both in one
 * self-contained HTML file and writes it. Generic across map-web beats: it knows nothing of this
 * story's own countries.
 */
async function renderMapWeb({ component, table, props, outDir, name, regionTable = false }) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = regionTable
    ? renderToStaticMarkup(createElement(table, { countries: props.countries, ...furniture }))
    : "";

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ...props, ...furniture, frame: props.geometry.frame })}
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

/** Strips the `export` keyword from each top-level declaration, so the module can also sit as a
 *  plain classic `<script>` — no bundler, no `type="module"`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame }) {
  const aspect = frame.width / frame.height;
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  /* One number, used by the body's own padding AND by the height the beat has to fit inside, so the
     two can never disagree about how much room the page edge takes. */
  --page-pad: 16px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: var(--page-pad);
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
.map-web-page { width: 100%; }
/* FIT THE WINDOW. The beat is a column exactly one window tall: every piece of furniture takes the
   height it needs and .mw-stage is handed whatever is left, so nothing scrolls inside the visual at
   any width. The accessible table below the beat is normal document reading, not scrolling inside
   the visual.
   'svh', not 'vh': on a phone with a retracting toolbar 'vh' is the LARGE viewport, which is exactly
   the height the beat must not assume it has. */
.map-web {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--page-pad) * 2);
  height: calc(100svh - var(--page-pad) * 2);
}
/* Only the stage gives up height. Measured, and not obvious: with 'min-height' here instead of
   'height', the stage's height stays INDEFINITE for container-query purposes and every 'cqh' inside
   it resolves to zero — the map collapses to its border and nothing goes red. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
.mw-title { font-size: 21px; font-weight: 700; margin: 0 0 4px; }
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
/* The zoom control: a real checkbox, hit by CSS only. Its label is a pointer target in its own
   right through the native <label> association, and Tab reaches it with no script. */
.mw-zoom-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin: 0 0 10px;
  cursor: pointer;
  min-height: 28px;
}
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport bound itself by the stage's HEIGHT as well as its width. */
.mw-stage { flex: 1 1 auto; container-type: size; min-height: 180px; }
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND its
   height, whichever binds first. A plate stretched to fill a shape it was not baked for is a lie
   about distance and shape, so it is not one of the outcomes here; a smaller, correct map is. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* Flush left, not centred: when the window's HEIGHT bounds the map the leftover room is
     horizontal, and a centred map floats away from the title, the control and the legend. */
  margin-inline: 0 auto;
  /* Unzoomed, a country label may spill past the frame rather than lose a letter — the plate and its
     dots are already clipped by the SVG's own clipPath. Zoomed, the box must clip, and the rule at
     the bottom of this sheet switches it to 'auto'. */
  overflow: visible;
  border: 1px solid var(--muted);
}
.mw-viewport[tabindex] { outline-offset: 2px; }
.mw-viewport[tabindex]:focus-visible { outline: 2px solid var(--ink); }
.mw-zoomable { position: relative; width: 100%; height: 100%; }
svg.map { display: block; width: 100%; height: 100%; }
/* Furniture, in HTML: font-size is a fixed CSS number on every rule below, so it never tracks the
   container's width the way an SVG <text> inside a scaling viewBox would. */
.point-label {
  position: absolute;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0.92;
}
/* The interaction layer: a real <button>, fixed-CSS-pixel diameter — a legitimate touch and pointer
   target at every width, unlike an SVG hit circle sized in frame units. */
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
.pt:hover, .pt:focus, .pt.pt-active { background: var(--ink); opacity: 0.22; outline: none; }
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; opacity: 1; background: transparent; }
.mw-legend { margin: 10px 0 4px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 6px; }
.mw-legend-marks { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.mw-legend-item { display: flex; align-items: center; gap: 6px; }
.mw-legend-value { font-size: 13px; font-weight: 700; color: var(--ink); }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 6px 0 12px; }
/* The bounded zoom: unchecked (the default), the frame shows exactly the full claim. Checked, the
   viewport becomes natively scrollable and its content grows by the one fixed, capped factor — a
   reader cannot go further, so the plate never degrades into unreadable blur, and panning is native
   browser scroll rather than a pan handler this genre would have to write. No JavaScript is involved
   in any of it: ':has()' reads the checkbox directly. */
.map-web-page:has(#mw-zoom-toggle:checked) .mw-viewport { overflow: auto; }
.map-web-page:has(#mw-zoom-toggle:checked) .mw-zoomable {
  width: ${ZOOM_SCALE * 100}%;
  height: ${ZOOM_SCALE * 100}%;
}
#tooltip {
  position: fixed;
  max-width: 260px;
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
/* The accessible table: a real, plainly visible table, never a screen-reader-only trick. It sits
   below the beat, in normal document flow. */
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
.region-table td { font-variant-numeric: tabular-nums; }
.region-table tr.subject th, .region-table tr.subject td { color: var(--accent); font-weight: 700; }
`.trim();
}

/** A light neutral land fill, `ratio` of the way from ground toward ink — the same local mix the
 *  still sibling applies, so the two genres draw the same neutral. */
function mixHex(ground, ink, ratio) {
  const ch = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const g = ch(ground);
  const target = ch(ink);
  return (
    "#" +
    g.map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0")).join("")
  );
}

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--out", plateDir], {
    cwd: resolve(HERE, "../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);
  const frame = geometry.frame;

  const rows = parsePopulationCsv(await readFile(dataPath, "utf8"));
  const shapeKeys = geometry.shapes.map((s) => s.key);
  const byKey = joinPopulation(shapeKeys, rows, ALIAS);
  console.log(`joined ${shapeKeys.length} shapes to ${rows.length} population rows — no unmatched either way.`);

  // ── The claim, checked against the data before anything is drawn ────────────────────────────
  const totalPopulation = rows.reduce((s, r) => s + r.population, 0);
  const namedSum = NAMED.reduce((s, code) => s + byKey.get(code).population, 0);
  const namedShare = namedSum / totalPopulation;
  const ranked = [...rows].sort((a, b) => b.population - a.population).map((r) => r.code);
  if (JSON.stringify(ranked.slice(0, NAMED.length)) !== JSON.stringify(NAMED))
    throw new Error(
      `claim check failed: the true top ${NAMED.length} by population is ${ranked.slice(0, NAMED.length).join(", ")}, not ${NAMED.join(", ")}`,
    );
  if (namedShare <= 0.5)
    throw new Error(
      `claim check failed: the title says these ${NAMED.length} hold more than half the mapped population, but they measure ${(namedShare * 100).toFixed(1)}%`,
    );
  const fourShare =
    NAMED.slice(0, NAMED.length - 1).reduce((s, code) => s + byKey.get(code).population, 0) / totalPopulation;
  if (fourShare > 0.5)
    throw new Error(
      `claim check failed: "just ${NAMED.length}" is not the smallest set that clears half — the first ${NAMED.length - 1} already hold ${(fourShare * 100).toFixed(1)}%`,
    );

  // ── The dots ────────────────────────────────────────────────────────────────────────────────
  const dotValue = chooseDotValue(totalPopulation, { targetDots: 3000, maxDots: 6000 });
  const dropped = [];
  const countries = geometry.shapes.map((shape) => {
    const row = byKey.get(shape.key);
    const parts = partsInFrame(shape.parts, frame);
    if (parts.length !== shape.parts.length)
      dropped.push(`${row.name} ${shape.parts.length - parts.length}`);
    const count = Math.round(row.population / dotValue);
    const dots = scatterInParts(parts, count, shape.key);
    return {
      key: shape.key,
      name: row.name,
      population: row.population,
      parts,
      dots,
      // A country whose population buys fewer than one dot draws none, and there is no cloud to
      // anchor on. It keeps its target, its label and its table row anyway — see `shapeAnchor`.
      anchor: dots.length ? cloudAnchor(dots, parts) : shapeAnchor(parts),
    };
  });
  const dotless = countries.filter((c) => c.dots.length === 0);
  const totalDots = countries.reduce((s, c) => s + c.dots.length, 0);
  console.log(
    `dot value: 1 dot = ${dotValue.toLocaleString("en-GB")} people → ${totalDots.toLocaleString("en-GB")} dots\n` +
      `parts dropped as entirely outside the frame (country, count): ${dropped.join(" · ") || "none"}\n` +
      `countries whose population buys fewer than one dot, so they draw none: ${dotless.map((c) => `${c.name} ${c.population.toLocaleString("en-GB")}`).join(" · ") || "none"}`,
  );

  // Every dot the reader is charged for has to be a dot the reader can see. A dot outside the frame
  // is eaten by the clip, and a country whose share of dots lands there quietly understates its own
  // population on a map whose argument is which clouds are biggest.
  const strays = countries
    .map((c) => ({
      name: c.name,
      n: c.dots.filter((p) => p[0] < 0 || p[1] < 0 || p[0] > frame.width || p[1] > frame.height).length,
    }))
    .filter((c) => c.n > 0);
  if (strays.length)
    throw new Error(
      `${strays.reduce((s, c) => s + c.n, 0)} dots were scattered outside the frame and would be clipped away: ${strays.map((c) => `${c.name} ${c.n}`).join(", ")}`,
    );

  // The five the title names must also carry the five biggest CLOUDS — the same statement in the
  // currency the picture actually draws. It is checked rather than assumed, because rounding a
  // population to a dot count is not order-preserving in principle.
  const byDots = [...countries].sort((a, b) => b.dots.length - a.dots.length).slice(0, NAMED.length);
  if ([...byDots.map((c) => c.key)].sort().join() !== [...NAMED].sort().join())
    throw new Error(
      `alt check failed: the ${NAMED.length} biggest dot clouds are ${byDots.map((c) => c.key).join(", ")}, not ${NAMED.join(", ")}`,
    );
  const namedDots = NAMED.reduce((s, key) => s + countries.find((c) => c.key === key).dots.length, 0);

  // Fill TIGHTNESS is a different quantity from population, and the still sibling shipped an alt
  // that confused the two: dots are scattered uniformly inside each country, so a tighter fill reads
  // as people per unit area. Measured in plate pixels, because pixels are what a reader's eye
  // compares and Mercator inflates area with latitude.
  const tightness = fillTightness(
    countries.map((c) => ({ key: c.key, parts: c.parts })),
    new Map(countries.map((c) => [c.key, c.dots.length])),
  );
  const nameOf = (key) => countries.find((c) => c.key === key).name;
  const tightestNames = tightness.slice(0, 3).map((t) => nameOf(t.key));
  const rankOf = (key) => tightness.findIndex((t) => t.key === key) + 1;
  console.log(
    `claim: top-${NAMED.length} ranking verified, ${(namedShare * 100).toFixed(1)}% of the mapped population ` +
      `(the first ${NAMED.length - 1} only ${(fourShare * 100).toFixed(1)}%)\n` +
      `fill tightness, densest first: ${tightness.slice(0, 5).map((t) => `${nameOf(t.key)} ${t.dotsPerKilopixel.toFixed(1)}`).join(" · ")} ` +
      `— France ranks ${rankOf("FRA")} of ${tightness.length}, Spain ${rankOf("ESP")}`,
  );

  const palette = readPalette(HERE, { stopAt: resolve(HERE, "..", "..") });
  console.log(`palette from ${palette.source} — ground ${palette.ground}, accent ${palette.accent}, chosen by ${palette.origin}`);
  const furniture = deriveFurniture(palette.ground);
  const landFill = mixHex(palette.ground, furniture.ink, 0.06);

  const namedNames = NAMED.map(nameOf);
  // Derived, never typed: which countries are too small to buy a single dot, and what the reader
  // should do about it. An absence on a map reads as a zero, so the sentence exists whenever the
  // list does — and disappears by itself if a future dot value makes it empty.
  const dotlessNames = readingOrder(dotless).map((c) => c.name);
  const dotlessSentence = dotlessNames.length
    ? `${dotlessNames.slice(0, -1).join(", ")}${dotlessNames.length > 1 ? " and " : ""}${dotlessNames[dotlessNames.length - 1]} have fewer people than one dot stands for, so they draw none; their figures are in the table.`
    : "";
  const listed = `${namedNames.slice(0, -1).join(", ")} and ${namedNames[namedNames.length - 1]}`;
  const title =
    `More than half the people on this map live in ${namedNames.length} countries: ${listed} hold ` +
    `${en(namedShare * 100)} % of them`;
  const legendCaption = `Each dot stands for the same number of people, wherever it falls.`;
  // No count of the absent territories: they are absent from the frozen file, so a number here could
  // only be typed, and a typed number is the one defect class this beat's own claim checks exist to
  // remove. They are named instead, which is what a reader needs — an absence on a map reads as a
  // zero, so it has to be said out loud.
  const caveat =
    `A dot's position inside its country is random, not an address: a TIGHTER fill means more people ` +
    `per square kilometre, not a bigger population — the tightest here are ${tightestNames.join(", ")}, ` +
    `none of them among the ${namedNames.length}. Russia is not shown (almost none of its territory is ` +
    `in frame), nor are the micro-territories the World Bank does not report separately. ` +
    `${dotlessSentence} Where a country's own figure covers land outside this frame — French overseas ` +
    `departments, the Azores, the Canaries, Svalbard — its dots are drawn inside the territory shown.`;

  const alt =
    `Map of Europe. Small dots are scattered inside each country, one dot for every ` +
    `${en(dotValue, 0)} people, ${en(totalDots, 0)} dots in all. The ${namedNames.length} countries the title ` +
    `names — ${listed} — carry the ${namedNames.length} biggest clouds, ${en(namedDots, 0)} of the ` +
    `${en(totalDots, 0)} dots between them. Because dots fall at random inside each country, a tighter ` +
    `fill means more people per square kilometre rather than a bigger population: the tightest fills ` +
    `belong to ${tightestNames.join(", ")}, while France ranks ${rankOf("FRA")} of ${tightness.length} ` +
    `on that measure and Spain ${rankOf("ESP")}. Every country's exact population and dot count is in ` +
    `the table below the map, most populous first.`;

  const { outPath } = await renderMapWeb({
    component: DotDensityWeb,
    table: CountryTable,
    props: {
      geometry,
      plate,
      countries,
      dotValue,
      totalPopulation,
      totalDots,
      title,
      source: `${BEAT.source}, ${rows.length} countries`,
      basemapCredit: BEAT.basemapCredit,
      legendCaption,
      caveat,
      alt,
      ground: palette.ground,
      accent: palette.accent,
      landFill,
      zoomable: true,
    },
    outDir,
    name,
    // OPT-IN, and this beat opts in deliberately: a dot map encodes its value as TEXTURE, so a reader
    // without spatial access to it has no legend entry, no axis and no label from which to recover a
    // single country's figure. The table is the only channel that carries all 42 readings.
    regionTable: true,
  });
  // The table and the map have to be reading the same order and the same numbers.
  const first = readingOrder(countries)[0];
  if (first.key !== NAMED[0])
    throw new Error(`the table's first row is ${first.key}, not the most populous country ${NAMED[0]}`);
  return { outPath, countries: countries.length, dots: totalDots };
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

  const { outPath, countries, dots } = await render({ dataPath, plateDir, outDir });
  console.log(`dot-web beat → ${outPath}  [${countries} countries, ${dots} dots]`);
}

export { render, renderMapWeb, ensurePlate, loadPlate, BEAT, PLATE_SIZE, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH };
