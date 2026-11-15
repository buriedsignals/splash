import { describe, expect, it } from "bun:test";
import { GestureRefusal, validateGestures } from "../craft/_shared/gesture-core.mjs";

// The beeswarm the thinking run drew (gx-beeswarm, Qwen3.5-9B, 2026-11-15): the reference line at 20 t and a set
// typed by hand, five of whose six countries sit under that line. Values are t of CO2 per person.
const ROWS = [
  { name: "Qatar", value: 37.6 },
  { name: "Koweït", value: 25.6 },
  { name: "Émirats arabes unis", value: 25.0 },
  { name: "Bahreïn", value: 24.7 },
  { name: "Brunei", value: 23.2 },
  { name: "Trinité-et-Tobago", value: 21.4 },
  { name: "Arabie saoudite", value: 18.2 },
  { name: "Canada", value: 14.3 },
  { name: "États-Unis", value: 14.9 },
  { name: "Russie", value: 11.4 },
  { name: "Chine continentale", value: 8.0 },
  { name: "Inde", value: 1.9 },
];
const ABOVE = ["Qatar", "Koweït", "Émirats arabes unis", "Bahreïn", "Brunei", "Trinité-et-Tobago"];
const TYPED = ["Chine continentale", "Inde", "États-Unis", "Russie", "Arabie saoudite", "Qatar"];
const claim = { takeaway: "Les 6 pays au-dessus de 20 t de CO₂ par personne, dont 2 à plus de 25 t, pèsent 0,6 % de l'humanité" };
const run = (marks: string[], note = `${marks.length} pays`) =>
  validateGestures({
    gestures: [
      { do: "reference", value: 20, note: "20 t" },
      { do: "highlight", marks, note },
    ],
    rows: ROWS,
    family: "length",
    format: "static",
    claim,
    // The position family lets a set state its own count (positionHooks); the core alone does not.
    hooks: { figures: (_g: unknown, ctx: { marks: string[] }) => (ctx.marks.length > 1 ? [ctx.marks.length] : []) },
  });
const refusal = (fn: () => unknown): GestureRefusal => {
  try {
    fn();
  } catch (e) {
    return e as GestureRefusal;
  }
  throw new Error("expected a refusal");
};

describe("a set beside a reference line", () => {
  it("should refuse a set sized like the rows above the line that is not those rows", () => {
    expect(refusal(() => run(TYPED)).message).toMatch(/above 20/);
  });
  it("should offer the rows above the line as the value that works", () => {
    expect(JSON.stringify(refusal(() => run(TYPED)).fix)).toContain(JSON.stringify(ABOVE));
  });
  it("should accept the rows above the line", () => {
    expect(() => run(ABOVE)).not.toThrow();
  });
  it("should accept a set whose size matches neither side of the line", () => {
    expect(() => run(["Qatar", "Koweït"])).not.toThrow();
  });
});
