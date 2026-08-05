// What map-native's rendered forms CANNOT do, measured. Registered from the manifest, so the
// fact lives with the engine (see lib/core/feature-reach.ts's header for the maintenance rule:
// THIS LIST MUST SHRINK, and only a green render measurement removes an entry).
import {
  registerFeatureLimits,
  type FeatureLimit,
} from "../../../lib/core/feature-reach";
import type { VisualFormat } from "../../../lib/core/vocabulary";
import { SYMBOL_LABELS_INTERACTIVE } from "../../../lib/core/limit-sentences";

/** The one wording for "an interactive symbol map does not label its circles" — exported so
 *  map-dw's refusal QUOTES it instead of asserting a top-N nothing implements. */
export { SYMBOL_LABELS_INTERACTIVE } from "../../../lib/core/limit-sentences";

const KEYBOARD: FeatureLimit = {
  feature: "keyboard",
  sentence:
    "this interactive map will not be keyboard-navigable: its marks are drawn in a WebGL " +
    "canvas, so there is no element to focus (WCAG 2.1.1, level A)",
  measuredBy:
    'grep -rn \'tabIndex|role="img"\' skills/map-native/src --include="*.tsx" → no match ' +
    "across 36 .tsx files; the harness check is ../splash-harness/scripts/deep-verify.mjs:56",
};

const SYMBOL_LABELS: FeatureLimit = {
  feature: "direct-labels",
  sentence: SYMBOL_LABELS_INTERACTIVE,
  measuredBy:
    "SymbolMap.tsx:344-346 mounts symbol-labels only when !interactive || staticFallbackLabels; " +
    "the flag is set by the capture harness alone (symbol-labels.ts:53-55). No selective " +
    "top-ranked subset exists: symbol-geo.ts:97-99 sorts then maps every point (no `.slice()`), " +
    "and SymbolMap.tsx:365-366 lets MapLibre drop labels on collision " +
    "(text-allow-overlap:false, text-optional:true)",
};

export function mapNativeLimits(
  nativeType: string,
  format: VisualFormat,
): FeatureLimit[] {
  if (format !== "interactive" && format !== "scrolly") return [];
  const out: FeatureLimit[] = [KEYBOARD];
  if (nativeType === "symbol") out.push(SYMBOL_LABELS);
  return out;
}

registerFeatureLimits("map-native", mapNativeLimits);
