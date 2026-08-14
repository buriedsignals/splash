import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  STORYBOARD_VISUAL_CATALOG_PATH,
  VISUAL_CATALOG_PATH,
  VISUAL_CATALOG_SCHEMA_PATH,
  buildStoryboardVisualCatalog,
  expandVisualCatalog,
  readVisualCatalog,
  validateVisualCatalog,
} from "../../../scripts/visual-catalog.mjs";
import {
  VISUAL_CATALOG_REVISION,
  visualCatalogueEntries,
} from "../scripts/propose.mjs";

const authored = JSON.parse(readFileSync(VISUAL_CATALOG_PATH, "utf8"));

function changed(mutator: (value: any) => void) {
  const value = structuredClone(authored);
  mutator(value);
  return value;
}

describe("the canonical visual catalogue", () => {
  it("validates the authored source, covers every type sheet, and expands to stable unique options", () => {
    const catalog = readVisualCatalog();
    const entries = expandVisualCatalog(catalog);
    expect(catalog.treatments).toHaveLength(41);
    expect(entries).toHaveLength(162);
    expect(new Set(entries.map((row) => row.id)).size).toBe(entries.length);
    expect(entries.every((row) => row.producer?.skill && row.deliveryForms.length > 0)).toBe(true);
    expect(entries.every((row) => row.dataShape.summary && row.dataShape.requires.length > 0)).toBe(true);
  });

  it("keeps the generated Storyboard derivative exact and carries one revision into its reader", () => {
    const built = `${JSON.stringify(buildStoryboardVisualCatalog(readVisualCatalog()), null, 2)}\n`;
    expect(readFileSync(STORYBOARD_VISUAL_CATALOG_PATH, "utf8")).toBe(built);
    expect(JSON.parse(built).catalogRevision).toBe(VISUAL_CATALOG_REVISION);
  });

  it("publishes a strict Draft 2020-12 machine schema", () => {
    const schema = JSON.parse(readFileSync(VISUAL_CATALOG_SCHEMA_PATH, "utf8"));
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.$defs.treatment.additionalProperties).toBe(false);
  });

  it("rejects duplicate IDs", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.treatments[1].id = value.treatments[0].id;
    }))).toThrow(/duplicate treatment id/);
  });

  it("rejects unknown producers", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.formatPairs[0].producer = "not-shipped";
    }))).toThrow(/unknown producer/);
  });

  it("rejects missing delivery forms", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.formatPairs[0].deliveryForms.pop();
    }))).toThrow(/delivery forms drifted/);
  });

  it("rejects unsupported publication formats", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.formatPairs[0].format = "print";
    }))).toThrow(/unsupported format/);
  });

  it("rejects impossible size rules", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.formatPairs.find((row) => row.id === "chart.web").sizeRule = {
        kind: "required",
        options: ["landscape"],
      };
    }))).toThrow(/impossible size rule/);
  });

  it("rejects proof-only rows without a concrete disabled reason", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      delete value.treatments.find((row) => row.id === "map.contour-isoline").disabledReason;
    }))).toThrow(/needs a disabled reason/);
  });

  it("rejects unknown fields instead of silently widening the contract", () => {
    expect(() => validateVisualCatalog(changed((value) => {
      value.treatments[0].selectable = true;
    }))).toThrow(/schema rejection.*Unrecognized key/);
  });

  it("never turns proof coverage into production authority", () => {
    const row = visualCatalogueEntries().find((entry) => entry.id === "chart.beeswarm.static");
    expect(row).toMatchObject({ state: "selectable", available: true, provenInThisFormat: false });
  });

  it("makes proof-only rows visible but impossible to select", () => {
    const rows = visualCatalogueEntries().filter((entry) => entry.treatmentId === "map.contour-isoline");
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => !row.available && row.cause === "proof-only" && row.repairAction === null)).toBe(true);
    expect(rows.every((row) => row.reason.includes("no shipped contour/isoline implementation"))).toBe(true);
  });

  it("closes only map rows when the map capability is unavailable and names the remedy", () => {
    const rows = visualCatalogueEntries({
      capabilities: { map: { available: false, reason: "MAPTILER_KEY is not saved" } },
    });
    const selectableMaps = rows.filter((row) => row.medium === "map" && row.state === "selectable");
    const credentialIndependent = rows.filter((row) => row.medium !== "map" && row.state === "selectable");
    expect(selectableMaps.every((row) => !row.available && row.reason === "MAPTILER_KEY is not saved")).toBe(true);
    expect(selectableMaps.every((row) => row.repairAction === "open-readiness")).toBe(true);
    expect(credentialIndependent.every((row) => row.available)).toBe(true);
  });

  it("disables hosted delivery without disabling the underlying web visual", () => {
    const row = visualCatalogueEntries({
      capabilities: { hostedEmbed: { available: false, reason: "Cloudflare is not configured" } },
    }).find((entry) => entry.id === "chart.line.web");
    expect(row.available).toBe(true);
    expect(row.deliveryForms.find((form) => form.id === "owned-file").available).toBe(true);
    expect(row.deliveryForms.find((form) => form.id === "embed")).toMatchObject({
      available: false,
      reason: "Cloudflare is not configured",
      repairAction: "open-readiness",
    });
  });

  it("joins the maintained Datawrapper mapping without turning it into an implicit choice", () => {
    const row = visualCatalogueEntries({
      capabilities: { datawrapper: { available: false, reason: "DATAWRAPPER_TOKEN is not saved" } },
    }).find((entry) => entry.id === "chart.line.web");
    expect(row.available).toBe(true);
    expect(row.producer.id).toBe("chart-web");
    expect(row.producerAlternatives).toEqual([
      expect.objectContaining({
        id: "datawrapper",
        available: false,
        reason: "DATAWRAPPER_TOKEN is not saved",
        providerTypes: ["d3-lines"],
        defaultProviderType: "d3-lines",
      }),
    ]);
    expect(visualCatalogueEntries().find((entry) => entry.id === "chart.line.video").producerAlternatives).toEqual([]);
  });

  it("gives the root and Storyboard consumers identical stable option IDs", () => {
    expect(visualCatalogueEntries().map((row) => row.id)).toEqual(
      expandVisualCatalog(readVisualCatalog()).map((row) => row.id),
    );
  });
});
