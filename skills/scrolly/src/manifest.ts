// scrolly's producer manifest — self-registers with the shared registry on import.
// scrolly rides its host engine's own render path and does not consume a channel today, so
// threadsChannel is false (matching adapters.ts's CHANNEL_THREADED_PRODUCERS exclusion).
//
// validate mirrors validate-gate.ts's `validateScrolly` (errors-only): a chart-track config
// carries `nativeType` and IS a chart-native NativeSpec (validate by construction + any
// explicit journalist beat plan); a map-track config is one of the SIX types MAP_SCROLLY_TYPES
// hosts (dispatch by `type`) — a seventh, "route", is refused BY NAME before any content
// validation runs, the same refusal validate-gate.ts's gate and the V2 assembler
// (lib/loop/assemble/scrolly.ts) already apply, sharing one wording
// (unsupportedMapScrollyType). An explicit `beats` override on the map track is rejected loud
// (the map track derives its own story and would silently ignore it). The engine-owned
// validators are imported directly — scrolly's validation is inherently cross-engine (chart +
// map + image tracks), so it composes chart-native's, map-native's, and image-native's own
// checks, never the orchestrator's.
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
import {
  MAP_SCROLLY_TYPES,
  MAP_TRACK_BEATS_REFUSAL,
  unsupportedMapScrollyType,
} from "./scrolly-types";

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
  // Map track: a type MAP_SCROLLY_TYPES does not host (today: "route" — arc-capable at
  // map-native's own gate, but never given a Scrolly.tsx branch) is refused HERE, by
  // name, before any content validation. Fix E1: this check was missing — a well-formed
  // route+arcBeats config fell straight through to mapNativeConfigErrors, whose
  // validateRouteConfig accepts arcBeats structurally (route IS in ARC_CAPABLE_MAP_TYPES),
  // so this function returned zero errors for a spec validate-gate.ts and the V2 assembler
  // both already refuse — contradicting this file's own produce.mjs's comment that "the
  // CLI and the spine refuse identically". One wording, shared with validate-gate.ts's
  // validateScrolly — see unsupportedMapScrollyType.
  const mapType = (spec as { type?: string } | null)?.type ?? "choropleth";
  if (!MAP_SCROLLY_TYPES.has(mapType)) {
    return [
      unsupportedMapScrollyType(
        mapType,
        (spec as { arcBeats?: unknown } | null)?.arcBeats !== undefined,
      ),
    ];
  }
  // An explicit `beats` override is chart-track-only control — reject it loud.
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
  // Same rule for the gesture vocabulary (2026-08-03 gesture-vocabulary plan, Task 4): the
  // chart/map track's gestures are declared on chart-native's and map-native's own
  // manifests (their `scrolly` narrative kind), not here — scrolly renders them, it does
  // not own them. image-native's crossfade is likewise declared on image-native's manifest
  // even though the renderer (ScrollyImage.tsx) lives in this package.
  validate: scrollySpecErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // scrolly does not read a channel today — no SPLASH_CHANNEL is threaded.
    threadsChannel: false,
  },
});
