import { describe, it, expect } from "bun:test";
import {
  extractCandidateProducers,
  specType,
  isDirectBranch,
  candidateProvenanceIssue,
  narrativeConsiderationWarning,
} from "./candidate-provenance";
import type { AcceptedProposal } from "./producer-spec";

const prop = (extra: Partial<AcceptedProposal> = {}): AcceptedProposal => ({
  id: "p1",
  producer: "dw-chart",
  format: "static",
  spec: { type: "column-chart" },
  confirmedTakeaway: "The confirmed takeaway",
  ...extra,
});

describe("extractCandidateProducers — robust to artifact shape", () => {
  it("collects producers from the { candidates: [...] } shape", () => {
    const json = {
      candidates: [
        { type: "column-chart", producer: "dw-chart", tier: "recommended" },
        { type: "d3-bars", producer: "chart-native", tier: "solid" },
      ],
    };
    expect(extractCandidateProducers(json)).toEqual(
      new Set(["dw-chart", "chart-native"]),
    );
  });

  it("collects from a bare array of candidates", () => {
    const json = [
      { type: "symbol", producer: "map-native", tier: "recommended" },
      { type: "choropleth", producer: "map-dw", tier: "possible" },
    ];
    expect(extractCandidateProducers(json)).toEqual(
      new Set(["map-native", "map-dw"]),
    );
  });

  it("collects from a per-opportunity nested shape", () => {
    const json = {
      opportunities: [
        {
          candidates: [
            { type: "line", producer: "dw-chart", tier: "recommended" },
          ],
        },
        {
          candidates: [
            { type: "image-scrolly", producer: "image-native", tier: "solid" },
          ],
        },
      ],
    };
    expect(extractCandidateProducers(json)).toEqual(
      new Set(["dw-chart", "image-native"]),
    );
  });

  it("counts a candidate's producer even if it omitted its type", () => {
    const json = { candidates: [{ producer: "scrolly", tier: "recommended" }] };
    expect(extractCandidateProducers(json)).toEqual(new Set(["scrolly"]));
  });

  it("ignores objects with no string producer (probes, prose, csv rows)", () => {
    const json = {
      candidates: [
        { type: "column-chart", producer: "dw-chart", tier: "recommended" },
      ],
      probes: [{ check: "GET dataset", outcome: "pass" }],
      note: "some prose",
      partial: { type: "bar" }, // no producer
    };
    expect(extractCandidateProducers(json)).toEqual(new Set(["dw-chart"]));
  });

  it("returns an empty set for null / non-object", () => {
    expect(extractCandidateProducers(null)).toEqual(new Set());
    expect(extractCandidateProducers("nope")).toEqual(new Set());
    expect(extractCandidateProducers(42)).toEqual(new Set());
  });
});

describe("specType — heterogeneous per producer (message enrichment only)", () => {
  it("reads dw-chart / map-native `type`", () => {
    expect(specType({ type: "column-chart" })).toBe("column-chart");
  });
  it("reads chart-native `nativeType`", () => {
    expect(specType({ nativeType: "d3-bars" })).toBe("d3-bars");
  });
  it("prefers `type` when both present", () => {
    expect(specType({ type: "symbol", nativeType: "ignored" })).toBe("symbol");
  });
  it("returns null when neither present (image-native manifest)", () => {
    expect(specType({ frames: [] })).toBeNull();
    expect(specType(null)).toBeNull();
  });
});

describe("isDirectBranch", () => {
  it("is true when skillsInvoked declares the direct token", () => {
    expect(
      isDirectBranch(
        prop({ skillsInvoked: ["splash:cadrage-direct", "dw-chart"] }),
      ),
    ).toBe(true);
  });
  it("is false for the guided token", () => {
    expect(
      isDirectBranch(
        prop({ skillsInvoked: ["splash:cadrage-guided", "suggest-chart"] }),
      ),
    ).toBe(false);
  });
  it("is false when skillsInvoked is absent (NOT exempt — closes the omission hole)", () => {
    expect(isDirectBranch(prop({ skillsInvoked: undefined }))).toBe(false);
  });
});

describe("candidateProvenanceIssue — the fail-hard decision (producer-level)", () => {
  const producers = new Set(["dw-chart", "chart-native"]);

  it("passes (null) a proposal whose producer is in the menu", () => {
    expect(
      candidateProvenanceIssue(prop(), { present: true, producers }),
    ).toBeNull();
  });

  it("passes a scrolly proposal whose spec type (line) differs from its narrative candidate type — producer-match, no FALSE block", () => {
    // The exact false-block the producer-level design avoids: candidate is `chart-scrolly` on
    // producer `scrolly`; the produced spec is a NativeSpec with nativeType `line`.
    expect(
      candidateProvenanceIssue(
        prop({ producer: "scrolly", spec: { nativeType: "line" } }),
        { present: true, producers: new Set(["scrolly"]) },
      ),
    ).toBeNull();
  });

  it("passes an image-native manifest proposal (null spec type) on producer-match", () => {
    expect(
      candidateProvenanceIssue(
        prop({ producer: "image-native", spec: { frames: [] } }),
        { present: true, producers: new Set(["image-native"]) },
      ),
    ).toBeNull();
  });

  it("fails a proposal whose producer is NOT in the menu (hand-authored a producer never proposed)", () => {
    const issue = candidateProvenanceIssue(
      prop({ producer: "map-native", spec: { type: "choropleth" } }),
      { present: true, producers },
    );
    expect(issue).toBeString();
    expect(issue).toContain("map-native");
  });

  it("fails hard when candidates.json is absent entirely (menu never made)", () => {
    const issue = candidateProvenanceIssue(prop(), {
      present: false,
      producers: new Set(),
    });
    expect(issue).toBeString();
    expect(issue).toContain("candidates.json");
  });

  it("names the direct-branch escape hatch in its message (self-recovering)", () => {
    const issue = candidateProvenanceIssue(prop(), {
      present: false,
      producers: new Set(),
    });
    expect(issue).toContain("splash:cadrage-direct");
  });

  it("EXEMPTS a direct-branch proposal even with no candidates.json", () => {
    expect(
      candidateProvenanceIssue(
        prop({ skillsInvoked: ["splash:cadrage-direct"] }),
        {
          present: false,
          producers: new Set(),
        },
      ),
    ).toBeNull();
  });
});

