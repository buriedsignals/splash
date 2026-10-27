// The grouped-bar GESTURE still: the paired family's static runner (./paired-static-run.mjs) for this variant. The staging is
// the beat's own `gestures`; everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied
// into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runPairedStatic } from "./paired-static-run.mjs";

await runPairedStatic({ here: dirname(fileURLToPath(import.meta.url)), variant: "grouped-bar" });
