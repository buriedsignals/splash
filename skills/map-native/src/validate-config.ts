import type { ChoroplethData } from "./choropleth-geo";
import { CAMERA_MODES, type CameraMode } from "./camera-mode";
import { MAP_STYLES } from "./route-geo";
import type { LocatorMarker } from "./locator-geo";
import { PALETTES, isCvdSafeRamp } from "./theme/scale";
import { BASEMAP_NAMES } from "./basemaps";
import { validateMapFilters, type MapFilter } from "./core/map-filter";

// Shared palette/scaleType validation for any config that carries a colour scale.
// Errors block: a scaleType must be known, a named palette must exist AND match the
// scaleType kind, a custom ramp must be CVD-safe (all colours vetted).
export function paletteErrors(s: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const scaleType =
    s.scaleType === undefined ? "sequential" : (s.scaleType as string);
  if (
    s.scaleType !== undefined &&
    !["sequential", "diverging"].includes(scaleType)
  )
    errors.push("scaleType must be one of: sequential, diverging");
  if (s.palette !== undefined) {
    if (typeof s.palette === "string") {
      const entry = PALETTES[s.palette];
      if (!entry) {
        errors.push(
          `palette "${s.palette}" is not in the registry (${Object.keys(PALETTES).join(", ")})`,
        );
      } else if (
        ["sequential", "diverging"].includes(scaleType) &&
        entry.kind !== scaleType
      ) {
        errors.push(
          `palette "${s.palette}" is ${entry.kind}, but scaleType is ${scaleType}`,
        );
      }
    } else if (Array.isArray(s.palette)) {
      if (!s.palette.every((c) => typeof c === "string"))
        errors.push("custom palette must be an array of hex strings");
      else if (!isCvdSafeRamp(s.palette as string[]))
        errors.push(
          "custom palette is not CVD-safe — use a registry palette or vetted colours",
        );
    } else {
      errors.push("palette must be a registry name or a custom ramp array");
    }
  }
  return errors;
}

export type ChoroplethConfigShape = ChoroplethData & {
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  cameraMode?: CameraMode;
  scaleType?: "sequential" | "diverging";
  // A named registry palette or a custom CVD-safe ramp (see theme/scale.ts).
  palette?: string | string[];
  // Narrative pattern hint (② sets it when routing a temporal/diffusion field):
  // "temporal" → tell the sequence (first → … → most recent), never "highest/
  // lowest"; "magnitude" → keep the ranking; "categorical" → ranking fallback.
  valueKind?: "temporal" | "magnitude" | "categorical";
  filters?: MapFilter[];
};

// Shared basemap validation — every map type must use a registered basemap.
function validateBasemap(basemap: unknown, errors: string[]): void {
  if (typeof basemap !== "string" || !basemap.trim())
    errors.push("basemap must be a non-empty string");
  else if (!BASEMAP_NAMES.includes(basemap))
    errors.push(
      `basemap "${basemap}" is not a shipped basemap — valid: ${BASEMAP_NAMES.join(", ")}`,
    );
}

// If a config declares a camera mode, it must be one the engine knows. (route-reveal
// is a valid mode that is not yet implemented — produce throws at render for it — but
// a typo'd mode is caught here, before render.)
function cameraModeError(s: Record<string, unknown>): string | null {
  if (s.cameraMode === undefined) return null;
  if (
    typeof s.cameraMode !== "string" ||
    !(CAMERA_MODES as readonly string[]).includes(s.cameraMode)
  )
    return `cameraMode must be one of: ${CAMERA_MODES.join(", ")}`;
  return null;
}

