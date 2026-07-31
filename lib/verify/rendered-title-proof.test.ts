// Opt-in end-to-end proof of the needs-human-eye lane's title detector, on a REAL render,
// in BOTH directions — and driven through the loop's own production callers (captureStep /
// reviewStep), not through payloads assembled here.
//
// Until this slice the detector was structurally dead: `renderedTitle` was declared on three
// types and assigned by nobody in production, and the one place that set it was the proof
// beside this one, handing itself the constant it was comparing against.
//
// Run it with:  SPLASH_VERIFY_PROOF=1 bun test lib/verify/rendered-title-proof.test.ts
//
// Its OWN file, and run on its own. Measured: this proof stalls on its first browser launch
// when it runs in the same bun-test process after real-artifact-proof.test.ts (which has
// already launched three) — the launch times out rather than failing, twice reproduced. The
// two proofs are therefore kept apart so each documented command launches at most two
// browsers. On its own it completes in ~41s (real Vite build, real chromium, real png).
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "../loop/produce";
import { freezeInput } from "../loop/freeze";
import { revise } from "../loop/revise";
import {
  nextActionsForElement,
  provenanceHash,
  type RunElement,
  type RunManifest,
  fileArtifact,
} from "../loop/manifest";
import { captureStep, reviewStep } from "../loop/verify";
import { approvalDecision } from "./approval";
import { validateSourcePolicy } from "../source/policy";
import type { ReviewRecord } from "./types";

const RUN = process.env.SPLASH_VERIFY_PROOF === "1";

const TAKEAWAY = "Health premiums rose in every canton shown";
const UNIT = "Monthly adult premium (CHF)";
const ALT =
  "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.";
const DECLARED_SOURCE = "Relevés cantonaux 2024";

