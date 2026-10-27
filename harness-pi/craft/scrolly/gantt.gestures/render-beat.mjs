// The gantt GESTURE kit, scrolly: one card per gesture, the scroll interpolating continuously between their states,
// then a closing card carrying the limits, run by the keyed families' shared runner (./gesture-keyed-run.mjs):
// applyStoryboard → REQUIRED → the rows → check() → the gesture core (format "scrolly", claim from STORYBOARD.md) →
// the interval scrolly scheduler and every card's words → renderScrolly → verify-scrolly → one screenshot per card.
// SPLASH_GESTURE_REPAIR=1 applies each refusal's fix (a card's words included). Copied into the beat.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureIntervalScrolly } from "./GestureIntervalScrolly.tsx";
import { INTERVAL_SPEC, intervalRows } from "./gesture-family-interval.mjs";
import { runKeyedScrolly } from "./gesture-keyed-run.mjs";

await runKeyedScrolly({
  here: dirname(fileURLToPath(import.meta.url)),
  spec: INTERVAL_SPEC,
  Component: GestureIntervalScrolly,
  variant: "gantt",
  required: ["eyebrow", "rows", "first", "last", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ rows: intervalRows(beat), first: beat.first, last: beat.last, spanLabel: typeof beat.spanLabel === "function" ? beat.spanLabel : undefined }),
  namesOf: (model) => model.rows.map((r) => r.name),
  plotOf: (model, kit) => ({ width: 900, height: Math.max(300, model.rows.length * kit.lead("axis") * 1.5 + kit.lead("axis") * 1.6) }),
});
