import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";
import { loadSubject } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { videoGeometry } from "./geometry.mjs";
import { assertDerivedValues, statesFor } from "./states.mjs";

/**
 * The choreography of BRIEF.md as numbers, and the derived values its table names — hand-copied from the
 * BRIEF here, not recomputed by the code under test.
 */

const subject = loadSubject({
  dir: join(import.meta.dirname, "..", "static-choropleth-europe-lowcarbon"),
});
const geometry = videoGeometry(subject);
const states = statesFor(subject, geometry);
const [establish, reference, reveal, subjectState, conclusion, hold] = states;

describe("statesFor", () => {
  it("should return one state per event, in EVENT_ORDER", () => {
    expect(states.length).toBe(EVENT_ORDER.length);
  });

  it("should hold the conclusion exactly — the hold plays no gesture", () => {
    expect(hold).toEqual(conclusion);
  });

  it("should bring the furniture up at establish, with no class, name or camera move yet", () => {
    expect(establish).toEqual({
      furniture: 1,
      classes: 0,
      filter: 0,
      floor: 0,
      count: 0,
      top: 0,
      zoom: 0,
      odd: 0,
      neighbours: 0,
      missing: 0,
    });
  });

  it("should reveal the classes at reference (card 2) and nothing else", () => {
    expect(reference).toEqual({ ...establish, classes: 1 });
  });

  it("should raise the floor through every borne, count and name the six at reveal (cards 3 and 4 together)", () => {
    expect(reveal).toEqual({ ...reference, filter: 1, floor: 1, count: 1, top: 1 });
  });

  it("should zoom, lift the filter, drop the six and name Albania and its neighbours at subject (card 5)", () => {
    expect(subjectState).toEqual({
      ...reveal,
      filter: 0,
      top: 0,
      zoom: 1,
      odd: 1,
      neighbours: 1,
    });
  });

  it("should pull back and name the six, Albania and Ukraine at conclusion (card 6), the counter kept", () => {
    expect(conclusion).toEqual({
      ...subjectState,
      zoom: 0,
      neighbours: 0,
      top: 1,
      missing: 1,
    });
    expect(conclusion.count).toBe(1);
  });

  it("should refuse a subject that changes nothing from reveal (the guard it runs through)", () => {
    const mutated = [...states];
    mutated[3] = { ...mutated[2] };
    expect(() => assertEventStates(mutated, [...EVENT_ORDER])).toThrow(
      /subject changes nothing/,
    );
  });
});

describe("the BRIEF's derived values", () => {
  const derived = assertDerivedValues(subject, geometry);

  it("should class the countries 8·6·6·8·5·7", () => {
    expect(derived.classCounts).toEqual([8, 6, 6, 8, 5, 7]);
  });

  it("should step 33 countries back", () => {
    expect(derived.steppedBack).toBe(33);
  });

  it("should find the highest measured neighbour at 59.5 %", () => {
    expect(Math.round(derived.highestNeighbour * 10) / 10).toBe(59.5);
  });

  it("should refuse a geometry in which one of the six is south-east of Albania", () => {
    const albania = geometry.shapes.find((s: any) => s.iso === "ALB").seat;
    const moved = {
      shapes: geometry.shapes.map((s: any) =>
        s.iso === "FRA"
          ? { ...s, seat: { x: albania.x + 10, y: albania.y + 10 } }
          : s,
      ),
    };
    expect(() => assertDerivedValues(subject, moved)).toThrow(/north or west/);
  });
});
