// The generic half of a heatmap-matrix GESTURE beat (video): the per-type kit's runner (video/heatmap-matrix/render-beat.mjs) with
// its fixed staging replaced by the beat's `gestures`, through the Cell-grid family (./gesture-family-cell.mjs, the
// video scheduler ./gesture-cell-video.mjs, the layout ./gesture-cell-video-build.mjs, the frame ./GestureCellFrame.tsx, the Remotion entry ./index.ts; the runner ./gesture-cell-run.mjs).
// A gesture refusal prints REFUSED with the beat.mjs field and a value that works; SPLASH_GESTURE_REPAIR=1 applies the
// refusal's fix instead and stages again. Everything about THIS story lives in ./beat.mjs, the one file the model
// writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { runVideo } from "./gesture-cell-run.mjs";

await runVideo(import.meta.dirname, "heatmap-matrix");
