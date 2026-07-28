import { fail, type VerbResult } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import { MAP_TYPES } from "../../../skills/map-native/src/map-types";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";

/** scrolly hosts another engine's track — so this composes, it never re-derives. Duplicating
 *  either engine's rules here is what produced the two geo-prep layers the umbrella spec
 *  faults the V1 for. A chart-track config IS a chart-native NativeSpec (nativeType is not one
 *  of MAP_TYPES); a map-track config is one of map-native's seven types, dispatched by `type`.
 *  An explicit `beats` override on the map track is refused loud — that track derives its own
 *  walk from the data (deriveMapStory) and would silently ignore an authored plan. */
export function assembleScrolly(brief: ProductionBrief): VerbResult<unknown> {
  const isMap = (MAP_TYPES as readonly string[]).includes(brief.nativeType);
  if (!isMap) return assembleChartNative(brief);
  if (brief.beats?.length)
    return fail(
      "invalid-request",
      "a map scrolly derives its own walk from the data — an authored beat plan belongs to " +
        "a chart scrolly, so this walk cannot be published as written",
    );
  return assembleMapNative(brief);
}
