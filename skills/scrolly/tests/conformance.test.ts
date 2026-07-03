import { describe, it, expect } from "bun:test";
import {
  checkScrollyConformance,
  auditTemporalNarrative,
} from "../src/conformance";
import type { ScrollyStory } from "../src/chapters";
import type { Beat } from "../../map-native/src/map-story";

const ok: ScrollyStory = {
  title: "Renewables across Europe",
  description: "Share of electricity from renewables, 2024",
  source: { name: "Ember", url: "https://example.org" },
  visual: "map",
  steps: [
    { id: "a", visual: "map", action: "flyTo", ref: 0, prose: "Intro" },
    { id: "b", visual: "map", action: "flyTo", ref: 1, prose: "Norway" },
    { id: "c", visual: "map", action: "flyTo", ref: 2, prose: "Poland" },
  ],
};

describe("checkScrollyConformance", () => {
  it("passes a well-formed story", () => {
    expect(checkScrollyConformance(ok, 3)).toEqual([]);
  });
  it("flags fewer than 3 steps", () => {
    const r = checkScrollyConformance(
      { ...ok, steps: ok.steps.slice(0, 2) },
      3,
    );
    expect(r.some((v) => /step/i.test(v))).toBe(true);
  });
  it("flags an empty-prose step", () => {
    const bad = {
      ...ok,
      steps: [
        ...ok.steps,
        {
          id: "d",
          visual: "map",
          action: "flyTo",
          ref: 3,
          prose: "  ",
        } as const,
      ],
    };
    expect(checkScrollyConformance(bad, 4).some((v) => /prose/i.test(v))).toBe(
      true,
    );
  });
  it("flags a map step whose beat ref is out of range", () => {
    const bad = {
      ...ok,
      steps: [
        ...ok.steps,
        {
          id: "d",
          visual: "map",
          action: "flyTo",
          ref: 9,
          prose: "x",
        } as const,
      ],
    };
    expect(
      checkScrollyConformance(bad, 4).some((v) => /ref|range/i.test(v)),
    ).toBe(true);
  });
  it("flags a missing description (a module must state what/when/where)", () => {
    const r = checkScrollyConformance({ ...ok, description: undefined }, 3);
    expect(r.some((v) => /description/i.test(v))).toBe(true);
  });
  it("flags a missing source (an embedded module must carry its own source)", () => {
    const r = checkScrollyConformance({ ...ok, source: undefined }, 3);
    expect(r.some((v) => /source/i.test(v))).toBe(true);
  });
});

// Guardrail for defect #3: a temporal reveal must never carry "highest/lowest".
const temporalBeats: Beat[] = [
  {
    kind: "title",
    camera: [0, 0, 1, 1],
    highlight: [],
    dim: false,
    callout: null,
    copy: "t",
  },
  {
    kind: "establish",
    camera: [0, 0, 1, 1],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
  {
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: ["NLD"],
    dim: true,
    callout: {
      region: "NLD",
      name: "Netherlands",
      value: "2001",
      text: "Netherlands — 2001",
    },
    copy: "Netherlands — 2001",
    pattern: "temporal",
    seqIndex: 0,
    seqTotal: 2,
  },
  {
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: ["THA"],
    dim: true,
    callout: {
      region: "THA",
      name: "Thailand",
      value: "2025",
      text: "Thailand — 2025",
    },
    copy: "Thailand — 2025",
    pattern: "temporal",
    seqIndex: 1,
    seqTotal: 2,
  },
  {
    kind: "takeaway",
    camera: [0, 0, 1, 1],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
];

function storyFrom(revealProses: string[]): ScrollyStory {
  return {
    title: "Marriage equality spread over time",
    description: "The year same-sex marriage took effect",
    source: { name: "Wikipedia", url: "https://example.org" },
    visual: "map",
    steps: [
      { id: "s0", visual: "map", action: "flyTo", ref: 0, prose: "intro" },
      { id: "s1", visual: "map", action: "flyTo", ref: 1, prose: "overview" },
      {
        id: "s2",
        visual: "map",
        action: "flyTo",
        ref: 2,
        prose: revealProses[0],
      },
      {
        id: "s3",
        visual: "map",
        action: "flyTo",
        ref: 3,
        prose: revealProses[1],
      },
      { id: "s4", visual: "map", action: "flyTo", ref: 4, prose: "takeaway" },
    ],
  };
}

describe("auditTemporalNarrative (guardrail)", () => {
  it("passes when temporal reveals use sequence language", () => {
    const story = storyFrom([
      "Netherlands — 2001, the first",
      "Thailand — 2025, the most recent",
    ]);
    expect(auditTemporalNarrative(story, temporalBeats)).toEqual([]);
  });

  it("FAILS when a temporal reveal reverts to 'highest'", () => {
    const story = storyFrom([
      "Netherlands — 2001, the highest of the 36 shown",
      "Thailand — 2025, the most recent",
    ]);
    const v = auditTemporalNarrative(story, temporalBeats);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("highest");
    expect(v[0]).toContain("s2");
  });

  it("FAILS when a temporal reveal reverts to 'lowest'", () => {
    const story = storyFrom([
      "Netherlands — 2001, the first",
      "Thailand — 2025, the lowest",
    ]);
    const v = auditTemporalNarrative(story, temporalBeats);
    expect(v.length).toBe(1);
    expect(v[0]).toContain("lowest");
  });

  it("does NOT flag a magnitude reveal that legitimately says 'highest'", () => {
    const magnitudeBeats = temporalBeats.map((b) =>
      b.kind === "reveal" ? { ...b, pattern: "magnitude" as const } : b,
    );
    const story = storyFrom([
      "Norway — 99%, the highest of the 8 shown",
      "Poland — 21%, the lowest",
    ]);
    expect(auditTemporalNarrative(story, magnitudeBeats)).toEqual([]);
  });
});
