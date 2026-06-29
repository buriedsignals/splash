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
    kind: "takeaway",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "North high, south low",
  },
];

describe("mapStoryToChapters", () => {
  it("emits one step per beat, all visual:map / action:flyTo, ref = beat index", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    expect(story.steps).toHaveLength(4);
    expect(
      story.steps.every((s) => s.visual === "map" && s.action === "flyTo"),
    ).toBe(true);
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3]);
  });
  it("gives every step unique non-empty prose, deriving from beat copy", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    expect(story.steps.every((s) => s.prose.trim().length > 0)).toBe(true);
    expect(new Set(story.steps.map((s) => s.id)).size).toBe(story.steps.length);
    // the establish beat has empty copy → its prose falls back to the title
    expect(story.steps[1].prose).toBe("Renewables across Europe");
  });
  it("maps the first step to the title beat and the last to the takeaway", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    expect(story.steps[0].prose).toBe("Renewables across Europe");
    expect(story.steps[story.steps.length - 1].prose).toBe(
      "North high, south low",
    );
  });
});
