import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REVIEW_ARTIFACTS_DIR } from "../src/render-provenance";
import { presentArtifact } from "../../../lib/loop/presentation";
import { NO_VIEWER_VAR } from "../../../lib/loop/preview";

const CWD = join(import.meta.dir, "..");
const SHOWN_ENV = { [NO_VIEWER_VAR]: "1" };

// Runs the REAL gate-render CLI; returns { code, stderr }.
function runGate(
  reportPath: string,
  id: string,
  artifactPath: string,
): { code: number; stderr: string } {
  try {
    execFileSync(
      "bun",
      ["scripts/gate-render.mjs", reportPath, id, artifactPath],
      { cwd: CWD, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stderr?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? "" };
  }
}

function slug(): string {
  return mkdtempSync(join(tmpdir(), "splash-gate-cli-"));
}

function writeReport(dir: string, result: Record<string, unknown>): string {
  const reportPath = join(dir, "report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), results: [result] },
      null,
      2,
    ),
  );
  return reportPath;
}

describe("gate-render CLI — provenance of the approved file", () => {
  it("approves the legitimate produced still listed in outputs", () => {
    const dir = slug();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNGDATA");
    const reportPath = writeReport(dir, {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
      renderApproved: false,
      outputs: [still],
    });
    presentArtifact(still, SHOWN_ENV);
    const { code } = runGate(reportPath, "p1", still);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].renderApproved).toBe(true);
    // the report's generation stamp must survive the approval write
    expect(written.generatedAt).toBeString();
  });

  it("REFUSES a hand-planted hosted-embed.html inside the producer build subdir", () => {
    const dir = slug();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNGDATA");
    const planted = join(outDir, "hosted-embed.html");
    writeFileSync(planted, "<html>hand-authored to satisfy the gate</html>");
    const reportPath = writeReport(dir, {
      id: "p1",
      producer: "dw-chart",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: false,
      outputs: [still],
      publicUrl: "https://datawrapper.dwcdn.net/abc123/1/",
    });
    const { code, stderr } = runGate(reportPath, "p1", planted);
    expect(code).not.toBe(0);
    expect(stderr).toContain("not an output of the current produce generation");
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].renderApproved).toBe(false);
  });

  it("REFUSES an approval against a report OLDER than the artifact (produce ran after the report)", () => {
    const dir = slug();
    const outDir = join(dir, "p1");
    mkdirSync(outDir);
    const still = join(outDir, "static.png");
    writeFileSync(still, "PNG-from-a-LATER-produce");
    const reportPath = join(dir, "report.json");
    writeFileSync(
      reportPath,
      JSON.stringify({
        generatedAt: new Date(Date.now() - 120_000).toISOString(),
        results: [
          {
            id: "p1",
            producer: "chart-native",
            format: "static",
            status: "produced",
            reviewed: true,
            renderApproved: false,
            outputs: [still],
          },
        ],
      }),
    );
    const { code, stderr } = runGate(reportPath, "p1", still);
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toMatch(/stale|modified after/);
  });

  it("approves the sanctioned hosted-review capture under _review-artifacts/<id>/", () => {
    const dir = slug();
    const reviewDir = join(dir, REVIEW_ARTIFACTS_DIR, "p1");
    mkdirSync(reviewDir, { recursive: true });
    const reportPath = join(dir, "report.json");
    writeFileSync(
      reportPath,
      JSON.stringify({
        generatedAt: new Date(Date.now() - 60_000).toISOString(),
        results: [
          {
            id: "p1",
            producer: "dw-chart",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: false,
            outputs: [],
            publicUrl: "https://datawrapper.dwcdn.net/abc123/1/",
          },
        ],
      }),
    );
    const capture = join(reviewDir, "hosted-embed-reviewed.html");
    writeFileSync(capture, "<html>captured from the live embed</html>");
    presentArtifact(capture, SHOWN_ENV);
    const { code } = runGate(reportPath, "p1", capture);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].renderApproved).toBe(true);
  });
});
