// skills/splash/scripts/save-decision.test.ts
import { describe, expect, it } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDecisions } from "./save-decision.mjs";

const script = join(import.meta.dir, "save-decision.mjs");
function run(args: string[], cwd?: string) {
  return Bun.spawnSync(["bun", script, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd,
  });
}

describe("save-decision.mjs — sanctioned journal writer", () => {
  it("refuses at write-time when the corroborating artifact is missing", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      const p = run(["suggest-chart-invoked", runDir]);
      expect(p.exitCode).not.toBe(0);
      expect(p.stderr.toString()).toContain("candidates.json");
      expect(existsSync(join(runDir, "decisions.jsonl"))).toBe(false);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("records the decision when the artifact is present", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      const p = run(["suggest-chart-invoked", runDir]);
      expect(p.exitCode).toBe(0);
      const decisions = readDecisions(runDir);
      expect(decisions.map((d) => d.id)).toEqual(["suggest-chart-invoked"]);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("appends rather than overwrites", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      run(["suggest-chart-invoked", runDir]);
      run(["suggest-chart-invoked", runDir]);
      expect(readDecisions(runDir).length).toBe(2);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("refuses an unknown decision id", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      const p = run(["not-a-real-decision", runDir]);
      expect(p.exitCode).not.toBe(0);
      expect(p.stderr.toString()).toMatch(/unknown decision/i);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});
