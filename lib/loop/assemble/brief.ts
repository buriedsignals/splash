import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import { chosenOption, type RunManifest, type RunElement } from "../manifest";

function beatsFor(el: RunElement): BriefBeat[] {
  return (el.narrative?.beats ?? []).map((b) => ({
    ...(b.anchor.kind === "x"
      ? { x: b.anchor.value }
      : { category: b.anchor.value }),
    role: b.role,
    text: b.text,
  }));
}

/**
 * The manifest element, flattened into the payload an assembler is allowed to see.
 *
 * Composed AFTER every gate of produce() (declared source, authored beats, pinned format,
 * resolved channel), so an assembler re-validates nothing — it translates.
 *
 * The angle's parts fall back to "" rather than refusing, exactly as assembleNativeSpec did:
 * produce() has already required an angle, and a second refusal here would be a second place
 * to keep in step. A caller reaching it without one gets a spec the engine's own validator
 * rejects (a blank title fails hard at conformance) — loud, not silent.
 */
export function briefFor(
  run: RunManifest,
  el: RunElement,
  dataCsv: string,
  attribution: string,
  sourceUrl: string | undefined,
  format: VisualFormat,
): ProductionBrief {
  const chosen = chosenOption(el);
  return {
    elementId: el.id,
    nativeType: chosen?.nativeType ?? "",
    format,
    angle: {
      confirmedTakeaway: el.angle?.confirmedTakeaway ?? "",
      altInsight: el.angle?.altInsight ?? "",
      ...(el.angle?.unit ? { unit: el.angle.unit } : {}),
      ...(el.angle?.emphasis ? { emphasis: el.angle.emphasis } : {}),
    },
    dataCsv,
    attribution,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(el.narrative ? { beats: beatsFor(el) } : {}),
    ...(run.orient?.geo ? { geo: run.orient.geo } : {}),
  };
}
