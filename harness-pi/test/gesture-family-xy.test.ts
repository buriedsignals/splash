import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as coreModule from "../craft/_shared/gesture-core.mjs";
import * as registryModule from "../craft/_shared/gesture-registry.mjs";
import * as familyModule from "../craft/_shared/gesture-family-xy.mjs";
import * as staticModule from "../craft/_shared/gesture-xy-static.mjs";
import * as webModule from "../craft/_shared/gesture-xy-web.mjs";
import * as videoModule from "../craft/_shared/gesture-xy-video.mjs";
import * as scrollyModule from "../craft/_shared/gesture-xy-scrolly.mjs";

// The modules are browser-safe JavaScript: read through `any`, as the runners read them.
const { applyFix, GestureRefusal, repairGestures, validateGestures }: any = coreModule;
const { FAMILIES }: any = registryModule;
const { createXY, gesturesOf, invariants, marksOf, pictureAt, planXY, stageXY, xyHooks }: any = familyModule;
const { composeStaticXY }: any = staticModule;
const { scheduleWebXY }: any = webModule;
const { scheduleVideoXY }: any = videoModule;
const { checkCardsXY, scheduleScrollyXY }: any = scrollyModule;

// The two worked examples' data, as their beat.example.mjs reads it.
const PROOF = join(import.meta.dirname, "..", "..", "proof");
const csv = (path: string) =>
  readFileSync(join(PROOF, path), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(","));

const SCATTER_ROWS = csv("static-income-life-expectancy/data.csv")
  .filter((r) => /^[A-Z]{3}$/.test(r[1]))
  .map((r) => ({
    name: r[0],
    x: Number(r[4]),
    value: Number(r[3]),
    size: Number(r[5]),
  }));
const SCATTER_CLAIM = {
  takeaway:
    "Beyond $30,000 per person, life expectancy fits in a band 3 times narrower",
};

const LOW = [3, 4, 5, 6, 7, 8];
const FOSSIL = [9, 10, 11];
const lowcarbon = csv("static-connected-scatter-lowcarbon/data.csv");
const sumOf = (r: string[], cols: number[]) =>
  cols.reduce((s, c) => s + Number(r[c]), 0);
const groupLow = (year: number) =>
  lowcarbon
    .filter((r) => Number(r[2]) === year)
    .reduce((s, r) => s + sumOf(r, LOW), 0);
const CONNECTED_ROWS = lowcarbon.map((r) => {
  const year = Number(r[2]);
  const low = sumOf(r, LOW);
  return {
    series: r[0],
    key: year,
    x: (low / groupLow(year)) * 100,
    value: (low / (low + sumOf(r, FOSSIL))) * 100,
  };
});
const CONNECTED_CLAIM = {
  takeaway:
    "All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight in Europe's low-carbon total",
  entity: "France",
};

const scatterXY = (extra: { x: number[]; y: number[] } = { x: [30000], y: [] }) =>
  createXY({
    marks: marksOf(SCATTER_ROWS, "scatter-and-bubble").marks,
    variant: "scatter-and-bubble",
    xLog: true,
    extra,
  });
const connectedXY = () =>
  createXY({
    marks: marksOf(CONNECTED_ROWS, "connected-scatter").marks,
    variant: "connected-scatter",
  });
const validate = (xy: any, gestures: any[], format: string, claim: any) =>
  validateGestures({
    gestures,
    rows: xy.marks,
    family: "xy",
    format,
    claim,
    hooks: xyHooks(xy, gestures),
  });
const refusalOf = (fn: () => unknown): any => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

const lighter = (() => {
  const xy = connectedXY();
  return xy.heads.filter((h: string) => xy.move(h)!.dx < 0);
})();

describe("the XY family", () => {
  it("should register itself as a family whose values do not add up", () => {
    expect(FAMILIES.xy?.additive).toBe(false);
  });

  it("should name a connected scatter's path by its last step and its earlier steps by key", () => {
    const names = connectedXY().marks.map((m: any) => m.name);
    expect(names).toContain("France");
    expect(names).toContain("France 2000");
  });

  it("should leave trace out of a scatter's contract", () => {
    expect(gesturesOf("scatter-and-bubble")).not.toContain("trace");
  });
});

