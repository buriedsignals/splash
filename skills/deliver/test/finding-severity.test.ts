/**
 * SEVERITY, AND THE ONE THING IT BUYS — issue #11.
 *
 * Review findings were bare strings, so a source-traceability failure and a kerning note arrived in
 * the same list and shipped through the same "approve". This pins the two properties that changes:
 * the mapping is decided in ONE place, and a blocking finding stops the gate until a journalist
 * overrides it by name with a reason.
 *
 * WHAT IS NOT TESTED HERE, because it is not new. "Re-production invalidates overrides" and
 * "findings reset for a new artifact" already held before this issue: `approvalAgainstCurrent`
 * compares the review's `draftDigest` against a fresh `renderDigest` of the rendered tree's own
 * bytes, so any re-render makes the whole review stale, override included. The last test below
 * asserts that interaction rather than a second mechanism, so it stays true if either half moves.
 */
import { describe, it, expect } from "bun:test";
import {
  CRITERION_SEVERITY,
  SEVERITIES,
  UNKNOWN_SEVERITY,
  blockingFindings,
  blockingGap,
  criterionOf,
  severityOf,
} from "../scripts/finding-severity.mjs";

describe("finding severity is decided in one place", () => {
  it("should give every criterion a severity from the closed set", () => {
    // The premise: the whole point is that severity is a property of the DEFECT, not of whoever
    // found it, so an unclassified criterion must be impossible rather than merely unlikely.
    expect(Object.keys(CRITERION_SEVERITY).length).toBeGreaterThan(6);
    for (const [criterion, level] of Object.entries(CRITERION_SEVERITY)) {
      expect([criterion, SEVERITIES.includes(level)]).toEqual([criterion, true]);
    }
  });

  it("should reserve blocking for what makes a visual unsafe to ship", () => {
    // Not "worse" — unsafe. A reader misled, a reader excluded, or an artifact that does not do
    // what its format promises.
    for (const id of [
      "claim-unsupported",
      "data-mismatch",
      "source-traceability",
      "accessibility-contrast",
      "interaction-missing",
      "staleness-source-moved",
    ]) {
      expect([id, severityOf(id)]).toEqual([id, "blocking"]);
    }
    for (const id of ["polish-kerning", "craft-spacing"]) {
      expect([id, severityOf(id)]).toEqual([id, "informational"]);
    }
  });

  it("should read the criterion off the id, so no second list has to agree", () => {
    expect(criterionOf("source-traceability")).toBe("source");
    expect(criterionOf("source")).toBe("source");
    expect(() => criterionOf("")).toThrow(/cannot be empty/);
  });

  it("should treat an unclassified finding as a warning, never as informational", () => {
    // An id nobody has classified is one nobody has decided about. Defaulting it to silence is how
    // a real concern becomes a stylistic note; defaulting it to blocking would let a typo stop a
    // newsroom shipping.
    expect(severityOf("wibble-unknown")).toBe(UNKNOWN_SEVERITY);
    expect(UNKNOWN_SEVERITY).toBe("warning");
  });

  it("should leave the fixtures' own generic ids non-blocking", () => {
    // `finding-1`, `finding-chart`, `finding-other` are what this repo's fixtures carry. They must
    // not become blocking by accident, or this change would stop every existing approval.
    for (const id of ["finding-1", "finding-chart", "finding-other"]) {
      expect([id, severityOf(id)]).toEqual([id, "warning"]);
    }
  });
});

describe("a blocking finding stops the gate until it is overridden by name", () => {
  it("should refuse while a blocking finding is open", () => {
    const gap = blockingGap(["source-traceability", "polish-kerning"]);
    expect(gap).toContain("source-traceability");
    // The refusal says what blocking MEANS and what to do, because a refusal that names neither is
    // one a journalist works around rather than acts on.
    expect(gap).toContain("unsafe to ship");
    expect(gap).toContain("override");
    // And it does not drag the informational finding into the refusal.
    expect(gap).not.toContain("polish-kerning");
  });

  it("should pass when nothing blocking is open", () => {
    expect(blockingGap(["polish-kerning", "title-wording"])).toBeNull();
    expect(blockingGap([])).toBeNull();
  });

  it("should accept an override that carries a reason", () => {
    expect(
      blockingGap(["source-traceability"], {
        "source-traceability": { reason: "the URL is embargoed until Friday", at: "2026-09-03T21:00:00Z", by: "journalist" },
      }),
    ).toBeNull();
  });

  it("should refuse an override with no reason — a record of nothing", () => {
    for (const reason of ["", "   ", undefined]) {
      expect(blockingGap(["source-traceability"], { "source-traceability": { reason } })).toContain(
        "source-traceability",
      );
    }
  });

  it("should refuse an override that names a different finding", () => {
    // Overriding one blocker must not clear another. This is the "by name" half of the contract.
    const gap = blockingGap(["source-traceability", "claim-unsupported"], {
      "source-traceability": { reason: "embargoed" },
    });
    expect(gap).toContain("claim-unsupported");
    expect(gap).not.toContain("source-traceability,");
  });

  it("should list only the blocking findings", () => {
    expect(blockingFindings(["polish-kerning", "claim-unsupported", "title-wording"])).toEqual([
      "claim-unsupported",
    ]);
  });
});

/**
 * THROUGH THE REAL APPROVAL PATH, not the pure function. A guard that is correct in isolation and
 * unwired is this repository's most-repeated defect — #43, #49 and #54 were all exactly that — so
 * this drives `approveCurrentOutput` itself.
 */
describe("the refusal is wired into approval, not only into the helper", () => {
  it("should refuse to approve an output carrying an open blocking finding", async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { approveCurrentOutput } = await import("./output-review-fixture");

    const beatDir = join(await mkdtemp(join(tmpdir(), "sev-")), "1-rainfall");
    try {
      await mkdir(join(beatDir, "renders"), { recursive: true });
      await writeFile(join(beatDir, "renders", "still.png"), "x");
      // The same call the rest of the suite makes, with one finding renamed to a blocking criterion.
      await expect(
        approveCurrentOutput(beatDir, { findingIds: ["source-traceability"] }),
      ).rejects.toThrow(/blocking finding/);
      // And the control: the identical call with a non-blocking finding still approves, so the
      // refusal is the severity talking and not the fixture being broken.
      const ok = await approveCurrentOutput(beatDir, { findingIds: ["polish-kerning"] });
      expect(ok.findingIds).toEqual(["polish-kerning"]);
    } finally {
      await rm(beatDir, { recursive: true, force: true });
    }
  });
});
