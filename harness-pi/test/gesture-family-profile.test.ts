import { describe, expect, it } from "bun:test";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { PROFILE_SPEC, profileModel } from "../craft/_shared/gesture-family-profile.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { parallelEntities, radarEntities } from "./keyed-fixtures.ts";

const AXES = ["Wind", "Solar", "Hydropower", "Bioenergy", "Other renewables", "Nuclear", "Gas", "Coal", "Oil"];
const radar = { ...profileModel({ axes: AXES, entities: radarEntities() }), variant: "radar-spider" };
const radarClaim = { takeaway: "France and Germany make nearly the same electricity from opposite mixes", entity: "France", versus: "Germany" };
const par = { ...profileModel(parallelEntities()), variant: "parallel-coordinates" };
const parClaim = { takeaway: "2 of 16 do both: more than 25 % nuclear and more than 20 % wind", subject: "Finland and Sweden" };
const stage = (model: any, claim: any, format: string, gestures: any[]) => stageKeyedFormat({ spec: PROFILE_SPEC, model, format, gestures, claim });
const fr = (radar.entities[0].values as any).Nuclear;

describe("profile family (radar, parallel coordinates)", () => {
  it("should accept France's nuclear share in a highlight note", () => {
    expect(() => stage(radar, radarClaim, "static", [{ do: "highlight", mark: "France", note: `${fr.toFixed(1)} % nuclear` }])).not.toThrow();
  });
  it("should refuse a nuclear share the data does not give", () => {
    expect(() => stage(radar, radarClaim, "static", [{ do: "highlight", mark: "France", note: `${(fr + 5).toFixed(1)} % nuclear` }])).toThrow(GestureRefusal);
  });
  it("should ring Germany as one outline, never a second accent", () => {
    const { scheduled } = stage(radar, radarClaim, "static", [{ do: "highlight", mark: "France" }, { do: "highlight", mark: "Germany" }]);
    const lit = scheduled.names.filter((_: string, i: number) => scheduled.state[`a${i}`] === 1);
    expect(lit.every((n: string) => n.startsWith("France"))).toBe(true);
  });
  it("should compare two radar readings on different spokes (one radial scale)", () => {
    expect(() => stage(radar, radarClaim, "static", [{ do: "compare", marks: ["Germany · Wind", "France · Nuclear"] }])).not.toThrow();
  });
  it("should refuse a parallel-coordinates compare across two axes", () => {
    expect(() => stage(par, parClaim, "static", [{ do: "compare", marks: ["Sweden · wind", "France · nuclear"] }])).toThrow(/not drawn on one scale/);
  });
  it("should accept a parallel-coordinates compare on one axis", () => {
    expect(() => stage(par, parClaim, "static", [{ do: "compare", marks: ["Sweden · wind", "France · wind"] }])).not.toThrow();
  });
  it("should refuse a reorder: the axis order is fixed", () => {
    expect(() => stage(radar, radarClaim, "static", [{ do: "reorder", value: "descending" }])).toThrow(/not available/);
  });
});
