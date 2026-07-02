import { describe, it, expect } from "bun:test";
import { routeStoryToChapters, scrollyFrames } from "../src/route-story";
import { computeRouteReveal } from "../src/route-geo";
import world from "../assets/geo/world.geojson" assert { type: "json" };

const sampleRoute = {
  type: "route" as const,
  route: [
    [116.4, 39.9], // Beijing
    [96.0, 33.0], // Qinghai
    [88.0, 29.0], // Tibet
    [77.2, 28.6], // Delhi
  ] as [number, number][],
  basemap: "dataviz",
  title: "A river's path from Tibet to the sea",
  description: "The route crosses several territories.",
  source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
};

describe("routeStoryToChapters", () => {
  const layout = computeRouteReveal(sampleRoute, world as any);
  const story = routeStoryToChapters(layout, {
    title: sampleRoute.title,
    description: sampleRoute.description,
    source: sampleRoute.source,
  });

  it("emits an intro step plus one drawTo step per territory", () => {
    const drawSteps = story.steps.filter((s) => s.action === "drawTo");
    expect(drawSteps.length).toBe(layout.territories.length);
    expect(story.steps.length).toBe(layout.territories.length + 1);
  });

  it("makes the first step the intro (flyTo, carries the description)", () => {
    expect(story.steps[0].action).toBe("flyTo");
    expect(story.steps[0].prose.length).toBeGreaterThan(0);
  });

  it("gives every step non-empty prose", () => {
    for (const s of story.steps)
      expect(s.prose.trim().length).toBeGreaterThan(0);
  });

  it("references territories by ascending index in drawTo steps", () => {
    const refs = story.steps
      .filter((s) => s.action === "drawTo")
      .map((s) => s.ref as number);
    for (let i = 0; i < refs.length; i++) expect(refs[i]).toBe(i);
  });

  it("carries the story title and source", () => {
    expect(story.title).toBe(sampleRoute.title);
    expect(story.source?.name).toBe("Natural Earth");
  });
});

describe("scrollyFrames", () => {
  it("grows with step count", () => {
    expect(scrollyFrames(5, 30)).toBeGreaterThan(scrollyFrames(3, 30));
  });
  it("includes the title scene (≥ one title hold)", () => {
    expect(scrollyFrames(2, 30)).toBeGreaterThanOrEqual(75);
  });
});
