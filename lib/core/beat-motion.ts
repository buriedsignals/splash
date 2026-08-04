// Task 4 (2026-08-03 unified-beat-model): a beat's motion is checked against the engine
// that will render it, BEFORE anything is proposed.
//
// A beat's `movement`/`animation` draw from the closed vocabulary lib/core/gestures.ts
// defines, but that vocabulary is global — nothing before this stopped a beat from naming
// a gesture no producer/type/narrative-kind combination actually declares (asking
// chart-native's "pie" to `fly`, for instance: gestures.ts's own header says a chart has
// no camera at all). This function is the gate: it reads the TARGET type's own declared
// `gestures[kind]` from the registry (lib/core/registry.ts, populated by each engine's
// self-registering manifest) and refuses anything outside it.
//
// The refusal is written to be the journalist's way out, not a bare "invalid" — the
// project's own precedent (lib/brain/beats.ts's anchor refusal: `anchor "X" not found —
// valid values: a, b, c`) names the rejected value AND lists what the data (here: the
// engine) actually offers, so the next attempt has somewhere to land.
//
// ── WHY THE TARGET IS {engine, nativeType, format}, NOT {producer, type, kind} ──────────
//
// The original shape took a single `producer` string and a caller-supplied `kind`. That
// broke on the one format that matters most for sub-project ③ (scrolly): the gesture
// vocabulary for a scrolly beat is split across TWO producers BY DESIGN
// (skills/scrolly/src/manifest.ts's own header) — chart-track gestures (line/bar/scatter)
// are declared on chart-native's OWN manifest, map-track gestures (choropleth and its five
// siblings) are declared on the `scrolly` producer's. A single `producer` value cannot name
// both, so whichever one a caller resolved (the RENDER builder, `resolveBuilder` in
// lib/loop/buildable.ts — always "scrolly" once the format is "scrolly", for either track),
// one track's beats were falsely refused: `scrolly` has no `line` entry at all (its own
// `types` are the six map ids only), so a chart-track lookup through it read as "declares no
// motion", when chart-native's own manifest says otherwise for that very type.
//
// The fix takes what a run actually holds instead — `{engine, format}`, the pair
// `FormOption` carries (lib/loop/manifest.ts:150-175) — and resolves BOTH the narrative kind
// and the vocabulary-owning producer internally, the same way the established resolvers
// already keyed on (engine, nativeType, format) do (`assemblerFor`, `isLoopBuildable`,
// `heightPolicyFor`, `isRenderable` — lib/loop/assemble/index.ts, lib/loop/buildable.ts,
// lib/core/registry.ts). `nativeType` renamed from `type` to match that precedent's own
// naming, not just its shape.
import { getProducer, producerForFormat, type EngineType } from "./registry";
import type { Gesture, NarrativeKind } from "./gestures";
import type { VisualFormat } from "./vocabulary";

// The three OPTIONAL motion fields a beat may carry (lib/loop/manifest.ts's
// NarrativeBeatSchema: movement/animation/durationMs, all `.optional()` — sub-project ①
// wrote the vocabulary, ② the schema; nothing writes these fields into a real beat until
// sub-project ③, which is exactly why "no motion at all" must stay valid here).
export type BeatMotion = {
  movement?: Gesture;
  animation?: Gesture;
  durationMs?: number;
};

export type BeatMotionTarget = {
  /** Matches ProducerManifest.name in lib/core/registry.ts (e.g. "chart-native",
   *  "map-native") — the engine a beat's own spec/FormOption NAMES, never the resolved
   *  render builder (a scrolly beat's builder is always "scrolly" for both tracks; the
   *  engine is what tells the two tracks apart — see this file's header). */
  engine: string;
  /** The engine's own render-key for the type (e.g. "pie", "choropleth"). */
  nativeType: string;
  /** The pinned VisualFormat — required, not optional, because neither the narrative kind
   *  nor the vocabulary owner can be resolved without it (narrativeKindFor below). A caller
   *  holding no format yet has nothing to check a beat's motion against. */
  format: VisualFormat;
};

