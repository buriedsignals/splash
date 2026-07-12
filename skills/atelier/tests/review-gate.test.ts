import { describe, it, expect } from "bun:test";
import { applyReviewGate } from "../src/review-gate";
import type { ProduceReport, ReviewProbe } from "../src/producer-spec";

const rep = (
  over: Partial<ProduceReport["results"][0]> = {},
): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      renderApproved: false,
      ...over,
    },
  ],
});

// The minimal honest ledger: one probe that ran and passed.
const passProbes: ReviewProbe[] = [
  { check: "title matches the confirmed takeaway verbatim", outcome: "pass" },
];

describe("applyReviewGate — records the review", () => {
  it("records the review (reviewed=true), the probes ledger and the advisory concerns", () => {
    const probes: ReviewProbe[] = [
      { check: "title states a rate, data is a rate", outcome: "pass" },
      {
        check: "value 42400 present in the published chart HTML",
        outcome: "concern",
        note: "the value is absent from the rendered HTML",
      },
    ];
    const out = applyReviewGate(
      rep(),
      "p1",
      ["value 42400 present in the published chart HTML: absent from the render"],
      probes,
    );
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([
      "value 42400 present in the published chart HTML: absent from the render",
    ]);
    expect(out.results[0].reviewProbes).toEqual(probes);
  });

  it("records a clean review (no concerns) when the probes all pass", () => {
    const out = applyReviewGate(rep(), "p1", [], passProbes);
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([]);
  });

  it("preserves the report's generatedAt across the review write", () => {
    const r: ProduceReport = {
      generatedAt: "2026-07-12T08:00:00.000Z",
      ...rep(),
    };
    const out = applyReviewGate(r, "p1", [], passProbes);
    expect(out.generatedAt).toBe("2026-07-12T08:00:00.000Z");
  });

  it("refuses to review a proposal that was not produced", () => {
    expect(() =>
      applyReviewGate(rep({ status: "failed" }), "p1", [], passProbes),
    ).toThrow(/not produced/);
  });

  it("throws on an unknown proposal id", () => {
    expect(() => applyReviewGate(rep(), "nope", [], passProbes)).toThrow(
      /unknown proposal/,
    );
  });

  it("leaves renderApproved untouched (review is a distinct gate)", () => {
    const out = applyReviewGate(rep(), "p1", [], passProbes);
    expect(out.results[0].renderApproved).toBe(false);
  });
});

describe("applyReviewGate — probes ledger integrity", () => {
  it("REFUSES a review with an EMPTY probes ledger", () => {
    expect(() => applyReviewGate(rep(), "p1", [], [])).toThrow(
      /probes ledger is empty/i,
    );
  });

  it("REFUSES a probe with a non-pass outcome and no note (evidence required)", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["something"],
        [{ check: "dataset.csv reachable", outcome: "concern" }],
      ),
    ).toThrow(/note/i);
  });

  it("REFUSES an unknown probe outcome (untyped JSON at the CLI seam)", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            check: "dataset.csv reachable",
            outcome: "ok" as ReviewProbe["outcome"],
          },
        ],
      ),
    ).toThrow(/outcome/i);
  });

  it("REFUSES a concern-outcome probe on a review submitted with NO concerns (the silent-drop)", () => {
    // The observed failure: probing FOUND defects, the summary asserted full fidelity.
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            check: "dataset.csv on the published chart",
            outcome: "concern",
            note: "GET returned 404",
          },
        ],
      ),
    ).toThrow(/no concerns/i);
  });
});

describe("applyReviewGate — per-probe concern accounting", () => {
  it("REFUSES a concern-probe accounted for only by an UNRELATED concern (the reviewer's repro)", () => {
    // The adversarial repro: the 404 concern-probe was silently droppable as long as ANY
    // unrelated concern text existed. Each concern-probe must be individually referenced.
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["the title is slightly long"],
        [
          {
            check: "dataset.csv on the published chart",
            outcome: "concern",
            note: "GET returned 404 twice, survives retry",
          },
        ],
      ),
    ).toThrow(/dataset\.csv on the published chart/);
  });

  it("REFUSES when TWO concern-probes exist and only ONE is referenced by a concern", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["dataset.csv on the published chart: GET returned 404 twice"],
        [
          {
            check: "dataset.csv on the published chart",
            outcome: "concern",
            note: "GET returned 404 twice, survives retry",
          },
          {
            check: "value 42400 present in the published chart HTML",
            outcome: "concern",
            note: "the value is absent from the rendered HTML",
          },
        ],
      ),
    ).toThrow(/value 42400 present in the published chart HTML/);
  });

  it("ACCEPTS a concern-probe whose check is quoted verbatim in a surfaced concern", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [
        "the title is slightly long",
        "dataset.csv on the published chart: GET returned 404 twice, survives the propagation retry",
      ],
      [
        {
          check: "dataset.csv on the published chart",
          outcome: "concern",
          note: "GET returned 404 twice, survives retry",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toHaveLength(2);
  });

  it("matches the check case- and whitespace-insensitively (ergonomics, not a trap)", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["Dataset.csv  on the published\nchart: GET returned 404 twice"],
      [
        {
          check: "dataset.csv on the published chart",
          outcome: "concern",
          note: "GET returned 404 twice, survives retry",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
  });

  it("ACCEPTS the reviewer's repro once the probe is re-run to resolved with evidence", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title is slightly long"],
      [
        {
          check: "dataset.csv on the published chart",
          outcome: "resolved",
          note: "first GET returned 404 (fresh publish propagation); retried after the delay, 200 OK with the full data",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
  });
});

describe("applyReviewGate — failure-keyword tripwire", () => {
  it('REFUSES a review whose concern text mentions "404" with no matching probe outcome', () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["dataset.csv returns 404 on the published chart"],
        passProbes,
      ),
    ).toThrow(/404/);
  });

  it('REFUSES a PASS probe whose own text mentions "absent" with no non-pass probe reflecting it', () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            check: "value 42400 absent from the published HTML",
            outcome: "pass",
          },
        ],
      ),
    ).toThrow(/absent/);
  });

  it("ACCEPTS the keyword when a resolved probe carries it with evidence", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [],
      [
        ...passProbes,
        {
          check: "dataset.csv on the published chart",
          outcome: "resolved",
          note: "first GET returned 404 (fresh publish propagation); retried after the delay, 200 OK with the full data",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
  });

  it("ACCEPTS the keyword when a concern probe carries it and the concern is surfaced", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["dataset.csv on the published chart: returns 404, survives the retry"],
      [
        ...passProbes,
        {
          check: "dataset.csv on the published chart",
          outcome: "concern",
          note: "GET returned 404 twice, after the propagation retry too",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toHaveLength(1);
  });

  it("does not trip on an unrelated clean narrative", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title narrows the confirmed takeaway"],
      passProbes,
    );
    expect(out.results[0].reviewed).toBe(true);
  });

  it("matches keywords on word boundaries (a value like 1404 does not trip)", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [],
      [{ check: "the 1404 data points all render", outcome: "pass" }],
    );
    expect(out.results[0].reviewed).toBe(true);
  });
});
