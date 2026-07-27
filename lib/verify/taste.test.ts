import { describe, it, expect } from "bun:test";
import {
  DENSITY_MARKS_PER_100PX,
  MIN_COLOUR_SEPARATION,
  TAKEAWAY_OVERLAP_FLOOR,
  WHITESPACE_FILL_FLOOR,
  detectTasteRisks,
} from "./taste";
import { runReview } from "./review";
import type { CaptureRecord } from "./types";

function captureRecord(over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    breakpoint: "primary",
    path: "/run/review-primary.png",
    sha256: "c".repeat(64),
    cssViewport: { width: 1200, height: 675 },
    deviceScaleFactor: 2,
    rootBox: { x: 24, y: 24, width: 1152, height: 557 },
    rootSelector: "#root > div",
    documentScroll: { width: 1200, height: 605 },
    artifactSha256: "d".repeat(64),
    artifactPath: "/run/interactive.html",
    destinationId: "channel:article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-07-26T10:00:00.000Z",
    marks: 18,
    markColours: ["#1b7f79", "#d95f02"],
    ...over,
  };
}

const TAKEAWAY = "Health premiums rose in every canton shown";

describe("the taste lane names a RISK — it never grades", () => {
  it("has no field a verdict could be written into", () => {
    const [signal] = detectTasteRisks({
      captures: [captureRecord({ marks: 4000 })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(signal).toBeDefined();
    expect(Object.keys(signal!).sort()).toStrictEqual([
      "detector",
      "dimension",
      "evidence",
      "routedTo",
    ]);
    expect(signal!.routedTo).toBe("human-signoff");
  });

  it("stays quiet on a comfortable, on-message chart", () => {
    expect(
      detectTasteRisks({
        captures: [captureRecord()],
        confirmedTakeaway: TAKEAWAY,
        renderedTitle: TAKEAWAY,
      }),
    ).toStrictEqual([]);
  });
});

describe("density", () => {
  it("flags a chart carrying more marks than its width can carry", () => {
    const perWidth = Math.ceil((1152 / 100) * DENSITY_MARKS_PER_100PX + 1);
    const risks = detectTasteRisks({
      captures: [captureRecord({ marks: perWidth })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const d = risks.find((r) => r.dimension === "density");
    expect(d).toBeDefined();
    expect(d!.evidence.join(" ")).toContain(String(perWidth));
  });

  it("judges density against the NARROW breakpoint too, not only the roomy one", () => {
    const risks = detectTasteRisks({
      captures: [
        captureRecord({
          breakpoint: "narrow",
          rootBox: { x: 24, y: 24, width: 312, height: 584 },
          marks: 60,
        }),
      ],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "density")).toBe(true);
  });
});

describe("palette adjacency", () => {
  it("flags two categorical colours a reader may not be able to tell apart", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord({ markColours: ["#1b7f79", "#1d8a80"] })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const p = risks.find((r) => r.dimension === "palette-adjacency");
    expect(p).toBeDefined();
    expect(p!.evidence.join(" ")).toContain("#1b7f79");
    expect(MIN_COLOUR_SEPARATION).toBeGreaterThan(0);
  });

  it("says nothing about a well-separated pair", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord({ markColours: ["#1b7f79", "#d95f02"] })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "palette-adjacency")).toBe(false);
  });
});

describe("title vs confirmed takeaway", () => {
  it("flags a title that shares almost nothing with what the journalist confirmed", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord()],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: "Swiss cantons compared",
    });
    const t = risks.find((r) => r.dimension === "title-takeaway-divergence");
    expect(t).toBeDefined();
    expect(t!.evidence.join(" ")).toContain("Swiss cantons compared");
    expect(TAKEAWAY_OVERLAP_FLOOR).toBeGreaterThan(0);
  });

  it("says nothing when no title was rendered — that is a furniture question, not taste", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord()],
      confirmedTakeaway: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "title-takeaway-divergence")).toBe(
      false,
    );
  });
});

describe("whitespace", () => {
  it("flags a component that barely fills the container it publishes into", () => {
    const risks = detectTasteRisks({
      captures: [
        captureRecord({
          rootBox: { x: 24, y: 24, width: 200, height: 120 },
        }),
      ],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const w = risks.find((r) => r.dimension === "whitespace");
    expect(w).toBeDefined();
    expect(WHITESPACE_FILL_FLOOR).toBeGreaterThan(0);
  });
});

describe("the lane reaches the review record, separated from the findings", () => {
  it("carries taste risks in their own field, and never as a blocking finding", async () => {
    const r = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: "CHF",
        altText: "a description",
        sourceName: "the newsroom",
        evidenceExtracts: [],
        captures: [captureRecord({ markColours: ["#1b7f79", "#1d8a80"] })],
        interactionResults: [],
        rubric: [],
        renderedTitle: "Swiss cantons compared",
      },
      checks: [],
      reviewedProvenanceHash: "prov-1",
      acceptedDestinationId: "channel:article-web",
    });
    expect(r.tasteRisk.length).toBeGreaterThan(0);
    expect(r.findings.every((f) => f.severity !== "blocking")).toBe(true);
    // The two lanes must not bleed: no finding may be minted from a taste dimension.
    for (const t of r.tasteRisk)
      expect(r.findings.some((f) => f.id === t.dimension)).toBe(false);
    expect(JSON.parse(JSON.stringify(r.tasteRisk))).toStrictEqual(r.tasteRisk);
  });
});
