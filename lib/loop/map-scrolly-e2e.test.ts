// A MAP-TRACK scrolly, walked through the assembler and the real scrolly producer, proving
// config.geometry actually reaches the built output.
//
// lib/loop/scrolly-e2e.test.ts already walks a scrolly end to end, but it builds
// `nativeType: "line"` — the CHART track (skills/scrolly hosts chart-native's beats-driven
// walk). That is exactly why the MAP track went untested: commit 7532fdc7 removed the four
// static `?raw` geojson imports from the scrolly map components (ScrollyMap.tsx et al.,
// replaced by a loud "config.geometry is required" throw) but skills/scrolly/scripts/produce.mjs
// never gained a resolution step to fill it — and the gap was masked by the SAME commit
// hand-inlining a 9 304-line TopoJSON into skills/scrolly/assets/sample-data/scrolly.json, a
// fixture no real production run ever supplies. This file never reads that fixture — it builds a
// config the way a real run does, through assembleScrolly → assembleMapNative (lib/loop/assemble/
// scrolly.ts, map-native.ts), the same path lib/loop/produce.ts's `produce()` verb takes.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { freezeInput } from "./freeze";
import { produce, elementRenderDir } from "./produce";
import { validateSourcePolicy } from "../source/policy";
import type { RunManifest } from "./manifest";

// Real ISO-A3 rows against the shipped "world" (natural-earth-admin-0) basemap — the exact
// GeographyRef shape lib/loop/assemble/map-native.test.ts's own REGION_BRIEF fixture uses, so a
// choropleth reaching assembleMapNative resolves the same shipped geography a real orient stage
// would have measured.
const ELECTRICITY_ACCESS = "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19";

function seedRun(runDir: string): RunManifest {
  const src = join(runDir, "electricity-access.csv");
  writeFileSync(src, ELECTRICITY_ACCESS);
  return {
    runId: "map-scrolly-e2e",
    schemaVersion: 5,
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
          confirmedTakeaway: "Electricity access is lowest across the Sahel",
          altInsight: "A map of Africa shaded darkest across the Sahel band",
          unit: "%",
        },
        proposal: {
          options: [
            {
              id: "choropleth-scrolly",
              nativeType: "choropleth",
              engine: "map-native",
              format: "scrolly",
              why: "a map whose story unfolds region by region as the reader scrolls",
            },
          ],
          excluded: [],
          chosenId: "choropleth-scrolly",
        },
      },
    ],
    events: [],
  };
}

test("a map-track scrolly's source declaration clears the loop's source policy", () => {
  // Millisecond-fast, no filesystem/subprocess — the same shape scrolly-e2e.test.ts's own
  // always-on check asserts, so a refusal downstream in the async proof is never this.
  const seed = seedRun(mkdtempSync(join(tmpdir(), "map-scrolly-e2e-fixture-")));
  const verdict = validateSourcePolicy(seed.sources?.data, {
    mode: seed.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

test(
  "a map-track scrolly built through the assembler resolves real geometry, not the fixture's",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "map-scrolly-e2e-"));
    try {
      const run = seedRun(runDir);

      const produced = await produce(run, run.elements[0]!, runDir);
      if (!produced.ok) throw new Error(`produce: ${produced.message}`);

      const outDir = elementRenderDir(runDir, "e1");
      const configPath = join(outDir, "config.json");
      // A minimal local shape for the two fields this assertion reads — `lib` has no
      // dependency on `topojson-specification`/`@types/topojson-specification` (only the
      // skills that render TopoJSON do), and lib/geo/subset.ts's own post-condition check
      // uses the same "shape only what you read" convention rather than pulling in the
      // full Topology type for one file.
      const config = JSON.parse(readFileSync(configPath, "utf8")) as {
        geometry?: { type?: string; objects?: Record<string, unknown> };
        type?: string;
      };

      expect(config.type).toBe("choropleth");
      expect(config.geometry?.type).toBe("Topology");
      expect(
        Object.keys(config.geometry?.objects ?? {}).length,
      ).toBeGreaterThan(0);

      const artifactPath = join(outDir, "scrolly.html");
      expect(readFileSync(artifactPath, "utf8").length).toBeGreaterThan(0);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  20 * 60 * 1000,
);
