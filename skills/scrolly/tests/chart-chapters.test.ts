import { describe, it, expect } from "bun:test";
import { chartStoryToChapters } from "../src/chart-chapters";
import type { ChartBeat } from "../../chart-native/src/chart-story";

const beats: ChartBeat[] = [
  { kind: "title", callout: null, copy: "Arctic sea ice has shrunk" },
  { kind: "establish", callout: null, copy: "" },
  {
    kind: "reveal",
    progress: 0,
    callout: {
      name: "1979",
      value: "7 million km²",
      text: "1979 — 7 million km²",
    },
    copy: "1979 — 7 million km²",
  },
  {
    kind: "reveal",
    progress: 1,
    callout: {
      name: "2025",
      value: "4.3 million km²",
      text: "2025 — 4.3 million km²",
    },
    copy: "2025 — 4.3 million km²",
  },
  { kind: "takeaway", callout: null, copy: "The ice keeps thinning" },
];
const meta = {
  title: "Arctic sea ice has shrunk",
  description: "September minimum, 1979–2025",
  source: { name: "NSIDC", url: "https://nsidc.org" },
};

describe("chartStoryToChapters", () => {
  const story = chartStoryToChapters(beats, meta);
  it("every step is visual:'chart' and ref = beat index", () => {
    expect(story.visual).toBe("chart");
    expect(story.steps.every((s) => s.visual === "chart")).toBe(true);
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3, 4]);
  });
  it("title + establish carry the description; the title is never a caption", () => {
    expect(story.steps[0].prose).toBe(meta.description);
    expect(story.steps[1].prose).toBe(meta.description);
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("reveal steps carry the beat copy; takeaway carries its copy", () => {
    expect(story.steps[2].prose).toBe("1979 — 7 million km²");
    expect(story.steps[4].prose).toBe("The ice keeps thinning");
  });
  it("line reveal steps use the drawTo action", () => {
    expect(story.steps[2].action).toBe("drawTo");
  });
});
