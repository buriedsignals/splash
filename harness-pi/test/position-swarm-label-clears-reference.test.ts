// A beeswarm's named country sat with its label centred on its leader; a country just past a reference (Saudi Arabia
// at 20.4 t against a rule at 20 t) had its name printed across the dashed rule. A label turns away from a rule it
// would straddle.
import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { createPosition, modelOf, sceneOf } = familyModule as any;

const text = { lead: () => 14, measure: (t: string) => String(t).length * 7, format: (v: number) => String(v), moments: [] };
const frame = { x: 0, y: 0, width: 960, height: 500 };
const rows = [
  { name: "Saudi Arabia", value: 20.4, size: 3e7 },
  { name: "Qatar", value: 40.1, size: 3e6 },
  ...Array.from({ length: 30 }, (_, i) => ({ name: `R${i}`, value: 1 + i * 0.4, size: 2e7 })),
];

function scene(reference: number, accent: string[]) {
  const model = modelOf("beeswarm", { rows, format: (v: number) => String(v), unit: "t" });
  const state = { ...createPosition({ model }).rest(), accent, references: [{ index: 0, value: reference }] };
  return sceneOf({ model, state, frame, text });
}

const spanOf = (p: any) => {
  const w = String(p.text).length * 7;
  const x0 = p.anchor === "middle" ? p.x - w / 2 : p.anchor === "end" ? p.x - w : p.x;
  return [x0, x0 + w];
};

describe("a beeswarm label near a reference rule", () => {
  it("should not print a name across the rule", () => {
    const s = scene(20, ["Saudi Arabia"]);
    const rule = s.prims.find((p: any) => p.id === "rule-0");
    const [x0, x1] = spanOf(s.prims.find((p: any) => p.id === "name-Saudi Arabia"));
    expect(rule.x1 > x0 - 2 && rule.x1 < x1 + 2).toBe(false);
  });

  it("should keep a centred label when no rule is near it", () => {
    const s = scene(20, ["R25"]);
    expect(s.prims.find((p: any) => p.id === "name-R25").anchor).toBe("middle");
  });
});
