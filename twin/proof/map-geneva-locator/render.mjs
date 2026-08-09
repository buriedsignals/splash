// The render ladder for the locator beat. Static genre only — no video.
//
// Usage:
//   bun proof/map-geneva-locator/render.mjs --still

import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
import { LocatorStill } from "./LocatorStill.tsx";
import { orgsFromCsv } from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const BEAT = {
  ground: "#FFFFFF",
  title: "Geneva's international quarter: eleven organisations, three tiers of the system.",
  source: "Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Category",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "geneva-orgs.csv"));
const outDir = flag("--out", join(HERE, "render"));
const stillPlate = flag("--still-plate", "/tmp/map-twin/geneva-locator-496");
const wantStill = argv.includes("--still");

const orgs = orgsFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${orgs.length} organisations`);
for (const category of new Set(orgs.map((o) => o.category)))
  console.log(`  ${category}: ${orgs.filter((o) => o.category === category).length}`);

// ── The outlier the furniture talks about is found in the data, and then MADE VISIBLE ───────────
// The caveat and the alt both singled out the World Economic Forum by name — and the declutter had
// dropped its label, because priority runs category-rank then alphabetically and the WEF came last
// of eleven. So the words pointed at a marker the picture never named, and a reader was sent
// looking for something that was not there. Two changes: the outlier is now DERIVED (whichever
// organisation sits furthest east, with its distance from the rest measured, so the sentence can
// never name the wrong one), and it is PROMOTED to the top of the label priority — the type's own
// doctrine says a declared priority is the correct lever for importance, and a beat that names an
// organisation in its furniture has declared it important. `mustLabel` then makes the render throw
// rather than ship the mismatch again.
const outlier = orgs.reduce((east, o) => (o.lon > east.lon ? o : east));
const others = orgs.filter((o) => o.key !== outlier.key);
const meanLat = others.reduce((sum, o) => sum + o.lat, 0) / others.length;
const meanLon = others.reduce((sum, o) => sum + o.lon, 0) / others.length;
const EARTH_KM = 6371;
function greatCircleKm(aLat, aLon, bLat, bLon) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}
const outlierKm = greatCircleKm(meanLat, meanLon, outlier.lat, outlier.lon);
console.log(
  `outlier: ${outlier.name}, ${outlierKm.toFixed(1)} km east of the other ${others.length} — ` +
    `promoted from label priority ${outlier.priority} to first.`,
);

const categoryCount = (name) => orgs.filter((o) => o.category === name).length;
const caveat =
  "A locator marks position only — marker size does not encode a value. Coordinates are the " +
  `organisation's own Wikidata point, not a street address. The ${outlier.name}'s sits ` +
  `${outlierKm.toFixed(1)} km east of the other ${others.length}, the one marker outside the ` +
  "cluster, and is labelled on the map.";
const alt =
  `Map of central Geneva. ${orgs.length} markers show international organisations headquartered in ` +
  `the city, coloured by category: ${categoryCount("UN system")} UN system agencies in blue cluster ` +
  `around the Palais des Nations in the north, ${categoryCount("Other intergovernmental")} other ` +
  `intergovernmental bodies in orange nearby, and ${categoryCount("Other international body")} other ` +
  `international bodies in green — among them the ${outlier.name}, the easternmost marker on the ` +
  `map, ${outlierKm.toFixed(1)} km from the rest and labelled beside its own point.`;

const furniture = deriveFurniture(BEAT.ground);

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  // The promotion travels on the geometry the component actually draws, so the declutter and the
  // drawing agree — the baked priority is left untouched on disk.
  const promoted = {
    ...geometry,
    points: geometry.points.map((p) =>
      p.key === outlier.key ? { ...p, priority: -1 } : p,
    ),
  };
  const { pngPath } = await renderStill({
    element: createElement(LocatorStill, {
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat,
      alt,
      ground: BEAT.ground,
      ...furniture,
      geometry: promoted,
      plate,
      mustLabel: [outlier.key],
    }),
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
} else console.log("nothing asked for. Pass --still.");