// Framework-free structural validation of the raw map-native config the suggester
// emits (pre-render — no MapTiler / geojson needed). Errors block; warnings flag the
// furniture standard (title + description + source).
export function validateChoroplethConfig(
  spec: unknown,
):
  | { ok: true; spec: ChoroplethConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  const regionKey = typeof s.regionKey === "string" ? s.regionKey.trim() : "";
  const valueField =
    typeof s.valueField === "string" ? s.valueField.trim() : "";
  if (!regionKey) errors.push("regionKey must be a non-empty string");
  if (!valueField) errors.push("valueField must be a non-empty string");
  validateBasemap(s.basemap, errors);
  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  const cmErr = cameraModeError(s);
  if (cmErr) errors.push(cmErr);
  errors.push(...paletteErrors(s));

  if (
    s.valueKind !== undefined &&
    !["temporal", "magnitude", "categorical"].includes(s.valueKind as string)
  )
    errors.push("valueKind must be one of: temporal, magnitude, categorical");

  const rows = s.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push("rows must be a non-empty array");
  } else if (regionKey && valueField) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown> | null;
      if (!row || typeof row !== "object") {
        errors.push(`row ${i} is not an object`);
        continue;
      }
      if (!(regionKey in row)) errors.push(`row ${i} missing "${regionKey}"`);
      if (!(valueField in row)) {
        errors.push(`row ${i} missing "${valueField}"`);
      } else if (
        typeof row[valueField] !== "number" ||
        Number.isNaN(row[valueField])
      ) {
        errors.push(`row ${i} "${valueField}" must be numeric`);
      }
    }
  }

  const rowsForFilters = Array.isArray(s.rows)
    ? (s.rows as Record<string, unknown>[])
    : [];
  const fr = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    rowsForFilters,
  );
  if (!fr.ok) errors.push(...fr.errors);

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  // Furniture standard (warnings, not blockers).
  if (typeof s.description !== "string" || !s.description.trim())
    warnings.push(
      "missing description — a module should state what/when/where",
    );
  const src = s.source as { name?: string; url?: string } | undefined;
  if (!src?.name?.trim() || !src?.url?.trim())
    warnings.push(
      "missing source (name + url) — an embedded module should carry its own source",
    );

  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as ChoroplethConfigShape, warnings };
}

export type SymbolConfigShape = {
  type: "symbol";
  points: { lon: number; lat: number; value: number; label?: string }[];
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  cameraMode?: CameraMode;
  maxReveals?: number;
  filters?: MapFilter[];
};

// Framework-free structural validation of a symbol-map config (pre-render — no
// MapTiler needed). Errors block; warnings flag the furniture standard. Mirror of
// validateChoroplethConfig for the point case (lat/lon, no region join).
export function validateSymbolConfig(
  spec: unknown,
):
  | { ok: true; spec: SymbolConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  validateBasemap(s.basemap, errors);
  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  const cmErr = cameraModeError(s);
  if (cmErr) errors.push(cmErr);

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  const points = s.points;
  if (!Array.isArray(points) || points.length === 0) {
    errors.push("points must be a non-empty array");
  } else {
    for (let i = 0; i < points.length; i++) {
      const p = points[i] as Record<string, unknown> | null;
      if (!p || typeof p !== "object") {
        errors.push(`point ${i} is not an object`);
        continue;
      }
      const lon = p.lon;
      const lat = p.lat;
      const value = p.value;
      if (
        typeof lon !== "number" ||
        Number.isNaN(lon) ||
        lon < -180 ||
        lon > 180
      )
        errors.push(`point ${i} lon must be a number in [-180, 180]`);
      if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90)
        errors.push(`point ${i} lat must be a number in [-90, 90]`);
      if (typeof value !== "number" || Number.isNaN(value) || value < 0)
        errors.push(`point ${i} value must be a non-negative number`);
    }
  }

  const pointsForFilters = Array.isArray(s.points)
    ? (s.points as Record<string, unknown>[])
    : [];
  const frSymbol = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    pointsForFilters,
  );
  if (!frSymbol.ok) errors.push(...frSymbol.errors);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as SymbolConfigShape, warnings };
}

export type RouteConfigShape = {
  type: "route";
  route: [number, number][];
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
};

// Framework-free structural validation of a route-map config (pre-render — no
// MapTiler / geojson needed). Errors block; warnings flag the furniture standard.
// Mirrors validateSymbolConfig for the polyline case.
export function validateRouteConfig(
  spec: unknown,
):
  | { ok: true; spec: RouteConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  validateBasemap(s.basemap, errors);

  if (s.mapStyle !== undefined) {
    if (!(MAP_STYLES as readonly string[]).includes(s.mapStyle as string))
      errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  }

  const route = s.route;
  if (!Array.isArray(route) || route.length < 2) {
    errors.push("route must be an array of at least 2 [lon, lat] pairs");
  } else {
    for (let i = 0; i < route.length; i++) {
      const p = route[i] as unknown;
      if (!Array.isArray(p) || p.length < 2) {
        errors.push(`route[${i}] must be a [lon, lat] pair`);
        continue;
      }
      const [lon, lat] = p as [unknown, unknown];
      if (
        typeof lon !== "number" ||
        Number.isNaN(lon) ||
        lon < -180 ||
        lon > 180
      )
        errors.push(`route[${i}] lon must be a number in [-180, 180]`);
      if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90)
        errors.push(`route[${i}] lat must be a number in [-90, 90]`);
    }
  }

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as RouteConfigShape, warnings };
}

