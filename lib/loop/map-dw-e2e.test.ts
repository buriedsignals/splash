// THE PROOF that the loop builds map-dw — the hosted Datawrapper map — and not merely that an
// assembler compiles a spec for it. A real produce() call, a real chart created and PUBLISHED on
// Datawrapper, and the delivered PNG measured off its own bytes. Modelled on
// lib/loop/map-e2e.test.ts, which does the same for map-native.
//
// OPT-IN (SPLASH_DW_E2E=1) and it needs DATAWRAPPER_API_TOKEN (the worktree's .env symlink
// carries it; bun test loads .env automatically). Every run CREATES and PUBLISHES a real chart
// on the account — that is the point, and also why it is not in `bun run check`.
//
// TWO CONTROLS, on the two things map-dw actually delivers:
//   - static      → an OWNED PNG, its IHDR read back from the file and compared to the channel's
//                   media size. That half goes through produce(), the loop's own verb.
//   - interactive → a HOSTED embed and no owned media at all. Its positive control is the
//                   publicUrl RESOLVING over https. That half goes through render() — the verb
//                   produce itself delegates to — because produce() cannot carry a hosted-only
//                   delivery today: artifactFileFor (lib/loop/produce.ts) looks for an
//                   `interactive.html` among the delivered files, and a hosted map delivers no
//                   files, so produce() answers `engine-failed: no interactive artifact in the
//                   delivery`. Proving the URL one layer down is the honest way to prove it at
//                   all; see .sdd/task-13-report.md.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { render } from "../core/verbs";
import { freezeInput } from "./freeze";
import { assembleMapDw } from "./assemble/map-dw";
import { validateMapSpec } from "../../skills/map-dw/src/map-spec";
import { normalizeChannel, renderSize } from "../../skills/splash/src/channel";
import type { ProductionBrief } from "../core/production-brief";
import type { RunManifest } from "./manifest";

const RUN_IT = process.env.SPLASH_DW_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// Enough rows that the map reads as a map, all of them ISO alpha-3 — the code space
// world-2019's DW_STATE_CODE key holds (probed live; see assemble/map-dw.ts's table).
const ACCESS_CSV =
  "country,access\nCHE,100\nFRA,100\nDEU,100\nESP,100\nITA,100\n" +
  "TCD,11\nNER,19\nMLI,53\nBFA,19\nSSD,8\nCOD,21\nNGA,60";

const FIXTURE_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A world map shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: ACCESS_CSV,
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
  geo: {
    column: "country",
    basemap: "world",
    matched: 12,
    total: 12,
    unmatched: [],
  },
};

// ALWAYS ON — the ~3ms half. The fixture handed to the ENGINE'S OWN validator: no token, no
// network, no chart created. This is what stops the proof rotting silently while nobody runs it
// (spec 2026-07-27-proofs-run §4).
test("the fixture assembles into a spec the engine accepts, before any API call", () => {
  const r = assembleMapDw(FIXTURE_BRIEF);
  if (!r.ok) throw new Error(r.message);
  const v = validateMapSpec(r.value);
  expect(v.ok ? [] : v.errors).toEqual([]);
});

function runFor(runDir: string, format: "static" | "interactive"): RunManifest {
  const src = join(runDir, "data.csv");
  writeFileSync(src, ACCESS_CSV);
  return {
    runId: "map-dw-e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A run whose source is DECLARED — an undeclared one is refused before any render, and
    // that refusal is the source policy working, not this proof failing.
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
        rowCount: 12,
      },
      supportsPoint: false,
      geo: {
        column: "country",
        basemap: "world",
        matched: 12,
        total: 12,
        unmatched: [],
      },
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: FIXTURE_BRIEF.angle.confirmedTakeaway,
          altInsight: FIXTURE_BRIEF.angle.altInsight,
          unit: "%",
        },
        proposal: {
          options: [
            {
              id: "map-dw-choropleth",
              nativeType: "choropleth",
              engine: "map-dw",
              format,
              why: "one value per country, shaded",
            },
          ],
          excluded: [],
          chosenId: "map-dw-choropleth",
        },
      },
    ],
    events: [],
  };
}

proof(
  "a chosen hosted choropleth produces a real PNG at the channel's size",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-map-dw-e2e-"));
    try {
      const run = runFor(runDir, "static");
      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      // THE POSITIVE CONTROL — the PNG's own header, not the producer's report.
      const png = readFileSync(join(runDir, result.value.artifact!.path));
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      const box = renderSize(normalizeChannel("article-web"));
      // Printed, not only asserted: a proof run is read by a human, and the delivered numbers
      // are what makes "it passed" checkable rather than believed.
      console.log(
        `[map-dw-e2e] IHDR ${width}x${height} — article-web media box ${box.width}x${box.height}`,
      );
      // ±2px, not ±0: Datawrapper rasterizes at 2x, so map-dw requests HALF the channel box and
      // article-web's odd height (675 → 338 requested → 676 delivered) comes back a pixel over.
      // That is the same tolerance the engine's own assertRenderedSize applies.
      expect(Math.abs(width - box.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(height - box.height)).toBeLessThanOrEqual(2);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);

proof(
  "the interactive form is a LIVE Datawrapper map — the published URL resolves",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-map-dw-embed-"));
    try {
      const assembled = assembleMapDw({
        ...FIXTURE_BRIEF,
        format: "interactive",
      });
      if (!assembled.ok) throw new Error(assembled.message);
      const r = await render({
        engine: "map-dw",
        spec: assembled.value,
        format: "interactive",
        channel: "article-web",
        outDir: join(runDir, "elements", "e1"),
        id: "e1",
      });
      expect(r.ok ? "delivered" : `${r.code}: ${r.message}`).toBe("delivered");
      if (!r.ok) return;

      // A hosted delivery owns no media — that is what "hosted" means, and asserting it here
      // keeps this proof honest about which half of map-dw it is proving.
      expect(r.value.form).toBe("hosted");
      expect(r.value.files).toEqual([]);

      // THE POSITIVE CONTROL — the URL is fetched, not merely well-formed. A published
      // Datawrapper map that 404s is exactly the failure a string check cannot see.
      const publicUrl = r.value.publicUrl!;
      expect(publicUrl).toMatch(/^https:\/\//);
      console.log(`[map-dw-e2e] published ${publicUrl}`);
      const res = await fetch(publicUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      expect(`${publicUrl} → ${res.status}`).toBe(`${publicUrl} → 200`);
      expect((await res.text()).length).toBeGreaterThan(500);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);
