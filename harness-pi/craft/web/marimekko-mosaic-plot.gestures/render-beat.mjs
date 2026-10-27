// The marimekko-mosaic-plot GESTURE web page: a thin entry over the Part-to-whole family's web runner
// (./gesture-part-run-web.mjs), which validates the beat's `gestures` on the family (./gesture-family-part.mjs),
// schedules them into a resting page and one reader control per further gesture (./gesture-part-web.mjs), and draws
// the variant "marimekko-mosaic-plot" of ./GesturePartWeb.tsx, then verifies it in Chrome (verify-web) and prints `look at:`.
// Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied into the beat by the
// harness with the shared files beside it; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GesturePartWeb } from "./GesturePartWeb.tsx";
import { runPartWeb } from "./gesture-part-run-web.mjs";

await runPartWeb({ here: dirname(fileURLToPath(import.meta.url)), variant: "marimekko-mosaic-plot", Component: GesturePartWeb });
