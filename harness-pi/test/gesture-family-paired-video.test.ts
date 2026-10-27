// The paired family's VIDEO scheduler (craft/_shared/gesture-paired-video.mjs) on proof-shaped data, through the core
// (validateGestures, format "video") and the paired adapter, for each of the five types.
import { describe, expect, it } from "bun:test";
import { GestureRefusal, validateGestures } from "../craft/_shared/gesture-core.mjs";
import { stagePaired } from "../craft/_shared/gesture-family-paired.mjs";
import { fieldAt, schedulePairedVideo, sceneAt } from "../craft/_shared/gesture-paired-video.mjs";

type Row = { name: string; values?: (number | null)[]; value?: number };

const CASES: Record<string, { series: string[]; rows: Row[]; takeaway: string; gestures: object[] }> = {
  lollipop: {
    series: ["2000", "2023"],
    rows: [
      { name: "Chine", values: [2.89, 8.59] },
      { name: "États-Unis", values: [21.4, 14.3] },
      { name: "Inde", values: [0.93, 2.07] },
    ],
    takeaway: "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    gestures: [
      { do: "highlight", mark: "Chine" },
      { do: "compare", marks: ["Chine · 2023", "Chine · 2000"], note: "×3,0 depuis 2000" },
      { do: "compare", marks: ["États-Unis · 2023", "Chine · 2023"], note: "1,7 fois" },
    ],
  },
  "grouped-bar": {
    series: ["Éolien", "Solaire"],
    rows: [
      { name: "Suède", values: [23.5, 2.4] },
      { name: "Pologne", values: [15.0, 10.3] },
      { name: "Suisse", values: [0.23, 7.2] },
    ],
    takeaway: "Dans 2 de ces 3 pays l’éolien devance le solaire — la Suisse est l’exception",
    gestures: [
      { do: "highlight", mark: "Éolien", note: "en tête dans 2 des 3 pays" },
      { do: "compare", marks: ["Suisse · Solaire", "Suisse · Éolien"] },
      { do: "pull-back" },
    ],
  },
  bullet: {
    series: ["2015", "2024"],
    rows: [
      { name: "Pologne", values: [13.8, 31.1] },
      { name: "Allemagne", values: [43.8, 58.6] },
      { name: "France", values: [92.2, 94.9] },
    ],
    takeaway: "Pologne : +17,3 points de bas-carbone depuis 2015",
    gestures: [{ do: "reveal" }, { do: "highlight", mark: "Pologne" }, { do: "annotate", mark: "Pologne", note: "+17,3 points" }],
  },
  "diverging-bar": {
    series: ["Variation"],
    rows: [
      { name: "Croatie", value: 0.03 },
      { name: "Chypre", value: -0.52 },
      { name: "Luxembourg", value: -20.48 },
    ],
    takeaway: "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
    gestures: [
      { do: "highlight", mark: "Croatie" },
      { do: "filter", marks: ["Croatie", "Luxembourg"] },
      { do: "compare", marks: ["Croatie", "Luxembourg"] },
    ],
  },
  "population-pyramid": {
    series: ["Hommes", "Femmes"],
    rows: [
      { name: "0-4", values: [222640, 211390] },
      { name: "55-59", values: [337549, 332413] },
      { name: "60-64", values: [292211, 293052] },
      { name: "65-69", values: [230172, 241017] },
    ],
    takeaway: "Les femmes passent devant les hommes à partir de 60-64 ans",
    gestures: [
      { do: "highlight", mark: "Femmes" },
      { do: "bracket", marks: ["60-64", "65-69"], note: "Là où elles dominent : 1 056 452" },
      { do: "name", mark: "60-64" },
    ],
  },
};

const stage = (variant: string, gestures = CASES[variant].gestures) => {
  const c = CASES[variant];
  return stagePaired({
    gestures,
    variant,
    rows: c.rows,
    series: c.series,
    format: "video",
    claim: { takeaway: c.takeaway },
    ceiling: undefined,
    validateGestures,
    then: ({ gestures: valid, keys, marks, series, claim }: any) => schedulePairedVideo({ gestures: valid, keys, marks, series, variant, claim }),
  }).staged;
};

const changed = (a: Record<string, number>, b: Record<string, number>) => Object.keys(b).filter((k) => a[k] !== b[k]);

describe("the paired video scheduler", () => {
  for (const variant of Object.keys(CASES)) {
    describe(variant, () => {
      it("should give every composed event a picture of its own", () => {
        const { states } = stage(variant);
        expect([2, 3, 4].every((i) => changed(states[i - 1], states[i]).length > 0)).toBe(true);
      });

      it("should land each declared gesture in its event, in story order", () => {
        const { plan } = stage(variant);
        expect(plan.map((p: any) => [p.event, p.do])).toEqual(CASES[variant].gestures.map((g: any, k) => [["reveal", "subject", "conclusion"][k], g.do]));
      });

      it("should end with the whole chart: nothing stepped back, the credit up", () => {
        const { states } = stage(variant);
        const last = states[4];
        expect(Object.entries(last).filter(([k, v]) => k.startsWith("back") && v !== 0).length + (last.source === 1 ? 0 : 1)).toBe(0);
      });

      it("should hold the conclusion still", () => {
        const { states } = stage(variant);
        expect(changed(states[4], states[5])).toEqual([]);
      });
    });
  }

  it("should put the accent on the highlighted row's two marks (lollipop)", () => {
    const { states } = stage("lollipop");
    expect([states[2].accent0, states[2].accent1, states[2].accent2]).toEqual([1, 1, 0]);
  });

  it("should accent a highlighted series in every row (pyramid: Femmes)", () => {
    const { states } = stage("population-pyramid");
    expect([1, 3, 5, 7].map((j) => states[2][`accent${j}`])).toEqual([1, 1, 1, 1]);
  });

  it("should climb a bracket's figure to the sum of its bands, both halves", () => {
    const { plan } = stage("population-pyramid");
    expect(plan[1].steps.at(-1)).toBe(292211 + 293052 + 230172 + 241017);
  });

  it("should release a filter in the conclusion (diverging-bar)", () => {
    const { states } = stage("diverging-bar");
    expect([states[3].back1, states[4].back1]).toEqual([1, 0]);
  });

  it("should lay a compare's copy at the compared mark's length", () => {
    const { plan } = stage("lollipop");
    expect(plan[1].value).toBe(2.89);
  });
});

