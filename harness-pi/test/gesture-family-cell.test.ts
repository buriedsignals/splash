import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import * as registry from "../craft/_shared/gesture-registry.mjs";
import * as familyModule from "../craft/_shared/gesture-family-cell.mjs";
import * as staticModule from "../craft/_shared/gesture-cell-static.mjs";
import * as webModule from "../craft/_shared/gesture-cell-web.mjs";
import * as scrollyModule from "../craft/_shared/gesture-cell-scrolly.mjs";
import * as videoModule from "../craft/_shared/gesture-cell-video.mjs";

// The modules are plain JavaScript read through their JSDoc; the tests hold their behaviour, not their inferred types.
const { FAMILIES } = registry as any;
const { cellHooks, claimFor, factsFor, gridOf, keepsOthersInOrder, marksOf, outlineOf, pictureOf, precheck, reorderRows, run, stageCells } = familyModule as any;
const { composeCellStatic } = staticModule as any;
const { scheduleCellWeb } = webModule as any;
const { checkCellCards, scheduleCellScrolly } = scrollyModule as any;
const { scheduleCellVideo } = videoModule as any;

// ── the two proofs' data, drawn as their beats draw them ─────────────────────────────────────────────

const PROOF = join(import.meta.dir, "..", "..", "proof");
const csv = (path: string) => {
  const [head, ...lines] = readFileSync(path, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));
  return { head, lines };
};

