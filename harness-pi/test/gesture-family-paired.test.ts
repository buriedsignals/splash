// The paired family (GRAMMAR F1, two values per key or a signed one): the adapter, its hooks in the gesture core, and
// the static scheduler, on each type's proof data (the measurement seeds' data.json, read as the worked beats read it).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import * as paired from "../craft/_shared/gesture-family-paired.mjs";
import * as registry from "../craft/_shared/gesture-registry.mjs";
import * as pairedStatic from "../craft/_shared/gesture-paired-static.mjs";

// The modules are untyped JS: read them as such.
const { foldAll, hooksFor, marksOf, pairedClaim, pairedReadings, stagePaired } = paired as any;
const { admissible, FAMILIES } = registry as any;
const { composePairedStatic } = pairedStatic as any;

const SEEDS = join(import.meta.dir, "..", "eval", "seeds");
const table = (slug: string) =>
  JSON.parse(
    readFileSync(join(SEEDS, `gx-${slug}`, "beats", "1", "data.json"), "utf8"),
  );
const colOf = (t: any) => (n: string) =>
  t.columns.findIndex((c: any) => c.name === n);

function lollipopRows() {
  const t = table("lollipop");
  const c = colOf(t);
  const FR: Record<string, string> = {
    CHN: "Chine",
    USA: "États-Unis",
    IND: "Inde",
    RUS: "Russie",
    JPN: "Japon",
    IRN: "Iran",
  };
  return t.rows
    .filter((r: any[]) => /^[A-Z]{3}$/.test(String(r[c("code")])))
    .map((r: any[]) => ({
      code: r[c("code")],
      name: r[c("entity")],
      values: [r[c("t_per_person_2000")], r[c("t_per_person_2023")]],
      total: r[c("t_per_person_2023")] * r[c("population_2023")],
    }))
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 6)
    .map((r: any) => ({ name: FR[r.code] ?? r.name, values: r.values }));
}
const SOURCES = [
  "Other renewables",
  "Bioenergy",
  "Solar",
  "Wind",
  "Hydropower",
  "Nuclear",
  "Gas",
  "Oil",
  "Coal",
];
const FR6: Record<string, string> = {
  France: "France",
  Germany: "Allemagne",
  Norway: "Norvège",
  Poland: "Pologne",
  Sweden: "Suède",
  Switzerland: "Suisse",
};
function groupedRows() {
  const t = table("grouped-bar");
  const c = colOf(t);
  return t.rows
    .filter((r: any[]) => r[c("Year")] === 2024)
    .map((r: any[]) => {
      const total = SOURCES.reduce((s, k) => s + r[c(k)], 0);
      return {
        name: FR6[r[c("Entity")]],
        values: [(r[c("Wind")] / total) * 100, (r[c("Solar")] / total) * 100],
      };
    });
}
function bulletRows() {
  const t = table("bullet");
  const c = colOf(t);
  const low = SOURCES.filter((s) => !["Gas", "Oil", "Coal"].includes(s));
  const share = (e: string, y: number) => {
    const r = t.rows.find(
      (x: any[]) => x[c("Entity")] === e && x[c("Year")] === y,
    );
    return (
      (low.reduce((s, k) => s + r[c(k)], 0) /
        SOURCES.reduce((s, k) => s + r[c(k)], 0)) *
      100
    );
  };
  return Object.keys(FR6)
    .map((e) => ({ name: FR6[e], values: [share(e, 2015), share(e, 2024)] }))
    .sort((a, b) => b.values[1] - b.values[0] - (a.values[1] - a.values[0]));
}
function divergingRows() {
  const t = table("diverging-bar");
  const c = colOf(t);
  const at = (e: string, y: number) =>
    t.rows.find((r: any[]) => r[c("Entity")] === e && r[c("Year")] === y)?.[
      c("CO₂ emissions per capita")
    ];
  return [...new Set(t.rows.map((r: any[]) => r[c("Entity")] as string))]
    .map((e: any) => ({
      name: e === "Croatia" ? "Croatie" : e,
      value: at(e, 2024) - at(e, 1990),
    }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value);
}
function pyramidRows() {
  const t = table("population-pyramid");
  const c = colOf(t);
  return t.rows.map((r: any[]) => ({
    name: String(r[c("age_band")]),
    values: [r[c("male")], r[c("female")]],
  }));
}

const CASES: Record<string, any> = {
  lollipop: {
    rows: lollipopRows(),
    series: ["2000", "2023"],
    claim: {
      takeaway:
        "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
      entity: "Chine",
    },
  },
  "grouped-bar": {
    rows: groupedRows(),
    series: ["Éolien", "Solaire"],
    claim: {
      takeaway:
        "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
      entity: "Suisse",
    },
  },
  bullet: {
    rows: bulletRows(),
    series: ["2015", "2024"],
    claim: {
      takeaway:
        "La Pologne a gagné 17,3 points de bas-carbone depuis 2015, et reste la seule des six sous la moitié",
      entity: "Pologne",
    },
  },
  "diverging-bar": {
    rows: divergingRows(),
    series: ["variation 1990-2024"],
    claim: {
      takeaway:
        "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
      entity: "Croatie",
    },
  },
  "population-pyramid": {
    rows: pyramidRows(),
    series: ["Hommes", "Femmes"],
    claim: {
      takeaway: "Les femmes passent devant les hommes à partir de 60-64 ans",
    },
  },
};
type Slug = "lollipop" | "grouped-bar" | "bullet" | "diverging-bar" | "population-pyramid";

const fr = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
function stage(slug: Slug, gestures: any[], format = "static", repair = false) {
  const c = CASES[slug];
  return stagePaired({
    gestures,
    variant: slug,
    rows: c.rows as any,
    series: c.series as any,
    format,
    claim: c.claim,
    ceiling: slug === "bullet" ? 100 : undefined,
    validateGestures,
    repair,
    then: (o: any) =>
      composePairedStatic({
        gestures: o.gestures,
        keys: o.keys,
        marks: o.marks,
        series: o.series,
        variant: slug,
        format: (v: number) => fr(v),
        claim: o.claim,
      }),
  });
}
const refusalOf = (fn: () => unknown): GestureRefusal => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a refusal");
};
const distinct = (states: any[]) =>
  new Set(states.map((s) => JSON.stringify(s))).size === states.length;

