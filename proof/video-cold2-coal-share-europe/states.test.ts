import { describe, expect, it } from "bun:test";
import { statesFor } from "./states.mjs";

const states = statesFor();

describe("statesFor", () => {
  it("should close all six events, the hold equal to the conclusion", () => {
    expect([states.length, JSON.stringify(states[5]) === JSON.stringify(states[4])]).toEqual([6, true]);
  });

  it("should open on the title card alone and end with the credit", () => {
    expect([states[0].title, states[1].title, states[5].source]).toEqual([1, 0, 1]);
  });

  it("should match BRIEF.md's choreography table event by event", () => {
    const pick = (st: any) => [st.furniture, st.arrive, st.year, st.zoom, st.rewind, st.names, st.replay, st.ring, st.source];
    expect(states.map(pick)).toEqual([
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0, 0],
      [1, 1, 1, 0, 1, 0, 1, 1, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1],
    ]);
  });
});
