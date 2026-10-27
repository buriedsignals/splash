// The sankey GESTURE kit, web: the beat's `gestures` staged by the flow family (./gesture-family-flow.mjs) and run by the
// keyed families' shared runner (./gesture-keyed-run.mjs) — applyStoryboard → REQUIRED → the family's model (the
// data's shape adapted to, never refused) → check() → the gesture core (claim from STORYBOARD.md) → the web
// scheduler → render → renderWeb → verify-web → `look at:`. SPLASH_GESTURE_REPAIR=1 applies each refusal's fix. Copied into the beat; never edited.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GestureFlowWeb } from "./GestureFlowWeb.tsx";
import { FLOW_SPEC, flowModel } from "./gesture-family-flow.mjs";
import { runKeyedWeb } from "./gesture-keyed-run.mjs";

await runKeyedWeb({
  here: dirname(fileURLToPath(import.meta.url)),
  Component: GestureFlowWeb,
  spec: FLOW_SPEC,
  variant: "sankey",
  required: ["eyebrow", "flows", "gestures", "title", "limits", "source", "alt", "check"],
  modelOf: (beat) => flowModel(beat),
  namesOf: (model) => [...model.left, ...model.right],
  plotOf: () => ({ width: 900, height: 560 }),
});
