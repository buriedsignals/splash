import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";
import { loadSubject } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { statesFor } from "./states.mjs";

/**
 * Pins the choreography of `BRIEF.md` as numbers: every event's state passes `assertEventStates`
 * (each event changes the picture, the final hold restates the conclusion exactly — the one
 * exemption `skills/chart-video/scripts/choreography.mjs` names), and every derived value the BRIEF
 * asserts is hand-copied here from the BRIEF's own choreography table, not recomputed by the code
 * under test.
 */

const subject = loadSubject({
  dir: join(import.meta.dirname, "..", "static-choropleth-europe-lowcarbon"),
});

describe("statesFor", () => {
  const states = statesFor(subject);

  it("should return one state per event, in EVENT_ORDER", () => {
    expect(states.length).toBe(EVENT_ORDER.length);
  });

  it("should give every field a finite number, on every event", () => {
    for (const state of states)
      for (const value of Object.values(state))
        expect(Number.isFinite(value)).toBe(true);
  });

  it("should change the picture at every event but the final hold", () => {
    // statesFor already runs its result through assertEventStates; calling it again here pins the
    // behaviour against a change to statesFor's own event order, not just to the guard.
    expect(() => statesFor(subject)).not.toThrow();
  });

  it("should hold the conclusion frame exactly — hold plays no gesture of its own", () => {
    const [, , , , conclusion, hold] = states;
    expect(hold).toEqual(conclusion);
  });

  it("should mark the reference event, and only from there on, with the 94 % accent", () => {
    const [establish, reference, reveal] = states;
    expect(establish.referenceMark).toBe(0);
    expect(reference.referenceMark).toBe(1);
    expect(reveal.referenceMark).toBe(1);
  });

  it("should fill all six classes by the end of reveal, hand-derived: 8+6+6+8+5+7 = 40", () => {
    const [, , reveal] = states;
    expect(reveal.classesRevealed).toBe(6);
  });

  it("should name six countries at reveal and the seventh — Albania — once subject settles", () => {
    const [, , reveal, subjectState] = states;
    expect(reveal.namesShown).toBe(6);
    expect(subjectState.namesShown).toBe(7);
  });

  it("should ring Albania and print its neighbours' values only during subject", () => {
    const [establish, , , subjectState, conclusion] = states;
    expect(establish.ring).toBe(0);
    expect(subjectState.ring).toBe(1);
    expect(subjectState.neighbourValues).toBe(1);
    // the neighbour values leave with the zoom (BRIEF.md), the ring does not
    expect(conclusion.neighbourValues).toBe(0);
    expect(conclusion.ring).toBe(1);
  });

  it("should step the 33 below-floor countries back only at conclusion and hold", () => {
    const [establish, reference, reveal, subjectState, conclusion, hold] =
      states;
    expect(
      [establish, reference, reveal, subjectState].map(
        (s) => s.filterBelowFloor,
      ),
    ).toEqual([0, 0, 0, 0]);
    expect(conclusion.filterBelowFloor).toBe(1);
    expect(hold.filterBelowFloor).toBe(1);
  });

  it("should close the camera on the Balkans only at subject, and return to the establish camera at conclusion", () => {
    const [establish, reference, reveal, subjectState, conclusion] = states;
    expect([reference.zoom, reveal.zoom]).toEqual([
      establish.zoom,
      establish.zoom,
    ]);
    expect(subjectState.zoom).toBeGreaterThan(establish.zoom);
    expect(conclusion.zoom).toBe(establish.zoom);
    expect(conclusion.centerLon).toBe(establish.centerLon);
    expect(conclusion.centerLat).toBe(establish.centerLat);
  });

  it("should print the conclusion sentence only from conclusion on", () => {
    const [establish, reference, reveal, subjectState, conclusion, hold] =
      states;
    expect(
      [establish, reference, reveal, subjectState].map((s) => s.conclusion),
    ).toEqual([0, 0, 0, 0]);
    expect(conclusion.conclusion).toBe(1);
    expect(hold.conclusion).toBe(1);
  });
});

describe("the BRIEF's derived values, hand-copied from BRIEF.md's choreography table", () => {
  const { value, above, neighbours, unreported, ODD_ONE, format } = subject;

  it("should report 40 countries and leave 1 unreported (Ukraine)", () => {
    expect(value.size).toBe(40);
    expect(unreported.length).toBe(1);
  });

  it("should class the six reveal steps 8·6·6·8·5·7, summing to 40", () => {
    const BREAKS = subject.BREAKS;
    const counts = new Array(BREAKS.length + 1).fill(0);
    for (const v of value.values()) {
      let i = 0;
      while (i < BREAKS.length && v.lowCarbon >= BREAKS[i]) i++;
      counts[i]++;
    }
    expect(counts).toEqual([8, 6, 6, 8, 5, 7]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(40);
  });

  it("should hold exactly 7 countries above the 94 % floor", () => {
    expect(above.length).toBe(7);
  });

  it("should name 6 of the 7 above the floor at reveal, Albania held back for subject", () => {
    expect(above.filter((r) => r.iso !== ODD_ONE).length).toBe(6);
  });

  it("should place Albania in `above`, at 100 %", () => {
    expect(above.some((r) => r.iso === ODD_ONE)).toBe(true);
    expect(format(value.get(ODD_ONE).lowCarbon)).toBe("100 %");
  });

  it("should measure 3 neighbours for Albania, the highest under 60 % (Montenegro 59.5 %)", () => {
    expect(neighbours.length).toBe(3);
    const max = Math.max(...neighbours.map((iso) => value.get(iso).lowCarbon));
    expect(max).toBeLessThan(60);
    expect(Math.round(max * 10) / 10).toBe(59.5);
  });

  it("should step 33 countries back at conclusion (40 reported minus 7 above the floor)", () => {
    expect(value.size - above.length).toBe(33);
  });
});

describe("mutation: assertEventStates refuses two consecutive equal states", () => {
  it("should refuse a subject event that changes nothing from reveal", () => {
    const states = statesFor(subject);
    const mutated = [...states];
    mutated[3] = { ...mutated[2] }; // subject == reveal
    expect(() => assertEventStates(mutated, EVENT_ORDER)).toThrow(
      /subject changes nothing/,
    );
  });
});