describe("scatter-and-bubble", () => {
  const gestures = [
    {
      do: "reference",
      axis: "x",
      value: 30000,
      note: "$30,000: 41 years of spread below, 14 above",
    },
    {
      do: "filter",
      axis: "x",
      value: 30000,
      side: "above",
      note: "41 countries above $30,000",
    },
  ];

  it("should give every scrolly card a distinct state", () => {
    const xy = scatterXY();
    const { gestures: valid } = validate(
      xy,
      gestures.map((g) => ({ ...g, card: g.note })),
      "scrolly",
      SCATTER_CLAIM,
    );
    const { states } = scheduleScrollyXY({ gestures: valid, xy });
    const keys = states.map((s: any) => JSON.stringify(s));
    expect(new Set(keys).size).toBe(states.length);
  });

  it("should draw the declared rule on the still plate", () => {
    const xy = scatterXY();
    const { gestures: valid } = validate(xy, gestures, "static", SCATTER_CLAIM);
    const plate = composeStaticXY({ gestures: valid, xy });
    expect(
      plate.picture.rules.some((r: any) => r.axis === "x" && r.value === 30000),
    ).toBe(true);
  });

  it("should give the accent to the rule when no point is the subject", () => {
    const xy = scatterXY();
    const { gestures: valid } = validate(xy, gestures, "static", SCATTER_CLAIM);
    expect(composeStaticXY({ gestures: valid, xy }).ruleAccent).toBe(true);
  });

  it("should refuse a false count on a threshold filter", () => {
    const xy = scatterXY();
    const error = refusalOf(() =>
      validate(
        xy,
        [gestures[0], { ...gestures[1], note: "45 countries above $30,000" }],
        "static",
        SCATTER_CLAIM,
      ),
    );
    expect(error.field).toBe("gestures[1].note");
  });

  it("should accept a point's x stated in its note", () => {
    const xy = scatterXY();
    const usa = xy.byName.get("United States");
    const claim = {
      takeaway:
        "The United States, at $64,000 per person, lives shorter than poorer countries",
    };
    expect(() =>
      validate(
        xy,
        [
          {
            do: "annotate",
            mark: "United States",
            note: `$${Math.round(usa.x).toLocaleString("en-US")} a person`,
          },
        ],
        "static",
        claim,
      ),
    ).not.toThrow();
  });

  it("should refuse a point's x the data does not give", () => {
    const xy = scatterXY();
    const claim = {
      takeaway:
        "The United States, at $64,000 per person, lives shorter than poorer countries",
    };
    const error = refusalOf(() =>
      validate(
        xy,
        [{ do: "annotate", mark: "United States", note: "$91,000 a person" }],
        "static",
        claim,
      ),
    );
    expect(error.field).toBe("gestures[0].note");
  });

  it("should refuse a trace on a cloud, which has no path", () => {
    const xy = scatterXY();
    const claim = { takeaway: "The United States lives shorter than poorer countries" };
    const error = refusalOf(() => validate(xy, [{ do: "trace", mark: "United States" }], "static", claim));
    expect(error.message).toContain("has no path");
  });

  it("should refuse a filter that keeps every point", () => {
    const xy = scatterXY({ x: [100], y: [] });
    const error = refusalOf(() =>
      validate(
        xy,
        [{ do: "filter", axis: "x", value: 100, note: "30,000" }],
        "web",
        SCATTER_CLAIM,
      ),
    );
    expect(error.fix).toEqual({ remove: 0 });
  });

  it("should accept a pull-back on a cloud when an earlier rule states the takeaway's figure", () => {
    const xy = scatterXY();
    expect(() =>
      validate(xy, [...gestures, { do: "pull-back" }], "video", SCATTER_CLAIM),
    ).not.toThrow();
  });

  it("should release the filter in the video's conclusion", () => {
    const xy = scatterXY();
    const { gestures: valid } = validate(
      xy,
      [...gestures, { do: "pull-back" }],
      "video",
      SCATTER_CLAIM,
    );
    const scheduled = scheduleVideoXY({ gestures: valid, xy });
    const closing = pictureAt({
      plan: scheduled.plan,
      accentMark: scheduled.accentMark,
      xy,
      on: { 0: 1, 1: 1, 2: 1 },
      release: scheduled.states.at(-1).release,
    });
    expect(() => invariants([closing], xy, { closing: true })).not.toThrow();
  });

  it("should turn the threshold filter into one web control", () => {
    const xy = scatterXY();
    const { gestures: valid } = validate(xy, gestures, "web", SCATTER_CLAIM);
    const scheduled = scheduleWebXY({ gestures: valid, xy });
    expect(scheduled.controls.map((c: any) => c.atom)).toEqual([
      "filter-to-a-subset",
    ]);
  });
});

