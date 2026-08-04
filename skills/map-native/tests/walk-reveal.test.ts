import { describe, it, expect } from "bun:test";
import {
  walkSubjectProgress,
  activeWalkIndex,
  easedRevealProgress,
  REVEAL_FRAMES,
} from "../src/reveal";

// Sub-project ④(b) — the reveal kind learns an ORDER. Before this, one progress drove every
// subject at once and a journalist's confirmed walk changed nothing on screen.
describe("walkSubjectProgress — each subject in its turn", () => {
  it("enters in the walk's order: an earlier beat is never behind a later one", () => {
    for (const overall of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const ps = [0, 1, 2, 3].map((i) => walkSubjectProgress(overall, i, 4));
      for (let i = 1; i < ps.length; i++)
        expect(ps[i]!).toBeLessThanOrEqual(ps[i - 1]!);
    }
  });

  it("the first subject is already moving while the last has not begun", () => {
    const early = 0.15;
    expect(walkSubjectProgress(early, 0, 4)).toBeGreaterThan(0);
    expect(walkSubjectProgress(early, 3, 4)).toBe(0);
  });

  it("every subject is fully in by the end, and none before the start", () => {
    for (const i of [0, 1, 2, 3]) {
      expect(walkSubjectProgress(0, i, 4)).toBe(i === 0 ? 0 : 0);
      expect(walkSubjectProgress(1, i, 4)).toBe(1);
    }
  });

  it("a walk of one is the uniform ramp — no walk, no change", () => {
    for (const p of [0, 0.3, 0.7, 1]) expect(walkSubjectProgress(p, 0, 1)).toBe(p);
  });

  it("is monotonic in time for a given subject", () => {
    let prev = -1;
    for (let f = 0; f < REVEAL_FRAMES; f++) {
      const p = walkSubjectProgress(
        easedRevealProgress(f, REVEAL_FRAMES),
        2,
        5,
      );
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe("activeWalkIndex — what a caption names", () => {
  it("names the first beat at the start and the last at the end", () => {
    expect(activeWalkIndex(0, 4)).toBe(0);
    expect(activeWalkIndex(1, 4)).toBe(3);
  });

  it("walks forward through every beat, in order, skipping none", () => {
    const seen: number[] = [];
    for (let f = 0; f < REVEAL_FRAMES; f++) {
      const i = activeWalkIndex(easedRevealProgress(f, REVEAL_FRAMES), 4);
      if (seen[seen.length - 1] !== i) seen.push(i);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it("answers -1 when there is no walk, rather than a beat that does not exist", () => {
    expect(activeWalkIndex(0.5, 0)).toBe(-1);
  });
});

import { walkFillOpacity, MAX_FILL_OPACITY, revealFillOpacity } from "../src/reveal";

describe("walkFillOpacity — the expression the seven reveals paint", () => {
  it("with NO walk, returns exactly the scalar these components always painted", () => {
    for (const p of [0, 0.4, 1])
      expect(walkFillOpacity(p, 0)).toBe(revealFillOpacity(p));
  });

  it("with a walk, keys on the region's position in the journalist's order", () => {
    const expr = walkFillOpacity(0.5, 3) as unknown[];
    expect(expr[0]).toBe("case");
    expect(expr[1]).toEqual(["==", ["get", "__walkIdx"], 0]);
    expect(expr[3]).toEqual(["==", ["get", "__walkIdx"], 1]);
    expect(expr[5]).toEqual(["==", ["get", "__walkIdx"], 2]);
    // one condition+value pair per beat, plus the fallback arm
    expect(expr.length).toBe(1 + 3 * 2 + 1);
  });

  it("an earlier beat is never less opaque than a later one", () => {
    const expr = walkFillOpacity(0.45, 4) as number[];
    const opacities = [2, 4, 6, 8].map((i) => expr[i] as number);
    for (let i = 1; i < opacities.length; i++)
      expect(opacities[i]!).toBeLessThanOrEqual(opacities[i - 1]!);
  });

  it("the un-named regions land with the last beat, never ahead of it", () => {
    const expr = walkFillOpacity(0.6, 3) as number[];
    const lastBeat = expr[6] as number;
    const fallback = expr[7] as number;
    expect(fallback).toBe(lastBeat);
  });

  it("never exceeds the fill ceiling", () => {
    for (const p of [0, 0.5, 1]) {
      const expr = walkFillOpacity(p, 3) as number[];
      for (const i of [2, 4, 6, 7])
        expect(expr[i] as number).toBeLessThanOrEqual(MAX_FILL_OPACITY);
    }
  });
});
