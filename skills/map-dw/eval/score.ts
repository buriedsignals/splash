import { validateMapSpec } from "../src/map-spec";
import { dataShape } from "../../dw-chart/src/csv";
import { KNOWN_BASEMAPS } from "./basemaps";

export interface MapScore {
  validates: boolean;
  basemapKnown: boolean;
  keyBound: boolean;
  conformanceOk: boolean;
  pass: boolean;
  notes: string[];
}

export interface MapExpectation {
  basemap?: string; // omitted for locator maps (no basemap)
  maxWarnings?: number;
}

// Deterministic, network-free gate for a produced MapSpec (choropleth | symbol | locator).
export function scoreMapSpec(spec: unknown, expect: MapExpectation): MapScore {
  const notes: string[] = [];

  const v = validateMapSpec(spec);
  const validates = v.ok;
  if (!v.ok) notes.push("invalid: " + v.errors.join("; "));

  const s = (spec ?? {}) as Record<string, unknown>;
  const mapType = s.mapType;

  // Locator maps have no basemap/data join — only the marker bindings (checked by validate).
  const needsBasemap = mapType !== "locator";

  let basemapKnown = true;
  let basemapMatches = true;
  if (needsBasemap) {
    basemapKnown = !!expect.basemap && KNOWN_BASEMAPS.has(expect.basemap);
    if (!basemapKnown)
      notes.push(`basemap ${expect.basemap} not in known allowlist`);
    basemapMatches = validates && s.basemap === expect.basemap;
    if (validates && !basemapMatches)
      notes.push(
        `basemap ${s.basemap} differs from expected ${expect.basemap}`,
      );
  }

  const cols =
    typeof s.data === "string" && s.data.includes(",")
      ? dataShape(s.data).columns
      : [];

  // keyBound = the value/geo bindings actually resolve to data (or markers for locator).
  let keyBound = false;
  if (mapType === "choropleth") {
    keyBound =
      typeof s.regionKey === "string" &&
      typeof s.valueColumn === "string" &&
      cols.includes(s.regionKey) &&
      cols.includes(s.valueColumn);
    if (!keyBound)
      notes.push("regionKey/valueColumn not bound to data columns");
  } else if (mapType === "symbol") {
    keyBound =
      typeof s.latColumn === "string" &&
      typeof s.lonColumn === "string" &&
      typeof s.sizeColumn === "string" &&
      cols.includes(s.latColumn as string) &&
      cols.includes(s.lonColumn as string) &&
      cols.includes(s.sizeColumn as string);
    if (!keyBound) notes.push("lat/lon/size columns not bound to data columns");
  } else if (mapType === "locator") {
    keyBound = Array.isArray(s.markers) && s.markers.length >= 1;
    if (!keyBound) notes.push("locator map has no markers");
  } else {
    notes.push("unknown mapType");
  }

  const conformanceOk = v.ok && v.warnings.length <= (expect.maxWarnings ?? 0);
  if (v.ok && !conformanceOk) notes.push("warnings: " + v.warnings.join("; "));

  return {
    validates,
    basemapKnown,
    keyBound,
    conformanceOk,
    pass:
      validates && basemapKnown && basemapMatches && keyBound && conformanceOk,
    notes,
  };
}
