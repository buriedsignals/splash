// The treemap GESTURE video: a thin entry over the Part-to-whole family's video runner (./gesture-part-run-video.mjs),
// which validates the beat's three `gestures` on the family (./gesture-family-part.mjs), places them into the six-event
// timing contract (./gesture-part-video.mjs), lays out and measures every word (./gesture-part-video-build.mjs) and
// renders the variant "treemap" of ./GesturePartFrame.tsx through Remotion (./index.ts → ./Root.tsx). Everything about
// THIS story lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness with the shared
// files beside it; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GesturePartFrame } from "./GesturePartFrame.tsx";
import { runPartVideo } from "./gesture-part-run-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

await runPartVideo({ here: dirname(fileURLToPath(import.meta.url)), variant: "treemap", composition: "zone-video-treemap-gestures", timing: GESTURE_VIDEO_TIMING, Frame: GesturePartFrame });
