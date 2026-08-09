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
  caveat:
    "A locator marks position only — marker size does not encode a value. Coordinates are the " +
    "organisation's own Wikidata point, not a street address; the World Economic Forum's is in " +
    "Cologny, east of the main cluster.",
  alt:
    "Map of central Geneva. Eleven markers show international organisations headquartered in the " +
    "city, coloured by category: UN system agencies in blue cluster around the Palais des Nations " +
    "in the north, other intergovernmental bodies in orange nearby, and other international bodies " +
    "in green including the World Economic Forum to the east in Cologny.",
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

const furniture = deriveFurniture(BEAT.ground);

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  const { pngPath } = await renderStill({
    element: createElement(LocatorStill, {
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat: BEAT.caveat,
      alt: BEAT.alt,
      ground: BEAT.ground,
      ...furniture,
      geometry,
      plate,
    }),
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
} else console.log("nothing asked for. Pass --still.");
