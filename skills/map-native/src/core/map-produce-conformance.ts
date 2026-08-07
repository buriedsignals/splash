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
//   - Structural rules that need the basemap GeoJSON (region-join, story-beat counts) are OUT
//     of scope here — they stay covered by the existing render-time snap harnesses
//     (snap-responsive, snap-a11y, snap-contrast). Symbol's legend/bounds/sizing-mode/max-radius
//     ARE now in scope (task 17, `checkSymbolConformance`) — `symbolGeometry` is pure (no
//     basemap), so those are config-provable here. `viewportMinPx` is checked against
//     `MAX_RADIUS_PX` (symbol-geo.ts, the literal every symbol renderer actually paints — not
//     an invented config default), and measured against the REAL per-channel media size when
//     the caller passes `mediaSize` (produce.mjs does — it already computes
//     `renderSize(channel)` before calling this) — falling back to a conservative ASSUMED
//     viewport only when neither `mediaSize` nor a config `format` is available.
//   - GL-rendered labels (symbol direct-labels, dot-density dot counts) are out of scope —
//     a separate spike, not config-time-checkable.
//   - The furniture-contrast check here is drift-defense on the pre-vetted
//     FRAME_COLORS(_DARK) tokens (it exists so a future edit to those tokens fails loudly),
//     not a live paint check.
import { MAP_TYPES, type MapType } from "../map-types";
import { resolveMapStyle } from "../route-geo";
import {
  DARK_FRAME_BG,
  type FrameColors,
  resolveFrameColors,
  resolveThemeBg,
} from "../theme/map-tokens";
import { contrastRatio, MIN_CONTRAST } from "../../../../lib/core/contrast";
import { mapPillGround } from "../../../../lib/core/ground";
import { resolvePalette } from "../theme/scale";
import { contrastOk, houseRamp } from "../theme/house-ramp";
import { HEX_GRID_SCALE_TYPE } from "../hex-grid-geo";
import {
  checkGlobalMapConformance,
  checkPaletteConformance,
  checkSymbolConformance,
} from "../conformance";
import { symbolGeometry, MAX_RADIUS_PX } from "../symbol-geo";

// The 3 types whose colour scale is a resolvePalette() ramp (not a fixed qualitative set).
export const RAMP_TYPES = ["choropleth", "hex-grid", "cartogram"] as const;

// Fallback ONLY for a caller that omits `runProduceMapConformance`'s optional `mediaSize`
// param (below) and whose config carries no `format` either — e.g. a direct unit-test call.
// produce.mjs (the real caller) already computes the real per-channel `renderSize(channel)`
// and now passes it through, so this fallback is not on the normal path.
// article-web (675) is CONSERVATIVE, not arbitrary: every `CHANNEL_POLICY` entry's min
// media-size dimension is ≥ 675 (social-vertical 1080, social-feed 1080, article-web 675,
// print-page 1748 — lib/core/channel-policy.ts) — so 675 is the smallest real viewport any
// channel ever produces, meaning this fallback can only be too STRICT (false-refuse a large
// symbol on a bigger real canvas), never too permissive (false-pass one that would swallow a
// smaller real canvas).
const ASSUMED_ARTICLE_WEB_VIEWPORT_MIN_PX = 675;

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

// The SAME furniture-colour resolution the guard validates — exported so a test can observe
// exactly what the guard sees (the tinted `muted`, not the dead grey) without duplicating the
// mapStyle/themeBg/brandHue plumbing. `resolveMapStyle`, `DARK_FRAME_BG`, `resolveFrameColors`
// are the same tokens the furniture check below uses.
export function furnitureColorsFor(config: {
  mapStyle?: unknown;
  themeBg?: unknown;
  brandHue?: unknown;
  brandPalette?: unknown;
}): FrameColors {
  const dark =
    resolveMapStyle(
      typeof config.mapStyle === "string" ? config.mapStyle : undefined,
    ) === "dataviz-dark";
  const themeBg =
    typeof config.themeBg === "string" ? config.themeBg : undefined;
  const furnitureBg = themeBg ?? (dark ? DARK_FRAME_BG : undefined);
  const houseHue =
    typeof config.brandHue === "string"
      ? config.brandHue
      : Array.isArray(config.brandPalette) &&
          typeof config.brandPalette[0] === "string"
        ? config.brandPalette[0]
        : undefined;
  return resolveFrameColors(furnitureBg, houseHue);
}

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

