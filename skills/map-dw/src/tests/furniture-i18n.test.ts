import { describe, it, expect } from "bun:test";
import { specToMapMetadata, SOURCE_LABELS } from "../spec-to-map-metadata";
import type { MapSpec } from "../map-spec";
import {
  assertLocalizedSourceMetadata,
  localizedSourceViolations,
} from "../furniture-i18n";

// The i18n furniture GATE (P5), mirrored from dw-chart (same invariant, same
// per-skill duplication as SOURCE_LABELS itself): for a non-English deliverable the
// outgoing metadata must carry the localized "Source : X" line in annotate.notes and
// BLANK describe.source-name/source-url — asserted fail-hard at produce-time so a
// regression re-adding the native source field ships a failed run, not a double/
// English caption.
const base: MapSpec = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nSWE,70",
  title: "La Suede en tete",
  altInsight: "Suede au plus haut, France au plus bas",
  source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
};

// Derived from the exported table — the gate and the mapper share the exact bytes.
const FR_LINE = `${SOURCE_LABELS.fr} Eurostat`;

describe("localizedSourceViolations (map-dw) — the pure invariant", () => {
  it("passes the real mapper output for a French spec", () => {
    const patch = specToMapMetadata({ ...base, lang: "fr" });
    expect(localizedSourceViolations(patch, { ...base, lang: "fr" })).toEqual(
      [],
    );
  });

  it("flags a native source-name re-added on a French map (the double-caption regression)", () => {
    const patch = specToMapMetadata({ ...base, lang: "fr" });
    patch.metadata.describe["source-name"] = "Eurostat";
    const v = localizedSourceViolations(patch, { ...base, lang: "fr" });
    expect(v.length).toBe(1);
    expect(v[0]).toContain("source-name");
  });

  it("flags missing localized notes on a French map", () => {
    const patch = specToMapMetadata({ ...base, lang: "fr" });
    patch.metadata.annotate.notes = "";
    const v = localizedSourceViolations(patch, { ...base, lang: "fr" });
    expect(v.length).toBe(1);
    expect(v[0]).toContain(FR_LINE);
  });

  it("does not apply to English / absent / unknown lang (native caption already correct)", () => {
    const en = specToMapMetadata({ ...base, lang: "en" });
    expect(localizedSourceViolations(en, { ...base, lang: "en" })).toEqual([]);
    const none = specToMapMetadata(base);
    expect(localizedSourceViolations(none, base)).toEqual([]);
    const es = specToMapMetadata({ ...base, lang: "es" });
    expect(localizedSourceViolations(es, { ...base, lang: "es" })).toEqual([]);
  });

  it("covers every map type's describe block (symbol map, German)", () => {
    const symbol: MapSpec = {
      mapType: "symbol",
      basemap: "world-2019",
      title: "Die groessten Staedte",
      altInsight: "Tokio ist am groessten",
      source: { name: "UN DESA" },
      data: "name,lat,lon,value\nTokio,35.7,139.7,37400068",
      latColumn: "lat",
      lonColumn: "lon",
      sizeColumn: "value",
      labelColumn: "name",
      lang: "de",
    };
    const patch = specToMapMetadata(symbol);
    expect(localizedSourceViolations(patch, symbol)).toEqual([]);
    patch.metadata.describe["source-url"] = "https://example.org";
    expect(localizedSourceViolations(patch, symbol).length).toBe(1);
  });
});

describe("assertLocalizedSourceMetadata (map-dw) — the fail-hard wrapper", () => {
  it("throws listing the violation on a tampered French patch", () => {
    const patch = specToMapMetadata({ ...base, lang: "fr" });
    patch.metadata.describe["source-name"] = "Eurostat";
    expect(() =>
      assertLocalizedSourceMetadata(patch, { ...base, lang: "fr" }),
    ).toThrow(/i18n furniture gate/);
  });

  it("does not throw on the untampered mapper output", () => {
    const patch = specToMapMetadata({ ...base, lang: "fr" });
    expect(() =>
      assertLocalizedSourceMetadata(patch, { ...base, lang: "fr" }),
    ).not.toThrow();
  });
});
