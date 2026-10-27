// The dumbbell-range-plot GESTURE video: the Position family's one runner (./gesture-position-run.mjs) drawing this type's variant.
// Exactly three gestures fill the reveal, subject and conclusion events (./gesture-position-video.mjs); the scenes
// are laid out in Bun, the frames drawn by ./GesturePositionFrame.tsx in the Remotion composition (./Root.tsx).
// Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied into the beat by the
// harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runVideoPosition } from "./gesture-position-run.mjs";

await runVideoPosition(dirname(fileURLToPath(import.meta.url)), "dumbbell-range-plot");
