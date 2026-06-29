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
  it("drops the establish beat; keeps title + reveal + (distinct) takeaway, ref = original beat index", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    expect(story.steps).toHaveLength(3); // establish (index 1) dropped
    expect(
      story.steps.every((s) => s.visual === "map" && s.action === "flyTo"),
    ).toBe(true);
    // refs are the ORIGINAL beat indices (title 0, reveal 2, takeaway 3)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 2, 3]);
  });
  it("shows the title exactly once and never repeats it at the end", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    const titleCount = story.steps.filter(
      (s) => s.prose === "Renewables across Europe",
    ).length;
    expect(titleCount).toBe(1);
    expect(story.steps[0].prose).toBe("Renewables across Europe"); // intro
    expect(story.steps[story.steps.length - 1].prose).toBe(
      "North high, south low",
    ); // distinct takeaway
  });
  it("centres the cards and gives every step unique non-empty prose", () => {
    const story = mapStoryToChapters(beats, {
      title: "Renewables across Europe",
    });
    expect(story.steps.every((s) => s.align === "center")).toBe(true);
    expect(story.steps.every((s) => s.prose.trim().length > 0)).toBe(true);
    expect(new Set(story.steps.map((s) => s.id)).size).toBe(story.steps.length);
  });
  it("drops a takeaway with no distinct closing line (copy equals the title → empty)", () => {
    // map-story leaves the takeaway copy empty when the insight equals the title.
    const noInsight: Beat[] = [
      beats[0],
      beats[1],
      beats[2],
      { ...beats[3], copy: "" },
    ];
    const story = mapStoryToChapters(noInsight, {
      title: "Renewables across Europe",
    });
    // title + reveal only — the empty takeaway is dropped, title still appears once
    expect(story.steps.map((s) => s.ref)).toEqual([0, 2]);
    expect(
      story.steps.filter((s) => s.prose === "Renewables across Europe").length,
    ).toBe(1);
  });
});