describe("connected-scatter", () => {
  const gestures = [
    { do: "highlight", mark: "France" },
    {
      do: "annotate",
      mark: "France",
      note: "France: -11.8 points of weight, +4.2 at home",
    },
    {
      do: "filter",
      marks: lighter,
      note: `${lighter.length} of 16 weigh less than in 2000`,
    },
  ];

  it("should give every video event a distinct state", () => {
    const xy = connectedXY();
    const { gestures: valid } = validate(
      xy,
      [{ do: "reveal" }, gestures[1], { do: "trace", mark: "France" }],
      "video",
      CONNECTED_CLAIM,
    );
    const { states } = scheduleVideoXY({ gestures: valid, xy });
    const middle = states.slice(0, 5).map((s: any) => JSON.stringify(s));
    expect(new Set(middle).size).toBe(5);
  });

  it("should put the subject's whole path in the accent", () => {
    const xy = connectedXY();
    const { gestures: valid } = validate(
      xy,
      gestures,
      "static",
      CONNECTED_CLAIM,
    );
    const { picture } = composeStaticXY({ gestures: valid, xy });
    expect(picture.accent.get("France 2000")).toBe(1);
  });

  it("should accept an x share stated with a percent sign", () => {
    const xy = connectedXY();
    const share = xy.byName.get("France").x.toFixed(1);
    expect(() => validate(xy, [gestures[0], { do: "annotate", mark: "France", note: `France: ${share}% of the group's low-carbon power` }], "static", CONNECTED_CLAIM)).not.toThrow();
  });

  it("should accept the subject's move stated in its note", () => {
    const xy = connectedXY();
    expect(() =>
      validate(xy, gestures, "static", CONNECTED_CLAIM),
    ).not.toThrow();
  });

  it("should refuse a move the path does not make", () => {
    const xy = connectedXY();
    const error = refusalOf(() =>
      validate(
        xy,
        [
          gestures[0],
          { ...gestures[1], note: "France: -14.8 points of weight" },
        ],
        "static",
        CONNECTED_CLAIM,
      ),
    );
    expect(error.field).toBe("gestures[1].note");
  });

  it("should count a filter's entities, not its points", () => {
    const xy = connectedXY();
    const { gestures: valid } = validate(xy, gestures, "web", CONNECTED_CLAIM);
    const control = scheduleWebXY({ gestures: valid, xy }).controls[0];
    expect(control.chip).toBe(`${lighter.length} / 16`);
  });

  it("should refuse a compare against the whole, offering two points", () => {
    const xy = connectedXY();
    const error = refusalOf(() =>
      validate(
        xy,
        [{ do: "compare", mark: "France", of: "whole" }],
        "static",
        CONNECTED_CLAIM,
      ),
    );
    expect((error.fix as any).set.value.marks).toHaveLength(2);
  });

  it("should repair a one-mark compare into an accepted list without cycling", () => {
    const xy = connectedXY();
    const hooks = xyHooks(xy, []);
    const { gestures: repaired } = repairGestures({
      gestures: [{ do: "compare", mark: "France" }],
      rows: xy.marks,
      family: "xy",
      format: "static",
      claim: CONNECTED_CLAIM,
      hooks,
    });
    expect(repaired[0].marks).toHaveLength(2);
  });

  it("should refuse a zoom whose printed factor is not the one applied, with the factor that works", () => {
    const xy = connectedXY();
    const zoom = {
      do: "zoom",
      marks: ["Germany", "Spain", "Italy"],
      note: "×9",
    };
    const { gestures: valid } = validate(
      xy,
      [gestures[0], zoom, { do: "pull-back" }],
      "scrolly",
      CONNECTED_CLAIM,
    );
    const error = refusalOf(() => planXY({ gestures: valid, xy }));
    const fixed = applyFix([gestures[0], zoom], error.fix as any);
    const { gestures: again } = validate(
      xy,
      [...fixed, { do: "pull-back" }],
      "scrolly",
      CONNECTED_CLAIM,
    );
    expect(() => planXY({ gestures: again, xy })).not.toThrow();
  });

  it("should close the scrolly on the full plot after a zoom", () => {
    const xy = connectedXY();
    const factor = xy.window(["Germany", "Spain", "Italy"]).factor.toFixed(1);
    const list = [
      { ...gestures[0], card: "Every path rises." },
      {
        do: "zoom",
        marks: ["Germany", "Spain", "Italy"],
        note: `×${factor}`,
        card: `Enlarged ×${factor}.`,
      },
    ];
    const { gestures: valid } = validate(xy, list, "scrolly", CONNECTED_CLAIM);
    const { states } = scheduleScrollyXY({ gestures: valid, xy });
    expect([states.at(-1).x0, states.at(-1).x1]).toEqual(xy.full.x);
  });

  it("should refuse a card that states a figure the plate does not draw", () => {
    const xy = connectedXY();
    const { gestures: valid } = validate(
      xy,
      [{ ...gestures[0], card: "France lost 19.3 points." }],
      "scrolly",
      CONNECTED_CLAIM,
    );
    const error = refusalOf(() => checkCardsXY({ gestures: valid, xy }));
    expect(error.field).toBe("gestures[0].card");
  });

  it("should stage a web page with the filter as its one control", () => {
    const xy = connectedXY();
    const staged = stageXY({
      gestures,
      xy,
      format: "web",
      claim: CONNECTED_CLAIM,
      schedule: (valid: any) => scheduleWebXY({ gestures: valid, xy }),
    });
    expect(staged.scheduled.controls.map((c: any) => c.do)).toEqual(["filter"]);
  });
});
