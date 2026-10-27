// The dumbbell-range-plot GESTURE scrolly: the Position family's one runner (./gesture-position-run.mjs) drawing this type's
// variant. One card per gesture, the scroll interpolating between their pictures (./gesture-position-scrolly.mjs),
// then a closing card carrying the limits; drawn by ./GesturePositionScrolly.tsx. Everything about THIS story lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runScrollyPosition } from "./gesture-position-run.mjs";

await runScrollyPosition(dirname(fileURLToPath(import.meta.url)), "dumbbell-range-plot");
