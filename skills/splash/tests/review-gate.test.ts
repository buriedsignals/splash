import { describe, it, expect } from "bun:test";
import { applyReviewGate } from "../src/review-gate";
import { assertShippable } from "../src/export-guard";
import type { ProduceReport, ReviewProbe } from "../src/producer-spec";

// A reviewer fixture for every test whose ledger carries an editorial probe — passing it is
// what distinguishes "this is a review-gate/probes-ledger test" from "this is an attribution
// test" (the latter deliberately omits it; see the "the editorial half is attributed" block).
const reviewer = { name: "desk-reader", version: "1.0.0" };

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

// The minimal honest ledger: one probe that ran and passed. "the title matches the confirmed
// takeaway" is a JUDGEMENT (no exit code answers it), so it migrates to editorial — not because
// this file is about mechanical/editorial specifically, but because every ReviewProbe literal
// now has to declare a `kind` to typecheck, and this is the honest one for a title-reading check.
const passProbes: ReviewProbe[] = [
  {
    kind: "editorial",
    check: "title matches the confirmed takeaway verbatim",
    outcome: "pass",
  },
];

describe("applyReviewGate — records the review", () => {
  it("records the review (reviewed=true), the probes ledger and the advisory concerns", () => {
    const probes: ReviewProbe[] = [
      {
        kind: "editorial",
        check: "title states a rate, data is a rate",
        outcome: "pass",
      },
      {
        kind: "mechanical",
        check: "value 42400 present in the published chart HTML",
        command: ["false"],
        exitCode: 1,
        outcome: "concern",
        note: "the value is absent from the rendered HTML",
      },
    ];
    const out = applyReviewGate(
      rep(),
      "p1",
      [
        "value 42400 present in the published chart HTML: absent from the render",
      ],
      probes,
      reviewer,
    );
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([
      "value 42400 present in the published chart HTML: absent from the render",
    ]);
    expect(out.results[0].reviewProbes).toEqual(probes);
  });

  it("records a clean review (no concerns) when the probes all pass", () => {
    const out = applyReviewGate(rep(), "p1", [], passProbes, reviewer);
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([]);
  });

  it("preserves the report's generatedAt across the review write", () => {
    const r: ProduceReport = {
      generatedAt: "2026-07-12T08:00:00.000Z",
      ...rep(),
    };
    const out = applyReviewGate(r, "p1", [], passProbes, reviewer);
    expect(out.generatedAt).toBe("2026-07-12T08:00:00.000Z");
  });

  it("refuses to review a proposal that was not produced", () => {
    expect(() =>
      applyReviewGate(
        rep({ status: "failed" }),
        "p1",
        [],
        passProbes,
        reviewer,
      ),
    ).toThrow(/not produced/);
  });

  it("throws on an unknown proposal id", () => {
    expect(() =>
      applyReviewGate(rep(), "nope", [], passProbes, reviewer),
    ).toThrow(/unknown proposal/);
  });

  it("leaves renderApproved untouched (review is a distinct gate)", () => {
    const out = applyReviewGate(rep(), "p1", [], passProbes, reviewer);
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
        [
          {
            kind: "mechanical",
            check: "dataset.csv reachable",
            command: ["false"],
            exitCode: 1,
            outcome: "concern",
          },
        ],
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
            kind: "editorial",
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
            kind: "mechanical",
            check: "dataset.csv on the published chart",
            command: ["false"],
            exitCode: 1,
            outcome: "concern",
            note: "GET returned 404",
          },
        ],
      ),
    ).toThrow(/no concerns/i);
  });
});

