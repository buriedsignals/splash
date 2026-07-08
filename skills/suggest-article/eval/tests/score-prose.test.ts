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

  // Anti-fabrication for DEICTIC dates: the article names no literal year ("cette
  // année" / "l'an dernier"), so resolving them to 2023/2024 is invention. The numeric
  // year tokens are not in the text → provenanceOk must fail. Charting the same claim
  // with the VERBATIM period labels (no invented years) must pass.
  const deicticArticle =
    "La participation au vote a atteint 62 % cette année, contre 55 % l'an dernier.";
  function deicticProse(
    over: Partial<ProposalSet["proposals"][number]> = {},
  ): ProposalSet {
    return {
      proposals: [
        {
          anchor: {
            paragraphIndex: 0,
            quote: "62 % cette année, contre 55 % l'an dernier",
          },
          claim: "La participation au vote est passée de 55 % à 62 %",
          intent: "Comment la participation au vote a-t-elle évolué ?",
          data: "periode,participation\nl'an dernier,55\ncette annee,62",
          dataSource: {
            table: "article-prose",
            columns: ["periode", "participation"],
          },
          provenance: "prose",
          needsConfirmation: true,
          confidence: "medium",
          rationale: "Deux valeurs explicites comparées dans l'article.",
          ...over,
        },
      ],
      notes: "",
    };
  }

  it("fails when a deictic date is resolved to an invented year (2024 not in text)", () => {
    const s = scoreProposalSet(
      deicticProse({ data: "year,participation\n2023,55\n2024,62" }),
      expect0,
      {},
      deicticArticle,
    );
    expect(s.provenanceOk).toBe(false);
    expect(s.notes.some((m) => m.includes("2024") || m.includes("2023"))).toBe(
      true,
    );
  });

  it("passes when the two verbatim period labels are used (no invented year)", () => {
    const s = scoreProposalSet(deicticProse(), expect0, {}, deicticArticle);
    expect(s.provenanceOk).toBe(true);
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
