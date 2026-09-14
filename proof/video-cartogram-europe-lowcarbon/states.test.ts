import { describe, expect, it } from "bun:test";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";
import { statesFor } from "./states.mjs";

/** The choreography of BRIEF.md as numbers, hand-copied from its table. */

const states = statesFor();
const [establish, reference, reveal, subject, conclusion, hold] = states;

describe("statesFor", () => {
  it("should return one state per event, in EVENT_ORDER", () => {
    expect(states.length).toBe(EVENT_ORDER.length);
  });

  it("should open on the title card alone", () => {
    expect(establish).toEqual({ title: 1, furniture: 0, classes: 0, focus: 0, widest: 0, area: 0, morph: 0, codes: 0, source: 0 });
  });

  it("should give the title way to the map, bring the key up and reveal the classes at reference", () => {
    expect(reference).toEqual({ ...establish, title: 0, furniture: 1, classes: 1 });
  });

  it("should step every country back but the widest, name it and set the balance's pivot at the area mean at reveal", () => {
    expect(reveal).toEqual({ ...reference, focus: 1, widest: 1, area: 1 });
  });

  it("should bring the others back, morph into tiles — the weights and the pivot with them — and set their codes at subject", () => {
    expect(subject).toEqual({ ...reveal, focus: 0, widest: 0, morph: 1, codes: 1 });
  });

  it("should set the credit at conclusion, and hold it exactly", () => {
    expect(conclusion).toEqual({ ...subject, source: 1 });
    expect(hold).toEqual(conclusion);
  });

  it("should refuse a subject that changes nothing from reveal (the guard it runs through)", () => {
    const mutated = [...states];
    mutated[3] = { ...mutated[2] };
    expect(() => assertEventStates(mutated, [...EVENT_ORDER])).toThrow(/subject changes nothing/);
  });
});
