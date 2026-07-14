// Lean, config-time produce guard for map-native. Runs BEFORE any basemap/build step (a
// later wiring task calls it from `produce.mjs`), so a violation fails the run before it
// costs a render — mirrors chart-native's produce-time conformance gate.
//
// Honest scope (deliberately narrow):
//   - Furniture (L0 semantics — title/description/source/text-contrast) is checked for
//     ALL 7 map-native types via `checkGlobalMapConformance`. Every per-type check already
//     composes this rule; this guard just calls it directly, without the structural/geo
//     inputs the full per-type checks need.
//   - Palette CVD-safety (+ a best-effort sequential/diverging semantic match) is checked
//     for the 3 ramp-driven types (choropleth, hex-grid, cartogram) via
//     `checkPaletteConformance`. `resolvePalette` is pure — no geometry, no basemap.
//   - Structural rules that need the basemap GeoJSON (bounds, region-join, legend geometry,
//     symbol max-radius, story-beat counts) are OUT of scope here — they stay covered by
//     the existing render-time snap harnesses (snap-responsive, snap-a11y, snap-contrast).
//   - GL-rendered labels (symbol direct-labels, dot-density dot counts) are out of scope —
//     a separate spike, not config-time-checkable.
//   - The furniture-contrast check here is drift-defense on the pre-vetted
//     FRAME_COLORS(_DARK) tokens (it exists so a future edit to those tokens fails loudly),
//     not a live paint check.
import { MAP_TYPES, type MapType } from "../map-types";
import { resolveMapStyle } from "../route-geo";
import { FRAME_COLORS, FRAME_COLORS_DARK } from "../theme/map-tokens";
import { resolvePalette } from "../theme/scale";
import { contrastOk, houseRamp } from "../theme/house-ramp";
import { HEX_GRID_SCALE_TYPE } from "../hex-grid-geo";
import {
  checkGlobalMapConformance,
  checkPaletteConformance,
} from "../conformance";

// The 3 types whose colour scale is a resolvePalette() ramp (not a fixed qualitative set).
export const RAMP_TYPES = ["choropleth", "hex-grid", "cartogram"] as const;

// Resolves the scaleType the SAME way the renderer actually paints it, per ramp type — so
// this guard can never validate a ramp the map never renders (bug #6). hex-grid always
// pins `HEX_GRID_SCALE_TYPE` ("sequential") and never reads a scaleType off its config
// (`HexGridConfigShape` has no such field) — so a stray `config.scaleType` here must be
// ignored, not honoured. choropleth/cartogram genuinely support both and thread the
// config's own choice (mirrors `checkCartogramConformance`, which reads it off the real
// computed `layout.scaleType`).
function resolveRampScaleType(
  type: string,
  config: Record<string, unknown>,
): "sequential" | "diverging" {
  if (type === "hex-grid") return HEX_GRID_SCALE_TYPE;
  return config.scaleType === "diverging" ? "diverging" : "sequential";
}

// All 7 MAP_TYPES are furniture-guarded here — the parity target a later completeness
// invariant (reachable ⟹ guarded) checks against.
export const MAP_PRODUCE_GUARDED_TYPES: readonly MapType[] = MAP_TYPES;

export interface MapConformanceRunResult {
  checked: boolean;
  violations: string[];
  // Non-blocking review flags: things KEPT AS PRODUCED that a human should verify at
  // render-review. Today: a newsroom house fill (single-hue types) that fails the WCAG
  // 1.4.11 non-text 3:1 contrast against the basemap (policy b — kept, never rejected).
  concerns: string[];
}

// The single-hue map types that paint the newsroom house hue as ONE fill and so are subject to
// the keep-and-review contrast concern: symbol (circle fill), route (line), and univariate
// dot-density (dot accent). Locator and multivariate dot-density cycle a PALETTE — no single
// fill — so no single-fill concern applies to them.
function paintsSingleHouseFill(
  type: string,
  config: Record<string, unknown>,
): boolean {
  if (type === "symbol" || type === "route") return true;
  if (type === "dot-density")
    return !(Array.isArray(config.categories) && config.categories.length > 0);
  return false;
}

// Opaque solid equivalents of the (translucent) FRAME_COLORS(_DARK).pill — the same
// convention `tests/conformance.test.ts` already uses for the WCAG-contrast assertions on
// these exact tokens. `contrastRatio` requires a #rrggbb hex, and the pill itself is an
// `rgba(...)` string, so the opaque backdrop it visually reads as (over the page / over the
// dark basemap) is what gets checked — not a literal CSS value.
const LIGHT_PILL_SOLID = "#ffffff";
const DARK_PILL_SOLID = "#18181b";

