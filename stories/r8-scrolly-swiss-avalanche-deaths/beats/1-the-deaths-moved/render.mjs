// The runner for "the deaths moved". One scroll carrying THREE media in the order the reader needs
// them: where the avalanches are, what the two terrains are, what changed, and what the forecast
// said.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` — the
// media-agnostic scaffold above the CONFIG marker in `skills/scrolly/scripts/render-scrolly.mjs` —
// and builds its own `steps` array from its own frame components (`AvalancheFrames.tsx`). Nothing
// under `skills/` is edited by this file.
//
// Usage:
//   bun stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { creditLine, parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { renderScrolly } from "../../../../skills/scrolly/scripts/render-scrolly.mjs";
import { parseAccidents, deriveFacts, group } from "./avalanche-data.ts";
import { MapFrame, DiagramFrame, SeriesFrame, DangerFrame } from "./AvalancheFrames.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");
const ROOT = resolve(HERE, "../../../..");

const OUTPUT_NAME = "the-deaths-moved.html";

/** Colours from the answer recorded in `PALETTE.md` beside the story — never a hex written here.
 *  `accents[1]` is the house's second accent, recorded because this beat draws two series;
 *  `readPalette` refuses a file whose accents do not clear the non-text floor. */
const palette = readPalette(HERE, { stopAt: ROOT });
const furniture = deriveFurniture(palette.ground);
if (palette.accents.length < 2)
  throw new Error(
    `this beat draws two series and PALETTE.md records ${palette.accents.length} accent(s) — ` +
      `record the second house accent, or the two terrains would be drawn in one colour`,
  );
const second = palette.accents[1];

/** The four steps. Every figure in `prose` is a FUNCTION of the facts derived from the frozen file;
 *  nothing below is a literal a reader could check against and find wrong. */
const STEPS_META = [
  {
    id: "where",
    frameKind: "map",
    prose: (facts) => [
      `Since the winter of ${facts.firstWinter} the SLF has recorded every avalanche in Switzerland that killed somebody. There have been ${group(facts.accidents)} of them, and they have killed ${group(facts.dead)} people — an average of ${facts.meanPerWinter} a winter across ${group(facts.winters)} winters.`,
      `Each dot is one avalanche, at the point where it started. ${facts.cantons.top[0].canton} and ${facts.cantons.top[1].canton} hold ${facts.cantons.topShare} per cent of the dead between them.`,
    ],
  },
  {
    id: "two-terrains",
    frameKind: "drawn",
    prose: (facts) => [
      "The SLF records where each person was, not only that they died. Inside or beside a building, on a road, a railway or a ski run, the terrain is controlled: somebody is responsible for it, and it can be closed, blasted or built against.",
      `On tour or off-piste, nobody is. ${group(facts.uncontrolled)} of the deaths are on that side of the line and ${group(facts.controlled)} on the other. ${group(facts.mixed + facts.unattributed)} sit on neither and are counted as neither.`,
    ],
  },
  {
    id: "crossover",
    frameKind: "series",
    prose: (facts) => [
      `In the first ${facts.first20.winters} winters on record, ${group(facts.first20.controlled)} of ${group(facts.first20.total)} deaths were in controlled terrain. In the last ${facts.last20.winters}, ${group(facts.last20.controlled)} of ${group(facts.last20.total)}.`,
      `The toll itself barely moved. What moved was where it fell — and ${facts.worstWinter.winter}, the worst winter on record at ${group(facts.worstWinter.total)} dead, ${group(facts.worstWinter.controlled)} of them indoors or on a road, is the kind of winter Switzerland has not had since.`,
    ],
  },
  {
    id: "forecast",
    frameKind: "danger",
    prose: (facts) => {
      const worst = facts.danger.levels.reduce((a, b) => (b.accidents > a.accidents ? b : a));
      const high = facts.danger.levels.find((l) => l.level === 4);
      return [
        `The national avalanche bulletin has forecast a danger level since long before most of these accidents. On the ${group(facts.danger.withLevel)} fatal avalanches that carry one, the level most often forecast was ${worst.level}, ${worst.label}: ${group(worst.accidents)} of them.${high ? ` Level 4, high, accounts for ${group(high.accidents)}.` : ""}`,
        "The SLF's own warning about this reading, verbatim: “this graph does not correspond to an individual’s risk because only the absolute numbers of accidents are shown without reference to the sizes of the risk populations surveyed in each category.” Most people are out on a considerable day because most days are considerable.",
      ];
    },
  },
];

