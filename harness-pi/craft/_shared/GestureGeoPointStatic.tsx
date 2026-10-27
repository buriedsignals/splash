/**
 * The static family component of the point / line / field maps (Geo F8): ONE entry that draws every type of the
 * family as a variant — `symbol` (proportional symbol), `flow` (origin → destinations fan), `locator`, `contour` —
 * each a fork of its per-type component with the fixed staging replaced by the static scheduler's declaration
 * (gesture-geo-point-static.mjs): the accent, the rings, the step-back, the notes, the reference isolines. The
 * drawing of each variant keeps its per-type doctrine (registers, furniture from the ground, one accent, direct
 * labels) and lives in its own file beside this one; this file only routes.
 */
import { GestureGeoPointStaticContour } from "./GestureGeoPointStaticContour.tsx";
import { GestureGeoPointStaticFlow } from "./GestureGeoPointStaticFlow.tsx";
import { GestureGeoPointStaticLocator } from "./GestureGeoPointStaticLocator.tsx";
import { GestureGeoPointStaticSymbol } from "./GestureGeoPointStaticSymbol.tsx";

const VARIANTS = {
  symbol: GestureGeoPointStaticSymbol,
  flow: GestureGeoPointStaticFlow,
  locator: GestureGeoPointStaticLocator,
  contour: GestureGeoPointStaticContour,
} as const;

export function GestureGeoPointStatic({ variant, ...props }: { variant: keyof typeof VARIANTS } & Record<string, any>) {
  const Variant = VARIANTS[variant] as (p: any) => any;
  if (!Variant) throw new Error(`no static point-map variant "${variant}" (${Object.keys(VARIANTS).join(", ")})`);
  return Variant(props);
}
