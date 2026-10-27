import { describe, expect, it } from "bun:test";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { FLOW_SPEC, flowModel } from "../craft/_shared/gesture-family-flow.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { sankeyFlows } from "./keyed-fixtures.ts";

const model = flowModel({ flows: sankeyFlows() });
const claim = { takeaway: "The Nuclear power of these six countries is 84 % French", subject: "Nuclear generated in France", comparison: "the other countries' Nuclear" };
const stage = (format: string, gestures: any[], repair = false) => stageKeyedFormat({ spec: FLOW_SPEC, model, format, gestures, claim, repair });
const nuclear = model.links.filter((l: any) => l.from === "Nuclear").reduce((s: number, l: any) => s + l.value, 0);

describe("flow family (sankey)", () => {
  it("should leave out zero flows rather than refuse them", () => {
    expect(model.dropped > 0 && model.links.every((l: any) => l.value > 0)).toBe(true);
  });
  it("should accept the French ribbon's share of Nuclear as a percentage", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Nuclear – France", note: "84 % of the Nuclear" }])).not.toThrow();
  });
  it("should refuse a share the ribbons do not give", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Nuclear – France", note: "61 % of the Nuclear" }])).toThrow(GestureRefusal);
  });
  it("should bracket a source's ribbons with their sum", () => {
    const { scheduled } = stage("static", [{ do: "bracket", mark: "Nuclear", note: `${nuclear.toFixed(1)} TWh` }]);
    expect(scheduled.plan[0].sum).toBeCloseTo(nuclear, 6);
  });
  it("should bracket a target's ribbons on a still plate though they do not sit together", () => {
    expect(() => stage("static", [{ do: "highlight", mark: "Nuclear – France" }, { do: "bracket", mark: "France" }])).not.toThrow();
  });
  it("should turn a bracket into a reader control on the web", () => {
    const { scheduled } = stage("web", [{ do: "highlight", mark: "Nuclear – France" }, { do: "bracket", mark: "Nuclear" }]);
    expect(scheduled.controls.map((c: any) => c.do)).toEqual(["bracket"]);
  });
});
