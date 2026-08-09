// The render ladder for the dot-density (population) beat. Static genre only.
//
// Usage:
//   bun proof/mapmore-dot-population/render.mjs --still

import { mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";

/** A light neutral land fill, `ratio` of the way from ground toward ink — small local helper, this
 *  file's own copy of the mix formula every other beat's rasteriser already applies internally. */
function mixHex(ground, ink, ratio) {
  const ch = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const g = ch(ground);
  const target = ch(ink);
  return (
    "#" +
    g
      .map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0"))
      .join("")
  );
}
import { DotDensityStill } from "./DotDensityStill.tsx";
import {
  parsePopulationCsv,
  joinPopulation,
  chooseDotValue,
  scatterInParts,
  fillTightness,
} from "./geo-dot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const BEAT = {
  ground: "#FFFFFF",
  accent: "#0072B2", // Okabe-Ito blue — a vetted default, distinct light/dark, not a house colour.
  title:
    "More than half of this map's population lives in just five countries: Germany, the United " +
    "Kingdom, France, Italy and Spain.",
  source: "Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023.",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
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

const outDir = flag("--out", join(HERE, "render"));
const stillPlate = flag("--still-plate", "/tmp/map-twin/mapmore-dot-860x760");
const wantStill = argv.includes("--still");

async function plateOf(dir) {
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
  // `twin-map-beat/assets/geo.ts`'s own `claimViolations` applies to the choropleth.
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
  const landFill = mixHex(BEAT.ground, furniture.ink, 0.06);

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

  const alt =
    `Map of Europe. Small blue dots are scattered inside each country, one dot per ${dotValue.toLocaleString()} people, ` +
    `${totalDots.toLocaleString()} dots in total. The five countries the title names — Germany, the United Kingdom, ` +
    `France, Italy and Spain — carry the five biggest clouds of dots, each labelled directly on its own cluster: ` +
    `${namedDots.toLocaleString()} of the ${totalDots.toLocaleString()} dots, more than half the map's population. ` +
    `Dots fall at random inside each country, so a tighter fill means more people per square kilometre rather than a ` +
    `bigger population — the tightest fills on this map are over ${tightestNames.slice(0, -1).join(", ")} and ` +
    `${tightestNames[tightestNames.length - 1]}, none of them among the five. ` +
    `Russia and seven micro-territories are not shown (see the caveat).`;

  const { pngPath } = await renderStill({
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
      caveat: BEAT.caveat,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      landFill,
      ...furniture,
    }),
    width: 920,
    height: 1140,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
} else console.log("nothing asked for. Pass --still.");
