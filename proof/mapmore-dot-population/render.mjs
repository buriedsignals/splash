// The render ladder for the dot-density (population) beat. Static genre only — no video.
//
// Usage:
//   bun proof/mapmore-dot-population/render.mjs --still
//   bun proof/mapmore-dot-population/render.mjs --still --size square    # LOOKING, into sizes/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
// The STATIC genre's size table — the same one every static chart beat reads, and deliberately not
// a fourth copy of it. `minTypePx` is "12 CSS px at the distance this output is read", and a static
// map sits in the same ~900px article column a static chart does.
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";

import { DotDensityStill } from "./DotDensityStill.tsx";
import {
  LAND_TINT,
  WATER_TINT,
  STUDY_AREA_TINT_OPACITY,
  assertDrawnDotsStillReadAsDots,
  assertStudyAreaReadsApart,
  chooseDotValue,
  compositeOver,
  dotInkThatReadsOn,
  fillTightness,
  mercatorAreaBias,
  wcagContrast,
  joinPopulation,
  parsePopulationCsv,
  scatterInParts,
} from "./geo-dot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The colours are READ, not typed — see `PALETTE.md` beside this file.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const BEAT = {
  ground: PALETTE.ground,
  // A vetted default, distinct light/dark, not a house colour — recorded in PALETTE.md.
  accent: PALETTE.accent,
  title:
    "More than half of this map's population lives in just five countries: Germany, the United " +
    "Kingdom, France, Italy and Spain.",
  source: "Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023.",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  // Everything the caveat says that does not depend on the camera. The projection sentence is added
  // below, from the plate's OWN frame corners — see `assertProjectionIsDisclosed`.
  caveat:
    "Russia is excluded: its population figure covers the whole transcontinental country, but almost " +
    "none of its territory falls inside this map's frame — plotting its full population as dots " +
    "confined to the small visible sliver near Kaliningrad and St Petersburg would misrepresent both " +
    "that sliver and the true European picture. Seven micro-territories with no independent World " +
    "Bank population figure (Åland, Guernsey, Isle of Man, Jersey, Monaco, San Marino, Vatican City) " +
    "are also not shown. Each dot's position within its country is random, not an address.",
};

const TOP5 = ["DEU", "GBR", "FRA", "ITA", "ESP"];

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size was one literal in the component and a height the component derived
// from its own plate, which the render script called to ask what to rasterise at — so the two agreed
// by construction and the pin reached nothing.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = sizeFor(size);

const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = sizeFlag === -1 ? "static" : `static-${size}`;
if (sizeFlag !== -1)
  console.log(
    `LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`,
  );
