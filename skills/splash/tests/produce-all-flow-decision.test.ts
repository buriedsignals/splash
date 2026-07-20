import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Integration test for the flow-decision gate wired into the produce-all spine. Unlike a unit
// test on evaluateDecisions (already covered by Task 3), this proves the CLI actually reads
// decisions.jsonl beside accepted.json and surfaces the gate's output on stderr — the real wiring
// contract, not just the helper's existence.
describe("produce-all flow-decision gate wiring", () => {
  function writeFixture(dir: string) {
    const accepted = join(dir, "accepted.json");
    writeFileSync(
      accepted,
      JSON.stringify([
        {
          id: "p1",
          producer: "chart-native",
          format: "static",
          spec: {},
          confirmedTakeaway: "The confirmed takeaway for this fixture",
          provenance: "prose",
        },
      ]),
    );
    // Satisfy the candidate-provenance gate (runs before the flow-decision gate) so the run
    // reaches completion instead of failing on an unrelated invariant.
    writeFileSync(
      join(dir, "candidates.json"),
      JSON.stringify({
        candidates: [
          {
            type: "d3-bars",
            producer: "chart-native",
            tier: "recommended",
            why: "x",
          },
        ],
      }),
    );
    return accepted;
  }

  it("auto-records suggest-chart-invoked at the spine (candidates.json present) — no warning", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-flow-decision-"));
    try {
      // The fixture writes candidates.json beside accepted.json (guided run). The spine confirms
      // that artifact itself and RECORDS suggest-chart-invoked — no reliance on a prose trigger —
      // so it must NOT warn. source-fidelity / producer-escalation do not apply (no source, no
      // dw-reachable type). Net: no flow-decision warning at all.
      const accepted = writeFixture(dir);
      const proc = Bun.spawnSync(
        ["bun", "scripts/produce-all.mjs", accepted, join(dir, "out")],
        { cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" },
      );
      const stderr = proc.stderr.toString();
      expect(proc.exitCode).toBe(0);
      expect(stderr).not.toContain("[flow-decision] warning");
      // and the spine actually wrote the decision to the journal
      const journal = readFileSync(join(dir, "decisions.jsonl"), "utf8");
      expect(journal).toContain("suggest-chart-invoked");
      expect(journal).toContain("produce-all"); // autoRecordedBy marker
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not warn when all registry decisions are already logged in decisions.jsonl", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-flow-decision-"));
    try {
      const accepted = writeFixture(dir);
      const lines = [
        "suggest-chart-invoked",
        "source-fidelity",
        "producer-escalation",
      ]
        .map((id) => JSON.stringify({ id, payload: {}, at: "recorded" }))
        .join("\n");
      writeFileSync(join(dir, "decisions.jsonl"), lines + "\n");
      const proc = Bun.spawnSync(
        ["bun", "scripts/produce-all.mjs", accepted, join(dir, "out")],
        { cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" },
      );
      const stderr = proc.stderr.toString();
      expect(stderr).not.toContain("[flow-decision] warning");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
