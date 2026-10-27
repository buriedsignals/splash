import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";
import * as family from "../craft/_shared/gesture-family-units.mjs";
import * as staticUnits from "../craft/_shared/gesture-units-static.mjs";
import * as webUnits from "../craft/_shared/gesture-units-web.mjs";
import * as videoUnits from "../craft/_shared/gesture-units-video.mjs";
import * as scrollyUnits from "../craft/_shared/gesture-units-scrolly.mjs";
import * as scrollyLength from "../craft/_shared/gesture-scrolly.mjs";

// The family's modules are plain JS; their shapes are read as data here.
const { createUnits, headlineFigures, layoutRows, partitionOf, stageUnits } = family as any;
const { composeUnitsStatic } = staticUnits as any;
const { scheduleUnitsWeb } = webUnits as any;
const { scheduleUnitsVideo } = videoUnits as any;
const { scheduleUnitsScrolly } = scrollyUnits as any;
const { checkCards } = scrollyLength as any;

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const csv = (path: string) =>
  readFileSync(join(CHECKOUT, path), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","));

// The two worked examples' own data: 213 countries' CO₂ per person (2023), and 40 European electricity mixes (2024).
const CARBON = csv("proof/static-carbon-footprint-spread/data.csv")
  .filter((r) => /^[A-Z]{3}$/.test(r[1]))
  .map((r) => ({ name: r[0], value: Number(r[3]) }));
const MIX = csv("proof/static-pictogram-europe-lowcarbon/data.csv")
  .map((r) => {
    const n = r.slice(3).map(Number);
    const clean = n[0] + n[1] + n[2] + n[3] + n[4] + n[5];
    const all = clean + n[6] + n[7] + n[8];
    return { name: r[1], value: all > 0 ? (clean / all) * 100 : NaN };
  })
  .filter((u) => Number.isFinite(u.value));

const HIST = {
  beat: { units: CARBON, binStart: 0, binWidth: 4, binCount: 10 },
  claim: {
    takeaway: "6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne",
  },
};
const PICTO = {
  beat: {
    units: MIX,
    blocks: [
      { key: "top", name: "au-dessus de 75 %", min: 75 },
      { key: "middle", name: "entre 60 et 75 %", min: 60, max: 75 },
      { key: "bottom", name: "sous 60 %", max: 60 },
    ],
  },
  claim: {
    takeaway:
      "L’Europe électrique est aux deux bouts : 6 pays seulement au milieu",
  },
};
const VARIANT = { histogram: HIST, "pictogram-isotype": PICTO } as const;
type Variant = keyof typeof VARIANT;

function stage(
  variant: Variant,
  gestures: object[],
  format: string,
  schedule: (valid: any[]) => any = (v) => v,
  repair = false,
) {
  const { beat, claim } = VARIANT[variant];
  const partition = partitionOf(beat, variant);
  return {
    partition,
    ...stageUnits({ gestures, partition, claim, format, schedule, repair }),
  };
}
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

const HIST_LIST = [
  { do: "highlight", mark: "0–4" },
  { do: "reference", value: 4, note: "127 pays sur 213 sous 4 tonnes" },
  { do: "bracket", mark: "0–4", of: "whole", note: "6 pays sur 10" },
];
const PICTO_LIST = [
  { do: "reveal" },
  { do: "name", mark: "middle", note: "6 pays seulement" },
  { do: "bracket", mark: "middle", of: "whole", note: "6 sur 40" },
];
const LIST = { histogram: HIST_LIST, "pictogram-isotype": PICTO_LIST } as const;

describe("the units partition", () => {
  it("should count the carbon footprints into the worked example's bins", () => {
    const { groups, total } = partitionOf(HIST.beat, "histogram");
    expect([total, ...groups.map((g: any) => g.count)]).toEqual([
      213, 127, 53, 15, 9, 3, 2, 3, 0, 0, 1,
    ]);
  });
  it("should count the electricity mixes into the worked example's blocks", () => {
    const { groups, total } = partitionOf(PICTO.beat, "pictogram-isotype");
    expect([total, ...groups.map((g: any) => g.count)]).toEqual([40, 16, 6, 18]);
  });
  it("should move a first edge that sits above the smallest reading rather than refuse it", () => {
    const p = partitionOf({ ...HIST.beat, binStart: 1 }, "histogram");
    expect([
      p.groups[0].lo,
      p.total,
      p.groups.reduce((s: number, g: any) => s + g.count, 0),
    ]).toEqual([0, 213, 213]);
  });
  it("should give an open tail that holds a quarter of the readings more bins rather than refuse it", () => {
    const p = partitionOf({ ...HIST.beat, binCount: 2 }, "histogram");
    expect(p.groups.at(-1)!.count / p.total).toBeLessThanOrEqual(0.25);
  });
  it("should count a reading no block holds in a stated remainder rather than drop it", () => {
    const p = partitionOf(
      { units: MIX, blocks: [{ key: "top", name: "top", min: 75 }] },
      "pictogram-isotype",
    );
    expect([p.groups.length, p.groups[1].count, p.adapted.length]).toEqual([
      2, 24, 1,
    ]);
  });
  it("should register the units family as additive", () => {
    expect(
      admissible("units", "static").map((a: { do: string }) => a.do),
    ).toContain("bracket");
  });
});

