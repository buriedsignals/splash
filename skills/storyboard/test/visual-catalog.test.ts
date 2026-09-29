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
import { FORMS_BY_FORMAT } from "../../deliver/scripts/deliver.mjs";
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

// A minimal, self-contained catalogue — independent of which real row the authored source
// currently happens to mark proof-only (today, none of them are) — used to exercise the
// proof-only/selectable state rules directly rather than by poking a real treatment.
const SYNTHETIC_FORMATS = ["static", "web", "scrolly", "video"];
const SYNTHETIC_DELIVERY_FORM_IDS = [
  ...new Set(
    SYNTHETIC_FORMATS.flatMap((format) => Object.keys(FORMS_BY_FORMAT[format])),
  ),
];

function syntheticFormatPair(format: string) {
  const deliveryForms = Object.keys(FORMS_BY_FORMAT[format]);
  const sized = format === "static" || format === "video";
  return {
    id: `chart.${format}`,
    label: `Chart · ${format}`,
    medium: "chart",
    format,
    producer: "chart-beat",
    sizeRule: sized
      ? { kind: "required", options: ["landscape", "square", "portrait"] }
      : { kind: "none" },
    interaction: {
      kind: "none",
      promise:
        "A fixed chart that states its evidence without reader interaction.",
    },
    deliveryForms,
    requiredCapabilities: [],
    optionalCapabilities: [],
    runtimePrerequisites: ["bun"],
    browserPrerequisites: [],
  };
}

function buildSyntheticCatalog() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    schemaVersion: 1,
    catalogId: "synthetic-test-catalog",
    mediums: [
      {
        id: "chart",
        label: "Chart",
        description: "A drawn or plotted argument.",
      },
    ],
    formats: SYNTHETIC_FORMATS.map((format) => ({
      id: format,
      label: format,
      description: `The ${format} publication format.`,
    })),
    capabilities: [],
    deliveryForms: SYNTHETIC_DELIVERY_FORM_IDS.map((id) => ({
      id,
      label: id,
      requiredCapabilities: [],
    })),
    producers: [
      { id: "chart-beat", label: "Custom static chart", skill: "chart-beat" },
    ],
    delegatedProducers: [],
    formatPairs: SYNTHETIC_FORMATS.map(syntheticFormatPair),
    treatments: [
      {
        id: "chart.selectable-row",
        medium: "chart",
        label: "Selectable row",
        reference: "chart-beat/references/selectable-row.md",
        dataShape: { summary: "One synthetic measure.", requires: [] },
        formats: ["static"],
        state: "selectable",
      },
    ],
  };
}

