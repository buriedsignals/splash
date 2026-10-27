import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { stackFromBeat } from "../craft/_shared/gesture-family-stack.mjs";
import { stageStackWeb } from "../craft/_shared/gesture-stack-web.mjs";

// The three proof examples, read from the seeds' frozen data.json the way the kits' beat.example.mjs read them.
const SEEDS = join(import.meta.dirname, "..", "eval", "seeds");
const table = (slug: string) =>
  JSON.parse(
    readFileSync(join(SEEDS, `gx-${slug}`, "beats", "1", "data.json"), "utf8"),
  );
const colOf = (t: any) => (name: string) =>
  t.columns.findIndex((c: any) => c.name === name);
const fr1 = (v: number) =>
  v.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const fr0 = (v: number) =>
  Math.round(v).toLocaleString("fr-FR").replace(/[  ]/g, " ");

function stacked() {
  const t = table("stacked-bar");
  const col = colOf(t);
  const CLEAN = [
    "hydro_generation__twh",
    "wind_generation__twh",
    "solar_generation__twh",
    "bioenergy_stacked_generation__twh",
    "other_renewables_generation__twh",
    "nuclear_generation__twh",
  ].map(col);
  const low = (r: any[]) =>
    CLEAN.reduce((s: number, i: number) => s + Number(r[i] || 0), 0);
  const NAME: Record<string, string> = {
    Spain: "Espagne",
    France: "France",
    Germany: "Allemagne",
  };
  const rows = [...new Set(t.rows.map((r: any[]) => r[col("entity")]))].map(
    (e: any) => {
      const a = low(
        t.rows.find(
          (r: any[]) => r[col("entity")] === e && r[col("year")] === 2000,
        ),
      );
      const b = low(
        t.rows.find(
          (r: any[]) => r[col("entity")] === e && r[col("year")] === 2024,
        ),
      );
      return {
        name: NAME[e] ?? e,
        parts: { "produit en 2000": a, "ajouté depuis": b - a },
      };
    },
  );
  const stack = stackFromBeat(
    { rows, parts: ["produit en 2000", "ajouté depuis"] },
    "stacked-bar",
  );
  const claim = {
    takeaway:
      "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000",
    entity: "Espagne",
    versus: "France",
  };
  const added = (n: string) =>
    rows.find((r) => r.name === n)!.parts["ajouté depuis"];
  return { stack, claim, added };
}

function likert() {
  const t = table("diverging-stacked-bar-likert");
  const col = colOf(t);
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
  const ALL = [...LEFT, ...RIGHT, ["Nuclear", "Nucléaire"]];
  const rows = t.rows
    .filter((r: any[]) => r[col("Year")] === 2024)
    .map((r: any[]) => {
      const total = ALL.reduce((s, [c]) => s + r[col(c)], 0);
      return {
        name: r[col("Entity")],
        parts: Object.fromEntries(
          ALL.map(([c, l]) => [l, (r[col(c)] / total) * 100]),
        ),
      };
    });
  const stack = stackFromBeat(
    {
      rows,
      left: LEFT.map((l) => l[1]),
      right: RIGHT.map((l) => l[1]),
      centre: "Nucléaire",
    },
    "diverging-stacked-bar-likert",
  );
  const claim = {
    takeaway:
      "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis",
    entity: "France",
    unit: "%",
  };
  const france = rows.find((r: any) => r.name === "France");
  const others = [...LEFT, ...RIGHT].map(([, l]) => `France · ${l}`);
  return { stack, claim, france, others };
}

function bridge() {
  const t = table("waterfall-bridge");
  const col = colOf(t);
  const row = (y: number) => t.rows.find((r: any[]) => r[col("Year")] === y);
  const sum = (r: any[], ns: string[]) =>
    ns.reduce((s, n) => s + Number(r[col(n)] ?? 0), 0);
  const REN = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
  const FOS = ["Gas", "Oil", "Coal"];
  const ALL = [...REN, "Nuclear", ...FOS];
  const [a, b] = [row(2015), row(2024)];
  const steps = [
    { name: "Renouvelables", value: sum(b, REN) - sum(a, REN) },
    { name: "Nucléaire", value: sum(b, ["Nuclear"]) - sum(a, ["Nuclear"]) },
    { name: "Fossile", value: sum(b, FOS) - sum(a, FOS) },
  ];
  const stack = stackFromBeat(
    {
      opening: { name: "2015", value: sum(a, ALL) },
      steps,
      closing: { name: "2024", value: sum(b, ALL) },
    },
    "waterfall-bridge",
  );
  const claim = {
    takeaway:
      "L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015",
  };
  return { stack, claim, steps, net: sum(a, ALL) - sum(b, ALL) };
}

const sameState = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

