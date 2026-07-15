import { describe, it, expect } from "bun:test";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertArtifactProvenance,
  PRODUCE_MTIME_SKEW_MS,
  REVIEW_ARTIFACTS_DIR,
} from "../src/render-provenance";
import type { ProduceReport, ProposalResult } from "../src/producer-spec";

// A realistic exports/<slug>/ layout: report.json next to the per-proposal build
// subdir <id>/, exactly how produce-all + the agent lay it out in a real run.
function slugDir(): string {
  return mkdtempSync(join(tmpdir(), "splash-prov-"));
}

function writeReport(
  dir: string,
  result: ProposalResult,
  generatedAt?: string,
): { report: ProduceReport; reportPath: string } {
  const report: ProduceReport = generatedAt
    ? { generatedAt, results: [result] }
    : { results: [result] };
  const reportPath = join(dir, "report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return { report, reportPath };
}

function producedResult(over: Partial<ProposalResult> = {}): ProposalResult {
  return {
    id: "p1",
    producer: "chart-native",
    format: "static",
    status: "produced",
    reviewed: true,
    renderApproved: false,
    ...over,
  };
}

function backdate(path: string, ms: number): void {
  const t = new Date(Date.now() - ms);
  utimesSync(path, t, t);
}

describe("assertArtifactProvenance — pipeline-emitted outputs", () => {
  it("accepts a produced artifact listed in the result outputs (current generation)", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG");
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      new Date().toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: still,
      }),
    ).not.toThrow();
  });

  it("REFUSES a hand-planted file in the producer output dir (absent from outputs)", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG");
    // The observed hack: an ad-hoc hosted-embed.html hand-authored INTO the build
    // subdir to satisfy the file-based approval API.
    const planted = join(outDir, "hosted-embed.html");
    writeFileSync(planted, "<html>hand-authored</html>");
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      new Date().toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: planted,
      }),
    ).toThrow(/not an output of the current produce generation/);
  });

  it("REFUSES an outputs-listed file MODIFIED AFTER the report generation (stale report / re-produce)", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG-from-a-LATER-produce");
    // The report claims a generation from a minute ago; the artifact at the listed
    // path is newer — a later produce ran without saving a fresh report (gate-render
    // ordered BEFORE the last produce call).
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      new Date(Date.now() - 60_000).toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: still,
      }),
    ).toThrow(/stale|modified after/i);
  });

  it("accepts an artifact within the mtime skew tolerance of the report generation", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG");
    // generatedAt marginally BEFORE the artifact write (filesystem mtime granularity):
    // inside the named skew window, must still be accepted.
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      new Date(
        Date.now() - Math.floor(PRODUCE_MTIME_SKEW_MS / 2),
      ).toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: still,
      }),
    ).not.toThrow();
  });

  it("falls back to the report file mtime as the generation anchor when generatedAt is absent (legacy report)", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG-from-a-LATER-produce");
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      // no generatedAt
    );
    // Legacy report written a minute ago; the artifact is fresh → refuse.
    backdate(reportPath, 60_000);
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: still,
      }),
    ).toThrow(/stale|modified after/i);
  });
});

describe("assertArtifactProvenance — sanctioned hosted-review location", () => {
  const hostedResult = (over: Partial<ProposalResult> = {}): ProposalResult =>
    producedResult({
      producer: "dw-chart",
      format: "interactive",
      outputs: [],
      publicUrl: "https://datawrapper.dwcdn.net/abc123/1/",
      ...over,
    });

  it("accepts a FRESH review capture under _review-artifacts/<id>/ for a hosted embed (no local render)", () => {
    const dir = slugDir();
    const reviewDir = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    mkdirSync(reviewDir, { recursive: true });
    const { report, reportPath } = writeReport(
      dir,
      hostedResult(),
      new Date(Date.now() - 60_000).toISOString(),
    );
    // Captured AFTER the produce generation (the reviewer opened the live embed).
    const capture = join(reviewDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html>captured from the live embed</html>");
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      }),
    ).not.toThrow();
  });

  it("REFUSES a STALE review capture predating the current produce generation", () => {
    const dir = slugDir();
    const reviewDir = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    mkdirSync(reviewDir, { recursive: true });
    const capture = join(reviewDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html>captured for a PRIOR generation</html>");
    backdate(capture, 60_000);
    const { report, reportPath } = writeReport(
      dir,
      hostedResult(),
      new Date().toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      }),
    ).toThrow(/predates|stale/i);
  });

  it("REFUSES a _review-artifacts capture for a result that HAS local pipeline outputs", () => {
    const dir = slugDir();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG");
    const reviewDir = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    mkdirSync(reviewDir, { recursive: true });
    const capture = join(reviewDir, "screenshot.png");
    writeFileSync(capture, "PNG");
    const { report, reportPath } = writeReport(
      dir,
      producedResult({ outputs: [still] }),
      new Date().toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      }),
    ).toThrow(/hosted/i);
  });

  it("REFUSES a capture filed under ANOTHER proposal's _review-artifacts subdir", () => {
    const dir = slugDir();
    const otherDir = join(dir, REVIEW_ARTIFACTS_DIR, "p2");
    mkdirSync(otherDir, { recursive: true });
    const capture = join(otherDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html></html>");
    const { report, reportPath } = writeReport(
      dir,
      hostedResult(),
      new Date(Date.now() - 60_000).toISOString(),
    );
    expect(() =>
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      }),
    ).toThrow(/not an output of the current produce generation/);
  });

  // Observation (3): a hosted-DW review capture landed under skills/dw-chart/exports
  // because a bare relative `exports/...` path resolved against an earlier `cd
  // skills/dw-chart`. The refusal MUST name the ABSOLUTE sanctioned capture dir and
  // instruct a fresh re-capture there — never an ad-hoc mv of the mis-pathed file into
  // place (the improvisation the mechanical fix exists to kill).
  it("names the ABSOLUTE sanctioned capture dir (and forbids an mv) when a hosted capture landed in the wrong directory", () => {
    const dir = slugDir();
    // The mis-pathed capture: a bare relative `exports/...` resolved against an earlier
    // `cd skills/dw-chart`, so it landed under skills/dw-chart/exports/... instead.
    const wrongDir = join(
      dir,
      "skills",
      "dw-chart",
      "exports",
      REVIEW_ARTIFACTS_DIR,
      "p1",
    );
    mkdirSync(wrongDir, { recursive: true });
    const capture = join(wrongDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html>captured to the WRONG dir</html>");
    const { report, reportPath } = writeReport(
      dir,
      hostedResult(),
      new Date(Date.now() - 60_000).toISOString(),
    );
    const sanctioned = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    let message = "";
    try {
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain(sanctioned);
    expect(message).toMatch(/re-capture|never (move|mv)|do not (move|mv)/i);
  });

  it("names the ABSOLUTE sanctioned capture dir (and forbids an mv) in the STALE-capture refusal", () => {
    const dir = slugDir();
    const reviewDir = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    mkdirSync(reviewDir, { recursive: true });
    const capture = join(reviewDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html>captured for a PRIOR generation</html>");
    backdate(capture, 60_000);
    const { report, reportPath } = writeReport(
      dir,
      hostedResult(),
      new Date().toISOString(),
    );
    let message = "";
    try {
      assertArtifactProvenance({
        report,
        result: report.results[0],
        reportPath,
        artifactPath: capture,
      });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain(reviewDir);
    expect(message).toMatch(/re-capture|never (move|mv)|do not (move|mv)/i);
  });
});
