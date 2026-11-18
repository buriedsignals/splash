import { describe, expect, it } from "bun:test";
import { PROFILE_SPEC, profileModel } from "../craft/_shared/gesture-family-profile.mjs";
import { stageKeyedFormat } from "../craft/_shared/gesture-keyed.mjs";
import { parallelEntities } from "./keyed-fixtures.ts";

// gx-parallel-coordinates web and video (12B, mvg70/mvg71, 2026-11-18): a highlight of Finland and Sweden carried
// "2 pays sur 16", and the note sat on the coal axis's floor where every line ends, on top of the end names. A note
// on whole profiles belongs by the first profile's farthest reading, as it already did for one profile.
const par = { ...profileModel(parallelEntities()), variant: "parallel-coordinates" };
const claim = { takeaway: "2 of 16 do both: more than 25 % nuclear and more than 20 % wind", subject: "Finland and Sweden" };
const box = { width: 1200, height: 600 };
const measure = (t: string) => String(t).length * 7;
const lead = () => 16;

const noteFor = (marks: string[]) => {
  const { scheduled } = stageKeyedFormat({ spec: PROFILE_SPEC, model: par, format: "static", claim, gestures: [{ do: "highlight", marks, note: "2 of 16" }] });
  const scene = PROFILE_SPEC.scene(par, { plan: scheduled.plan, box, measure, lead, variant: "parallel-coordinates" });
  return { scene, note: scene.notes[0] };
};

describe("a note on two highlighted parallel-coordinates profiles", () => {
  it("should sit by the first profile's farthest reading, not on the last axis's floor", () => {
    const { scene, note } = noteFor(["Finland", "Sweden"]);
    const fin = par.entities.find((e: any) => e.name === "Finland")!;
    const best = Object.entries(fin.values).reduce((b: any, x: any) => (x[1] > b[1] ? x : b))[0];
    const anchor = scene.marks.find((m: any) => m.name === `Finland · ${best}`).anchor;
    expect(Math.hypot(note.x - anchor.x, note.y - anchor.y)).toBeLessThan(200);
  });
});
