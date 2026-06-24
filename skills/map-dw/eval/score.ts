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
  basemap: string;
  maxWarnings?: number;
}

// Deterministic, network-free gate for a produced choropleth MapSpec.
export function scoreMapSpec(spec: unknown, expect: MapExpectation): MapScore {
  const notes: string[] = [];

  const v = validateMapSpec(spec);
  const validates = v.ok;
  if (!v.ok) notes.push("invalid: " + v.errors.join("; "));

  const s = (spec ?? {}) as Record<string, unknown>;

  const basemapKnown = KNOWN_BASEMAPS.has(expect.basemap);
  if (!basemapKnown)
    notes.push(`basemap ${expect.basemap} not in known allowlist`);
  if (validates && s.basemap !== expect.basemap)
    notes.push(`basemap ${s.basemap} differs from expected ${expect.basemap}`);

  let keyBound = false;
  if (typeof s.data === "string" && s.data.includes(",")) {
    const cols = dataShape(s.data).columns;
    keyBound =
      typeof s.regionKey === "string" &&
      typeof s.valueColumn === "string" &&
      cols.includes(s.regionKey) &&
      cols.includes(s.valueColumn);
  }
  if (!keyBound) notes.push("regionKey/valueColumn not bound to data columns");

  const conformanceOk = v.ok && v.warnings.length <= (expect.maxWarnings ?? 0);
  if (v.ok && !conformanceOk) notes.push("warnings: " + v.warnings.join("; "));

  const basemapMatches = validates && s.basemap === expect.basemap;
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