describe.each(["histogram", "pictogram-isotype"] as const)(
  "%s schedulers on the worked example",
  (variant) => {
    it("should compose the static plate with every declared gesture drawn", () => {
      const { scheduled } = stage(variant, LIST[variant], "static", (valid) =>
        composeUnitsStatic({
          gestures: valid,
          groups: partitionOf(VARIANT[variant].beat, variant).groups,
        }),
      );
      expect(
        scheduled.brackets.length +
          scheduled.notes.length +
          scheduled.references.length,
      ).toBeGreaterThanOrEqual(2);
    });
    it("should make the bracket the web page's one control", () => {
      const { scheduled } = stage(variant, LIST[variant], "web", (valid) =>
        scheduleUnitsWeb({
          gestures: valid,
          groups: partitionOf(VARIANT[variant].beat, variant).groups,
        }),
      );
      expect(scheduled.controls.map((c: { do: string }) => c.do)).toEqual([
        "bracket",
      ]);
    });
    it("should give every video event its own distinct state", () => {
      const { scheduled } = stage(variant, LIST[variant], "video", (valid) =>
        scheduleUnitsVideo({
          gestures: valid,
          groups: partitionOf(VARIANT[variant].beat, variant).groups,
        }),
      );
      const states = scheduled.states
        .slice(0, 5)
        .map((s: object) => JSON.stringify(s));
      expect(new Set(states).size).toBe(5);
    });
    it("should give every scrolly card a distinct state and accept the cards' figures", () => {
      const groups = partitionOf(VARIANT[variant].beat, variant).groups;
      const cards = {
        histogram: [
          "127 des 213 pays sous 4 tonnes.",
          "127 en dessous, 86 au-dessus.",
          "Soit 6 pays sur 10.",
        ],
        "pictogram-isotype": [
          "Les 40 pays.",
          "6 pays seulement.",
          "6 pays sur 40.",
        ],
      }[variant];
      const list = LIST[variant].map((g, i) => ({ ...g, card: cards[i] }));
      const { scheduled } = stage(variant, list, "scrolly", (valid) => {
        const s = scheduleUnitsScrolly({ gestures: valid, groups });
        checkCards({
          gestures: valid,
          plan: s.plan,
          rows: groups.map((g: any) => ({ name: g.name, value: g.count })),
          facts: Object.fromEntries(
            groups.map((g: any) => [
              g.name,
              [g.lo, g.hi].filter(Number.isFinite),
            ]),
          ),
        });
        return s;
      });
      expect(
        new Set(scheduled.states.map((s: object) => JSON.stringify(s))).size,
      ).toBe(4);
    });
    it("should refuse a false count in a note and offer the drawn one", () => {
      const wrong = LIST[variant].map((g) =>
        g.do === "bracket"
          ? { ...g, note: variant === "histogram" ? "130 sur 213" : "7 sur 40" }
          : g,
      );
      const error = refusal(() => stage(variant, wrong, "static"));
      expect(JSON.stringify(error.fix)).toContain(
        variant === "histogram" ? "127 sur 213" : "6 sur 40",
      );
    });
  },
);

