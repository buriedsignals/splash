import { dataShape } from "../../dw-chart/src/csv";
import {
  normalizeNumberFormat,
  isPercentScaleMismatch,
  numericValuesOf,
} from "../../dw-chart/src/chart-spec";
import { validJoinKeysFor, regionCountFor } from "./basemap-keys";
import { columnValues } from "./join-match";

export interface GradientStop {
  color: string; // hex
  position: number; // 0..1
}

// Below this marker-extent span (degrees, max of lat/lon range), a locator is
// sub-national / regional: map-dw's generalized basemap can render inland places
// offshore at that zoom, so map-native (MapTiler, auto-fit, accurate coast) is the
// correct producer. Mirrors suggest-chart's sub-national point-map rule.
export const REGIONAL_EXTENT_DEG = 12;

// SPARSE BASEMAP SUBSET (choropleth routing guardrail — QA case: the 7 provinces of
// Veneto mapped on the FULL-Italy provinces basemap rendered an illegible micro-cluster
// in one corner, the rest of the country grey). Signal: unique data regions vs the
// basemap's recorded region count (BASEMAP_REGION_COUNTS). Both bounds must hold to warn:
// - Fraction < 0.1: below one filled region in ten the map reads as an empty basemap
//   with a data speck. Calibrated on real cases — the Veneto bug (7 of 127 Italian
//   provinces ≈ 5.5%) must warn; the verified-legit floor must NOT: 6 of 47 European
//   sovereign states ≈ 12.8% (eu-renewables eval case) and 6 of 51 US states ≈ 11.8%
//   (us-broadband eval case), both curated with maxWarnings:0, and 8 of 26 swiss cantons
//   ≈ 31% (Wave 4 deficit-cantons, render-verified legitimate).
// - Rows < 20: a subset this small reads as hand-picked; at ≥ 20 rows the dataset is
//   deliberate broad coverage even on a huge basemap (300 of 3291 US counties is a real
//   county dataset, not a mis-fit micro-cluster).
// A WARNING, never an error — a sparse choropleth is sometimes intended; the fix is a
// ROUTING preference (fitted/region-scoped basemap, or map-native's auto-fit), enforced
// editorially by suggest-chart's basemap-fit rule, not mechanically here.
export const SPARSE_REGION_FRACTION = 0.1;
export const SPARSE_MAX_ROWS = 20;

// Light → Okabe-Ito blue, colorblind-safe sequential. Used when no colorScale is given.
export const DEFAULT_BLUE: GradientStop[] = [
  { color: "#deebf7", position: 0 },
  { color: "#0072B2", position: 1 },
];

// Okabe-Ito palette, cycled for locator-map markers when none is given. CVD-safe.
export const OKABE_ITO: string[] = [
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#009E73", // green
  "#CC79A7", // pink
  "#E69F00", // orange
  "#56B4E9", // sky
];

export interface ChoroplethMapSpec {
  mapType: "choropleth";
  basemap: string; // DW basemap id, e.g. "world-2019"
  mapKeyAttr: string; // basemap join key, e.g. "DW_STATE_CODE"
  regionKey: string; // data column with region codes → axes.keys
  valueColumn: string; // data column with values → axes.values
  data: string; // CSV text
  title: string; // the insight, sentence case
  intro?: string;
  colorScale?: GradientStop[]; // sequential light→dark stops
  numberFormat?: string;
  // A literal value UNIT suffix, appended VERBATIM (include a leading space unless it
  // should hug the number: " mm" → "624 mm", "%" → "70%"). It shows on the LEGEND without
  // multiplying — unlike a "%" numberFormat token, so a percentage-point value 9.8 renders
  // "9.8%" with unit:"%" and a plain numberFormat, not the "0%" a "%" token gives 0.098.
  // ONE source per surface (probe matrix 2026-07-12): the legend takes it from the value
  // column's `data.column-format` append — suppressed when the numberFormat token already
  // renders the same "%" (emitting both shipped a doubled "10% %" legend) — and the hover
  // tooltip takes it from the baked body template (`%REGION_VALUE%<unit>`; %REGION_VALUE%
  // is substituted raw and never applies any append/format). Do NOT double-declare the
  // percent: either unit:"%" or a "%" numberFormat token is enough on its own.
  unit?: string;
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight
  /** CADRAGE delivery channel (Gate 1, Q3), same free-form field as ChartSpec.channel:
   *  fixes the static PNG export box (feed/square → 1:1, social/vertical → 9:16,
   *  web/article → 16:9, the default). Resolved fail-closed via the shared channel
   *  model (skills/atelier/src/channel.ts); absent → article-web. Does not affect the
   *  interactive embed (that stays fluid). */
  channel?: string;
  /** Deliverable language (BCP-47, e.g. "fr", "fr-CH"). Sets the DW chart `language`, so
   *  Datawrapper localizes the legend + tooltip numbers — French groups thousands with a
   *  narrow no-break space ("17 600"), not the English comma. Absent → DW default (en-US). */
  lang?: string;
  /** Newsroom house hue (#rrggbb), set by the profile merge (skills/atelier/src/brand-profile.ts).
   *  When present and `colorScale` is NOT given, the gradient is derived from it via `houseRamp`
   *  (skills/map-native/src/theme/house-ramp.ts) — a monotonic-luminance, CVD-safe sequential
   *  ramp of the house hue. An explicit colorScale always wins. */
  brandHue?: string;
  /** Ordered newsroom brand palette (#rrggbb); unused by choropleth (see brandHue) but carried
   *  on every map spec by the profile merge. */
  brandPalette?: string[];
  /** True when the colour actually applied is a genuine house colour (set by the profile merge).
   *  Informational only on map-dw — this producer has no rendered-contrast a11y guard to
   *  downgrade (see produce.ts); spec-level CVD-safety already comes free from houseRamp. */
  brandExplicit?: boolean;
}

