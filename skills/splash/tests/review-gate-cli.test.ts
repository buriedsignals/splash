import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  const dir = mkdtempSync(join(tmpdir(), "splash-review-cli-"));
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

  it("reads brand-concerns.json from the proposal's OWN outDir (exports/<slug>/<id>/), not the run dir report.json sits in — folds it into reviewConcerns, the reader the file never had", () => {
    const reportPath = freshReport();
    // The real nesting (SKILL.md §5c/§6, render-provenance.ts:155-160): report.json lives
    // at exports/<slug>/report.json, one level ABOVE the per-proposal outDir
    // exports/<slug>/<id>/ that produce.mjs actually writes brand-concerns.json into. A
    // flat co-located fixture (report.json and brand-concerns.json as siblings) cannot
    // express that gap — it would pass under a `dirname(reportPath)` lookup too.
    const runDir = join(reportPath, "..");
    const outDir = join(runDir, "p1");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "brand-concerns.json"),
      JSON.stringify({
        type: "bar",
        concerns: [
          {
            kind: "cvd",
            colour: "#2E7D57",
            reason:
              "brand colour #2E7D57 is not colour-blind-safe (outside the Okabe-Ito set) — kept per the newsroom's house style (render-review concern)",
            nearestAccessible: "#009E73",
          },
        ],
      }),
    );
    const probes = JSON.stringify([
      { check: "title matches the confirmed takeaway", outcome: "pass" },
    ]);
    // No concerns on argv at all — the whole point: the concern reaches the report from
    // the FILE produce.mjs already wrote, not from a hand-typed CLI argument.
    const { code } = runReviewGate([reportPath, "p1", "--probes", probes]);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].reviewConcerns).toHaveLength(1);
    expect(written.results[0].reviewConcerns[0]).toContain("#2E7D57");
    expect(written.results[0].reviewConcerns[0]).toContain(
      "closest accessible hue: #009E73",
    );
  });

  it("folds the file's `advisories` in too — a label-integrity-only run must reach the review", () => {
    // IMPORTANT-5: brand-concerns.json gained a reader but recorded only the CVD/contrast
    // subset. The label-integrity tripwire (the "Interm." data-shortening class) went to
    // produce stdout, which lib/core/verbs/exec.ts discards except on failure — so a run whose
    // ONLY finding was a shortened data label reached nobody. `concerns` here is EMPTY: the
    // advisory has to carry itself.
    const reportPath = freshReport();
    const outDir = join(reportPath, "..", "p1");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "brand-concerns.json"),
      JSON.stringify({
        type: "bar",
        concerns: [],
        advisories: [
          'labelField value "Interm." looks like a truncated data field — its expansion appears in full in the title/alt-text; label-fit must widen the gutter or wrap, never shorten the data',
        ],
      }),
    );
    const probes = JSON.stringify([
      { check: "title matches the confirmed takeaway", outcome: "pass" },
    ]);
    const { code } = runReviewGate([reportPath, "p1", "--probes", probes]);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(written.results[0].reviewConcerns).toHaveLength(1);
    expect(written.results[0].reviewConcerns[0]).toContain(
      "truncated data field",
    );
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
