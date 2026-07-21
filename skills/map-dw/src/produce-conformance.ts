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
//   - Choropleth ramp CVD-safety is a HARD VIOLATION, UNCONDITIONALLY — brandExplicit does
//     NOT downgrade it. This matches BOTH siblings for the ramp construct specifically:
//     map-native's map-produce-conformance.ts pushes `checkPaletteConformance`'s result
//     straight into `violations` for all 3 RAMP_TYPES (choropleth/hex-grid/cartogram), with
//     no brandHue/brandExplicit downgrade path at all — "policy b" there covers ONLY the
//     single-fill WCAG 1.4.11 contrast concern (symbol/route/dot-density), never the ramp
//     CVD check. And chart-native's heatmap ramp CVD failure ("luminance is not monotonic")
//     is likewise never matched by `reconcileBrandViolations`'s `CVD_VIOLATION` regex (which
//     only downgrades the categorical "not in the Okabe-Ito set" message) — so a heatmap
//     ramp CVD failure is always hard there too. A brand-explicit downgrade for the RAMP case
//     would make map-dw MORE LENIENT than both siblings for the same construct; hard-
//     rejecting instead keeps map-dw consistent with them.
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
  // Non-blocking review flags. Reserved for a future genuine single-fill contrast concern
  // (mirrors map-native's map-produce-conformance.ts `concerns` shape) — map-dw currently
  // has none: it refuses to produce symbol maps (see map-spec.ts) and the ramp CVD check
  // below is always hard, so this is always empty today.
  concerns: string[];
}

// The ramp actually applied to a choropleth, resolved with the SAME precedence
// choroplethMetadata (spec-to-map-metadata.ts) uses: an explicit colorScale always wins;
// else a house hue derives a ramp; else the library DEFAULT_BLUE (2 vetted, monotonic
// stops — CVD-safe by construction, nothing chosen to check, so `undefined` is returned and
// no check runs). brandExplicit no longer changes this resolution — a ramp CVD failure is
// hard-rejected regardless of whose colour it is, matching map-native/chart-native.
function resolveChoroplethRamp(spec: MapSpec): string[] | undefined {
  if (spec.mapType !== "choropleth") return undefined;
  if (spec.colorScale && spec.colorScale.length > 0)
    return spec.colorScale.map((s) => s.color);
  if (spec.brandHue) return houseRamp(spec.brandHue);
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

  const colors = resolveChoroplethRamp(spec);
  if (colors && colors.length >= 2 && !isMonotonicLuminanceRamp(colors)) {
    violations.push(
      `choropleth colour ramp is not CVD-safe (not monotonic-luminance, so ` +
        `colour-blind readers cannot separate the sequential bins by lightness alone): ` +
        `${colors.join(" -> ")}`,
    );
  }

  return { violations, concerns };
}

// Fail-hard entry point for produce.ts: throws on any hard violation (title/source/alt-text
// missing or malformed, ANY ramp failing CVD-safety, brand-explicit or not); `concerns` is
// logged, never thrown, but is always empty today (see MapDwConformanceResult doc).
export function assertMapDwConformance(spec: MapSpec): void {
  const { violations, concerns } = runProduceMapDwConformance(spec);
  for (const c of concerns) console.warn(`[map-dw] conformance concern: ${c}`);
  if (violations.length)
    throw new Error(
      `map-dw conformance floor failed:\n  - ${violations.join("\n  - ")}`,
    );
}
