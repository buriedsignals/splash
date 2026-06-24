import { describe, it, expect } from "bun:test";
import { scoreProposalSet, type ProposalSet, type CaseExpect } from "../score";

const sourceTables = {
  "cross-border.csv":
    "year,France,Switzerland\n2015,18,22\n2017,21,25\n2019,26,29",
  "rents.csv": "district,rent\nNorth,1450\nSouth,1200",
};

const goodSet: ProposalSet = {
  proposals: [
    {
      anchor: {
        paragraphIndex: 1,
        quote: "cross-border workers nearly doubled since 2015",
      },
      claim: "Cross-border workers grew on both sides since 2015",
      intent: "How did cross-border worker numbers grow since 2015?",
      data: "year,France,Switzerland\n2015,18,22\n2017,21,25\n2019,26,29",
      dataSource: {
        table: "cross-border.csv",
        columns: ["year", "France", "Switzerland"],
      },
      confidence: "high",
      rationale:
        "Two-side growth over a continuous period is the spine of the story.",
    },
    {
      anchor: {
        paragraphIndex: 2,
        quote: "rents are highest in the North district",
      },
      claim: "Rent varies by district, highest in the North",
      intent: "How does rent compare across districts?",
      data: "district,rent\nNorth,1450\nSouth,1200",
      dataSource: { table: "rents.csv", columns: ["district", "rent"] },
      confidence: "medium",
      rationale: "A magnitude comparison across districts reads well as bars.",
    },
  ],
  notes: "The mayor's declined comment carries no data and is left as prose.",
};

const expect2: CaseExpect = {
  opportunities: [
    {
      claimMatches: ["cross-border", "2015"],
      dataTable: "cross-border.csv",
      dataColumns: ["year", "France", "Switzerland"],
    },
    {
      claimMatches: ["rent", "district"],
      dataTable: "rents.csv",
      dataColumns: ["district", "rent"],
    },
  ],
  minProposals: 2,
  maxProposals: 3,
  noChartClaims: ["mayor declined to comment"],
};

describe("scoreProposalSet", () => {
  it("passes a well-formed set that hits both gold opportunities", () => {
    const r = scoreProposalSet(goodSet, expect2, sourceTables);
    expect(r.countOk).toBe(true);
    expect(r.dataValid).toBe(true);
    expect(r.provenanceOk).toBe(true);
    expect(r.noChartRespected).toBe(true);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(1);
    expect(r.pass).toBe(true);
  });

  it("flags invented data via provenanceOk when a column is not in the source table", () => {
    const bad: ProposalSet = {
      proposals: [
        {
          ...goodSet.proposals[0],
          data: "year,Germany\n2015,99\n2017,120",
          dataSource: {
            table: "cross-border.csv",
            columns: ["year", "Germany"],
          },
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(
      bad,
      { ...expect2, minProposals: 1, maxProposals: 3 },
      sourceTables,
    );
    expect(r.provenanceOk).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/provenance|not in source/i);
  });

  it("flags a non-producible data subset via dataValid (single column, no value)", () => {
    const bad: ProposalSet = {
      proposals: [
        {
          ...goodSet.proposals[0],
          data: "district\nNorth\nSouth",
          dataSource: { table: "rents.csv", columns: ["district"] },
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(
      bad,
      { ...expect2, minProposals: 1, maxProposals: 3 },
      sourceTables,
    );
    expect(r.dataValid).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("flags over-proposing onto a no-chart claim", () => {
    const bad: ProposalSet = {
      proposals: [
        goodSet.proposals[0],
        goodSet.proposals[1],
        {
          anchor: {
            paragraphIndex: 3,
            quote: "the mayor declined to comment on the overrun",
          },
          claim: "The mayor declined to comment",
          intent: "Visualise the mayor's refusal",
          data: "year,France\n2015,18",
          dataSource: {
            table: "cross-border.csv",
            columns: ["year", "France"],
          },
          confidence: "low",
          rationale: "n/a",
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(bad, expect2, sourceTables);
    expect(r.noChartRespected).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("computes recall below 1 when a gold opportunity is missed", () => {
    const partial: ProposalSet = {
      proposals: [goodSet.proposals[0]],
      notes: "",
    };
    const r = scoreProposalSet(
      partial,
      { ...expect2, minProposals: 1, maxProposals: 3 },
      sourceTables,
    );
    expect(r.recall).toBe(0.5);
    expect(r.pass).toBe(false); // recall 0.5 < τr 0.7
  });

  it("computes precision below 1 when a proposal matches no gold opportunity", () => {
    const spurious: ProposalSet = {
      proposals: [
        goodSet.proposals[0],
        goodSet.proposals[1],
        {
          anchor: {
            paragraphIndex: 4,
            quote: "an unrelated aside about parking",
          },
          claim: "Parking spaces something",
          intent: "Show parking",
          data: "year,France\n2015,18\n2017,21",
          dataSource: {
            table: "cross-border.csv",
            columns: ["year", "France"],
          },
          confidence: "low",
          rationale: "spurious",
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(
      spurious,
      { ...expect2, maxProposals: 3 },
      sourceTables,
    );
    expect(r.precision).toBeCloseTo(2 / 3, 5);
    expect(r.recall).toBe(1);
  });
});
