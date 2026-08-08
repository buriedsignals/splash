import { describe, it, expect } from "bun:test";
import {
  resolveRouteWalk,
  routeStoryToChapters,
  scrollyFrames,
  scrollyStepCount,
} from "../src/route-story";
import { computeRouteReveal } from "../src/route-geo";
import world from "../assets/geo/world.geojson" assert { type: "json" };
import { formatLocaleNumber } from "../../../lib/core/locale";

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

// ---------------------------------------------------------------------------
// THE ROUTE TAKEAWAY IS GENERATED TEXT, so it is furniture.
//
// With no editorial insight, routeStoryToChapters composed its closing caption itself:
// `${n} territories, ${km} km` — English words, and a raw number with an English
// thousands convention, on the last card of a French page. Same defect class as the
// locator's "the highest of the 5 shown": a caption the engine WROTE, in a language
// nobody chose.
// ---------------------------------------------------------------------------
describe("routeStoryToChapters — the derived takeaway is localized", () => {
  const layout = computeRouteReveal(sampleRoute, world as any);
  const walk = resolveRouteWalk(layout, undefined);
  const takeawayFor = (lang: string | undefined) =>
    routeStoryToChapters(layout, walk, {
      title: sampleRoute.title,
      description: sampleRoute.description,
      source: sampleRoute.source,
      lang,
    }).steps.at(-1)!.prose;

  it("reads in the deliverable's language, never English by default", () => {
    const n = layout.territories.length;
    const km = Math.round(layout.totalLengthKm);
    expect(takeawayFor(undefined)).toBe(
      `${n} territories, ${formatLocaleNumber(km, undefined)} km`,
    );
    expect(takeawayFor("fr")).toMatch(/territoires/);
    expect(takeawayFor("de")).toMatch(/Gebiete/);
    expect(takeawayFor("it")).toMatch(/territori/);
    for (const lang of ["fr", "de", "it"])
      expect(takeawayFor(lang)).not.toMatch(/territories/);
  });

  it("still prefers the journalist's own insight when there is one", () => {
    const story = routeStoryToChapters(layout, walk, {
      title: sampleRoute.title,
      description: sampleRoute.description,
      source: sampleRoute.source,
      insight: "Le fleuve traverse quatre pays.",
      lang: "fr",
    });
    expect(story.steps.at(-1)!.prose).toBe("Le fleuve traverse quatre pays.");
  });
});

// ---------------------------------------------------------------------------
// A CLOSING CAPTION THAT REPEATS THE TITLE IS NOT A CLOSING CAPTION.
//
// Measured on a delivered page (the shipped route sample, produced through
// skills/scrolly/scripts/produce.mjs with its `insight` removed — which is what every loop-
// assembled route config looks like, since no assembler writes `insight` for a map): the
// persistent module header read "The Yarlung Tsangpo's long road to the sea", and so did the
// last prose card, verbatim. Scrolly.tsx passed `insight: config.insight ?? config.title`, so
// the engine's own "no insight → derive a closer" branch could never be reached from the web
// track.
//
// The rule is the map family's own (deriveMapStory has always refused an insight equal to the
// title — map-story.ts's `closingInsight`), applied to the one map type that composes its steps
// itself. Route legitimately keeps a closing STEP where the chart track drops an empty one: the
// step is also a map STATE — its sentinel ref frames the completed route — so dropping it would
// end the scroll with the trajectory never finished.
// ---------------------------------------------------------------------------
describe("routeStoryToChapters — the closing caption never repeats the title", () => {
  const layout = computeRouteReveal(sampleRoute, world as any);
  const walk = resolveRouteWalk(layout, undefined);
  const closeWith = (insight: string | undefined, lang?: string) =>
    routeStoryToChapters(layout, walk, {
      title: sampleRoute.title,
      description: sampleRoute.description,
      source: sampleRoute.source,
      insight,
      lang,
    }).steps.at(-1)!.prose;

  const derived = `${layout.territories.length} territories, ${formatLocaleNumber(
    Math.round(layout.totalLengthKm),
    undefined,
  )} km`;

  it("falls through to the derived route span when the offered insight IS the title", () => {
    expect(closeWith(sampleRoute.title)).toBe(derived);
    expect(closeWith(sampleRoute.title)).not.toBe(sampleRoute.title);
  });

  it("treats a whitespace-padded title as the title, not as an editorial line", () => {
    expect(closeWith(`  ${sampleRoute.title}\n`)).toBe(derived);
  });

  it("still ships a genuinely different closing line, in the deliverable's language", () => {
    expect(closeWith("Un fleuve, trois pays, 2 755 km.", "fr")).toBe(
      "Un fleuve, trois pays, 2 755 km.",
    );
  });

  it("keeps the closing STEP even with no insight — it frames the completed route", () => {
    const story = routeStoryToChapters(layout, walk, {
      title: sampleRoute.title,
      description: sampleRoute.description,
      source: sampleRoute.source,
      insight: sampleRoute.title,
      lang: undefined,
    });
    const last = story.steps.at(-1)!;
    expect(last.ref).toBe(layout.territories.length);
    expect(last.prose.trim().length).toBeGreaterThan(0);
  });
});