describe("the canonical visual catalogue", () => {
  it("validates the authored source, covers every type sheet, and expands to stable unique options", () => {
    const catalog = readVisualCatalog();
    const entries = expandVisualCatalog(catalog);
    expect(catalog.treatments).toHaveLength(41);
    // 162: `chart/scrolly` is restored on all 32 chart treatments (owner decision, 2026-09-16) —
    // the scrolly skill now produces image, map, and chart scrollys, each one fixed stage with the
    // scroll interpolating the medium's states continuously rather than replaying its static form.
    expect(entries).toHaveLength(162);
    expect(new Set(entries.map((row) => row.id)).size).toBe(entries.length);
    expect(
      entries.every(
        (row) => row.producer?.skill && row.deliveryForms.length > 0,
      ),
    ).toBe(true);
    expect(
      entries.every(
        (row) => row.dataShape.summary && row.dataShape.requires.length > 0,
      ),
    ).toBe(true);
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
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.treatments[1].id = value.treatments[0].id;
        }),
      ),
    ).toThrow(/duplicate treatment id/);
  });

  it("rejects unknown producers", () => {
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.formatPairs[0].producer = "not-shipped";
        }),
      ),
    ).toThrow(/unknown producer/);
  });

  it("rejects missing delivery forms", () => {
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.formatPairs[0].deliveryForms.pop();
        }),
      ),
    ).toThrow(/delivery forms drifted/);
  });

  it("rejects unsupported publication formats", () => {
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.formatPairs[0].format = "print";
        }),
      ),
    ).toThrow(/unsupported format/);
  });

  it("rejects impossible size rules", () => {
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.formatPairs.find((row) => row.id === "chart.web").sizeRule = {
            kind: "required",
            options: ["landscape"],
          };
        }),
      ),
    ).toThrow(/impossible size rule/);
  });

  it("rejects proof-only rows without a concrete disabled reason", () => {
    const catalog = buildSyntheticCatalog();
    catalog.treatments.push({
      id: "chart.proof-only-row",
      medium: "chart",
      label: "Proof-only row",
      reference: "chart-beat/references/proof-only-row.md",
      dataShape: { summary: "One synthetic measure.", requires: [] },
      formats: ["static"],
      state: "proof-only",
      disabledReason: "no shipped implementation",
    });
    delete (catalog.treatments[1] as any).disabledReason;
    expect(() =>
      validateVisualCatalog(catalog, { checkFilesystem: false }),
    ).toThrow(/needs a disabled reason/);
  });

  it("rejects unknown fields instead of silently widening the contract", () => {
    expect(() =>
      validateVisualCatalog(
        changed((value) => {
          value.treatments[0].selectable = true;
        }),
      ),
    ).toThrow(/schema rejection.*Unrecognized key/);
  });

  it("never turns proof coverage into production authority", () => {
    // A row's proof (having shipped evidence somewhere) can never stand in for the
    // authored `state`: a selectable row that still carries a leftover disabled reason —
    // as if proof alone had promoted it out of proof-only without clearing that reason —
    // is rejected outright. Production authority is an explicit authored decision.
    const catalog = buildSyntheticCatalog();
    (catalog.treatments[0] as any).disabledReason = "no shipped implementation";
    expect(() =>
      validateVisualCatalog(catalog, { checkFilesystem: false }),
    ).toThrow(/must not carry a disabled reason/);
  });

  it("makes proof-only rows visible but impossible to select", () => {
    const catalog = buildSyntheticCatalog();
    catalog.treatments.push({
      id: "chart.proof-only-row",
      medium: "chart",
      label: "Proof-only row",
      reference: "chart-beat/references/proof-only-row.md",
      dataShape: { summary: "One synthetic measure.", requires: [] },
      formats: ["static"],
      state: "proof-only",
      disabledReason: "no shipped implementation",
    });
    const entries = expandVisualCatalog(catalog);
    const row = entries.find(
      (entry) => entry.treatmentId === "chart.proof-only-row",
    );
    // Visible: the row is still listed among the expanded options, not dropped.
    expect(row).toBeDefined();
    // Impossible to select: its state and disabled reason travel through unchanged, so a
    // consumer can render it but must refuse to let it be chosen.
    expect(row.state).toBe("proof-only");
    expect(row.disabledReason).toBe("no shipped implementation");
  });

  it("closes only map rows when the map capability is unavailable and names the remedy", () => {
    const rows = visualCatalogueEntries({
      capabilities: {
        map: { available: false, reason: "MAPTILER_KEY is not saved" },
      },
    });
    const selectableMaps = rows.filter(
      (row) => row.medium === "map" && row.state === "selectable",
    );
    const credentialIndependent = rows.filter(
      (row) => row.medium !== "map" && row.state === "selectable",
    );
    expect(
      selectableMaps.every(
        (row) => !row.available && row.reason === "MAPTILER_KEY is not saved",
      ),
    ).toBe(true);
    expect(
      selectableMaps.every((row) => row.repairAction === "open-readiness"),
    ).toBe(true);
    expect(credentialIndependent.every((row) => row.available)).toBe(true);
  });

  it("disables hosted delivery without disabling the underlying web visual", () => {
    const row = visualCatalogueEntries({
      capabilities: {
        hostedEmbed: {
          available: false,
          reason: "Cloudflare is not configured",
        },
      },
    }).find((entry) => entry.id === "chart.line.web");
    expect(row.available).toBe(true);
    expect(
      row.deliveryForms.find((form) => form.id === "owned-file").available,
    ).toBe(true);
    expect(row.deliveryForms.find((form) => form.id === "embed")).toMatchObject(
      {
        available: false,
        reason: "Cloudflare is not configured",
        repairAction: "open-readiness",
      },
    );
  });

  it("joins the maintained Datawrapper mapping without turning it into an implicit choice", () => {
    const row = visualCatalogueEntries({
      capabilities: {
        datawrapper: {
          available: false,
          reason: "DATAWRAPPER_TOKEN is not saved",
        },
      },
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
    expect(
      visualCatalogueEntries().find((entry) => entry.id === "chart.line.video")
        .producerAlternatives,
    ).toEqual([]);
  });

  it("gives the root and Storyboard consumers identical stable option IDs", () => {
    expect(visualCatalogueEntries().map((row) => row.id)).toEqual(
      expandVisualCatalog(readVisualCatalog()).map((row) => row.id),
    );
  });
});
