// The slope-slopegraph GESTURE page, web: the Position family's one runner (./gesture-position-run.mjs) drawing this type's
// variant. The resting gestures are drawn on the page the reader lands on; every further gesture is one reader control
// (./gesture-position-web.mjs), drawn by ./GesturePositionWeb.tsx. Everything about THIS story lives in ./beat.mjs, the
// one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runWebPosition } from "./gesture-position-run.mjs";

await runWebPosition(dirname(fileURLToPath(import.meta.url)), "slope-slopegraph");