export type LocatorConfigShape = {
  type: "locator";
  markers: LocatorMarker[];
  basemap: string;
  markerStyle?: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  filters?: MapFilter[];
};

export function validateLocatorConfig(
  spec: unknown,
):
  | { ok: true; spec: LocatorConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  validateBasemap(s.basemap, errors);

  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  if (
    s.markerStyle !== undefined &&
    !["dot", "pin", "icon"].includes(s.markerStyle as string)
  )
    errors.push("markerStyle must be one of: dot, pin, icon");

  const markers = s.markers;
  if (!Array.isArray(markers) || markers.length === 0) {
    errors.push("markers must be a non-empty array");
  } else {
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i] as Record<string, unknown> | null;
      if (!m || typeof m !== "object") {
        errors.push(`marker ${i} is not an object`);
        continue;
      }
      if (
        typeof m.lon !== "number" ||
        Number.isNaN(m.lon) ||
        m.lon < -180 ||
        m.lon > 180
      )
        errors.push(`marker ${i} lon must be a number in [-180, 180]`);
      if (
        typeof m.lat !== "number" ||
        Number.isNaN(m.lat) ||
        m.lat < -90 ||
        m.lat > 90
      )
        errors.push(`marker ${i} lat must be a number in [-90, 90]`);
      if (typeof m.label !== "string" || !m.label.trim())
        errors.push(`marker ${i} label must be a non-empty string`);
    }
  }

  const markersForFilters = Array.isArray(s.markers)
    ? (s.markers as Record<string, unknown>[])
    : [];
  const frLocator = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    markersForFilters,
  );
  if (!frLocator.ok) errors.push(...frLocator.errors);

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as LocatorConfigShape, warnings };
}

export type DotDensityConfigShape = {
  type: "dot-density";
  regionKey: string;
  boundaries: string;
  rows: Record<string, string | number>[];
  valueField?: string;
  categories?: { field: string; label: string; color?: string }[];
  dotValue?: number;
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  filters?: MapFilter[];
};

export function validateDotDensityConfig(
  spec: unknown,
):
  | { ok: true; spec: DotDensityConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (typeof s.regionKey !== "string" || !s.regionKey.trim())
    errors.push("regionKey must be a non-empty string");
  validateBasemap(s.basemap, errors);
  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  const hasCats =
    Array.isArray(s.categories) && (s.categories as unknown[]).length > 0;
  const hasValue =
    typeof s.valueField === "string" && s.valueField.trim().length > 0;
  if (!hasCats && !hasValue)
    errors.push(
      "dot-density needs either valueField (univariate) or categories (multivariate)",
    );
  if (hasCats) {
    for (let i = 0; i < (s.categories as unknown[]).length; i++) {
      const c = (s.categories as Record<string, unknown>[])[i];
      if (!c || typeof c.field !== "string" || !c.field.trim())
        errors.push(`categories[${i}].field must be a non-empty string`);
      if (typeof c.label !== "string" || !c.label.trim())
        errors.push(`categories[${i}].label must be a non-empty string`);
    }
  }
  if (
    s.dotValue !== undefined &&
    (typeof s.dotValue !== "number" || !(s.dotValue > 0))
  )
    errors.push("dotValue must be a positive number");

  if (!Array.isArray(s.rows) || s.rows.length === 0)
    errors.push("rows must be a non-empty array");

  const ddRowsForFilters = Array.isArray(s.rows)
    ? (s.rows as Record<string, unknown>[])
    : [];
  const frDotDensity = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    ddRowsForFilters,
  );
  if (!frDotDensity.ok) errors.push(...frDotDensity.errors);
  if (Array.isArray(s.filters)) {
    for (const f of s.filters as MapFilter[]) {
      if (f.kind === "category")
        errors.push("category filters are not supported for dot-density maps");
    }
  }

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as DotDensityConfigShape, warnings };
}

