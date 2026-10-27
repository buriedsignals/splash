import { describe, expect, it } from "bun:test";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { MULTIPLES_SPEC, multiplesPanels } from "../craft/_shared/gesture-family-multiples.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { multiplesPanelsData } from "./keyed-fixtures.ts";

const model = { ...multiplesPanels({ panels: multiplesPanelsData() }), ceiling: 100 };
const claim = { takeaway: "All sixteen rose, and the lowest starters rose most", subject: "Denmark, which gained most", comparison: "Sweden, which gained least" };
const stage = (format: string, gestures: any[], repair = false) => stageKeyedFormat({ spec: MULTIPLES_SPEC, model, format, gestures, claim, repair });
const dk = model.panels.find((p: any) => p.name === "Denmark")!.bars;
const gain = (() => { const d = model.panels.find((p: any) => p.name === "Denmark")!.bars; return Math.round(d[1].value - d[0].value); })();

describe("multiples family (small multiples over Length bars)", () => {
  it("should name its marks panel · bar", () => {
    expect(MULTIPLES_SPEC.marks(model)[0].name).toBe(`${model.panels[0].name} · 2000`);
  });
  it("should accept the panel's own gain in a highlight note", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Denmark", note: `+${gain} points` }])).not.toThrow();
  });
  it("should light the whole panel when one of its bars is the subject", () => {
    const { scheduled } = stage("static", [{ do: "name", mark: "Denmark · 2024" }]);
    const lit = scheduled.names.filter((_: string, i: number) => scheduled.state[`a${i}`] === 1);
    expect(lit).toEqual(["Denmark · 2000", "Denmark · 2024"]);
  });
  it("should refuse a gain the data does not give", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Denmark", note: `+${gain + 9} points` }])).toThrow(GestureRefusal);
  });
  it("should refuse a rule off the panels' one scale", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Denmark" }, { do: "reference", value: 400 }])).toThrow(/off the panels' one scale/);
  });
  it("should outline a second panel highlighted beside the subject instead of accenting it", () => {
    const { scheduled } = stage("static", [{ do: "highlight", mark: "Denmark" }, { do: "highlight", mark: "Sweden" }]);
    expect(scheduled.plan[1].ringed?.length).toBe(1);
  });
  it("should give each scrolly card a picture of its own", () => {
    const { scheduled } = stage("scrolly", [
      { do: "highlight", mark: "Denmark", card: `Denmark reached ${Math.round(dk[1].value)} %.` },
      { do: "filter", marks: ["Denmark", "Sweden"], card: `Denmark and Sweden: Denmark at ${Math.round(dk[1].value)} %.` },
    ]);
    expect(scheduled.states.length).toBe(3);
  });
});
