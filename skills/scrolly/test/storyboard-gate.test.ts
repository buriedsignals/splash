// FINDING 9 (stress round three): storyboardGateStatus is a REPORT, never a refusal — see its own
// header in scripts/storyboard-gate.mjs for the full reasoning (a hard refusal here would make the
// stress-testing methodology that found this finding impossible to run unattended). These cases
// exercise every branch a caller reads: not found, closed, open, and that it never throws.
import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storyboardGateStatus } from "../scripts/storyboard-gate.mjs";

describe("storyboardGateStatus", () => {
  it("should report not found when no STORYBOARD.md exists above the beat", () => {
    const root = mkdtempSync(join(tmpdir(), "storyboard-gate-"));
    const beat = join(root, "beats", "b1");
    mkdirSync(beat, { recursive: true });
    const status = storyboardGateStatus(beat);
    expect(status.found).toBe(false);
    expect(status.closed).toBe(false);
    expect(status.reason).toMatch(/no STORYBOARD\.md found/);
    rmSync(root, { recursive: true, force: true });
  });

  it("should report closed when a STORYBOARD.md above the beat carries a takeaway", () => {
    const root = mkdtempSync(join(tmpdir(), "storyboard-gate-"));
    const beat = join(root, "beats", "b1");
    mkdirSync(beat, { recursive: true });
    writeFileSync(join(root, "STORYBOARD.md"), "---\ntakeaway: Something confirmed\n---\n");
    const status = storyboardGateStatus(beat);
    expect(status.found).toBe(true);
    expect(status.closed).toBe(true);
    expect(status.reason).toBe(null);
    rmSync(root, { recursive: true, force: true });
  });

  it("should report open when a STORYBOARD.md exists but carries no takeaway", () => {
    const root = mkdtempSync(join(tmpdir(), "storyboard-gate-"));
    const beat = join(root, "beats", "b1");
    mkdirSync(beat, { recursive: true });
    writeFileSync(join(root, "STORYBOARD.md"), "---\ntakeaway: null\n---\n");
    const status = storyboardGateStatus(beat);
    expect(status.found).toBe(true);
    expect(status.closed).toBe(false);
    expect(status.reason).toMatch(/gate 2 has not closed/);
    rmSync(root, { recursive: true, force: true });
  });

  it("should never throw, even against a path with no story above it at all", () => {
    expect(() => storyboardGateStatus("/definitely/does/not/exist/anywhere")).not.toThrow();
  });
});