// One staging per type that lands every declared gesture, and one false figure per type.
const STAGING: Record<
  Slug,
  { good: () => any[]; bad: () => any[]; lands: (plate: any) => boolean }
> = {
  lollipop: {
    good: () => {
      const r = CASES.lollipop.rows;
      const cn = r.find((x: any) => x.name === "Chine")!.values;
      const us = r.find((x: any) => x.name === "États-Unis")!.values;
      return [
        { do: "highlight", mark: "Chine" },
        {
          do: "compare",
          marks: ["Chine · 2023", "Chine · 2000"],
          note: `a triplé : ${fr(cn[0])} → ${fr(cn[1])} t`,
        },
        {
          do: "compare",
          marks: ["États-Unis · 2023", "Chine · 2023"],
          note: `${fr(us[1] / cn[1])} fois plus que la Chine`,
        },
      ];
    },
    bad: () => [
      {
        do: "compare",
        marks: ["États-Unis · 2023", "Chine · 2023"],
        note: "2,4 fois plus que la Chine",
      },
    ],
    lands: (p) =>
      p.accent.includes("Chine · 2023") &&
      p.copies.length === 2 &&
      p.notes.length === 2,
  },
  "grouped-bar": {
    good: () => [
      { do: "highlight", mark: "Suisse" },
      {
        do: "compare",
        marks: ["Suisse · Solaire", "Suisse · Éolien"],
        note: `solaire ${fr(CASES["grouped-bar"].rows.find((x: any) => x.name === "Suisse")!.values[1])} %`,
      },
      { do: "annotate", mark: "Éolien", note: "en tête dans 5 des 6 pays" },
    ],
    bad: () => [
      { do: "annotate", mark: "Éolien", note: "en tête dans 4 des 6 pays" },
    ],
    lands: (p) =>
      p.accent.includes("Suisse · Solaire") &&
      p.copies[0]?.onto === "Suisse · Solaire" &&
      p.notes.some((n: any) => n.keys.length === 6),
  },
  bullet: {
    good: () => {
      const pl = CASES.bullet.rows.find((x: any) => x.name === "Pologne")!.values;
      return [
        { do: "highlight", mark: "Pologne" },
        {
          do: "annotate",
          mark: "Pologne",
          note: `+${fr(pl[1] - pl[0])} points depuis 2015`,
        },
        { do: "reference", value: 50, mark: "Pologne", note: "la moitié" },
      ];
    },
    bad: () => [
      { do: "annotate", mark: "Pologne", note: "+21,3 points depuis 2015" },
    ],
    lands: (p) =>
      p.accent.includes("Pologne · 2024") &&
      p.references[0]?.value === 50 &&
      p.notes[0]?.keys[0] === "Pologne",
  },
  "diverging-bar": {
    good: () => [
      { do: "highlight", mark: "Croatie" },
      {
        do: "annotate",
        mark: "Croatie",
        note: `+${fr(CASES["diverging-bar"].rows[0].value, 2)} t : la seule hausse`,
      },
      { do: "filter", marks: ["Croatie"] },
    ],
    bad: () => [
      { do: "annotate", mark: "Croatie", note: "+0,90 t : la seule hausse" },
    ],
    lands: (p) =>
      p.accent.includes("Croatie") &&
      p.stepBack.length === 26 &&
      p.notes.length === 1,
  },
  "population-pyramid": {
    good: () => {
      const band = CASES["population-pyramid"].rows.find(
        (r: any) => r.name === "60-64",
      )!.values;
      return [
        { do: "highlight", mark: "Femmes" },
        {
          do: "annotate",
          mark: "60-64",
          note: `${band[1] - band[0]} femmes de plus`,
        },
        {
          do: "bracket",
          marks: ["90-94", "95-99", "100+"],
          note: "les plus âgés",
        },
      ];
    },
    bad: () => [{ do: "annotate", mark: "60-64", note: "9000 femmes de plus" }],
    lands: (p) =>
      p.accent.length === 21 &&
      p.notes.length === 1 &&
      p.brackets[0]?.keys.length === 3,
  },
};

