// The generic half of a waterfall-bridge GESTURE beat (Stack family, craft/gestures/GRAMMAR.md F2): the per-type kit's
// runner (static/waterfall-bridge/render-beat.mjs) with its fixed staging replaced by the beat's `gestures`.
// Guard order: applyStoryboard → REQUIRED → the family model → the shared guards → check() → the gesture core on
// the family's marks (validateStack, claim read from STORYBOARD.md) → the static scheduler (composeStackStatic) →
// render. A gesture refusal prints REFUSED with the beat.mjs field and a value that works; with
// SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12
// times. Nothing here refuses the data's SHAPE: the plate adapts to it. Copied into the beat by the harness; never
// edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, seriesInks } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { GestureStackStatic } from "./GestureStackStatic.tsx";
import { validateStack } from "./gesture-family-stack.mjs";
import { composeStackStatic } from "./gesture-stack-static.mjs";
import { loadStackBeat, stageWithRepair, textPerRegister } from "./gesture-stack-beat.mjs";
import { errorText } from "./guards.mjs";

const VARIANT = "waterfall-bridge";
const HERE = dirname(fileURLToPath(import.meta.url));
const { beat, stack, claim } = await loadStackBeat(HERE, VARIANT);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const { plate } = stageWithRepair((gestures) => {
  const { gestures: valid, subject } = validateStack({ gestures, stack, format: "static", claim });
  return { plate: composeStackStatic({ gestures: valid, stack, format: beat.format, subject }) };
}, beat.gestures);

const words = textPerRegister(beat, stack, plate.notes.map((n) => n.text));
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister: words });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

let refused = false;
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, words);
  // A bridge's decreases take the second recorded ink (or one derived from the accent, never a grey nobody chose).
  const decreaseInk = VARIANT === "waterfall-bridge" ? seriesInks({ ground: direction.ground, accent: direction.accent, accents: [direction.accent, ...(newsroom.accents ?? []).slice(1)] }, 2)[1] : undefined;
  try {
    await renderStill({
      element: createElement(GestureStackStatic, {
        variant: VARIANT,
        stack,
        plate,
        format: beat.format,
        title: [beat.title].flat(),
        limits: [beat.limits].flat(),
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        unit: beat.unit,
        sideNames: { left: beat.leftName, right: beat.rightName, centre: beat.centreName },
        scope: beat.scope,
        direction,
        decreaseInk,
        frame: { width: FRAME.width, height: FRAME.height },
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
    console.log(`look at: ${join(OUT, `${nameAtSize(id, SIZE)}.png`)}`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused = true;
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused) process.exit(1);
