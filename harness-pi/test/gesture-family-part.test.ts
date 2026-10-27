import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";
import {
  copyShape,
  createPart,
  foldPart,
  layoutPart,
  measureOf,
  orderForBrackets,
  partMarks,
  selectParts,
  validatePart,
} from "../craft/_shared/gesture-family-part.mjs";
import { composePartStatic } from "../craft/_shared/gesture-part-static.mjs";

// The proof examples' data, as the eval seeds freeze it (harness-pi/eval/seeds/gx-<slug>/beats/1/data.json).
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
const col = (data: any, name: string) =>
  data.columns.findIndex((c: any) => c.name === name);

const T = seed("treemap");
const TREEMAP = {
  marks: partMarks(
    "treemap",
    T.rows.map((r: any[]) => ({
      name: r[col(T, "country")],
      value: r[col(T, "low_carbon_mw")] / 1000,
    })),
  ),
  tipped: T.rows
    .filter(
      (r: any[]) =>
        r[col(T, "wind_solar_mw")] / r[col(T, "low_carbon_mw")] > 0.5,
    )
    .map((r: any[]) => r[col(T, "country")]),
  claim: {
    takeaway:
      "10 European countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity.",
  },
};
const M = seed("marimekko-mosaic-plot");
const MARIMEKKO = {
  marks: partMarks(
    "marimekko-mosaic-plot",
    M.rows.map((r: any[]) => ({ column: r[0], segment: r[1], value: r[2] })),
  ),
  claim: {
    takeaway:
      "Coal is 12 % of these six countries' electricity, and almost all of it — 99.5 % — is generated in Germany and Poland.",
  },
};
const D = seed("pie-and-donut");
const DONUT = {
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
};
const OTHER_COAL = [
  "France · Coal",
  "Norway · Coal",
  "Sweden · Coal",
  "Switzerland · Coal",
];

const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};
const stage = (
  variant: string,
  set: any,
  gestures: any[],
  format = "static",
) => {
  const { valid } = validatePart({
    variant,
    gestures,
    marks: set.marks,
    claim: set.claim,
    format,
  });
  return {
    valid,
    plate: composePartStatic({
      variant,
      gestures: valid,
      marks: set.marks,
      format: (v: number) => v.toFixed(1),
    }),
  };
};

describe("the part family registers itself", () => {
  it("should list only the gestures it draws in every format", () => {
    expect(admissible("part", "static").map((a: any) => a.do)).toEqual([
      "highlight",
      "name",
      "annotate",
      "bracket",
      "compare",
      "filter",
      "count",
      "reveal",
      "pull-back",
    ]);
  });

  it("should refuse a gesture the family does not draw (zoom: a part-to-whole has no value axis)", () => {
    const error = refusal(() =>
      validatePart({
        variant: "treemap",
        gestures: [{ do: "zoom", mark: "United Kingdom", note: "×3" }],
        marks: TREEMAP.marks,
        claim: TREEMAP.claim,
        format: "web",
      }),
    );
    expect(error.fix).toEqual({ remove: 0 });
  });
});

