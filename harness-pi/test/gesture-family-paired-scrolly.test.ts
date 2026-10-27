// The paired family's scrolly scheduler (craft/_shared/gesture-paired-scrolly.mjs) on the proofs' own figures: one
// card per gesture whose states differ, the declared gestures landing on their cards, the closing card, the card
// check refusing a figure the picture does not draw, and the drive staying one self-contained function.
import { describe, expect, it } from "bun:test";
import "../craft/_shared/gesture-family-paired.mjs";
import {
  driveSource,
  stagePairedScrolly,
} from "../craft/_shared/gesture-paired-scrolly.mjs";

const fr = (d: number) => (v: number) => v.toFixed(d).replace(".", ",");

type Case = {
  variant: string;
  series: string[];
  rows: { name: string; values?: (number | null)[]; value?: number }[];
  takeaway: string;
  gestures: Record<string, unknown>[];
  format: (v: number) => string;
};

const CASES: Case[] = [
  {
    variant: "lollipop",
    series: ["2000", "2023"],
    rows: [
      { name: "États-Unis", values: [21.4, 14.3] },
      { name: "Russie", values: [10.1, 11.9] },
      { name: "Iran", values: [5.5, 8.7] },
      { name: "Chine", values: [2.87, 8.56] },
      { name: "Japon", values: [9.9, 7.9] },
      { name: "Inde", values: [0.9, 2.1] },
    ],
    takeaway:
      "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    gestures: [
      {
        do: "highlight",
        mark: "Chine",
        card: "En 2000, 2,9 t ; en 2023, 8,6 t.",
      },
      {
        do: "compare",
        marks: ["Chine · 2023", "Chine · 2000"],
        card: "Sa tige de 2023 triple celle de 2000 : 8,6 t contre 2,9 t.",
      },
      {
        do: "compare",
        marks: ["États-Unis · 2023", "Chine · 2023"],
        card: "L’Américain moyen émet 14,3 t, 1,7 fois le Chinois.",
      },
    ],
    format: fr(1),
  },
  {
    variant: "grouped-bar",
    series: ["Éolien", "Solaire"],
    rows: [
      { name: "Suède", values: [23.5, 2.4] },
      { name: "Allemagne", values: [28.5, 14.9] },
      { name: "Norvège", values: [9.3, 0.3] },
      { name: "Pologne", values: [15.0, 10.3] },
      { name: "France", values: [8.1, 4.4] },
      { name: "Suisse", values: [0.2, 7.2] },
    ],
    takeaway:
      "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
    gestures: [
      {
        do: "highlight",
        mark: "Éolien",
        card: "L’éolien devance dans 5 des 6 pays.",
      },
      {
        do: "highlight",
        mark: "Suisse",
        card: "Sauf en Suisse : 7,2 % contre 0,2 %.",
      },
      {
        do: "compare",
        marks: ["Suisse · Solaire", "Suisse · Éolien"],
        card: "Le solaire suisse : 7,2 contre 0,2.",
      },
    ],
    format: fr(1),
  },
  {
    variant: "bullet",
    series: ["2015", "2024"],
    rows: [
      { name: "Pologne", values: [13.8, 31.1] },
      { name: "Allemagne", values: [43.8, 58.6] },
      { name: "France", values: [92.2, 94.9] },
      { name: "Suisse", values: [97.2, 98.1] },
    ],
    takeaway:
      "La Pologne : +17,3 points de bas-carbone depuis 2015, et toujours la seule des six sous la moitié",
    gestures: [
      { do: "highlight", mark: "Pologne", card: "De 13,8 % à 31,1 %." },
      {
        do: "annotate",
        mark: "Pologne",
        note: "+17,3 pts",
        card: "+17,3 points.",
      },
      {
        do: "compare",
        marks: ["Pologne · 2024", "Allemagne · 2024"],
        card: "L’Allemagne, la plus proche, est à 58,6 %.",
      },
    ],
    format: fr(1),
  },
  {
    variant: "diverging-bar",
    series: ["variation"],
    rows: [
      { name: "Croatie", value: 0.03 },
      { name: "Chypre", value: -0.52 },
      { name: "Portugal", value: -1.13 },
      { name: "Estonie", value: -17.4 },
      { name: "Luxembourg", value: -20.48 },
    ],
    takeaway:
      "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
    gestures: [
      {
        do: "reveal",
        card: "Les 5 pays, de la hausse à la plus forte baisse.",
      },
      {
        do: "highlight",
        mark: "Croatie",
        card: "La Croatie : 0,03 t de plus.",
      },
      {
        do: "filter",
        mark: "Croatie",
        card: "La seule hausse : les 4 autres baissent.",
      },
    ],
    format: fr(2),
  },
  {
    variant: "population-pyramid",
    series: ["Hommes", "Femmes"],
    rows: [
      { name: "0-4", values: [222640, 211390] },
      { name: "55-59", values: [337549, 332413] },
      { name: "60-64", values: [292211, 293052] },
      { name: "65-69", values: [230172, 241017] },
      { name: "70-74", values: [190920, 213252] },
    ],
    takeaway: "Les femmes passent devant les hommes à partir de 60-64 ans",
    gestures: [
      {
        do: "highlight",
        mark: "Femmes",
        card: "Les femmes devant dans 3 des 5 tranches.",
      },
      {
        do: "name",
        mark: "60-64",
        card: "Ici : 293052 femmes contre 292211 hommes.",
      },
      {
        do: "bracket",
        marks: ["65-69", "70-74"],
        card: "Au-delà : 875361 personnes.",
      },
    ],
    format: (v) => String(Math.round(v)),
  },
];

