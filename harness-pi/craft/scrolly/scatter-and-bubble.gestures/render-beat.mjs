// The scatter-and-bubble GESTURE kit, scrolly format: the XY family's runner (./gesture-xy-run.mjs, copied flat from craft/_shared/)
// with this kit's variant. Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied into
// the beat by the harness; never edited by the model. See CONTRACT.md.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runScrolly } from "./gesture-xy-run.mjs";

await runScrolly(dirname(fileURLToPath(import.meta.url)), "scatter-and-bubble");