/** Europe's 2024 electricity: twelve countries × nine sources, each cell a share of the row's generation. */
function heatmapBeat() {
  const { head, lines } = csv(
    join(PROOF, "static-heatmap-europe-electricity", "data.csv"),
  );
  const keys = [
    "hydro",
    "wind",
    "solar",
    "bioenergy_stacked",
    "other_renewables",
    "nuclear",
    "gas",
    "coal",
    "oil",
  ];
  const labels = [
    "Hydro",
    "Wind",
    "Solar",
    "Bio",
    "Other",
    "Nuclear",
    "Gas",
    "Coal",
    "Oil",
  ];
  const at = keys.map((k) => head.indexOf(`${k}_generation__twh`));
  const rows = lines
    .map((l) => {
      const twh = at.map((i) => Number(l[i] || 0));
      const total = twh.reduce((a, b) => a + b, 0);
      return { label: l[0], total, cells: twh.map((v) => (v / total) * 100) };
    })
    .filter((r) => r.total > 0)
    .map((r) => ({
      key: r.label,
      label: r.label,
      value: r.cells.slice(0, 6).reduce((a, b) => a + b, 0),
      cells: r.cells,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
  return {
    heads: labels.map((label) => ({ key: label, label })),
    rows,
    breaks: [2, 5, 10, 20, 40],
  };
}
const HEAT = gridOf("heatmap-matrix", heatmapBeat());
const SEVEN: string[] = HEAT.rows.slice(0, 7).map((r: any) => r.label);
const HEAT_CLAIM = {
  takeaway:
    "Seven European countries draw more than 94 % of their electricity from low-carbon sources — by three different routes",
  comparison: `${SEVEN.join(", ")}, against the largest producers`,
  facts: factsFor(HEAT),
};

/** Geneva's 2024 daily mean temperature: one cell per day. */
function calendarBeat() {
  const { lines } = csv(
    join(PROOF, "static-calendar-heatmap-geneva", "data.csv"),
  );
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return {
    days: lines.map((l) => ({ date: l[0], value: Number(l[1]) })),
    months,
  };
}
const CAL = gridOf("calendar-heatmap", calendarBeat());
const RUN = run(CAL, (v: number) => v >= 20);
const CAL_CLAIM = {
  takeaway: `Geneva held ${RUN.length} days in a row above 20 °C in 2024`,
  comparison: "The other days of the year, and August, the warmest month",
  facts: factsFor(CAL),
};

const stage = (grid: any, claim: any, format: string, gestures: any[]) =>
  stageCells({ validateGestures, gestures, grid, format, claim });
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};
const one = (v: number) => v.toFixed(1);
const cellOf = (grid: any, row: string, col: string) =>
  grid.cells.find((c: any) => c.name === `${row} · ${col}`);

// ── the family ───────────────────────────────────────────────────────────────────────────────────────

describe("the cell family", () => {
  it("should register itself as non-additive, without bracket or count", () => {
    expect(FAMILIES.cell.additive).toBe(false);
    expect(FAMILIES.cell.gestures).not.toContain("bracket");
    expect(FAMILIES.cell.gestures).not.toContain("count");
  });

  it("should give one mark per cell, named row · column, keyed by row and series by column", () => {
    const m = marksOf(HEAT).find((x: any) => x.name === `${SEVEN[0]} · Hydro`);
    expect(m).toMatchObject({ key: SEVEN[0], series: "Hydro" });
  });

  it("should give a calendar one mark per date, its month as its series", () => {
    expect(
      marksOf(CAL).find((x: any) => x.name === "2024-07-14"),
    ).toMatchObject({ key: "2024-07-14", series: "July" });
  });

  it("should draw a day the data does not give as missing, never refusing the grid", () => {
    const beat = calendarBeat();
    beat.days = beat.days.filter((d) => d.date !== "2024-03-10");
    const grid = gridOf("calendar-heatmap", beat);
    expect(grid.cells.length).toBe(CAL.cells.length - 1);
  });

  it("should outline a whole row as one rectangle", () => {
    const cells = HEAT.cells.filter((c: any) => c.r === 2);
    expect(
      outlineOf(
        cells,
        HEAT.rows.map((_: any, i: number) => i),
      ),
    ).toEqual([{ r0: 2, r1: 2, c0: 0, c1: 8 }]);
  });

  it("should outline a block of rows as one rectangle", () => {
    const cells = HEAT.cells.filter((c: any) => c.r < 7);
    expect(
      outlineOf(
        cells,
        HEAT.rows.map((_: any, i: number) => i),
      ),
    ).toHaveLength(1);
  });
});

// ── heatmap-matrix ───────────────────────────────────────────────────────────────────────────────────

describe("heatmap-matrix", () => {
  const france = cellOf(HEAT, "France", "Nuclear");
  const sweden = cellOf(HEAT, "Sweden", "Nuclear");
  const GESTURES = [
    {
      do: "trace",
      value: 94,
      note: "7 countries above 94 %",
      card: "Seven countries clear 94 %: 7 rows in a block.",
    },
    {
      do: "compare",
      marks: [france.name, sweden.name],
      note: `France ${one(france.value)} % against Sweden ${one(sweden.value)} %`,
      card: `France draws ${one(france.value)} % from nuclear.`,
    },
    { do: "filter", marks: SEVEN, card: "The others step back." },
  ];

  it("should find the run of rows above the floor the takeaway names", () => {
    const { plan } = stage(HEAT, HEAT_CLAIM, "static", GESTURES);
    expect(plan[0].run.rows).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("should compose every declared gesture onto the static plate", () => {
    const { plan, orders } = stage(HEAT, HEAT_CLAIM, "static", GESTURES);
    const plate = composeCellStatic({
      plan,
      orders,
      grid: HEAT,
      format: (v: number) => one(v),
    });
    expect([
      plate.outlines.some((o: any) => o.kind === "run"),
      plate.compares.length,
      plate.back.length,
    ]).toEqual([true, 1, HEAT.cells.length - 63]);
  });

  it("should give every web control a picture of its own, distinct from the resting page", () => {
    const { plan, orders } = stage(HEAT, HEAT_CLAIM, "web", GESTURES);
    const { resting, controls } = scheduleCellWeb({
      plan,
      orders,
      grid: HEAT,
      format: (v: number) => one(v),
    });
    const pictures = [resting, ...controls.map((c: any) => c.picture)].map(
      (p: any) => JSON.stringify([p.outlines, p.back, p.compares]),
    );
    expect(new Set(pictures).size).toBe(4);
  });

  it("should give the scrolly one distinct state per card and release the filter on the closing card", () => {
    const { plan, orders, valid } = stage(
      HEAT,
      HEAT_CLAIM,
      "scrolly",
      GESTURES,
    );
    const { states } = scheduleCellScrolly({ plan, orders, grid: HEAT });
    checkCellCards({
      valid,
      plan,
      grid: HEAT,
      format: (v: number) => one(v),
      claim: HEAT_CLAIM,
    });
    expect([
      new Set(states.map((s: any) => JSON.stringify(s))).size,
      states.at(-1).f2,
    ]).toEqual([4, 0]);
  });

  it("should release the filter in the video's conclusion", () => {
    const list = [GESTURES[2], GESTURES[0], GESTURES[1]];
    const { plan, orders } = stage(HEAT, HEAT_CLAIM, "video", list);
    const { states } = scheduleCellVideo({ plan, orders, grid: HEAT });
    expect([states[2].f0, states[4].f0, states[4].source]).toEqual([1, 0, 1]);
  });

  it("should refuse a trace note that miscounts the run, offering the run's own count", () => {
    const error = refusal(() =>
      stage(HEAT, HEAT_CLAIM, "static", [
        { do: "trace", value: 94, note: "8 countries above 94 %" },
      ]),
    );
    expect(error.fix.set.value).toBe("7 countries above 94 %");
  });

  it("should refuse a compare of two rows, naming two cells that work", () => {
    const error = refusal(() =>
      stage(HEAT, HEAT_CLAIM, "static", [
        { do: "compare", marks: ["France", "Sweden"] },
      ]),
    );
    expect([error.field, error.message.includes("France · Hydro")]).toEqual([
      "gestures[0].marks",
      true,
    ]);
  });

  it("should accept a highlight on a row the comparison names (claimFor reads rows, not cell names)", () => {
    expect(() =>
      stage(HEAT, HEAT_CLAIM, "static", [{ do: "highlight", mark: "France" }]),
    ).not.toThrow();
  });

  it("should accept the row's own measure in a note on its row", () => {
    const iceland = HEAT.rows[0];
    expect(() =>
      stage(HEAT, HEAT_CLAIM, "static", [
        {
          do: "name",
          mark: iceland.label,
          note: `${iceland.label} ${one(iceland.value)} %`,
        },
      ]),
    ).not.toThrow();
  });

  it("should move only the named rows in a reorder (no-reorder-rows-claim)", () => {
    const before = HEAT.rows.map((_: any, i: number) => i);
    expect(
      keepsOthersInOrder(before, reorderRows(before, [6, 3]), [6, 3]),
    ).toBe(true);
  });

  it("should refuse a reorder that moves every row", () => {
    const error = refusal(() =>
      stage(HEAT, HEAT_CLAIM, "static", [{ do: "reorder", mark: "Hydro" }]),
    );
    expect(error.fix).toEqual({ remove: 0 });
  });

  it("should refuse a bracket, which a grid of shares cannot add up", () => {
    const error = refusal(() =>
      stage(HEAT, HEAT_CLAIM, "static", [{ do: "bracket", marks: SEVEN }]),
    );
    expect(error.field).toBe("gestures[0].do");
  });
});

// ── calendar-heatmap ─────────────────────────────────────────────────────────────────────────────────

describe("calendar-heatmap", () => {
  const august = CAL.cells.filter((c: any) => c.series === "August");
  const mean =
    august.reduce((s: number, c: any) => s + c.value, 0) / august.length;
  const hottest = august.reduce((a: any, b: any) =>
    b.value > a.value ? b : a,
  );
  const GESTURES = [
    {
      do: "trace",
      value: 20,
      note: `${RUN.length} days in a row above 20 °C`,
      card: `${RUN.length} days in a row, from ${RUN.from.day} July to ${RUN.to.day} August.`,
    },
    {
      do: "highlight",
      mark: "August",
      note: `August: ${one(mean)} °C on average`,
      card: `August averaged ${one(mean)} °C.`,
    },
    {
      do: "name",
      mark: hottest.date,
      note: `${hottest.day} August: ${one(hottest.value)} °C`,
      card: `On ${hottest.day} August the day's mean reached ${one(hottest.value)} °C.`,
    },
  ];

  it("should outline the longest run of days at or above the threshold", () => {
    const { plan } = stage(CAL, CAL_CLAIM, "static", GESTURES);
    expect(plan[0].cells.length).toBe(RUN.length);
  });

  it("should compose the run, the month and the day onto the static plate", () => {
    const { plan, orders } = stage(CAL, CAL_CLAIM, "static", GESTURES);
    const plate = composeCellStatic({
      plan,
      orders,
      grid: CAL,
      format: (v: number) => one(v),
    });
    expect(plate.outlines.map((o: any) => o.kind).sort()).toEqual([
      "accent",
      "ring",
      "run",
    ]);
  });

  it("should turn the trace into a brush control on the web", () => {
    const { plan, orders } = stage(CAL, CAL_CLAIM, "web", GESTURES);
    const { controls } = scheduleCellWeb({
      plan,
      orders,
      grid: CAL,
      format: (v: number) => one(v),
    });
    expect(controls.map((c: any) => c.atom)).toEqual(["brush-a-range"]);
  });

  it("should give the scrolly one distinct state per card", () => {
    const { plan, orders, valid } = stage(CAL, CAL_CLAIM, "scrolly", GESTURES);
    const { states } = scheduleCellScrolly({ plan, orders, grid: CAL });
    checkCellCards({
      valid,
      plan,
      grid: CAL,
      format: (v: number) => one(v),
      claim: CAL_CLAIM,
    });
    expect(new Set(states.map((s: any) => JSON.stringify(s))).size).toBe(4);
  });

  it("should change the video's picture at every event", () => {
    const { plan, orders } = stage(CAL, CAL_CLAIM, "video", GESTURES);
    const { states } = scheduleCellVideo({ plan, orders, grid: CAL });
    const changes = states
      .slice(1, 5)
      .map(
        (s: any, i: number) => JSON.stringify(s) !== JSON.stringify(states[i]),
      );
    expect(changes).toEqual([true, true, true, true]);
  });

  it("should refuse a run length the data does not hold, offering the run's own", () => {
    const error = refusal(() =>
      stage(CAL, CAL_CLAIM, "static", [
        {
          do: "trace",
          value: 20,
          note: `${RUN.length + 1} days in a row above 20 °C`,
        },
      ]),
    );
    expect(error.fix.set.value).toBe(`${RUN.length} days in a row above 20 °C`);
  });

  it("should accept the run's first and last day in its note", () => {
    expect(() =>
      stage(CAL, CAL_CLAIM, "static", [
        {
          do: "trace",
          value: 20,
          note: `${RUN.length} days, ${RUN.from.day} July to ${RUN.to.day} August`,
        },
      ]),
    ).not.toThrow();
  });

  it("should refuse a reorder: a calendar's months never move", () => {
    const error = refusal(() =>
      stage(CAL, CAL_CLAIM, "static", [
        GESTURES[0],
        { do: "reorder", marks: ["August"] },
      ]),
    );
    expect(error.fix).toEqual({ remove: 1 });
  });

  it("should refuse a trace no day reaches, rather than outline nothing", () => {
    const error = refusal(() =>
      stage(CAL, CAL_CLAIM, "static", [{ do: "trace", value: 40 }]),
    );
    expect(error.fix).toEqual({ remove: 0 });
  });

  it("should refuse a scrolly card stating a figure the grid does not give, replacing it with the gesture's note", () => {
    const list = [
      { ...GESTURES[0], card: `${RUN.length} days in a row, 99.9 °C.` },
    ];
    const { plan, valid } = stage(CAL, CAL_CLAIM, "scrolly", list);
    const error = refusal(() =>
      checkCellCards({
        valid,
        plan,
        grid: CAL,
        format: (v: number) => one(v),
        claim: CAL_CLAIM,
      }),
    );
    expect(error.fix.set.value).toBe(GESTURES[0].note);
  });

  it("should repair a web list that only rests by adding a gesture the family draws, never a bracket", () => {
    const error = refusal(() =>
      precheck({
        gestures: [
          { do: "reference", value: 20 },
          { do: "highlight", mark: "August" },
        ],
        grid: CAL,
        format: "web",
      }),
    );
    expect(error.fix.add.gesture).toEqual({ do: "trace", value: 20 });
  });

  it("should spell out a named month's days in the claim the core reads", () => {
    expect(claimFor(CAL_CLAIM, CAL).entity.split(" | ")).toContain(
      "2024-08-31",
    );
  });

  it("should step back every cell outside a filter, nothing inside it", () => {
    const { plan, orders } = stage(CAL, CAL_CLAIM, "static", [
      { do: "filter", mark: "August" },
    ]);
    const pic = pictureOf({ plan, orders, grid: CAL, on: [true] });
    expect(pic.back.length).toBe(CAL.cells.length - 31);
  });
});
