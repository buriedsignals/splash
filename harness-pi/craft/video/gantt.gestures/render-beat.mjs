// The gantt GESTURE kit, video: three composed gestures in the six-event timing contract (establish and reference the
// scheduler's; reveal, subject, conclusion the beat's), run by the keyed families' shared runner
// (./gesture-keyed-run.mjs): applyStoryboard → REQUIRED → the rows → check() → the gesture core (format "video", claim
// from STORYBOARD.md) → the interval video scheduler → the scene, title card and credit measured → the type floor at
// every event's end → the look stills, then the mp4. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureIntervalFrame } from "./GestureIntervalFrame.tsx";
import { INTERVAL_SPEC, intervalRows } from "./gesture-family-interval.mjs";
import { runKeyedVideo } from "./gesture-keyed-run.mjs";
import { KEYED_VIDEO_TIMING } from "./timing-contract.ts";

await runKeyedVideo({
  here: dirname(fileURLToPath(import.meta.url)),
  spec: INTERVAL_SPEC,
  Frame: GestureIntervalFrame,
  variant: "gantt",
  required: ["eyebrow", "rows", "first", "last", "gestures", "title", "source", "check"],
  modelOf: (beat) => ({ rows: intervalRows(beat), first: beat.first, last: beat.last, spanLabel: typeof beat.spanLabel === "function" ? beat.spanLabel : undefined }),
  namesOf: (model) => model.rows.map((r) => r.name),
  composition: "zone-video-gantt-gestures",
  timing: KEYED_VIDEO_TIMING,
});