// A mechanical probe's `note` below is written the way `review-gate.mjs` (the only production
// writer) actually writes it — the command's own stdout/stderr tail via `lib/loop/probe-run.ts`
// (`"the check exited <code>: <output>"` on failure, the raw tail on a pass) — never
// reviewer-authored evidence prose. The gate no longer reads a mechanical probe's note for
// anything but non-emptiness (see review-gate.ts's `probeText`), so these fixtures now match
// what the only reachable entry point can actually produce.
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
            kind: "mechanical",
            check: "dataset.csv on the published chart",
            command: ["false"],
            exitCode: 1,
            outcome: "concern",
            note: "the check exited 22: curl: (22) The requested URL returned error: 404",
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
            kind: "mechanical",
            check: "dataset.csv on the published chart",
            command: ["false"],
            exitCode: 1,
            outcome: "concern",
            note: "the check exited 22: curl: (22) The requested URL returned error: 404",
          },
          {
            kind: "mechanical",
            check: "value 42400 present in the published chart HTML",
            command: ["false"],
            exitCode: 1,
            outcome: "concern",
            note: "the check exited 1: grep: no match for 42400 in interactive.html",
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
          kind: "mechanical",
          check: "dataset.csv on the published chart",
          command: ["false"],
          exitCode: 1,
          outcome: "concern",
          note: "the check exited 22: curl: (22) The requested URL returned error: 404",
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
          kind: "mechanical",
          check: "dataset.csv on the published chart",
          command: ["false"],
          exitCode: 1,
          outcome: "concern",
          note: "the check exited 22: curl: (22) The requested URL returned error: 404",
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
          kind: "mechanical",
          check: "dataset.csv on the published chart",
          command: ["true"],
          exitCode: 0,
          outcome: "resolved",
          note: "200 OK, 118 rows",
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
            kind: "mechanical",
            check: "value 42400 absent from the published HTML",
            command: ["true"],
            exitCode: 0,
            outcome: "pass",
          },
        ],
      ),
    ).toThrow(/absent/);
  });

  it("ACCEPTS the keyword when a resolved probe's own (reviewer-authored) check names it", () => {
    // A mechanical probe's `note` is machine output and never scanned (see review-gate.ts's
    // probeText) — so what has to carry the keyword on the resolved side is the probe's `check`,
    // which the reviewer wrote. `note` here is realistic: the raw pass-tail review-gate.mjs would
    // actually record, not evidence prose.
    const out = applyReviewGate(
      rep(),
      "p1",
      [
        "dataset.csv previously 404'd right after publish — retried and confirmed fixed",
      ],
      [
        ...passProbes,
        {
          kind: "mechanical",
          check:
            "dataset.csv 404-after-publish propagation resolves within the retry window",
          command: ["true"],
          exitCode: 0,
          outcome: "resolved",
          note: "200 OK, 118 rows",
        },
      ],
      reviewer,
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
          kind: "mechanical",
          check: "dataset.csv on the published chart",
          command: ["false"],
          exitCode: 1,
          outcome: "concern",
          note: "the check exited 22: curl: (22) The requested URL returned error: 404",
        },
      ],
      reviewer,
    );
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toHaveLength(1);
  });

  // CRITICAL regression: review-gate.mjs (the only production entry point) overwrites a
  // mechanical probe's `note` with the command's own stdout/stderr tail — so a probe that EXITS
  // 0 (a genuine pass) can still print a failure keyword in its own harmless output. Before this
  // fix that blocked a PASSING review with no reachable remedy: the note is never
  // caller-writable for a mechanical probe, and "resolved" is unreachable for one. The exit code
  // alone is the verdict; the tripwire must not read machine output as if it were reviewer prose.
  it("does NOT trip when a PASSING mechanical probe's own command output contains a failure keyword", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [],
      [
        {
          kind: "mechanical",
          check: "dataset row count matches the source",
          command: ["true"],
          exitCode: 0,
          outcome: "pass",
          note: '{"rows":12,"missing":0}',
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
  });

  it("does not trip on an unrelated clean narrative", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title narrows the confirmed takeaway"],
      passProbes,
      reviewer,
    );
    expect(out.results[0].reviewed).toBe(true);
  });

  it("matches keywords on word boundaries (a value like 1404 does not trip)", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [],
      [
        {
          kind: "mechanical",
          check: "the 1404 data points all render",
          command: ["true"],
          exitCode: 0,
          outcome: "pass",
        },
      ],
    );
    expect(out.results[0].reviewed).toBe(true);
  });
});

