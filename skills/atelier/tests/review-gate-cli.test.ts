import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CWD = join(import.meta.dir, "..");

function runReviewGate(args: string[]): { code: number; stderr: string } {
  try {
    execFileSync("bun", ["scripts/review-gate.mjs", ...args], {
      cwd: CWD,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stderr?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? "" };
  }
}

function freshReport(): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-review-cli-"));
  const reportPath = join(dir, "report.json");
  writeFileSync(
    reportPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      results: [
        {
          id: "p1",
          producer: "dw-chart",
          format: "interactive",
          status: "produced",
          renderApproved: false,
          outputs: [],
          publicUrl: "https://datawrapper.dwcdn.net/abc123/1/",
        },
      ],
    }),
  );
  return reportPath;
}

describe("review-gate CLI — probes ledger", () => {
  it("refuses to run without --probes (the ledger is required)", () => {
    const reportPath = freshReport();
    const { code, stderr } = runReviewGate([reportPath, "p1"]);
    expect(code).not.toBe(0);
    expect(stderr).toContain("--probes");
  });

  it('rejects a review whose concern says "404" with no matching probe outcome', () => {
    const reportPath = freshReport();
    const probesPath = join(join(reportPath, ".."), "probes.json");
    writeFileSync(
      probesPath,
      JSON.stringify([
        { check: "title matches the confirmed takeaway", outcome: "pass" },
      ]),
    );
    const { code, stderr } = runReviewGate([
      reportPath,
      "p1",
      "--probes",
      probesPath,
      "dataset.csv returns 404 on the published chart",
    ]);
    expect(code).not.toBe(0);
    expect(stderr).toContain("404");
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].reviewed).toBeUndefined();
  });

  it("accepts when a resolved probe carries the failure with evidence (inline JSON probes)", () => {
    const reportPath = freshReport();
    const probes = JSON.stringify([
      { check: "title matches the confirmed takeaway", outcome: "pass" },
      {
        check: "dataset.csv on the published chart",
        outcome: "resolved",
        note: "first GET returned 404 (fresh publish); retried once after the propagation delay, 200 OK",
      },
    ]);
    const { code } = runReviewGate([reportPath, "p1", "--probes", probes]);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].reviewed).toBe(true);
    expect(written.results[0].reviewProbes).toHaveLength(2);
    expect(written.generatedAt).toBeString();
  });
});
