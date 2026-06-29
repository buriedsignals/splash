import type { ChoroplethData } from "./choropleth-geo";

export type ChoroplethConfigShape = ChoroplethData & {
  basemap: string;
  title: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
};

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
