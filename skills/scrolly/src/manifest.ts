// scrolly's producer manifest — self-registers with the shared registry on import.
// scrolly rides its host engine's own render path and does not consume a channel today, so
// threadsChannel is false (matching adapters.ts's CHANNEL_THREADED_PRODUCERS exclusion).
//
// validate mirrors validate-gate.ts's `validateScrolly` (errors-only): a chart-track config
// carries `nativeType` and IS a chart-native NativeSpec (validate by construction + any
// explicit journalist beat plan); a map-track config is one of the map-native family
// (dispatch by `type`). An explicit `beats` override on the map track is rejected loud (the
// map track derives its own story and would silently ignore it). The engine-owned validators
// are imported directly — scrolly's validation is inherently cross-engine (chart + map +
// image tracks), so it composes chart-native's, map-native's, and image-native's own checks,
// never the orchestrator's.
//
// The image track is checked BEFORE the map fall-through (mirrors chapters.ts's
// resolveVisual dispatch, `visual === "image"` wins first). It is NOT covered by
// validate-gate.ts's validateScrolly — the orchestrator dispatches an image proposal to
// image-native's OWN validateImageNative, keyed on engine name, never through this
// function — because the wrapped `{visual:"image", story, framesDir, ...}` shape this CLI
// receives is assembled and invoked directly by image-native's own produce.mjs
// (skills/image-native/scripts/produce.mjs:59-73), bypassing the orchestrator entirely.
// Before this branch existed, an image-track config had neither `nativeType` nor a map
// `type`, so it fell through to `mapNativeConfigErrors` and was validated as a choropleth —
// always refused (measured live: "regionKey must be a non-empty string", etc.), which
// killed every image-scrolly run at this CLI regardless of how well-formed the story was.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import {
  nativeSpecErrors,
  type NativeSpec,
} from "../../chart-native/src/spec-to-config";
import { narrativeBeatErrors } from "../../chart-native/src/chart-story";
import { mapNativeConfigErrors } from "../../map-native/src/validate-config";
import {
  checkImageConformance,
  type ImageStory,
} from "../../image-native/src/image-story";
import { MAP_TRACK_BEATS_REFUSAL } from "./scrolly-types";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function scrollySpecErrors(spec: unknown): string[] {
  const visual = (spec as { visual?: unknown } | null)?.visual;
  if (visual === "image") {
    // image-native's own render-free conformance, on the nested story it assembled — the
    // same function and the same format floor (3-6 frames) image-native's produce.mjs
    // already ran before invoking this CLI. Re-checking here closes the gap for any caller
    // that reaches this CLI (or this validator, via the producer registry) without going
    // through image-native's produce.mjs first.
    const story = (spec as { story?: unknown } | null)?.story;
    // checkImageConformance assumes an object (it reads story.title etc. unguarded) — a
    // config missing `story` entirely must still return a violation, never throw past this
    // errors-only contract.
    if (story === null || typeof story !== "object")
      return ["missing story — an image-track scrolly config needs `story`"];
    return checkImageConformance(story as ImageStory, { format: "scrolly" });
  }
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
    // One wording, shared with the loop's assembler — see MAP_TRACK_BEATS_REFUSAL.
    return [MAP_TRACK_BEATS_REFUSAL];
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
