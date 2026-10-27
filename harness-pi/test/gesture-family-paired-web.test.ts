import { describe, expect, it } from "bun:test";
import {
  applyFix,
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import "../craft/_shared/gesture-family-paired.mjs";
import { stagePairedWeb } from "../craft/_shared/gesture-paired-web.mjs";

const fr = (v: number) =>
  v.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

// Proof-shaped data (the proofs' own figures, rounded as their plates print them).
const TYPES = {
  lollipop: {
    series: ["2000", "2023"],
    rows: [
      { name: "États-Unis", values: [21.4, 14.3] },
      { name: "Russie", values: [10.1, 11.9] },
      { name: "Chine", values: [2.9, 8.6] },
      { name: "Inde", values: [0.9, 2.1] },
    ],
    claim: {
      takeaway:
        "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    },
    gestures: [
      { do: "highlight", mark: "Chine" },
      {
        do: "compare",
        marks: ["États-Unis · 2023", "Chine · 2023"],
        note: "1,7 fois plus",
      },
    ],
    falseNote: {
      do: "compare",
      marks: ["États-Unis · 2023", "Chine · 2023"],
      note: "2,4 fois plus",
    },
  },
  "grouped-bar": {
    series: ["Éolien", "Solaire"],
    rows: [
      { name: "Allemagne", values: [28.5, 14.9] },
      { name: "Pologne", values: [15.0, 10.3] },
      { name: "France", values: [8.1, 4.4] },
      { name: "Suisse", values: [0.2, 7.2] },
    ],
    claim: {
      takeaway:
        "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
    },
    gestures: [
      { do: "highlight", mark: "Suisse" },
      { do: "reorder", value: "descending" },
    ],
    falseNote: { do: "annotate", mark: "Suisse · Solaire", note: "9,9 %" },
  },
  bullet: {
    series: ["2015", "2024"],
    rows: [
      { name: "Pologne", values: [13.8, 31.1] },
      { name: "Allemagne", values: [43.8, 58.6] },
      { name: "France", values: [92.2, 94.9] },
    ],
    claim: {
      takeaway:
        "Pologne : +17,3 points de bas-carbone depuis 2015, et toujours la seule des six sous la moitié",
    },
    gestures: [
      { do: "highlight", mark: "Pologne" },
      {
        do: "compare",
        marks: ["Pologne · 2024", "Pologne · 2015"],
        note: "+17,3 points",
      },
    ],
    falseNote: { do: "annotate", mark: "Pologne", note: "+19,3 points" },
  },
  "diverging-bar": {
    series: ["Variation 1990-2024"],
    rows: [
      { name: "Croatie", value: 0.03 },
      { name: "Chypre", value: -0.52 },
      { name: "France", value: -2.96 },
      { name: "Luxembourg", value: -20.48 },
    ],
    claim: {
      takeaway:
        "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
    },
    gestures: [
      { do: "highlight", mark: "Croatie" },
      { do: "filter", marks: ["Croatie"] },
    ],
    falseNote: { do: "annotate", mark: "Croatie", note: "+0,30 t" },
  },
  "population-pyramid": {
    series: ["Hommes", "Femmes"],
    rows: [
      { name: "0-4", values: [222640, 211390] },
      { name: "55-59", values: [337549, 332413] },
      { name: "60-64", values: [292211, 293052] },
      { name: "65-69", values: [230172, 241017] },
      { name: "70-74", values: [190920, 213252] },
    ],
    claim: {
      takeaway: "Les femmes passent devant les hommes à partir de 60-64 ans",
    },
    gestures: [
      { do: "highlight", mark: "Femmes" },
      { do: "bracket", marks: ["65-69", "70-74"], note: "875 361 personnes" },
    ],
    falseNote: {
      do: "bracket",
      marks: ["65-69", "70-74"],
      note: "975 361 personnes",
    },
  },
} as const;

type Variant = keyof typeof TYPES;
const stage = (
  variant: Variant,
  gestures: unknown[],
  extra: Record<string, unknown> = {},
) => {
  const t = TYPES[variant];
  return (stagePairedWeb as unknown as (input: Record<string, unknown>) => any)({
    gestures,
    variant,
    rows: t.rows as never,
    series: t.series as never,
    claim: t.claim,
    format: fr as never,
    validateGestures,
    ...extra,
  });
};
const refusalOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

for (const variant of Object.keys(TYPES) as Variant[]) {
  const t = TYPES[variant];
  describe(`the paired web scheduler — ${variant}`, () => {
    const staged = stage(variant, [...t.gestures]);

    it("should make every non-resting gesture one control", () => {
      expect(
        staged.scheduled.controls.map((c: { do: string }) => c.do),
      ).toEqual([t.gestures[1].do]);
    });

    it("should draw a control state that differs from the resting state", () => {
      expect(JSON.stringify(staged.scheduled.controls[0].state)).not.toBe(
        JSON.stringify(staged.scheduled.resting),
      );
    });

    it("should land the highlight on the resting state", () => {
      expect(Object.values(staged.scheduled.resting.emphasis)).toContain(
        "accent",
      );
    });

    it("should declare ask-a-mark and one control in the interaction plan", () => {
      expect(
        staged.interaction.controls.map(
          (c: { gesture: string }) => c.gesture,
        )[0],
      ).toBe("ask-a-mark");
    });

    it("should refuse a note whose number the marks do not give", () => {
      expect(() =>
        stage(variant, [
          t.gestures[0],
          t.falseNote,
          ...(t.falseNote.do === t.gestures[1].do ? [] : [t.gestures[1]]),
        ]),
      ).toThrow(GestureRefusal);
    });

    it("should repair a false note into an accepted list", () => {
      const out = stage(
        variant,
        [
          t.gestures[0],
          t.falseNote,
          ...(t.falseNote.do === t.gestures[1].do ? [] : [t.gestures[1]]),
        ],
        { repair: true },
      );
      expect(out.repairs.length).toBeGreaterThan(0);
    });
  });
}

describe("the paired web page's own refusals", () => {
  it("should refuse a page whose every gesture rests, offering a control", () => {
    const r = refusalOf(() =>
      stage("lollipop", [{ do: "highlight", mark: "Chine" }]),
    );
    expect(
      (r.fix as { add?: { gesture: { do: string } } }).add?.gesture.do,
    ).toBe("filter");
  });

  it("should accept the list once that fix is applied", () => {
    const list = [{ do: "highlight", mark: "Chine" }];
    const r = refusalOf(() => stage("lollipop", list));
    expect(() => stage("lollipop", applyFix(list, r.fix))).not.toThrow();
  });

  it("should refuse a filter that keeps every row", () => {
    const all = TYPES.bullet.rows.map((r) => r.name);
    expect(() =>
      stage("bullet", [
        { do: "highlight", mark: "Pologne" },
        { do: "filter", marks: all },
      ]),
    ).toThrow(/keeps every key/);
  });

  it("should refuse a reorder into the order already drawn", () => {
    expect(() =>
      stage("diverging-bar", [
        { do: "highlight", mark: "Croatie" },
        { do: "reorder", value: "descending" },
      ]),
    ).toThrow(/already hold/);
  });

  it("should refuse a bracket on a type whose values do not add up", () => {
    expect(() =>
      stage("grouped-bar", [
        { do: "highlight", mark: "Suisse" },
        { do: "bracket", marks: ["Suisse"], of: "whole" },
      ]),
    ).toThrow(/do not add up/);
  });

  it("should refuse a reorder of the pyramid's bands", () => {
    expect(() =>
      stage("population-pyramid", [
        { do: "highlight", mark: "Femmes" },
        { do: "reorder", value: "descending" },
      ]),
    ).toThrow(/age order/);
  });

  it("should give a pyramid bracket's sum over both halves", () => {
    const staged = stage("population-pyramid", [
      ...TYPES["population-pyramid"].gestures,
    ]);
    expect(staged.scheduled.controls[0].total).toBe(
      230172 + 241017 + 190920 + 213252,
    );
  });

  it("should refuse a compare written on a whole row, offering its two marks", () => {
    const r = refusalOf(() =>
      stage("lollipop", [
        { do: "highlight", mark: "Chine" },
        { do: "compare", mark: "Chine" },
      ]),
    );
    expect(
      (r.fix as { set: { value: { marks: string[] } } }).set.value.marks,
    ).toEqual(["Chine · 2023", "Chine · 2000"]);
  });

  it("should print a compare's ratio in its control sentence", () => {
    const staged = stage("lollipop", [...TYPES.lollipop.gestures]);
    expect(staged.scheduled.controls[0].pieces[0]).toBe("14,3 / 8,6 = 1,7 ×");
  });
});
