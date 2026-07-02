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