describe("treemap on the Europe capacity proof", () => {
  const gestures = [
    { do: "highlight", marks: TREEMAP.tipped },
    {
      do: "bracket",
      marks: TREEMAP.tipped,
      of: "whole",
      note: "14 % of Europe's 469 GW",
    },
    { do: "count", marks: TREEMAP.tipped, note: "10 countries" },
  ];

  it("should accent the ten tipped countries and bracket them as one set", () => {
    const { plate } = stage("treemap", TREEMAP, gestures);
    expect([
      plate.accent.length,
      plate.brackets[0].members.length,
      Math.round(plate.brackets[0].share * 100),
    ]).toEqual([10, 10, 14]);
  });

  it("should end the count on the ten countries' sum", () => {
    const { plate } = stage("treemap", TREEMAP, gestures);
    expect(plate.count?.n).toBe(10);
  });

  it("should refuse a bracket share the parts do not hold, offering the drawn one", () => {
    const error = refusal(() =>
      stage("treemap", TREEMAP, [
        { do: "bracket", marks: TREEMAP.tipped, note: "15 % of the whole" },
      ]),
    );
    expect((error.fix as any).set.value).toBe("14 % of the whole");
  });

  it("should refuse the accent on the largest tile and ring it with name instead", () => {
    const error = refusal(() =>
      stage(
        "treemap",
        {
          ...TREEMAP,
          claim: {
            takeaway: "France holds a fifth of Europe's low-carbon capacity.",
          },
        },
        [{ do: "highlight", mark: "France" }],
      ),
    );
    expect((error.fix as any).set.value).toEqual({
      do: "name",
      mark: "France",
    });
  });

  it("should accept the fixed list once the largest tile is ringed (the fix converges)", () => {
    const list = [{ do: "highlight", mark: "France" }];
    const claim = {
      takeaway: "France holds a fifth of Europe's low-carbon capacity.",
    };
    const error = refusal(() =>
      validatePart({
        variant: "treemap",
        gestures: list,
        marks: TREEMAP.marks,
        claim,
        format: "static",
      }),
    );
    const { valid } = validatePart({
      variant: "treemap",
      gestures: applyFix(list, error.fix),
      marks: TREEMAP.marks,
      claim,
      format: "static",
    });
    expect(valid[0].do).toBe("name");
  });

  it("should ring rather than accent a largest tile the takeaway is about", () => {
    const plate = foldPart({
      variant: "treemap",
      gestures: [{ do: "name", marks: ["France"], subject: "France" }],
      marks: TREEMAP.marks,
    });
    expect(plate.accent.includes("France")).toBe(false);
  });

  it("should drop a set's share written on a highlight, and say a bracket prints it", () => {
    const error = refusal(() =>
      stage("treemap", TREEMAP, [
        { do: "highlight", marks: TREEMAP.tipped, note: "14 % together" },
      ]),
    );
    expect(error.fix).toEqual({
      set: { index: 0, field: "note", value: undefined },
    });
  });

  it("should lay a bracket's set as one block whose area is the set's sum", () => {
    const box = { x: 0, y: 0, w: 900, h: 400 };
    const { parts } = selectParts({
      variant: "treemap",
      marks: TREEMAP.marks,
      gestures: [{ marks: TREEMAP.tipped }],
    });
    const shapes = layoutPart({
      variant: "treemap",
      parts,
      box,
      groups: [TREEMAP.tipped],
    });
    const blockArea = TREEMAP.tipped.reduce(
      (s: number, n: string) => s + measureOf(shapes.get(n)),
      0,
    );
    const whole = parts.reduce((s: number, p: any) => s + p.value, 0);
    const held = TREEMAP.marks
      .filter((m: any) => TREEMAP.tipped.includes(m.name))
      .reduce((s: number, m: any) => s + m.value, 0);
    expect(Math.abs(blockArea / (box.w * box.h) - held / whole)).toBeLessThan(
      1e-6,
    );
  });

  it("should keep one area per unit in every layout (invariants hold on the drawn plate)", () => {
    const part = createPart({
      variant: "treemap",
      marks: TREEMAP.marks,
      box: { x: 0, y: 0, w: 800, h: 450 },
      gestures: [{ marks: TREEMAP.tipped }],
    });
    expect(() => part.invariants(part.relayout(TREEMAP.tipped))).not.toThrow();
  });

  it("should fold what the frame has no room for into one remainder carrying the rest's sum", () => {
    const { parts, rest } = selectParts({
      variant: "treemap",
      marks: TREEMAP.marks,
      gestures: [],
      capacity: 6,
    });
    expect(Math.abs(parts.at(-1).value - rest.sum)).toBeLessThan(1e-9);
  });
});

describe("marimekko on the electricity mix proof", () => {
  const gestures = [
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
  ];

  it("should resolve a segment's name to every cell of it", () => {
    const { valid } = stage("marimekko-mosaic-plot", MARIMEKKO, gestures);
    expect(valid[0].marks.length).toBe(6);
  });

  it("should take the share of the coal (of: the other coal cells), not of the whole", () => {
    const { plate } = stage("marimekko-mosaic-plot", MARIMEKKO, gestures);
    expect(Math.round(plate.brackets[1].share * 1000) / 10).toBe(99.5);
  });

  it("should accept a cell's share of its own column in a note", () => {
    expect(() =>
      stage("marimekko-mosaic-plot", MARIMEKKO, [
        {
          do: "annotate",
          mark: "France · Coal",
          note: "0.2 % of France's mix",
        },
      ]),
    ).not.toThrow();
  });

  it("should refuse a share of the column the cell does not hold", () => {
    const error = refusal(() =>
      stage("marimekko-mosaic-plot", MARIMEKKO, [
        {
          do: "annotate",
          mark: "France · Coal",
          note: "0.3 % of France's mix",
        },
      ]),
    );
    expect(error.field).toBe("gestures[0].note");
  });

  it("should read the claim's columns and segments as its entities (a gesture on a coal cell serves a coal takeaway)", () => {
    const error = refusal(() =>
      stage("marimekko-mosaic-plot", MARIMEKKO, [
        { do: "annotate", mark: "France · Nuclear", note: "380.5" },
      ]),
    );
    expect(error.message).toContain("does not serve the takeaway");
  });

  it("should keep a bracket's cells together in the order the core reads (Germany and Poland's coal adjacent)", () => {
    const order = orderForBrackets(
      "marimekko-mosaic-plot",
      MARIMEKKO.marks,
      gestures,
    ).map((m: any) => m.name);
    expect(
      order.indexOf("Poland · Coal") - order.indexOf("Germany · Coal"),
    ).toBe(1);
  });

  it("should lay a compare's copy at the plate's one area per unit", () => {
    const box = { x: 0, y: 0, w: 800, h: 400 };
    const shapes = layoutPart({
      variant: "marimekko-mosaic-plot",
      parts: MARIMEKKO.marks,
      box,
    });
    const v = (n: string) =>
      (MARIMEKKO.marks.find((m: any) => m.name === n) as any).value;
    const copy = copyShape({
      variant: "marimekko-mosaic-plot",
      shapes,
      onto: "Germany · Coal",
      value: v("Poland · Coal"),
      ontoValue: v("Germany · Coal"),
      box,
    });
    expect(
      Math.abs(measureOf(copy) - measureOf(shapes.get("Poland · Coal"))),
    ).toBeLessThan(1e-6);
  });
});

