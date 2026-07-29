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
