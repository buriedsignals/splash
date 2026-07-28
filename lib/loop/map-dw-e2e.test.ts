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
//                   publicUrl RESOLVING over https, read back off the PERSISTED run manifest.
//                   That half goes through produce() too now. It used to go through render() —
//                   the verb produce delegates to — because produce() could not carry a
//                   hosted-only delivery: artifactFileFor (lib/loop/produce.ts) looked for an
//                   `interactive.html` among the delivered files, a hosted map delivers none, and
//                   produce() answered `engine-failed: no interactive artifact in the delivery`
//                   (see .sdd/task-13-report.md). The manifest now records a hosted delivery as
//                   the URL it is (ArtifactRecordSchema), so the proof no longer has to duck one
//                   layer down to be honest.
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
import { captureStep, reviewStep } from "./verify";
import { hostedBindingDigest } from "../verify/hosted";
import type { ReviewRecord } from "../verify/types";
import type { Decor } from "../newsroom/decor";
import { freezeInput } from "./freeze";
import { assembleMapDw } from "./assemble/map-dw";
import { validateMapSpec } from "../../skills/map-dw/src/map-spec";
import { normalizeChannel, renderSize } from "../../skills/splash/src/channel";
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
  // THE WARNINGS ARE READ, not discarded — this line was `expect([]).toEqual([])` on the success
  // branch, which asserted nothing whatever about a spec the validator accepted with complaints.
  // Its dw-chart twin asserts `v.warnings` EMPTY; this fixture cannot, and the difference is a
  // property of the fixture rather than a weaker check: twelve countries on a 212-region world
  // basemap IS a sparse subset, deliberately (a small, readable demo map), and validateMapSpec
  // says so every time. So the ONE expected warning is pinned by its subject: a second warning,
  // or a different one, fails here — a doubled unit, a bad number format, a join gone thin.
  const warnings = v.ok ? v.warnings : v.errors;
  expect(warnings.length).toBe(1);
  expect(warnings[0]).toContain("sub-national subset");
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
      const png = readFileSync(
        join(runDir, fileArtifact(result.value.artifact)!.path),
      );
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
  "the interactive form is a LIVE Datawrapper map the run records as a hosted delivery",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-map-dw-embed-"));
    try {
      const run = runFor(runDir, "interactive");
      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      // A hosted delivery owns no media — that is what "hosted" means, and asserting it here
      // keeps this proof honest about which half of map-dw it is proving.
      expect(fileArtifact(result.value.artifact)).toBeUndefined();

      // THROUGH THE FILE, not off the in-memory result: writeManifest runs the manifest's own
      // invariants on the way out and readManifest parses it back through the schema, so what is
      // fetched below is the URL that survived a real round trip to disk.
      const manifestPath = join(runDir, "run.json");
      writeManifest(manifestPath, { ...run, elements: [result.value] });
      const reopened = readManifest(manifestPath, runDir);
      const recorded = reopened.elements[0]!.artifact!;
      expect(isHostedArtifact(recorded)).toBe(true);
      if (!isHostedArtifact(recorded)) return;
      console.log(`[map-dw-e2e] recorded hosted delivery ${recorded.url}`);

      // THE POSITIVE CONTROL — the URL is fetched, not merely well-formed. A published
      // Datawrapper map that 404s is exactly the failure a string check cannot see.
      const res = await fetch(recorded.url, {
        signal: AbortSignal.timeout(30_000),
      });
      expect(`${recorded.url} \u2192 ${res.status}`).toBe(
        `${recorded.url} \u2192 200`,
      );
      // The BODY is a page, not merely 500-odd bytes — a Datawrapper error page clears a length
      // check comfortably. The same assertion its dw-chart twin makes.
      expect((await res.text()).toLowerCase()).toContain("<html");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);

