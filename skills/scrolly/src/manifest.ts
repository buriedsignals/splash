// scrolly's producer manifest — self-registers with the shared registry on import.
// scrolly rides its host engine's own render path and does not consume a channel today, so
// threadsChannel is false (matching adapters.ts's CHANNEL_THREADED_PRODUCERS exclusion).
//
// validate mirrors validate-gate.ts's `validateScrolly` (errors-only): a chart-track config
// carries `nativeType` and IS a chart-native NativeSpec (validate by construction + any
// explicit journalist beat plan); a map-track config is one of the map-native family
// (dispatch by `type`). An explicit `beats` override on the map track is rejected loud (the
// map track derives its own story and would silently ignore it). The engine-owned validators
// are imported directly — scrolly's validation is inherently cross-engine (chart + map
// tracks), so it composes chart-native's and map-native's own checks, never the orchestrator's.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import {
  nativeSpecErrors,
  type NativeSpec,
} from "../../chart-native/src/spec-to-config";
import { narrativeBeatErrors } from "../../chart-native/src/chart-story";
import { mapNativeConfigErrors } from "../../map-native/src/validate-config";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function scrollySpecErrors(spec: unknown): string[] {
  const hasNativeType =
    typeof (spec as { nativeType?: unknown } | null)?.nativeType === "string";
  if (hasNativeType) {
    // Chart track: validate by construction, plus any explicit beat plan against the data.
    return [
      ...nativeSpecErrors(spec),
      ...narrativeBeatErrors(spec as NativeSpec),
    ];
  }
  // Map track: an explicit `beats` override is chart-track-only control — reject it loud.
  if ((spec as { beats?: unknown } | null)?.beats !== undefined) {
    return [
      "explicit `beats` override is not supported on the map scrolly track " +
        "(chart-track line/bar narrative control only) — remove it; map scrolly " +
        "steps are derived from the data (deriveMapStory)",
    ];
  }
  return mapNativeConfigErrors(spec);
}

registerProducer({
  name: "scrolly",
  formats: ["scrolly"],
  // No `types`: scrolly is the shared MECHANISM, not a type owner — the scrolly sub-format
  // belongs to the host engine and inherits its furniture (see CLAUDE.md, engine taxonomy).
  validate: scrollySpecErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // scrolly does not read a channel today — no SPLASH_CHANNEL is threaded.
    threadsChannel: false,
  },
});