describe("the paired family registers itself", () => {
  it("should admit the family's gestures once its adapter is imported", () => {
    expect(admissible("paired", "static").map((a: any) => a.do)).toContain(
      "compare",
    );
  });

  it("should declare the family additive, for the pyramid's counts", () => {
    expect(FAMILIES.paired.additive).toBe(true);
  });
});

describe("marksOf", () => {
  it("should make one mark per key × series, named key · series", () => {
    expect(
      marksOf({
        rows: [{ name: "Chine", values: [2.9, 8.6] }],
        series: ["2000", "2023"],
        variant: "lollipop",
      }).marks.map((m: any) => m.name),
    ).toEqual(["Chine · 2000", "Chine · 2023"]);
  });

  it("should leave a gap undrawn rather than refuse it", () => {
    expect(
      marksOf({
        rows: [
          { name: "A", values: [1, null] },
          { name: "B", values: [2, 3] },
        ],
        series: ["x", "y"],
        variant: "grouped-bar",
      }).marks.length,
    ).toBe(3);
  });

  it("should take a diverging row's single value as its key", () => {
    expect(
      marksOf({
        rows: [{ name: "Croatie", value: 0.03 }],
        series: ["change"],
        variant: "diverging-bar",
      }).marks[0].name,
    ).toBe("Croatie");
  });
});

for (const slug of Object.keys(CASES) as Slug[]) {
  describe(`${slug} — static scheduler on its proof data`, () => {
    it("should land every declared gesture on the plate", () => {
      expect(
        STAGING[slug].lands(stage(slug, STAGING[slug].good()).staged),
      ).toBe(true);
    });

    it("should give every gesture a picture state distinct from the one before", () => {
      expect(distinct(stage(slug, STAGING[slug].good()).staged.states)).toBe(
        true,
      );
    });

    it("should refuse a figure the rows do not give, on the note's field", () => {
      expect(refusalOf(() => stage(slug, STAGING[slug].bad())).field).toBe(
        "gestures[0].note",
      );
    });

    it("should end on an accepted list when the refusal's fix is applied", () => {
      expect(
        stage(slug, STAGING[slug].bad(), "static", true).repairs.length,
      ).toBeGreaterThan(0);
    });
  });
}

