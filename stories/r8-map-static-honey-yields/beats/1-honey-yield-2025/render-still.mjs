// stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/render-still.mjs
//
// The one rung this beat needs (format: static). Reads the frozen USDA release, runs the join and
// FAILS LOUD both ways, checks the confirmed takeaway's own superlative against the values it is
// drawn from, derives the ramp and the coastline stroke from the recorded palette rather than
// typing either, and draws the still.
//
// Usage: bun stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/render-still.mjs

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contrast,
  deriveFurniture,
  readPalette,
  renderStill,
  assertDrawnInActiveTypeface,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/map-beat/sizes.mjs";
import { HoneyMapStill } from "./HoneyMapStill.tsx";
import {
  HONEY_ALIAS,
  HONEY_BREAKS,
  HONEY_EXPECTED_NO_DATA,
  HONEY_STUDY,
  assertRampReads,
  claimViolations,
  dataRampEnd,
  deltaE76,
  joinValues,
  mixHex,
  sequentialRamp,
  unmatchedValues,
  waterTintFor,
  yieldsFromRelease,
} from "./geo-honey.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_ROOT = resolve(HERE, "../..");
const dataPath = join(STORY_ROOT, "source/data.csv");
const plateDir = join(HERE, "plate");
const outDir = join(HERE, "renders");

const PALETTE = readPalette(STORY_ROOT, { stopAt: dirname(STORY_ROOT) });
const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
const row = sizeFor(pinned);

// ── The release, read once ─────────────────────────────────────────────────────────────────────
const release = yieldsFromRelease(await readFile(dataPath, "utf8"));
const CLAIMED_YEAR = 2025;
if (release.year !== CLAIMED_YEAR)
  throw new Error(
    `this beat's title says ${CLAIMED_YEAR} and the frozen release table is ${release.year}`,
  );
console.log(
  `release  → ${release.dataRows} data rows, ${release.values.size} states published individually, ` +
    `${release.aggregates.length} aggregate row(s) held back from the map: ` +
    `${release.aggregates.map((a) => `${a.label} = ${a.yield}`).join("; ")}`,
);

// ── The join, loud in both directions ──────────────────────────────────────────────────────────
const stray = unmatchedValues(HONEY_STUDY, release.values, { alias: HONEY_ALIAS });
if (stray.length > 0)
  throw new Error(`values with no shape: ${stray.join(", ")}`);
const joined = joinValues(HONEY_STUDY, release.values, {
  alias: HONEY_ALIAS,
  expectedNoData: HONEY_EXPECTED_NO_DATA,
});
console.log(
  `join     → ${joined.matched} of ${HONEY_STUDY.length} shapes carry a value; ` +
    `${joined.noData.length} declared no-data; 0 values with no shape.`,
);

// ── The claim ──────────────────────────────────────────────────────────────────────────────────
//
// The takeaway confirmed at G1: "In 2025 Mississippi's hives made 89 pounds of honey each — nearly
// double the 48-pound United States average, and more than any of the other nineteen states USDA
// reports separately." Two claims, both checkable against this table and neither checkable against
// `source/profile.json` — the frozen profile has three columns, none of which is a yield, and
// `groundTakeaway` "confirmed" this superlative against the release's TABLE-ID column. So it is
// checked HERE, with the values the map is actually drawn from.
const US_AVERAGE_KEY = "US-AVERAGE";
const usAverage = release.aggregates.find((a) => /^United States/.test(a.label));
if (!usAverage || usAverage.yield === null)
  throw new Error("this release carries no United States average row to compare against");
const claimValues = new Map([...release.values, [US_AVERAGE_KEY, usAverage.yield]]);
const SUBJECT = "MS";
const violations = claimViolations({
  values: claimValues,
  subject: SUBJECT,
  comparison: US_AVERAGE_KEY,
  neighbours: [...release.values.keys()].filter((k) => k !== SUBJECT),
  quorum: "all",
  direction: "above",
});
if (violations.length > 0)
  throw new Error(`the title claims more than the source supports:\n  ${violations.join("\n  ")}`);
const aboveAverage = [...release.values.values()].filter((v) => v >= usAverage.yield).length;
console.log(
  `claim    → Mississippi ${release.values.get(SUBJECT)} lb/colony is above the United States ` +
    `average (${usAverage.yield}) and above all ${release.values.size - 1} other published states ` +
    `— 0 violations. ${aboveAverage} of ${release.values.size} published states are at or above ` +
    `the average.`,
);

// ── The colours, derived and then MEASURED ─────────────────────────────────────────────────────
const furniture = deriveFurniture(PALETTE.ground);
// TO is 0.68 and not the seed's 0.78 because of the assertion immediately below — see
// HoneyMapStill.tsx's header for the measurement that fixes it there.
const RAMP_FROM = 0.2;
const RAMP_TO = 0.68;
const ramp = assertRampReads(
  sequentialRamp(
    PALETTE.ground,
    dataRampEnd(PALETTE.accent, PALETTE.ground),
    HONEY_BREAKS.length + 1,
    RAMP_FROM,
    RAMP_TO,
  ),
  PALETTE.ground,
  "the honey ramp",
);

