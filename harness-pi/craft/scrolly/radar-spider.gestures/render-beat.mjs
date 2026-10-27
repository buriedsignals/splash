// The radar-spider GESTURE kit, scrolly: the beat's `gestures` staged by the profile family (./gesture-family-profile.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the scrolly
// scheduler → render → renderScrolly → verify-scrolly → one screenshot per card. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureProfileScrolly } from "./GestureProfileScrolly.tsx";
import { PROFILE_SPEC, profileModel } from "./gesture-family-profile.mjs";
import { runKeyedScrolly } from "./gesture-keyed-run.mjs";

await runKeyedScrolly({
  here: dirname(fileURLToPath(import.meta.url)),
  Component: GestureProfileScrolly,
  spec: PROFILE_SPEC,
  variant: "radar-spider",
  required: ["eyebrow", "axes", "entities", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ ...profileModel(beat), variant: "radar-spider" }),
  namesOf: (model) => model.entities.map((e) => e.name),
  plotOf: () => ({ width: 900, height: 600 }),
});
