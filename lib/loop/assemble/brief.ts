import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import type { SourceKind } from "../../source";
import { chosenOption, type RunManifest, type RunElement } from "../manifest";

function beatsFor(el: RunElement): BriefBeat[] {
  return (el.narrative?.beats ?? []).map((b) => {
    // BriefBeat carries exactly two anchor fields — `x` (a line's axis value) and
    // `category` (a bar's category) — the two kinds the unified anchor had before this
    // branch widened it (feat/unified-beat-model, "region"/"place" for a map). This
    // branch made the wider kinds EXPRESSIBLE on a beat (lib/loop/manifest.ts's
    // NarrativeBeatSchema) without making them REACHABLE (suggestBeats still only ever
    // emits "x"/"category" — lib/brain/beats.ts's own comment on BeatAnchor) — but
    // sub-project ③ is exactly what makes them reachable, and a binary
    // `kind === "x" ? {x} : {category}` would then silently mislabel a region/place
    // anchor as a chart `category`, the exact class of silent drift this codebase has
    // already paid for once (the scrolly→stepped rename). BriefBeat has no field for
    // either kind regardless, so there is no correct mapping to fall back on — refuse
    // loud instead of guessing.
    if (b.anchor.kind === "region" || b.anchor.kind === "place")
      throw new Error(
        `beatsFor: a "${b.anchor.kind}" anchor has no chart-track field to become — ` +
          `BriefBeat only carries "x"/"category" (chart-native's own anchors); a ` +
          `"${b.anchor.kind}" beat belongs on the map track, not this brief`,
      );
    return {
      ...(b.anchor.kind === "x"
        ? { x: b.anchor.value }
        : { category: b.anchor.value }),
      role: b.role,
      text: b.text,
    };
  });
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
  sourceKind?: SourceKind,
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
    ...(sourceKind ? { sourceKind } : {}),
    ...(el.narrative ? { beats: beatsFor(el) } : {}),
    ...(run.orient?.geo ? { geo: run.orient.geo } : {}),
    ...(run.input.images ? { images: run.input.images } : {}),
    ...(run.lang ? { lang: run.lang } : {}),
  };
}
