// The runner for the Rhone glacier scrolly: ONE picture — the glacier's own surface area, eight
// readings, 1990 to 2025 — and eight successive readings of it, driven by the reader's scroll.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` (the
// media-agnostic scaffold above its CONFIG marker) and hands it steps. Nothing under `skills/` is
// edited by it.
//
// WHY THIS EARNS THE SCROLL. The journalist asked for it in their own last line — "the reader
// should move through the decades one step at a time and arrive at the 2025 figure" — and the
// argument has a shape a single frame flattens: eight readings that fall, one interval in the
// middle where the number does not move at all, and a total that is only legible once the reader
// has watched the other seven arrive. A static frame shows the plateau as a flat segment somebody
// has to notice; a video takes the pace away from the reader, who has to be able to sit on 2005 and
// read the sentence that explains it.
//
// Usage:
//   bun stories/stress-u-rhone-glacier/beats/1-rhone-glacier-scrolly/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "../../../../skills/palette/scripts/palette.mjs";
import { renderScrolly } from "../../../../skills/scrolly/scripts/render-scrolly.mjs";
import { creditLine, parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { GlacierFrame } from "./GlacierFrame.tsx";
import { PROSE_LANE, assertNumericStates } from "./glacier-drive.mjs";
import { deriveFacts, parseReadings, t1, t2, t3 } from "./glacier-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = resolve(HERE, "../..");

// The colours come from the answer recorded in the story's own PALETTE.md — never a hex written
// here. `stopAt` is an input SEARCH BOUNDARY: a beat with no recorded answer throws instead of
// quietly inheriting a neighbour's.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
// The default writes BESIDE THE BEAT. A `/tmp` default is how a render prints a path, exits zero,
// and leaves the committed artefact stale.
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "renders"));

/** The eight states the scroll drives between — one per measurement. Every `head` is a real year in
 *  the frozen table; the three opacities are the only shape decisions. */
function buildStates(facts) {
  const pauseFrom = facts.flatIntervals[0]?.[0] ?? null;
  return assertNumericStates(
    facts.readings.map((reading, i) => ({
      head: reading.year,
      gapOpacity: i === 0 ? 0 : 0.28,
      pauseOpacity: pauseFrom !== null && reading.year > pauseFrom ? 1 : 0,
      finalOpacity: i === facts.readings.length - 1 ? 1 : 0,
    })),
  );
}

/** The eight steps' words. Every figure is a function of the derived facts — never a string with a
 *  number typed into it. */
function buildSteps(facts) {
  const { readings } = facts;
  const unit = "square kilometres";
  const pause = facts.flatIntervals[0];
  return readings.map((reading, i) => {
    const previous = i === 0 ? null : readings[i - 1];
    const lostSoFar = facts.firstArea - reading.area;
    const shareSoFar = lostSoFar / facts.firstArea;
    const lines = [];

    if (i === 0) {
      lines.push(
        `In ${reading.year} the Rhone glacier covered ${t2(reading.area)} ${unit}. The faint line ` +
          `ahead of you is the whole record: ${readings.length} measurements, one every ` +
          `${facts.stepYears} years, ${facts.firstYear} to ${facts.lastYear}. Scroll, and the ` +
          `reading you are standing on fills in.`,
      );
    } else if (pause && reading.year === pause[1] && reading.area === readings[i - 1].area) {
      lines.push(
        `${reading.year}: ${t2(reading.area)} ${unit} — the same figure as ${pause[0]}, to the last ` +
          `digit. For ${facts.stepYears} years the line runs flat. The monitoring network puts that ` +
          `down to a run of heavy winters rather than to any recovery; the table itself records only ` +
          `that the number did not move, and says nothing about the ${facts.stepYears} years in ` +
          `between two measurements.`,
      );
    } else if (i === readings.length - 1) {
      lines.push(
        `${reading.year}: ${t2(reading.area)} ${unit}. ${t1(shareSoFar * 100)} per cent of the ` +
          `${facts.firstYear} glacier is gone — the shaded band is all of it. The volume fell ` +
          `further still, from ${t3(facts.firstVolume)} to ${t3(facts.lastVolume)} cubic kilometres, ` +
          `${t1(facts.volumeLostShare * 100)} per cent: the ice thinned as well as retreated.`,
      );
    } else {
      const drop = previous.area - reading.area;
      const resumed = pause && previous.year === pause[1];
      lines.push(
        `${reading.year}: ${t2(reading.area)} ${unit}. ${resumed ? "The retreat resumes the moment the pause ends — " : ""}` +
          `${t2(drop)} ${unit} gone since ${previous.year}, ${t1(shareSoFar * 100)} per cent off the ` +
          `${facts.firstYear} glacier so far.`,
      );
    }

    return { id: String(reading.year), prose: lines };
  });
}

