import { describe, it, expect } from "bun:test";
import { CRITERIA, type Criterion } from "./types";
import {
  CRITERION_DEFAULT_SEVERITY,
  FINDING_SEVERITY,
  makeFinding,
  severityFor,
} from "./severity";

describe("severityFor — one central table, never the finder's opinion", () => {
  it("gives a catalogued mechanical finding its catalogued severity", () => {
    expect(severityFor("furniture-below-fold", "furniture")).toBe("blocking");
    expect(severityFor("destination-mismatch", "viewport")).toBe("blocking");
    expect(severityFor("alt-text-missing", "accessibility")).toBe("blocking");
  });

  it("falls back to the CRITERION's default for an id it does not catalogue", () => {
    expect(severityFor("some-new-craft-remark", "craft")).toBe(
      CRITERION_DEFAULT_SEVERITY.craft,
    );
    expect(severityFor("some-new-source-doubt", "source")).toBe("blocking");
  });

  it("answers 'warning' — never 'informational' — for a criterion it does not know", () => {
    // An unknown criterion means the table has drifted. Defaulting to the harmless end
    // would make drift invisible; defaulting to warning makes it visible without
    // deadlocking a run on a value nobody has classified yet.
    expect(severityFor("x", "not-a-criterion" as Criterion)).toBe("warning");
  });

  it("is TOTAL over CRITERIA — a criterion added without a default fails here", () => {
    for (const c of CRITERIA)
      expect(
        CRITERION_DEFAULT_SEVERITY[c],
        `criterion "${c}" has no default severity`,
      ).toBeDefined();
  });

  it("catalogues every finding id under a criterion the vocabulary declares", () => {
    for (const [id, entry] of Object.entries(FINDING_SEVERITY))
      expect(CRITERIA, `finding "${id}" names an unknown criterion`).toContain(
        entry.criterion,
      );
  });
});

describe("makeFinding — the finder describes, the table decides", () => {
  it("overwrites a severity the caller tried to set", () => {
    const f = makeFinding({
      id: "furniture-below-fold",
      criterion: "furniture",
      summary: "the source footer is below the fold",
      evidence: ["root bottom 581 > viewport height 560"],
      provenance: "independent",
      // A reviewer adapter claiming its own severity: ignored on purpose (#11 —
      // "the same defect cannot be blocking in one producer and advisory in another").
      severity: "informational",
    });
    expect(f.severity).toBe("blocking");
    expect(f.status).toBe("open");
    expect(f.provenance).toBe("independent");
  });

  it("round-trips through JSON with no key silently lost (I6)", () => {
    const f = makeFinding({
      id: "value-label-abbreviation",
      criterion: "craft",
      summary: "large numbers are not abbreviated",
      evidence: [],
      provenance: "mechanical",
    });
    expect(JSON.parse(JSON.stringify(f))).toStrictEqual(f);
  });
});
