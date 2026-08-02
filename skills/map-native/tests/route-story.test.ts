import { describe, it, expect } from "bun:test";
import {
  resolveRouteWalk,
  routeStoryToChapters,
  scrollyFrames,
  scrollyStepCount,
} from "../src/route-story";
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
  const walk = resolveRouteWalk(layout, undefined);
  const story = routeStoryToChapters(layout, walk, {
    title: sampleRoute.title,
    description: sampleRoute.description,
    source: sampleRoute.source,
  });

  it("emits intro + overview + one drawTo per territory + takeaway", () => {
    const drawSteps = story.steps.filter((s) => s.action === "drawTo");
    expect(drawSteps.length).toBe(layout.territories.length);
    expect(story.steps.length).toBe(layout.territories.length + 3);
  });

  it("makes the first step the intro (flyTo, carries the description)", () => {
    expect(story.steps[0].action).toBe("flyTo");
    expect(story.steps[0].prose.length).toBeGreaterThan(0);
  });

  it("inserts an overview step at index 1 with sentinel ref -1", () => {
    const overview = story.steps[1];
    expect(overview.action).toBe("flyTo");
    expect(overview.ref).toBe(-1);
    expect(overview.prose.trim().length).toBeGreaterThan(0);
  });

  it("appends a takeaway step with sentinel ref = territories.length", () => {
    const takeaway = story.steps[story.steps.length - 1];
    expect(takeaway.action).toBe("flyTo");
    expect(takeaway.ref).toBe(layout.territories.length);
    expect(takeaway.prose.trim().length).toBeGreaterThan(0);
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

  it("uses the editorial note as drawTo prose, falling back to the label", () => {
    const notes = { [layout.territories[0].key]: "A custom editorial note" };
    const withNotes = routeStoryToChapters(layout, walk, {
      title: sampleRoute.title,
      description: sampleRoute.description,
      source: sampleRoute.source,
      notes,
    });
    const draws = withNotes.steps.filter((s) => s.action === "drawTo");
    expect(draws[0].prose).toBe("A custom editorial note");
    // territory without a note falls back to its label
    expect(draws[1].prose).toBe(layout.territories[1].label);
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

describe("scrollyStepCount — symbol honors maxReveals", () => {
  const points = [
    { lon: 2.35, lat: 48.85, value: 10, label: "Paris" },
    { lon: 13.4, lat: 52.5, value: 9, label: "Berlin" },
    { lon: -0.13, lat: 51.51, value: 8, label: "London" },
    { lon: 12.5, lat: 41.9, value: 7, label: "Rome" },
    { lon: -3.7, lat: 40.4, value: 6, label: "Madrid" },
    { lon: 4.9, lat: 52.37, value: 5, label: "Amsterdam" },
  ];

  const baseConfig = {
    type: "symbol" as const,
    basemap: "dataviz",
    title: "Top cities",
    valueUnit: "",
  };

  it("fewer maxReveals yields fewer steps than more maxReveals", () => {
    const stepsWithFew = scrollyStepCount(
      { ...baseConfig, points, maxReveals: 2 },
      world as any,
    );
    const stepsWithMany = scrollyStepCount(
      { ...baseConfig, points, maxReveals: 6 },
      world as any,
    );
    expect(stepsWithFew).toBeLessThan(stepsWithMany);
  });
});
