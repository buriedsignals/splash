import { describe, it, expect } from "bun:test";
import { mapStoryToChapters } from "../src/chapters";
import type { Beat } from "../../map-native/src/map-story";

const beats: Beat[] = [
  {
    kind: "title",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "Renewables across Europe",
  },
  {
    kind: "establish",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
  {
    kind: "reveal",
    camera: [4, 57, 31, 71],
    highlight: ["NOR"],
    dim: false,
    callout: {
      region: "NOR",
      name: "Norway",
      value: "99%",
      text: "Norway — 99%",
    },
    copy: "Norway — 99%",
  },
  {
    kind: "reveal",
    camera: [14, 49, 24, 55],
    highlight: ["POL"],
    dim: false,
    callout: {
      region: "POL",
      name: "Poland",
      value: "21%",
      text: "Poland — 21%",
    },
    copy: "Poland — 21%",
  },
  {
    kind: "takeaway",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "North high, south low",
  },
];

describe("mapStoryToChapters", () => {
  const meta = {
    title: "Renewables across Europe",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember", url: "https://example.org" },
    regionsWithData: 8,
  };
  it("emits title → OVERVIEW → reveals → TAKEAWAY; both title and overview carry the description", () => {
    const story = mapStoryToChapters(beats, meta);
    // beats: title(0) establish(1) reveal NOR(2) reveal POL(3) takeaway(4)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3, 4]);
    expect(story.steps[0].prose).toBe(
      "Share of electricity from renewables, 2024",
    );
    // step 1 is the OVERVIEW (establish beat) — carries the description
    expect(story.steps[1].ref).toBe(1);
    expect(story.steps[1].prose).toBe(
      "Share of electricity from renewables, 2024",
    );
    // the title never appears as a step caption
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("adds a rank descriptor: first reveal = highest (of N), last reveal = lowest", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.steps[2].prose).toBe(
      "Norway — 99%, the highest of the 8 shown",
    );
    expect(story.steps[3].prose).toBe("Poland — 21%, the lowest");
  });
  it("always emits the takeaway (last step) with its copy", () => {
    const story = mapStoryToChapters(beats, meta);
    const last = story.steps[story.steps.length - 1];
    expect(last.ref).toBe(4);
    expect(last.prose).toBe("North high, south low");
  });
  it("emits the takeaway even with no copy, falling back to the description", () => {
    const noCopyTakeaway: Beat[] = [
      beats[0],
      beats[1],
      beats[2],
      beats[3],
      { ...beats[4], copy: "" },
    ];
    const story = mapStoryToChapters(noCopyTakeaway, meta);
    const last = story.steps[story.steps.length - 1];
    expect(last.ref).toBe(4);
    expect(last.prose).toBe("Share of electricity from renewables, 2024");
  });
  it("carries title/description/source on the story and centres cards", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.title).toBe("Renewables across Europe");
    expect(story.description).toBe(
      "Share of electricity from renewables, 2024",
    );
    expect(story.source).toEqual({ name: "Ember", url: "https://example.org" });
    expect(story.steps.every((s) => s.align === "center")).toBe(true);
  });
  it("a single reveal gets no rank descriptor", () => {
    const one: Beat[] = [beats[0], beats[1], beats[2], beats[4]]; // title, establish, NOR, takeaway
    const story = mapStoryToChapters(one, { ...meta, regionsWithData: 1 });
    // steps: title(0) overview(1) reveal NOR(2) takeaway(3)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3]);
    expect(story.steps.find((s) => s.ref === 2)?.prose).toBe("Norway — 99%");
  });
});

// Temporal beats: reveals are ordered earliest→latest and tagged with
// pattern/seqIndex/seqTotal by deriveMapStory. The prose must read as a SEQUENCE.
const temporalBeats: Beat[] = [
  {
    kind: "title",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "Marriage equality spread over time",
  },
  {
    kind: "establish",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
  {
    kind: "reveal",
    camera: [4, 50, 8, 54],
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
    seqTotal: 3,
  },
  {
    kind: "reveal",
    camera: [2, 42, 8, 51],
    highlight: ["FRA"],
    dim: true,
    callout: {
      region: "FRA",
      name: "France",
      value: "2013",
      text: "France — 2013",
    },
    copy: "France — 2013",
    pattern: "temporal",
    seqIndex: 1,
    seqTotal: 3,
  },
  {
    kind: "reveal",
    camera: [97, 5, 106, 20],
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
    seqIndex: 2,
    seqTotal: 3,
  },
  {
    kind: "takeaway",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "A wave from 2001 to 2025",
  },
];

describe("mapStoryToChapters — temporal pattern", () => {
  const meta = {
    title: "Marriage equality spread over time",
    description: "The year same-sex marriage took effect in each country",
    source: { name: "Wikipedia", url: "https://example.org" },
    regionsWithData: 36,
  };

  it("words temporal reveals as a sequence: the first / then / the most recent, never highest/lowest", () => {
    const story = mapStoryToChapters(temporalBeats, meta);
    const reveals = story.steps.filter((s) => s.prose.includes("—"));
    expect(reveals[0].prose).toBe("Netherlands — 2001, the first");
    expect(reveals[1].prose).toBe("France — 2013, then");
    expect(reveals[2].prose).toBe("Thailand — 2025, the most recent");
    for (const r of reveals) {
      expect(r.prose.toLowerCase()).not.toContain("highest");
      expect(r.prose.toLowerCase()).not.toContain("lowest");
    }
  });
});
