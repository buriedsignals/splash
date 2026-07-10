import { describe, it, expect } from "bun:test";
import {
  symbolGeometry,
  symbolRadius,
  niceNumber,
  legendStops,
  nearestSymbolIndex,
  type SymbolData,
} from "../src/symbol-geo";

const data: SymbolData = {
  points: [
    { lon: 2.35, lat: 48.85, value: 100, label: "Paris" },
    { lon: 13.4, lat: 52.52, value: 25, label: "Berlin" },
    { lon: -3.7, lat: 40.4, value: 400, label: "Madrid" },
  ],
};

describe("symbolRadius", () => {
  it("is area-proportional: 4x the value gives 2x the radius", () => {
    const r1 = symbolRadius(100, 400, 40);
    const r4 = symbolRadius(400, 400, 40);
    expect(r4).toBeCloseTo(40, 6); // max value → maxRadius
    expect(r4 / r1).toBeCloseTo(2, 6); // √(400/100) = 2, NOT 4
  });
  it("returns 0 for a non-positive max", () => {
    expect(symbolRadius(10, 0, 40)).toBe(0);
  });
});

describe("niceNumber", () => {
  it("rounds to one significant figure", () => {
    expect(niceNumber(412)).toBe(400);
    expect(niceNumber(87)).toBe(90);
    expect(niceNumber(0)).toBe(0);
  });
});

describe("symbolGeometry", () => {
  const g = symbolGeometry(data, 40);
  it("sorts symbols by value descending (large drawn first, small on top)", () => {
    expect(g.symbols.map((s) => s.value)).toEqual([400, 100, 25]);
  });
  it("sizes radii area-proportionally against the max value", () => {
    const madrid = g.symbols[0];
    const paris = g.symbols[1];
    expect(madrid.radius).toBeCloseTo(40, 6);
    expect(paris.radius / madrid.radius).toBeCloseTo(Math.sqrt(100 / 400), 6);
  });
  it("reports the value domain and a non-empty bbox", () => {
    expect(g.domain).toEqual([25, 400]);
    expect(g.bounds).toEqual([-3.7, 40.4, 13.4, 52.52]);
  });
  it("builds at least two nested legend stops with nice values", () => {
    expect(g.legend.length).toBeGreaterThanOrEqual(2);
    expect(g.legend[0].value).toBe(400); // largest stop = nice(max)
    expect(g.legend.every((s) => s.radius > 0)).toBe(true);
  });
  it("is deterministic — same input, same output", () => {
    expect(symbolGeometry(data, 40)).toEqual(g);
  });
});

describe("legendStops", () => {
  it("dedupes collapsed nice values and still returns >= 2 stops", () => {
    const stops = legendStops([1, 3], 40); // tiny domain
    expect(stops.length).toBeGreaterThanOrEqual(2);
  });
});

describe("nearestSymbolIndex — overlap-robust hover pick", () => {
  it("returns the index of the centre nearest the pointer", () => {
    const centers = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 300, y: 100 },
    ];
    expect(nearestSymbolIndex(centers, { x: 195, y: 105 })).toBe(1);
  });

  it("reaches a small circle nested behind a larger one at its own centre", () => {
    // The big circle is drawn first, the small one is nested inside it and appears
    // LATER in the under-pointer list. Taking feature[0] would return the big circle
    // (the bug); nearest-centre returns the small one when the pointer is over ITS centre.
    const big = { x: 500, y: 500 }; // big circle centre
    const small = { x: 508, y: 508 }; // small circle centre, inside the big one
    const under = [big, small];
    expect(nearestSymbolIndex(under, { x: 508, y: 508 })).toBe(1); // small wins
    expect(nearestSymbolIndex(under, { x: 480, y: 480 })).toBe(0); // big wins near its edge
  });

  it("returns -1 for an empty candidate list", () => {
    expect(nearestSymbolIndex([], { x: 0, y: 0 })).toBe(-1);
  });

  it("is deterministic on ties — keeps the first-seen candidate", () => {
    const centers = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ];
    expect(nearestSymbolIndex(centers, { x: 10, y: 10 })).toBe(0);
  });
});
