import { resolveMapFrame } from "./core/map-format";
import { MAP_STYLES, computeRoute } from "./route-geo";
import type { RouteConfig } from "./route-geo";
import type { ScrollyStory } from "../../scrolly/src/chapters";
import { auditTemporalNarrative } from "../../scrolly/src/conformance";
import type { Beat } from "./map-story";
import { computeCartogram } from "./cartogram-geo";
import { HEX_GRID_SCALE_TYPE } from "./hex-grid-geo";
import { bbox } from "@turf/turf";
import {
  isCvdSafeRamp,
  resolvePalette,
  DEFAULT_SEQUENTIAL,
  DEFAULT_DIVERGING,
} from "./theme/scale";

export interface RevealConformanceResult {
  violations: string[];
}

export function checkRevealConformance(input: {
  bounds: [number, number, number, number];
  title?: string;
  source?: { name?: string; url?: string };
  hasFurniture?: boolean;
}): RevealConformanceResult {
  const v: string[] = [];
  const [w, s, e, n] = input.bounds;
  // The reveal is fixed-camera by construction (revealCameraPlan returns a plan
  // typed { kind: "fixed" }), so conformance validates the bounds it will be
  // given + the furniture/source — not the (type-guaranteed) camera fixity.
  if (![w, s, e, n].every((x) => Number.isFinite(x)))
    v.push("reveal bounds must be finite");
  if (w >= e || s >= n)
    v.push("reveal bounds are degenerate (west ≥ east or south ≥ north)");
  if (s < -85 || n > 85)
    v.push("reveal bounds latitude must be Mercator-safe (within ±85)");
  if (input.hasFurniture === false)
    v.push("reveal must render the MapFrame furniture (title + source)");
  if (!input.source?.name?.trim()) v.push("reveal must cite a source");
  return { violations: v };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a),
    lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Shared L0 — the header rules every map type + format must satisfy (mirrors chart-native's
// checkGlobalConformance). Both per-type guards call this first, then add their own rules.
export function checkGlobalMapConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (/[A-Za-z]/.test(title) && title === title.toUpperCase())
    v.push(`title is ALL CAPS — write it as a sentence: "${title}"`);
  if (!input.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");
  for (const t of textColors.text) {
    const r = contrastRatio(t, textColors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${textColors.bg} < 4.5:1`,
      );
  }
  return v;
}

// Deterministic detection: does this set of values read as DIVERGING — signed around
// a meaningful midpoint (both a clear negative and a clear positive extreme relative
// to zero, or values straddling their own centre with real spread on both sides)?
// Used by the guardrail to catch a diverging distribution painted with a sequential
// ramp (the inverse of the blue-everything defect: wrong semantic → wrong ramp).
export function looksDiverging(values: number[]): boolean {
  if (values.length < 3) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min >= 0 || max <= 0) return false; // all one sign → magnitude, sequential
  // Both tails carry real weight relative to the total span.
  const span = max - min;
  return -min / span > 0.2 && max / span > 0.2;
}

// Palette guardrail. Fails when (a) the scaleType contradicts the data semantic —
// clearly diverging data (signed around a midpoint) rendered sequential, or a
// diverging ramp used on all-one-sign magnitude data; (b) the ramp is NOT CVD-safe
// (every colour must be drawn from the vetted registry set); (c) — when a subject is
// declared — the library DEFAULT palette is used with no explicit palette to justify
// a subject-fit hue (the exact recurrence of the blue-everything defect). Deterministic.
export function checkPaletteConformance(input: {
  scaleType: "sequential" | "diverging";
  scaleColors: string[];
  values?: number[];
  paletteName?: string; // "custom", a registry name, or undefined (default was used)
  subject?: string; // when set, the map has a clear subject → default is not enough
}): string[] {
  const v: string[] = [];
  // (b) CVD-safety.
  if (!isCvdSafeRamp(input.scaleColors))
    v.push(
      "palette is not CVD-safe — use a registry palette or vetted colours",
    );
  // (a) semantic ↔ scaleType match.
  if (input.values && input.values.length >= 3) {
    if (looksDiverging(input.values) && input.scaleType !== "diverging")
      v.push(
        "data is signed around a midpoint (diverging) but the scale is sequential — use a diverging scaleType + palette",
      );
    if (!looksDiverging(input.values) && input.scaleType === "diverging") {
      const min = Math.min(...input.values);
      const max = Math.max(...input.values);
      if (min >= 0 || max <= 0)
        v.push(
          "data is all one sign (magnitude) but the scale is diverging — use a sequential scaleType + palette",
        );
    }
  }
  // (c) default palette used despite a clear subject → force an explicit choice.
  if (
    input.subject &&
    input.subject.trim() &&
    (input.paletteName === undefined ||
      input.paletteName === DEFAULT_SEQUENTIAL ||
      input.paletteName === DEFAULT_DIVERGING)
  )
    v.push(
      `subject "${input.subject}" has no explicit palette — the default ${input.paletteName ?? "library"} palette must not stand in for a subject-fit choice`,
    );
  return v;
}

export function checkChoroplethConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    scaleColors: string[];
    scaleType: "sequential" | "diverging";
    hasLegend: boolean;
    regionsWithData: number;
    regionsTotal: number;
    boundsNonEmpty: boolean;
    storyBeats?: number;
    format?: { width: number; height: number };
    values?: number[];
    paletteName?: string;
    subject?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (!input.hasLegend)
    v.push("choropleth needs a legend (the map is undecodable without it)");
  if (!input.boundsNonEmpty)
    v.push("empty data bounds — basemap-fit impossible");
  if (input.regionsWithData < 1) v.push("no region has data");
  if (input.scaleColors.length < 3)
    v.push("scale has too few steps to read as a CVD-safe ramp");
  v.push(
    ...checkPaletteConformance({
      scaleType: input.scaleType,
      scaleColors: input.scaleColors,
      values: input.values,
      paletteName: input.paletteName,
      subject: input.subject,
    }),
  );
  if (input.storyBeats !== undefined && input.storyBeats < 3)
    v.push(
      `story: only ${input.storyBeats} beats — a narrated map needs at least establish + reveal + takeaway (3)`,
    );
  if (input.format)
    v.push(
      ...checkMapFraming({
        width: input.format.width,
        height: input.format.height,
        title: input.title,
        description: input.description,
        hasSource: !!input.source?.name?.trim(),
      }).violations,
    );
  return v;
}

// A symbol's largest radius must not exceed this fraction of the smaller viewport
// dimension — beyond it, one symbol swallows the map and the pattern is unreadable.
export const SYMBOL_MAX_VIEWPORT_FRACTION = 0.25;

export function checkSymbolConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    sizingMode: "area" | "radius";
    hasLegend: boolean;
    legendStops: number;
    maxRadiusPx: number;
    viewportMinPx: number;
    pointsWithData: number;
    boundsNonEmpty: boolean;
    strokeContrast: number;
    labeled: boolean;
    valueUnit?: string;
    labelHasUnit?: boolean;
    format?: { width: number; height: number };
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (input.sizingMode !== "area")
    v.push(
      "symbols must be area-proportional (r ∝ √value), not radius-proportional",
    );
  if (!input.hasLegend)
    v.push("symbol map needs a legend (size is undecodable without it)");
  if (input.legendStops < 2)
    v.push(
      `legend has ${input.legendStops} reference circle(s) — need at least 2 to read the size scale`,
    );
  if (input.maxRadiusPx > input.viewportMinPx * SYMBOL_MAX_VIEWPORT_FRACTION)
    v.push(
      `largest symbol ${input.maxRadiusPx}px is too large for the ${input.viewportMinPx}px viewport (swallows the map)`,
    );
  if (input.pointsWithData < 1) v.push("no point has data");
  if (!input.boundsNonEmpty)
    v.push("empty data bounds — basemap-fit impossible");
  if (input.strokeContrast < 2)
    v.push(
      `symbol stroke contrast ${input.strokeContrast.toFixed(2)} too faint to separate symbols from the basemap`,
    );
  if (!input.labeled)
    v.push(
      "symbols are not directly labeled — values are undecodable without hover",
    );
  if (input.valueUnit && input.valueUnit.trim() && input.labelHasUnit === false)
    v.push(
      `labelled value omits its unit "${input.valueUnit}" — a directly-labelled value must state its unit`,
    );
  if (input.format)
    v.push(
      ...checkMapFraming({
        width: input.format.width,
        height: input.format.height,
        title: input.title,
        description: input.description,
        hasSource: !!input.source?.name?.trim(),
      }).violations,
    );
  return v;
}

export function checkRouteConformance(input: {
  routePoints: number;
  territoryColors: string[];
  mapStyle?: string;
  title?: string;
  source?: { name?: string; url?: string };
}): { violations: string[] } {
  const v: string[] = [];
  if (input.routePoints < 2) v.push("route must have at least 2 points");
  if (input.territoryColors.length < 1) v.push("route crosses no territories");
  if (new Set(input.territoryColors).size !== input.territoryColors.length)
    v.push("territory colours must be distinct");
  if (
    input.mapStyle &&
    !(MAP_STYLES as readonly string[]).includes(input.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  if (!input.source?.name?.trim()) v.push("route must cite a source");
  return { violations: v };
}

// Scrolly-video contract: validated on the DERIVED ScrollyStory (post mapStoryToChapters /
// routeStoryToChapters), not the raw config — steps are always derived. territoryCount, when
// given, range-checks drawTo refs (route).
export function checkScrollyConformance(input: {
  story: ScrollyStory;
  territoryCount?: number;
  // When the derived beats are supplied, the temporal-narrative guardrail runs:
  // a TEMPORAL reveal must never carry "highest/lowest" ranking prose (defect #3).
  beats?: Beat[];
}): { violations: string[] } {
  const v: string[] = [];
  const { story, territoryCount, beats } = input;

  if (beats) v.push(...auditTemporalNarrative(story, beats));

  if (story.steps.length < 2)
    v.push("scrolly needs at least 2 steps (intro + one content step)");

  const title = story.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (!story.source?.name?.trim()) v.push("scrolly must cite a source");

  for (const s of story.steps) {
    if (!s.prose?.trim()) v.push(`step ${s.id} has empty prose`);
    if (s.action !== "flyTo" && s.action !== "drawTo")
      v.push(`step ${s.id} has unknown action "${s.action}"`);
    if (typeof s.ref === "number") {
      if (s.ref < 0) v.push(`step ${s.id} ref ${s.ref} out of range`);
      if (
        s.action === "drawTo" &&
        territoryCount !== undefined &&
        s.ref >= territoryCount
      )
        v.push(
          `step ${s.id} drawTo ref ${s.ref} out of range (${territoryCount})`,
        );
    }
  }
  return { violations: v };
}

// Average glyph width in ems (conservative) and the frame left/right inset, used to estimate
// whether a title fits its band at the scaled size.
const CHAR_W = 0.55;
const FRAME_INSET = 12;

// Format-aware framing/legibility check. Uses resolveMapFrame (slice 1) to assert the frame is
// adequate for THIS canvas: the title fits the width at its scaled size, the title/source bands
// are reserved, and a source is present (the rule that catches a video with no attribution).
export interface MapFramingResult {
  violations: string[];
}

export function checkMapFraming(input: {
  width: number;
  height: number;
  title?: string;
  description?: string;
  hasSource?: boolean;
  titleLines?: number;
  legendHeight?: number;
  titleHeightPx?: number;
}): MapFramingResult {
  const v: string[] = [];
  const titleLines = input.titleLines ?? 2;
  const frame = resolveMapFrame(input.width, input.height, {
    titleLines,
    hasDescription: !!input.description?.trim(),
    legendHeight: input.legendHeight,
    titleHeightPx: input.titleHeightPx,
  });
  const title = input.title?.trim() ?? "";
  if (title) {
    const titlePx = title.length * frame.type.title * CHAR_W;
    const capacity = (input.width - 2 * FRAME_INSET) * titleLines;
    if (titlePx > capacity)
      v.push(
        `title too long for the ${input.width}×${input.height} frame — it overruns the title band`,
      );
  }
  if (frame.pad.top <= 0) v.push("no title band reserved");
  if (input.titleHeightPx && frame.pad.top < input.titleHeightPx)
    v.push(
      "title overruns the reserved top band — data would sit under the title",
    );
  if (frame.pad.bottom <= 0) v.push("no source band reserved");
  if (input.hasSource === false)
    v.push("source band empty — every format must cite the source");
  if (input.legendHeight && frame.pad.bottom < input.legendHeight)
    v.push(
      "legend overruns the reserved bottom band — data would sit under the legend",
    );
  return { violations: v };
}

export function checkDotDensityConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    hasCategories: boolean;
    hasCategoryLegend: boolean;
    hasDotValueLegend: boolean;
    boundsNonEmpty: boolean;
    totalDots: number;
    capped: boolean;
    mapStyle?: string;
    // Univariate-only single-source check (multivariate colours come from the QUALITATIVE
    // per-category palette, not this token — see below). Both optional so existing callers
    // that don't supply them are unaffected; when both are present the assertion applies.
    univariateDotColor?: string;
    univariateSwatchColor?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (!input.hasDotValueLegend)
    v.push(
      "dot-density needs a '1 dot = N' legend — the count is undecodable without it",
    );
  if (input.hasCategories && !input.hasCategoryLegend)
    v.push(
      "multivariate dot-density needs a category legend — the colour code is undecodable",
    );
  if (!input.boundsNonEmpty)
    v.push("empty region bounds — basemap-fit impossible");
  if (input.totalDots < 1)
    v.push("no dots to place — all regions rounded to zero");
  if (
    input.mapStyle &&
    !(MAP_STYLES as readonly string[]).includes(input.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  // Univariate single-source parity: the legend "1 dot = N" swatch must paint the SAME colour
  // as the dots on the map. A future one-sided theme edit (dot fixed, swatch left stale, or
  // vice versa) fails here instead of only being caught at render-verify.
  if (
    !input.hasCategories &&
    input.univariateDotColor !== undefined &&
    input.univariateSwatchColor !== undefined &&
    input.univariateDotColor !== input.univariateSwatchColor
  )
    v.push(
      `dot-density legend swatch colour (${input.univariateSwatchColor}) must equal the univariate dot paint colour (${input.univariateDotColor}) — single-sourced token`,
    );
  return v;
}

export function checkLocatorConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    markerCount: number;
    labeledCount: number;
    hasCategories: boolean;
    hasLegend: boolean;
    boundsNonEmpty: boolean;
    mapStyle?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (input.markerCount < 1) v.push("no markers to place");
  if (input.labeledCount < input.markerCount)
    v.push(
      "markers are not all directly labeled — a locator's places must be named, not hover-only",
    );
  if (input.hasCategories && !input.hasLegend)
    v.push("categories present but no legend — the colour code is undecodable");
  if (!input.boundsNonEmpty)
    v.push("empty marker bounds — basemap-fit impossible");
  if (
    input.mapStyle &&
    !(MAP_STYLES as readonly string[]).includes(input.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  return v;
}

export function checkHexGridConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    hasBinLegend: boolean;
    hasAggregateLabel: boolean;
    cellCount: number;
    boundsNonEmpty: boolean;
    mapStyle?: string;
    // Threaded so the CVD-safety guardrail can validate the ramp the component
    // actually paints (hex-grid-geo.ts) — mirrors the choropleth call below. No
    // `scaleType` input: hex-grid always paints `HEX_GRID_SCALE_TYPE` ("sequential") — it
    // never reads a scaleType off its config (`HexGridConfigShape` has no such field), so
    // this guard must not either. A stray caller-supplied scaleType used to be able to
    // steer this check toward a ramp the renderer never paints (bug #6: false-refusal on
    // valid sequential data, or a clean pass for a diverging palette that then throws at
    // render time).
    palette?: string | string[];
    values?: number[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (!input.hasBinLegend)
    v.push(
      "hex-grid needs a sequential bin legend — the colour scale is undecodable without it",
    );
  if (!input.hasAggregateLabel)
    v.push(
      "hex-grid must label its aggregate (points per cell / sum / mean of what)",
    );
  if (input.cellCount < 1) v.push("no populated cells to draw");
  if (!input.boundsNonEmpty)
    v.push("empty grid bounds — basemap-fit impossible");
  // hex-grid paints resolvePalette(HEX_GRID_SCALE_TYPE, data.palette).ramp
  // (hex-grid-geo.ts) — pinned, never derived from config. Validate it — the custom-array
  // branch of resolvePalette (scale.ts:116-122) is the only way a non-CVD ramp reaches
  // produce.
  try {
    const ramp = resolvePalette(HEX_GRID_SCALE_TYPE, input.palette).ramp;
    v.push(
      ...checkPaletteConformance({
        scaleType: HEX_GRID_SCALE_TYPE,
        scaleColors: ramp,
        values: input.values,
        paletteName:
          typeof input.palette === "string" ? input.palette : undefined,
      }),
    );
  } catch (e) {
    v.push(`palette: ${(e as Error).message}`);
  }
  if (
    input.mapStyle &&
    !(MAP_STYLES as readonly string[]).includes(input.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  return v;
}

export function checkCartogramConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    values: { id: string; value: number }[];
    variant?: "scaled" | "grid";
    valueLabel?: string;
    mapStyle?: string;
    features: GeoJSON.FeatureCollection;
    bins?: number;
    scaleType?: "sequential" | "diverging";
    // Threaded so the CVD-safety guardrail can validate the ramp the component
    // actually paints (reuses `layout.bins`/`layout.scaleType` below — no extra compute).
    palette?: string | string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );

  // Compute the layout to inspect structural properties.
  let layout: ReturnType<typeof computeCartogram> | null = null;
  try {
    layout = computeCartogram(
      {
        variant: input.variant,
        values: input.values,
        valueLabel: input.valueLabel,
        bins: input.bins,
        scaleType: input.scaleType,
        palette: input.palette,
      },
      input.features,
    );
  } catch {
    v.push("cartogram: layout computation failed — no region matched the data");
    return v;
  }

  if (!layout.valueLabel || !layout.valueLabel.trim())
    v.push(
      "cartogram must label its value dimension (valueLabel is empty or missing)",
    );

  if (layout.bins.length < 1)
    v.push(
      "cartogram needs a sequential bin legend — the colour scale is undecodable without it",
    );

  // Validate the ramp the component actually paints — reuses layout.bins/layout.scaleType
  // (computed above), no extra compute. Mirrors the choropleth call at :191.
  v.push(
    ...checkPaletteConformance({
      scaleType: layout.scaleType,
      scaleColors: layout.bins.map((b) => b.color),
      values: input.values.map((x) => x.value),
      paletteName:
        typeof input.palette === "string" ? input.palette : undefined,
    }),
  );

  if (layout.cells.length < 1) v.push("no populated cells to draw");

  const [w, s, e, n] = layout.bounds;
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(e) ||
    !Number.isFinite(s) ||
    !Number.isFinite(n) ||
    w >= e ||
    s >= n
  )
    v.push("empty cartogram bounds — basemap-fit impossible");

  if (
    input.mapStyle &&
    !(MAP_STYLES as readonly string[]).includes(input.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  // For grid variant: assert all cells have identical degree-size (bbox width and height).
  // Geodesic area varies with latitude even for equal squares; degree-size is the correct invariant.
  if (layout.variant === "grid" && layout.cells.length > 1) {
    const eps = 1e-9;
    const [fw, fs0, fe, fn0] = bbox(layout.cells[0].feature);
    const refW = fe - fw;
    const refH = fn0 - fs0;
    const nonUniform = layout.cells.slice(1).some((c) => {
      const [cw, cs, ce, cn] = bbox(c.feature);
      return Math.abs(ce - cw - refW) > eps || Math.abs(cn - cs - refH) > eps;
    });
    if (nonUniform)
      v.push(
        "cartogram grid cells are not uniform in degree-size — all cells must share the same bbox width and height",
      );
  }

  return v;
}

// Higher-level route conformance: calls computeRoute internally (mirrors
// checkCartogramConformance). Takes the full RouteConfig + world boundaries
// GeoJSON, calls computeRoute, then asserts structural + L0 furniture rules.
// Returns string[] of violations (empty = passes).
export function checkRouteConfigConformance(
  config: RouteConfig,
  boundaries: GeoJSON.FeatureCollection,
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: config.title ?? "",
      description: config.description,
      source: config.source ?? {},
    },
    textColors,
  );

  if (
    config.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(config.mapStyle)
  )
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  // Require at least 2 route points before calling computeRoute.
  if (!Array.isArray(config.route) || config.route.length < 2) {
    v.push("route must have at least 2 [lon, lat] points");
    return v;
  }

  // Attempt layout computation — a throw means the geometry is unusable.
  let bounds: [number, number, number, number];
  try {
    const layout = computeRoute(config, boundaries);
    bounds = layout.bounds;
  } catch {
    v.push("route: layout computation failed — check route coordinates");
    return v;
  }

  // Bounds must be non-degenerate (non-zero extent in both axes).
  const [w, s, e, n] = bounds;
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(e) ||
    !Number.isFinite(s) ||
    !Number.isFinite(n) ||
    w >= e ||
    s >= n
  )
    v.push("empty route bounds — basemap-fit impossible");

  return v;
}