/**
 * `{engine, format}` → the NarrativeKind a beat's motion is judged against — the decision
 * sub-project ② owes sub-project ③ (2026-08-03 design § 4.3 follow-up): `kind` has no source
 * anywhere in a run today (no field on RunElement/FormOption/NarrativeBeat, no resolver), and
 * it is NOT a function of `format` alone: `video` resolves to `reveal` for chart-native but
 * `story` for map-native, and `reveal` doubles as chart-native's interactive-hover kind
 * (skills/chart-native/src/manifest.ts:116-117).
 *
 * Grounded per engine, not guessed:
 *   - chart-native has exactly ONE rendering architecture across static/interactive/video —
 *     a single `progress` 0→1 component, the SAME one for all three
 *     (docs/splash/gesture-inventory-2026-08-03.md §4, §4.1: "this is the same progress
 *     model as static/video — 'one master progress' is genuinely one architecture, not
 *     three"). chart-native's manifest never declares `story`/`stepped` for any type (it has
 *     no camera concept at all), so every non-scrolly chart-native format maps to `reveal`.
 *   - map-native's static/interactive formats render a DIFFERENT component family
 *     (`<Type>Map.tsx` — free pan/zoom/hover, no camera keyframes, no beat structure) than
 *     its `video` format (the Story/Reveal/Scrolly Remotion families, gesture-inventory §1-3)
 *     — none of the four NarrativeKinds describe the former, so it resolves to `undefined`
 *     (see `beatMotionErrors`'s handling below: no kind means no motion is ever declared for
 *     it, not "unknown, do not judge" — the same refuse-loud posture the file already takes
 *     for an undeclared type). `video` resolves to `story` — the CLI's own no-choice default
 *     for every type but route (`defaultCameraMode`,
 *     skills/map-native/scripts/lib/story-comps.mjs) and "the documented preference for most
 *     articles" per that file's own comment. A per-spec `cameraMode: "simple"` override
 *     renders the `reveal` family instead; that override is not visible at (engine, format)
 *     alone, so it is OUT OF THIS RESOLVER'S REACH until a future caller threads it through —
 *     recorded here, not silently guessed at.
 *   - `scrolly` is unconditional on `format` alone for every engine: the browser-reader kind
 *     is what the format IS, regardless of which track hosts it.
 *   - dw-chart, map-dw: gesture-inventory §8's own summary table has "—" in every one of the
 *     three kind columns for both — neither ever declares a `story`/`stepped`/`reveal` family,
 *     so no kind applies; `undefined`, the same "no motion, ever" reading as map-native's
 *     static/interactive above (and their manifests' `types` declare no `gestures` at all
 *     regardless, so the eventual refusal reads the same either way).
 *   - image-native ships `scrolly` only in v1 (format-support.ts) — the `scrolly` branch
 *     above already answers it; a static/video request (unreachable today) falls through to
 *     `undefined`, honestly, since no such renderer exists yet.
 */
export function narrativeKindFor(
  engine: string,
  format: VisualFormat,
): NarrativeKind | undefined {
  if (format === "scrolly") return "scrolly";
  if (engine === "chart-native") return "reveal";
  if (engine === "map-native" && format === "video") return "story";
  return undefined;
}

/**
 * Which producer's manifest actually declares `nativeType`'s gesture vocabulary — the other
 * half of the split this file's header describes. Tries the RENDER builder first
 * (`producerForFormat`, the same resolution `lib/loop/buildable.ts`'s `resolveBuilder` uses),
 * because that is where the map track's own `scrolly` vocabulary lives (`skills/scrolly`'s
 * manifest declares its six map types itself, deliberately — see that manifest's own header
 * on why map-native does NOT also declare a `scrolly` key, to avoid recreating the
 * `scrolly`/`stepped` name collision one level down). Falls back to the engine's OWN manifest
 * when the builder does not own that type at all — the chart track's case: `scrolly` (the
 * builder for format `"scrolly"`) owns no `line`/`bar`/`scatter` type whatsoever, so chart
 * gestures stay exactly where they have always been declared, on chart-native's own manifest,
 * under that manifest's own `scrolly` key.
 *
 * For every non-scrolly format the builder IS the engine (`producerForFormat` returns the
 * engine itself whenever its own manifest declares that format), so the fallback is inert
 * there — one producer, found directly, same as before this rewrite.
 */
