// Opt-in end-to-end proof: a REAL interactive built by the editorial loop through
// chart-native, then captured in a real browser and reviewed — not a fixture that only
// proves the mechanism runs. This project's own lesson is that a live proof on a fixture
// does not prove the real path (docs/splash/CHANGELOG.md), and the whole point of the
// verify layer is to stop calling something verified when the artifact was never looked at.
//
// Run it with:  SPLASH_VERIFY_PROOF=1 bun test lib/verify/real-artifact-proof.test.ts
// It is opt-in because it renders through the engine (tens of seconds) and launches a
// browser — the same convention lib/loop/video-e2e.test.ts:17 already follows.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "../loop/produce";
import { freezeInput } from "../loop/freeze";
import {
  provenanceHash,
  type RunManifest,
  fileArtifact,
} from "../loop/manifest";
import { capture } from "./capture";
import { runReview } from "./review";
import { approvalDecision } from "./approval";
import { validateSourcePolicy } from "../source/policy";
import type { CaptureCheck, PreviewRecord } from "./types";

const RUN = process.env.SPLASH_VERIFY_PROOF === "1";

const TAKEAWAY = "Health premiums rose in every canton shown";
const UNIT = "Monthly adult premium (CHF)";
const ALT =
  "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.";
// The source line the chart really renders. It is no longer a constant of produce.ts: since
// the source policy was wired in, produce.ts credits the run's DECLARED source ledger (see
// makeRun below), and ChartFrame prepends its own localized "Source:" label. So this is the
// declared label, read back off the rendered DOM by the capture below — which makes this test
// the render-level proof that the declaration reaches the reader.
const DECLARED_SOURCE = "Relevés cantonaux 2024";
const SOURCE = `Source: ${DECLARED_SOURCE}`;

const FURNITURE = [
  { role: "title" as const, text: TAKEAWAY },
  { role: "unit" as const, text: UNIT },
  { role: "source" as const, text: SOURCE },
  { role: "alt-text" as const, text: ALT },
];

