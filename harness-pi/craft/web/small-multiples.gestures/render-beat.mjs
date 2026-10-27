// The small-multiples GESTURE kit, web: the beat's `gestures` staged by the multiples family (./gesture-family-multiples.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the web
// scheduler → render → renderWeb → verify-web → `look at:`. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureMultiplesWeb } from "./GestureMultiplesWeb.tsx";
import { MULTIPLES_SPEC, multiplesPanels } from "./gesture-family-multiples.mjs";
import { runKeyedWeb } from "./gesture-keyed-run.mjs";

await runKeyedWeb({
  here: dirname(fileURLToPath(import.meta.url)),
  Component: GestureMultiplesWeb,
  spec: MULTIPLES_SPEC,
  variant: "small-multiples",
  required: ["eyebrow", "panels", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ ...multiplesPanels(beat), ceiling: Number.isFinite(beat.ceiling) ? beat.ceiling : undefined }),
  namesOf: (model) => model.panels.map((p) => p.name),
  plotOf: (model) => ({ width: 900, height: Math.max(320, Math.ceil(model.panels.length / 8) * 200) }),
});