describe("rule: the claim's keys and series resolve to marks (pairedClaim)", () => {
  const { marks } = marksOf({
    rows: CASES.lollipop.rows as any,
    series: ["2000", "2023"],
    variant: "lollipop",
  });

  it("should accept a highlight on the takeaway's key", () => {
    expect(() =>
      validateGestures({
        gestures: [{ do: "highlight", mark: "Chine" }],
        rows: marks,
        family: "paired",
        format: "static",
        claim: pairedClaim(CASES.lollipop.claim, marks),
      }),
    ).not.toThrow();
  });

  it("should still refuse a gesture on a key the takeaway does not name", () => {
    expect(() =>
      validateGestures({
        gestures: [{ do: "highlight", mark: "Inde" }],
        rows: marks,
        family: "paired",
        format: "static",
        claim: pairedClaim({ takeaway: "La Chine a triplé" }, marks),
      }),
    ).toThrow(/does not serve the takeaway/);
  });
});

describe("rule: a pair's change and ratio are figures it draws (hooks.figures)", () => {
  it("should accept a note stating a key's change", () => {
    expect(
      stage("bullet", [
        {
          do: "annotate",
          mark: "Pologne",
          note: `+${fr(CASES.bullet.rows[0].values[1] - CASES.bullet.rows[0].values[0])} points`,
        },
      ]).staged.notes.length,
    ).toBe(1);
  });

  it("should accept a note stating how many keys a series leads", () => {
    expect(() =>
      stage("grouped-bar", [
        { do: "annotate", mark: "Éolien", note: "5 pays sur 6" },
      ]),
    ).not.toThrow();
  });

  it("should not admit a change on one mark alone", () => {
    expect(
      refusalOf(() =>
        stage("bullet", [
          {
            do: "annotate",
            mark: "Pologne · 2024",
            note: `+${fr(CASES.bullet.rows[0].values[1] - CASES.bullet.rows[0].values[0])} points`,
          },
        ]),
      ).field,
    ).toBe("gestures[0].note");
  });
});

describe("rule bracket-adds-up: only the pyramid's values add up", () => {
  it("should refuse a bracket on grouped shares, dropping it", () => {
    expect(refusalOf(() => stage("grouped-bar", [{ do: "bracket", marks: ["France", "Allemagne"] }])).fix).toEqual({ remove: 0 });
  });

  it("should draw a pyramid bracket with its sum", () => {
    const rows = CASES["population-pyramid"].rows;
    const sum = rows
      .filter((r: any) => ["95-99", "100+"].includes(r.name))
      .reduce((s: number, r: any) => s + r.values[0] + r.values[1], 0);
    expect(
      stage("population-pyramid", [
        { do: "bracket", marks: ["95-99", "100+"], note: `${sum} personnes` },
      ]).staged.brackets[0].sum,
    ).toBe(sum);
  });
});

describe("rule natural-order: the pyramid keeps its bands in age order", () => {
  it("should refuse a reorder on the pyramid in the core's hooks", () => {
    const { marks } = marksOf({ rows: CASES["population-pyramid"].rows as any, series: ["Hommes", "Femmes"], variant: "population-pyramid" });
    const run = () => validateGestures({ gestures: [{ do: "highlight", mark: "Femmes" }, { do: "reorder", value: "descending" }], rows: marks, family: "paired", format: "static", claim: pairedClaim(CASES["population-pyramid"].claim, marks), hooks: hooksFor("population-pyramid", marks) });
    expect(refusalOf(run).fix).toEqual({ remove: 1 });
  });

  it("should reorder another type's keys by the last series", () => {
    expect(
      stage("lollipop", [
        { do: "highlight", mark: "Chine" },
        { do: "reorder", value: "ascending" },
      ]).staged.order[0],
    ).toBe("Inde");
  });

  it("should hold the order as an invariant over folded states too", () => {
    const { keys, marks, series } = marksOf({
      rows: CASES["population-pyramid"].rows as any,
      series: ["Hommes", "Femmes"],
      variant: "population-pyramid",
    });
    expect(() =>
      foldAll({
        gestures: [
          { do: "reorder", marks: ["Hommes · 50-54"], value: "descending" },
        ],
        keys,
        marks,
        series,
        variant: "population-pyramid",
        claim: {},
      }),
    ).toThrow(/age order/);
  });
});

