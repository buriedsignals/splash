import { describe, it, expect } from "bun:test";
import {
  deriveSymbolStory,
  DEFAULT_MAX_REVEALS,
  markTriggerFrames,
} from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";

const points: SymbolPoint[] = [
  { lon: -0.1, lat: 51.5, value: 296, label: "London" },
  { lon: 4.9, lat: 52.4, value: 52, label: "Amsterdam" },
  { lon: 2.35, lat: 48.85, value: 181, label: "Paris" },
];

describe("deriveSymbolStory", () => {
  const beats = deriveSymbolStory(points, {
    title: "Europe's tech-funding map",
    unit: "$bn",
  });

  it("emits title → establish → reveal×N → takeaway in order", () => {
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "reveal",
      "takeaway",
    ]);
  });
  it("orders reveals by value descending", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.map((b) => b.callout!.name)).toEqual([
      "London",
      "Paris",
      "Amsterdam",
    ]);
  });
  it("formats each reveal callout as 'name — value+unit'", () => {
    const london = beats.find((b) => b.callout?.name === "London")!;
    expect(london.callout!.value).toBe("296$bn");
    expect(london.callout!.text).toBe("London — 296$bn");
    expect(london.copy).toBe("London — 296$bn");
  });
  it("frames each reveal on a small bbox around the city", () => {
    const london = beats.find((b) => b.callout?.name === "London")!;
    expect(london.camera).toEqual([
      -0.1 - 1.5,
      51.5 - 1.5,
      -0.1 + 1.5,
      51.5 + 1.5,
    ]);
  });
  it("frames title/establish/takeaway on the full points bbox", () => {
    const full: [number, number, number, number] = [-0.1, 48.85, 4.9, 52.4];
    expect(beats[0].camera).toEqual(full); // title
    expect(beats[1].camera).toEqual(full); // establish
    expect(beats[beats.length - 1].camera).toEqual(full); // takeaway
  });
  it("puts the title in the title beat and leaves establish copy empty", () => {
    expect(beats[0].copy).toBe("Europe's tech-funding map");
    expect(beats[1].copy).toBe("");
  });
  it("is deterministic", () => {
    expect(
      deriveSymbolStory(points, {
        title: "Europe's tech-funding map",
        unit: "$bn",
      }),
    ).toEqual(beats);
  });
});

describe("deriveSymbolStory — lang", () => {
  const parisPoints: SymbolPoint[] = [
    { lon: 2.3376, lat: 48.8709, value: 34000, label: "Châtelet" },
    { lon: 2.3488, lat: 48.8467, value: 9800, label: "Gare du Nord" },
  ];

  it("localizes callout numbers when meta.lang is fr (thousands grouping)", () => {
    const beats = deriveSymbolStory(parisPoints, {
      title: "T",
      unit: " voyageurs/j",
      lang: "fr",
    });
    const chatelet = beats.find((b) => b.callout?.name === "Châtelet")!;
    expect(chatelet.callout!.value).toBe("34 000 voyageurs/j"); // narrow no-break space
    expect(chatelet.copy).toBe("Châtelet — 34 000 voyageurs/j");
  });

  it("keeps the default English grouping when lang is unset", () => {
    const beats = deriveSymbolStory(parisPoints, {
      title: "T",
      unit: " riders/day",
    });
    const chatelet = beats.find((b) => b.callout?.name === "Châtelet")!;
    expect(chatelet.callout!.value).toBe("34,000 riders/day");
  });
});

