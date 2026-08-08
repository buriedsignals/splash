import { describe, it, expect } from "bun:test";
import {
  deriveSymbolStory,
  DEFAULT_MAX_REVEALS,
  markTriggerFrames,
} from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";
import { tourBoxDelta, WIDE_TOUR_DELTA } from "../src/core/tour-box";

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
  it("frames each reveal on a bbox around the city, sized from the points' spread", () => {
    // lon spread -0.1…4.9 = 5° → half 2.5° → ×TOUR_SCALE = 1.25° (wider than the 0.8875°
    // the latitude spread would give, and under the 1.5° cap). NOT the old constant 1.5°.
    const london = beats.find((b) => b.callout?.name === "London")!;
    expect(london.camera).toEqual([
      -0.1 - 1.25,
      51.5 - 1.25,
      -0.1 + 1.25,
      51.5 + 1.25,
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
    expect(chatelet.callout!.value).toBe("34 000 voyageurs/j"); // narrow no-break space
    expect(chatelet.copy).toBe("Châtelet — 34 000 voyageurs/j");
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

// ★ THE STOP BOX IS A FRACTION OF THE POINTS' OWN SPREAD, ON BOTH PATHS.
//
// The same defect the locator tour carried (core/tour-box.ts's header): the reveal box was the
// constant ±1.5°, so the TIGHTER the cluster the FLATTER the tour — every stop framed wider than
// the establishing shot, the camera zooming OUT from its own opening while only the circles lit
// up in turn. A symbol story reaches that box by two routes (the journalist's confirmed arc, and
// the salience walk), and both carried the constant.
describe("deriveSymbolStory — the reveal box is sized from the points' spread", () => {
  // Four Alpine sites inside 90 km — the reported cluster, as symbol points.
  const glaciers: SymbolPoint[] = [
    {
      lon: 8.077508042316026,
      lat: 46.451632464223096,
      value: 41,
      label: "Rhône",
    },
    {
      lon: 7.661000215400804,
      lat: 45.986011489842674,
      value: 33,
      label: "Zmutt",
    },
    {
      lon: 8.39847520305841,
      lat: 46.62606149864873,
      value: 22,
      label: "Trift",
    },
    {
      lon: 7.547186841148459,
      lat: 46.00520315741525,
      value: 18,
      label: "Gorner",
    },
  ];
  const halfWidth = (c: [number, number, number, number]) => (c[2] - c[0]) / 2;
  const revealsOf = (bs: ReturnType<typeof deriveSymbolStory>) =>
    bs.filter((b) => b.kind === "reveal");

  it("salience walk: a clustered set is framed at tourBoxDelta, NOT the constant wide box", () => {
    const reveals = revealsOf(
      deriveSymbolStory(glaciers, { title: "Quatre glaciers" }),
    );
    expect(reveals.length).toBe(4);
    for (const b of reveals) {
      expect(halfWidth(b.camera)).toBeCloseTo(tourBoxDelta(glaciers), 12);
      expect(halfWidth(b.camera)).toBeLessThan(WIDE_TOUR_DELTA);
    }
  });

  it("confirmed arc: the same clustered set gets the same derived box, not the constant", () => {
    const reveals = revealsOf(
      deriveSymbolStory(glaciers, {
        title: "Quatre glaciers",
        arcBeats: [
          { region: "Rhône", role: "establish", text: "Le Rhône recule." },
          { region: "Zmutt", role: "build", text: "Le Zmutt suit." },
          { region: "Gorner", role: "payoff", text: "Le Gorner conclut." },
        ],
      }),
    );
    expect(reveals.length).toBe(3);
    for (const b of reveals) {
      expect(halfWidth(b.camera)).toBeCloseTo(tourBoxDelta(glaciers), 12);
      expect(halfWidth(b.camera)).toBeLessThan(WIDE_TOUR_DELTA);
    }
  });

  it("a stop is a genuinely NEW view: its box is narrower than the box holding every point — the defect, stated as the reader saw it", () => {
    const beats = deriveSymbolStory(glaciers, { title: "Quatre glaciers" });
    const establishing = beats.find((b) => b.kind === "establish")!.camera;
    for (const b of revealsOf(beats)) {
      expect(b.camera[2] - b.camera[0]).toBeLessThan(
        establishing[2] - establishing[0],
      );
      expect(b.camera[3] - b.camera[1]).toBeLessThan(
        establishing[3] - establishing[1],
      );
    }
    // …and consecutive stops actually travel: the centres are more than one box apart.
    const reveals = revealsOf(beats);
    const centreLon = (c: [number, number, number, number]) =>
      (c[0] + c[2]) / 2;
    expect(
      Math.abs(centreLon(reveals[1]!.camera) - centreLon(reveals[0]!.camera)),
    ).toBeGreaterThan(halfWidth(reveals[0]!.camera));
  });

  it("a set already spread across a continent is framed EXACTLY as before — the cap binds, on both paths", () => {
    const continental: SymbolPoint[] = [
      { lon: -9.1, lat: 38.7, value: 30, label: "Lisbon" },
      { lon: 37.6, lat: 55.7, value: 90, label: "Moscow" },
      { lon: 12.5, lat: 41.9, value: 60, label: "Rome" },
    ];
    const box = (p: SymbolPoint) => [
      p.lon - 1.5,
      p.lat - 1.5,
      p.lon + 1.5,
      p.lat + 1.5,
    ];
    for (const b of revealsOf(
      deriveSymbolStory(continental, { title: "Europe" }),
    )) {
      const p = continental.find((x) => x.label === b.highlight[0])!;
      expect(b.camera).toEqual(box(p) as never);
    }
    for (const b of revealsOf(
      deriveSymbolStory(continental, {
        title: "Europe",
        arcBeats: [
          { region: "Moscow", role: "establish", text: "a" },
          { region: "Lisbon", role: "payoff", text: "b" },
        ],
      }),
    )) {
      const p = continental.find((x) => x.label === b.highlight[0])!;
      expect(b.camera).toEqual(box(p) as never);
    }
  });

  it("the box is sized from EVERY point, not just the ones a capped walk visits — the establishing shot frames them all, so the stop is one zoom in from THAT", () => {
    const capped = deriveSymbolStory(
      glaciers,
      { title: "T" },
      { maxReveals: 2 },
    );
    for (const b of revealsOf(capped)) {
      expect(halfWidth(b.camera)).toBeCloseTo(tourBoxDelta(glaciers), 12);
    }
  });

  it("one point has no tour to serve, so it keeps the wide 'where is this place' box", () => {
    const one: SymbolPoint[] = [
      { lon: 6.14, lat: 46.2, value: 5, label: "Genève" },
    ];
    const reveal = revealsOf(deriveSymbolStory(one, { title: "T" }))[0]!;
    expect(halfWidth(reveal.camera)).toBe(WIDE_TOUR_DELTA);
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

// A SymbolPoint's `label` is optional (symbol-geo.ts), and the loop only sets it when the CSV
// actually has a label column (lib/loop/assemble/map-native.ts) — so this caption composed
// `${p.label ?? ""} — ${value}` against nothing. Measured on a delivered French page:
//     "— 220 MW, le plus élevé des 4"
// The mirror of the locator defect ("Pont d'Austerlitz — , the highest of the 5 shown"): the
// same template, the same hole, the other end.
describe("deriveSymbolStory — an unlabelled point", () => {
  const unlabelled: SymbolPoint[] = [
    { lon: 6.14, lat: 46.21, value: 220 },
    { lon: 8.54, lat: 47.37, value: 90 },
  ];

  it("never opens a caption on a dangling separator", () => {
    const beats = deriveSymbolStory(unlabelled, {
      title: "Installed capacity",
      unit: " MW",
    });
    for (const b of beats.filter((x) => x.kind === "reveal")) {
      expect(b.copy).not.toMatch(/^\s*[—–]/);
      expect(b.callout!.text).not.toMatch(/^\s*[—–]/);
    }
  });

  it("keeps the value as the whole caption when there is no name to pair it with", () => {
    const reveals = deriveSymbolStory(unlabelled, {
      title: "Installed capacity",
      unit: " MW",
    }).filter((b) => b.kind === "reveal");
    expect(reveals.map((b) => b.copy)).toEqual(["220 MW", "90 MW"]);
  });

  it("still pairs name and value when the point IS labelled", () => {
    const reveals = deriveSymbolStory(points, {
      title: "Europe's tech-funding map",
      unit: "$bn",
    }).filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toBe("London — 296$bn");
  });
});