// Symbol map (d3-maps-symbols): proportional circles placed by lat/lon.
// Value→SIZE is `axes.area` (the load-bearing field the spike was missing); value→COLOUR
// is `axes.values`. The basemap is a backdrop, not a join target (no map-key-attr).
export interface SymbolMapSpec {
  mapType: "symbol";
  basemap: string; // backdrop basemap, must fit the points' extent
  latColumn: string; // data column with latitudes → axes.lat
  lonColumn: string; // data column with longitudes → axes.lon
  sizeColumn: string; // data column driving symbol SIZE → axes.area
  colorColumn?: string; // data column driving symbol COLOUR → axes.values (defaults to sizeColumn)
  labelColumn?: string; // data column shown as the tooltip title (e.g. place name); defaults to sizeColumn
  data: string; // CSV text
  title: string;
  intro?: string;
  colorScale?: GradientStop[]; // sequential light→dark stops (same colorscale field as choropleth)
  numberFormat?: string;
  // Literal value UNIT suffix (e.g. "M" / "%"). For symbol maps it is baked into the hover
  // tooltip body template after the FORMAT() expression — suppressed when the numberFormat
  // token already renders the same "%" (single-source rule, see ChoroplethMapSpec.unit).
  // Fixes the tooltip showing a bare "85" with no "M". (`describe.number-append` is dead on
  // maps — probed live 2026-07-12 — and is not emitted.)
  unit?: string;
  source?: { name: string; url?: string };
  altInsight: string;
  /** CADRAGE delivery channel (Gate 1, Q3) — see ChoroplethMapSpec.channel. */
  channel?: string;
  /** Deliverable language (BCP-47) — localizes the DW chart's legend + tooltip numbers. */
  lang?: string;
  /** Newsroom house hue — see ChoroplethMapSpec.brandHue. Symbol maps are not producible by
   *  map-dw (see the hard error below), so this field is carried but unconsumed here. */
  brandHue?: string;
  /** Ordered newsroom brand palette — see ChoroplethMapSpec.brandPalette. */
  brandPalette?: string[];
  /** See ChoroplethMapSpec.brandExplicit. */
  brandExplicit?: boolean;
}

export interface LocatorMarker {
  lng: number; // longitude (WGS-84)
  lat: number; // latitude (WGS-84)
  label: string; // marker title
  color?: string; // hex; defaults to Okabe-Ito cycle
}

