import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import {
  layoutPart,
  measureOf,
  partMarks,
  validatePart,
} from "../craft/_shared/gesture-family-part.mjs";
import {
  EVENTS,
  fieldAt,
  partSceneAt,
  schedulePartVideo,
} from "../craft/_shared/gesture-part-video.mjs";

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
const tipped = T.rows
  .filter((r: any[]) => r[2] / r[1] > 0.5)
  .map((r: any[]) => r[0]);
const OTHER_COAL = [
  "France · Coal",
  "Norway · Coal",
  "Sweden · Coal",
  "Switzerland · Coal",
];

const CASES: Record<string, { marks: any[]; claim: any; gestures: any[] }> = {
  treemap: {
    marks: partMarks(
      "treemap",
      T.rows.map((r: any[]) => ({ name: r[0], value: r[1] / 1000 })),
    ),
    claim: {
      takeaway:
        "10 European countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity.",
    },
    gestures: [
      { do: "highlight", marks: tipped },
      {
        do: "bracket",
        marks: tipped,
        of: "whole",
        note: "14 % of Europe's 469 GW",
      },
      { do: "count", marks: tipped, note: "10 countries" },
    ],
  },
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
      { do: "highlight", mark: "Coal" },
      {
        do: "bracket",
        mark: "Coal",
        of: "whole",
        note: "200.9 TWh, 12.3 % of all",
      },
      {
        do: "bracket",
        marks: ["Germany · Coal", "Poland · Coal"],
        of: OTHER_COAL,
        note: "99.5 % of the coal",
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
      { do: "highlight", mark: "China" },
      { do: "name", mark: "United States", note: "13.3 % of the world" },
      {
        do: "compare",
        marks: ["China", "United States"],
        note: "32.9 %, 2.5 times the United States",
      },
    ],
  },
};
const TIMING = {
  fps: 30,
  total: 636,
  establish: { start: 0, duration: 90 },
  reference: { start: 96, duration: 60 },
  reveal: { start: 156, duration: 120 },
  subject: { start: 276, duration: 120 },
  conclusion: { start: 396, duration: 150 },
  hold: { start: 546, duration: 90 },
};
const schedule = (variant: string, gestures = CASES[variant].gestures) => {
  const { marks, claim } = CASES[variant];
  const { valid } = validatePart({
    variant,
    gestures,
    marks,
    claim,
    format: "video",
  });
  return schedulePartVideo({ variant, gestures: valid, marks });
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
/** The props a frame reads, without the Bun layout: shapes from the family layout in a unit box. */
const propsOf = (variant: string, s: any) => {
  const box = { x: 0, y: 0, w: 1000, h: 500 };
  const shapes = layoutPart({ variant, parts: s.parts, box, groups: s.groups });
  return {
    variant,
    box,
    parts: s.parts.map((p: any, i: number) => ({
      name: p.name,
      value: p.value,
      rank: i,
      shape: shapes.get(p.name),
    })),
    plan: s.plan,
    outlines: [],
    captions: [],
    states: s.states,
    windows: s.windows,
    linear: s.linear,
    timing: TIMING,
    hasReveal: false,
  };
};

for (const variant of Object.keys(CASES)) {
  describe(`${variant} video on its proof`, () => {
    it("should give the six events six states, each gesture's event different from the one before", () => {
      const { states } = schedule(variant);
      const differs = [2, 3, 4].every(
        (k) => JSON.stringify(states[k]) !== JSON.stringify(states[k - 1]),
      );
      expect([states.length, differs]).toEqual([EVENTS.length, true]);
    });

    it("should place the three gestures in reveal, subject and conclusion, in story order", () => {
      expect(
        schedule(variant).plan.map((p: any) => `${p.event} ${p.do}`),
      ).toEqual(
        CASES[variant].gestures.map(
          (g, k) => `${["reveal", "subject", "conclusion"][k]} ${g.do}`,
        ),
      );
    });

    it("should bring the credit in the conclusion", () => {
      const { states } = schedule(variant);
      expect([states[3].source, states[4].source]).toEqual([0, 1]);
    });

    it("should refuse a list that is not three gestures, offering to add one", () => {
      const error = refusal(() =>
        schedule(variant, CASES[variant].gestures.slice(0, 2)),
      );
      expect(error.field).toBe("gestures");
    });
  });
}

describe("the part video's family rules", () => {
  it("should refuse a filter in the conclusion and offer pull-back (the conclusion shows the whole)", () => {
    const gestures = [
      ...CASES["pie-and-donut"].gestures.slice(0, 2),
      { do: "filter", marks: ["China", "United States"] },
    ];
    const error = refusal(() => schedule("pie-and-donut", gestures));
    expect((error.fix as any).set.value).toEqual({ do: "pull-back" });
  });

  it("should release an earlier filter in the conclusion", () => {
    const gestures = [
      { do: "filter", marks: ["China", "United States"] },
      CASES["pie-and-donut"].gestures[1],
      { do: "pull-back" },
    ];
    const s = schedule("pie-and-donut", gestures);
    const india = s.parts.findIndex((p: any) => p.name === "India");
    expect([s.states[2][`b${india}`], s.states[4][`b${india}`]]).toEqual([
      1, 0,
    ]);
  });

  it("should refuse a pull-back before the conclusion that has nothing to return from", () => {
    const gestures = [
      CASES["pie-and-donut"].gestures[0],
      { do: "pull-back" },
      CASES["pie-and-donut"].gestures[2],
    ];
    const error = refusal(() => schedule("pie-and-donut", gestures));
    expect(error.fix).toEqual({ remove: 1 });
  });

  it("should grow a compare's copy to the compared part's exact angle at the end of its event", () => {
    const s = schedule("pie-and-donut");
    const props = propsOf("pie-and-donut", s);
    const end = TIMING.conclusion.start + TIMING.conclusion.duration;
    const copy = partSceneAt(props, end).copies[0].shape;
    const us = props.parts.find((p: any) => p.name === "United States").shape;
    expect(Math.abs(measureOf(copy) - measureOf(us))).toBeLessThan(1e-9);
  });

  it("should never move a part between events (one layout, one area per unit)", () => {
    const s = schedule("treemap");
    const props = propsOf("treemap", s);
    const before = JSON.stringify(props.parts.map((p: any) => p.shape));
    for (const frame of [0, 200, 400, 600]) partSceneAt(props, frame);
    expect(JSON.stringify(props.parts.map((p: any) => p.shape))).toBe(before);
  });

  it("should climb a count's field linearly over its event", () => {
    const s = schedule("treemap");
    const props = propsOf("treemap", s);
    const mid =
      TIMING.conclusion.start + Math.round(TIMING.conclusion.duration * 0.55);
    const g = fieldAt(props, "g2", mid);
    expect(g > 0.2 && g < 0.9).toBe(true);
  });
});
