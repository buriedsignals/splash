/**
 * A GESTURE NOBODY CAN SEE IS A STILL WITH A CLOCK ATTACHED.
 *
 * `assertEventStates` refuses an event whose declared STATE equals the one before it. What it
 * cannot see is whether that state change produces pixels a viewer can find. Measured 2026-09-23 on
 * a real story, twice, and the owner found both before any check did:
 *
 *   · a `reveal` that split one bar into twenty-seven and dimmed twenty-six of them. Every declared
 *     state differed; twenty-five of the twenty-seven values are under two percent, so the frames
 *     did not. "rien n'a bougé."
 *   · a `subject` that gathered twenty-six hairlines onto one line while the scale opened under
 *     them. Same again — and worse, because a viewer cannot tell whether a bar moved because it was
 *     gathered or because the ruler under it changed.
 *
 * So the states are checked in Bun and the FRAMES are checked on the delivered mp4, because only
 * the delivered file knows what a viewer sees.
 *
 * `hold` is exempt BY NAME: the motion grammar's own rule is that it plays no gesture, and a hold
 * whose frames differ is a hold smuggling one in — which `assertEventStates` already refuses from
 * the other side.
 */
import { describe, expect, it } from "bun:test";
import { assertEventsMove } from "#shared/chart-video/moves.mjs";

const TIMING = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 75 },
  reveal: { start: 120, duration: 300 },
  subject: { start: 420, duration: 90 },
  conclusion: { start: 510, duration: 45 },
  hold: { start: 555, duration: 45 },
};

/** A render in which every frame differs from the last. */
const alive = (_movie: string, frame: number) => `f${frame}`;
/** A render frozen across one named event's own frames. */
const frozenDuring = (from: number, to: number) => (_movie: string, frame: number) =>
  frame >= from && frame < to ? "frozen" : `f${frame}`;

describe("a video that does not move", () => {
  it("refuses a reveal whose picture never changes", () => {
    expect(() =>
      assertEventsMove("(fixture)", TIMING, { what: "the first cut", sampler: frozenDuring(120, 420) }),
    ).toThrow(/does not move during reveal/);
  });

  it("names the frames it compared, so an author can look at exactly those", () => {
    expect(() =>
      assertEventsMove("(fixture)", TIMING, { what: "the first cut", sampler: frozenDuring(120, 420) }),
    ).toThrow(/frames 121–419/);
  });

  it("says the declared states are not the question — the pixels are", () => {
    expect(() =>
      assertEventsMove("(fixture)", TIMING, { what: "the first cut", sampler: frozenDuring(120, 420) }),
    ).toThrow(/assertEventStates` checked that/);
  });

  it("refuses a frozen subject just as loudly", () => {
    expect(() =>
      assertEventsMove("(fixture)", TIMING, { what: "the second cut", sampler: frozenDuring(420, 510) }),
    ).toThrow(/does not move during subject/);
  });

  it("names every frozen event at once rather than the first one only", () => {
    const twoFrozen = (_m: string, frame: number) =>
      (frame >= 120 && frame < 420) || (frame >= 420 && frame < 510) ? "frozen" : `f${frame}`;
    expect(() => assertEventsMove("(fixture)", TIMING, { sampler: twoFrozen })).toThrow(/reveal.*subject/s);
  });

  it("accepts a beat whose every event moves", () => {
    expect(() => assertEventsMove("(fixture)", TIMING, { sampler: alive })).not.toThrow();
  });

  it("exempts the hold by name, because its own rule is that it plays no gesture", () => {
    expect(() =>
      assertEventsMove("(fixture)", TIMING, { sampler: frozenDuring(555, 600) }),
    ).not.toThrow();
  });
});
