import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import {
  repairGestures,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";

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
  claim: {
    takeaway:
      "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000",
    subject: "Espagne",
  },
};

const LEVEL = {
  ...STACK,
  rows: [
    { name: "Espagne", value: 96.7 },
    { name: "France", value: 482.99 },
    { name: "Allemagne", value: 204.99 },
  ],
};

describe("a note with a hole where its figure was", () => {
  it("should refuse a sign with no figure after it", () => {
    expect(() =>
      validateGestures({
        ...STACK,
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: "+TWh contre + pour la France",
          },
        ],
      }),
    ).toThrow(
      /gestures\[0\]\.note.*no figure.*\+119 TWh contre \+50 pour la France/,
    );
  });

  it("should refuse a unit with no figure before it", () => {
    expect(() =>
      validateGestures({
        ...LEVEL,
        gestures: [
          { do: "annotate", mark: "France", note: "La France part de TWh" },
        ],
      }),
    ).toThrow(/La France part de 483 TWh/);
  });

  it("should repair both holes to the marks' own figures", () => {
    const { gestures } = repairGestures({
      ...STACK,
      gestures: [
        {
          do: "compare",
          marks: ["Espagne", "France"],
          note: "+TWh contre + pour la France",
        },
      ],
    });
    expect(gestures[0].note).toBe("+119 TWh contre +50 pour la France");
  });

  // gx-stacked-bar web (Qwen3.5-9B, 2026-11-17): the note held the code that should have computed its figures; the
  // refusal's value that works kept the code, "+119 fr(spain.parts[ADDED]) contre +50 fr(france.parts[ADDED])".
  it("should put each mark's figure where the note holds code, and drop the code", () => {
    expect(() =>
      validateGestures({
        ...STACK,
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: "+fr(spain.parts[ADDED]) contre +fr(france.parts[ADDED])",
          },
        ],
      }),
    ).toThrow(/write "\+119 contre \+50"/);
  });

  it("should drop an unevaluated ${…} the same way", () => {
    const { gestures } = repairGestures({
      ...STACK,
      gestures: [
        {
          do: "compare",
          marks: ["Espagne", "France"],
          note: "+${fr(spain)} TWh contre +${fr(france)}",
        },
      ],
    });
    expect(gestures[0].note).toBe("+119 TWh contre +50");
  });

  it("should refuse code with no sign or unit around it, saying it prints as is", () => {
    expect(() =>
      validateGestures({
        ...STACK,
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: "fr(spain.added) contre fr(france.added)",
          },
        ],
      }),
    ).toThrow(/prints as is.*write "119 contre 50"/);
  });

  // gx-choropleth video (Qwen3.5-9B, mvq69): `${format(v)} %` where format already ends in " %" gave "100 % %"; the
  // second unit was taken for a hole and the value that works read "100 % 100 %".
  it("should refuse a unit written twice after its figure, saying to write it once", () => {
    expect(() =>
      validateGestures({
        ...LEVEL,
        gestures: [
          {
            do: "annotate",
            mark: "France",
            note: "La France, 483 TWh TWh : la plus haute",
          },
        ],
      }),
    ).toThrow(/written twice.*write "La France, 483 TWh : la plus haute"/);
  });

  it("should repair a unit written twice to one unit", () => {
    const { gestures } = repairGestures({
      ...LEVEL,
      gestures: [
        {
          do: "annotate",
          mark: "France",
          note: "La France, 483 TWh TWh : la plus haute",
        },
      ],
    });
    expect(gestures[0].note).toBe("La France, 483 TWh : la plus haute");
  });

  it("should pass a note whose unit is named, not counted", () => {
    expect(() =>
      validateGestures({
        ...LEVEL,
        gestures: [
          {
            do: "annotate",
            mark: "France",
            note: "La France, en TWh, part de très haut",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("should pass a note with its figures", () => {
    expect(() =>
      validateGestures({
        ...STACK,
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: "+119 TWh contre +50 pour la France",
          },
        ],
      }),
    ).not.toThrow();
  });
});
