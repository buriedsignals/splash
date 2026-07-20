import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FLOW_DECISIONS,
  applicableDecisions,
  evaluateDecisions,
  getDecision,
} from "./flow-decisions.ts";
import type { AcceptedProposal } from "./producer-spec";

// Minimal AcceptedProposal fixture — only the fields applicability reads.
function proposal(over: Partial<AcceptedProposal> = {}): AcceptedProposal {
  return {
    id: "p1",
    producer: "chart-native",
    format: "static",
    spec: {},
    confirmedTakeaway: "t",
    ...over,
  };
}

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

describe("applicableDecisions — scope only-set from the accepted proposals (lever 1b prep)", () => {
  it("includes suggest-chart-invoked on a guided proposal (no direct branch token)", () => {
    expect(applicableDecisions([proposal()])).toContain(
      "suggest-chart-invoked",
    );
  });

  it("excludes suggest-chart-invoked when every proposal is direct-branch", () => {
    const direct = proposal({ skillsInvoked: ["splash:cadrage-direct"] });
    expect(applicableDecisions([direct])).not.toContain(
      "suggest-chart-invoked",
    );
  });

  it("includes source-fidelity only when a proposal cites a source", () => {
    expect(
      applicableDecisions([proposal({ sourceHint: { name: "ETSC" } })]),
    ).toContain("source-fidelity");
    expect(applicableDecisions([proposal()])).not.toContain("source-fidelity");
  });

  it("treats a blank sourceHint as no source", () => {
    const blank = proposal({ sourceHint: { name: "  ", url: "" } });
    expect(applicableDecisions([blank])).not.toContain("source-fidelity");
  });

  it("keeps a decision with no applies predicate always in scope (producer-escalation, un-scoped for now)", () => {
    // producer-escalation declares no applicability yet (needs the chart-native↔dw type set,
    // bundled with requirement 3), so it must stay conservatively in scope, not vanish silently.
    expect(applicableDecisions([proposal()])).toContain("producer-escalation");
  });

  it("is the union across a batch — one guided + one direct still scopes suggest-chart-invoked", () => {
    const guided = proposal({ id: "a" });
    const direct = proposal({
      id: "b",
      skillsInvoked: ["splash:cadrage-direct"],
    });
    expect(applicableDecisions([guided, direct])).toContain(
      "suggest-chart-invoked",
    );
  });

  it("tolerates a non-array input by scoping to the always-in decisions", () => {
    // @ts-expect-error — defensive: produce-all may hand a malformed accepted.json through.
    expect(applicableDecisions(null)).toContain("producer-escalation");
  });
});