function vocabularyOwner(
  engine: string,
  nativeType: string,
  format: VisualFormat,
): { producerName: string; type: EngineType | undefined } {
  const builderName = producerForFormat(engine, format);
  const builderType = getProducer(builderName)?.types?.find(
    (t) => t.id === nativeType,
  );
  if (builderType) return { producerName: builderName, type: builderType };
  if (builderName !== engine) {
    const ownType = getProducer(engine)?.types?.find(
      (t) => t.id === nativeType,
    );
    if (ownType) return { producerName: engine, type: ownType };
  }
  // Unregistered producer, or a type neither the builder nor the engine declares — the
  // caller reads this as "no motion", the same posture the file already takes for a type
  // it cannot find at all.
  return { producerName: builderName, type: undefined };
}

/**
 * Errors only, empty when valid. Sub-project ③ calls this before proposing a beat's motion.
 *
 * An engine/type that is unregistered, or that declares nothing for the resolved kind, reads
 * as "this type makes nothing move here" rather than "unknown, do not judge" — see
 * `vocabularyOwner` above and the file-level comment on `declared` below for why that is the
 * deliberate reading, not a shortcut.
 */
export function beatMotionErrors(
  beat: BeatMotion,
  target: BeatMotionTarget,
): string[] {
  const errors: string[] = [];
  const kind = narrativeKindFor(target.engine, target.format);
  const { producerName, type } = vocabularyOwner(
    target.engine,
    target.nativeType,
    target.format,
  );

  // dw-chart and map-dw declare NO gestures on ANY type, on purpose (their own manifests
  // say so inline: they delegate rendering to Datawrapper and own no motion of their
  // own). That is not a special case handled here — it falls out of the same lookup as
  // every other type: `gestures[kind]` is absent, so `declared` is empty, so any
  // movement/animation asked of them is refused exactly like an undeclared gesture on a
  // type that DOES render its own frame. Refusing every motion was chosen over silently
  // waving unregistered/undeclared engines through as "unknown, do not judge": a beat
  // aimed at a hosted embed asking for movement is asking for something no component will
  // ever draw, and a gate that cannot fail there is the same defect the brief's "paint
  // call exists" trap already names — it must say so as loudly as the declared case.
  const declared: readonly Gesture[] = (kind && type?.gestures?.[kind]) ?? [];

  const fields: readonly ["movement" | "animation", Gesture | undefined][] = [
    ["movement", beat.movement],
    ["animation", beat.animation],
  ];
  for (const [field, value] of fields) {
    if (value == null) continue;
    if (!declared.includes(value)) {
      errors.push(
        kind
          ? `${field} "${value}" is not something ${producerName}'s "${target.nativeType}" makes ` +
              `move on "${kind}" — ` +
              (declared.length
                ? `it declares: ${declared.join(", ")}`
                : `it declares no motion at all for "${kind}"`)
          : `${field} "${value}" is not something ${producerName}'s "${target.nativeType}" makes ` +
              `move at all — the "${target.format}" format has no narrative kind for it (no ` +
              `camera, no beat, no reader-driven step) to draw motion from`,
      );
    }
  }

  // A scrolly is advanced by the READER's scroll position, not a clock (gestures.ts's own
  // definition of the `scrolly` narrative kind: "the READER advances it"). `durationMs` is
  // meaningless there regardless of what the target type declares, so this check does not
  // consult `declared` at all.
  if (beat.durationMs != null && kind === "scrolly") {
    errors.push(
      `durationMs is not allowed on a scrolly beat — the reader advances it, not time`,
    );
  }

  return errors;
}
