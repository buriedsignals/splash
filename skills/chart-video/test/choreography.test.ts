import { describe, expect, it } from "bun:test";
import { assertEventStates } from "../scripts/choreography.mjs";

describe("assertEventStates", () => {
  const events = ["establish", "reference", "reveal"];

  it("should return states in which every event changes the picture", () => {
    const states = [
      { fill: 0, zoom: 1 },
      { fill: 0.5, zoom: 1 },
      { fill: 1, zoom: 2 },
    ];
    expect(assertEventStates(states, events)).toBe(states);
  });

  it("should refuse an event whose state equals the one before it", () => {
    const states = [{ fill: 0 }, { fill: 1 }, { fill: 1 }];
    expect(() => assertEventStates(states, events)).toThrow(
      /reveal changes nothing/,
    );
  });

  it("should refuse a state with a non-finite field", () => {
    const states = [{ fill: 0 }, { fill: Number.NaN }, { fill: 1 }];
    expect(() => assertEventStates(states, events)).toThrow(/reference\.fill/);
  });

  it("should refuse a state list that does not match the events", () => {
    expect(() => assertEventStates([{ fill: 0 }], events)).toThrow(/3 events/);
  });
});