// THE WHOLE CHAIN, on a map that lives at an address and nowhere else.
//
// Producing the hosted map and recording its URL (the proof above) is where this used to stop:
// capture recorded a gap, and preview, approve and deliver each refused by name. The choropleth
// was offerable, choosable and producible — and undeliverable
// (docs/splash/capability-matrix-2026-07-28.md).
//
// Its dw-chart twin proves the same chain on a chart; this one exists because map-dw is a
// SEPARATE producer with its own manifest, its own spec and its own furniture, and "the chart
// works" has never been evidence about the map in this codebase.
//
// The positive controls are read off the real thing at both ends: the captured image's own bytes,
// and the delivered embed's URL fetched 200.
proof(
  "a published Datawrapper map is captured, reviewed, previewed, approved and delivered",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-map-dw-chain-"));
    try {
      const run = runFor(runDir, "interactive");
      const produced = await produce(run, run.elements[0]!, runDir);
      expect(
        produced.ok ? "produced" : `${produced.code}: ${produced.message}`,
      ).toBe("produced");
      if (!produced.ok) return;
      const artifact = produced.value.artifact!;
      expect(isHostedArtifact(artifact)).toBe(true);
      if (!isHostedArtifact(artifact)) return;
      console.log(`[map-dw-chain-e2e] published ${artifact.url}`);

      // CAPTURE — the browser opens the ADDRESS, and measures the live map.
      const captured = await captureStep(run, produced.value, runDir);
      expect(
        captured.ok ? "captured" : `${captured.code}: ${captured.message}`,
      ).toBe("captured");
      if (!captured.ok) return;
      const slot = captured.value.capture!;
      expect(slot.unsupported).toBeUndefined();
      const primary = slot.images.find((i) => i.breakpoint === "primary")!;
      expect(primary.artifactUrl).toBe(artifact.url);

      // THE POSITIVE CONTROL, half one — the still's OWN bytes, re-hashed off disk.
      const stillBytes = readFileSync(primary.path);
      expect(stillBytes.subarray(1, 4).toString("ascii")).toBe("PNG");
      const stillSha = Buffer.from(sha256(stillBytes)).toString("hex");
      expect(stillSha).toBe(primary.sha256);
      console.log(
        `[map-dw-chain-e2e] still ${stillBytes.readUInt32BE(16)}x${stillBytes.readUInt32BE(20)} sha ${stillSha.slice(0, 12)}…`,
      );
      expect(approvalSubjectOf(captured.value)).toEqual({
        sha256: hostedBindingDigest(artifact.url, stillSha),
        url: artifact.url,
      });
      console.log(
        `[map-dw-chain-e2e] rendered title (${primary.titleSource}): ${primary.renderedTitle}`,
      );

      const reviewed = await reviewStep(run, captured.value, runDir);
      expect(
        reviewed.ok ? "reviewed" : `${reviewed.code}: ${reviewed.message}`,
      ).toBe("reviewed");
      if (!reviewed.ok) return;
      const blocking = (reviewed.value.review as ReviewRecord).findings.filter(
        (f) => f.severity === "blocking" && f.status === "open",
      );
      for (const f of blocking)
        console.log(`[map-dw-chain-e2e] blocking: ${f.id} — ${f.summary}`);

      const previewed = previewStep(run, reviewed.value, runDir, {
        env: { SPLASH_NO_VIEWER: "1" },
      });
      expect(
        previewed.ok ? "presented" : `${previewed.code}: ${previewed.message}`,
      ).toBe("presented");
      if (!previewed.ok) return;
      expect(
        (previewed.value.review as ReviewRecord).preview!.deliverablePath,
      ).toBe(artifact.url);

      const approved = approve(
        { ...run, elements: [previewed.value] },
        previewed.value,
        runDir,
        {
          actorLabel: "e2e",
          overrides: blocking.map((f) => ({
            findingId: f.id,
            reason: `e2e proof: knowingly shipped past to prove the chain ends in a delivery (${f.id})`,
          })),
        },
        { signers: [], requiredSigners: [] },
      );
      expect(
        approved.ok ? "approved" : `${approved.code}: ${approved.message}`,
      ).toBe("approved");
      if (!approved.ok) return;

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
      expect(record.kind).toBe("hosted");
      expect(record.artifact).toBeUndefined();
      console.log(`[map-dw-chain-e2e] handed over ${record.url}`);
      console.log(`[map-dw-chain-e2e] snippet: ${record.snippet}`);

      // THE POSITIVE CONTROL, half two — the DELIVERED address, fetched off the run's own record.
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