export type HexGridConfigShape = {
  type: "hex-grid";
  points: { lon: number; lat: number; value?: number }[];
  binShape?: "hex" | "square";
  aggregate?: "count" | "sum" | "mean";
  cellSizeKm?: number;
  basemap: string;
  mapStyle?: string;
  // A named registry palette or a custom CVD-safe ramp (see theme/scale.ts); hex-grid is
  // always sequential, so no scaleType field — mirrors validateCartogramConfig's palette.
  palette?: string | string[];
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  filters?: MapFilter[];
};

export function validateHexGridConfig(
  spec: unknown,
):
  | { ok: true; spec: HexGridConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  validateBasemap(s.basemap, errors);
  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  errors.push(...paletteErrors(s));
  if (
    s.binShape !== undefined &&
    !["hex", "square"].includes(s.binShape as string)
  )
    errors.push("binShape must be one of: hex, square");
  const aggregate = (s.aggregate ?? "count") as string;
  if (!["count", "sum", "mean"].includes(aggregate))
    errors.push("aggregate must be one of: count, sum, mean");
  if (
    s.cellSizeKm !== undefined &&
    (typeof s.cellSizeKm !== "number" || !(s.cellSizeKm > 0))
  )
    errors.push("cellSizeKm must be a positive number");

  const points = s.points;
  if (!Array.isArray(points) || points.length === 0) {
    errors.push("points must be a non-empty array");
  } else {
    const needsValue = aggregate === "sum" || aggregate === "mean";
    for (let i = 0; i < points.length; i++) {
      const p = points[i] as Record<string, unknown> | null;
      if (!p || typeof p !== "object") {
        errors.push(`point ${i} is not an object`);
        continue;
      }
      if (
        typeof p.lon !== "number" ||
        Number.isNaN(p.lon) ||
        p.lon < -180 ||
        p.lon > 180
      )
        errors.push(`point ${i} lon must be a number in [-180, 180]`);
      if (
        typeof p.lat !== "number" ||
        Number.isNaN(p.lat) ||
        p.lat < -90 ||
        p.lat > 90
      )
        errors.push(`point ${i} lat must be a number in [-90, 90]`);
      if (needsValue && (typeof p.value !== "number" || Number.isNaN(p.value)))
        errors.push(
          `point ${i} needs a numeric value for aggregate "${aggregate}"`,
        );
    }
  }

  const hexPointsForFilters = Array.isArray(s.points)
    ? (s.points as Record<string, unknown>[])
    : [];
  const frHexGrid = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    hexPointsForFilters,
  );
  if (!frHexGrid.ok) errors.push(...frHexGrid.errors);

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as HexGridConfigShape, warnings };
}

export type CartogramConfigShape = {
  type: "cartogram";
  values: { id: string; value: number }[];
  variant?: "scaled" | "grid";
  scaleType?: "sequential" | "diverging";
  palette?: string | string[];
  bins?: number;
  valueLabel?: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  filters?: MapFilter[];
};

export function validateCartogramConfig(
  spec: unknown,
):
  | { ok: true; spec: CartogramConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (
    s.mapStyle !== undefined &&
    !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string)
  )
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  if (
    s.variant !== undefined &&
    !["scaled", "grid"].includes(s.variant as string)
  )
    errors.push("variant must be one of: scaled, grid");

  errors.push(...paletteErrors(s));

  if (s.bins !== undefined) {
    if (
      typeof s.bins !== "number" ||
      !Number.isInteger(s.bins) ||
      s.bins < 3 ||
      s.bins > 7
    )
      errors.push("bins must be an integer in 3..7");
  }

  const vals = s.values;
  if (!Array.isArray(vals) || vals.length === 0) {
    errors.push("values must be a non-empty array");
  } else {
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i] as Record<string, unknown> | null;
      if (!v || typeof v !== "object") {
        errors.push(`value ${i} is not an object`);
        continue;
      }
      if (typeof v.value !== "number" || Number.isNaN(v.value))
        errors.push(`value ${i} must have a numeric value field`);
    }
  }

  const cartogramRowsForFilters = Array.isArray(s.values)
    ? (s.values as Record<string, unknown>[])
    : [];
  const frCartogram = validateMapFilters(
    s.filters as MapFilter[] | undefined,
    cartogramRowsForFilters,
  );
  if (!frCartogram.ok) errors.push(...frCartogram.errors);

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as CartogramConfigShape, warnings };
}
