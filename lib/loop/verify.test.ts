// The two verification steps, against a REAL artifact.
//
// One chart is rendered once through the actual loop (produce → chart-native) and every test
// below measures THAT file. No synthetic png, no stubbed verb: the whole point of the capture
// step is that it reads what was really delivered, and a fixture would prove the plumbing
// while the measurement stayed hypothetical — the failure mode this project keeps naming
// ("verify the DELIVERED artifact, not the proof").
import { beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { CHANNEL_POLICY } from "../core/channel-policy";
import { freezeInput } from "./freeze";
import { produce } from "./produce";
import { captureStep, reviewStep } from "./verify";
import {
  captureCovers,
  provenanceHash,
  reviewCovers,
  type RunElement,
  type RunManifest,
} from "./manifest";
import type { Finding } from "../verify/types";

let runDir: string;
let run: RunManifest;
let produced: RunElement;

function baseRun(dir: string): RunManifest {
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  return {
    runId: "verify-steps",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight:
            "The adult premium rose in both cantons between 2015 and 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static" as const,
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

beforeAll(async () => {
  runDir = mkdtempSync(join(tmpdir(), "loop-verify-"));
  run = baseRun(runDir);
  const result = await produce(run, run.elements[0]!, runDir);
  if (!result.ok) throw new Error(result.message);
  produced = result.value;
  run = { ...run, elements: [produced] };
}, 300_000);

describe("captureStep", () => {
  it("measures the delivered png at the size its channel publishes at", async () => {
    const result = await captureStep(run, produced, runDir);
    if (!result.ok) throw new Error(result.message);
    const slot = result.value.capture!;
    expect(slot.capturedProvenanceHash).toBe(provenanceHash(run, produced));
    expect(captureCovers(run, result.value)).toBe(true);
    expect(slot.unsupported).toBeUndefined();

    // The real measurement: one image, taken FOR the artifact this run produced, at the
    // article-web container.
    expect(slot.images).toHaveLength(1);
    const image = slot.images[0]!;
    expect(image.artifactSha256).toBe(produced.artifact!.sha256);
    expect(image.destinationId).toBe("channel:article-web");
    expect(image.cssViewport).toEqual({
      width: CHANNEL_POLICY["article-web"].mediaSize.width,
      height: CHANNEL_POLICY["article-web"].mediaSize.height,
    });
    const size = slot.checks.find(
      (c) => c.id === "capture:size-matches-destination",
    )!;
    expect(size.outcome).toBe("pass");
  }, 120_000);

  it("records the gap, rather than stalling, when capture cannot cover the format", async () => {
    // `video` is the format lib/verify deliberately refuses (frame extraction needs ffmpeg —
    // the verb answers not-implemented before it touches the file). The step must not leave
    // the run circling a step that can never succeed: it writes an EMPTY slot carrying the
    // verb's own reason, which is what lets review say `no-capture` out loud.
    const asVideo: RunElement = {
      ...produced,
      proposal: {
        ...produced.proposal!,
        options: [{ ...produced.proposal!.options[0]!, format: "video" }],
      },
    };
    const runAsVideo: RunManifest = { ...run, elements: [asVideo] };
    const result = await captureStep(runAsVideo, asVideo, runDir);
    if (!result.ok) throw new Error(result.message);
    const slot = result.value.capture!;
    expect(slot.images).toEqual([]);
    expect(slot.checks).toEqual([]);
    expect(slot.unsupported).toMatch(/video/i);
    expect(captureCovers(runAsVideo, result.value)).toBe(true);
  });

  it("refuses when the recorded artifact is not there to capture", async () => {
    const missing: RunElement = {
      ...produced,
      artifact: { ...produced.artifact!, path: "elements/e1/gone.png" },
    };
    const result = await captureStep(
      { ...run, elements: [missing] },
      missing,
      runDir,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("gone.png");
  });

  it("refuses an element that has produced nothing", async () => {
    const { artifact: _artifact, ...bare } = produced;
    const result = await captureStep(
      { ...run, elements: [bare] },
      bare,
      runDir,
    );
    expect(result.ok).toBe(false);
  });
});

describe("reviewStep", () => {
  it("turns the capture into a record with no findings for a sound artifact", async () => {
    const captured = await captureStep(run, produced, runDir);
    if (!captured.ok) throw new Error(captured.message);
    const withCapture = { ...run, elements: [captured.value] };

    const result = await reviewStep(withCapture, captured.value, runDir);
    if (!result.ok) throw new Error(result.message);
    const review = result.value.review!;
    expect(review.reviewedProvenanceHash).toBe(
      provenanceHash(withCapture, captured.value),
    );
    expect(reviewCovers(withCapture, result.value)).toBe(true);
    expect(review.findings).toEqual([]);
    // Never dressed up: no independent semantic reviewer is wired, and the record says so
    // instead of letting silence read as a pass.
    expect(review.reviewer!.mode).toBe("mechanical");
    expect(review.reviewer!.independentSemanticReview).toBe("unavailable");
    expect(review.captures).toHaveLength(1);
  }, 120_000);

  it("emits the blocking no-capture finding, with its reason, when nothing could be captured", async () => {
    const asVideo: RunElement = {
      ...produced,
      proposal: {
        ...produced.proposal!,
        options: [{ ...produced.proposal!.options[0]!, format: "video" }],
      },
    };
    const runAsVideo: RunManifest = { ...run, elements: [asVideo] };
    const captured = await captureStep(runAsVideo, asVideo, runDir);
    if (!captured.ok) throw new Error(captured.message);

    const result = await reviewStep(
      { ...runAsVideo, elements: [captured.value] },
      captured.value,
      runDir,
    );
    if (!result.ok) throw new Error(result.message);
    const finding = (result.value.review!.findings as Finding[]).find(
      (f) => f.id === "no-capture",
    )!;
    expect(finding).toBeDefined();
    expect(finding.severity).toBe("blocking");
    // The gap is NAMED, not merely counted: the record carries the verb's own reason.
    expect(finding.evidence.join(" ")).toMatch(/video/i);
  });

  it("refuses to review before anything has been captured", async () => {
    const result = await reviewStep(run, produced, runDir);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/captur/i);
  });
});
