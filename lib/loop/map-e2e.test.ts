import { fileArtifact } from "./manifest";
// THE PROOF that the loop builds map-native, not just that the assembler compiles a config for
// it. modelled on lib/loop/beats-render-proof.test.ts and lib/loop/multi-deliverable-e2e.test.ts:
// a real produce() call, driving a real MapLibre render, measured off the delivered PNG's own
// bytes.
//
// OPT-IN (SPLASH_MAP_E2E=1): a MapLibre static produce is 60-120s and flakes under contention —
// see lib/core/verbs (image-native's shared static path). Too slow and too fragile for every
// `bun test`; same discipline as video-e2e.test.ts and multi-deliverable-e2e.test.ts.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { assembleMapNative } from "./assemble/map-native";
import { mapNativeConfigErrors } from "../../skills/map-native/src/validate-config";
import type { ProductionBrief } from "../core/production-brief";
import type { RunManifest } from "./manifest";

const RUN_IT = process.env.SPLASH_MAP_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// Same fixture as lib/loop/assemble/map-native.test.ts's REGION_BRIEF: one numeric column (no
// takeaway-matching ambiguity), all four rows join the "world" basemap on ISO-A3 codes.
const ACCESS_CSV = "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19";

const FIXTURE_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A map of Africa shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: ACCESS_CSV,
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
  geo: {
    column: "country",
    geography: {
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    },
    matched: 4,
    total: 4,
    unmatched: [],
  },
};

// ALWAYS ON — the ~3ms half. The fixture handed to the ENGINE'S OWN validator, no browser, no
// network, no render. This is what stops this proof rotting silently, which is exactly how four
// earlier proofs came to be broken on main with nobody noticing (spec 2026-07-27-proofs-run §4).
test("the fixture assembles into a config the engine accepts, before any render", () => {
  const r = assembleMapNative(FIXTURE_BRIEF);
  expect(r.ok ? mapNativeConfigErrors(r.value) : [r.message]).toEqual([]);
});

proof(
  "a chosen choropleth produces a real PNG at the channel's size",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-map-e2e-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, ACCESS_CSV);

      // A run whose source is DECLARED — an undeclared one is refused before any render, and
      // that refusal is the source policy working, not this proof failing.
      const run: RunManifest = {
        runId: "map-e2e",
        schemaVersion: 6,
        route: "embed",
        channel: "article-web",
        input: { data: freezeInput(runDir, src, "data") },
        sources: {
          mode: "real",
          data: {
            kind: "public",
            label: "World Bank",
            url: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
          },
        },
        orient: {
          profile: {
            columns: ["country", "access"],
            numericColumns: ["access"],
            rowCount: 4,
          },
          supportsPoint: false,
          geo: {
            column: "country",
            geography: {
              origin: "shipped",
              set: "natural-earth-admin-0",
              level: "country",
              joinKey: "iso_a3",
              joinKeyFamily: "iso_a3",
            },
            matched: 4,
            total: 4,
            unmatched: [],
          },
        },
        elements: [
          {
            id: "e1",
            angle: {
              confirmedTakeaway:
                "Electricity access is lowest across the Sahel",
              altInsight:
                "A map of Africa shaded darkest across the Sahel band",
              unit: "%",
            },
            proposal: {
              options: [
                {
                  id: "map-choropleth",
                  nativeType: "choropleth",
                  engine: "map-native",
                  format: "static",
                  why: "one value per country, shaded",
                },
              ],
              excluded: [],
              chosenId: "map-choropleth",
            },
          },
        ],
        events: [],
      };

      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      // THE POSITIVE CONTROL — the PNG's own header, not the producer's report.
      const png = readFileSync(
        join(runDir, fileArtifact(result.value.artifact)!.path),
      );
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect([width, height]).toEqual([1200, 675]); // article-web media size, ±0 — IHDR is exact
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);
