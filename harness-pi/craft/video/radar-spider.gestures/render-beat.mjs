// The radar-spider GESTURE kit, video: the beat's `gestures` staged by the profile family (./gesture-family-profile.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the video
// scheduler → render → the scene, title card and credit measured → the type floor at every event's end → the look stills, then the mp4. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureProfileFrame } from "./GestureProfileFrame.tsx";
import { PROFILE_SPEC, profileModel } from "./gesture-family-profile.mjs";
import { runKeyedVideo } from "./gesture-keyed-run.mjs";
import { KEYED_VIDEO_TIMING } from "./timing-contract.ts";

await runKeyedVideo({
  here: dirname(fileURLToPath(import.meta.url)),
  Frame: GestureProfileFrame,
  spec: PROFILE_SPEC,
  variant: "radar-spider",
  required: ["eyebrow", "axes", "entities", "gestures", "title", "source", "check"],
  modelOf: (beat) => ({ ...profileModel(beat), variant: "radar-spider" }),
  namesOf: (model) => model.entities.map((e) => e.name),
  composition: "zone-video-radar-spider-gestures",
  timing: KEYED_VIDEO_TIMING,
});