describe("the units family's own rules", () => {
  it("should refuse a rule between two bin edges and offer the nearest edge (no-change-bin-edge)", () => {
    const error = refusal(() =>
      stage("histogram", [{ do: "reference", value: 5 }], "static"),
    );
    expect(error.fix).toEqual({ set: { index: 0, field: "value", value: 4 } });
  });
  it("should accept a rule on a bin edge", () => {
    expect(
      stage("histogram", [{ do: "reference", value: 4 }], "static").valid
        .length,
    ).toBe(1);
  });
  it("should refuse a rule's note that states a count the rule does not draw", () => {
    const error = refusal(() =>
      stage(
        "histogram",
        [{ do: "reference", value: 4, note: "130 pays sous 4 tonnes" }],
        "static",
      ),
    );
    expect(error.field).toBe("gestures[0].note");
  });
  it("should accept a rule's share stated in per cent", () => {
    expect(
      stage(
        "histogram",
        [{ do: "reference", value: 4, note: "60 % sous 4 tonnes" }],
        "static",
      ).valid.length,
    ).toBe(1);
  });
  it("should refuse a count that states the number of groups instead of the things in them", () => {
    const error = refusal(() =>
      stage("histogram", [{ do: "count", note: "10 tranches" }], "static"),
    );
    expect(error.message).toContain("counts the units");
  });
  it("should accept a count that states the things counted", () => {
    expect(
      stage("histogram", [{ do: "count", note: "213 pays" }], "static").valid
        .length,
    ).toBe(1);
  });
  it("should refuse a rank word that does not hold by count, even where an edge would rank the group first", () => {
    const error = refusal(() =>
      stage(
        "histogram",
        [{ do: "name", mark: "36+", note: "le plus" }],
        "static",
      ),
    );
    expect(error.field).toBe("gestures[0].note");
  });
  it("should accept a note naming the edge of the group it acts on", () => {
    expect(
      stage(
        "pictogram-isotype",
        [{ do: "highlight", mark: "middle", note: "6 pays entre 60 et 75 %" }],
        "static",
      ).valid.length,
    ).toBe(1);
  });
  it("should accept a bracket and a count on a rate's readings, because the marks count things", () => {
    expect(
      stage(
        "histogram",
        [{ do: "bracket", mark: "0–4", of: "whole", note: "127 sur 213" }],
        "static",
      ).valid.length,
    ).toBe(1);
  });
  it("should refuse a rule between two blocks that do not sit together", () => {
    const beat = {
      units: MIX,
      blocks: [
        PICTO.beat.blocks[1],
        PICTO.beat.blocks[0],
        PICTO.beat.blocks[2],
      ],
    };
    const partition = partitionOf(beat, "pictogram-isotype");
    const error = refusal(() =>
      stageUnits({
        gestures: [
          { do: "reference", value: 75 },
          { do: "reference", value: 60 },
          { do: "highlight", mark: "middle" },
        ],
        partition,
        claim: { takeaway: "6 pays entre 60 et 75 %" },
        format: "static",
        schedule: (v: any) => v,
      }),
    );
    expect(error.field).toBe("gestures[1]");
  });
  it("should refuse zoom, which a units chart has no axis to enlarge", () => {
    const error = refusal(() =>
      stage("histogram", [{ do: "zoom", mark: "0–4", note: "×3" }], "web"),
    );
    expect(error.field).toBe("gestures[0].do");
  });
  it("should land every group's units at one pace (no-let-blocks-count)", () => {
    const units = createUnits({
      groups: partitionOf(PICTO.beat, "pictogram-isotype").groups,
    });
    expect(Object.values(units.filled(0.25))).toEqual([4, 4, 4]);
  });
  it("should refuse a state that redraws the partition (no-change-bin-edge)", () => {
    const groups = partitionOf(HIST.beat, "histogram").groups;
    const units = createUnits({ groups });
    expect(() =>
      units.invariants([units.rest(), { ...units.rest(), partition: "other" }]),
    ).toThrow("no-change-bin-edge");
  });
  it("should draw every pictogram block with one square size (no-scale-icon-carry)", () => {
    const groups = partitionOf(PICTO.beat, "pictogram-isotype").groups;
    const geo = layoutRows({
      groups,
      variant: "pictogram-isotype",
      box: { x: 0, y: 0, width: 800, height: 300 },
      gutter: 100,
    });
    expect(new Set(geo.rows.map((r: any) => r.cellAt(0).size)).size).toBe(1);
  });
  it("should state a whole-bracket's figure as the group's own count, then the whole", () => {
    const groups = partitionOf(PICTO.beat, "pictogram-isotype").groups;
    const { scheduled } = stage(
      "pictogram-isotype",
      PICTO_LIST,
      "video",
      (valid) => scheduleUnitsVideo({ gestures: valid, groups }),
    );
    expect(scheduled.plan[2].steps).toEqual([6, 40]);
  });
  it("should repair a false rule into an accepted list without inventing a figure", () => {
    const { gestures } = stage(
      "histogram",
      [
        { do: "highlight", mark: "0–4" },
        { do: "reference", value: 5, note: "130 pays sous 5 tonnes" },
      ],
      "static",
      (v) => v,
      true,
    );
    expect(gestures[1].value).toBe(4);
  });
  it("should let the title state a share of a run of groups in tenths", () => {
    expect(
      headlineFigures(partitionOf(HIST.beat, "histogram")).some(
        (f: number) => Math.round(f) === 6,
      ),
    ).toBe(true);
  });
});
