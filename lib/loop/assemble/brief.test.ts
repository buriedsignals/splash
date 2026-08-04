import { test, expect } from "bun:test";
import { briefFor } from "./brief";
import type { RunManifest } from "../manifest";

const RUN: RunManifest = {
  version: 4,
  runId: "r1",
  channel: "article-web",
  input: { data: { path: "data.csv", sha256: "x" } },
  elements: [
    {
      id: "e1",
      angle: {
        confirmedTakeaway: "Summer sea ice has lost a third of its extent",
        altInsight: "A line falling from 7 to 4.3 million square kilometres",
        unit: "million km²",
        emphasis: "2007",
      },
      proposal: {
        chosenId: "o1",
        options: [
          {
            id: "o1",
            nativeType: "line",
            engine: "chart-native",
            format: "static",
            why: "a trend over time",
          },
        ],
      },
    },
  ],
  events: [],
} as unknown as RunManifest;

test("the brief carries the angle, the pinned format and the credit — and nothing ambient", () => {
  const brief = briefFor(
    RUN,
    RUN.elements[0]!,
    "year,extent\n1979,7",
    "NSIDC",
    "https://nsidc.org",
    "static",
  );
  expect(brief.elementId).toBe("e1");
  expect(brief.nativeType).toBe("line");
  expect(brief.format).toBe("static");
  expect(brief.angle.confirmedTakeaway).toBe(
    "Summer sea ice has lost a third of its extent",
  );
  expect(brief.angle.emphasis).toBe("2007");
  expect(brief.attribution).toBe("NSIDC");
  expect(brief.sourceUrl).toBe("https://nsidc.org");
  expect(brief.dataCsv).toContain("1979,7");
  expect(brief.beats).toBeUndefined();
  // The manifest itself is NOT reachable from a brief: an assembler cannot go looking
  // for ambient state it was not handed.
  expect(Object.keys(brief)).not.toContain("run");
});

test("an element with a narrative plan carries its beats, anchor kind preserved", () => {
  const el = {
    ...RUN.elements[0]!,
    narrative: {
      beats: [
        {
          id: "b1",
          anchor: { kind: "x", value: "1979" },
          role: "setup",
          text: "It held on 7 million km².",
        },
        {
          id: "b2",
          anchor: { kind: "category", value: "Basel" },
          role: "turn",
          text: "Then Basel broke away.",
        },
      ],
    },
  } as unknown as RunManifest["elements"][number];
  const brief = briefFor(
    RUN,
    el,
    "year,extent\n1979,7",
    "NSIDC",
    undefined,
    "scrolly",
  );
  expect(brief.beats).toEqual([
    { x: "1979", role: "setup", text: "It held on 7 million km²." },
    { category: "Basel", role: "turn", text: "Then Basel broke away." },
  ]);
});

// I2: BriefBeat only carries "x"/"category" — a "region" or "place" anchor (widened onto
// the unified beat by feat/unified-beat-model, reachable once sub-project ③ starts emitting
// them) has no field to become on this brief and must refuse loud, never mislabel itself as
// a chart `category`.
test("a region anchor refuses loud rather than silently becoming a chart category", () => {
  const el = {
    ...RUN.elements[0]!,
    narrative: {
      beats: [
        {
          id: "b1",
          anchor: { kind: "region", value: "Basel-Stadt" },
          role: "setup",
          text: "Basel-Stadt led the region.",
        },
      ],
    },
  } as unknown as RunManifest["elements"][number];
  expect(() =>
    briefFor(RUN, el, "year,extent\n1979,7", "NSIDC", undefined, "scrolly"),
  ).toThrow(/region/);
});

test("a place anchor refuses loud the same way", () => {
  const el = {
    ...RUN.elements[0]!,
    narrative: {
      beats: [
        {
          id: "b1",
          anchor: {
            kind: "place",
            value: "Rhine confluence",
            lon: 7.6,
            lat: 47.6,
          },
          role: "setup",
          text: "Where the rivers meet.",
        },
      ],
    },
  } as unknown as RunManifest["elements"][number];
  expect(() =>
    briefFor(RUN, el, "year,extent\n1979,7", "NSIDC", undefined, "scrolly"),
  ).toThrow(/place/);
});

test("takes the language off the manifest, never off ambient state", () => {
  const b = briefFor(
    { ...RUN, lang: "it" },
    RUN.elements[0]!,
    "year,extent\n1979,7",
    "NSIDC",
    undefined,
    "static",
  );
  expect(b.lang).toBe("it");
});

test("omits lang entirely when the run has none — byte-identical to before", () => {
  const b = briefFor(
    RUN,
    RUN.elements[0]!,
    "year,extent\n1979,7",
    "NSIDC",
    undefined,
    "static",
  );
  expect("lang" in b).toBe(false);
});

// ---------------------------------------------------------------------------
// THE MAP TRACK — sub-project ③. The two refusals above stay exactly as they are for a CHART
// element; what changes is that a map element now has a field for a region anchor to become.
// Before this, `arcBeats` had ZERO occurrences in lib/ — a journalist's confirmed walk could
// not reach a map through the loop at all.
// ---------------------------------------------------------------------------
const MAP_RUN = {
  ...RUN,
  elements: [
    {
      ...RUN.elements[0]!,
      proposal: {
        chosenId: "o1",
        options: [
          {
            id: "o1",
            nativeType: "choropleth",
            engine: "map-native",
            format: "scrolly",
            why: "where the rents are",
          },
        ],
      },
      narrative: {
        beats: [
          {
            id: "b1",
            anchor: { kind: "region", value: "Genève" },
            role: "establish",
            text: "Geneva sets the ceiling.",
          },
          {
            id: "b2",
            anchor: { kind: "region", value: "Jura" },
            role: "payoff",
            text: "The Jura pays half that.",
          },
        ],
      },
    },
  ],
} as unknown as RunManifest;

test("a region anchor becomes a map arc beat on a MAP element", () => {
  const brief = briefFor(
    MAP_RUN,
    MAP_RUN.elements[0]!,
    "canton,rent\nGenève,1780",
    "OFS",
    undefined,
    "scrolly",
  );
  expect(brief.beats).toEqual([
    { region: "Genève", role: "establish", text: "Geneva sets the ceiling." },
    { region: "Jura", role: "payoff", text: "The Jura pays half that." },
  ]);
});

test("a chart anchor on a MAP element still refuses loud", () => {
  const el = {
    ...MAP_RUN.elements[0]!,
    narrative: {
      beats: [
        {
          id: "b1",
          anchor: { kind: "x", value: "1979" },
          role: "establish",
          text: "It began here.",
        },
      ],
    },
  } as unknown as RunManifest["elements"][number];
  expect(() =>
    briefFor(MAP_RUN, el, "canton,rent\nGenève,1780", "OFS", undefined, "scrolly"),
  ).toThrow(/map/);
});
