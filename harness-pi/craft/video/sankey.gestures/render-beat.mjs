// The sankey GESTURE kit, video: the beat's `gestures` staged by the flow family (./gesture-family-flow.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the video
// scheduler → render → the scene, title card and credit measured → the type floor at every event's end → the look stills, then the mp4. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureFlowFrame } from "./GestureFlowFrame.tsx";
import { FLOW_SPEC, flowModel } from "./gesture-family-flow.mjs";
import { runKeyedVideo } from "./gesture-keyed-run.mjs";
import { KEYED_VIDEO_TIMING } from "./timing-contract.ts";

await runKeyedVideo({
  here: dirname(fileURLToPath(import.meta.url)),
  Frame: GestureFlowFrame,
  spec: FLOW_SPEC,
  variant: "sankey",
  required: ["eyebrow", "flows", "gestures", "title", "source", "check"],
  modelOf: (beat) => flowModel(beat),
  namesOf: (model) => [...model.left, ...model.right],
  composition: "zone-video-sankey-gestures",
  timing: KEYED_VIDEO_TIMING,
});
