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
import { sha256 } from "@noble/hashes/sha2.js";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { approve } from "./approve";
import { deliver } from "./deliver";
import { previewStep } from "./preview";
import { freezeInput } from "./freeze";
import { assembleDwChart } from "./assemble/dw-chart";
import { heightPolicyFor } from "./assemble";
import { isLoopBuildable } from "./buildable";
import { captureStep, reviewStep } from "./verify";
import { capture } from "../verify/capture";
import { hostedBindingDigest } from "../verify/hosted";
import type { ReviewRecord } from "../verify/types";
import type { Decor } from "../newsroom/decor";
import { validateChartSpec } from "../../skills/dw-chart/src/chart-spec";
import { renderSize } from "../../skills/splash/src/channel";
import type { ProductionBrief } from "../core/production-brief";
import {
  approvalSubjectOf,
  fileArtifact,
  isHostedArtifact,
  readManifest,
  writeManifest,
  type RunManifest,
} from "./manifest";

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
function chartRun(
  runDir: string,
  dataPath: string,
  format: "static" | "interactive" = "static",
): RunManifest {
  return {
    runId: "dw-chart-e2e",
    schemaVersion: 6,
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
              format,
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
      const png = readFileSync(
        join(runDir, fileArtifact(result.value.artifact)!.path),
      );
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
// only delivered if it RESOLVES.
//
// It goes through produce() — the loop's own verb — not through render() one layer down. It used
// to have to: a run recorded each element as a FILE it owns, so produce() answered `engine-failed:
// no interactive artifact in the delivery` for a chart Datawrapper had published perfectly well,
// and the loop declined the form up front rather than dead-ending on it. Proving the URL at
// render() was the honest way to prove it AT ALL, and it left the one thing that mattered unproven:
// that the RUN can keep the delivery.
//
// So this proof now goes the whole way round — produce, PERSIST the manifest, read it back off
// disk through the schema, and fetch the URL that survived the round trip. Reading it off the
// in-memory result would prove produce composed an object; reading it off the file proves the
// manifest can HOLD a hosted delivery, which is the capability this tranche adds.
proof(
  "a chosen Datawrapper interactive chart produces a HOSTED delivery the run records, and its URL resolves",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-dw-chart-hosted-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, RECYCLING_CSV);
      const run = chartRun(runDir, src, "interactive");

      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      // NO FILE WAS RECORDED, and that is the point: a hosted delivery owns no media, so the run
      // must not be holding a path it cannot open.
      expect(fileArtifact(result.value.artifact)).toBeUndefined();

      // THROUGH THE FILE. writeManifest runs the manifest's own invariants on the way out and
      // readManifest parses it back through the schema — a hosted record that could not survive
      // either would fail here rather than at some later reader's feet.
      const manifestPath = join(runDir, "run.json");
      writeManifest(manifestPath, {
        ...run,
        elements: [result.value],
      });
      const reopened = readManifest(manifestPath, runDir);
      const recorded = reopened.elements[0]!.artifact!;
      expect(isHostedArtifact(recorded)).toBe(true);
      if (!isHostedArtifact(recorded)) return;
      console.log(`[dw-chart-e2e] recorded hosted delivery ${recorded.url}`);

      // THE POSITIVE CONTROL — the URL off the MANIFEST is fetched, not merely well-formed. A
      // published Datawrapper chart that 404s is exactly the failure a string check cannot see.
      const res = await fetch(recorded.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      expect(`${recorded.url} \u2192 ${res.status}`).toBe(
        `${recorded.url} \u2192 200`,
      );
      expect((await res.text()).toLowerCase()).toContain("<html");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);

// THE WHOLE CHAIN, on a chart that lives at an address and nowhere else.
//
// Producing a hosted embed and recording its URL (the proof above) is where this used to stop:
// capture recorded a gap, preview refused by name, approve refused by name, deliver refused by
// name. Ten clean interactive rows were offerable, choosable and producible, and then could not be
// previewed, approved or delivered (docs/splash/capability-matrix-2026-07-28.md).
//
// This drives one real published chart all the way — produce → capture → review → preview →
// approve → deliver — with the positive control read off the REAL thing at each end:
//   · the captured image's OWN bytes (a png header read off the file capture wrote, and its
//     sha256, which is the pixel leg of the binding the approval then commits to);
//   · the delivered embed's URL, fetched 200 after the hand-over is recorded.
// Nothing here is read off a producer's report about itself.
proof(
  "a published Datawrapper interactive is captured, reviewed, previewed, approved and delivered",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-dw-chain-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, RECYCLING_CSV);
      const run = chartRun(runDir, src, "interactive");

      const produced = await produce(run, run.elements[0]!, runDir);
      expect(
        produced.ok ? "produced" : `${produced.code}: ${produced.message}`,
      ).toBe("produced");
      if (!produced.ok) return;
      const artifact = produced.value.artifact!;
      expect(isHostedArtifact(artifact)).toBe(true);
      if (!isHostedArtifact(artifact)) return;
      console.log(`[dw-chain-e2e] published ${artifact.url}`);

      // CAPTURE — the browser opens the ADDRESS. Everything measured below comes off the live
      // embed's own DOM, at the viewports article-web actually publishes at.
      const captured = await captureStep(run, produced.value, runDir);
      expect(
        captured.ok ? "captured" : `${captured.code}: ${captured.message}`,
      ).toBe("captured");
      if (!captured.ok) return;
      const slot = captured.value.capture!;
      // NOT a recorded gap: this is the branch that used to strand every embed.
      expect(slot.unsupported).toBeUndefined();
      expect(slot.images.length).toBeGreaterThan(0);
      const primary = slot.images.find((i) => i.breakpoint === "primary")!;
      expect(primary.artifactUrl).toBe(artifact.url);
      expect(primary.artifactPath).toBeUndefined();

      // THE POSITIVE CONTROL, half one — the captured image's OWN bytes. Read off disk and
      // re-hashed here, so the record's `sha256` is checked against the file rather than believed,
      // and the png header proves an image was really taken rather than a path recorded.
      const stillBytes = readFileSync(primary.path);
      expect(stillBytes.subarray(1, 4).toString("ascii")).toBe("PNG");
      const stillWidth = stillBytes.readUInt32BE(16);
      const stillHeight = stillBytes.readUInt32BE(20);
      expect(stillWidth).toBeGreaterThan(200);
      expect(stillHeight).toBeGreaterThan(100);
      const stillSha = Buffer.from(sha256(stillBytes)).toString("hex");
      expect(stillSha).toBe(primary.sha256);
      console.log(
        `[dw-chain-e2e] still ${stillWidth}x${stillHeight} ${primary.path} sha ${stillSha.slice(0, 12)}…`,
      );
      // ...and the subject the approval will bind to is exactly that address and those pixels.
      expect(approvalSubjectOf(captured.value)).toEqual({
        sha256: hostedBindingDigest(artifact.url, stillSha),
        url: artifact.url,
      });
      // The live embed carries the furniture the loop commissioned — read off the rendered page,
      // which is the measurement a recorded gap could never make.
      console.log(
        `[dw-chain-e2e] rendered title (${primary.titleSource}): ${primary.renderedTitle}`,
      );
      expect(primary.renderedTitle).toContain("Basel");
      const furniture = slot.checks.filter(
        (c) => c.id === "capture:furniture-present",
      );
      for (const c of furniture)
        console.log(
          `[dw-chain-e2e] furniture ${c.role}: ${c.outcome} — ${c.detail}`,
        );

      // REVIEW → PREVIEW → APPROVE. Every one of the three used to be a refusal here.
      const reviewed = await reviewStep(run, captured.value, runDir);
      expect(
        reviewed.ok ? "reviewed" : `${reviewed.code}: ${reviewed.message}`,
      ).toBe("reviewed");
      if (!reviewed.ok) return;
      const blocking = (reviewed.value.review as ReviewRecord).findings.filter(
        (f) => f.severity === "blocking" && f.status === "open",
      );
      for (const f of blocking)
        console.log(`[dw-chain-e2e] blocking: ${f.id} — ${f.summary}`);

      // WHICH blockers this embed really has, PINNED. Overriding `blocking.map(f => f.id)` would
      // clear whatever came back — a chart that renders blank at HTTP 200, a title divergence, a
      // `no-capture` regression — and this proof, the only end-to-end evidence the hosted chain
      // has, would stay green through all of it. Interpolating the id into the reason makes the
      // TEXT look specific while the SET stays unbounded, which is worse than saying nothing.
      //
      // So the set is asserted first and the override below names its member as a LITERAL. Any
      // other blocking finding fails here, loudly, before anything is approved.
      //
      // `furniture-missing` is real and measured: a published Datawrapper chart paints the unit
      // NOWHERE. Probed on this very chart — the only elements whose text contains "%" are two
      // display:none <script> blobs (the serialized props). See .sdd/hosted-chain-report.md §4.
      expect(blocking.map((f) => f.id).sort()).toEqual(["furniture-missing"]);
      // ...and it is about the UNIT and nothing else. The finding GROUPS every furniture role
      // (lib/verify/review.ts CHECK_TO_FINDING), so pinning the id alone would still swallow a
      // missing title or a dropped source credit under the same name.
      const missing = blocking[0]!;
      expect(missing.evidence.filter((e) => !e.includes("/unit]"))).toEqual([]);

      const previewed = previewStep(run, reviewed.value, runDir, {
        env: { SPLASH_NO_VIEWER: "1" },
      });
      expect(
        previewed.ok ? "presented" : `${previewed.code}: ${previewed.message}`,
      ).toBe("presented");
      if (!previewed.ok) return;
      const preview = (previewed.value.review as ReviewRecord).preview!;
      expect(preview.deliverablePath).toBe(artifact.url);
      expect(preview.deliverableSha256).toBe(
        hostedBindingDigest(artifact.url, stillSha),
      );

      const staged: RunManifest = { ...run, elements: [previewed.value] };
      const approved = approve(
        staged,
        previewed.value,
        runDir,
        {
          actorLabel: "e2e",
          // ONE finding, named as a literal — the ceremony a journalist would perform, on the one
          // blocker this embed is asserted to have. Nothing computed from `blocking`: a set
          // derived from the review is a set that grows silently with it.
          overrides: [
            {
              findingId: "furniture-missing",
              reason:
                "e2e proof: Datawrapper paints the unit nowhere on a published chart embed " +
                "(measured — the only '%' on the page is inside display:none script blobs). " +
                "Knowingly shipped past so the chain reaches a delivery; the gap is reported, not fixed.",
            },
          ],
        },
        { signers: [], requiredSigners: [] },
      );
      expect(
        approved.ok ? "approved" : `${approved.code}: ${approved.message}`,
      ).toBe("approved");
      if (!approved.ok) return;

      // DELIVER — the hand-over. Nothing is uploaded: the embed is already live, so the record is
      // the address plus the code a CMS pastes.
      const requested = {
        ...approved.value,
        delivery: { requested: ["embed-hosted"], delivered: [] },
      } as unknown as RunManifest["elements"][number];
      const decor = {
        root: runDir,
        profile: { credit: "Heidi.news", lang: "en" },
        state: {
          capabilities: { "embed-hosted": { enabled: true, settings: {} } },
          delivery: {},
        },
      } as unknown as Decor;
      const delivered = await deliver(
        { ...run, elements: [requested] },
        requested,
        runDir,
        decor,
        undefined,
        { env: {} },
      );
      expect(
        delivered.ok ? "delivered" : `${delivered.code}: ${delivered.message}`,
      ).toBe("delivered");
      if (!delivered.ok) return;
      const record = delivered.value.delivery!.delivered[0]!;
      expect(record.publisherId).toBe("embed-hosted");
      expect(record.kind).toBe("hosted");
      expect(record.artifact).toBeUndefined();
      console.log(`[dw-chain-e2e] handed over ${record.url}`);
      console.log(`[dw-chain-e2e] snippet: ${record.snippet}`);

      // THE POSITIVE CONTROL, half two — the DELIVERED address is fetched, off the record the run
      // wrote, not off the URL this test happens to hold.
      expect(record.snippet).toContain(record.url!);
      const res = await fetch(record.url!, {
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      expect(`${record.url} → ${res.status}`).toBe(`${record.url} → 200`);
      expect((await res.text()).toLowerCase()).toContain("<html");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  300_000,
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
    schemaVersion: 6,
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

// ALWAYS ON — the offer half. What the exclusion cost, in one assertion: the row-driven types the
// loop refused to offer are buildable again, and each one declares the shape capture measures it
// by. SIX of the nine, since 2026-07-28: `d3-bars-split`, `d3-arrow-plot` and `tables` are marked
// `deferred` in dw-chart's OWN manifest ("no KB sheet models this"), and the assembler table now
// reads that flag rather than claiming what the manifest denies. No offer moves — renderableSheets
// already joins through the same flag, so a deferred key could never have been a candidate — and
// the SHAPE is still declared for all nine, because the shape is a property of the type.
test("the row-driven Datawrapper types are offered again, each declaring a content-driven height", () => {
  for (const t of [
    "d3-bars",
    "d3-bars-grouped",
    "d3-bars-stacked",
    "d3-bars-bullet",
    "d3-dot-plot",
    "d3-range-plot",
  ]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(true);
    expect(heightPolicyFor("dw-chart", t)).toBe("content-driven");
  }
  for (const t of ["d3-bars-split", "d3-arrow-plot", "tables"]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(false);
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
      // A row-driven export is a FILE delivery, so it is read through the same narrowing
      // helper every other file reader uses — the artifact record became a union when the
      // loop learned to record a hosted delivery, and a raw `.path` no longer typechecks.
      const artifactPath = join(
        runDir,
        fileArtifact(produced.value.artifact)!.path,
      );
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
