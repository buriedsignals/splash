import { describe, it, expect } from "bun:test";
import {
  INTERNAL_PATTERNS,
  assertNoInternals,
  buildReviewerInput,
  hashReviewerInput,
  hashReviewerOutput,
  type ReviewerSource,
} from "./redact";
import type { CaptureRecord, Finding } from "./types";

const RUN_DIR = "/Users/someone/runs/heidi-premiums-2026";

function captureRecord(): CaptureRecord {
  return {
    breakpoint: "primary",
    path: `${RUN_DIR}/elements/e1/review-primary.png`,
    sha256: "c".repeat(64),
    cssViewport: { width: 1200, height: 675 },
    deviceScaleFactor: 2,
    rootBox: { x: 24, y: 24, width: 1152, height: 557 },
    rootSelector: "#root > div",
    documentScroll: { width: 1200, height: 605 },
    artifactSha256: "d".repeat(64),
    artifactPath: `${RUN_DIR}/elements/e1/interactive.html`,
    destinationId: "channel:article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-07-26T10:00:00.000Z",
    marks: 18,
    markColours: ["#1b7f79"],
  };
}

// Deliberately stuffed with orchestration internals — the reviewer must see none of it.
function contaminatedSource(): ReviewerSource {
  return {
    format: "interactive",
    channel: "article-web",
    confirmedTakeaway: "Health premiums rose in every canton shown",
    unit: "Monthly adult premium (CHF)",
    altText:
      "Between 2015 and 2024 the adult premium rose in all three cantons.",
    sourceName: "Provided by the newsroom",
    evidenceExtracts: [
      { text: "Geneva 449 to 583", provenance: "premiums.csv row 2" },
    ],
    captures: [captureRecord()],
    interactionResults: [
      { name: "tooltip-in-viewport", outcome: "pass", detail: "tooltip flips" },
    ],
    rubric: ["title states what the visual shows", "every number is sourced"],
    runDir: RUN_DIR,
    runId: "run-2026-07-26-premiums",
    elementId: "e1",
    chosenId: "slope-interactive",
    why: "two points in time, three subjects",
    whySource: { sheet: "docs/kb/slope.md", fragments: ["FT slope"] },
    provenanceHash: "4972c89a36fe6245e9f902cd579a0b14",
    agentLabel: "task-agent-7",
  };
}

describe("buildReviewerInput — the reviewer sees the artifact, not the process", () => {
  it("carries the evidence a critique actually needs", () => {
    const input = buildReviewerInput(contaminatedSource());
    expect(input.confirmedTakeaway).toBe(
      "Health premiums rose in every canton shown",
    );
    expect(input.unit).toBe("Monthly adult premium (CHF)");
    expect(input.sourceName).toBe("Provided by the newsroom");
    expect(input.evidenceExtracts[0]!.provenance).toBe("premiums.csv row 2");
    expect(input.renders[0]!.cssViewport).toStrictEqual({
      width: 1200,
      height: 675,
    });
    expect(input.renders[0]!.artifactSha256).toBe("d".repeat(64));
    expect(input.interactionResults[0]!.name).toBe("tooltip-in-viewport");
    expect(input.rubric).toHaveLength(2);
  });

  it("carries NONE of the orchestration internals", () => {
    const json = JSON.stringify(buildReviewerInput(contaminatedSource()));
    for (const leak of [
      "run-2026-07-26-premiums",
      "slope-interactive",
      "two points in time",
      "docs/kb/slope.md",
      "4972c89a36fe6245e9f902cd579a0b14",
      "task-agent-7",
      RUN_DIR,
    ])
      expect(json, `"${leak}" reached the reviewer`).not.toContain(leak);
  });

  it("does not carry an internal field added tomorrow — it is a whitelist, not a filter", () => {
    const source = {
      ...contaminatedSource(),
      someFutureInternalField: "leaked-tomorrow",
    } as ReviewerSource;
    expect(JSON.stringify(buildReviewerInput(source))).not.toContain(
      "leaked-tomorrow",
    );
  });

  it("keeps a render's file NAME but never its run-dir path", () => {
    const input = buildReviewerInput(contaminatedSource());
    expect(input.renders[0]!.path).toBe("review-primary.png");
  });

  it("round-trips through JSON with no key lost (I6)", () => {
    const input = buildReviewerInput(contaminatedSource());
    expect(JSON.parse(JSON.stringify(input))).toStrictEqual(input);
  });
});

describe("assertNoInternals — the belt over the whitelist's braces", () => {
  it("passes a clean input", () => {
    expect(() =>
      assertNoInternals(buildReviewerInput(contaminatedSource())),
    ).not.toThrow();
  });

  it("throws when an internal identifier is present, naming the pattern not the value", () => {
    const dirty = {
      ...buildReviewerInput(contaminatedSource()),
      // A caller hand-assembling an input, the way a future adapter might.
      confirmedTakeaway: 'see runId "run-2026-07-26-premiums" for context',
    };
    expect(() => assertNoInternals(dirty)).toThrow(/runId/);
    // The message must not echo the private content it is protecting.
    try {
      assertNoInternals(dirty);
    } catch (e) {
      expect((e as Error).message).not.toContain("run-2026-07-26-premiums");
    }
  });

  it("catches every declared pattern", () => {
    for (const p of INTERNAL_PATTERNS) {
      const dirty = {
        ...buildReviewerInput(contaminatedSource()),
        rubric: [`internal: ${p.probe}`],
      };
      expect(
        () => assertNoInternals(dirty),
        `pattern "${p.name}" was not caught`,
      ).toThrow();
    }
  });
});

describe("hashing — the record can prove WHAT was reviewed", () => {
  it("is stable under key permutation and changes with the evidence", () => {
    const a = buildReviewerInput(contaminatedSource());
    const b = buildReviewerInput({
      ...contaminatedSource(),
      evidenceExtracts: [
        { text: "Geneva 449 to 583", provenance: "premiums.csv row 2" },
      ],
    });
    expect(hashReviewerInput(a)).toBe(hashReviewerInput(b));

    const changed = buildReviewerInput({
      ...contaminatedSource(),
      confirmedTakeaway: "Premiums fell",
    });
    expect(hashReviewerInput(changed)).not.toBe(hashReviewerInput(a));
  });

  it("hashes findings independently of their array order", () => {
    const f = (id: string): Finding => ({
      id,
      criterion: "craft",
      severity: "informational",
      status: "open",
      summary: id,
      evidence: [],
      provenance: "mechanical",
    });
    expect(hashReviewerOutput([f("a"), f("b")])).toBe(
      hashReviewerOutput([f("b"), f("a")]),
    );
    expect(hashReviewerOutput([f("a")])).not.toBe(
      hashReviewerOutput([f("a"), f("b")]),
    );
  });
});
