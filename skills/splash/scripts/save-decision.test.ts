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
import { checkWriteEligibility, readDecisions } from "./save-decision.mjs";

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

  it("skips a corrupt trailing line rather than throwing, keeping the well-formed decisions", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      writeFileSync(
        join(runDir, "decisions.jsonl"),
        '{"id":"a","payload":{},"at":"recorded"}\n' +
          "{not valid json\n" +
          '{"id":"b","payload":{},"at":"recorded"}\n',
      );
      const decisions = readDecisions(runDir);
      expect(decisions.map((d) => d.id)).toEqual(["a", "b"]);
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

describe("checkWriteEligibility — pure write-eligibility policy", () => {
  const syntheticDecision = {
    id: "x",
    evidenceKind: "transcript" as const,
    prerequisites: ["gate-1b"],
    required: false,
    writeGuard: () => ({ ok: true }) as const,
  };

  it("refuses when a declared prerequisite is not yet logged", () => {
    const result = checkWriteEligibility(
      syntheticDecision,
      new Set(),
      "/unused",
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("gate-1b");
    }
  });

  it("passes once the declared prerequisite is logged", () => {
    const result = checkWriteEligibility(
      syntheticDecision,
      new Set(["gate-1b"]),
      "/unused",
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("refuses cleanly (no throw) when an artifact-kind decision declares no artifactCheck", () => {
    const decision = {
      id: "y",
      evidenceKind: "artifact" as const,
      prerequisites: [],
      required: false,
    };
    const result = checkWriteEligibility(decision, new Set(), "/unused", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("y");
      expect(result.reason).toContain("artifactCheck");
    }
  });
});