console.log(`pinned size: ${size} (${FRAME_WIDTH}x${FRAME_HEIGHT})`);
// The plate is frozen BESIDE THE BEAT, exactly as the data is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an artifact nobody can reproduce or audit — and
// MapTiler restyles, so a re-bake months later is a different picture under the same marks.
const stillPlate = flag("--still-plate", join(HERE, "plate"));
const wantStill = argv.includes("--still");

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", "860x760", "--out", plateDir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function plateOf(dir) {
  ensurePlate(dir);
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);

  const rows = parsePopulationCsv(await readFile(join(HERE, "population-europe-2023.csv"), "utf8"));
  const shapeKeys = geometry.shapes.map((s) => s.key);
  const byKey = joinPopulation(shapeKeys, rows, { KOS: "XKX" });
  console.log(`joined ${shapeKeys.length} shapes to ${rows.length} population rows — no unmatched either way.`);

  // The claim check: the title states a specific share of the total. Assert it against the real,
  // frozen numbers — never against what the title merely says — the same discipline
  // `map-beat/assets/geo.ts`'s own `claimViolations` applies to the choropleth.
  const totalPopulation = rows.reduce((s, r) => s + r.population, 0);
  const top5Sum = TOP5.reduce((s, code) => s + byKey.get(code).population, 0);
  const top5Share = top5Sum / totalPopulation;
  console.log(`top 5 (${TOP5.join(", ")}) = ${top5Sum.toLocaleString()} of ${totalPopulation.toLocaleString()} = ${(top5Share * 100).toFixed(1)}%`);
  if (top5Share <= 0.5)
    throw new Error(
      `claim check failed: the title says these five countries hold more than half the mapped population, but they measure ${(top5Share * 100).toFixed(1)}%.`,
    );
  // And that they really are the top five, not just five that happen to sum past 50%.
  const ranked = [...rows].sort((a, b) => b.population - a.population).map((r) => r.code);
  if (JSON.stringify(ranked.slice(0, 5)) !== JSON.stringify(TOP5))
    throw new Error(`claim check failed: the true top 5 by population is ${ranked.slice(0, 5).join(", ")}, not ${TOP5.join(", ")}.`);
  console.log("claim: top-5 ranking and >50% share both verified against the frozen data — supported.");

  const dotValue = chooseDotValue(totalPopulation, { targetDots: 3000, maxDots: 6000 });
  let totalDots = 0;
  const dots = geometry.shapes.map((s) => {
    const row = byKey.get(s.key);
    const count = Math.round(row.population / dotValue);
    totalDots += count;
    const points = scatterInParts(s.parts, count, s.key);
    return { key: s.key, points };
  });
  console.log(`dot value: 1 dot = ${dotValue.toLocaleString()} people → ${totalDots.toLocaleString()} dots total`);

  // Label anchor for the five named countries: the centroid of that country's OWN scattered dots —
  // guaranteed to sit inside the visible cloud, not a polygon calculation that could land elsewhere.
  const labelled = TOP5.map((code) => {
    const d = dots.find((d) => d.key === code);
    const cx = d.points.reduce((s, p) => s + p[0], 0) / d.points.length;
    const cy = d.points.reduce((s, p) => s + p[1], 0) / d.points.length;
    return { key: code, name: byKey.get(code).name, anchor: [cx, cy] };
  });

  const furniture = deriveFurniture(BEAT.ground);
  // The study area is a TINT over the plate, not a lid on it — see STUDY_AREA_TINT_OPACITY. Checked
  // here, on the composited colours, because the tint, its opacity and the basemap's own land only
  // ever meet on the plate: a fill that reads like the land outside the study, or that stops the
  // dots reading, stops the run instead of shipping.
  // B6.13 — the dots are inked against the ground they really land on, not against the page.
  // `assertStudyAreaReadsApart` is asked about the DRAWN ink, not about the recorded accent: the
  // accent is what the journalist chose and `dotInkThatReadsOn` is the shade of it that survives a
  // grey wash. See that function's own doc-comment for the two levers that were measured and
  // rejected first (the wash cannot pay for it; the palette is not a beat's to overrule).
  const studyLand = compositeOver(furniture.ink, LAND_TINT, STUDY_AREA_TINT_OPACITY);
  const dotInk = dotInkThatReadsOn(BEAT.accent, studyLand);
  const study = assertStudyAreaReadsApart(furniture.ink, STUDY_AREA_TINT_OPACITY, dotInk, furniture.muted);
  console.log(
    `dot ink: ${BEAT.accent} was ${wcagContrast(BEAT.accent, studyLand).toFixed(2)}:1 on the study area's ` +
      `${studyLand} — drawn as ${dotInk} at ${wcagContrast(dotInk, studyLand).toFixed(2)}:1`,
  );
  console.log(
    `study area: ${furniture.ink} at ${STUDY_AREA_TINT_OPACITY} over the basemap land ${LAND_TINT} → ` +
      `${study.studyLand}, ${study.separation.toFixed(2)} ΔE76 from the land outside the study; ` +
      `dots ${study.dotContrast.toFixed(2)}:1 on it; a lake under it renders ${study.studyWater}; ` +
      `coastline ${study.coastSeparation.toFixed(2)} ΔE76 by tone, carried by a ${furniture.muted} outline at ` +
      `${Math.min(...[study.studyLand, WATER_TINT].map((c) => wcagContrast(furniture.muted, c))).toFixed(2)}:1.`,
  );

  // ── The alt says what the picture shows, and both quantities are measured ────────────────────
  // The five named countries hold the five BIGGEST clouds of dots — that is the title's claim, and
  // the dot counts below prove it. They are NOT the tightest fills: dots are scattered uniformly
  // inside each country, so tightness reads as people per unit area, a different measurement whose
  // top three (computed below) the sentence never named. The alt used to assert the second while
  // meaning the first.
  const dotsByKey = new Map(dots.map((d) => [d.key, d.points.length]));
  const rankedByDots = [...dotsByKey.entries()].sort((a, b) => b[1] - a[1]);
  const topFiveByDots = rankedByDots.slice(0, 5).map(([key]) => key);
  if ([...topFiveByDots].sort().join() !== [...TOP5].sort().join())
    throw new Error(
      `alt check failed: the five biggest dot clouds are ${topFiveByDots.join(", ")}, not ${TOP5.join(", ")}.`,
    );
  const namedDots = TOP5.reduce((s, code) => s + dotsByKey.get(code), 0);
  const tightest = fillTightness(geometry.shapes, dotsByKey);
  const tightestNames = tightest.slice(0, 3).map((t) => byKey.get(t.key).name);
  const rankOf = (code) => tightest.findIndex((t) => t.key === code) + 1;
  console.log(
    `fill tightness (dots per 1,000 plate px), densest first: ` +
      tightest
        .slice(0, 5)
        .map((t) => `${byKey.get(t.key).name} ${t.dotsPerKilopixel.toFixed(1)}`)
        .join(" · ") +
      ` — France ranks ${rankOf("FRA")} of ${tightest.length}, Spain ${rankOf("ESP")}.`,
  );

  // ── WHAT THE PROJECTION DOES TO AN AREA ENCODING, DERIVED FROM THE PLATE'S OWN CORNERS ───────
  // A dot stands for a fixed number of people in a fixed piece of GROUND, so the amount of paper a
  // piece of ground is drawn on is part of the measurement. Web Mercator's is not constant: this
  // camera runs 36°N to 67°N and one drawn pixel covers `areaBias` times more ground at the top of
  // the frame than at the bottom. Neither the number nor the latitudes are typed — they come off
  // `geometry.frameCorners`, so a re-bake with a different camera rewrites the sentence rather than
  // leaving a stale figure on the frame. `DotDensityStill` refuses to draw a caveat that has lost
  // it (`assertProjectionIsDisclosed`), which is the guard against shortening this to fit a column.
  const areaBias = mercatorAreaBias(geometry.frameCorners);
  const projectionNote =
    `Web Mercator stretches area with latitude: one drawn square covers ` +
    `${areaBias.toFixed(1)}× more ground at ${geometry.frameCorners.north.toFixed(0)}°N than at ` +
    `${geometry.frameCorners.south.toFixed(0)}°N, so the same number of people per square kilometre ` +
    `is drawn ${areaBias.toFixed(1)}× more thinly in the north. Compare fills within a latitude, not ` +
    `up and down the frame.`;
  const caveat = `${BEAT.caveat} ${projectionNote}`;
  console.log(
    `projection: ${geometry.frameCorners.south.toFixed(1)}°N → ${geometry.frameCorners.north.toFixed(1)}°N, ` +
      `Mercator area bias ×${areaBias.toFixed(2)} — disclosed on the frame.`,
  );

  const alt =
    `Map of Europe. Small blue dots are scattered inside each country, one dot per ${dotValue.toLocaleString()} people, ` +
    `${totalDots.toLocaleString()} dots in total. The five countries the title names — Germany, the United Kingdom, ` +
    `France, Italy and Spain — carry the five biggest clouds of dots, each labelled directly on its own cluster: ` +
    `${namedDots.toLocaleString()} of the ${totalDots.toLocaleString()} dots, more than half the map's population. ` +
    `Dots fall at random inside each country, so a tighter fill means more people per square kilometre rather than a ` +
    `bigger population — the tightest fills on this map are over ${tightestNames.slice(0, -1).join(", ")} and ` +
    `${tightestNames[tightestNames.length - 1]}, none of them among the five. That comparison holds along a latitude ` +
    `only: the projection draws the same density ${areaBias.toFixed(1)}× more thinly at the top of the frame than at ` +
    `the bottom. Russia and seven micro-territories are not shown (see the caveat).`;

  const { pngPath, svgPath } = await renderStill({
    element: createElement(DotDensityStill, {
      geometry,
      plate,
      shapes: geometry.shapes,
      dots,
      labelled,
      dotValue,
      totalPopulation,
      totalDots,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      caveat,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      dotInk,
      landTint: furniture.ink,
      landTintOpacity: STUDY_AREA_TINT_OPACITY,
      studySwatch: compositeOver(furniture.ink, LAND_TINT, STUDY_AREA_TINT_OPACITY),
      studyCount: geometry.shapes.length,
      size,
      ...furniture,
    }),
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name: stem,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG on
  // disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: pngPath,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "mapmore-dot-population" });
  assertWithinStage(svg, size, { what: "mapmore-dot-population" });
  // And the same move applied to the MARK rather than the frame: the dots are re-measured out of the
  // markup that was written, so a radius that outgrew the field it stands in arrives here rather
  // than in the newsroom as a wash the reader takes for a choropleth.
  const drawn = assertDrawnDotsStillReadAsDots(svg, {
    what: `mapmore-dot-population at ${size}`,
  });
  console.log(
    `dot field, read back from the markup: ${drawn.count} dots at r=${drawn.radiusPx}px, ` +
      `median nearest-neighbour gap ${drawn.medianNearestNeighbourPx.toFixed(2)}px → ceiling ` +
      `${drawn.ceilingPx.toFixed(2)}px (${((drawn.radiusPx / drawn.ceilingPx) * 100).toFixed(0)}% of it).`,
  );
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
} else console.log("nothing asked for. Pass --still.");