// The run the loop really builds from: a declared local source (produce() refuses an
// undeclared run rather than crediting a placeholder) and a slope over two points in time.
function makeRun(
  runDir: string,
  format: "interactive" | "static",
): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  return {
    runId: "verify-title-proof",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
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
              format,
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
  const run = makeRun(
    mkdtempSync(join(tmpdir(), "verify-title-fixture-")),
    "interactive",
  );
  const verdict = validateSourcePolicy(run.sources?.data, {
    mode: run.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

test.skipIf(!RUN)(
  "the title the render declares reaches the approval gate — quiet when it is the takeaway, loud when it is not",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "verify-title-run-"));
    const run = makeRun(runDir, "interactive");
    const produced = await produce(run, run.elements[0]!, runDir);
    if (!produced.ok) throw new Error(`produce failed: ${produced.message}`);
    const el = produced.value;

    // ---- QUIET: produce.ts renders `title: el.angle.confirmedTakeaway`, so a healthy run
    // should show the lane saying nothing at all about the title.
    const captured = await captureStep(run, el, runDir);
    if (!captured.ok) throw new Error(`capture failed: ${captured.message}`);
    const withCapture = captured.value;
    const primary = withCapture.capture!.images.find(
      (i) => i.breakpoint === "primary",
    )!;
    // Read off the live DOM, not handed in: this is the assertion that "the title IS the
    // takeaway" stopped being a promise the production code makes about itself.
    expect(primary.renderedTitle).toBe(TAKEAWAY);
    // The MARKER rung, not the aria-label one. This asserted `svg[role='img'][aria-label]`
    // until chart-native's ChartFrame started stamping `data-splash-title` on the title it
    // paints — the higher rung of capture.ts's TITLE_SOURCES ladder, and the whole point of
    // that ladder. What this proof is about is unchanged and still asserted above: the title
    // read OFF THE LIVE DOM is the confirmed takeaway. Recording which rung answered is the
    // ladder's own contract (a wrong extraction must be readable in the evidence), so the
    // assertion stays exact rather than being loosened to "any rung".
    expect(primary.titleSource).toBe("[data-splash-title]");

    const reviewedQuiet = await reviewStep(run, withCapture, runDir);
    if (!reviewedQuiet.ok)
      throw new Error(`review failed: ${reviewedQuiet.message}`);
    // The manifest slot is deliberately loose on disk (schema.ts admits a run written before
    // this layer existed), so the read narrows it the same way lib/loop/resume.ts does.
    const quiet = reviewedQuiet.value.review! as ReviewRecord;
    expect(
      quiet.tasteRisk.some((t) => t.dimension === "title-takeaway-divergence"),
    ).toBe(false);

    // ---- LOUD: the loop's real back-edge. The journalist saw the visual and changed the
    // point (lib/loop/revise.ts), and the artifact on disk still carries the old headline.
    const NEW_TAKEAWAY = "Appenzell keeps the cheapest premium of the three";
    const revised = revise(withCapture, {
      kind: "takeaway",
      confirmedTakeaway: NEW_TAKEAWAY,
      altInsight:
        "Appenzell Rhodes-Intérieures remains the least expensive of the three cantons shown.",
    }) as RunElement;
    const run2: RunManifest = { ...run, elements: [revised] };

    // The other mechanism, asserted rather than hidden: revising the angle moves the
    // provenance, so the loop routes this element back to produce on its own. The taste lane
    // is not a substitute for staleness — it answers a different question, in words a human
    // reads: not "this artifact is out of date" but "its headline no longer says your point".
    expect(nextActionsForElement(run2, revised)).toStrictEqual(["produce"]);

    const captured2 = await captureStep(run2, revised, runDir);
    if (!captured2.ok) throw new Error(`capture failed: ${captured2.message}`);
    const primary2 = captured2.value.capture!.images.find(
      (i) => i.breakpoint === "primary",
    )!;
    expect(primary2.artifactSha256).toBe(fileArtifact(el.artifact)!.sha256); // the SAME rendered bytes
    expect(primary2.renderedTitle).toBe(TAKEAWAY);

    const reviewedLoud = await reviewStep(run2, captured2.value, runDir);
    if (!reviewedLoud.ok)
      throw new Error(`review failed: ${reviewedLoud.message}`);
    const loud = reviewedLoud.value.review! as ReviewRecord;
    const signal = loud.tasteRisk.find(
      (t) => t.dimension === "title-takeaway-divergence",
    );
    expect(signal).toBeDefined();
    expect(signal!.routedTo).toBe("human-signoff");
    // No verdict field exists to be filled — the guard is the type, and it is checked on a
    // signal that a real render produced.
    expect(Object.keys(signal!).sort()).toStrictEqual([
      "detector",
      "dimension",
      "evidence",
      "routedTo",
    ]);
    // Both strings, side by side, for the editor about to sign.
    expect(signal!.evidence.join(" ")).toContain(TAKEAWAY);
    expect(signal!.evidence.join(" ")).toContain(NEW_TAKEAWAY);

    // ---- and it REACHES the approval presentation, without ever blocking it.
    const decision = approvalDecision(loud, {
      format: "interactive",
      artifactSha256: fileArtifact(el.artifact)!.sha256,
      provenanceHash: provenanceHash(run2, revised),
    });
    expect(
      decision.needsHumanEye.some(
        (t) => t.dimension === "title-takeaway-divergence",
      ),
    ).toBe(true);
    expect(decision.reasons.map((r) => r.code)).not.toContain(
      "title-takeaway-divergence",
    );

    // ---- a static deliverable: no DOM, so no title, and the record says why.
    const staticDir = mkdtempSync(join(tmpdir(), "verify-title-static-"));
    const staticRun = makeRun(staticDir, "static");
    const staticProduced = await produce(
      staticRun,
      staticRun.elements[0]!,
      staticDir,
    );
    if (!staticProduced.ok)
      throw new Error(`produce failed: ${staticProduced.message}`);
    const staticCaptured = await captureStep(
      staticRun,
      staticProduced.value,
      staticDir,
    );
    if (!staticCaptured.ok)
      throw new Error(`capture failed: ${staticCaptured.message}`);
    const staticImage = staticCaptured.value.capture!.images[0]!;
    expect(staticImage.titleSource).toBe("static-image");
    expect(staticImage.renderedTitle).toBeUndefined();
    const staticReviewed = await reviewStep(
      staticRun,
      staticCaptured.value,
      staticDir,
    );
    if (!staticReviewed.ok)
      throw new Error(`review failed: ${staticReviewed.message}`);
    expect(
      (staticReviewed.value.review! as ReviewRecord).tasteRisk.some(
        (t) => t.dimension === "title-takeaway-divergence",
      ),
    ).toBe(false);

    console.log(
      JSON.stringify(
        {
          quiet: {
            artifact: fileArtifact(el.artifact)!.path,
            renderedTitle: primary.renderedTitle,
            titleSource: primary.titleSource,
            confirmedTakeaway: TAKEAWAY,
            tasteRisk: quiet.tasteRisk.map((t) => t.dimension),
          },
          loud: {
            renderedTitle: primary2.renderedTitle,
            confirmedTakeaway: NEW_TAKEAWAY,
            tasteRisk: loud.tasteRisk.map((t) => t.dimension),
            evidence: signal!.evidence,
            detector: signal!.detector,
            reachesApproval: decision.needsHumanEye.map((t) => t.dimension),
            blockingReasons: decision.reasons.map((r) => r.code),
          },
          static: {
            artifact: fileArtifact(staticProduced.value.artifact)!.path,
            titleSource: staticImage.titleSource,
            renderedTitle: staticImage.renderedTitle ?? null,
          },
        },
        null,
        2,
      ),
    );
  },
  600_000,
);
