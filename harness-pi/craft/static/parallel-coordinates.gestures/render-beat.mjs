// The parallel-coordinates GESTURE kit, static: the beat's `gestures` staged by the profile family (./gesture-family-profile.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the static
// scheduler → render → one still plate → `look at:`. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureProfileStatic } from "./GestureProfileStatic.tsx";
import { PROFILE_SPEC, profileModel } from "./gesture-family-profile.mjs";
import { runKeyedStatic } from "./gesture-keyed-run.mjs";

await runKeyedStatic({
  here: dirname(fileURLToPath(import.meta.url)),
  Component: GestureProfileStatic,
  spec: PROFILE_SPEC,
  variant: "parallel-coordinates",
  required: ["eyebrow", "axes", "entities", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ ...profileModel(beat), variant: "parallel-coordinates" }),
  namesOf: (model) => model.entities.map((e) => e.name),
});
