// Derives this beat's two working files from the FROZEN table, so nothing here is hand-typed and a
// change to `source/data.csv` cannot leave a stale figure on the map. `source/` is never written.
//
//   bun stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/prepare-data.mjs
//
//   places.json — the eleven distinct places, what the BAKE projects (it takes `{key, name, lon,
//                 lat, value}` rows and hands back the same rows with `px`/`py` added)
//   routes.json — the eight origin-destination pairs, what the ribbons are drawn from
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoutes, placesFrom } from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "../../source/data.csv");

const routes = parseRoutes(await readFile(SOURCE, "utf8"));
const places = placesFrom(routes);

await writeFile(join(HERE, "routes.json"), `${JSON.stringify(routes, null, 2)}\n`);
await writeFile(join(HERE, "places.json"), `${JSON.stringify(places, null, 2)}\n`);
console.log(`routes.json → ${routes.length} routes · places.json → ${places.length} places`);