/** The ONE place in this file that reads a step's own `frameKind`. */
function buildFrame(meta, ctx) {
  const { ground, ink, muted, grid, accent } = ctx;
  if (meta.frameKind === "map")
    return createElement(MapFrame, {
      plate: ctx.plateDataUri,
      frame: ctx.plate.frame,
      points: ctx.plate.points,
      facts: ctx.facts,
      ground,
      ink,
      muted,
      accent,
      second,
    });
  if (meta.frameKind === "drawn")
    return createElement(DiagramFrame, { facts: ctx.facts, ground, ink, muted, accent, second });
  if (meta.frameKind === "series")
    return createElement(SeriesFrame, { facts: ctx.facts, ground, ink, muted, grid, accent, second });
  if (meta.frameKind === "danger")
    return createElement(DangerFrame, { facts: ctx.facts, ground, ink, muted, grid, accent });
  throw new Error(`unknown frameKind "${meta.frameKind}" — teach buildFrame a new case, or fix STEPS_META`);
}

export async function render({ outDir, name = OUTPUT_NAME }) {
  const [csv, plateBuffer, plateGeometry, storyboardText] = await Promise.all([
    readFile(join(STORY_DIR, "source", "data.csv"), "utf8"),
    readFile(join(HERE, "swiss-plate.jpg")),
    readFile(join(HERE, "swiss-plate.json"), "utf8"),
    readFile(join(STORY_DIR, "STORYBOARD.md"), "utf8"),
  ]);

  const { meta } = parseStoryboard(storyboardText);
  const facts = deriveFacts(parseAccidents(csv));
  const plate = JSON.parse(plateGeometry);

  // THE PLATE AND THE PAGE MUST BE ON THE SAME SIDE. `bake-plate.mjs` derives its basemap style
  // from the recorded ground; this refuses a plate baked against a different one, so a re-bake with
  // `--style` cannot quietly ship a light basemap under a dark page.
  if (plate.ground !== palette.ground)
    throw new Error(
      `the committed plate was baked against ground ${plate.ground} and PALETTE.md now records ` +
        `${palette.ground} — re-run bake-plate.mjs before rendering`,
    );

  const ctx = {
    plateDataUri: `data:image/jpeg;base64,${plateBuffer.toString("base64")}`,
    plate,
    facts,
    ground: palette.ground,
    accent: palette.accent,
    ...furniture,
  };

  const steps = STEPS_META.map((step) => ({
    id: step.id,
    prose: step.prose(facts),
    frame: buildFrame(step, ctx),
  }));

  const source =
    `${creditLine(meta.credit)}. Downloaded and frozen ${meta.effectiveDate}; the publisher's file ` +
    `records "Update: 2025-02-10". Basemap: MapTiler ${plate.style}, © OpenStreetMap contributors. ` +
    `Deaths are counted from the accident register itself; the publisher's companion per-year file ` +
    `(doi:10.16904/14) differs from it in 5 of the 85 winters both cover.`;

  const result = await renderScrolly({
    steps,
    title: "Swiss avalanches have almost stopped killing people at home",
    source,
    ground: palette.ground,
    language: meta.language,
    outDir,
    name,
  });
  return { ...result, facts };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "renders"));
  const { outPath, steps, panelContrast } = await render({ outDir });
  console.log(`scrolly beat → ${outPath}  [${steps} steps, panel contrast ${panelContrast.toFixed(2)}:1]`);
}
