import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import type { SourceKind } from "../../source";
import { chosenOption, type RunManifest, type RunElement } from "../manifest";
// The engine's own list of the types that can carry an arc — read, never retyped, so this
// projection and skills/map-native cannot come to disagree about what a map is.
import { ARC_CAPABLE_MAP_TYPES } from "../../../skills/map-native/src/map-arc";

const MAP_NATIVE_TYPES = new Set<string>(ARC_CAPABLE_MAP_TYPES);

function beatsFor(el: RunElement): BriefBeat[] {
  // WHICH TRACK this element will be rendered by, read from the chosen type rather than from the
  // engine name — the same discriminator assembleMapNative itself gates on (MAP_NATIVE_TYPES),
  // so the projection and the assembler cannot come to disagree about what a map is.
  const onMapTrack = MAP_NATIVE_TYPES.has(chosenOption(el)?.nativeType ?? "");
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
    // THE MAP TRACK, opened by sub-project ③. A `region` anchor now has a field to become —
    // but ONLY on a map element. On a chart element the original refusal stands word for word:
    // there is still no correct chart field for it, and guessing `category` is the silent drift
    // this refusal was written to prevent.
    if (b.anchor.kind === "region" && onMapTrack)
      return {
        region: b.anchor.value,
        role: b.role,
        text: b.text,
        // The camera decision travels WITH its beat — sub-project ④(c). Spread rather than
        // assigned so a beat that says nothing produces a brief beat byte-identical to the one
        // this projection produced before the field existed.
        ...(b.movement ? { movement: b.movement } : {}),
      };
    if (b.anchor.kind === "region" || b.anchor.kind === "place")
      throw new Error(
        `beatsFor: a "${b.anchor.kind}" anchor has no ${onMapTrack ? "map" : "chart"}-track ` +
          `field to become — a "${b.anchor.kind}" beat belongs on ` +
          (onMapTrack
            ? // `place` is hex-grid's anchor, and hex-grid is deliberately out of ③'s reach:
              // its cell has no name until the binning runs, so nothing can draft one.
              `no track this loop can assemble — hex-grid's arcBeats are written directly`
            : `the map track, not this brief`),
      );
    // A CHART anchor on a map element is the mirror defect, and it was previously unreachable:
    // nothing could put a map beat on a brief at all. Now that something can, the wrong-way
    // mismatch has to refuse too, or a chart `x` would silently arrive at a map assembler that
    // reads `region` and find nothing there.
    if (onMapTrack)
      throw new Error(
        `beatsFor: a "${b.anchor.kind}" anchor is a chart-track anchor, and this element ` +
          `renders on the map track — a map beat anchors on a "region"`,
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
