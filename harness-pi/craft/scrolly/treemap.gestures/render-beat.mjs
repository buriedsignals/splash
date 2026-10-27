// The treemap GESTURE scrolly: a thin entry over the Part-to-whole family's scrolly runner
// (./gesture-part-run-scrolly.mjs), which validates the beat's `gestures` on the family (./gesture-family-part.mjs),
// schedules one card per gesture and checks every card's words (./gesture-part-scrolly.mjs), and draws the variant
// "treemap" of ./GesturePartScrolly.tsx, painted by the inlined drive. Everything about THIS story lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness with the shared files beside it;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GesturePartScrolly } from "./GesturePartScrolly.tsx";
import { runPartScrolly } from "./gesture-part-run-scrolly.mjs";

await runPartScrolly({ here: dirname(fileURLToPath(import.meta.url)), variant: "treemap", Component: GesturePartScrolly });
