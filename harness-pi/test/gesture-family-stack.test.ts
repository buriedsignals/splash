import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyFix,
  GestureRefusal,
  repairGestures,
} from "../craft/_shared/gesture-core.mjs";
import { FAMILIES } from "../craft/_shared/gesture-registry.mjs";
import {
  foldStack,
  stackFromBeat,
  stackClaim,
  stackHooks,
  validateStack,
} from "../craft/_shared/gesture-family-stack.mjs";
import { composeStackStatic } from "../craft/_shared/gesture-stack-static.mjs";

// The three proof examples' data, as the seeds freeze it.
const seed = (slug: string) =>
  JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        "..",
        "eval",
        "seeds",
        `gx-${slug}`,
        "beats",
        "1",
        "data.json",
      ),
      "utf8",
    ),
  );
const at = (table: any, name: string) =>
  table.columns.findIndex((c: any) => c.name === name);

const LEVEL = "produit en 2000";
const ADDED = "ajouté depuis";
function stackedBeat() {
  const t = seed("stacked-bar");
  const CLEAN = [
    "hydro_generation__twh",
    "wind_generation__twh",
    "solar_generation__twh",
    "bioenergy_stacked_generation__twh",
    "other_renewables_generation__twh",
    "nuclear_generation__twh",
  ].map((c) => at(t, c));
  const low = (r: any[]) => CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);
  const FR: Record<string, string> = {
    Spain: "Espagne",
    France: "France",
    Germany: "Allemagne",
    "United Kingdom": "Royaume-Uni",
    Italy: "Italie",
  };
  const rows = [...new Set(t.rows.map((r: any[]) => r[at(t, "entity")]))]
    .map((e: any) => {
      const a = low(
        t.rows.find(
          (r: any[]) => r[at(t, "entity")] === e && r[at(t, "year")] === 2000,
        ),
      );
      const b = low(
        t.rows.find(
          (r: any[]) => r[at(t, "entity")] === e && r[at(t, "year")] === 2024,
        ),
      );
      return { name: FR[e] ?? e, parts: { [LEVEL]: a, [ADDED]: b - a } };
    })
    .sort((x: any, y: any) => y.parts[ADDED] - x.parts[ADDED]);
  return { rows, parts: [LEVEL, ADDED] };
}
const STACKED_CLAIM = {
  takeaway:
    "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000",
  entity: "Espagne",
  versus: "France",
};

const LEFT = [
  ["Gas", "Gaz"],
  ["Oil", "Pétrole"],
  ["Coal", "Charbon"],
];
const RIGHT = [
  ["Bioenergy", "Bioénergie"],
  ["Other renewables", "Autres renouv."],
  ["Hydropower", "Hydraulique"],
  ["Solar", "Solaire"],
  ["Wind", "Éolien"],
];
function likertBeat() {
  const t = seed("diverging-stacked-bar-likert");
  const ALL = [...LEFT, ...RIGHT, ["Nuclear", "Nucléaire"]];
  const rows = t.rows
    .filter((r: any[]) => r[at(t, "Year")] === 2024)
    .map((r: any[]) => {
      const total = ALL.reduce((s, [c]) => s + r[at(t, c)], 0);
      return {
        name: r[at(t, "Entity")],
        parts: Object.fromEntries(
          ALL.map(([c, l]) => [l, (r[at(t, c)] / total) * 100]),
        ),
      };
    });
  return {
    rows,
    left: LEFT.map(([, l]) => l),
    right: RIGHT.map(([, l]) => l),
    centre: "Nucléaire",
  };
}
const LIKERT_CLAIM = {
  takeaway:
    "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis",
  entity: "France",
  unit: "%",
};

function bridgeBeat() {
  const t = seed("waterfall-bridge");
  const row = (y: number) => t.rows.find((r: any[]) => r[at(t, "Year")] === y);
  const sum = (r: any[], cols: string[]) =>
    cols.reduce((s, c) => s + Number(r[at(t, c)]), 0);
  const REN = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
  const FOS = ["Gas", "Oil", "Coal"];
  const ALL = [...REN, "Nuclear", ...FOS];
  const step = (name: string, cols: string[]) => ({
    name,
    value: sum(row(2024), cols) - sum(row(2015), cols),
  });
  return {
    opening: { name: "2015", value: sum(row(2015), ALL) },
    steps: [
      step("Renouvelables", REN),
      step("Nucléaire", ["Nuclear"]),
      step("Fossile", FOS),
    ],
    closing: { name: "2024", value: sum(row(2024), ALL) },
  };
}
const BRIDGE_CLAIM = {
  takeaway:
    "L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015",
};