describe("applyReviewGate — a mechanical outcome is read, never reported", () => {
  it("refuses a mechanical probe that carries no command — a claim is not a result", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            kind: "mechanical",
            check: "the dataset answers",
            outcome: "pass",
          } as never,
        ],
      ),
    ).toThrow(/command/);
  });

  it("refuses an outcome that disagrees with the exit code it was recorded beside", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            kind: "mechanical",
            check: "the dataset answers",
            command: ["bun", "-e", "process.exit(1)"],
            exitCode: 1,
            outcome: "pass",
            note: "looked fine",
          } as never,
        ],
      ),
    ).toThrow(/exited 1/);
  });

  it("refuses a probe recorded as resolved whose command did not actually exit clean — resolved still claims clean NOW", () => {
    // The agreement check only covering "pass" would leave "resolved" self-attestable — a
    // mechanical probe could claim "I fixed it" against a command that still exits non-zero
    // (or never ran), and nothing here would catch it. "resolved" claims the check answers
    // clean RIGHT NOW (with the note explaining it used to fail), so it needs the same
    // exit-code agreement as "pass".
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        [],
        [
          {
            kind: "mechanical",
            check: "the dataset answers",
            command: ["bun", "-e", "process.exit(1)"],
            exitCode: 1,
            outcome: "resolved",
            note: "first GET 404, retried, now fine",
          } as never,
        ],
      ),
    ).toThrow(/exited 1/);
  });

  it("records a mechanical probe whose outcome matches what its command answered", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      [],
      [
        {
          kind: "mechanical",
          check: "the dataset answers",
          command: ["true"],
          exitCode: 0,
          outcome: "pass",
          note: "",
        } as never,
      ],
    );
    expect(out.results[0]!.reviewProbes).toHaveLength(1);
  });

  it("an editorial probe needs no command — it needs a verdict and a note", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title carries only half the confirmed takeaway"],
      [
        {
          kind: "mechanical",
          check: "the file renders",
          command: ["true"],
          exitCode: 0,
          outcome: "pass",
          note: "",
        },
        {
          kind: "editorial",
          check: "the title carries only half the confirmed takeaway",
          outcome: "concern",
          note: "the confirmed claim has two parts; the title states one",
        },
      ] as never,
      reviewer,
    );
    expect(out.results[0]!.reviewProbes).toHaveLength(2);
  });
});

describe("applyReviewGate — the editorial half is attributed", () => {
  const mech = [
    {
      kind: "mechanical",
      check: "the file renders",
      command: ["true"],
      exitCode: 0,
      outcome: "pass",
      note: "",
    },
  ] as never;

  it("refuses an editorial judgement with no reviewer named", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["the title states one half of the confirmed claim"],
        [
          ...(mech as never[]),
          {
            kind: "editorial",
            check: "the title states one half of the confirmed claim",
            outcome: "concern",
            note: "two parts, one stated",
          },
        ] as never,
        undefined,
      ),
    ).toThrow(/who did it/);
  });

  it("records the reviewer, and the fingerprint of what it returned", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title states one half of the confirmed claim"],
      [
        ...(mech as never[]),
        {
          kind: "editorial",
          check: "the title states one half of the confirmed claim",
          outcome: "concern",
          note: "two parts, one stated",
        },
      ] as never,
      { name: "desk-reader", version: "1.0.0" },
    );
    const r = out.results[0]!;
    expect(r.reviewer?.name).toBe("desk-reader");
    expect(r.reviewer?.independentSemanticReview).toBe("available");
    expect(r.reviewer?.outputHash).toHaveLength(64);
  });

  it("a purely mechanical review needs no reviewer, and says so honestly", () => {
    const out = applyReviewGate(rep(), "p1", [], mech, undefined);
    expect(out.results[0]!.reviewer?.independentSemanticReview).toBe(
      "unavailable",
    );
  });
});

describe("assertShippable — an unattributed editorial verdict does not ship", () => {
  it("refuses to export a visual whose editorial verdicts nobody signed for", () => {
    const r = rep();
    r.results[0]!.reviewed = true;
    r.results[0]!.renderApproved = true;
    r.results[0]!.reviewProbes = [
      {
        kind: "editorial",
        check: "the colour serves the subject",
        outcome: "pass",
        note: "n/a",
      },
    ] as never;
    expect(() => assertShippable(r, "p1")).toThrow(/who did it/);
  });
});
