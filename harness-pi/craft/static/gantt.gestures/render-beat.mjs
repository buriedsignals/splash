// The gantt GESTURE kit, static: the per-type kit's runner (static/gantt/render-beat.mjs) with its fixed staging
// replaced by the beat's `gestures`, run by the keyed families' shared runner (./gesture-keyed-run.mjs): applyStoryboard
// → REQUIRED → the rows (runs clipped to the axis, never refused for their shape) → check() → the gesture core (claim
// from STORYBOARD.md) → the interval scheduler → one still plate → `look at:`. SPLASH_GESTURE_REPAIR=1 applies each
// refusal's fix. Everything about THIS story lives in ./beat.mjs. Copied into the beat; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureIntervalStatic } from "./GestureIntervalStatic.tsx";
import { INTERVAL_SPEC, intervalRows } from "./gesture-family-interval.mjs";
import { runKeyedStatic } from "./gesture-keyed-run.mjs";

await runKeyedStatic({
  here: dirname(fileURLToPath(import.meta.url)),
  spec: INTERVAL_SPEC,
  Component: GestureIntervalStatic,
  variant: "gantt",
  required: ["eyebrow", "rows", "first", "last", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => ({ rows: intervalRows(beat), first: beat.first, last: beat.last, spanLabel: typeof beat.spanLabel === "function" ? beat.spanLabel : undefined }),
  namesOf: (model) => model.rows.map((r) => r.name),
});
