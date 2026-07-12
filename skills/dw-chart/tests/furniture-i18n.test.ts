import { describe, it, expect } from "bun:test";
import { specToMetadata, SOURCE_LABELS } from "../src/spec-to-metadata";
import type { ChartSpec } from "../src/chart-spec";
import {
  assertLocalizedSourceMetadata,
  localizedSourceViolations,
} from "../src/furniture-i18n";

// The i18n furniture GATE (P5): localization is APPLIED by specToMetadata (the
// annotate.notes route, mirrored from map-dw), but until now nothing ASSERTED it —
// a regression re-adding the native describe.source-name for a French chart would
// ship a double/English "Source:" caption with a clean exit. These tests pin the
// invariant the gate enforces at produce-time, BEFORE any Datawrapper API call.
const spec: ChartSpec = {
  type: "d3-lines",
  title: "Le chomage est au plus bas depuis cinq ans",
  data: "year,value\n2018,5.1\n2023,3.7",
  baseColor: "#0072B2",
  source: { name: "INSEE", url: "https://insee.fr" },
  altInsight: "Le taux passe de 5,1 % en 2018 a 3,7 % en 2023",
};

// Derived from the exported table — the gate and the mapper must share the exact
// label bytes (never a re-typed literal; the fr spacing before the colon is
// whatever the table says it is).
const FR_LINE = `${SOURCE_LABELS.fr} INSEE`;

describe("localizedSourceViolations — the pure invariant", () => {
  it("passes the real mapper output for a French spec (notes carry the line, native fields blank)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    expect(localizedSourceViolations(patch, { ...spec, lang: "fr" })).toEqual(
      [],
    );
  });

  it("flags a native source-name re-added on a French chart (the double-caption regression)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    patch.metadata.describe["source-name"] = "INSEE";
    const v = localizedSourceViolations(patch, { ...spec, lang: "fr" });
    expect(v.length).toBe(1);
    expect(v[0]).toContain("source-name");
  });

  it("flags a native source-url re-added on a French chart", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    patch.metadata.describe["source-url"] = "https://insee.fr";
    const v = localizedSourceViolations(patch, { ...spec, lang: "fr" });
    expect(v.length).toBe(1);
    expect(v[0]).toContain("source-url");
  });

  it("flags missing localized notes on a French chart (the English-furniture regression)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    patch.metadata.annotate.notes = "";
    const v = localizedSourceViolations(patch, { ...spec, lang: "fr" });
    expect(v.length).toBe(1);
    expect(v[0]).toContain(FR_LINE);
  });

  it("accepts notes that COMPOSE the localized line with more text (the documented seam)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    patch.metadata.annotate.notes = `${FR_LINE} — donnees provisoires`;
    expect(localizedSourceViolations(patch, { ...spec, lang: "fr" })).toEqual(
      [],
    );
  });

  it("does not apply to English (the native DW caption is already correct there)", () => {
    const patch = specToMetadata({ ...spec, lang: "en" });
    expect(
      (patch.metadata.describe as Record<string, unknown>)["source-name"],
    ).toBe("INSEE");
    expect(localizedSourceViolations(patch, { ...spec, lang: "en" })).toEqual(
      [],
    );
  });

  it("does not apply to an absent or unknown lang (English-furniture fallback)", () => {
    const patch = specToMetadata(spec);
    expect(localizedSourceViolations(patch, spec)).toEqual([]);
    const patchEs = specToMetadata({ ...spec, lang: "es" });
    expect(localizedSourceViolations(patchEs, { ...spec, lang: "es" })).toEqual(
      [],
    );
  });

  it("applies to German and Italian (every non-English row of the locale table)", () => {
    const de = specToMetadata({ ...spec, lang: "de" });
    de.metadata.describe["source-name"] = "Destatis";
    expect(localizedSourceViolations(de, { ...spec, lang: "de" }).length).toBe(
      1,
    );
    const it_ = specToMetadata({ ...spec, lang: "it" });
    it_.metadata.annotate.notes = "";
    expect(localizedSourceViolations(it_, { ...spec, lang: "it" }).length).toBe(
      1,
    );
  });

  it("resolves a regional tag to its base language (fr-CH gates like fr)", () => {
    const patch = specToMetadata({ ...spec, lang: "fr-CH" });
    patch.metadata.describe["source-name"] = "INSEE";
    expect(
      localizedSourceViolations(patch, { ...spec, lang: "fr-CH" }).length,
    ).toBe(1);
  });

  it("passes a French chart with NO source at all (nothing to localize)", () => {
    const noSource: ChartSpec = { ...spec, lang: "fr" };
    delete (noSource as { source?: unknown }).source;
    const patch = specToMetadata(noSource);
    expect(localizedSourceViolations(patch, noSource)).toEqual([]);
  });
});

describe("assertLocalizedSourceMetadata — the fail-hard wrapper", () => {
  it("throws with every violation listed", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    patch.metadata.describe["source-name"] = "INSEE";
    patch.metadata.annotate.notes = "";
    expect(() =>
      assertLocalizedSourceMetadata(patch, { ...spec, lang: "fr" }),
    ).toThrow(/source-name/);
    expect(() =>
      assertLocalizedSourceMetadata(patch, { ...spec, lang: "fr" }),
    ).toThrow(/i18n furniture gate/);
  });

  it("does not throw on the untampered mapper output", () => {
    const patch = specToMetadata({ ...spec, lang: "fr" });
    expect(() =>
      assertLocalizedSourceMetadata(patch, { ...spec, lang: "fr" }),
    ).not.toThrow();
  });
});