/** GEO-DISCIPLINE RULE 7a, AS ARITHMETIC RATHER THAN AS A PARAGRAPH.
 *
 *  "A fill laid over the land must end up at least as far from the water tint as the bare land
 *  already was — or the coastline must be carried by a stroke measuring 3:1 or better against BOTH
 *  the fill and the water. One or the other. Never neither."
 *
 *  The first branch is UNREACHABLE on this palette and that is a measurement, not an opinion: the
 *  ramp runs from the ground to a light gold and the derived water tint sits inside that lightness
 *  span, so some class is always near it — the best any (FROM, TO) pair reaches is 15.6 ΔE76
 *  against the 23.77 required. So this beat takes the second branch, and asserts it rather than
 *  claiming it. It refuses at render time, which is the only place the numbers are all present.
 */
function assertCoastlineIsDrawn(stroke, classes, water, land) {
  const nearest = Math.min(...classes.map((c) => deltaE76(c, water)));
  const worst = [...classes, water, land]
    .map((against) => ({ against, ratio: contrast(stroke, against) }))
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (worst.ratio < 3)
    throw new Error(
      `geo-discipline rule 7a: the nearest ramp class is ${nearest.toFixed(2)} ΔE76 from the water ` +
        `tint (under the 23.77 the first branch needs), so the coastline has to be a stroke — and ` +
        `${stroke} measures ${worst.ratio.toFixed(2)}:1 against ${worst.against}, under the 3:1 ` +
        `floor WCAG 2.2 SC 1.4.11 sets. Lower the ramp's TO until it clears, or take fewer classes.`,
    );
  return { nearest, worst };
}
const PLATE_LAND = "#292929";
const waterTint = waterTintFor(PLATE_LAND);
const coast = assertCoastlineIsDrawn(furniture.ink, ramp, waterTint, PLATE_LAND);
console.log(
  `colour   → ramp ${ramp.join(" ")}; water ${waterTint}; nearest class to water ` +
    `${coast.nearest.toFixed(2)} ΔE76 (rule 7a branch 1 needs 23.77, so branch 2 applies); ` +
    `coastline ${furniture.ink} measures ${coast.worst.ratio.toFixed(2)}:1 at its worst, against ` +
    `${coast.worst.against}.`,
);

// ── The draw ───────────────────────────────────────────────────────────────────────────────────
const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const plate = `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`;

const props = {
  geometry,
  plate,
  rows: joined.rows,
  breaks: HONEY_BREAKS,
  ramp,
  floorLabel: Math.min(...release.values.values()),
  overline: "Honey, 2025",
  title: "Mississippi's hives made 89 pounds of honey each",
  subtitle:
    "Nearly double the 48-pound national average, and more than any of the nineteen other states " +
    "USDA reports on its own. Thirty more are not reported at all.",
  source: "Source: USDA National Agricultural Statistics Service, Honey, released 13 March 2026",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Pounds of honey per colony, 2025",
  caveat:
    "USDA publishes twenty states one by one and folds every other state into a single line, " +
    '"Other States" — 317,000 colonies and 15.6 million pounds between them. A state drawn without ' +
    "a value may be above Mississippi and this table cannot say. Alaska and Hawaii are not " +
    "reported either and are outside this frame. Colonies that produced honey in more than one " +
    "state are counted in each of them.",
  noDataLabel: "not reported separately",
  alt:
    "A map of the lower forty-eight United States. Twenty states are shaded by the honey their " +
    "hives yielded in 2025, from 27 pounds per colony in Oregon to 89 in Mississippi. Mississippi, " +
    "outlined and labelled, is the darkest; Montana at 85 and North Dakota at 67 are next. " +
    "Twenty-nine states and the District of Columbia carry a hatch instead of a value, because " +
    "USDA does not report them separately. A vertical legend marks the 48-pound United States " +
    "average between the third and fourth class.",
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  ink: furniture.ink,
  muted: furniture.muted,
  // Rule 7: no-data sits BELOW the data ramp so the data is what pops. `muted` is the furniture
  // grey, derived at 4.5:1 for TEXT, and at that weight the twenty-nine hatched states were the
  // loudest thing on the first render — louder than the twenty the map is about. Half-way from the
  // ground to it, derived rather than picked.
  noDataInk: mixHex(PALETTE.ground, furniture.muted, 0.5),
  subject: SUBJECT,
  subjectLabel: "Mississippi",
  subjectValue: release.values.get(SUBJECT),
  comparisonLabel: "U.S. average",
  comparisonValue: usAverage.yield,
};

const element = createElement(HoneyMapStill, props);
const markup = renderToStaticMarkup(element);
assertDrawnInActiveTypeface(markup, { where: "the honey map" });
assertTypeFloor(markup, pinned, { what: "the honey map" });
const { pngPath } = await renderStill({
  element,
  width: row.width,
  height: row.height,
  outDir,
  name: "honey-yield-2025-still",
  // 1, not the default 2. A beat that pins an export size rasterises 1:1, so the delivered PNG
  // measures exactly what gate 2c chose and every `strokeWidth` this component asks for is the
  // width it gets — `renderStill`'s own header argues both halves.
  scale: 1,
});
assertDeliveredSize(readPngSize(await readFile(pngPath)), pinned, { what: pngPath });
console.log(`still    → ${pngPath}\nNow open it and look at it.`);
