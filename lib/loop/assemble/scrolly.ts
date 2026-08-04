import { fail, type VerbResult } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import { AUTHORABLE_SCROLLY_TYPES } from "../../../skills/chart-native/src/chart-story";
// The RENDERER'S OWN hosted-track lists — Scrolly.tsx dispatches on exactly these (the module is
// a leaf that imports nothing, extracted so a reader does not pull in the component tree). Read
// rather than restated: MAP_SCROLLY_TYPES is SIX types, not map-native's seven — `route` has no
// scrolly branch and was silently drawn as a choropleth until that list was written down.
import {
  CHART_SCROLLY_TYPES,
  MAP_SCROLLY_TYPES,
  MAP_TRACK_BEATS_REFUSAL,
} from "../../../skills/scrolly/src/scrolly-types";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";

/** The types the two tracks compose for the LOOP. The map half is the renderer's own list. The
 *  chart half is NARROWER than the renderer's: Scrolly.tsx also hosts a scatter, but its walk can
 *  only be DERIVED (chart-native accepts an authored beat plan for a line and a bar alone), and a
 *  narrative page whose captions the machine wrote is the exact defect the beats seam exists to
 *  remove. So a scatter scrolly is MARKED in the offer — the journalist is told before choosing
 *  that this form's captions could not be their own — rather than offered and then shipped with
 *  derived ones. Read by lib/loop/assemble/index.ts's `scrolly` entry, so the offer's mark and
 *  this assembler's refusal answer from one list. */
export const SCROLLY_TRACK_TYPES: readonly string[] = [
  ...AUTHORABLE_SCROLLY_TYPES,
  ...MAP_SCROLLY_TYPES,
];

/** WHY a type has no scrolly the loop can compose, in the journalist's words — the sentence the
 *  offer's mark and this assembler's refusal both show. Two different sentences, because they
 *  have two different fixes: a type the renderer hosts but cannot carry an authored walk for is a
 *  BYLINE problem, and a type it does not host at all is a capability that does not exist. */
export function scrollyTrackRefusal(nativeType: string): string {
  if (CHART_SCROLLY_TYPES.has(nativeType))
    return (
      `a "${nativeType}" scrolly would caption itself: Splash can draft a walk you then write ` +
      `for a ${AUTHORABLE_SCROLLY_TYPES.join(" or a ")} chart, and for no other chart type — ` +
      `the captions of a "${nativeType}" scrolly would be the machine's own, under your byline. ` +
      `Build it as a static or interactive chart, or bring the same point as a ` +
      `${AUTHORABLE_SCROLLY_TYPES.join(" or a ")}`
    );
  return (
    `nothing walks a "${nativeType}" through a scrolly: a scrolly hosts a ` +
    `${AUTHORABLE_SCROLLY_TYPES.join(" or a ")} chart, or a map ` +
    `(${[...MAP_SCROLLY_TYPES].join(", ")}) — build this one as a static or interactive ` +
    `element instead`
  );
}

/** scrolly hosts another engine's track — so this composes, it never re-derives. Duplicating
 *  either engine's rules here is what produced the two geo-prep layers the umbrella spec
 *  faults the V1 for. A chart-track config IS a chart-native NativeSpec (its nativeType is not
 *  one of MAP_SCROLLY_TYPES); a map-track config is one of the six map types the scrolly renderer
 *  hosts, dispatched by `type`.
 *  An explicit `beats` override on the map track is refused loud — that track derives its own
 *  walk from the data (deriveMapStory) and would silently ignore an authored plan.
 *
 *  A type NEITHER track owns is refused HERE as well as declined by the table, and the belt is
 *  not redundant with the braces: the table's `supports` guards the OFFER, while a brief can
 *  reach this function from a hand-authored manifest that never passed through one. Without it,
 *  a Datawrapper slug ("d3-bars") fell through to the chart track, composed a spec whose
 *  `nativeType` no mapper knows, and — because nativeSpecErrors swallows UnsupportedNativeType —
 *  passed validation and threw at BUILD instead. A refusal that names what is missing is this
 *  branch's own discipline. */
export function assembleScrolly(brief: ProductionBrief): VerbResult<unknown> {
  if (!SCROLLY_TRACK_TYPES.includes(brief.nativeType))
    return fail("invalid-request", scrollyTrackRefusal(brief.nativeType));
  const isMap = MAP_SCROLLY_TYPES.has(brief.nativeType);
  if (!isMap) return assembleChartNative(brief);
  // A CHART-SHAPED walk on the map track is still refused, in the same words. What changed with
  // sub-project ③ is that a brief beat is no longer chart-shaped by construction: a REGION
  // anchor now has a home on a map (`arcBeats`, which assembleMapNative threads and
  // ScrollyMap.tsx:223 reads), so refusing it here would refuse the journalist's own confirmed
  // walk at the door — after the loop had drafted it, routed it, and made them write every claim.
  //
  // The original rule is untouched for what it was written about: `beats` IS chart-track control
  // and a chart beat would be silently ignored by deriveMapStory. Judged on the beat's SHAPE
  // rather than on its mere presence, which is the distinction that did not exist before.
  if (brief.beats?.length && brief.beats.some((b) => b.region === undefined))
    // The wording lives with the rule (scrolly-types.ts's MAP_TRACK_BEATS_REFUSAL), not here:
    // this refusal and the producer's own spec validator are two surfaces of one rule, and a
    // journalist meeting it twice must read it once.
    return fail("invalid-request", MAP_TRACK_BEATS_REFUSAL);
  return assembleMapNative(brief);
}
