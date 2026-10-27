// The dot-strip GESTURE beat, static: the Position family's one runner (./gesture-position-run.mjs) drawing this type's
// variant. The staging is the beat's own `gestures`, composed onto one plate (./gesture-position-static.mjs) and drawn
// by ./GesturePositionStatic.tsx. Everything about THIS story lives in ./beat.mjs, the one file the model writes.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runStaticPosition } from "./gesture-position-run.mjs";

await runStaticPosition(dirname(fileURLToPath(import.meta.url)), "dot-strip");