// Locator map (locator-map): a few point markers on an OSM backdrop. No data table,
// no value join — markers live in metadata.visualize.markers as {lng,lat} points.
export interface LocatorMapSpec {
  mapType: "locator";
  markers: LocatorMarker[]; // ≥1 point markers
  title: string;
  intro?: string;
  view?: { center: [number, number]; zoom: number }; // optional explicit framing; else auto-fit
  source?: { name: string; url?: string };
  altInsight: string;
  /** CADRAGE delivery channel (Gate 1, Q3) — see ChoroplethMapSpec.channel. */
  channel?: string;
  /** Deliverable language (BCP-47) — localizes the DW chart furniture ("Source", attribution). */
  lang?: string;
  /** Newsroom house hue — see ChoroplethMapSpec.brandHue. Unused directly by the locator (its
   *  markers cycle brandPalette instead), but carried on every map spec by the profile merge. */
  brandHue?: string;
  /** Ordered newsroom brand palette (#rrggbb). A marker with no explicit `color` cycles this
   *  palette first (falling back to OKABE_ITO beyond its length) instead of OKABE_ITO alone —
   *  see spec-to-map-metadata.ts locatorMetadata. An explicit marker colour always wins. */
  brandPalette?: string[];
  /** See ChoroplethMapSpec.brandExplicit. */
  brandExplicit?: boolean;
}

export type MapSpec = ChoroplethMapSpec | SymbolMapSpec | LocatorMapSpec;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isStop(v: unknown): v is GradientStop {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as GradientStop).color === "string" &&
    typeof (v as GradientStop).position === "number"
  );
}

function validateColorScale(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length < 2) {
    errors.push("colorScale must be an array of at least 2 stops");
    return;
  }
  let prev = -Infinity;
  for (const stop of value) {
    if (!isStop(stop)) {
      errors.push("colorScale stop must be { color, position }");
      continue;
    }
    if (!HEX.test(stop.color))
      errors.push(`colorScale colour "${stop.color}" must be a hex value`);
    if (stop.position < 0 || stop.position > 1)
      errors.push(`colorScale position ${stop.position} must be within 0..1`);
    if (stop.position < prev)
      errors.push("colorScale positions must be ascending");
    prev = stop.position;
  }
}

function requireStrings(
  s: Record<string, unknown>,
  fields: string[],
  errors: string[],
): void {
  for (const f of fields) {
    if (typeof s[f] !== "string" || !(s[f] as string).trim())
      errors.push(`${f} is required`);
  }
}

function columnsOf(s: Record<string, unknown>, errors: string[]): string[] {
  if (typeof s.data === "string" && s.data.includes(",")) {
    return dataShape(s.data).columns;
  }
  errors.push("data must be CSV text");
  return [];
}

function requireColumn(
  s: Record<string, unknown>,
  field: string,
  columns: string[],
  errors: string[],
): void {
  const v = s[field];
  if (
    typeof v === "string" &&
    v.trim() &&
    columns.length &&
    !columns.includes(v)
  )
    errors.push(
      `${field} "${v}" is not a column of the data [${columns.join(",")}]`,
    );
}

// CHOROPLETH JOIN KEY (the silent grey-map bug). `mapKeyAttr` must be one of the basemap's
// real join keys (`GET /v3/basemaps/{id}` → `meta.keys[].value`, recorded in basemap-keys.ts).
// A wrong key silently fails the region join and ships a fully grey, DATALESS map — Datawrapper
// still publishes it, so nothing surfaces until someone reads the PNG. Verified: `ISO_A3` on
// `world-2019` (real alpha-3 key `DW_STATE_CODE`) matched 0 rows and rendered all-grey. When the
// basemap is known, reject the wrong key HARD and suggest the valid ones; an unknown basemap is
// left to the produce-time dataless-join guard (join-match.ts).
function validateJoinKey(s: Record<string, unknown>, errors: string[]): void {
  const basemap = typeof s.basemap === "string" ? s.basemap.trim() : "";
  const key = typeof s.mapKeyAttr === "string" ? s.mapKeyAttr.trim() : "";
  if (!basemap || !key) return; // absence already flagged by requireStrings
  const valid = validJoinKeysFor(basemap);
  if (!valid) return; // unknown basemap — covered by the produce-time dataless guard
  if (!valid.includes(key))
    errors.push(
      `mapKeyAttr "${key}" is not a join key of basemap "${basemap}" — the region join ` +
        `would fail and the map would render fully grey with no data. Valid keys: ${valid.join(", ")}`,
    );
}

