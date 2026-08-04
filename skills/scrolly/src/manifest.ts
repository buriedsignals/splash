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
import type { GestureVocabulary } from "../../../lib/core/gestures";
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

// What each browser-scrolly MAP type makes move — measured from each Scrolly*Map.tsx
// component's own code (skills/scrolly/src/, this package), never from a header. A prior
// draft of this manifest trusted a *Scrolly.tsx header instead of reading paint calls and
// declared a gesture nothing performed (ChoroplethScrolly.tsx:1-4 — map-native's DIFFERENT,
// video-family component of a similar name; the confusion that mistake reveals is exactly
// why this manifest, not map-native's, owns this table — see the resolution below).
//
// Every type gets `fly`: scrolly-camera.ts's `flyToBeat` (:54-71) is the ONE camera
// primitive every Scrolly*Map component calls on every step (MapLibre `flyTo`, or
// `jumpTo` only under prefers-reduced-motion — an accessibility substitution, not a
// second declared gesture). The one-time `map.jumpTo` each component calls at MOUNT (e.g.
// ScrollyMap.tsx:394-402) sets the STARTING position before any step is read, not a
// between-step reposition — not declared `jump` here; `jump` names map-native's own
// between-beat primitive (its manifest), a different thing this package's code never does.
//
// `highlight` (siblings pinned to a constant, the emphasised subject pinned to a DIFFERENT
// constant, NEITHER one ramping — gestures.ts's own exclusion) is declared on the five
// types whose per-step effect writes a MapLibre `case` expression toggling between two
// constants: choropleth (ScrollyMap.tsx:340-345, stroke-width 0 / 2.5), cartogram
// (ScrollyCartogramMap.tsx:271-277, fill-opacity 0.2 / 0.9), hex-grid
// (ScrollyHexMap.tsx:238-249, fill-opacity 0.2 / 0.9), dot-density
// (ScrollyDotDensityMap.tsx:294-311, circle-/stroke-opacity 0.25 / 1), locator
// (ScrollyLocatorMap.tsx:262-303, circle-/stroke-/text-opacity, three properties, the same
// case shape). symbol (ScrollySymbolMap.tsx) has NO such mechanism — its own header says
// so ("Circles render at FULL size (no progress reveal — the scroll reveal is the camera
// flight)"), confirmed by reading the code: its currentStep effect (:242-254) calls ONLY
// flyToBeat, no setPaintProperty of any kind — `fly` alone.
//
// route has no browser-scrolly host at all (MAP_SCROLLY_TYPES excludes it,
// scrolly-types.ts — refused by name in scrollySpecErrors above) — omitted, not declared
// with an empty vocabulary.
const MAP_SCROLLY_GESTURES: Record<string, GestureVocabulary> = {
  choropleth: { scrolly: ["fly", "highlight"] },
  cartogram: { scrolly: ["fly", "highlight"] },
  "hex-grid": { scrolly: ["fly", "highlight"] },
  "dot-density": { scrolly: ["fly", "highlight"] },
  locator: { scrolly: ["fly", "highlight"] },
  symbol: { scrolly: ["fly"] },
};

registerProducer({
  name: "scrolly",
  formats: ["scrolly"],
  // `types`: exactly the SIX map-track types this package's own Scrolly*Map.tsx family
  // hosts (MAP_SCROLLY_TYPES, scrolly-types.ts — route excluded). The CHART track
  // (line/bar/scatter, rendered by this package's own ScrollyChart.tsx) is deliberately
  // NOT declared here — unchanged from before, still on chart-native's manifest, under
  // those types' own `scrolly` key. A prior version of this comment and chart-native's
  // own manifest each pointed at the OTHER as the declaring side for THAT vocabulary — a
  // circular buck-pass fixed by making chart-native the owner (the only manifest that has
  // `line`/`bar`/`scatter` as types at all).
  //
  // MAPS are declared HERE instead, on this producer, not by the same "owning-type-
  // manifest" reasoning — asymmetric on purpose. `scrolly` (2026-08-03: the browser-reader
  // kind, see lib/core/gestures.ts's NARRATIVE_KINDS) used to collide with map-native's
  // OWN video-timeline family, which lived under the SAME key name in the SAME per-type
  // objects (skills/map-native/src/manifest.ts's CHOROPLETH_GESTURES etc.). That family is
  // now `stepped` — the word collision at the NarrativeKind level is fixed — but map-native
  // declaring a `scrolly` key ALONGSIDE its own `stepped` key, on the very type objects
  // whose `*Scrolly.tsx` component IS the `stepped` family, would recreate the same
  // confusion one level down: a reader skimming `{ story, stepped, scrolly, reveal }` on
  // CHOROPLETH_GESTURES has no way to tell, without reading map-native's code, that
  // `scrolly` there names a component that lives in a DIFFERENT package (this one) — the
  // engine that does not implement the browser product would be the one claiming it.
  // map-native's manifest pins this: it never declares a `scrolly` key, only `stepped`
  // (see its header comment, and gesture-declaration-drift.test.ts's mutation-verified
  // guard). This package is the one whose OWN code (Scrolly*Map.tsx, MAP_SCROLLY_GESTURES
  // above) implements the browser product, so it is the one that can honestly declare it —
  // resolving the prior open gap ("the vocabulary for THIS reachable browser family,
  // including `fly`, has no home") without reintroducing the collision it came from.
  //
  // Both manifests' comments agree on this split now — neither claims the other declares
  // it while actually declaring nothing (the circular buck-pass a prior review found).
  //
  // image-native's crossfade is likewise declared on image-native's manifest even though
  // the renderer (ScrollyImage.tsx) lives in this package — that case has no ambiguity:
  // image-native owns exactly one narrative kind (`scrolly`) and one product, with no
  // competing family of its own to collide with.
  types: [...MAP_SCROLLY_TYPES].map((id) => ({
    id,
    gestures: MAP_SCROLLY_GESTURES[id],
  })),
  validate: scrollySpecErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // scrolly does not read a channel today — no SPLASH_CHANNEL is threaded.
    threadsChannel: false,
  },
});
