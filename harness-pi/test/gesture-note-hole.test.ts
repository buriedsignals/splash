import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { repairGestures, validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-stacked-bar static (Qwen3.5-9B, 2026-11-14): record_gestures took the notes as literal JSON, so beat.mjs's
// `+${fr(spain…)} TWh` arrived as "+TWh contre + pour la France" and "La France part de TWh". No figure, so the
// note-figure check had nothing to test, and the plate printed both holes.
const STACK = {
  rows: [
    { name: "Espagne", value: 118.91 },
    { name: "France", value: 50.1 },
    { name: "Allemagne", value: 86.02 },
  ],
  family: "length",
  format: "static",
  claim: { takeaway: "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000", subject: "Espagne" },
};

const LEVEL = { ...STACK, rows: [{ name: "Espagne", value: 96.7 }, { name: "France", value: 482.99 }, { name: "Allemagne", value: 204.99 }] };

describe("a note with a hole where its figure was", () => {
  it("should refuse a sign with no figure after it", () => {
    expect(() =>
      validateGestures({ ...STACK, gestures: [{ do: "compare", marks: ["Espagne", "France"], note: "+TWh contre + pour la France" }] }),
    ).toThrow(/gestures\[0\]\.note.*no figure.*\+119 TWh contre \+50 pour la France/);
  });

  it("should refuse a unit with no figure before it", () => {
    expect(() => validateGestures({ ...LEVEL, gestures: [{ do: "annotate", mark: "France", note: "La France part de TWh" }] })).toThrow(
      /La France part de 483 TWh/,
    );
  });

  it("should repair both holes to the marks' own figures", () => {
    const { gestures } = repairGestures({ ...STACK, gestures: [{ do: "compare", marks: ["Espagne", "France"], note: "+TWh contre + pour la France" }] });
    expect(gestures[0].note).toBe("+119 TWh contre +50 pour la France");
  });

  it("should pass a note whose unit is named, not counted", () => {
    expect(() => validateGestures({ ...LEVEL, gestures: [{ do: "annotate", mark: "France", note: "La France, en TWh, part de très haut" }] })).not.toThrow();
  });

  it("should pass a note with its figures", () => {
    expect(() =>
      validateGestures({ ...STACK, gestures: [{ do: "compare", marks: ["Espagne", "France"], note: "+119 TWh contre +50 pour la France" }] }),
    ).not.toThrow();
  });
});
