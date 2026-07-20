import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FLOW_DECISIONS,
  evaluateDecisions,
  getDecision,
} from "./flow-decisions.ts";

describe("flow-decision registry", () => {
  it("every entry is well-formed", () => {
    for (const d of FLOW_DECISIONS) {
      expect(d.id).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(["artifact", "transcript"]).toContain(d.evidenceKind);
      expect(Array.isArray(d.prerequisites)).toBe(true);
      expect(typeof d.required).toBe("boolean");
      if (d.evidenceKind === "artifact")
        expect(typeof d.artifactCheck).toBe("function");
    }
  });

  it("suggest-chart-invoked passes when candidates.json exists in the runDir", () => {
    const runDir = mkdtempSync(join(tmpdir(), "fd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      const d = getDecision("suggest-chart-invoked")!;
      expect(d.artifactCheck!(runDir, {})).toEqual({ ok: true });
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("suggest-chart-invoked fails with a reason when candidates.json is absent", () => {
    const runDir = mkdtempSync(join(tmpdir(), "fd-"));
    try {
      const d = getDecision("suggest-chart-invoked")!;
      const r = d.artifactCheck!(runDir, {});
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain("candidates.json");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});

describe("evaluateDecisions — the spine gate reader", () => {
  it("warns (not errors) on an absent required:false decision", () => {
    const r = evaluateDecisions("/nonexistent", new Set(), {
      only: ["suggest-chart-invoked"],
    });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toContain("suggest-chart-invoked");
  });

  it("is silent when the decision is logged", () => {
    const r = evaluateDecisions(
      "/nonexistent",
      new Set(["suggest-chart-invoked"]),
      {
        only: ["suggest-chart-invoked"],
      },
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe("source-fidelity decision", () => {
  it("passes when the cited URL appears in the article text", () => {
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/unused", {
      article: "Selon l'ETSC (https://etsc.eu), les morts baissent.",
      sourceName: "ETSC",
      sourceUrl: "https://etsc.eu",
    });
    expect(r).toEqual({ ok: true });
  });

  it("fails when the cited URL is absent from the article", () => {
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/unused", {
      article: "Une analyse anonyme des villes européennes.",
      sourceName: "ETSC",
      sourceUrl: "https://etsc.eu/deep/unconfirmed/path",
    });
    expect(r.ok).toBe(false);
  });
});

describe("producer-escalation decision", () => {
  it("write-guard refuses an empty escalationReason", () => {
    const d = getDecision("producer-escalation")!;
    const r = d.writeGuard!({ escalationReason: "  " });
    expect(r.ok).toBe(false);
  });
  it("write-guard accepts a stated reason", () => {
    const d = getDecision("producer-escalation")!;
    expect(
      d.writeGuard!({
        escalationReason: "journalist asked for hover on every city",
      }),
    ).toEqual({ ok: true });
  });
  it("is a transcript-kind decision", () => {
    expect(getDecision("producer-escalation")!.evidenceKind).toBe("transcript");
  });
});
