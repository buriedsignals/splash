/**
 * Runs `chart-web`'s own guards and capability detectors against THIS beat's delivered page.
 *
 * The skill declares them and calls them from `verify-guards.mjs` / `verify-web.mjs`, both of which
 * walk the skill's OWN committed beats. A story beat outside that walk has no entry point of its
 * own, so this is it — the same shape the flow-map beat in another story uses for `map-web`'s five.
 *
 *   bun stories/real-ember-renewables-share/beats/1-where-your-country-sits/check-guards.mjs
 *
 * What is NOT here, and why: `keyboardReachesEveryMark`, `staticFrameSurvives`, `motionUnderReduce`
 * and `graphicFillsItsFrame` all need a live browser, and `verify-web.mjs --file <this page>` is
 * where they are actually driven. Running them a second time from here would be a second, weaker
 * copy of a check that already has a home.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

import {
  duplicatedPayload,
  revealDashInScreenSpace,
  marksFromSource,
  pageLanguageMatchesStory,
} from "../../../../skills/chart-web/scripts/verify-guards.mjs";
import { tableCarriesTheMarks } from "../../../../skills/chart-web/scripts/detect-accessible-table.mjs";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
} from "../../../../skills/chart-web/scripts/detect-weight-has-a-ceiling.mjs";
import { denominatorReadingStated } from "../../../../skills/chart-web/scripts/detect-denominator-reading.mjs";
import { rtlRunsAreIsolated } from "../../../../skills/chart-web/scripts/detect-rtl-isolation.mjs";
import {
  creditTracesToRecord,
  doubleHyphenInDeliveredText,
} from "../../../../skills/chart-web/scripts/detect-delivered-text.mjs";
import { storyboardGateStatus } from "../../../../skills/chart-web/scripts/storyboard-gate.mjs";
import { labelStacksFrom, mislabelledRows } from "../../../../skills/chart-web/scripts/detect-label-rows.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "../..");
const page = join(HERE, "renders/where-your-country-sits.html");

const html = await readFile(page, "utf8");
const storyboard = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8")).meta;

const rows = [];
rows.push(["duplicatedPayload", JSON.stringify(duplicatedPayload(html))]);
const marks = marksFromSource(html, page);
rows.push([
  "revealDashInScreenSpace",
  `${marks.length} mark(s): ${JSON.stringify(revealDashInScreenSpace(marks))}`,
]);
const table = tableCarriesTheMarks(html);
rows.push([
  "tableCarriesTheMarks",
  `${table.marks} mark(s), ${table.rows} row(s), ${table.missing.length} missing`,
]);
const bytes = statSync(page).size;
rows.push([
  "weightAgainstCeiling",
  `${bytes} bytes: ${JSON.stringify(weightAgainstCeiling(bytes, CEILING_BYTES))}`,
]);
rows.push(["pageLanguageMatchesStory", JSON.stringify(pageLanguageMatchesStory(html, storyboard.language))]);
rows.push(["storyboardGateStatus", JSON.stringify(storyboardGateStatus(HERE))]);
rows.push(["denominatorReadingStated", JSON.stringify(denominatorReadingStated(HERE))]);
rows.push(["rtlRunsAreIsolated", JSON.stringify(rtlRunsAreIsolated(HERE))]);
rows.push(["creditTracesToRecord", JSON.stringify(creditTracesToRecord(HERE))]);
rows.push(["doubleHyphenInDeliveredText", JSON.stringify(doubleHyphenInDeliveredText(HERE))]);
// `labelStacksFrom` returns `{ stacks, links }` and `mislabelledRows` takes the two separately.
// It reads SVG `<text>` elements, and this format draws no `<text>` at all — every word on the page
// is HTML positioned over the geometry — so on any chart-web beat this reads zero stacks and can
// never fire. Recorded here rather than left out, because a vacuous check that looks green is worse
// than an absent one.
const svg = /<svg[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
const { stacks, links } = labelStacksFrom(svg);
rows.push([
  "mislabelledRows",
  `${stacks.length} label stack(s), ${links.length} link(s): ${JSON.stringify(mislabelledRows(stacks, links))}`,
]);

for (const [name, detail] of rows) console.log(`${name.padEnd(28)} ${detail}`);