// Best-effort numeric-column extraction for the palette semantic check (diverging vs
// sequential). `values` is optional in `checkPaletteConformance` — when a numeric column
// isn't trivially available this returns undefined and only the CVD-safety rule (which
// needs no values) still runs. Deliberately not built to cover every config shape.
function extractValues(config: Record<string, unknown>): number[] | undefined {
  const rows = Array.isArray(config.rows)
    ? config.rows
    : Array.isArray(config.points)
      ? config.points
      : Array.isArray(config.values)
        ? config.values
        : Array.isArray(config.data)
          ? config.data
          : undefined;
  if (!rows) return undefined;
  const field =
    typeof config.valueField === "string" ? config.valueField : "value";
  const values = rows
    .map((row) => (row as Record<string, unknown> | null)?.[field])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return values.length >= 3 ? values : undefined;
}

// The lean produce guard. `rawType` is the config's raw `type` field (possibly absent —
// choropleth has no discriminator of its own, see map-types.ts); `config` is the raw
// suggester-emitted map config, pre-structural-validation.
export function runProduceMapConformance(
  rawType: string | undefined,
  config: Record<string, unknown>,
): MapConformanceRunResult {
  // CRITICAL: choropleth is the mount.tsx default (its sample configs carry no `type`
  // field at all) — without this normalization it would ship unguarded.
  const type = rawType ?? "choropleth";

  // A typo'd type still renders as choropleth via mount.tsx's default branch, so it must
  // NOT bypass the gate — return a violation, not checked:false.
  if (!(MAP_TYPES as readonly string[]).includes(type))
    return {
      checked: true,
      violations: [`unknown map type "${type}"`],
      concerns: [],
    };

  // Kept as an explicit branch (even though all 7 MAP_TYPES are guarded today) — the
  // honest "no guard wired for this type" path, for when MAP_TYPES grows ahead of this file.
  if (!(MAP_PRODUCE_GUARDED_TYPES as readonly string[]).includes(type))
    return { checked: false, violations: [], concerns: [] };

  const dark =
    resolveMapStyle(
      typeof config.mapStyle === "string" ? config.mapStyle : undefined,
    ) === "dataviz-dark";
  const fc = dark ? FRAME_COLORS_DARK : FRAME_COLORS;
  const textColors = {
    text: [fc.ink, fc.muted],
    bg: dark ? DARK_PILL_SOLID : LIGHT_PILL_SOLID,
  };

  const title = typeof config.title === "string" ? config.title : "";
  const description =
    typeof config.description === "string" ? config.description : undefined;
  const source = (config.source ?? {}) as { name?: string; url?: string };

  const violations = checkGlobalMapConformance(
    { title, description, source },
    textColors,
  );

  if ((RAMP_TYPES as readonly string[]).includes(type)) {
    try {
      const scaleType = resolveRampScaleType(type, config);
      // When the renderer paints a derived HOUSE ramp (brandHue set, no explicit palette),
      // validate THAT ramp — not resolvePalette's library default, which is not what ships — and
      // treat it as a deliberate newsroom choice (paletteName "house") so the subject-default rule
      // (c) is satisfied. An explicit `palette` always takes the resolvePalette path and wins.
      const brandHue =
        typeof config.brandHue === "string" ? config.brandHue : undefined;
      const houseRampInEffect =
        brandHue !== undefined && config.palette === undefined;
      const ramp = houseRampInEffect
        ? houseRamp(
            brandHue!,
            typeof config.bins === "number" ? config.bins : 5,
          )
        : resolvePalette(
            scaleType,
            config.palette as string | string[] | undefined,
          ).ramp;
      violations.push(
        ...checkPaletteConformance({
          scaleType,
          scaleColors: ramp,
          values: extractValues(config),
          paletteName: houseRampInEffect
            ? "house"
            : typeof config.palette === "string"
              ? config.palette
              : undefined,
          subject:
            typeof config.subject === "string" ? config.subject : undefined,
        }),
      );
    } catch (e) {
      // resolvePalette throws on an unknown named palette — convert to a clean violation,
      // never crash the produce run.
      violations.push(`palette: ${(e as Error).message}`);
    }
  }

  // Single-hue house-fill contrast concern (policy b). A newsroom house hue applied as ONE map
  // fill (symbol / route line / univariate dot-density) that fails WCAG 1.4.11 non-text 3:1
  // contrast against the basemap is KEPT AS CHOSEN — never rejected — and surfaced here so a
  // human verifies legibility at render-review. brandHue is only ever set for a genuine house
  // colour (the merge sets it with brandExplicit), so its presence is the signal.
  const concerns: string[] = [];
  const houseHue =
    typeof config.brandHue === "string" ? config.brandHue : undefined;
  if (
    houseHue &&
    paintsSingleHouseFill(type, config) &&
    !contrastOk(houseHue, dark)
  ) {
    concerns.push(
      `house fill ${houseHue} does not clear 3:1 non-text contrast on the ${dark ? "dark" : "light"} basemap — kept as chosen (policy b), verify legibility at render-review`,
    );
  }

  return { checked: true, violations, concerns };
}