describe("donut on the world CO2 proof", () => {
  const gestures = [
    { do: "highlight", mark: "China" },
    { do: "name", mark: "United States", note: "13.3 % of the world" },
    {
      do: "compare",
      marks: ["China", "United States"],
      note: "32.9 %, 2.5 times the United States",
    },
  ];

  it("should accent China, ring the United States and lay the copy on China", () => {
    const { plate } = stage("pie-and-donut", DONUT, gestures);
    expect([
      plate.accent,
      plate.rings,
      plate.copies.map((c: any) => c.onto),
    ]).toEqual([["China"], ["United States"], ["China"]]);
  });

  it("should draw the whole ring as every row, the rest folded into one arc", () => {
    const { parts } = selectParts({
      variant: "pie-and-donut",
      marks: DONUT.marks,
      gestures: [{ marks: ["China", "United States"] }],
    });
    const shapes = layoutPart({
      variant: "pie-and-donut",
      parts,
      box: { x: 0, y: 0, w: 400, h: 400 },
    });
    const turn = parts.reduce(
      (s: number, p: any) => s + measureOf(shapes.get(p.name)),
      0,
    );
    expect(Math.abs(turn - Math.PI * 2)).toBeLessThan(1e-9);
  });

  it("should refuse a share no part holds, offering the drawn one", () => {
    const error = refusal(() =>
      stage("pie-and-donut", DONUT, [
        { do: "name", mark: "United States", note: "15 % of the world" },
      ]),
    );
    expect((error.fix as any).set.value).toBe("13 % of the world");
  });

  it("should refuse 'three times' when China is 2.5 times the United States", () => {
    const error = refusal(() =>
      stage("pie-and-donut", DONUT, [
        {
          do: "compare",
          marks: ["China", "United States"],
          note: "three times the United States",
        },
      ]),
    );
    expect(error.field).toBe("gestures[0].note");
  });

  it("should refuse a compare against a set holding its own subject, offering a bracket of the whole", () => {
    const error = refusal(() =>
      stage("pie-and-donut", DONUT, [
        { do: "compare", mark: "China", of: ["China", "United States"] },
      ]),
    );
    expect((error.fix as any).set.value).toEqual({
      do: "bracket",
      mark: "China",
      of: "whole",
    });
  });

  it("should refuse a second note on one part, every note being drawn at once on a still", () => {
    const error = refusal(() =>
      stage("pie-and-donut", DONUT, [
        { do: "name", mark: "China", note: "12.2" },
        { do: "annotate", mark: "China", note: "32.9 %" },
      ]),
    );
    expect(error.field).toBe("gestures[1]");
  });

  it("should refuse a second compare copy on one part on a still", () => {
    const error = refusal(() =>
      stage("pie-and-donut", DONUT, [
        { do: "compare", marks: ["China", "United States"] },
        { do: "compare", marks: ["China", "India"] },
      ]),
    );
    expect(error.fix).toEqual({ remove: 1 });
  });

  it("should never refuse the data's shape: one part, or a zero part, still lays out", () => {
    const marks = partMarks("pie-and-donut", [
      { name: "A", value: 3 },
      { name: "B", value: 0 },
    ]);
    expect(
      layoutPart({
        variant: "pie-and-donut",
        parts: marks,
        box: { x: 0, y: 0, w: 100, h: 100 },
      }).size,
    ).toBe(2);
  });

  it("should refuse a negative part naming the row (no layout draws it truthfully)", () => {
    expect(() =>
      partMarks("treemap", [
        { name: "A", value: 3 },
        { name: "B", value: -1 },
      ]),
    ).toThrow(/B = -1/);
  });
});
