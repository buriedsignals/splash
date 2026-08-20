// The runner for the eight-checkpoint scrolly beat: one shipment, eight recorded checkpoints,
// stepped through as the reader scrolls.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` (the
// media-agnostic scaffold, above its CONFIG marker in `skills/scrolly/scripts/render-scrolly.mjs`)
// and builds its own `steps` array from its own frame component (`CheckpointFrame.tsx`). Nothing
// under `skills/scrolly/` is edited by this file.
//
// THE TRAP THIS BEAT CARRIES ON PURPOSE. `source/data.csv` is frozen and reads:
//   step,label,value
//   1,Departure,0
//   2,First stop,12
//   3,First stop,12
//   4,First stop,12
//   5,Midpoint,48
//   6,Long haul,96
//   7,Long haul,96
//   8,Arrival,140
// The article states why: the scanner at the yard between steps 2 and 4 reports once per shift,
// not once per container, so three checkpoints in a row carry the SAME reading, and the same is
// true of steps 6 and 7. `CheckpointFrame.tsx` draws the shipment's own progress keyed to the
// READING alone (never to the step number), so this beat's own picture is genuinely,
// mechanically unchanged across those repeats — not merely similar. Whether `scrolly`'s own guards
// (`skills/scrolly/scripts/verify-scrolly.mjs`) catch that, and say so, is this beat's whole reason
// for existing; see the story's own report for the verbatim verdict.
//
// Usage:
//   bun stories/stress-g-eight-checkpoints/beats/eight-checkpoints-scrolly/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { deriveFacts, parseReadings } from "./checkpoint-data.ts";
import { CheckpointFrame } from "./CheckpointFrame.tsx";
import { renderScrolly } from "../../../../skills/scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");

// The colours come from the answer recorded in PALETTE.md beside the story — never a hex written
// here. `stopAt` bounds the walk at the repository root so a beat with no recorded answer throws
// rather than quietly inheriting a neighbour's.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, "../../../.."),
});
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "renders"));

/** One step per checkpoint, in the order the article describes — eight, not a re-count. `prose` is
 *  a function of the derived facts, never a string with numbers typed into it, including the two
 *  sentences that name the repeat itself: they are built from `facts.repeats`, which finds the
 *  runs by comparing rows rather than assuming there are exactly two of them, of exactly three and
 *  two checkpoints. */
function buildSteps(facts) {
  const shared = { ground, ink: furniture.ink, muted: furniture.muted, grid: furniture.grid, accent };
  const runNote = (reading) => {
    const run = facts.repeats.find((r) => r.includes(reading.step));
    if (!run) return null;
    const position = run.indexOf(reading.step) + 1;
    return `This is reading ${position} of ${run.length} logged at "${reading.label}" — the scanner at this yard reports once per shift, not once per container, so the number does not move.`;
  };

  // Every middle checkpoint's own progress fraction, computed from the data rather than typed —
  // and, incidentally, what keeps a short reading ("Midpoint", one clause) from leaving the card
  // narrower than a full-width one and wider than a comfortably narrow one: `scrolly`'s own F4
  // guard refuses exactly that in-between shape at a phone's width, because `.step-panel` sizes to
  // its own text rather than to a fixed measure below 600px, and a one-clause step is the shape
  // that lands there.
  const progress = (reading) => Math.round((reading.value / facts.end.value) * 100);

  return facts.readings.map((reading, i) => {
    const note = runNote(reading);
    const prose =
      i === 0
        ? [
            `The container leaves the depot at reading ${reading.value} — the start of an eight-checkpoint journey to reading ${facts.end.value}.`,
          ]
        : i === facts.readings.length - 1
          ? [
              `Checkpoint ${reading.step} of ${facts.count}: "${reading.label}", reading ${reading.value} — arrival. The shipment's own record ends here.`,
            ]
          : [
              `Checkpoint ${reading.step} of ${facts.count}: "${reading.label}", reading ${reading.value} — ${progress(reading)}% of the way to arrival.`,
              ...(note ? [note] : []),
            ];
    return {
      id: `checkpoint-${reading.step}`,
      prose,
      frame: createElement(CheckpointFrame, { ...shared, reading, maxValue: facts.maxValue }),
    };
  });
}

async function render() {
  const csv = await readFile(join(STORY_DIR, "source", "data.csv"), "utf8");
  const readings = parseReadings(csv);
  if (readings.length !== 8)
    throw new Error(`this beat's title counts eight checkpoints; the frozen file now holds ${readings.length}`);
  const facts = deriveFacts(readings);

  const steps = buildSteps(facts);

  const repeatSentence = facts.repeats
    .map((run) => `checkpoints ${run.join(", ")}`)
    .join(" and ");
  const title = "One shipment, eight checkpoints";
  const source =
    `Scanner log, one container's journey, ${facts.count} recorded checkpoints, reading ${facts.start.value} to ${facts.end.value}. ` +
    (repeatSentence
      ? `The scanner reports once per shift, not once per container: ${repeatSentence} repeat their own yard's last reading. `
      : "") +
    `Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    language: "en",
    outDir,
    name: "eight-checkpoints.html",
  });

  console.log(
    `checkpoint-scrolly → ${outPath}  [${steps.length} steps, reading ${facts.start.value} to ${facts.end.value}, ` +
      `repeats: ${repeatSentence || "none"}, panel contrast ${panelContrast.toFixed(2)}:1]`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render, buildSteps };