async function render() {
  const csv = await readFile(join(STORY, "source/data.csv"), "utf8");
  const readings = parseReadings(csv);
  const facts = deriveFacts(readings);

  // The two claims this beat's own steps rest on, asserted against the data rather than trusted.
  // If a re-export moved either, the run stops here rather than shipping a sentence the picture
  // contradicts.
  if (facts.flatIntervals.length !== 1)
    throw new Error(
      `step 4's sentence is about ONE interval whose area does not move, and the frozen table has ` +
        `${facts.flatIntervals.length}`,
    );
  if (!(facts.areaLostShare > 0.6 && facts.areaLostShare < 0.7))
    throw new Error(
      `the takeaway says "two thirds"; the frozen table says ${(facts.areaLostShare * 100).toFixed(1)} per cent`,
    );

  const states = buildStates(facts);
  const steps = buildSteps(facts);

  // The credit is the answer recorded in this story's own STORYBOARD.md, printed through the same
  // `creditLine` the hand-over uses — never a sentence composed here.
  const { meta } = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8"));
  const credit = creditLine(meta.credit);
  // Short on purpose: it sits at the FLOOR OF THE DRAWING, where a second line would reach up into
  // the x-axis tick strip at 375x812. The full recorded credit rides the page's own source row,
  // which under the fixed-page model never scrolls away.
  const shortCredit = credit.replace(/^Source:\s*/u, "").split(",")[0];

  const visual = createElement(GlacierFrame, {
    readings,
    state: states[0],
    unit: "km²",
    baselineLabel: `${facts.firstYear} level — ${t2(facts.firstArea)} km²`,
    pauseLabel: `${facts.flatIntervals[0][0]}–${facts.flatIntervals[0][1]}: no change`,
    finalLabel: `${t1(facts.areaLostShare * 100)}% gone`,
    credit: shortCredit,
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
    accent,
  });

  // The driver, inlined verbatim from the SAME module `GlacierFrame.tsx` imported to SSR the first
  // state. `export` is stripped so it runs as a classic script — no `type="module"`, so it keeps
  // working inside a CMS iframe that restricts module scripts.
  const driverSource = await readFile(join(HERE, "glacier-drive.mjs"), "utf8");
  const boot =
    driverSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__rhoneGlacierStarted) return;\n` +
    `  window.__rhoneGlacierStarted = true;\n` +
    // The script is inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so at the
    // moment this tag is parsed not one prose panel exists yet. Waiting for the parse to finish is
    // the fix, and the guard above keeps it running exactly once either way.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="rhone-glacier"]');\n` +
    `    if (!root) return;\n` +
    `    initGlacierScrolly(root, ${JSON.stringify(readings)}, ${JSON.stringify(states)}, ` +
    `${JSON.stringify({ unit: "km²", accent, muted: furniture.muted })});\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const script = createElement("script", { dangerouslySetInnerHTML: { __html: boot } });

  // Step 1 carries the ONE picture and the driver; the other steps carry an empty wrapper. The
  // driver moves the picture out of the wrapper on load so the scaffold's own swap can never
  // un-paint it, and with JavaScript off the picture stays inside the frame the scaffold marks
  // active by default — so a no-JS reader gets the whole of the first reading, and every step's
  // prose, and nothing half-drawn.
  const stepsWithFrames = steps.map((step, i) => ({
    ...step,
    frame: i === 0 ? createElement(Fragment, null, visual, script) : createElement("div"),
  }));

  const title =
    `The Rhone glacier lost ${t1(facts.areaLostShare * 100)} per cent of its area between ` +
    `${facts.firstYear} and ${facts.lastYear}`;
  const source =
    `Surface area and volume of the Rhone glacier, ${facts.firstYear}–${facts.lastYear}, ` +
    `${readings.length} readings ${facts.stepYears} years apart, frozen as source/data.csv. ` +
    `${credit}. Colours: ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)}, chosen by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps: stepsWithFrames,
    title,
    source,
    ground,
    // The story's own recorded language (STORYBOARD.md, `language: "en"`), handed over as a real
    // input — never detected from the prose.
    language: meta.language,
    outDir,
    name: "rhone-glacier.html",
    proseLane: PROSE_LANE,
  });

  console.log(
    `rhone-glacier scrolly → ${outPath}\n` +
      `  ${readings.length} readings ${facts.firstYear}-${facts.lastYear}, ${steps.length} steps, ` +
      `panel contrast ${panelContrast.toFixed(2)}:1\n` +
      `  area ${t2(facts.firstArea)} → ${t2(facts.lastArea)} km2 (${t1(facts.areaLostShare * 100)}% lost)\n` +
      `  volume ${t3(facts.firstVolume)} → ${t3(facts.lastVolume)} km3 (${t1(facts.volumeLostShare * 100)}% lost)\n` +
      `  flat interval(s): ${facts.flatIntervals.map(([a, b]) => `${a}-${b}`).join(", ")}\n` +
      `  steepest ${facts.stepYears}-year fall: ${facts.steepest.from}-${facts.steepest.to}, ${t2(facts.steepest.drop)} km2`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
