// The Part-to-whole family's WEB scheduler, on each type's proof data (harness-pi/eval/seeds/gx-<slug>/beats/1/data.json).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import {
  partMarks,
  REST,
} from "../craft/_shared/gesture-family-part.mjs";
import {
  schedulePartWeb,
  stagePartWeb,
} from "../craft/_shared/gesture-part-web.mjs";

const SEEDS = join(import.meta.dir, "..", "eval", "seeds");
const table = (slug: string) =>
  JSON.parse(
    readFileSync(join(SEEDS, `gx-${slug}`, "beats", "1", "data.json"), "utf8"),
  );
const col = (t: any, name: string) =>
  t.columns.findIndex((c: any) => c.name === name);
const one = (v: number) => v.toFixed(1);

const treemap = (() => {
  const t = table("treemap");
  const [C, MW, WS] = [
    col(t, "country"),
    col(t, "low_carbon_mw"),
    col(t, "wind_solar_mw"),
  ];
  const marks = partMarks(
    "treemap",
    t.rows.map((r: any[]) => ({ name: r[C], value: r[MW] / 1000 })),
  );
  const tipped = t.rows
    .filter((r: any[]) => r[WS] / r[MW] > 0.5)
    .map((r: any[]) => r[C]);
  return {
    marks,
    tipped,
    claim: {
      takeaway:
        "10 European countries have already tipped to wind and solar; together they hold 14 % of the continent's low-carbon capacity.",
    },
    format: (v: number) => `${one(v)} GW`,
  };
})();
const mosaic = (() => {
  const t = table("marimekko-mosaic-plot");
  const [C, S, V] = [col(t, "country"), col(t, "source"), col(t, "twh")];
  const marks = partMarks(
    "marimekko-mosaic-plot",
    t.rows.map((r: any[]) => ({ column: r[C], segment: r[S], value: r[V] })),
  );
  return {
    marks,
    claim: {
      takeaway:
        "Coal is 12 % of these six countries' electricity, and almost all of it — 99.5 % — is generated in Germany and Poland.",
    },
    format: (v: number) => `${one(v)} TWh`,
  };
})();
const donut = (() => {
  const t = table("pie-and-donut");
  const [N, P, Q] = [
    col(t, "entity"),
    col(t, "t_per_person_2023"),
    col(t, "population_2023"),
  ];
  const marks = partMarks(
    "pie-and-donut",
    t.rows.map((r: any[]) => ({ name: r[N], value: (r[P] * r[Q]) / 1e9 })),
  );
  return {
    marks,
    claim: {
      takeaway:
        "China emitted 32.9 % of the world's CO2 in 2023, more than twice the United States' 13.3 %.",
    },
    format: (v: number) => `${one(v)} Gt`,
  };
})();

const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error as GestureRefusal;
  }
  return null;
};
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

describe("treemap on the web", () => {
  const gestures = [
    { do: "highlight", marks: treemap.tipped },
    { do: "count", marks: treemap.tipped, note: "10 countries" },
    {
      do: "bracket",
      marks: treemap.tipped,
      of: "whole",
      note: "14 % of Europe's 469 GW",
    },
  ];
  const staged = stagePartWeb({
    variant: "treemap",
    gestures,
    marks: treemap.marks,
    claim: treemap.claim,
    format: treemap.format,
  });

  it("should rest the highlight and the count, and make the bracket the one control", () => {
    expect(staged.scheduled.controls.map((c: any) => c.do)).toEqual([
      "bracket",
    ]);
  });
  it("should draw the bracket only on its control's picture, distinct from the resting one", () => {
    const [c] = staged.scheduled.controls;
    expect([
      staged.scheduled.resting.brackets.length,
      c.picture.brackets.length,
      same(c.picture, staged.scheduled.resting),
    ]).toEqual([0, 1, false]);
  });
  it("should lay the bracket's parts together as one block (relayout group)", () => {
    expect(staged.scheduled.controls[0].groups[0].length).toBe(10);
  });
  it("should print the set's share of the whole in the control's pieces", () => {
    expect(staged.scheduled.controls[0].pieces.join(" ")).toContain("14.0 %");
  });
  it("should keep the accent on the ten tipped countries at rest", () => {
    expect(staged.scheduled.resting.accent.length).toBe(10);
  });
  it("should declare ask-a-mark and one control in the interaction plan", () => {
    expect(staged.interaction.controls.map((c: any) => c.gesture)).toEqual([
      "ask-a-mark",
      "toggle-a-comparison",
    ]);
  });
  it("should refuse a bracket that states a share the set does not hold", () => {
    const e = refusal(() =>
      stagePartWeb({
        variant: "treemap",
        gestures: [gestures[0], { ...gestures[2], note: "18 % of the whole" }],
        marks: treemap.marks,
        claim: treemap.claim,
        format: treemap.format,
      }),
    );
    expect(e?.field).toBe("gestures[1].note");
  });
  it("should refuse a page whose every gesture rests (no reading a still lacks)", () => {
    const e = refusal(() =>
      stagePartWeb({
        variant: "treemap",
        gestures: gestures.slice(0, 2),
        marks: treemap.marks,
        claim: treemap.claim,
        format: treemap.format,
      }),
    );
    expect(e?.field).toBe("gestures");
  });
});

