// The scatter-and-bubble GESTURE kit, static format: the XY family's runner (./gesture-xy-run.mjs, copied flat from craft/_shared/)
// with this kit's variant. Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied into
// the beat by the harness; never edited by the model. See CONTRACT.md.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runStatic } from "./gesture-xy-run.mjs";

await runStatic(dirname(fileURLToPath(import.meta.url)), "scatter-and-bubble");
