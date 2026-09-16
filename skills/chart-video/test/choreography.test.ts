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

describe("assertEventStates on a final hold", () => {
  const holdEvents = ["reference", "reveal", "hold"];

  it("should let a final hold's state equal the conclusion's — a hold plays no gesture by definition", () => {
    const states = [{ fill: 0 }, { fill: 1 }, { fill: 1 }];
    expect(assertEventStates(states, holdEvents)).toBe(states);
  });

  it("should refuse a final hold whose state differs from the one before it, naming the hold", () => {
    const states = [{ fill: 0 }, { fill: 1 }, { fill: 2 }];
    expect(() => assertEventStates(states, holdEvents)).toThrow(
      /hold changes the picture/,
    );
  });

  it("should still refuse a non-final event equal to its predecessor, even one named hold", () => {
    const states = [{ fill: 0 }, { fill: 0 }, { fill: 1 }];
    expect(() =>
      assertEventStates(states, ["establish", "hold", "reveal"]),
    ).toThrow(/hold changes nothing/);
  });
});
