import { describe, it, expect } from "bun:test";
import { runReview, type ReviewRequest, type ReviewerAdapter } from "./review";
import type { CaptureCheck, CaptureRecord } from "./types";
import type { ReviewerSource } from "./redact";

function captureRecord(over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    breakpoint: "primary",
    path: "/run/elements/e1/review-primary.png",
    sha256: "c".repeat(64),
    cssViewport: { width: 1200, height: 675 },
    deviceScaleFactor: 2,
    rootBox: { x: 24, y: 24, width: 1152, height: 557 },
    rootSelector: "#root > div",
    documentScroll: { width: 1200, height: 605 },
    artifactSha256: "d".repeat(64),
    artifactPath: "/run/elements/e1/interactive.html",
    destinationId: "channel:article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-07-26T10:00:00.000Z",
    marks: 6,
    markColours: ["#1b7f79", "#d95f02"],
    ...over,
  };
}

function source(over: Partial<ReviewerSource> = {}): ReviewerSource {
  return {
    format: "interactive",
    channel: "article-web",
    confirmedTakeaway: "Health premiums rose in every canton shown",
    unit: "Monthly adult premium (CHF)",
    altText:
      "Between 2015 and 2024 the adult premium rose in all three cantons.",
    sourceName: "Provided by the newsroom",
    evidenceExtracts: [{ text: "449 to 583", provenance: "premiums.csv" }],
    captures: [captureRecord()],
    interactionResults: [],
    rubric: ["title states what the visual shows"],
    runId: "run-1",
    elementId: "e1",
    ...over,
  };
}

function request(over: Partial<ReviewRequest> = {}): ReviewRequest {
  return {
    source: source(),
    checks: [],
    reviewedProvenanceHash: "prov-1",
    acceptedDestinationId: "channel:article-web",
    ...over,
  };
}

const PASSING_CHECK: CaptureCheck = {
  id: "capture:fits-viewport",
  breakpoint: "primary",
  outcome: "pass",
  detail: "fits",
};

describe("runReview — capture facts become severity-bearing findings, once", () => {
  it("turns an out-of-frame furniture check into a BLOCKING furniture finding", async () => {
    const r = await runReview(
      request({
        checks: [
          {
            id: "capture:furniture-in-frame",
            breakpoint: "primary",
            role: "source",
            outcome: "fail",
            detail: "the source spans y 554→581 against a 900x560 container",
          },
        ],
      }),
    );
    const f = r.findings.find((x) => x.id === "furniture-below-fold");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("blocking");
    expect(f!.criterion).toBe("furniture");
    expect(f!.provenance).toBe("mechanical");
    expect(f!.evidence.join(" ")).toContain("554");
  });

  it("distinguishes missing furniture from out-of-frame furniture", async () => {
    const r = await runReview(
      request({
        checks: [
          {
            id: "capture:furniture-present",
            breakpoint: "primary",
            role: "source",
            outcome: "fail",
            detail: "no element carries the source text",
          },
        ],
      }),
    );
    expect(r.findings.map((f) => f.id)).toContain("furniture-missing");
    expect(r.findings.map((f) => f.id)).not.toContain("furniture-below-fold");
  });

  it("blocks a component that overflows its publication container", async () => {
    const r = await runReview(
      request({
        checks: [
          {
            id: "capture:fits-viewport",
            breakpoint: "primary",
            outcome: "fail",
            detail: "ends at y 581 outside a 900x560 container",
          },
        ],
      }),
    );
    expect(
      r.findings.find((f) => f.id === "component-overflows-viewport")!.severity,
    ).toBe("blocking");
  });

  it("collapses the same defect at several breakpoints into ONE finding", async () => {
    const at = (breakpoint: CaptureCheck["breakpoint"]): CaptureCheck => ({
      id: "capture:fits-viewport",
      breakpoint,
      outcome: "fail",
      detail: `overflow at ${breakpoint}`,
    });
    const r = await runReview(
      request({ checks: [at("narrow"), at("primary"), at("wide")] }),
    );
    const overflow = r.findings.filter(
      (f) => f.id === "component-overflows-viewport",
    );
    expect(overflow).toHaveLength(1);
    // …but every breakpoint is still in the evidence, so nothing is lost by collapsing.
    expect(overflow[0]!.evidence).toHaveLength(3);
  });
});

describe("runReview — the still must represent the accepted destination (#10)", () => {
  it("BLOCKS a still whose recorded target is not the accepted delivery profile", async () => {
    const r = await runReview(
      request({
        source: source({
          captures: [captureRecord({ destinationId: "adhoc-900x560" })],
        }),
        acceptedDestinationId: "heidi-article-embed",
        checks: [PASSING_CHECK],
      }),
    );
    const f = r.findings.find((x) => x.id === "destination-mismatch");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("blocking");
    expect(f!.evidence.join(" ")).toContain("adhoc-900x560");
  });

  it("blocks a review with no capture at all rather than reviewing nothing", async () => {
    const r = await runReview(
      request({ source: source({ captures: [] }), checks: [] }),
    );
    expect(r.findings.find((f) => f.id === "no-capture")!.severity).toBe(
      "blocking",
    );
  });
});