const stage = (c: Case, gestures = c.gestures, repair = false) =>
  stagePairedScrolly({
    gestures,
    variant: c.variant,
    rows: c.rows,
    series: c.series,
    claim: { takeaway: c.takeaway },
    format: c.format,
    ceiling: c.variant === "bullet" ? 100 : undefined,
    repair,
  });

describe("the paired scrolly scheduler on the proofs' figures", () => {
  for (const c of CASES) {
    describe(c.variant, () => {
      const staged = stage(c);
      const states = staged.scheduled.states as Record<string, number>[];

      it("should give every card a state that differs from the one before", () => {
        const distinct = states.every(
          (s, i) =>
            i === 0 || JSON.stringify(s) !== JSON.stringify(states[i - 1]),
        );
        expect(distinct).toBe(true);
      });

      it("should land each declared gesture on its own card", () => {
        const landed = c.gestures.every(
          (g, k) =>
            states[k][`g${k}`] === 1 &&
            staged.scheduled.plan[k].do === g.do &&
            (k === 0 || states[k - 1][`g${k}`] === 0),
        );
        expect(landed).toBe(true);
      });

      it("should end on a closing card with every key back", () => {
        const closing = states.at(-1)!;
        expect(
          states.length === c.gestures.length + 1 &&
            Object.keys(closing)
              .filter((k) => k.startsWith("back"))
              .every((k) => closing[k] === 0),
        ).toBe(true);
      });
    });
  }
});

describe("the paired scrolly's refusals", () => {
  const lollipop = CASES[0];

  it("should refuse a card stating a ratio its picture does not draw", () => {
    const gestures = [
      ...lollipop.gestures.slice(0, 2),
      {
        ...lollipop.gestures[2],
        card: "1,7 fois le Chinois — contre 7,5 fois en 2000.",
      },
    ];
    expect(() => stage(lollipop, gestures)).toThrow(/gestures\[2\]\.card.*7,5/);
  });

  it("should refuse a bracket on a lollipop, whose rates do not add up, with a fix that drops it", () => {
    const gestures = [
      ...lollipop.gestures,
      { do: "bracket", marks: ["Chine", "Inde"], card: "8,6 t." },
    ];
    let fix: unknown;
    try {
      stage(lollipop, gestures);
    } catch (error) {
      fix = (error as { fix?: unknown }).fix;
    }
    expect(fix).toEqual({ remove: 3 });
  });

  it("should reach an accepted list when the repair applies that fix", () => {
    const gestures = [
      ...lollipop.gestures,
      { do: "bracket", marks: ["Chine", "Inde"], card: "8,6 t." },
    ];
    expect(stage(lollipop, gestures, true).gestures.length).toBe(3);
  });

  it("should refuse a compare written on a whole row, offering the row's two marks", () => {
    const gestures = [
      lollipop.gestures[0],
      { do: "compare", mark: "Chine", card: "8,6 t contre 2,9 t." },
    ];
    let fix: { set?: { value?: { marks?: string[] } } } | undefined;
    try {
      stage(lollipop, gestures);
    } catch (error) {
      fix = (error as { fix?: typeof fix }).fix;
    }
    expect(fix?.set?.value?.marks).toEqual(["Chine · 2023", "Chine · 2000"]);
  });

  it("should refuse a reorder on the pyramid", () => {
    const pyramid = CASES[4];
    expect(() =>
      stage(pyramid, [
        ...pyramid.gestures,
        { do: "reorder", value: "descending", card: "293052." },
      ]),
    ).toThrow(/age order/);
  });
});

describe("the paired scrolly's own rules", () => {
  it("should hide every row before a composed reveal, and show them from it on", () => {
    const states = stage(CASES[3]).scheduled.states as Record<string, number>[];
    expect([states[0].ink, states[1].ink]).toEqual([1, 1]);
  });

  it("should keep the rows hidden on a card that comes before the reveal", () => {
    const c = CASES[3];
    const gestures = [c.gestures[1], c.gestures[0], c.gestures[2]];
    const states = stage(c, gestures).scheduled.states as Record<
      string,
      number
    >[];
    expect([states[0].ink, states[1].ink]).toEqual([0, 1]);
  });

  it("should draw every band of a pyramid whatever the capacity", () => {
    const c = CASES[4];
    const staged = stagePairedScrolly({
      gestures: c.gestures,
      variant: c.variant,
      rows: c.rows,
      series: c.series,
      claim: { takeaway: c.takeaway },
      format: c.format,
      capacity: 2,
    });
    expect(staged.scheduled.drawnKeys.length).toBe(5);
  });

  it("should state the keys a long diverging list leaves out, keeping the subject", () => {
    const c = CASES[3];
    const staged = stagePairedScrolly({
      gestures: c.gestures.slice(1),
      variant: c.variant,
      rows: c.rows,
      series: c.series,
      claim: { takeaway: c.takeaway },
      format: c.format,
      capacity: 3,
    });
    expect([
      staged.scheduled.rest.count,
      staged.scheduled.drawnKeys.includes("Croatie"),
    ]).toEqual([2, true]);
  });

  it("should keep the drive one self-contained function that compiles alone", () => {
    const source = driveSource();
    const fn = new Function(`${source}; return applyPairedState;`)();
    expect(
      typeof fn === "function" &&
        !/layoutPaired|GestureRefusal|import\s/.test(source),
    ).toBe(true);
  });
});
