import { describe, it, expect } from "bun:test";
import { deriveChartStory } from "../../chart-native/src/chart-story";
import { chartStoryToChapters } from "../src/chart-chapters";

// End-to-end through the scrolly chapter builder: a journalist-confirmed beat
// plan (spec.beats) must surface as the RENDERED step captions, in the
// confirmed order — the Wave 8 farm-income failure was exactly this plan
// having no field to land in (the engine auto-picked first+last+jumps).
describe("chart scrolly chapters — explicit journalist beats", () => {
  const spec = {
    nativeType: "line",
    title: "Farm income fell through a decade of crises, then rebuilt",
    description: "Income index of French farms, 2005-2025 (2005 = 100)",
    unit: "income index (2005 = 100)",
    source: { name: "X", url: "https://x" },
    data: "year,income\n2005,100\n2010,72\n2016,64\n2020,88\n2025,112",
    directLabel: "income",
    beats: [
      {
        x: "2005",
        xEnd: "2016",
        text: "A decade of crises: income fell by a third",
      },
      {
        x: "2016",
        xEnd: "2025",
        text: "The rebuild: back above water in nine years",
      },
      { x: "2025", text: "A record year — but a caveat on input costs" },
    ],
  };

  it("step prose carries the confirmed captions in the confirmed order", () => {
    const beats = deriveChartStory(spec as never, "A record, fragile high");
    const story = chartStoryToChapters(beats, {
      title: spec.title,
      description: spec.description,
      source: spec.source,
    });
    const revealProse = story.steps
      .filter((s) => s.id.includes("reveal"))
      .map((s) => s.prose);
    expect(revealProse).toEqual([
      "A decade of crises: income fell by a third",
      "The rebuild: back above water in nine years",
      "A record year — but a caveat on input costs",
    ]);
    // the frame is intact: intro (description) first, takeaway last
    expect(story.steps[0].prose).toBe(spec.description);
    expect(story.steps[story.steps.length - 1].prose).toBe(
      "A record, fragile high",
    );
  });

  it("a bar walk of 5 confirmed categories yields 5 walk steps", () => {
    const barSpec = {
      nativeType: "bar",
      title: "Where the population is aging fastest",
      description: "Share of residents 65+, by department",
      unit: "share of residents 65+ (%)",
      valueUnit: "%",
      source: { name: "X", url: "https://x" },
      data:
        "department,share\nCreuse,34\nNièvre,32\nLot,31\nCantal,30\nGers,29\n" +
        "Dordogne,28\nAveyron,27\nAllier,26\nIndre,25\nHaute-Loire,24\n" +
        "Corrèze,23\nAlpes-Maritimes,22",
      beats: [
        { category: "Creuse" },
        { category: "Cantal" },
        { category: "Aveyron" },
        { category: "Corrèze" },
        {
          category: "Alpes-Maritimes",
          text: "And Alpes-Maritimes — aging too",
        },
      ],
    };
    const beats = deriveChartStory(barSpec as never, "Aging is national");
    const story = chartStoryToChapters(beats, {
      title: barSpec.title,
      description: barSpec.description,
      source: barSpec.source,
    });
    const reveals = story.steps.filter((s) => s.id.includes("reveal"));
    expect(reveals.length).toBe(5);
    expect(reveals[reveals.length - 1].prose).toBe(
      "And Alpes-Maritimes — aging too",
    );
  });
});