// SPARSE-SUBSET WARNING (see the SPARSE_REGION_FRACTION rationale above). Counts UNIQUE
// region values so duplicate rows never inflate coverage. Skipped when the basemap has no
// recorded region count (same defer-to-produce posture as the join-key check) or when the
// regionKey resolves no values (the column-binding error is already flagged).
function warnSparseBasemapSubset(
  s: Record<string, unknown>,
  warnings: string[],
): void {
  const basemap = typeof s.basemap === "string" ? s.basemap.trim() : "";
  const totalRegions = regionCountFor(basemap);
  if (!totalRegions) return;
  if (typeof s.data !== "string" || typeof s.regionKey !== "string") return;
  const covered = new Set(columnValues(s.data, s.regionKey)).size;
  if (covered === 0) return;
  if (
    covered / totalRegions < SPARSE_REGION_FRACTION &&
    covered < SPARSE_MAX_ROWS
  )
    warnings.push(
      `data covers ${covered} of ~${totalRegions} regions of basemap "${basemap}" ` +
        `(${Math.round((covered / totalRegions) * 100)}%) — a sub-national subset renders as an ` +
        `illegible micro-cluster on the full basemap. Prefer a basemap fitted to the covered ` +
        `region (a region-scoped DW basemap) or escalate to map-native, which auto-fits the ` +
        `viewport to the data extent. A deliberately sparse national map may keep this basemap ` +
        `(warning only).`,
    );
}

function warnLabelTitle(
  s: Record<string, unknown>,
  columns: string[],
  warnings: string[],
): void {
  if (typeof s.title === "string" && s.title.trim()) {
    const cols = columns.map((c) => c.toLowerCase());
    if (cols.includes(s.title.trim().toLowerCase()))
      warnings.push(
        "title looks like a label, not an insight — state what the data shows",
      );
  }
}

// Mirrors dw-chart's chart-spec.ts guard: a printf/Python-style token (".0f%") is NOT a
// valid Datawrapper numeral.js token — Datawrapper silently ignores it and the legend
// falls back to a plain unformatted number ("15…70" instead of "15%…70%"), indistinguishable
// from the field having been dropped. Reject the un-mappable; warn when auto-corrected.
function validateNumberFormat(
  s: Record<string, unknown>,
  valueColumn: string | undefined,
  errors: string[],
  warnings: string[],
): void {
  const v = s.numberFormat;
  if (typeof v !== "string" || !v.trim()) return;
  try {
    const norm = normalizeNumberFormat(v);
    if (norm !== v.trim())
      warnings.push(
        `numberFormat "${v}" is not a Datawrapper token — normalised to "${norm}". Emit a numeral token (e.g. "0.0", "0%").`,
      );
  } catch (e) {
    errors.push((e as Error).message);
  }
  // PERCENT-SCALE MISMATCH (#1c). A "%" token on 0–1 fractional data renders "0%" in
  // Datawrapper (it appends the sign, never multiplies). Use `unit:"%"` on percentage-point
  // data instead. Verified via a rendered export.
  if (
    typeof valueColumn === "string" &&
    typeof s.data === "string" &&
    s.data.includes(",") &&
    isPercentScaleMismatch(v, numericValuesOf(s.data, [valueColumn]))
  )
    warnings.push(
      `numberFormat "${v}" is a percent token but ${valueColumn} looks like 0–1 fractions — Datawrapper appends "%" WITHOUT multiplying, so these render "0%". Pre-scale to percentage points (e.g. 0.29 → 29), or use unit:"%" with a plain format.`,
    );
}

