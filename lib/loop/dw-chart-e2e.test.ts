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
import { heightPolicyFor } from "./assemble";
import { isLoopBuildable } from "./buildable";
import { captureStep } from "./verify";
import { capture } from "../verify/capture";
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

// ---------------------------------------------------------------------------------------
// THE ROW-DRIVEN PROOF — the nine chart types the loop used to refuse.
//
// A Datawrapper ROW-DRIVEN export (the d3-bars family, dot / arrow / range plots, tables) lays
// every data row out as its own track, so its natural height grows with the row count — and DW
// does not SCALE those rows into a pinned box, it CROPS the ones that overflow. The engine
// therefore exports such a chart WIDTH-ONLY, on purpose, and the delivered PNG is correct at a
// height the destination box never asked for. The loop's capture layer read that as a
// `size-mismatch`, so the offer excluded all nine types rather than file a blocking finding on a
// correct artifact.
//
// This drives a REAL row-driven chart all the way through produce() and captureStep() and shows
// both verdicts on the SAME bytes: content-driven passes, pinned (the policy before this slice)
// fails. The PNG's own IHDR is the measurement — never the producer's report about it.
// ---------------------------------------------------------------------------------------

// Eight rows, not four: past a handful of bars the engine stops fitting a height at all
// (rowDrivenDeliveredHeight returns undefined) and lets DW grow the chart naturally, which is the
// shape the old check could not express and the one worth proving on real bytes.
const SHOPS_CSV =
  "city,shops\n" +
  "Zurich,412\nGeneva,388\nBasel,301\nLausanne,264\n" +
  "Bern,241\nWinterthur,188\nLucerne,164\nSt Gallen,147";

function barsRun(runDir: string, dataPath: string): RunManifest {
  return {
    runId: "dw-chart-rowdriven-e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, dataPath, "data") },
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
        columns: ["city", "shops"],
        numericColumns: ["shops"],
        rowCount: 8,
      },
      supportsPoint: false,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Zurich has more shops than any other Swiss city",
          altInsight:
            "A ranking of eight Swiss cities by shop count, Zurich highest at 412",
          unit: "shops",
          emphasis: "Zurich",
        },
        proposal: {
          options: [
            {
              id: "dw-bars",
              nativeType: "d3-bars",
              engine: "dw-chart",
              format: "static",
              why: "one value per city, ranked, with names long enough to read across",
            },
          ],
          excluded: [],
          chosenId: "dw-bars",
        },
      },
    ],
    events: [],
  };
}

// ALWAYS ON — the offer half. What the exclusion cost, in one assertion: nine types the loop
// refused to offer are buildable again, and each one declares the shape capture measures it by.
test("the nine row-driven Datawrapper types are offered again, each declaring a content-driven height", () => {
  for (const t of [
    "d3-bars",
    "d3-bars-grouped",
    "d3-bars-stacked",
    "d3-bars-split",
    "d3-bars-bullet",
    "d3-dot-plot",
    "d3-arrow-plot",
    "d3-range-plot",
    "tables",
  ]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(true);
    expect(heightPolicyFor("dw-chart", t)).toBe("content-driven");
  }
});

proof(
  "a real row-driven Datawrapper export passes capture on its width, and would have failed on its height",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-dw-rowdriven-e2e-"));
    try {
      const src = join(runDir, "shops.csv");
      writeFileSync(src, SHOPS_CSV);
      const run = barsRun(runDir, src);

      const produced = await produce(run, run.elements[0]!, runDir);
      expect(
        produced.ok ? "produced" : `${produced.code}: ${produced.message}`,
      ).toBe("produced");
      if (!produced.ok) return;

      // THE MEASUREMENT — the delivered file's own IHDR, width at bytes 16-19, height at 20-23.
      const artifactPath = join(runDir, produced.value.artifact!.path);
      const png = readFileSync(artifactPath);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      const box = renderSize("article-web");
      console.log(
        `[dw-chart-rowdriven-e2e] delivered ${width}x${height} against the ${box.width}x${box.height} article-web box`,
      );

      // The WIDTH is still the destination's, to the same ±2px the engine's own floor allows.
      expect(Math.abs(width - box.width)).toBeLessThanOrEqual(2);
      // And the HEIGHT is genuinely not the box's — without this the proof would be vacuous, a
      // relaxation demonstrated on an artifact that never needed it.
      expect(Math.abs(height - box.height)).toBeGreaterThan(2);

      // AFTER — the loop's own capture step, with the policy it now declares.
      const captured = await captureStep(run, produced.value, runDir);
      expect(
        captured.ok ? "captured" : `${captured.code}: ${captured.message}`,
      ).toBe("captured");
      if (!captured.ok) return;
      const slot = captured.value.capture!;
      const sizeCheck = slot.checks.find(
        (c) => c.id === "capture:size-matches-destination",
      )!;
      console.log(
        `[dw-chart-rowdriven-e2e] AFTER  ${sizeCheck.outcome} — ${sizeCheck.detail}`,
      );
      expect(sizeCheck.outcome).toBe("pass");
      expect(
        slot.checks.find((c) => c.id === "capture:fits-viewport")!.outcome,
      ).toBe("pass");
      expect(slot.images[0]!.heightPolicy).toBe("content-driven");

      // BEFORE — the SAME bytes, measured the way they were measured until this slice. A guard
      // that cannot fail is worse than no guard, so the proof shows the failure it stopped
      // producing rather than only the pass it now produces.
      const pinned = await capture({
        artifactPath,
        format: "static",
        channel: "article-web",
        outDir: join(runDir, "verify-pinned"),
        id: "e1",
      });
      if (!pinned.ok) throw new Error(pinned.message);
      const before = pinned.value.checks.find(
        (c) => c.id === "capture:size-matches-destination",
      )!;
      console.log(
        `[dw-chart-rowdriven-e2e] BEFORE ${before.outcome} — ${before.detail}`,
      );
      expect(before.outcome).toBe("fail");
      // TWICE, on one correct artifact: taller than its box, it also read as an overflow. Which is
      // why relaxing the size check alone would not have returned these types to the offer.
      const beforeFits = pinned.value.checks.find(
        (c) => c.id === "capture:fits-viewport",
      )!;
      console.log(
        `[dw-chart-rowdriven-e2e] BEFORE ${beforeFits.outcome} — ${beforeFits.detail}`,
      );
      expect(beforeFits.outcome).toBe("fail");
      // ...and the artifact under review is byte-identical in both verdicts.
      expect(pinned.value.images[0]!.artifactSha256).toBe(
        slot.images[0]!.artifactSha256,
      );
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);
