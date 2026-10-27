import { describe, expect, it } from "bun:test";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { INTERVAL_SPEC, intervalRows } from "../craft/_shared/gesture-family-interval.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { ganttModel } from "./keyed-fixtures.ts";

const raw = ganttModel();
const model = { ...raw, rows: intervalRows(raw) };
const SIX = model.rows.filter((r: any) => r.years === 35).map((r: any) => r.name);
const claim = { takeaway: "Six countries never left the top 10 emitters since 1990", subject: `The six present every year: ${SIX.join(", ")}`, comparison: "Kuwait, present one year" };
const stage = (format: string, gestures: any[], repair = false) => stageKeyedFormat({ spec: INTERVAL_SPEC, model, format, gestures, claim, repair });

describe("interval family (gantt)", () => {
  it("should find the six rows held every year in the proof data", () => {
    expect(SIX.length).toBe(6);
  });
  it("should light all six and lay Kuwait's one year against the subject on a still plate", () => {
    const { scheduled } = stage("static", [{ do: "highlight", marks: SIX, note: "6 countries all 35 years" }, { do: "compare", marks: [SIX[0], "Kuwait"], note: "35 years against 1" }]);
    const lit = scheduled.names.filter((_: string, i: number) => scheduled.state[`a${i}`] === 1);
    expect(lit.sort()).toEqual([...SIX].sort());
  });
  it("should give every scrolly card a state of its own", () => {
    const { scheduled } = stage("scrolly", [
      { do: "highlight", marks: SIX, card: "6 countries stayed all 35 years." },
      { do: "filter", marks: SIX, card: "The others came and went; the 6 stayed 35 years." },
    ]);
    expect(JSON.stringify(scheduled.states[0])).not.toBe(JSON.stringify(scheduled.states[1]));
  });
  it("should refuse a note stating a tenure the rows do not give", () => {
    expect(() => stage("static", [{ do: "compare", marks: [SIX[0], "Kuwait"], note: "35 years against 4" }])).toThrow(GestureRefusal);
  });
  it("should refuse a reference year off the axis and offer one on it", () => {
    let fix: any;
    try { stage("static", [{ do: "highlight", marks: SIX }, { do: "reference", value: 1980 }]); } catch (e: any) { fix = e.fix; }
    expect(fix.set.value).toBe(1990);
  });
  it("should not offer a bracket: tenures do not add up to a whole", () => {
    expect(() => stage("static", [{ do: "bracket", marks: SIX }])).toThrow(/not available/);
  });
  it("should repair a web list that only rests by adding a filter control", () => {
    const { repairs, scheduled } = stage("web", [{ do: "highlight", marks: SIX }], true);
    expect(repairs.length > 0 && scheduled.controls[0].do === "filter").toBe(true);
  });
  it("should take exactly three gestures in a video and end on the whole chart", () => {
    const { scheduled } = stage("video", [{ do: "reveal" }, { do: "filter", marks: SIX }, { do: "pull-back" }]);
    expect(scheduled.states[4].b10).toBe(0);
  });
});

describe("interval rows never refuse their shape", () => {
  it("should keep a row with no run inside the axis as an empty row of 0 years", () => {
    const rows = intervalRows({ first: 1990, last: 2024, rows: [{ name: "A", runs: [{ from: 1995, to: 2000 }] }, { name: "B", runs: [{ from: 1970, to: 1980 }] }] });
    expect(rows.find((r) => r.name === "B")).toEqual({ name: "B", runs: [], years: 0 });
  });
});