describe("the paired video refusals", () => {
  const refusal = (variant: string, gestures: object[]) => {
    try {
      stage(variant, gestures);
    } catch (error) {
      if (error instanceof GestureRefusal) return error;
      throw error;
    }
    return null;
  };

  it("should refuse two gestures and offer the third (a pull-back)", () => {
    const r = refusal("lollipop", CASES.lollipop.gestures.slice(0, 2));
    expect(r?.fix).toEqual({ add: { at: 2, gesture: { do: "pull-back" } } });
  });

  it("should refuse a filter as the conclusion and offer pull-back", () => {
    const r = refusal("diverging-bar", [{ do: "highlight", mark: "Croatie" }, { do: "compare", marks: ["Croatie", "Luxembourg"] }, { do: "filter", marks: ["Croatie"] }]);
    expect(r?.fix).toEqual({ set: { index: 2, value: { do: "pull-back" } } });
  });

  it("should refuse a pull-back with nothing to return from before the conclusion", () => {
    const r = refusal("bullet", [{ do: "highlight", mark: "Pologne" }, { do: "pull-back" }, { do: "annotate", mark: "Pologne", note: "+17,3 points" }]);
    expect(r?.fix).toEqual({ remove: 1 });
  });

  it("should accept the same pull-back once a filter precedes it", () => {
    expect(refusal("bullet", [{ do: "filter", marks: ["Pologne"] }, { do: "pull-back" }, { do: "annotate", mark: "Pologne", note: "+17,3 points" }])).toBeNull();
  });

  it("should refuse a reorder into the order the rows already hold", () => {
    const r = refusal("bullet", [{ do: "highlight", mark: "Pologne" }, { do: "reorder", value: "ascending" }, { do: "annotate", mark: "Pologne", note: "+17,3 points" }]);
    expect(r?.fix).toEqual({ remove: 1 });
  });

  it("should refuse a reorder of the pyramid's bands", () => {
    const r = refusal("population-pyramid", [{ do: "highlight", mark: "Femmes" }, { do: "reorder", value: "descending" }, { do: "name", mark: "60-64" }]);
    expect(r?.fix).toEqual({ remove: 1 });
  });

  it("should refuse a bracket on a type whose values do not add up", () => {
    const r = refusal("grouped-bar", [{ do: "highlight", mark: "Éolien" }, { do: "bracket", marks: ["Suède", "Pologne"] }, { do: "pull-back" }]);
    expect(r?.fix).toEqual({ remove: 1 });
  });

  it("should refuse a false figure in a note with the figure that works", () => {
    const r = refusal("bullet", [{ do: "reveal" }, { do: "highlight", mark: "Pologne" }, { do: "annotate", mark: "Pologne", note: "+19,3 points" }]);
    expect((r?.fix as any)?.set?.value).toBe("+17,3 points");
  });
});

describe("the paired video's time half", () => {
  it("should move the bracket's spine up from the pyramid's foot", () => {
    const c = CASES["population-pyramid"];
    const s = stage("population-pyramid");
    const timing = { fps: 30, total: 100, establish: { start: 0, duration: 10 }, reference: { start: 10, duration: 10 }, reveal: { start: 20, duration: 20 }, subject: { start: 40, duration: 20 }, conclusion: { start: 60, duration: 20 }, hold: { start: 80, duration: 20 } };
    const props: any = {
      variant: "population-pyramid",
      keys: c.rows.map((r) => ({ name: r.name })),
      marks: c.rows.flatMap((r, i) => (r.values ?? []).map((v, j) => ({ name: `${r.name} · ${c.series[j]}`, value: v, key: r.name, series: c.series[j], j }))),
      series: c.series,
      layout: { plot: { x: 0, y: 0, width: 400, height: 400, gutter: 40 }, domain: [0, 340000], gap: 4, countShift: 0, bracketX: 420 },
      plan: s.plan,
      bracketLabels: [],
      captions: [],
      states: s.states,
      windows: s.windows,
      linear: s.linear,
      timing,
      hasReveal: false,
      format: { decimals: 0, small: 0, below: 0, decimal: ",", group: " " },
      unit: "",
    };
    const b = sceneAt(props, 50).brackets[0];
    expect(b.reach < b.y1).toBe(true);
    expect(fieldAt(props, "g1", 59)).toBe(1);
  });
});
