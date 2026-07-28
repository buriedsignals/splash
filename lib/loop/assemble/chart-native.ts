import { ok } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import type { VerbResult } from "../../core/verbs";

/**
 * The manifest element, as the engine's spec. `beats` is only present when the element carries
 * a narrative plan. Absent for every embeddable element, so a spec built for one is byte-identical
 * to what it was before this seam existed.
 *
 * The angle's parts fall back to "" rather than refusing, because produce() has already required
 * an angle by the time it calls this and a second refusal here would be a second place to keep
 * in step. A caller reaching it without one gets a spec the engine's own validator rejects
 * (a blank title and a blank altInsight both fail-hard at conformance) — loud, not silent.
 */
export function assembleChartNative(
  brief: ProductionBrief,
): VerbResult<unknown> {
  return ok({
    nativeType: brief.nativeType,
    title: brief.angle.confirmedTakeaway,
    altInsight: brief.angle.altInsight,
    unit: brief.angle.unit ?? "",
    source: {
      name: brief.attribution,
      ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
    },
    // WHAT the figures are, alongside WHO to credit. The engine's conformance belt reads it
    // (chart-native's specToNativeConfig threads it onto the config's source object, and
    // conformanceL0 then applies the requirements row instead of the flat "name required, url
    // optional" rule). Omitted when absent, so a brief with no class assembles a byte-identical
    // spec.
    ...(brief.sourceKind ? { sourceKind: brief.sourceKind } : {}),
    ...(brief.angle.emphasis ? { highlight: brief.angle.emphasis } : {}),
    ...(brief.format ? { format: brief.format } : {}),
    data: brief.dataCsv,
    ...(brief.beats ? { beats: brief.beats } : {}),
  });
}
