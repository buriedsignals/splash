import type { ChoroplethData } from "./choropleth-geo";
import { CAMERA_MODES, type CameraMode } from "./camera-mode";
import { MAP_STYLES } from "./route-geo";

export type ChoroplethConfigShape = ChoroplethData & {
  basemap: string;
  title: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
  cameraMode?: CameraMode;
};

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
  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");
  const cmErr = cameraModeError(s);
  if (cmErr) errors.push(cmErr);

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
  title: string;
  description?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
  cameraMode?: CameraMode;
  maxReveals?: number;
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

  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");
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

  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");

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
