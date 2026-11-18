// gx-slope-slopegraph web, video and scrolly (12B, mvg79–mvg81, 2026-11-18): compare Finlande with France laid
// France's change from Finlande's 2000 end as a dashed line with no word on it — in all three formats a reader saw
// a stray line ending between Espagne and Royaume-Uni. The copy says whose change it carries.
import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { createPosition, modelOf, sceneOf } = familyModule as any;

const text = { lead: () => 14, measure: (t: string) => String(t).length * 7, format: (v: number) => String(v), moments: ["2000", "2024"], delta: (v: number) => `+${v.toFixed(1)}` };
const frame = { x: 0, y: 0, width: 900, height: 420 };
const rows = [
  { name: "Finlande", from: 65.5, to: 95.3 },
  { name: "France", from: 90.7, to: 94.9 },
  { name: "Espagne", from: 36, to: 76.7 },
];

function prims(compares: any[]) {
  const model = modelOf("slope-slopegraph", { rows, format: (v: number) => String(v), unit: "%" });
  const position = createPosition({ model });
  const state = position.with(position.with(position.rest(), { accent: ["Finlande"] }), { compares });
  return sceneOf({ model, state, frame, text }).prims;
}

describe("the copy a slopegraph compare lays", () => {
  it("should name the row whose change it carries", () => {
    const label = prims([{ index: 1, subject: "Finlande", other: "France" }]).find((p: any) => p.kind === "text" && p.id === "copylabel-1");
    expect(label?.text).toContain("France");
  });
  it("should print no copy label without a compare", () => {
    expect(prims([]).some((p: any) => String(p.id).startsWith("copylabel-"))).toBe(false);
  });
});
