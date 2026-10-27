// The generic half of a calendar-heatmap GESTURE beat (static): the per-type kit's runner (static/calendar-heatmap/render-beat.mjs) with
// its fixed staging replaced by the beat's `gestures`, through the Cell-grid family (./gesture-family-cell.mjs, the
// static scheduler ./gesture-cell-static.mjs, the plate ./GestureCellStatic.tsx; the runner ./gesture-cell-run.mjs).
// A gesture refusal prints REFUSED with the beat.mjs field and a value that works; SPLASH_GESTURE_REPAIR=1 applies the
// refusal's fix instead and stages again. Everything about THIS story lives in ./beat.mjs, the one file the model
// writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { runStatic } from "./gesture-cell-run.mjs";

await runStatic(import.meta.dirname, "calendar-heatmap");