function makeRun(runDir: string): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  return {
    runId: "verify-proof",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV this test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so a fixture that reaches a render says what its data is.
    sources: {
      mode: "real" as const,
      data: { kind: "local" as const, label: DECLARED_SOURCE },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: TAKEAWAY, altInsight: ALT, unit: UNIT },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "interactive",
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

// ALWAYS ON — outside the gate, and the only part of this file `bun run check` runs. Four of
// this project's six proofs rotted on a fixture that predated a gate; this one did not, and the
// check is here so it stays that way rather than because it is currently failing. See
// docs/superpowers/specs/2026-07-27-proofs-run-design.md.
test("the fixture declares a source the loop will accept, before any render", () => {
  const run = makeRun(mkdtempSync(join(tmpdir(), "verify-proof-fixture-")));
  const verdict = validateSourcePolicy(run.sources?.data, {
    mode: run.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

function pick(
  checks: CaptureCheck[],
  id: CaptureCheck["id"],
  breakpoint: string,
  role?: string,
): CaptureCheck | undefined {
  return checks.find(
    (c) =>
      c.id === id &&
      c.breakpoint === breakpoint &&
      (role === undefined || c.role === role),
  );
}

test.skipIf(!RUN)(
  "an artifact the loop really built is captured, reviewed and gated on its own bytes",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "verify-proof-run-"));
    const run = makeRun(runDir);
    const produced = await produce(run, run.elements[0]!, runDir);
    if (!produced.ok) throw new Error(`produce failed: ${produced.message}`);
    const el = produced.value;
    const artifactPath = join(runDir, fileArtifact(el.artifact)!.path);
    expect(fileArtifact(el.artifact)!.path).toBe(
      join("elements", "e1", "interactive.html"),
    );

    // ---- capture at the destination the run actually publishes to -----------------
    const good = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(runDir, "review"),
      id: "e1",
      furniture: FURNITURE,
    });
    if (!good.ok) throw new Error(`capture failed: ${good.message}`);

    expect(good.value.images.map((i) => i.breakpoint)).toStrictEqual([
      "narrow",
      "primary",
      "wide",
    ]);
    const primary = good.value.images.find((i) => i.breakpoint === "primary")!;

    // Assertions on the REAL image, not on the record's own claims about it.
    const bytes = readFileSync(primary.path);
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toStrictEqual([
      0x89, 0x50, 0x4e, 0x47,
    ]);
    // Within a device pixel or two of the measured root, not exactly it: a real component
    // root is FRACTIONAL (this one is 1152 x 557.39 css px at dpr 2), and the browser
    // expands an element screenshot to whole device pixels — 557.39 x 2 = 1114.78 comes
    // back as 1116, not as the 1115 a naive round predicts. The synthetic fixture in
    // capture-html.test.ts has an integer height and does match exactly; this is the case
    // only a real render shows, which is why the proof runs on one.
    expect(
      Math.abs(
        bytes.readUInt32BE(16) -
          primary.rootBox.width * primary.deviceScaleFactor,
      ),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        bytes.readUInt32BE(20) -
          primary.rootBox.height * primary.deviceScaleFactor,
      ),
    ).toBeLessThanOrEqual(2);
    expect(primary.artifactSha256).toBe(fileArtifact(el.artifact)!.sha256);
    expect(primary.marks).toBeGreaterThan(0);

    // The furniture the engine really rendered, at the real publication container.
    for (const f of FURNITURE)
      expect(
        pick(good.value.checks, "capture:furniture-present", "primary", f.role)!
          .outcome,
        `${f.role} must be present in the produced chart`,
      ).toBe("pass");
    for (const role of ["title", "unit", "source"])
      expect(
        pick(good.value.checks, "capture:furniture-in-frame", "primary", role)!
          .outcome,
        `${role} must be inside the article-web container`,
      ).toBe("pass");
    expect(
      pick(good.value.checks, "capture:fits-viewport", "primary")!.outcome,
    ).toBe("pass");

    // ---- the same artifact at 900x560: the failure issue #10 reports ---------------
    const adhoc = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(runDir, "review-900"),
      id: "e1",
      furniture: FURNITURE,
      destination: {
        id: "adhoc-900x560",
        primary: { width: 900, height: 560 },
      },
    });
    if (!adhoc.ok) throw new Error(`capture failed: ${adhoc.message}`);
    const footer = pick(
      adhoc.value.checks,
      "capture:furniture-in-frame",
      "primary",
      "source",
    )!;
    expect(
      footer.outcome,
      "the source footer must be caught below the fold",
    ).toBe("fail");
    expect(footer.detail).toContain("900x560");

    // ---- review: mechanical, honest about what did NOT run ------------------------
    const provenance = provenanceHash(run, el);
    const clean = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: UNIT,
        altText: ALT,
        sourceName: DECLARED_SOURCE,
        evidenceExtracts: [
          { text: "Genève 449 → 583", provenance: "the frozen input" },
        ],
        captures: good.value.images,
        interactionResults: [],
        rubric: ["the title states what the visual shows"],
        runId: run.runId,
        elementId: el.id,
        runDir,
        chosenId: el.proposal!.chosenId,
        provenanceHash: provenance,
      },
      checks: good.value.checks,
      reviewedProvenanceHash: provenance,
      acceptedDestinationId: "channel:article-web",
    });
    expect(
      clean.findings.filter((f) => f.severity === "blocking"),
    ).toStrictEqual([]);
    expect(clean.reviewer.mode).toBe("mechanical");
    expect(clean.reviewer.independentSemanticReview).toBe("unavailable");

    // The same review over the ad-hoc capture BLOCKS, twice over: the furniture is out of
    // frame AND the still does not represent the accepted destination.
    const bad = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: UNIT,
        altText: ALT,
        sourceName: DECLARED_SOURCE,
        evidenceExtracts: [],
        captures: adhoc.value.images,
        interactionResults: [],
        rubric: [],
      },
      checks: adhoc.value.checks,
      reviewedProvenanceHash: provenance,
      acceptedDestinationId: "channel:article-web",
    });
    const blockingIds = bad.findings
      .filter((f) => f.severity === "blocking")
      .map((f) => f.id);
    expect(blockingIds).toContain("furniture-below-fold");
    expect(blockingIds).toContain("destination-mismatch");

    // ---- the preview gate, on the real deliverable --------------------------------
    const ctx = {
      format: "interactive" as const,
      artifactSha256: fileArtifact(el.artifact)!.sha256,
      provenanceHash: provenance,
    };
    const withoutPreview = approvalDecision(clean, ctx);
    expect(withoutPreview.approvable).toBe(false);
    expect(withoutPreview.reasons.map((r) => r.code)).toContain(
      "preview-not-presented",
    );

    // A still is not the interactive — even the one this very run just captured.
    const stillPreview: PreviewRecord = {
      deliverablePath: primary.path,
      deliverableSha256: fileArtifact(el.artifact)!.sha256,
      presentedAs: "opened",
      presentedAt: new Date().toISOString(),
    };
    expect(
      approvalDecision({ ...clean, preview: stillPreview }, ctx).reasons.map(
        (r) => r.code,
      ),
    ).toContain("not-the-deliverable");

    const realPreview: PreviewRecord = {
      deliverablePath: artifactPath,
      deliverableSha256: fileArtifact(el.artifact)!.sha256,
      presentedAs: "opened",
      presentedAt: new Date().toISOString(),
    };
    const cleared = approvalDecision({ ...clean, preview: realPreview }, ctx);
    expect(cleared.approvable).toBe(true);

    // Measured numbers, printed so the proof reports what it saw rather than that it ran.
    console.log(
      JSON.stringify(
        {
          artifact: fileArtifact(el.artifact)!.path,
          artifactSha256: fileArtifact(el.artifact)!.sha256.slice(0, 12),
          primary: {
            cssViewport: primary.cssViewport,
            rootBox: primary.rootBox,
            image: `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,
            marks: primary.marks,
            markColours: primary.markColours.slice(0, 5),
          },
          foldFailure: footer.detail,
          blockingAtAdhocDestination: blockingIds,
          tasteRisk: clean.tasteRisk.map((t) => t.dimension),
        },
        null,
        2,
      ),
    );
  },
  300_000,
);
