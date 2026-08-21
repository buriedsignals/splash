// Runs `map-web`'s own four cargo guards, plus its language guard, against THIS beat's delivered
// page and its own bake. The skill declares all five and calls them from `verify-guards.mjs` /
// `test/verify-guards.test.ts`, which walk the skill's own committed beats — a story beat outside
// this repository's `map / web` walk has no entry point of its own, so this is it.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  duplicatedPayload,
  revealDashInScreenSpace,
  marksFromSource,
  plateFollowsGround,
  plateMatchesGeometry,
  plateLuminance,
  groundFromPalette,
  pageLanguageMatchesStory,
  surfaceLuminance,
} from "../../../../skills/map-web/scripts/verify-guards.mjs";
import { decodePng } from "../../../../skills/map-web/scripts/compare-png.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const page = join(HERE, "renders/where-the-routes-lead.html");
const html = await readFile(page, "utf8");
const geometry = JSON.parse(await readFile(join(HERE, "plate-1000/geometry.json"), "utf8"));
const plate = decodePng(await readFile(join(HERE, "plate-1000/plate.png")));
const palette = await readFile(join(HERE, "../../PALETTE.md"), "utf8");
const storyboard = parseStoryboard(await readFile(join(HERE, "../../STORYBOARD.md"), "utf8")).meta;

const rows = [];
const dup = duplicatedPayload(html);
rows.push(["duplicatedPayload", JSON.stringify(dup)]);
const marks = marksFromSource(html, page);
rows.push(["revealDashInScreenSpace", `${marks.length} mark(s): ` + JSON.stringify(revealDashInScreenSpace(marks))]);
rows.push(["plateMatchesGeometry", JSON.stringify(plateMatchesGeometry({ plate, frame: geometry.frame }))]);
const ground = groundFromPalette(palette);
const lum = plateLuminance(plate);
const groundLum = surfaceLuminance(ground);
rows.push(["plateFollowsGround", `ground ${ground} (luminance ${groundLum.toFixed(3)}) · plate luminance ${lum.toFixed(3)} · ${plateFollowsGround({ ground: groundLum, plate: lum })}`]);
rows.push(["pageLanguageMatchesStory", JSON.stringify(pageLanguageMatchesStory(html, storyboard.language))]);
for (const [name, detail] of rows) console.log(`${name.padEnd(26)} ${detail}`);