describe("rule compare-one-length: a compare lays one mark's length against another's", () => {
  it("should refuse a compare written on a key, offering the key's two marks, later first", () => {
    expect(
      refusalOf(() =>
        stage("lollipop", [{ do: "compare", mark: "Chine", of: "whole" }]),
      ).fix,
    ).toEqual({
      set: {
        index: 0,
        value: {
          do: "compare",
          of: "whole",
          marks: ["Chine · 2023", "Chine · 2000"],
        },
      },
    });
  });

  it("should accept the two marks the fix offers", () => {
    expect(
      stage("lollipop", [
        { do: "compare", marks: ["Chine · 2023", "Chine · 2000"] },
      ]).staged.copies[0].onto,
    ).toBe("Chine · 2023");
  });
});

describe("rule reference-on-the-scale", () => {
  it("should refuse a negative rule on the pyramid's magnitudes, offering its magnitude", () => {
    expect(
      refusalOf(() =>
        stage("population-pyramid", [
          { do: "reference", value: -300000, mark: "Femmes" },
        ]),
      ).fix,
    ).toEqual({ set: { index: 0, field: "value", value: 300000 } });
  });

  it("should refuse a bullet rule past the track's ceiling", () => {
    expect(
      refusalOf(() =>
        stage("bullet", [{ do: "reference", value: 120, mark: "Pologne" }]),
      ).fix,
    ).toEqual({ remove: 0 });
  });
});

describe("one picture: conflicts on a still plate", () => {
  it("should refuse a second note on one key, dropping the note", () => {
    expect(
      refusalOf(() =>
        stage("bullet", [
          { do: "annotate", mark: "Pologne", note: "a" },
          { do: "highlight", mark: "Pologne", note: "b" },
        ]),
      ).fix,
    ).toEqual({ set: { index: 1, field: "note", value: undefined } });
  });

  it("should give the accent to the subject key when nothing is highlighted", () => {
    expect(
      stage("diverging-bar", [
        { do: "annotate", mark: "Croatie", note: "la seule hausse" },
      ]).staged.accent,
    ).toEqual(["Croatie"]);
  });

  it("should ring a second highlighted key rather than spend a second accent", () => {
    expect(
      stage("lollipop", [
        { do: "highlight", mark: "Chine" },
        { do: "highlight", mark: "États-Unis" },
      ]).staged.rings,
    ).toEqual(["États-Unis · 2000", "États-Unis · 2023"]);
  });
});

describe("pairedReadings (the headline guard's paired figures)", () => {
  it("should hold a ratio between two keys of one series", () => {
    const keys = [
      { name: "a", values: [1, 8.6] },
      { name: "b", values: [2, 14.3] },
    ];
    expect(
      pairedReadings(keys).some((v: number) => Math.abs(v - 14.3 / 8.6) < 1e-9),
    ).toBe(true);
  });
});

describe("hooksFor", () => {
  it("should give a series its lead count", () => {
    const { marks } = marksOf({
      rows: CASES["grouped-bar"].rows as any,
      series: ["Éolien", "Solaire"],
      variant: "grouped-bar",
    });
    const own = marks
      .filter((m: any) => m.series === "Éolien")
      .map((m: any) => m.name);
    expect(
      hooksFor("grouped-bar", marks).figures(
        { do: "annotate" },
        { marks: own, of: [], index: 0 },
      ),
    ).toContain(5);
  });
});

describe("gesturesOf (a type's contract table)", () => {
  it("should list bracket for the pyramid only", () => {
    expect([(paired as any).gesturesOf("population-pyramid").includes("bracket"), (paired as any).gesturesOf("lollipop").includes("bracket")]).toEqual([true, false]);
  });

  it("should not list reorder for the pyramid", () => {
    expect((paired as any).gesturesOf("population-pyramid")).not.toContain("reorder");
  });
});