describe("deriveSymbolStory — decimal value + word unit (the seismes case)", () => {
  const quakes: SymbolPoint[] = [
    { lon: 142.4, lat: 38.3, value: 7.4, label: "Tohoku" },
    { lon: -73.2, lat: -35.8, value: 6.1, label: "Maule" },
  ];

  it("keeps the decimal (no integer rounding) and spaces a word unit", () => {
    const beats = deriveSymbolStory(quakes, {
      title: "T",
      unit: "magnitude",
      lang: "fr",
    });
    const tohoku = beats.find((b) => b.callout?.name === "Tohoku")!;
    // Was "7magnitude" (Math.round + no space); must read "7,4 magnitude".
    expect(tohoku.callout!.value).toBe("7,4 magnitude");
    expect(tohoku.copy).toBe("Tohoku — 7,4 magnitude");
  });

  it("keeps the English dot decimal and the word-unit space", () => {
    const beats = deriveSymbolStory(quakes, { title: "T", unit: "magnitude" });
    const tohoku = beats.find((b) => b.callout?.name === "Tohoku")!;
    expect(tohoku.callout!.value).toBe("7.4 magnitude");
  });
});

describe("deriveSymbolStory maxReveals", () => {
  const pts: SymbolPoint[] = [
    { lon: 0, lat: 51, value: 300, label: "London", radius: 40 },
    { lon: 2, lat: 48, value: 200, label: "Paris", radius: 30 },
    { lon: 13, lat: 52, value: 150, label: "Berlin", radius: 25 },
    { lon: 12, lat: 41, value: 120, label: "Rome", radius: 22 },
    { lon: -3, lat: 40, value: 90, label: "Madrid", radius: 18 },
    { lon: 4, lat: 50, value: 60, label: "Brussels", radius: 14 },
  ];
  const meta = { title: "Tech funding", insight: "London leads", unit: "$bn" };

  it("emits exactly maxReveals reveal beats, the top-N by value descending", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 3 });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(3);
    expect(reveals.map((b) => b.highlight[0])).toEqual([
      "London",
      "Paris",
      "Berlin",
    ]);
  });
  it("defaults to DEFAULT_MAX_REVEALS when no cap is given", () => {
    const beats = deriveSymbolStory(pts, meta);
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(
      DEFAULT_MAX_REVEALS,
    );
  });
  it("clamps to the number of points when fewer than maxReveals", () => {
    const beats = deriveSymbolStory(pts.slice(0, 2), meta, { maxReveals: 5 });
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(2);
  });
  it("opens title/establish and closes takeaway, each reveal callout carries the unit", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 2 });
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    for (const b of beats.filter((x) => x.kind === "reveal")) {
      expect(b.callout?.value.includes("$bn")).toBe(true);
    }
  });
});

describe("markTriggerFrames", () => {
  const marks: SymbolPoint[] = [
    { lon: 0, lat: 51, value: 300, label: "London" },
    { lon: 2, lat: 48, value: 200, label: "Paris" },
    { lon: 13, lat: 52, value: 150, label: "Berlin" },
  ];

  it("context: every mark shares the establish beat's own start frame", () => {
    const m = markTriggerFrames(marks, "context", 75, new Map());
    expect(m.get("London")).toBe(75);
    expect(m.get("Paris")).toBe(75);
    expect(m.get("Berlin")).toBe(75);
  });

  it("sequential: a mark with its own reveal beat triggers at that beat's start frame", () => {
    const revealTriggers = new Map([
      ["London", 135],
      ["Paris", 225],
    ]);
    const m = markTriggerFrames(marks, "sequential", 75, revealTriggers);
    expect(m.get("London")).toBe(135);
    expect(m.get("Paris")).toBe(225);
  });

  it("sequential: a mark with no reveal beat (beyond maxReveals) never triggers", () => {
    const revealTriggers = new Map([["London", 135]]);
    const m = markTriggerFrames(marks, "sequential", 75, revealTriggers);
    expect(m.get("Berlin")).toBe(Number.POSITIVE_INFINITY);
  });

  it("falls back to the empty-string key for a point with no label", () => {
    const m = markTriggerFrames(
      [{ lon: 0, lat: 0, value: 1 }],
      "context",
      10,
      new Map(),
    );
    expect(m.get("")).toBe(10);
  });
});