const fr = (v: number, d = 0) =>
  v
    .toLocaleString("fr-FR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
    .replace(/[  ]/g, " ");
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

describe("the Stack family registers itself", () => {
  it("should add stack to FAMILIES as additive with the gestures it draws in every format", () => {
    expect((FAMILIES as any).stack).toEqual({
      gestures: expect.arrayContaining([
        "highlight",
        "bracket",
        "compare",
        "reorder",
      ]),
      additive: true,
    });
  });
  it("should give one mark per bar × part, keyed by bar and part", () => {
    const stack: any = stackFromBeat(stackedBeat(), "stacked-bar");
    expect(
      stack.marks.find((m: any) => m.name === `Espagne · ${ADDED}`),
    ).toMatchObject({ key: "Espagne", series: ADDED });
  });
});

describe("stacked-bar on the low-carbon proof", () => {
  const stack: any = stackFromBeat(stackedBeat(), "stacked-bar");
  const spain = stack.valueOf("Espagne", ADDED);
  const france = stack.valueOf("France", ADDED);
  const gestures = [
    { do: "highlight", mark: "Espagne" },
    {
      do: "compare",
      marks: [`Espagne · ${ADDED}`, `France · ${ADDED}`],
      note: `+${fr(spain)} TWh contre +${fr(france)}`,
    },
    {
      do: "annotate",
      mark: "France",
      note: `La France part de ${fr(stack.valueOf("France", LEVEL))} TWh`,
    },
  ];
  const { gestures: valid, subject } = validateStack({
    gestures,
    stack,
    format: "static",
    claim: STACKED_CLAIM,
  });
  const states = foldStack(stack, valid, { subject });

  it("should give the subject bar the accent from the takeaway", () =>
    expect(subject).toBe("Espagne"));
  it("should change the picture at every gesture", () => {
    const keys = states.map((s: any) => JSON.stringify(s));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("should lay the compare's copy from where Spain's addition starts, as long as France's", () => {
    const copy = states.at(-1).copies[0];
    expect(copy.from).toBe(stack.valueOf("Espagne", LEVEL));
    expect(copy.to - copy.from).toBeCloseTo(france, 9);
  });
  it("should check a whole-bar compare's note on the two totals", () => {
    const e = refusal(() =>
      validateStack({
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: `${fr(stack.whole("Espagne"))} contre 500`,
          },
        ],
        stack,
        format: "static",
        claim: STACKED_CLAIM,
      }),
    );
    expect((e.fix as any).set.value).toBe(
      `${fr(stack.whole("Espagne"))} contre ${fr(stack.whole("France"))}`,
    );
  });
  it("should accept a whole-bar compare stating the two totals", () => {
    expect(() =>
      validateStack({
        gestures: [
          {
            do: "compare",
            marks: ["Espagne", "France"],
            note: `${fr(stack.whole("Espagne"))} contre ${fr(stack.whole("France"))}`,
          },
        ],
        stack,
        format: "static",
        claim: STACKED_CLAIM,
      }),
    ).not.toThrow();
  });
  it("should read a bracket of the whole inside one bar as that bar's share", () => {
    const share = (spain / stack.whole("Espagne")) * 100;
    expect(() =>
      validateStack({
        gestures: [
          {
            do: "bracket",
            mark: `Espagne · ${ADDED}`,
            of: "whole",
            note: `${fr(share)} % du total de l’Espagne`,
          },
        ],
        stack,
        format: "static",
        claim: STACKED_CLAIM,
      }),
    ).not.toThrow();
  });
  it("should refuse a bracket share of the bar that is false", () => {
    const share = (spain / stack.whole("Espagne")) * 100;
    expect(
      refusal(() =>
        validateStack({
          gestures: [
            {
              do: "bracket",
              mark: `Espagne · ${ADDED}`,
              of: "whole",
              note: `${fr(share + 9)} % du total`,
            },
          ],
          stack,
          format: "static",
          claim: STACKED_CLAIM,
        }),
      ).field,
    ).toBe("gestures[0].note");
  });
  it("should refuse a rank word a bar's total does not hold, naming the bar that does", () => {
    const e = refusal(() =>
      validateStack({
        gestures: [{ do: "name", mark: "Espagne", note: "la plus grande" }],
        stack,
        format: "static",
        claim: STACKED_CLAIM,
      }),
    );
    expect(e.message).toContain("France is the highest");
  });
  it("should refuse a reorder that names parts (no-change-segment-order) and offer a bar order", () => {
    const e = refusal(() =>
      validateStack({
        gestures: [
          { do: "highlight", mark: "Espagne" },
          { do: "reorder", marks: [`Espagne · ${ADDED}`] },
        ],
        stack,
        format: "static",
        claim: STACKED_CLAIM,
      }),
    );
    expect((e.fix as any).set.value).toEqual({
      do: "reorder",
      value: "descending",
    });
  });
  it("should move whole bars on a reorder by total", () => {
    const { gestures: v, subject: s } = validateStack({
      gestures: [
        { do: "highlight", mark: "Espagne" },
        { do: "reorder", value: "descending" },
      ],
      stack,
      format: "static",
      claim: STACKED_CLAIM,
    });
    expect(foldStack(stack, v, { subject: s }).at(-1).order[0]).toBe("France");
  });
  it("should refuse a second note on one bar on a still plate, and keep the gesture", () => {
    const { gestures: v, subject: s } = validateStack({
      gestures: [
        { do: "highlight", mark: "Espagne", note: "Espagne" },
        {
          do: "compare",
          marks: [`Espagne · ${ADDED}`, `France · ${ADDED}`],
          note: `+${fr(spain)} contre +${fr(france)}`,
        },
      ],
      stack,
      format: "static",
      claim: STACKED_CLAIM,
    });
    const e = refusal(() =>
      composeStackStatic({ gestures: v, stack, subject: s }),
    );
    expect(e.fix).toEqual({
      set: { index: 1, field: "note", value: undefined },
    });
  });
});

describe("diverging-stacked-bar-likert on the electricity-mix proof", () => {
  const stack: any = stackFromBeat(likertBeat(), "diverging-stacked-bar-likert");
  const nuc = stack.valueOf("France", "Nucléaire");
  const rest =
    stack.sideTotal("France", "left") + stack.sideTotal("France", "right");
  const others = [...LEFT, ...RIGHT].map(([, l]) => `France · ${l}`);

  it("should straddle the neutral across the centre", () => {
    expect(stack.segment("France", "Nucléaire")).toEqual([-nuc / 2, nuc / 2]);
  });
  it("should run the left side leftward from the neutral's edge", () => {
    expect(stack.segment("France", "Gaz")[1]).toBe(-nuc / 2);
  });
  it("should accept a compare stating the neutral against the two sides added up, in percent", () => {
    const { gestures } = validateStack({
      gestures: [
        { do: "highlight", mark: "France" },
        {
          do: "compare",
          mark: "France · Nucléaire",
          of: others,
          note: `${fr(nuc, 1)} % contre ${fr(rest, 1)} %`,
        },
      ],
      stack,
      format: "static",
      claim: LIKERT_CLAIM,
    });
    expect(
      foldStack(stack, gestures, { subject: "France" }).at(-1).copies[0].value,
    ).toBeCloseTo(rest, 6);
  });
  it("should refuse a false sum of shares with a fix the next check accepts", () => {
    const list = [{ do: "compare", mark: "France · Nucléaire", of: others, note: `${fr(nuc, 1)} % contre 40,0 %` }];
    const e = refusal(() => validateStack({ gestures: list, stack, format: "static", claim: LIKERT_CLAIM }));
    const fixed = applyFix(list, e.fix);
    expect([fixed[0].note.includes("40,0"), (() => validateStack({ gestures: fixed, stack, format: "static", claim: LIKERT_CLAIM }))().gestures.length]).toEqual([false, 1]);
  });
  it("should accept a side total stated on a bracket in percent", () => {
    const left = stack.sideTotal("France", "left");
    expect(() =>
      validateStack({
        gestures: [
          {
            do: "bracket",
            marks: LEFT.map(([, l]) => `France · ${l}`),
            note: `fossile : ${fr(left, 1)} %`,
          },
        ],
        stack,
        format: "static",
        claim: LIKERT_CLAIM,
      }),
    ).not.toThrow();
  });
  it("should refuse a gesture on a row the takeaway does not name", () => {
    expect(
      refusal(() =>
        validateStack({
          gestures: [
            { do: "highlight", mark: "Poland · Charbon" },
          ],
          stack,
          format: "static",
          claim: LIKERT_CLAIM,
        }),
      ).fix,
    ).toEqual({ remove: 0 });
  });
});

describe("waterfall-bridge on the Germany proof", () => {
  const beat = bridgeBeat();
  const stack: any = stackFromBeat(beat, "waterfall-bridge");
  const net = beat.closing.value - beat.opening.value;

  it("should float each step on the running level", () => {
    const after = beat.opening.value + beat.steps[0].value;
    expect(stack.segment("Nucléaire", "Nucléaire")[1]).toBeCloseTo(after, 9);
  });
  it("should draw the closing level as the sum of the opening and every step", () => {
    expect(stack.closing.value).toBeCloseTo(beat.closing.value, 9);
  });
  it("should accept a bracket over the steps stating the net change as a loss", () => {
    const gestures = [
      {
        do: "bracket",
        marks: ["Renouvelables", "Nucléaire", "Fossile"],
        note: `${fr(-net, 1)} TWh de moins`,
      },
      { do: "name", mark: "Nucléaire" },
    ];
    const { gestures: v } = validateStack({
      gestures,
      stack,
      format: "static",
      claim: BRIDGE_CLAIM,
    });
    const plate = composeStackStatic({ gestures: v, stack });
    expect(plate.brackets[0].value).toBeCloseTo(net, 9);
    expect(plate.rings).toEqual(["Nucléaire"]);
  });
  it("should refuse a false net change", () => {
    expect(
      refusal(() =>
        validateStack({
          gestures: [
            {
              do: "bracket",
              marks: ["Renouvelables", "Nucléaire", "Fossile"],
              note: "120,0 TWh de moins",
            },
          ],
          stack,
          format: "static",
          claim: BRIDGE_CLAIM,
        }),
      ).field,
    ).toBe("gestures[0].note");
  });
  it("should refuse a reorder of a bridge's steps (no-re-anchor-redrawing)", () => {
    expect(
      refusal(() =>
        validateStack({
          gestures: [{ do: "reorder", value: "descending" }],
          stack,
          format: "static",
          claim: BRIDGE_CLAIM,
        }),
      ).fix,
    ).toEqual({ remove: 0 });
  });
  it("should refuse one step bracketed against the whole", () => {
    expect(
      refusal(() =>
        validateStack({
          gestures: [{ do: "bracket", mark: "Fossile", of: "whole" }],
          stack,
          format: "static",
          claim: BRIDGE_CLAIM,
        }),
      ).fix,
    ).toEqual({ remove: 0 });
  });
  it("should turn a gesture on the closing column into the count that prints it", () => {
    const list = [{ do: "name", mark: "2024", note: `${fr(beat.closing.value, 1)} TWh` }];
    const e = refusal(() => validateStack({ gestures: list, stack, format: "static", claim: BRIDGE_CLAIM }));
    expect(e.fix).toEqual({ set: { index: 0, value: { do: "count", note: `${fr(beat.closing.value, 1)} TWh` } } });
  });
  it("should accept the closing level stated by a count", () => {
    expect(() => validateStack({ gestures: [{ do: "count", note: `${fr(beat.closing.value, 1)} TWh` }], stack, format: "static", claim: BRIDGE_CLAIM })).not.toThrow();
  });
  it("should refuse another step's figure stated on one step", () => {
    expect(refusal(() => validateStack({ gestures: [{ do: "name", mark: "Nucléaire", note: `${fr(beat.steps[2].value, 1)} TWh` }], stack, format: "static", claim: BRIDGE_CLAIM })).field).toBe("gestures[0].note");
  });
  it("should refuse a bridge whose steps do not add up to the closing value it gives", () => {
    const broken: any = stackFromBeat(
      { ...beat, closing: { name: "2024", value: beat.closing.value + 20 } },
      "waterfall-bridge",
    );
    expect(() =>
      validateStack({
        gestures: [{ do: "count" }],
        stack: broken,
        format: "static",
        claim: BRIDGE_CLAIM,
      }),
    ).toThrow(/must add up/);
  });
  it("should repair a video list of two into three without inventing a figure", () => {
    const gestures = [
      {
        do: "bracket",
        marks: ["Renouvelables", "Nucléaire", "Fossile"],
        note: `${fr(-net, 1)} TWh de moins`,
      },
      { do: "name", mark: "Nucléaire" },
    ];
    const { claim } = stackClaim(stack, BRIDGE_CLAIM);
    const { gestures: fixed } = repairGestures({
      gestures,
      rows: stack.marks,
      family: "stack",
      format: "video",
      claim,
      hooks: stackHooks(stack),
    });
    expect(fixed.map((g: any) => g.do)).toEqual([
      "bracket",
      "name",
      "pull-back",
    ]);
  });
});
