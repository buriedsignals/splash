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
      stderr: proc.stderr.toString(),
      report: JSON.parse(proc.stdout.toString() || "{}"),
    };
  }

  // The batch-level precondition (lib/loop/preconditions.ts's productionPrecondition, wired
  // ahead of the flow-decision gate) now refuses this exact case — no candidates.json at all —
  // BEFORE produceAll ever runs, so no report is printed to stdout to parse (that is the whole
  // point: no half-built artifact, cf. produce-all-menu-precondition.test.ts). This case moved
  // from asserting a per-proposal report entry to asserting the batch-level refusal on stderr.
  it("refuses the whole batch — not a per-proposal report entry — when no candidates.json sits beside accepted.json", () => {
    const { dir, acceptedPath } = setup(); // no candidates.json
    try {
      const { exitCode, stderr } = run(acceptedPath, join(dir, "out"));
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("no ranked list of visuals");
      expect(stderr).toContain("candidates.json");
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

  it("surfaces the menu-level narrative-consideration warning (Tom #3) when the menu skipped narrative silently", () => {
    const { dir, acceptedPath } = setup({
      candidates: [
        {
          type: "d3-bars",
          producer: "chart-native",
          tier: "recommended",
          why: "x",
        },
        {
          type: "dot-plot",
          producer: "chart-native",
          tier: "possible",
          why: "y",
        },
      ],
    });
    try {
      const { report } = run(acceptedPath, join(dir, "out"));
      expect(report.warnings ?? []).toEqual([
        expect.stringContaining("narrative"),
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits NO menu warning when the menu explicitly ruled narrative out", () => {
    const { dir, acceptedPath } = setup({
      candidates: [
        {
          type: "d3-bars",
          producer: "chart-native",
          tier: "recommended",
          why: "x",
        },
      ],
      narrativeRuledOut: "single snapshot — nothing to narrate",
    });
    try {
      const { report } = run(acceptedPath, join(dir, "out"));
      expect(report.warnings ?? []).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