/** The ground the furniture text actually stands on: the pill, composited over the basemap THIS
 *  config pins.
 *
 *  It used to composite over both absolute poles and keep the worse — and for a saturated house
 *  ground the worse pole is always the one the config rules out (a dark ground pins
 *  `dataviz-dark`; the pill never sits on white there). That refused two real newsroom grounds
 *  over a render that cannot happen, at 3.26:1 and 4.40:1, where the map they DO produce reads at
 *  5.22:1 and 6.40:1. `darkBasemap` is therefore REQUIRED, not inferred: the caller has already
 *  resolved `mapStyle` — including a per-element override the profile's luminance snap does not
 *  see — and a guard that re-guesses it would be measuring a different map again.
 *
 *  The arithmetic and the backdrops themselves live in lib/core/ground.ts, with the measurement
 *  they came from, because the charter and the loop must be able to ask the same question before
 *  a produce ever runs. */
export function furnitureGround(
  furnitureBg: string | undefined,
  houseHue: string | undefined,
  darkBasemap: boolean,
): string {
  return mapPillGround(furnitureBg, houseHue, darkBasemap);
}

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
  // The REAL raw pixel size for the channel this config is actually being produced for
  // (produce.mjs's `renderSize(channel)`, e.g. social-vertical 1080×1920, article-web
  // 1200×675). Optional — takes priority over a config `format` field (which no real
  // SymbolConfigShape carries today) when both are present, since it is the more trustworthy
  // source; falls back to ASSUMED_ARTICLE_WEB_VIEWPORT_MIN_PX when neither is given.
  mediaSize?: { width: number; height: number },
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
  // Validate the REAL furniture the components paint: a newsroom house `themeBg` derives the
  // pill/ink/muted off that ground (resolveFrameColors), else the dark preset / light default.
  // `furnitureBg` is the SINGLE ground both the derived furniture AND its WCAG backdrop resolve
  // from — mirrors MapFrame's `furnitureBg = themeBg ?? (dark ? DARK_FRAME_BG : undefined)` exactly.
  const themeBg =
    typeof config.themeBg === "string" ? config.themeBg : undefined;
  const furnitureBg = themeBg ?? (dark ? DARK_FRAME_BG : undefined);
  const houseHue =
    typeof config.brandHue === "string" ? config.brandHue : undefined;
  const fc = furnitureColorsFor(config);
  const pillGround = furnitureGround(furnitureBg, houseHue, dark);
  // ★ THE JOURNALIST'S OWN GROUND, KEPT AS CHOSEN — the same policy (b) this file already applies
  // to the house HUE a few lines down (`concerns`, never `violations`). `groundAccepted` is not a
  // config knob a spec author sets: the loop writes it only when the run manifest carries a
  // recorded `keep-mine` decision (lib/loop/ground.ts), which is itself only reachable after the
  // journalist was shown what the colour does to their text and answered. So a shipped illegible
  // ground traces to a person, and — because the concern is still raised — it is never silent.
  const groundAccepted = config.groundAccepted === true;
  const groundIllegible = [fc.ink, fc.muted].some(
    (t) => contrastRatio(t, pillGround) < MIN_CONTRAST,
  );
  const textColors = {
    text: groundAccepted && groundIllegible ? [] : [fc.ink, fc.muted],
    bg: pillGround,
  };

  const title = typeof config.title === "string" ? config.title : "";
  const description =
    typeof config.description === "string" ? config.description : undefined;
  const source = (config.source ?? {}) as { name?: string; url?: string };

  // `checkSymbolConformance` (called below, for type "symbol" only) already composes
  // `checkGlobalMapConformance` internally with these exact same `title`/`description`/
  // `source`/`textColors` — calling it again here would duplicate every furniture violation
  // verbatim (e.g. "missing source name" twice) for symbol maps only. Every other type has
  // no per-type check in this file, so this IS their only furniture guard and must run.
  const violations =
    type === "symbol"
      ? []
      : checkGlobalMapConformance({ title, description, source }, textColors);

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
  if (groundAccepted && groundIllegible)
    concerns.push(
      `house ground ${resolveThemeBg(furnitureBg) ?? furnitureBg} cannot carry legible furniture text on the ${dark ? "dark" : "light"} basemap (the pill resolves to ${pillGround}) — kept as chosen by the journalist (policy b), verify legibility at render-review`,
    );
  if (houseHue && paintsSingleHouseFill(type, config)) {
    // Defense-in-depth: `contrastOk` → `relativeLuminance` THROWS on a malformed hex.
    // In the normal orchestrator flow this never fires — validate-gate's `brandHueError`
    // rejects a malformed brandHue before produce ever runs — but a standalone
    // `produce.mjs` CLI invocation can bypass that gate entirely. Never let a bad hex
    // crash the produce run here: convert it to a clean violation (this IS a malformed
    // config, unlike the low-contrast-but-valid case below, which is kept as chosen).
    try {
      if (!contrastOk(houseHue, dark)) {
        concerns.push(
          `house fill ${houseHue} does not clear 3:1 non-text contrast on the ${dark ? "dark" : "light"} basemap — kept as chosen (policy b), verify legibility at render-review`,
        );
      }
    } catch (e) {
      violations.push(`brandHue: ${(e as Error).message}`);
    }
  }

  // SYMBOL — the per-type rules that were written and never called (the only callers were
  // their own tests, plus a COMMENT in skills/map-dw/src/map-spec.ts:432). The geometry core
  // is pure (symbol-geo.ts:71, no basemap, no MapTiler), so the legend stops, the max radius
  // and the bounds are all config-provable HERE, before a render costs anything.
  // DELIBERATELY NOT fed: `strokeContrast` and `staticFallbackLabeled`. They are render facts,
  // and inventing them would be an unmeasured refusal — the render snaps keep them.
  if (type === "symbol") {
    const points = Array.isArray(config.points)
      ? (config.points as { lon: number; lat: number; value: number }[])
      : [];
    const fmt = config.format as { width: number; height: number } | undefined;
    // `config.maxRadius` is not a real SymbolConfigShape field today — no config emits it —
    // so this default is what actually matters: MAX_RADIUS_PX (symbol-geo.ts) is the literal
    // every symbol renderer paints (40px), not an invented config default. Checking a number
    // the renderer never paints would be the exact "guard validates what never renders"
    // defect `resolveRampScaleType`'s comment above already warns about.
    const maxRadius =
      typeof config.maxRadius === "number" ? config.maxRadius : MAX_RADIUS_PX;
    let legendStops = 0;
    let boundsNonEmpty = false;
    if (points.length > 0) {
      const geo = symbolGeometry(
        { points } as Parameters<typeof symbolGeometry>[0],
        maxRadius,
      );
      legendStops = geo.legend.length;
      boundsNonEmpty =
        geo.bounds[0] !== geo.bounds[2] || geo.bounds[1] !== geo.bounds[3];
    }
    violations.push(
      ...checkSymbolConformance(
        {
          title,
          description,
          source,
          sizingMode: config.sizingMode === "radius" ? "radius" : "area",
          hasLegend: config.hasLegend !== false,
          legendStops,
          maxRadiusPx: maxRadius,
          // Priority: real `mediaSize` (produce.mjs's actual renderSize(channel)) > config
          // `format` (kept for a future caller that emits one) > the conservative ASSUMED
          // fallback. Was `fmt ? … : ASSUMED_…` only — mediaSize is new (fix round 2, Finding B).
          viewportMinPx: mediaSize
            ? Math.min(mediaSize.width, mediaSize.height)
            : fmt
              ? Math.min(fmt.width, fmt.height)
              : ASSUMED_ARTICLE_WEB_VIEWPORT_MIN_PX,
          pointsWithData: points.length,
          boundsNonEmpty,
          // Render-only inputs: give the values the rules treat as "not my business here" —
          // strokeContrast and staticFallbackLabeled are render facts the snap scripts own
          // (see the file header + the brief this task follows); inventing them here would be
          // an unmeasured refusal.
          strokeContrast: Infinity,
          labeled: config.labeled !== false,
          valueUnit:
            typeof config.valueUnit === "string" ? config.valueUnit : undefined,
          labelHasUnit:
            typeof config.labelHasUnit === "boolean"
              ? config.labelHasUnit
              : undefined,
          ...(fmt ? { format: fmt } : {}),
        },
        textColors,
      ),
    );
  }

  return { checked: true, violations, concerns };
}
