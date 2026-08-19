// The pure half of this beat's driver: what the reveal is at a position, and what a stop looks like
// at that reveal. The DOM wiring is verified by driving a real browser, as this format's doctrine
// requires — see `verify-scrolly.mjs`.

import { describe, expect, it } from "bun:test";
import {
  readingShare,
  revealFraction,
  shapeForReading,
  stopOpacity,
  stopReached,
} from "./route-drive.mjs";

const STOPS = [0, 0.153, 0.411, 0.538, 1];

describe("how far the line is drawn", () => {
  it("passes through every authored stop at whole positions", () => {
    STOPS.forEach((stop, i) => expect(revealFraction(STOPS, i)).toBeCloseTo(stop, 6));
  });

  it("interpolates between two stops in between", () => {
    expect(revealFraction(STOPS, 1.5)).toBeCloseTo((0.153 + 0.411) / 2, 6);
  });

  it("clamps outside the piece rather than running off either end", () => {
    expect(revealFraction(STOPS, -1)).toBe(0);
    expect(revealFraction(STOPS, 9)).toBe(1);
  });

  it("snaps to the nearer stop under reduced motion — a line that grows is what it turns off", () => {
    expect(revealFraction(STOPS, 1.4, true)).toBe(0.153);
    expect(revealFraction(STOPS, 1.6, true)).toBe(0.411);
  });
});

// The defect this file was written against, reported on the rebuilt beat: "les points steps ne se
// colorisent pas de la couleur au passage, il reste gris foncé". The driver moved each stop's
// OPACITY and nothing else, so every stop kept the fill it was SSR'd with — muted, for all of them
// but the first, whatever the reader did. A stop is reached or it is not; its colour says which.
describe("whether a stop has been reached", () => {
  it("is reached exactly when the line gets there", () => {
    expect(stopReached(0.411, 0.411)).toBe(true);
    expect(stopReached(0.41, 0.411)).toBe(false);
  });

  it("is reached at the start for a stop the route begins at", () => {
    expect(stopReached(0, 0)).toBe(true);
  });

  // Float arithmetic does not get to decide whether the reader arrived. Caught by the guard at
  // 1280x800 and nowhere else: the closing stop sits at exactly 1, the scroll ended at a reveal of
  // 0.9999999, and the last stop stayed grey for good.
  it("is reached when the line falls a hair short of it", () => {
    expect(stopReached(0.9999999, 1)).toBe(true);
    expect(stopReached(0.99, 1)).toBe(false);
  });
});

describe("how strongly a stop is painted", () => {
  it("holds a stop back before the line reaches its own stretch", () => {
    expect(stopOpacity(0, 0.153, 0)).toBeCloseTo(0.28, 6);
  });

  it("brings it all the way up once the line is there", () => {
    expect(stopOpacity(0.153, 0.153, 0)).toBe(1);
  });

  it("fades it in across the stretch that reaches it, so nothing pops", () => {
    const half = stopOpacity(0.0765, 0.153, 0);
    expect(half).toBeGreaterThan(0.28);
    expect(half).toBeLessThan(1);
  });
});

describe("the reading window a step's card is on screen for", () => {
  it("is half a frame plus half a card, over the step's own height", () => {
    expect(readingShare(1400, 1000, 200)).toBeCloseTo(0.4286, 4);
  });

  it("keeps the line moving before the card arrives, but only across the floor", () => {
    expect(shapeForReading(0.3, 0.4)).toBeCloseTo(0.075, 6);
    expect(shapeForReading(1, 0.4)).toBe(1);
  });
});
