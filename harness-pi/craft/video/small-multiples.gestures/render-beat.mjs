// The small-multiples GESTURE kit, video: the beat's `gestures` staged by the multiples family (./gesture-family-multiples.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the video
// scheduler → render → the scene, title card and credit measured → the type floor at every event's end → the look stills, then the mp4. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureMultiplesFrame } from "./GestureMultiplesFrame.tsx";
import { MULTIPLES_SPEC, multiplesPanels } from "./gesture-family-multiples.mjs";
import { runKeyedVideo } from "./gesture-keyed-run.mjs";
import { KEYED_VIDEO_TIMING } from "./timing-contract.ts";

await runKeyedVideo({
  here: dirname(fileURLToPath(import.meta.url)),
  Frame: GestureMultiplesFrame,
  spec: MULTIPLES_SPEC,
  variant: "small-multiples",
  required: ["eyebrow", "panels", "gestures", "title", "source", "check"],
  modelOf: (beat) => ({ ...multiplesPanels(beat), ceiling: Number.isFinite(beat.ceiling) ? beat.ceiling : undefined }),
  namesOf: (model) => model.panels.map((p) => p.name),
  composition: "zone-video-small-multiples-gestures",
  timing: KEYED_VIDEO_TIMING,
});
