// Produce-time conformance FLOOR for map-dw — the weakest-guarded engine per the quality
// audit (it ships hosted Datawrapper maps straight to newsrooms). Before this, produce.ts
// guarded i18n source metadata, rendered PNG size, and join-match rate — but NOTHING checked
// furniture quality (title/source/alt-text) or mark-colour contrast/CVD-safety. Closes both
// gaps by REUSING the shared lib/core primitives extracted in Tier 1 (conformanceL0,
// isMonotonicLuminanceRamp via the one sanctioned map-dw -> map-native/theme/house-ramp
// import) instead of re-mirroring chart-native's/map-native's own copies — the payoff the
// refactor exists to demonstrate.
//
// CONFIG-LEVEL, not render-level: map-dw delegates rendering to the Datawrapper cloud (no
// local canvas to snap a rendered-contrast check against, unlike chart-native/map-native's
// own producers), so this checks the CHOSEN colours BEFORE they are ever sent to the API —
// the same config-time posture as skills/dw-chart/src/contrast.ts + value-label-safety.ts.
//
// KEEP-VS-REJECT POLICY (mirrors map-native's map-produce-conformance.ts + dw-chart's
// value-label-safety.ts F2, faithfully — nothing stricter invented here):
//   - L0 furniture (title quality, source cited, altInsight) is ALWAYS a hard violation.
//     Neither lib/core's conformanceL0 nor map-native's own checkGlobalMapConformance has a
//     concept of "kept as chosen" for missing/malformed furniture.
//   - Choropleth ramp CVD-safety is a HARD VIOLATION, UNLESS the ramp is the newsroom's own
//     genuine house colour (spec.brandExplicit — set only by the profile merge, see
//     map-spec.ts's ChoroplethMapSpec.brandExplicit doc, which flagged this exact hook as
//     "informational only... no rendered-contrast a11y guard to downgrade [yet]"). In that
//     case a CVD failure is KEPT AS CHOSEN and surfaced as a review concern, never rejected —
//     this is dw-chart's F2 exactly ("a failure in a journalist-chosen brand colour is KEPT
//     and recorded as a concern; every other failure still throws") and map-native's own
//     "policy b" (a newsroom house fill that fails contrast is kept, not rejected).
//   - Locator markers and symbol maps are OUT of scope for this contrast check, matching
//     map-native's own documented exclusion: both cycle a PALETTE (brandPalette/OKABE_ITO),
//     never paint a single house fill, so map-native's single-fill concern never applies to
//     them either — and map-dw refuses to produce symbol maps at all (see map-spec.ts).
//
// RAMP CVD-SAFETY CRITERION: map-dw's colorScale is always a SEQUENTIAL light->dark gradient
// (ChoroplethMapSpec has no diverging/scaleType concept, unlike map-native's ramp types) — so
// the real CVD-safety criterion is STRICT MONOTONIC LUMINANCE (colour-blind readers separate
// sequential bins by lightness alone), exactly the criterion house-ramp.ts's own
// isMonotonicLuminanceRamp documents as "the real CVD-safety criterion for a SEQUENTIAL
// ramp" — the same test a derived house ramp must pass to skip map-native's registry
// whitelist. Reused via the ONE import-guard-sanctioned map-dw -> map-native/src/theme/
// house-ramp path (skills/splash/src/import-guard.test.ts) — the same sanctioned import
// spec-to-map-metadata.ts already uses for houseRamp() itself. map-native's registry-
// membership check (theme/scale.ts isCvdSafeRamp) is NOT reachable from map-dw — that file
// is not on the sanctioned list — so the monotonic-luminance proxy is the correct,
// gate-respecting check here, not a shortcut.

import { conformanceL0 } from "../../../lib/core/conformance-l0";
import {
  houseRamp,
  isMonotonicLuminanceRamp,
} from "../../map-native/src/theme/house-ramp";
import type { MapSpec } from "./map-spec";

export interface MapDwConformanceResult {
  violations: string[];
  // Non-blocking review flags: a genuine newsroom house colour (brandExplicit) kept as
  // chosen despite failing the CVD-safety proxy — mirrors map-native's
  // map-produce-conformance.ts `concerns` shape.
  concerns: string[];
}

// The ramp actually applied to a choropleth, resolved with the SAME precedence
// choroplethMetadata (spec-to-map-metadata.ts) uses: an explicit colorScale always wins;
// else a house hue derives a ramp; else the library DEFAULT_BLUE (2 vetted, monotonic
// stops — CVD-safe by construction, nothing chosen to check, so `undefined` is returned and
// no check runs). `isBrandChoice` mirrors spec.brandExplicit verbatim: the field is
// documented as "true when the colour actually applied is a genuine house colour", so it
// gates the keep-vs-reject decision regardless of which field (colorScale or brandHue)
// carried that colour onto the spec.
function resolveChoroplethRamp(
  spec: MapSpec,
): { colors: string[]; isBrandChoice: boolean } | undefined {
  if (spec.mapType !== "choropleth") return undefined;
  const isBrandChoice = spec.brandExplicit === true;
  if (spec.colorScale && spec.colorScale.length > 0)
    return { colors: spec.colorScale.map((s) => s.color), isBrandChoice };
  if (spec.brandHue) return { colors: houseRamp(spec.brandHue), isBrandChoice };
  return undefined;
}

// The lean produce-time conformance floor. Pure — no I/O, no DW API — so it can run before
// any network call and inside the fast test gate.
export function runProduceMapDwConformance(
  spec: MapSpec,
): MapDwConformanceResult {
  const violations = conformanceL0({
    title: spec.title,
    source: spec.source ?? {},
    altInsight: spec.altInsight,
  });
  const concerns: string[] = [];

  const resolved = resolveChoroplethRamp(spec);
  if (
    resolved &&
    resolved.colors.length >= 2 &&
    !isMonotonicLuminanceRamp(resolved.colors)
  ) {
    const msg =
      `choropleth colour ramp is not CVD-safe (not monotonic-luminance, so ` +
      `colour-blind readers cannot separate the sequential bins by lightness alone): ` +
      `${resolved.colors.join(" -> ")}`;
    if (resolved.isBrandChoice) {
      concerns.push(
        `${msg} -- kept as the newsroom's own house colour (brandExplicit), verify ` +
          `legibility at render-review (policy b)`,
      );
    } else {
      violations.push(msg);
    }
  }

  return { violations, concerns };
}

// Fail-hard entry point for produce.ts: throws on any hard violation (title/source/alt-text
// missing or malformed, a non-brand ramp failing CVD-safety); a kept-as-chosen brand concern
// is logged, never thrown.
export function assertMapDwConformance(spec: MapSpec): void {
  const { violations, concerns } = runProduceMapDwConformance(spec);
  for (const c of concerns) console.warn(`[map-dw] conformance concern: ${c}`);
  if (violations.length)
    throw new Error(
      `map-dw conformance floor failed:\n  - ${violations.join("\n  - ")}`,
    );
}