describe("the Stack web scheduler — stacked-bar (Spain against France)", () => {
  const { stack, claim, added } = stacked();
  const gestures = [
    { do: "highlight", mark: "Espagne" },
    {
      do: "compare",
      marks: ["Espagne · ajouté depuis", "France · ajouté depuis"],
      note: `+${fr0(added("Espagne"))} TWh contre +${fr0(added("France"))}`,
    },
  ];
  const staged = stageStackWeb({ gestures, stack, claim, format: fr0 });

  it("should rest the highlight on the page and turn the compare into one control", () => {
    expect(staged.scheduled.controls.map((c: any) => c.do)).toEqual([
      "compare",
    ]);
  });
  it("should lay the compare's copy only on the control's plate, not on the resting page", () => {
    expect([
      staged.scheduled.resting.copies.length,
      staged.scheduled.controls[0].plate.copies.length,
    ]).toEqual([0, 1]);
  });
  it("should draw the control's state distinct from the resting state", () => {
    expect(
      sameState(staged.scheduled.resting, staged.scheduled.controls[0].plate),
    ).toBe(false);
  });
  it("should put Spain in the accent on the resting page", () => {
    expect(staged.scheduled.resting.accent).toContain("Espagne");
  });
  it("should declare ask-a-mark and the control's atom", () => {
    expect(staged.interaction.controls.map((c: any) => c.gesture)).toEqual([
      "ask-a-mark",
      "toggle-a-comparison",
    ]);
  });
  it("should refuse a compare note stating a gap the rows do not give, with the derived gap as its fix", () => {
    const bad = [gestures[0], { ...gestures[1], note: "500 TWh de plus" }];
    let error: any;
    try {
      stageStackWeb({ gestures: bad, stack, claim, format: fr0 });
    } catch (e) {
      error = e;
    }
    expect(
      error instanceof GestureRefusal && error.field === "gestures[1].note",
    ).toBe(true);
  });
  it("should refuse a page where every gesture rests, adding a control as its fix", () => {
    let error: any;
    try {
      stageStackWeb({ gestures: [gestures[0]], stack, claim, format: fr0 });
    } catch (e) {
      error = e;
    }
    expect(error?.fix && "add" in error.fix).toBe(true);
  });
  it("should refuse a reorder into the order the bars already hold", () => {
    const sorted = [...stack.names].sort(
      (a, b) => stack.whole(b) - stack.whole(a),
    );
    const s2 = stackFromBeat(
      {
        rows: sorted.map((n) => ({
          name: n,
          parts: Object.fromEntries(
            stack.parts.map((p: string) => [p, stack.valueOf(n, p)]),
          ),
        })),
        parts: stack.parts,
      },
      "stacked-bar",
    );
    expect(() =>
      stageStackWeb({
        gestures: [gestures[0], { do: "reorder", value: "descending" }],
        stack: s2,
        claim,
        format: fr0,
      }),
    ).toThrow(/change nothing/);
  });
});

describe("the Stack web scheduler — diverging-stacked-bar-likert (France's nuclear)", () => {
  const { stack, claim, france, others } = likert();
  const rest = others.reduce(
    (s: number, m: string) => s + france.parts[m.split(" · ")[1]],
    0,
  );
  const gestures = [
    { do: "highlight", mark: "France" },
    {
      do: "compare",
      mark: "France · Nucléaire",
      of: others,
      note: `${fr1(france.parts["Nucléaire"])} % contre ${fr1(rest)} %`,
    },
  ];
  const staged = stageStackWeb({ gestures, stack, claim, format: fr1 });

  it("should lay a copy of the other parts added up, from where France's nuclear starts", () => {
    const copy = staged.scheduled.controls[0].plate.copies[0];
    expect(
      [copy.from, copy.to - copy.from].map((v: number) => v.toFixed(3)),
    ).toEqual([(-france.parts["Nucléaire"] / 2).toFixed(3), rest.toFixed(3)]);
  });
  it("should keep the resting state free of the control's copy", () => {
    expect(staged.scheduled.resting.copies).toEqual([]);
  });
  it("should refuse a percent the shares do not give", () => {
    expect(() =>
      stageStackWeb({
        gestures: [
          gestures[0],
          { ...gestures[1], note: "90,0 % contre 10,0 %" },
        ],
        stack,
        claim,
        format: fr1,
      }),
    ).toThrow(GestureRefusal);
  });
});

describe("the Stack web scheduler — waterfall-bridge (Germany's 143 TWh)", () => {
  const { stack, claim, steps, net } = bridge();
  const gestures = [
    {
      do: "name",
      mark: "Nucléaire",
      note: `Sortie du nucléaire : −${fr1(-steps[1].value)}`,
    },
    {
      do: "bracket",
      marks: steps.map((s) => s.name),
      note: `${fr1(net)} TWh de moins`,
    },
  ];
  const staged = stageStackWeb({ gestures, stack, claim, format: fr1 });

  it("should bracket the three steps on the control's plate with their net change", () => {
    expect(
      staged.scheduled.controls[0].plate.brackets[0].value.toFixed(1),
    ).toBe((-net).toFixed(1));
  });
  it("should ring the named step on the resting page", () => {
    expect(staged.scheduled.resting.rings).toContain("Nucléaire");
  });
  it("should refuse a reorder of a bridge's steps, dropping it as its fix", () => {
    let error: any;
    try {
      stageStackWeb({
        gestures: [...gestures, { do: "reorder", value: "descending" }],
        stack,
        claim,
        format: fr1,
      });
    } catch (e) {
      error = e;
    }
    expect(error?.fix).toEqual({ remove: 2 });
  });
  it("should reach an accepted list by repair from a false bracket note", () => {
    const repaired = stageStackWeb({
      gestures: [gestures[0], { ...gestures[1], note: "150,0 TWh de moins" }],
      stack,
      claim,
      format: fr1,
      repair: true,
    });
    expect(repaired.repairs.length).toBeGreaterThan(0);
  });
});