describe("runReview — the evidence checks code can actually make", () => {
  it("blocks a missing alt text", async () => {
    const r = await runReview(
      request({ source: source({ altText: "   " }), checks: [PASSING_CHECK] }),
    );
    expect(r.findings.find((f) => f.id === "alt-text-missing")!.severity).toBe(
      "blocking",
    );
  });

  it("blocks a missing source attribution", async () => {
    const r = await runReview(
      request({ source: source({ sourceName: "" }), checks: [PASSING_CHECK] }),
    );
    expect(r.findings.find((f) => f.id === "source-missing")!.severity).toBe(
      "blocking",
    );
  });

  it("warns — does not block — on a missing unit", async () => {
    const r = await runReview(
      request({ source: source({ unit: "" }), checks: [PASSING_CHECK] }),
    );
    expect(r.findings.find((f) => f.id === "unit-missing")!.severity).toBe(
      "warning",
    );
  });

  it("reports nothing at all on a clean artifact", async () => {
    const r = await runReview(request({ checks: [PASSING_CHECK] }));
    expect(r.findings).toStrictEqual([]);
  });
});

describe("runReview — the mode is recorded, never assumed (#9)", () => {
  it("says 'mechanical' and 'unavailable' when no independent reviewer is wired", async () => {
    const r = await runReview(request({ checks: [PASSING_CHECK] }));
    expect(r.reviewer.mode).toBe("mechanical");
    expect(r.reviewer.independentSemanticReview).toBe("unavailable");
    expect(r.reviewer.inputsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.reviewer.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never claims independence just because nothing was found", async () => {
    const r = await runReview(request({ checks: [PASSING_CHECK] }));
    expect(r.reviewer.mode).not.toBe("independent");
  });

  it("records 'independent' — and RE-SEVERITISES — when an adapter answers", async () => {
    const adapter: ReviewerAdapter = {
      name: "test-critic",
      version: "1.0.0",
      review: async (input) => {
        // Proof that the adapter really is fed the redacted input.
        expect(JSON.stringify(input)).not.toContain("run-1");
        return [
          {
            id: "title-overstates-the-data",
            criterion: "title-fidelity",
            summary: "the title says 'every canton' but three are shown",
            evidence: ["title vs 3 rows"],
            // An adapter trying to grade its own finding down: ignored.
            severity: "informational",
          },
        ];
      },
    };
    const r = await runReview(request({ checks: [PASSING_CHECK], adapter }));
    expect(r.reviewer.mode).toBe("independent");
    expect(r.reviewer.name).toBe("test-critic");
    expect(r.reviewer.independentSemanticReview).toBe("available");
    const f = r.findings.find((x) => x.id === "title-overstates-the-data")!;
    expect(f.severity).toBe("blocking"); // title-fidelity's central default
    expect(f.provenance).toBe("independent");
  });

  it("records 'declined' and falls back to mechanical when the adapter throws (I1)", async () => {
    const adapter: ReviewerAdapter = {
      name: "flaky-critic",
      version: "0.1.0",
      review: async () => {
        throw new Error("the reviewer service is unreachable");
      },
    };
    const r = await runReview(request({ checks: [PASSING_CHECK], adapter }));
    expect(r.reviewer.mode).toBe("mechanical");
    expect(r.reviewer.independentSemanticReview).toBe("declined");
    // The failure is not silent: it is in the record as an informational finding.
    expect(r.findings.some((f) => f.id === "independent-review-declined")).toBe(
      true,
    );
  });

  it("refuses to run an adapter on a contaminated input rather than leaking to it", async () => {
    let sawInput = false;
    const adapter: ReviewerAdapter = {
      name: "watcher",
      version: "1",
      review: async () => {
        sawInput = true;
        return [];
      },
    };
    // A rubric line carrying plumbing — the belt in redact.ts trips before the send.
    const r = await runReview(
      request({
        source: source({ rubric: ["compare against runId run-1"] }),
        checks: [PASSING_CHECK],
        adapter,
      }),
    );
    expect(sawInput).toBe(false);
    expect(r.reviewer.independentSemanticReview).toBe("declined");
  });
});

describe("runReview — the record is a record (I6)", () => {
  it("carries the captures, the checks and the reviewed provenance, and round-trips", async () => {
    const r = await runReview(request({ checks: [PASSING_CHECK] }));
    expect(r.reviewedProvenanceHash).toBe("prov-1");
    expect(r.captures).toHaveLength(1);
    expect(r.checks).toHaveLength(1);
    expect(r.overrides).toStrictEqual([]);
    expect(r.acknowledged).toStrictEqual([]);
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  });
});