export function validateMapSpec(
  input: unknown,
):
  | { ok: true; spec: MapSpec; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== "object")
    return { ok: false, errors: ["spec must be an object"] };
  const s = input as Record<string, unknown>;

  if (
    s.mapType !== "choropleth" &&
    s.mapType !== "symbol" &&
    s.mapType !== "locator"
  ) {
    return {
      ok: false,
      errors: ['mapType must be "choropleth", "symbol", or "locator"'],
    };
  }

  if (s.mapType === "choropleth") {
    requireStrings(
      s,
      [
        "basemap",
        "mapKeyAttr",
        "regionKey",
        "valueColumn",
        "title",
        "altInsight",
      ],
      errors,
    );
    const columns = columnsOf(s, errors);
    requireColumn(s, "regionKey", columns, errors);
    requireColumn(s, "valueColumn", columns, errors);
    validateJoinKey(s, errors);
    validateColorScale(s.colorScale, errors);
    warnSparseBasemapSubset(s, warnings);
    warnLabelTitle(s, columns, warnings);
    validateNumberFormat(
      s,
      typeof s.valueColumn === "string" ? s.valueColumn : undefined,
      errors,
      warnings,
    );
  } else if (s.mapType === "symbol") {
    requireStrings(
      s,
      [
        "basemap",
        "latColumn",
        "lonColumn",
        "sizeColumn",
        "title",
        "altInsight",
      ],
      errors,
    );
    const columns = columnsOf(s, errors);
    requireColumn(s, "latColumn", columns, errors);
    requireColumn(s, "lonColumn", columns, errors);
    requireColumn(s, "sizeColumn", columns, errors);
    if (s.colorColumn !== undefined)
      requireColumn(s, "colorColumn", columns, errors);
    if (s.labelColumn !== undefined)
      requireColumn(s, "labelColumn", columns, errors);
    validateColorScale(s.colorScale, errors);
    warnLabelTitle(s, columns, warnings);
    validateNumberFormat(
      s,
      typeof s.sizeColumn === "string" ? s.sizeColumn : undefined,
      errors,
      warnings,
    );
    // #2 — LABELED (static legibility) → HARD ERROR, route to map-native. Datawrapper symbol
    // maps are hover-only: the proportional circles carry NO always-visible name/value labels,
    // and Datawrapper offers no "label symbols by column" / "show values on symbols" option (the
    // "labels by column" feature is choropleth-only — verified against the Datawrapper Academy
    // "Customizing your symbol map" docs, which describe symbol labels as tooltip-only). map-dw
    // is the STATIC map producer, and every atelier channel requires a claim-carrying static
    // deliverable (the social static, or the article-web a11y static fallback). So a map-dw
    // symbol map can ONLY ship mute, unlabeled circles — no place identifiable, no value
    // readable without hover — which violates the project rule "the data must be legible WITHOUT
    // hover" (render-confirmed on aeroports-trafic + frontaliers-dots: not one symbol labeled).
    // It is therefore NOT a producible map-dw output: route it to map-native, whose
    // proportional-symbol renderer directly labels the top-N circles by name + value and whose
    // conformance asserts `labeled` (skills/map-native/src/conformance.ts checkSymbolConformance).
    errors.push(
      'symbol maps are not producible by map-dw: Datawrapper draws proportional circles with values on HOVER only (no always-visible data-value labels on symbols — Datawrapper Academy), so the owned static PNG ships mute, unlabeled circles that cannot carry the claim without interaction; route to map-native instead (producer:"map-native", type:"symbol"), which directly labels the top-N circles by name + value',
    );
  } else {
    // locator
    requireStrings(s, ["title", "altInsight"], errors);
    if (!Array.isArray(s.markers) || s.markers.length < 1) {
      errors.push("markers must be a non-empty array of {lng,lat,label}");
    } else {
      s.markers.forEach((m, i) => {
        const mk = m as Record<string, unknown>;
        if (!mk || typeof mk !== "object") {
          errors.push(`markers[${i}] must be an object`);
          return;
        }
        if (typeof mk.lng !== "number" || mk.lng < -180 || mk.lng > 180)
          errors.push(`markers[${i}].lng must be a longitude in -180..180`);
        if (typeof mk.lat !== "number" || mk.lat < -90 || mk.lat > 90)
          errors.push(`markers[${i}].lat must be a latitude in -90..90`);
        if (typeof mk.label !== "string" || !mk.label.trim())
          errors.push(`markers[${i}].label is required`);
        if (
          mk.color !== undefined &&
          (typeof mk.color !== "string" || !HEX.test(mk.color))
        )
          errors.push(`markers[${i}].color must be a hex value`);
      });
      // Extent guardrail: steer a sub-national / regional locator to map-native,
      // whose basemap renders coastlines accurately at that zoom (map-dw's does not).
      const lats = (s.markers as Array<Record<string, unknown>>)
        .map((m) => m?.lat)
        .filter((v): v is number => typeof v === "number");
      const lngs = (s.markers as Array<Record<string, unknown>>)
        .map((m) => m?.lng)
        .filter((v): v is number => typeof v === "number");
      if (lats.length >= 1 && lngs.length >= 1) {
        const span = Math.max(
          Math.max(...lats) - Math.min(...lats),
          Math.max(...lngs) - Math.min(...lngs),
        );
        if (span < REGIONAL_EXTENT_DEG)
          warnings.push(
            `locator extent spans ${span.toFixed(1)}° — map-dw's basemap generalizes coastlines at this zoom (inland places can render offshore); prefer map-native for a sub-national / regional point map`,
          );
      }
    }
  }

  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as MapSpec, warnings };
}
