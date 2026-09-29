import { describe, it, expect } from "bun:test";
import { rm, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "../scripts/produce.mjs";

// LIVE LANE. This creates, publishes and exports a real Datawrapper chart the moment
// DATAWRAPPER_TOKEN is in the environment, so it lives in a `*.live.test.ts`
// (scripts/test-lanes.mjs) and never runs with the fast lane. It is also the first real measurement
// of the export size `assertExportedSize` checks (see produce.test.ts, "one pinned export size").
// The offline orchestration tests, against a faked Datawrapper, stay in produce.test.ts.

// The same spec produce.test.ts builds its offline cases from, copied rather than imported:
// importing a test file would register its tests here too.
function baseSpec(overrides = {}) {
  return {
    takeaway: "Emissions fell",
    limits: "Territorial emissions only.",
    credit: "Global Carbon Budget",
    effectiveDate: "2024 data",
    language: "fr-FR",
    color: "#0B7A75",
    chartType: "d3-lines",
    format: "static",
    data: [
      { year: 1950, co2Mt: 10.25 },
      { year: 2024, co2Mt: 32.07 },
    ],
    ...overrides,
  };
}

describe("produce against the real Datawrapper API", () => {
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  if (!token) {
    console.log(
      "Skipping real produce() round-trip: DATAWRAPPER_TOKEN is not set in the environment.",
    );
  }

  it.skipIf(!token)(
    "should produce a real static PNG for a small spec with a range annotation",
    async () => {
      const outDir = await mkdtemp(join(tmpdir(), "dw-beat-real-"));
      try {
        const result = await produce(
          baseSpec({ rangeAnnotations: [{ value: 20, label: "reference" }] }),
          { outDir, name: "real", size: "landscape", token, fetchFn: fetch },
        );
        expect(result.format).toBe("static");
        const bytes = await readFile(result.pngPath);
        expect(bytes.length).toBeGreaterThan(0);
      } finally {
        await rm(outDir, { recursive: true, force: true });
      }
    },
    30000,
  );
});
