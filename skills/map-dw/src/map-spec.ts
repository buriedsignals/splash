import { dataShape } from "../../dw-chart/src/csv";

export interface GradientStop {
  color: string; // hex
  position: number; // 0..1
}

// Below this marker-extent span (degrees, max of lat/lon range), a locator is
// sub-national / regional: map-dw's generalized basemap can render inland places
// offshore at that zoom, so map-native (MapTiler, auto-fit, accurate coast) is the
// correct producer. Mirrors suggest-chart's sub-national point-map rule.
export const REGIONAL_EXTENT_DEG = 12;

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
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight
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
  source?: { name: string; url?: string };
  altInsight: string;
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
    validateColorScale(s.colorScale, errors);
    warnLabelTitle(s, columns, warnings);
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
