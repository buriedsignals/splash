// THE PROOF that the loop builds a HOSTED Datawrapper chart — not that the assembler compiles a
// ChartSpec, but that a real produce() call reaches Datawrapper's API, publishes a chart, and
// brings back a PNG whose own bytes are the size the channel promised.
//
// OPT-IN (SPLASH_DW_E2E=1): every gated test here creates and PUBLISHES a real chart on the
// account behind DATAWRAPPER_API_TOKEN, and takes 10-40s of network to do it. Same discipline as
// map-e2e.test.ts and video-e2e.test.ts. `.env` at the repo root carries the token; Bun loads it.
//
// One file per proof, deliberately: the map-dw half of the DW surface has its own proof file, so
// the two never collide in one another's history.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { render } from "../core/verbs";
import { freezeInput } from "./freeze";
import { assembleDwChart } from "./assemble/dw-chart";
import { validateChartSpec } from "../../skills/dw-chart/src/chart-spec";
import { renderSize } from "../../skills/splash/src/channel";
import type { ProductionBrief } from "../core/production-brief";
import type { RunManifest } from "./manifest";

const RUN_IT = process.env.SPLASH_DW_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// column-chart, not d3-bars: the bar family is ROW-DRIVEN (skills/dw-chart/src/export-aspect.ts),
// so Datawrapper exports it at the channel WIDTH and a content-driven height — deliberately, to
// stop a pinned box cropping rows. A fixed-aspect type is what makes "the PNG is the channel's
// media size" a checkable statement at all.
const RECYCLING_CSV = "city,rate\nBasel,54\nZurich,49\nGeneva,41\nBern,38";

const FIXTURE_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "column-chart",
  format: "static",
  angle: {
    confirmedTakeaway:
      "Basel recycles more of its waste than any other Swiss city",
    altInsight:
      "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
    unit: "%",
    emphasis: "Basel",
  },
  dataCsv: RECYCLING_CSV,
  attribution: "Federal Statistical Office",
  sourceUrl:
    "https://www.bfs.admin.ch/bfs/en/home/statistics/territory-environment/waste-material-flows.html",
};

// ALWAYS ON — the ~3ms half. The fixture handed to the ENGINE'S OWN validator, no token, no
// network, no chart created. This is what stops this proof rotting silently, which is exactly how
// four earlier proofs came to be broken on main with nobody noticing (spec 2026-07-27-proofs-run
// §4). It is also the only half `bun run check` ever executes.
test("the fixture assembles into a spec the engine accepts, before any API call", () => {
  const r = assembleDwChart(FIXTURE_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const v = validateChartSpec(r.value);
  expect(v.ok ? v.warnings : v.errors).toEqual([]);
});

/** The run this proof produces from — article-web, because that is the channel dw-chart sizes
 *  against when nothing injects one onto the spec (see the note in the produce proof below). */
function chartRun(runDir: string, dataPath: string): RunManifest {
  return {
    runId: "dw-chart-e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, dataPath, "data") },
    // A run whose source is DECLARED — an undeclared one is refused before any API call, and that
    // refusal is the source policy working, not this proof failing.
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "Federal Statistical Office",
        url: "https://www.bfs.admin.ch/bfs/en/home/statistics/territory-environment/waste-material-flows.html",
      },
    },
    orient: {
      profile: {
        columns: ["city", "rate"],
        numericColumns: ["rate"],
        rowCount: 4,
      },
      supportsPoint: false,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway:
            "Basel recycles more of its waste than any other Swiss city",
          altInsight:
            "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
          unit: "%",
          emphasis: "Basel",
        },
        proposal: {
          options: [
            {
              id: "dw-column",
              nativeType: "column-chart",
              engine: "dw-chart",
              format: "static",
              why: "one value per city, ranked",
            },
          ],
          excluded: [],
          chosenId: "dw-column",
        },
      },
    ],
    events: [],
  };
}

proof(
  "a chosen Datawrapper column chart produces a real PNG at the channel's size",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-dw-chart-e2e-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, RECYCLING_CSV);
      const run = chartRun(runDir, src);

      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      // THE POSITIVE CONTROL — the PNG's own header, not the producer's report. Datawrapper
      // rasterizes its export at 2x, so dw-chart REQUESTS half the channel box and the delivered
      // file lands back on it (skills/dw-chart/src/export-aspect.ts DW_EXPORT_PIXEL_RATIO).
      const png = readFileSync(join(runDir, result.value.artifact!.path));
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      // ±2px, the same tolerance the engine's own assertRenderedSize allows: article-web's height
      // (675) is odd, so halving and doubling it back reaches 676 and never 675. A real aspect
      // mismatch is hundreds of pixels out and still fails here.
      const { width: w, height: h } = renderSize("article-web");
      expect(Math.abs(width - w)).toBeLessThanOrEqual(2);
      expect(Math.abs(height - h)).toBeLessThanOrEqual(2);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);

// THE OTHER HALF OF THE POSITIVE CONTROL: a hosted chart's deliverable is a URL, and a URL is
// only delivered if it RESOLVES. This drives the same contract call produce() makes internally
// (lib/core/verbs render), in the format where the hosted embed IS the artifact.
//
// Why it is not driven through produce(): a run records each element as a FILE it owns (the
// manifest's artifact slot requires a path), and a hosted delivery has none — so the loop declines
// dw-chart's interactive form up front (lib/loop/assemble/index.ts) rather than publishing a chart
// nothing can record. The spec is the same one produce() would hand over; what this proves is the
// half of the delivery the loop cannot keep yet, so the day it can, this URL is already known to
// resolve. See .sdd/task-12-report.md.
proof(
  "the hosted embed the same spec builds is a URL that actually resolves",
  async () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-dw-chart-hosted-"));
    try {
      const assembled = assembleDwChart(FIXTURE_BRIEF);
      expect(assembled.ok).toBe(true);
      if (!assembled.ok) return;

      const delivered = await render({
        engine: "dw-chart",
        spec: assembled.value,
        format: "interactive",
        channel: "article-web",
        outDir,
        id: "e1",
      });
      expect(
        delivered.ok ? "rendered" : `${delivered.code}: ${delivered.message}`,
      ).toBe("rendered");
      if (!delivered.ok) return;

      const url = delivered.value.publicUrl!;
      expect(url.startsWith("https://")).toBe(true);
      // RESOLVABLE, read off the network — a well-formed URL that 404s is not a delivery.
      const res = await fetch(url, { redirect: "follow" });
      expect(res.status).toBe(200);
      expect((await res.text()).toLowerCase()).toContain("<html");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  },
  180_000,
);
