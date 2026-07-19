import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Locks the CLI seam: produce-all.mjs resolves candidates.json as the SIBLING of accepted.json
// and enforces provenance on the real path. Uses the "no candidates.json" case so the gate fires
// BEFORE any real dispatch/build — fast and hermetic (no network, no producer run).
describe("produce-all.mjs — candidate-provenance CLI wiring", () => {
  const scriptPath = join(import.meta.dir, "produce-all.mjs");

  function setup(candidates?: unknown) {
    const dir = mkdtempSync(join(tmpdir(), "splash-produce-prov-"));
    const acceptedPath = join(dir, "accepted.json");
    writeFileSync(
      acceptedPath,
      JSON.stringify([
        {
          id: "hand-authored",
          producer: "chart-native",
          format: "static",
          confirmedTakeaway: "Test takeaway",
          spec: { nativeType: "d3-bars", title: "X" },
        },
      ]),
    );
    if (candidates !== undefined) {
      writeFileSync(join(dir, "candidates.json"), JSON.stringify(candidates));
    }
    return { dir, acceptedPath };
  }

  function run(acceptedPath: string, outDir: string) {
    const proc = Bun.spawnSync(["bun", scriptPath, acceptedPath, outDir], {
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: proc.exitCode,
      report: JSON.parse(proc.stdout.toString() || "{}"),
    };
  }

  it("fails a non-direct proposal when no candidates.json sits beside accepted.json", () => {
    const { dir, acceptedPath } = setup(); // no candidates.json
    try {
      const { exitCode, report } = run(acceptedPath, join(dir, "out"));
      expect(exitCode).not.toBe(0);
      expect(report.results[0].status).toBe("failed");
      expect(report.results[0].error).toContain("candidate-provenance");
      expect(report.results[0].error).toContain("candidates.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a proposal whose producer is absent from the sibling candidates.json", () => {
    const { dir, acceptedPath } = setup({
      candidates: [
        {
          type: "column-chart",
          producer: "dw-chart",
          tier: "recommended",
          why: "x",
        },
      ],
    });
    try {
      const { exitCode, report } = run(acceptedPath, join(dir, "out"));
      expect(exitCode).not.toBe(0);
      expect(report.results[0].status).toBe("failed");
      expect(report.results[0].error).toContain("candidate-provenance");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("clears the provenance gate when the sibling candidates.json names the matching producer (fails LATER, at spec validation — proof it passed provenance)", () => {
    const { dir, acceptedPath } = setup({
      candidates: [
        {
          type: "d3-bars",
          producer: "chart-native",
          tier: "recommended",
          why: "x",
        },
      ],
    });
    try {
      const { report } = run(acceptedPath, join(dir, "out"));
      // The dummy spec fails spec validation — but crucially NOT on provenance, proving the
      // gate let the matching pair through to the next stage.
      expect(report.results[0].error ?? "").not.toContain(
        "candidate-provenance",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
