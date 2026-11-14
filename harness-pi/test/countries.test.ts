import { describe, expect, it } from "bun:test";
import { join } from "node:path";
// @ts-expect-error untyped kit module
import { iso3Of } from "../craft/_shared/countries.mjs";

const kit = join(
  import.meta.dirname,
  "..",
  "craft",
  "web",
  "proportional-symbol-symbol-bubble-map",
);

// gx-proportional-symbol web (Qwen3.5-9B, q5, 2026-11-13): beat.mjs called iso3Of(country, HERE) once per row inside a
// try/catch; names.map threw on the string, every row was skipped, and the render refused an empty symbols list
// through two passes.
describe("iso3Of", () => {
  it("should return the code when given one name", () => {
    expect(iso3Of("France", kit)).toBe("FRA");
  });

  it("should still return the codes in order when given a list", () => {
    expect([...iso3Of(["France", "Germany"], kit)]).toEqual(["FRA", "DEU"]);
  });

  // q7: the beat wrote its names in French and every "Royaume-Uni" was refused (closest: romania), three passes over.
  it("should resolve a country written in French", () => {
    expect([...iso3Of(["Royaume-Uni", "Allemagne", "Espagne"], kit)]).toEqual([
      "GBR",
      "DEU",
      "ESP",
    ]);
  });

  // f12 web (12B, 2026-11-13): WRI's "Syrian Arab Republic" was refused (closest: slovak republic), and the beat left
  // out five countries to get past it — 41 of 46 in the table.
  it("should resolve a country written under its UN official name", () => {
    expect([
      ...iso3Of(["Syrian Arab Republic", "Iran (Islamic Republic of)"], kit),
    ]).toEqual(["SYR", "IRN"]);
  });
});
