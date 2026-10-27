// The small-multiples GESTURE kit, scrolly: the beat's `gestures` staged by the multiples family (./gesture-family-multiples.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the scrolly
// scheduler → render → renderScrolly → verify-scrolly → one screenshot per card. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureMultiplesScrolly } from "./GestureMultiplesScrolly.tsx";
import { MULTIPLES_SPEC, multiplesPanels } from "./gesture-family-multiples.mjs";
import { runKeyedScrolly } from "./gesture-keyed-run.mjs";

await runKeyedScrolly({
  here: dirname(fileURLToPath(import.meta.url)),
  Component: GestureMultiplesScrolly,
  spec: MULTIPLES_SPEC,
  variant: "small-multiples",
  required: ["eyebrow", "panels", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ ...multiplesPanels(beat), ceiling: Number.isFinite(beat.ceiling) ? beat.ceiling : undefined }),
  namesOf: (model) => model.panels.map((p) => p.name),
  plotOf: (model) => ({ width: 900, height: Math.max(320, Math.ceil(model.panels.length / 8) * 200) }),
});
