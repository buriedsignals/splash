import { describe, it, expect } from "bun:test";
import { scoreProposalSet, type ProposalSet, type CaseExpect } from "../score";

const expect0: CaseExpect = {
  opportunities: [],
  minProposals: 0,
  maxProposals: 2,
  noChartClaims: [],
};
const article =
  "Cycling accounted for 19% of all commuting trips in 2024, up from 12% in 2019.";

function proseSet(
  over: Partial<ProposalSet["proposals"][number]> = {},
): ProposalSet {
  return {
    proposals: [
      {
        anchor: { paragraphIndex: 0, quote: "19% ... up from 12% in 2019" },
        claim: "Cycling's commute share rose from 12% in 2019 to 19% in 2024",
        intent: "How did cycling's commute share change from 2019 to 2024?",
        data: "year,cycling_share\n2019,12\n2024,19",
        dataSource: {
          table: "article-prose",
          columns: ["year", "cycling_share"],
        },
        provenance: "prose",
        needsConfirmation: true,
        confidence: "medium",
        rationale: "An explicit two-point comparison stated in the article.",
        ...over,
      },
    ],
    notes: "",
  };
}

describe("provenanceOk — prose tier", () => {
  it("passes when every value is in the text and needsConfirmation is set", () => {
    const s = scoreProposalSet(proseSet(), expect0, {}, article);
    expect(s.provenanceOk).toBe(true);
  });

  it("fails when a value is NOT present in the article text (anti-hallucination)", () => {
    const s = scoreProposalSet(
      proseSet({ data: "year,cycling_share\n2019,12\n2024,31" }),
      expect0,
      {},
      article,
    );
    expect(s.provenanceOk).toBe(false);
    expect(s.notes.some((m) => m.includes("31"))).toBe(true);
  });

  it("fails a prose proposal that does not set needsConfirmation", () => {
    const s = scoreProposalSet(
      proseSet({ needsConfirmation: undefined }),
      expect0,
      {},
      article,
    );
    expect(s.provenanceOk).toBe(false);
    expect(s.notes.some((m) => m.includes("needsConfirmation"))).toBe(true);
  });

  it("still enforces the table tier (regression): unknown table fails", () => {
    const tableSet: ProposalSet = {
      proposals: [
        {
          anchor: { paragraphIndex: 0, quote: "x" },
          claim: "x",
          intent: "x",
          data: "a,b\n1,2",
          dataSource: { table: "missing.csv", columns: ["a", "b"] },
          confidence: "high",
          rationale: "x",
        },
      ],
      notes: "",
    };
    const s = scoreProposalSet(tableSet, expect0, {}, "");
    expect(s.provenanceOk).toBe(false);
  });
});
