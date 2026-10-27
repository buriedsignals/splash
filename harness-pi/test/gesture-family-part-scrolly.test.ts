import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import {
  partMarks,
  validatePart,
} from "../craft/_shared/gesture-family-part.mjs";
import {
  APPLY,
  driveData,
  driveSource,
  schedulePartScrolly,
  stagePartScrolly,
} from "../craft/_shared/gesture-part-scrolly.mjs";

const seed = (slug: string) =>
  JSON.parse(
    readFileSync(
      join(
        import.meta.dir,
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
const T = seed("treemap");
const M = seed("marimekko-mosaic-plot");
const D = seed("pie-and-donut");
const one = (v: number) => v.toFixed(1);

const CASES: Record<string, { marks: any[]; claim: any; gestures: any[] }> = {
  treemap: (() => {
    const tipped = T.rows
      .filter((r: any[]) => r[2] / r[1] > 0.5)
      .map((r: any[]) => r[0]);
    return {
      marks: partMarks(
        "treemap",
        T.rows.map((r: any[]) => ({ name: r[0], value: r[1] / 1000 })),
      ),
      claim: {
        takeaway:
          "10 European countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity.",
      },
      gestures: [
        {
          do: "highlight",
          marks: tipped,
          card: "In colour, the 10 countries where wind and solar lead: 65.8 GW between them.",
        },
        {
          do: "bracket",
          marks: tipped,
          of: "whole",
          card: "Laid together, they hold 14 % of the continent's 469 GW.",
        },
        { do: "count", marks: tipped, card: "10 countries in all." },
      ],
    };
  })(),
  "marimekko-mosaic-plot": {
    marks: partMarks(
      "marimekko-mosaic-plot",
      M.rows.map((r: any[]) => ({ column: r[0], segment: r[1], value: r[2] })),
    ),
    claim: {
      takeaway:
        "Coal is 12 % of these six countries' electricity, and almost all of it — 99.5 % — is generated in Germany and Poland.",
    },
    gestures: [
      { do: "highlight", mark: "Coal", card: "Coal, in colour: 200.9 TWh." },
      {
        do: "bracket",
        mark: "Coal",
        of: "whole",
        card: "That is 12.3 % of all the electricity the six generated.",
      },
      {
        do: "bracket",
        marks: ["Germany · Coal", "Poland · Coal"],
        of: [
          "France · Coal",
          "Norway · Coal",
          "Sweden · Coal",
          "Switzerland · Coal",
        ],
        card: "And 99.5 % of that coal is burnt in Germany and Poland.",
      },
    ],
  },
  "pie-and-donut": {
    marks: partMarks(
      "pie-and-donut",
      D.rows.map((r: any[]) => ({ name: r[0], value: (r[2] * r[3]) / 1e9 })),
    ),
    claim: {
      takeaway:
        "China emitted 32.9 % of the world's CO2 in 2023, more than twice the United States' 13.3 %.",
      entity: "China",
      versus: "United States",
    },
    gestures: [
      {
        do: "highlight",
        mark: "China",
        card: "China, in colour: 32.9 % of the world's CO2.",
      },
      { do: "name", mark: "United States", card: "The United States: 13.3 %." },
      {
        do: "compare",
        marks: ["China", "United States"],
        card: "Laid inside China's arc, the United States' 4.9 Gt: China emits 2.5 times as much.",
      },
    ],
  },
};

const stage = (variant: string, gestures = CASES[variant].gestures) => {
  const { marks, claim } = CASES[variant];
  const { valid } = validatePart({
    variant,
    gestures,
    marks,
    claim,
    format: "scrolly",
  });
  return stagePartScrolly({ variant, valid, marks, format: one });
};
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

for (const variant of Object.keys(CASES)) {
  describe(`${variant} scrolly on its proof`, () => {
    it("should give one state per card and the closing card, each different from the one before", () => {
      const { states } = stage(variant).scheduled;
      const distinct = states.every(
        (s: any, k: number) =>
          k === 0 || JSON.stringify(s) !== JSON.stringify(states[k - 1]),
      );
      expect([states.length, distinct]).toEqual([
        CASES[variant].gestures.length + 1,
        true,
      ]);
    });

    it("should hold every state as finite numbers", () => {
      const { states } = stage(variant).scheduled;
      expect(
        states.every((s: any) =>
          Object.values(s).every(
            (v) => typeof v === "number" && Number.isFinite(v),
          ),
        ),
      ).toBe(true);
    });

    it("should land each gesture on its own card (its progress reaches 1 there)", () => {
      const { states } = stage(variant).scheduled;
      expect(
        CASES[variant].gestures.every(
          (_, k) =>
            states[k][`g${k}`] === 1 &&
            (k === 0 || states[k - 1][`g${k}`] === 0),
        ),
      ).toBe(true);
    });

    it("should refuse a card stating a figure its picture does not hold, with a fix", () => {
      const gestures = structuredClone(CASES[variant].gestures);
      gestures[0].card = `${gestures[0].card} 777.7 of it.`;
      const error = refusal(() => stage(variant, gestures));
      expect([error.field, "set" in (error.fix as any)]).toEqual([
        "gestures[0].card",
        true,
      ]);
    });
  });
}

describe("the part scrolly's family rules", () => {
  it("should accent the parts a highlight marks and keep them marked on the closing card", () => {
    const { scheduled } = stage("pie-and-donut");
    const china = scheduled.parts.findIndex((p: any) => p.name === "China");
    expect([
      scheduled.states[0][`a${china}`],
      scheduled.states.at(-1)[`a${china}`],
    ]).toEqual([1, 1]);
  });

  it("should never accent a treemap's largest tile, even when the takeaway is about it", () => {
    const marks = CASES.treemap.marks;
    const { valid } = validatePart({
      variant: "treemap",
      gestures: [{ do: "name", mark: "France", card: "France: 97.2 GW." }],
      marks,
      claim: { takeaway: "France holds 97.2 GW." },
      format: "scrolly",
    });
    const { states, parts } = schedulePartScrolly({
      variant: "treemap",
      gestures: valid,
      marks,
    });
    const france = parts.findIndex((p: any) => p.name === "France");
    expect([states[0][`a${france}`], states[0][`r${france}`]]).toEqual([0, 1]);
  });

  it("should release a filter on the closing card", () => {
    const { marks, claim } = CASES["pie-and-donut"];
    const { valid } = validatePart({
      variant: "pie-and-donut",
      gestures: [
        {
          do: "filter",
          marks: ["China", "United States"],
          card: "China and the United States: 17.1 Gt.",
        },
      ],
      marks,
      claim,
      format: "scrolly",
    });
    const { states, parts } = schedulePartScrolly({
      variant: "pie-and-donut",
      gestures: valid,
      marks,
    });
    const india = parts.findIndex((p: any) => p.name === "India");
    expect([states[0][`b${india}`], states.at(-1)[`b${india}`]]).toEqual([
      1, 0,
    ]);
  });

  it("should refuse 'twice' on a card whose picture draws no ratio", () => {
    const gestures = structuredClone(CASES["pie-and-donut"].gestures);
    gestures[1].card = "The United States: 13.3 %, half of China.";
    const error = refusal(() => stage("pie-and-donut", gestures));
    expect(error.field).toBe("gestures[1].card");
  });

  it("should embed every bracket's set as one group for the drive (the layout keeps it together on every card)", () => {
    const { scheduled } = stage("treemap");
    const data = driveData({
      variant: "treemap",
      parts: scheduled.parts,
      groups: scheduled.groups,
      plan: scheduled.plan,
      format: one,
      restText: "",
    });
    expect(data.groups[0].length).toBe(10);
  });

  it("should emit a drive that is one self-contained function (it compiles and runs alone)", () => {
    const fn = new Function(`${driveSource()}; return ${APPLY};`)();
    expect(() => fn({ querySelector: () => null }, {}, {})).not.toThrow();
  });
});
