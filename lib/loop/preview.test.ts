// The preview step — issue #3, made mechanical.
//
// The failure the issue describes is that Splash asked "ship it?" having shown only a review
// still, and opened the real deliverable only when the journalist asked how to see it. The
// skill said to show the render; prose is skippable, so it was skipped. These tests hold the
// version that is not: the deliverable is resolved from the manifest, re-hashed, checked
// against the pinned format's own file genre, presented, and recorded — and every one of those
// is a refusal when it fails.
import { beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { freezeInput } from "./freeze";
import { produce } from "./produce";
import { previewStep } from "./preview";
import { captureStep, reviewStep } from "./verify";
import {
  previewCovers,
  type RunElement,
  type RunManifest,
  fileArtifact,
} from "./manifest";

let runDir: string;
let run: RunManifest;
let reviewed: RunElement;

// No viewer, stated as a fact rather than as a test convenience: a test process is precisely
// the case the flag exists for — nobody is sitting in front of it. The opened branch is
// exercised below with a real opener command.
const NO_VIEWER = { SPLASH_NO_VIEWER: "1" };

beforeAll(async () => {
  runDir = mkdtempSync(join(tmpdir(), "loop-preview-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  run = {
    runId: "preview-step",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
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
          altInsight: "The adult premium rose in both cantons, 2015 to 2024.",
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
  const produced = await produce(run, run.elements[0]!, runDir);
  if (!produced.ok) throw new Error(produced.message);
  const captured = await captureStep(
    { ...run, elements: [produced.value] },
    produced.value,
    runDir,
  );
  if (!captured.ok) throw new Error(captured.message);
  const withReview = await reviewStep(
    { ...run, elements: [captured.value] },
    captured.value,
    runDir,
  );
  if (!withReview.ok) throw new Error(withReview.message);
  reviewed = withReview.value;
  run = { ...run, elements: [reviewed] };
}, 300_000);

describe("previewStep", () => {
  it("records a path-printed preview, with its reason, when no viewer can be opened", async () => {
    const result = await previewStep(run, reviewed, runDir, { env: NO_VIEWER });
    if (!result.ok) throw new Error(result.message);
    const preview = result.value.review!.preview!;
    expect(preview.presentedAs).toBe("path-printed");
    // A printed path counts as a preview ONLY when it records why no viewer opened — the
    // free-square lib/verify/preview.ts refuses to grant.
    expect(preview.fallbackReason!.trim().length).toBeGreaterThan(0);
    expect(preview.deliverableSha256).toBe(
      fileArtifact(reviewed.artifact)!.sha256,
    );
    expect(preview.deliverablePath.endsWith("static.png")).toBe(true);
    expect(previewCovers(result.value)).toBe(true);
  });

  it("records an opened preview when a viewer command succeeds", async () => {
    // A real command, run for real, that exits 0 — the opened branch without a window.
    const result = await previewStep(run, reviewed, runDir, {
      env: { SPLASH_PREVIEW_OPENER: "/usr/bin/true" },
    });
    if (!result.ok) throw new Error(result.message);
    expect(result.value.review!.preview!.presentedAs).toBe("opened");
  });

  it("falls back rather than failing when the viewer command cannot run", async () => {
    const result = await previewStep(run, reviewed, runDir, {
      env: { SPLASH_PREVIEW_OPENER: "/nonexistent/viewer" },
    });
    if (!result.ok) throw new Error(result.message);
    const preview = result.value.review!.preview!;
    expect(preview.presentedAs).toBe("path-printed");
    expect(preview.fallbackReason).toContain("/nonexistent/viewer");
  });

  it("hands the host the absolute path of what it showed", async () => {
    const result = await previewStep(run, reviewed, runDir, { env: NO_VIEWER });
    if (!result.ok) throw new Error(result.message);
    expect(result.value.review!.preview!.deliverablePath.startsWith("/")).toBe(
      true,
    );
  });

  it("refuses when the artifact on disk is no longer the artifact the run recorded", async () => {
    const swapped = join(runDir, "elements", "e1", "static.png");
    const original = await Bun.file(swapped).bytes();
    try {
      writeFileSync(swapped, "these are not the bytes anyone produced");
      const result = await previewStep(run, reviewed, runDir, {
        env: NO_VIEWER,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toMatch(/no longer|changed/i);
    } finally {
      writeFileSync(swapped, original);
    }
  });

  it("refuses to preview before a review exists to record it on", async () => {
    const { review: _review, ...unreviewed } = reviewed;
    const result = await previewStep(
      { ...run, elements: [unreviewed] },
      unreviewed,
      runDir,
      { env: NO_VIEWER },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/review/i);
  });

  it("refuses a deliverable that is not the pinned format's own file", async () => {
    // A .png standing in for an interactive is the substitution issue #3 names by itself.
    const asInteractive: RunElement = {
      ...reviewed,
      proposal: {
        ...reviewed.proposal!,
        options: [{ ...reviewed.proposal!.options[0]!, format: "interactive" }],
      },
    };
    const result = await previewStep(
      { ...run, elements: [asInteractive] },
      asInteractive,
      runDir,
      { env: NO_VIEWER },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("interactive");
  });
});