describe("narrativeConsiderationWarning — Tom #3, surfaced by the tool (menu-level, non-blocking)", () => {
  it("is null when the menu offers a narrative-family candidate (image-scrolly)", () => {
    const json = {
      candidates: [
        { type: "column-chart", producer: "dw-chart", tier: "solid" },
        {
          type: "image-scrolly",
          producer: "image-native",
          tier: "recommended",
        },
      ],
    };
    expect(narrativeConsiderationWarning(json)).toBeNull();
  });

  it("is null for a scrolly / map-story / video narrative candidate (by producer or type)", () => {
    expect(
      narrativeConsiderationWarning({
        candidates: [
          { type: "chart-scrolly", producer: "scrolly", tier: "recommended" },
        ],
      }),
    ).toBeNull();
    expect(
      narrativeConsiderationWarning({
        candidates: [
          { type: "map-story", producer: "map-native", tier: "solid" },
        ],
      }),
    ).toBeNull();
    expect(
      narrativeConsiderationWarning({
        candidates: [
          { type: "line-reveal", producer: "chart-native", tier: "solid" },
        ],
      }),
    ).toBeNull();
  });

  it("is null when the menu explicitly rules narrative out (narrativeRuledOut)", () => {
    const json = {
      candidates: [
        { type: "column-chart", producer: "dw-chart", tier: "recommended" },
      ],
      narrativeRuledOut:
        "two fixed rates — no temporal/geographic/visual sequence to narrate",
    };
    expect(narrativeConsiderationWarning(json)).toBeNull();
  });

  it("finds narrativeRuledOut nested per-opportunity", () => {
    const json = {
      opportunities: [
        {
          candidates: [
            { type: "bar", producer: "dw-chart", tier: "recommended" },
          ],
          narrativeRuledOut: "single snapshot",
        },
      ],
    };
    expect(narrativeConsiderationWarning(json)).toBeNull();
  });

  it("WARNS when the menu carries neither a narrative candidate nor narrativeRuledOut (silent absence)", () => {
    const json = {
      candidates: [
        { type: "column-chart", producer: "dw-chart", tier: "recommended" },
        { type: "dot-plot", producer: "dw-chart", tier: "possible" },
      ],
    };
    const w = narrativeConsiderationWarning(json);
    expect(w).toBeString();
    expect(w).toContain("narrative");
  });

  it("treats an empty narrativeRuledOut string as NOT ruled out (still warns)", () => {
    const json = {
      candidates: [{ type: "bar", producer: "dw-chart", tier: "recommended" }],
      narrativeRuledOut: "",
    };
    expect(narrativeConsiderationWarning(json)).toBeString();
  });
});

describe("the narrative warning names an alternative, not just a family", () => {
  const menuWithoutNarrative = {
    candidates: [{ type: "bar", producer: "chart-native" }],
  };

  it("should name the chart-scrolly a bar could have taken", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      {
        producer: "chart-native",
        format: "static",
        spec: { nativeType: "bar" },
      },
    ]);
    expect(w).not.toBeNull();
    expect(w!).toContain("chart-scrolly");
    expect(w!).toContain("bar");
  });

  it("should name the map-scrolly a choropleth could have taken", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      {
        producer: "map-native",
        format: "static",
        spec: { type: "choropleth" },
      },
    ]);
    expect(w!).toContain("map-scrolly");
    expect(w!).toContain("choropleth");
  });

  it("should say plainly when this element has no narrative sibling", () => {
    // A treemap has no authorable scrolly (AUTHORABLE_SCROLLY_TYPES = ["line", "bar"]).
    // Naming one anyway would be the same false promise this family exists to close.
    const w = narrativeConsiderationWarning(menuWithoutNarrative, [
      {
        producer: "chart-native",
        format: "static",
        spec: { nativeType: "treemap" },
      },
    ]);
    expect(w!).toContain("no narrative form");
  });

  it("should stay null when narrative WAS considered", () => {
    expect(
      narrativeConsiderationWarning(
        { candidates: [{ format: "scrolly" }] },
        [],
      ),
    ).toBeNull();
  });

  it("should be byte-identical when called with one argument", () => {
    const w = narrativeConsiderationWarning(menuWithoutNarrative);
    expect(w).toContain("narrativeRuledOut");
  });
});
