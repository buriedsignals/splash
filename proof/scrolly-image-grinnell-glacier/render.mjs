// The runner for the IMAGE scrolly beat: four photographs of one glacier, taken from one summit
// across 71 years, held in the same rectangle while the reader scrolls past them.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` and
// builds its own `steps` array from its own frame component (`ImageFrame.tsx`). Nothing under
// `scrolly/` is edited by it.
//
// WHAT THIS BEAT IS AND IS NOT, because it is the one of the three that cannot be finished without
// a journalist. The vehicle, the track, the lane, the credit discipline and the ordering are all
// real and complete. The PHOTOGRAPHS are not this newsroom's: they are the U.S. Geological Survey's
// own repeat-photography record of Grinnell Glacier, public domain, credited frame by frame from
// `photographs.csv`. A real beat replaces those four files and those four rows with the
// journalist's own images — and nothing else in this folder changes. See BRIEF.md, "What a
// journalist's own photographs would replace".
//
// Usage:
//   bun proof/scrolly-image-grinnell-glacier/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import {
  deriveFurniture,
  readPalette,
} from "#shared/chart-beat/render-still.mjs";
import { deriveSequenceFacts, readPhotographs } from "./photograph-data.ts";
import { ImageSequence, PROSE_LANE } from "./ImageFrame.tsx";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const {
  ground,
  accent,
  origin,
  source: paletteSource,
} = readPalette(HERE, { stopAt: join(HERE, "..") });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(
  argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"),
);

/**
 * What each frame's own paragraph says about the picture beside it. Kept HERE, next to the years
 * they belong to, and looked up BY YEAR rather than by position — a description that silently
 * shifted onto the wrong photograph because a row moved in the CSV is the exact defect this beat's
 * own subject makes unforgiving.
 *
 * Every sentence describes what is visible in that frame. None of them states a measurement: four
 * photographs are not a survey, and this beat claims nothing it cannot show.
 */
const SEEN = new Map([
  [1938, "Ice fills the floor of the basin below the cliff. There is no lake."],
  [1981, "A lake has opened at the foot of the ice, with slabs of it floating in the water."],
  [1998, "The lake has widened, and the ice that feeds it has drawn back up the slope."],
  [2009, "The basin is a lake with ice floating on it. What is left of the glacier hangs on the shelf above."],
]);

async function render() {
  const photographs = readPhotographs(
    await readFile(join(HERE, "photographs.csv"), "utf8"),
  );
  const facts = deriveSequenceFacts(photographs);

  for (const p of photographs)
    if (!SEEN.has(p.year))
      throw new Error(
        `photographs.csv carries a ${p.year} frame with nothing written about it; a step with a picture and no paragraph is a picture the reader is left to interpret alone`,
      );

  const sources = await Promise.all(
    photographs.map(async (p) => {
      const buf = await readFile(join(HERE, p.deliveredFile));
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    }),
  );

  // ONE persistent visual, not four frames. The scroll drags the boundary between two photographs
  // across it, so the picture changes on every animation frame the reader's thumb produces rather
  // than cross-fading between four stills — see `wipe-drive.mjs` for the measurement that forced
  // this and for why the device is a wipe rather than a dissolve.
  const visual = createElement(ImageSequence, {
    photographs,
    // The aspect the frames were NORMALISED to, read off the sequence rather than typed —
    // `deriveSequenceFacts` has already thrown if the four do not share one box.
    aspect: facts.box.width / facts.box.height,
    sources,
    position: 0,
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
  });

  const driverSource = await readFile(join(HERE, "wipe-drive.mjs"), "utf8");
  const boot =
    driverSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__glacierStarted) return;\n` +
    `  window.__glacierStarted = true;\n` +
    // The script sits inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so no
    // panel exists yet when this tag is parsed.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="glacier-wipe"]');\n` +
    `    if (!root) return;\n` +
    `    initImageWipe(root, ${photographs.length});\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const steps = photographs.map((p, i) => {
    const gap = i === 0 ? null : p.year - photographs[i - 1].year;
    const opening =
      i === 0
        ? `Grinnell Glacier, photographed from the summit of Mount Gould in ${p.year} by ${p.photographer}.`
        : i === photographs.length - 1
          ? `${gap} years after that, and ${facts.spanYears} after the first frame.`
          : `${gap} years later, the same view from the same summit.`;
    return {
      id: String(p.year),
      prose: [`${opening} ${SEEN.get(p.year)}`],
      frame:
        i === 0
          ? createElement(
              Fragment,
              null,
              visual,
              createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
            )
          : createElement("div"),
    };
  });

  const title = `Grinnell Glacier from Mount Gould: ${facts.frames} photographs, ${facts.spanYears} years, one viewpoint`;
  const source =
    `Repeat photography of Grinnell Glacier, Glacier National Park, Montana. ` +
    `${facts.photographers.join(", ")} — Glacier National Park Archives and the U.S. Geological Survey; ` +
    `all ${facts.frames} in the public domain. Each frame centre-cropped to one common aspect and ` +
    `resampled to ${facts.box.width}×${facts.box.height}; nothing else was changed. Every original's own URL ` +
    `and sha256 is in photographs.csv beside this beat. Colours recorded in ` +
    `${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    // This beat's words are English throughout, handed to `renderScrolly` as a real input
    // — see `assertRecordedLanguage`. Recorded here, never detected from the prose.
    language: "en",
    outDir,
    name: "grinnell-glacier.html",
    proseLane: PROSE_LANE,
  });

  console.log(
    `image-scrolly → ${outPath}  [${steps.length} frames, ${facts.firstYear}–${facts.lastYear} ` +
      `(${facts.spanYears} years), gaps ${facts.gaps.join("/")}, longest ${facts.longestGap.years} ` +
      `(${facts.longestGap.from}→${facts.longestGap.to}), one ${facts.box.width}×${facts.box.height} box, ` +
      `panel contrast ${panelContrast.toFixed(2)}:1, accent ${accent} unused on the frames]`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
