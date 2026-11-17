// gx-dot-strip web, Qwen3.5-9B (2026-11-17): compare Pologne (+30) with Suède (+2) laid Suède's 2-point change from
// Pologne's first reading — 6 px on a phone, under nothing a reader could see, so the control changed no pixel and the
// page was refused twice. The compared row is drawn and named like the subject, at every width.
import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { createPosition, modelOf, sceneOf } = familyModule as any;

const text = { lead: () => 14, measure: (t: string) => String(t).length * 7, format: (v: number) => String(v), moments: ["2000", "2024"], delta: (v: number) => `+${v}` };
const frame = { x: 0, y: 0, width: 330, height: 120 };
const rows = [
  { name: "Pologne", code: "POL", from: 1.6, to: 31.1 },
  { name: "Suède", code: "SWE", from: 96.7, to: 98.7 },
  { name: "France", code: "FRA", from: 92, to: 95 },
];

function scene(compares: any[]) {
  const model = modelOf("dot-strip", { rows, format: (v: number) => String(v), unit: "%" });
  const position = createPosition({ model });
  const state = position.with(position.with(position.rest(), { accent: ["Pologne"] }), { compares });
  return sceneOf({ model, state, frame, text });
}

describe("a compare on a paired dot strip", () => {
  it("should name the row the subject is compared with", () => {
    const names = scene([{ index: 2, subject: "Pologne", other: "Suède" }]).prims.filter((p: any) => p.id === "name-Suède" && p.o > 0);
    expect(names.length).toBe(1);
  });
  it("should leave a row nobody compares unnamed", () => {
    expect(scene([{ index: 2, subject: "Pologne", other: "Suède" }]).prims.some((p: any) => p.id === "name-France")).toBe(false);
  });
});

// mvq33 (2026-11-17): Qwen took the strip's own "+29,5" for a contradiction of its note's "+30 points" and spent
// eight renders, then deleted its highlight and annotate, trying to remove it. The render says what the kit prints.
describe("what a paired dot strip prints on its own", () => {
  const { kitPrintsOf } = familyModule as any;
  const model = modelOf("dot-strip", { rows, format: (v: number) => String(v), unit: "%" });
  const position = createPosition({ model });
  const state = position.with(position.rest(), { accent: ["Pologne"] });
  const line = () => kitPrintsOf({ variant: "dot-strip", model, state, delta: (v: number) => `+${v.toFixed(1)}` });
  it("should name the marked row's change as the kit prints it", () => {
    expect(line()).toContain("POL +29.5");
  });
  it("should say a note need not repeat or match it", () => {
    expect(line()).toContain("rounded");
  });
});

// mvq36 (dot-strip video, Qwen): the same "+29,5 vs 30" polishing came back in video, where the line was not printed.
// A video's or a scrolly's marked rows are spread over several states: the line reads them all.
describe("what a paired dot strip prints across several states", () => {
  const { kitPrintsOf } = familyModule as any;
  const model = modelOf("dot-strip", { rows, format: (v: number) => String(v), unit: "%" });
  const position = createPosition({ model });
  const states = [position.rest(), position.with(position.rest(), { accent: ["Pologne"] })];
  it("should name a row marked in any one of the states", () => {
    expect(kitPrintsOf({ variant: "dot-strip", model, states, delta: (v: number) => `+${v.toFixed(1)}` })).toContain("POL +29.5");
  });
});
