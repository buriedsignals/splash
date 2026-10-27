// The marimekko-mosaic-plot GESTURE still: a thin entry over the Part-to-whole family's static runner
// (./gesture-part-run-static.mjs), which validates the beat's `gestures` on the family (./gesture-family-part.mjs),
// composes them onto one plate (./gesture-part-static.mjs) and draws the variant "marimekko-mosaic-plot" of
// ./GesturePartStatic.tsx. Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied
// into the beat by the harness with the shared files beside it; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GesturePartStatic } from "./GesturePartStatic.tsx";
import { runPartStatic } from "./gesture-part-run-static.mjs";

await runPartStatic({ here: dirname(fileURLToPath(import.meta.url)), variant: "marimekko-mosaic-plot", Component: GesturePartStatic });