describe("marimekko on the web", () => {
  const coal = mosaic.marks
    .filter((m: any) => m.series === "Coal")
    .map((m: any) => m.name);
  const others = coal.filter((n: string) => !/Germany|Poland/.test(n));
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
      of: others,
      note: "99.5 % of the coal",
    },
  ];
  const staged = stagePartWeb({
    variant: "marimekko-mosaic-plot",
    gestures,
    marks: mosaic.marks,
    claim: mosaic.claim,
    format: mosaic.format,
  });

  it("should make each bracket its own control", () => {
    expect(staged.scheduled.controls.map((c: any) => c.index)).toEqual([1, 2]);
  });
  it("should give the two controls distinct pictures", () => {
    const [a, b] = staged.scheduled.controls;
    expect(same(a.picture.brackets, b.picture.brackets)).toBe(false);
  });
  it("should measure the two-country bracket against the coal, not the whole", () => {
    expect(staged.scheduled.controls[1].pieces.join(" ")).toContain("99.5 %");
  });
  it("should accent every coal cell at rest", () => {
    expect(staged.scheduled.resting.accent.sort()).toEqual([...coal].sort());
  });
  it("should refuse a cell's share of its column stated falsely", () => {
    const e = refusal(() =>
      stagePartWeb({
        variant: "marimekko-mosaic-plot",
        gestures: [
          ...gestures.slice(0, 2),
          {
            do: "annotate",
            mark: "France · Coal",
            note: "0.4 % of France's mix",
          },
        ],
        marks: mosaic.marks,
        claim: mosaic.claim,
        format: mosaic.format,
      }),
    );
    expect(e?.field).toBe("gestures[2].note");
  });
});

describe("donut on the web", () => {
  const gestures = [
    { do: "highlight", mark: "China" },
    { do: "name", mark: "United States", note: "13.3 % of the world" },
    {
      do: "compare",
      marks: ["China", "United States"],
      note: "32.9 %, 2.5 times the United States",
    },
  ];
  const staged = stagePartWeb({
    variant: "pie-and-donut",
    gestures,
    marks: donut.marks,
    claim: donut.claim,
    format: donut.format,
  });

  it("should make the compare the one control, laying the United States' quantity against China", () => {
    const [c] = staged.scheduled.controls;
    expect([
      c.do,
      c.picture.copies[0].onto,
      Math.round(c.picture.copies[0].value * 10) / 10,
    ]).toEqual(["compare", "China", 4.9]);
  });
  it("should ring the named part at rest and draw no copy there", () => {
    expect([
      staged.scheduled.resting.rings,
      staged.scheduled.resting.copies.length,
    ]).toEqual([["United States"], 0]);
  });
  it("should fold the countries beyond the frame into one remainder part", () => {
    expect(staged.scheduled.parts.at(-1).name).toBe(REST);
  });
  it("should refuse a compare whose ratio word is false", () => {
    const e = refusal(() =>
      stagePartWeb({
        variant: "pie-and-donut",
        gestures: [
          gestures[0],
          { ...gestures[2], note: "three times the United States" },
        ],
        marks: donut.marks,
        claim: donut.claim,
        format: donut.format,
      }),
    );
    expect(e?.field).toBe("gestures[1].note");
  });
  it("should refuse a filter that keeps every drawn part, its control changing nothing", () => {
    const { valid } = (() => {
      const all = donut.marks.map((m: any) => m.name);
      return {
        valid: [
          { do: "highlight", marks: ["China"], subject: "China" },
          { do: "filter", marks: all },
        ],
      };
    })();
    const e = refusal(() =>
      schedulePartWeb({
        variant: "pie-and-donut",
        gestures: valid,
        marks: donut.marks,
        format: donut.format,
      }),
    );
    expect(e?.field).toBe("gestures[1]");
  });
  it("should repair a false ratio word into a list the core accepts", () => {
    const repaired = stagePartWeb({
      variant: "pie-and-donut",
      gestures: [
        gestures[0],
        { ...gestures[2], note: "three times the United States" },
      ],
      marks: donut.marks,
      claim: donut.claim,
      format: donut.format,
      repair: true,
    });
    expect(
      repaired.repairs.length > 0 && repaired.scheduled.controls.length === 1,
    ).toBe(true);
  });
});
