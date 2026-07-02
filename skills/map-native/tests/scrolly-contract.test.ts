import { describe, it, expect } from "bun:test";
import { checkScrollyConformance } from "../src/conformance";
import type { ScrollyStory } from "../../scrolly/src/chapters";

const good: ScrollyStory = {
  title: "A river's path from Tibet to the sea",
  description: "The route crosses several territories.",
  source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
  visual: "map",
  steps: [
    {
      id: "s0",
      visual: "map",
      action: "flyTo",
      ref: 0,
      prose: "Intro caption here.",
    },
    { id: "s1", visual: "map", action: "drawTo", ref: 0, prose: "China" },
    { id: "s2", visual: "map", action: "drawTo", ref: 1, prose: "India" },
  ],
};

describe("checkScrollyConformance", () => {
  it("accepts a well-formed story", () => {
    expect(
      checkScrollyConformance({ story: good, territoryCount: 2 }).violations,
    ).toEqual([]);
  });

  it("rejects fewer than 2 steps", () => {
    const s = { ...good, steps: [good.steps[0]] };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("at least 2 steps");
  });

  it("rejects empty prose", () => {
    const s = {
      ...good,
      steps: [good.steps[0], { ...good.steps[1], prose: "  " }],
    };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("empty prose");
  });

  it("rejects a drawTo ref beyond the territory count", () => {
    expect(
      checkScrollyConformance({
        story: good,
        territoryCount: 1,
      }).violations.join(" "),
    ).toContain("out of range");
  });

  it("rejects a missing source", () => {
    const s = { ...good, source: undefined };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("cite a source");
  });
});
