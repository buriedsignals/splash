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
import { allProducers } from "./registry";
import type { Gesture, NarrativeKind } from "./gestures";

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
  /** Matches ProducerManifest.name in lib/core/registry.ts (e.g. "chart-native"). */
  producer: string;
  /** The engine's own render-key for the type (e.g. "pie", "choropleth"). */
  type: string;
  kind: NarrativeKind;
};

/**
 * Errors only, empty when valid. Sub-project ③ calls this before proposing a beat's motion.
 *
 * An engine/type that is unregistered, or that declares nothing for `kind`, reads as "this
 * type makes nothing move here" rather than "unknown, do not judge" — see the file-level
 * comment on `declared` below for why that is the deliberate reading, not a shortcut.
 */
export function beatMotionErrors(
  beat: BeatMotion,
  target: BeatMotionTarget,
): string[] {
  const errors: string[] = [];
  const producer = allProducers().find((p) => p.name === target.producer);
  const type = producer?.types?.find((t) => t.id === target.type);

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
  const declared: readonly Gesture[] = type?.gestures?.[target.kind] ?? [];

  const fields: readonly ["movement" | "animation", Gesture | undefined][] = [
    ["movement", beat.movement],
    ["animation", beat.animation],
  ];
  for (const [field, value] of fields) {
    if (value == null) continue;
    if (!declared.includes(value)) {
      errors.push(
        `${field} "${value}" is not something ${target.producer}'s "${target.type}" makes ` +
          `move on "${target.kind}" — ` +
          (declared.length
            ? `it declares: ${declared.join(", ")}`
            : `it declares no motion at all for "${target.kind}"`),
      );
    }
  }

  // A scrolly is advanced by the READER's scroll position, not a clock (gestures.ts's own
  // definition of the `scrolly` narrative kind: "the READER advances it"). `durationMs` is
  // meaningless there regardless of what the target type declares, so this check does not
  // consult `declared` at all.
  if (beat.durationMs != null && target.kind === "scrolly") {
    errors.push(
      `durationMs is not allowed on a scrolly beat — the reader advances it, not time`,
    );
  }

  return errors;
}
