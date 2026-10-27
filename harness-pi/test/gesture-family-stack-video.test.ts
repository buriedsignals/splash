import { describe, expect, it } from "bun:test";
import { applyFix, GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import {
  stackFromBeat,
  validateStack,
} from "../craft/_shared/gesture-family-stack.mjs";
import {
  EVENTS,
  fieldAt,
  sceneAt,
  scheduleStackVideo,
} from "../craft/_shared/gesture-stack-video.mjs";

// The proof examples' drawn values (proof/static-stacked-bar-lowcarbon-growth, static-diverging-stacked-electricity,
// static-germany-electricity-bridge), as the beats compute them.
const LEVEL = "produit en 2000";
const ADDED = "ajouté depuis";
const STACKED = stackFromBeat(
  {
    rows: [
      { name: "Espagne", parts: { [LEVEL]: 97.2, [ADDED]: 118.6 } },
      { name: "Royaume-Uni", parts: { [LEVEL]: 95.1, [ADDED]: 90.2 } },
      { name: "Allemagne", parts: { [LEVEL]: 205.3, [ADDED]: 85.9 } },
      { name: "France", parts: { [LEVEL]: 483.1, [ADDED]: 50.2 } },
    ],
    parts: [LEVEL, ADDED],
  },
  "stacked-bar",
);
const STACKED_CLAIM = {
  takeaway:
    "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000",
  entity: "Espagne",
  versus: "France",
  unit: "TWh",
};

const LEFT = ["Gaz", "Pétrole", "Charbon"];
const RIGHT = ["Hydraulique", "Éolien"];
const LIKERT = stackFromBeat(
  {
    rows: [
      {
        name: "Pologne",
        parts: {
          Gaz: 10.8,
          Pétrole: 3.8,
          Charbon: 54.3,
          Nucléaire: 0,
          Hydraulique: 1.4,
          Éolien: 29.7,
        },
      },
      {
        name: "France",
        parts: {
          Gaz: 3.3,
          Pétrole: 1.7,
          Charbon: 0.1,
          Nucléaire: 67.7,
          Hydraulique: 13.4,
          Éolien: 13.8,
        },
      },
      {
        name: "Norvège",
        parts: {
          Gaz: 1.2,
          Pétrole: 0.1,
          Charbon: 0.1,
          Nucléaire: 0,
          Hydraulique: 88.8,
          Éolien: 9.8,
        },
      },
    ],
    left: LEFT,
    right: RIGHT,
    centre: "Nucléaire",
  },
  "diverging-stacked-bar-likert",
);
const LIKERT_CLAIM = {
  takeaway:
    "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis",
  entity: "France",
  unit: "%",
};
const FRANCE_OTHERS = [...LEFT, ...RIGHT].map((p) => `France · ${p}`);

const BRIDGE = stackFromBeat(
  {
    opening: { name: "2015", value: 639.2 },
    steps: [
      { name: "Renouvelables", value: 102.7 },
      { name: "Nucléaire", value: -91.8 },
      { name: "Fossile", value: -154.1 },
    ],
    closing: { name: "2024" },
  },
  "waterfall-bridge",
);
const BRIDGE_CLAIM = {
  takeaway:
    "L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015",
  unit: "TWh",
};

const schedule = (stack: any, claim: any, gestures: any[]): any => {
  const { gestures: valid, subject } = validateStack({
    gestures,
    stack,
    format: "video",
    claim,
  });
  return {
    ...scheduleStackVideo({ gestures: valid, stack, subject }),
    subject,
  };
};
const differ = (a: any, b: any) =>
  Object.keys({ ...a, ...b }).some((k) => a[k] !== b[k]);

const TYPES = [
  {
    name: "stacked-bar",
    stack: STACKED,
    claim: STACKED_CLAIM,
    gestures: [
      { do: "highlight", mark: "Espagne" },
      {
        do: "compare",
        marks: [`Espagne · ${ADDED}`, `France · ${ADDED}`],
        note: "+119 TWh contre +50",
      },
      { do: "annotate", mark: "France", note: "La France part de 483 TWh" },
    ],
  },
  {
    name: "diverging-stacked-bar-likert",
    stack: LIKERT,
    claim: LIKERT_CLAIM,
    gestures: [
      { do: "highlight", mark: "France" },
      {
        do: "compare",
        mark: "France · Nucléaire",
        of: FRANCE_OTHERS,
        note: "67,7 % contre 32,3 %",
      },
      { do: "name", mark: "Pologne", note: "Pologne : 68,9 % de fossile" },
    ],
  },
  {
    name: "waterfall-bridge",
    stack: BRIDGE,
    claim: BRIDGE_CLAIM,
    gestures: [
      {
        do: "bracket",
        marks: ["Renouvelables", "Nucléaire", "Fossile"],
        note: "143,2 TWh de moins",
      },
      { do: "name", mark: "Nucléaire", note: "Sortie du nucléaire : −91,8" },
      {
        do: "compare",
        marks: ["Fossile", "Renouvelables"],
        note: "−154,1 pour le fossile, +102,7 pour les renouvelables",
      },
    ],
  },
];

describe("the Stack video scheduler", () => {
  for (const t of TYPES) {
    describe(t.name, () => {
      it("should give each of the three gesture events a state of its own", () => {
        const { states } = schedule(t.stack, t.claim, t.gestures);
        expect([
          differ(states[1], states[2]),
          differ(states[2], states[3]),
          differ(states[3], states[4]),
        ]).toEqual([true, true, true]);
      });
      it("should land the gestures in story order on reveal, subject and conclusion", () => {
        const { plan } = schedule(t.stack, t.claim, t.gestures);
        expect(plan.map((p: any) => `${p.event} ${p.do}`)).toEqual(
          t.gestures.map(
            (g, k) => `${["reveal", "subject", "conclusion"][k]} ${g.do}`,
          ),
        );
      });
      it("should refuse two gestures with a fix that adds a pull-back the scheduler then accepts", () => {
        const two = t.gestures.slice(0, 2);
        let fix: any;
        try {
          validateStack({
            gestures: two,
            stack: t.stack,
            format: "video",
            claim: t.claim,
          });
        } catch (error) {
          if (error instanceof GestureRefusal) fix = error.fix;
        }
        expect(
          schedule(t.stack, t.claim, applyFix(two, fix)).plan.at(-1).do,
        ).toBe("pull-back");
      });
    });
  }

  it("should refuse a compare note whose figure the two lengths do not give", () => {
    const wrong = [
      TYPES[0].gestures[0],
      { ...TYPES[0].gestures[1], note: "+119 TWh contre +70" },
      TYPES[0].gestures[2],
    ];
    expect(() =>
      validateStack({
        gestures: wrong,
        stack: STACKED,
        format: "video",
        claim: STACKED_CLAIM,
      }),
    ).toThrow(/gestures\[1\]\.note/);
  });

  it("should release a filter in the conclusion so the whole chart shows", () => {
    const { states } = schedule(STACKED, STACKED_CLAIM, [
      { do: "highlight", mark: "Espagne" },
      { do: "filter", marks: ["Espagne", "France"] },
      { do: "annotate", mark: "France", note: "La France part de 483 TWh" },
    ]);
    const conclusion = states[EVENTS.indexOf("conclusion")];
    expect(
      STACKED.names.map((_: string, i: number) => conclusion[`back${i}`]),
    ).toEqual([0, 0, 0, 0]);
  });

  it("should step the other bars back while the filter is the subject event", () => {
    const { states } = schedule(STACKED, STACKED_CLAIM, [
      { do: "highlight", mark: "Espagne" },
      { do: "filter", marks: ["Espagne", "France"] },
      { do: "annotate", mark: "France", note: "La France part de 483 TWh" },
    ]);
    expect(
      STACKED.names.map(
        (_: string, i: number) => states[EVENTS.indexOf("subject")][`back${i}`],
      ),
    ).toEqual([0, 1, 1, 0]);
  });

  it("should refuse a pull-back before the conclusion when nothing is filtered", () => {
    expect(() =>
      schedule(STACKED, STACKED_CLAIM, [
        { do: "pull-back" },
        { do: "highlight", mark: "Espagne" },
        { do: "annotate", mark: "France", note: "La France part de 483 TWh" },
      ]),
    ).toThrow(/no filter to return from/);
  });

  it("should refuse a reorder into the order the bars already hold", () => {
    const descending = stackFromBeat(
      {
        rows: [
          { name: "France", parts: { a: 9, b: 1 } },
          { name: "Espagne", parts: { a: 1, b: 2 } },
        ],
        parts: ["a", "b"],
      },
      "stacked-bar",
    );
    expect(() =>
      schedule(descending, STACKED_CLAIM, [
        { do: "reorder", value: "descending" },
        { do: "highlight", mark: "Espagne" },
        { do: "annotate", mark: "France", note: "10" },
      ]),
    ).toThrow(/already hold/);
  });

  it("should bring the subject's accent with its highlight rather than before it", () => {
    const { states } = schedule(STACKED, STACKED_CLAIM, TYPES[0].gestures);
    expect([
      states[EVENTS.indexOf("reference")].accent0,
      states[EVENTS.indexOf("reveal")].accent0,
    ]).toEqual([0, 1]);
  });

  it("should refuse reordering a bridge's steps", () => {
    expect(() =>
      schedule(BRIDGE, BRIDGE_CLAIM, [
        { do: "reorder", value: "descending" },
        TYPES[2].gestures[1],
        TYPES[2].gestures[2],
      ]),
    ).toThrow(/story order/);
  });

  it("should climb a bridge bracket's figure to the net change", () => {
    const { plan } = schedule(BRIDGE, BRIDGE_CLAIM, TYPES[2].gestures);
    expect(Math.round(plan[0].steps.at(-1) * 10) / 10).toBe(-143.2);
  });

  it("should grow the parts in their locked order while the chart arrives", () => {
    const { states, windows, linear, plan } = schedule(
      STACKED,
      STACKED_CLAIM,
      TYPES[0].gestures,
    );
    const props: any = {
      states,
      windows,
      linear,
      plan,
      timing: {
        fps: 30,
        total: 636,
        establish: { start: 0, duration: 90 },
        reference: { start: 96, duration: 60 },
        reveal: { start: 156, duration: 120 },
        subject: { start: 276, duration: 120 },
        conclusion: { start: 396, duration: 150 },
        hold: { start: 546, duration: 90 },
      },
    };
    // Halfway through the arrival's ink window the first part is whole and the second not yet begun.
    const ink = fieldAt(props, "ink", 96 + Math.round(60 * 0.575));
    expect(ink).toBeGreaterThan(0.45);
    expect(ink).toBeLessThan(0.55);
    expect(typeof sceneAt).toBe("function");
  });
});
