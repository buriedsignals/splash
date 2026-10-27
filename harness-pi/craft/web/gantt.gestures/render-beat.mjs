// The gantt GESTURE kit, web: the resting gestures drawn on the page the reader lands on, every further gesture one
// reader control (two native radios, CSS only), run by the keyed families' shared runner (./gesture-keyed-run.mjs):
// applyStoryboard → REQUIRED → the rows → check() → the gesture core (format "web", claim from STORYBOARD.md) → the
// interval web scheduler and the generated interaction declaration → renderWeb → verify-web → `look at:`.
// SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureIntervalWeb } from "./GestureIntervalWeb.tsx";
import { INTERVAL_SPEC, intervalRows } from "./gesture-family-interval.mjs";
import { runKeyedWeb } from "./gesture-keyed-run.mjs";

await runKeyedWeb({
  here: dirname(fileURLToPath(import.meta.url)),
  spec: INTERVAL_SPEC,
  Component: GestureIntervalWeb,
  variant: "gantt",
  required: ["eyebrow", "rows", "first", "last", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ rows: intervalRows(beat), first: beat.first, last: beat.last, spanLabel: typeof beat.spanLabel === "function" ? beat.spanLabel : undefined }),
  namesOf: (model) => model.rows.map((r) => r.name),
  // One row a pitch the names hold, the year axis under them.
  plotOf: (model, kit) => ({ width: 900, height: Math.max(260, model.rows.length * kit.lead("axis") * 1.5 + kit.lead("axis") * 1.6) }),
});
