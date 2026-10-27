import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { stackFromBeat } from "../craft/_shared/gesture-family-stack.mjs";
import * as scrolly from "../craft/_shared/gesture-stack-scrolly.mjs";

// The scheduler is untyped JS; its defaults would otherwise narrow `format` to String.
const stageStackScrolly: (input: any) => any = scrolly.stageStackScrolly;
const pageData: (input: any) => any = scrolly.pageData;

// The three proof examples, read from the eval seeds' frozen data.json as the beat.example.mjs files read them.
const SEEDS = join(import.meta.dirname, "..", "eval", "seeds");
const table = (slug: string) => JSON.parse(readFileSync(join(SEEDS, `gx-${slug}`, "beats", "1", "data.json"), "utf8"));
const fr = (v: number) => Math.round(v).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const one = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function stacked() {
  const t = table("stacked-bar");
  const col = (n: string) => t.columns.findIndex((c: any) => c.name === n);
  const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
  const low = (r: any[]) => CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);
  const NAMES: Record<string, string> = { Spain: "Espagne", France: "France", Germany: "Allemagne" };
  const entities = [...new Set(t.rows.map((r: any[]) => r[col("entity")]))] as string[];
  const rows = entities
    .map((e) => {
      const a = low(t.rows.find((r: any[]) => r[col("entity")] === e && r[col("year")] === 2000));
      const b = low(t.rows.find((r: any[]) => r[col("entity")] === e && r[col("year")] === 2024));
      return { name: NAMES[e] ?? e, parts: { "produit en 2000": a, "ajouté depuis": b - a } };
    })
    .sort((x, y) => y.parts["ajouté depuis"] - x.parts["ajouté depuis"]);
  const stack = stackFromBeat({ rows, parts: ["produit en 2000", "ajouté depuis"] }, "stacked-bar");
  const spain = rows.find((r) => r.name === "Espagne")!;
  const france = rows.find((r) => r.name === "France")!;
  const claim = { takeaway: "L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000", entity: "Espagne", versus: "France", facts: {} };
  const gestures = [
    { do: "highlight", mark: "Espagne", card: `L’Espagne en produit ${fr(spain.parts["produit en 2000"] + spain.parts["ajouté depuis"])} TWh en 2024.` },
    { do: "compare", marks: ["Espagne · ajouté depuis", "France · ajouté depuis"], note: `+${fr(spain.parts["ajouté depuis"])} contre +${fr(france.parts["ajouté depuis"])}`, card: `Elle en a ajouté ${fr(spain.parts["ajouté depuis"])} TWh, contre ${fr(france.parts["ajouté depuis"])} pour la France.` },
    { do: "name", mark: "France", card: `La France reste devant au total : ${fr(france.parts["produit en 2000"] + france.parts["ajouté depuis"])} TWh.` },
  ];
  return { stack, claim, gestures, format: fr };
}

function likert() {
  const t = table("diverging-stacked-bar-likert");
  const at = (n: string) => t.columns.findIndex((c: any) => c.name === n);
  const LEFT = [["Gas", "Gaz"], ["Oil", "Pétrole"], ["Coal", "Charbon"]];
  const RIGHT = [["Bioenergy", "Bioénergie"], ["Other renewables", "Autres renouv."], ["Hydropower", "Hydraulique"], ["Solar", "Solaire"], ["Wind", "Éolien"]];
  const ALL = [...LEFT, ...RIGHT, ["Nuclear", "Nucléaire"]];
  const rows = t.rows
    .filter((r: any[]) => r[at("Year")] === 2024)
    .map((r: any[]) => {
      const total = ALL.reduce((s, [c]) => s + r[at(c)], 0);
      return { name: r[at("Entity")], parts: Object.fromEntries(ALL.map(([c, l]) => [l, (r[at(c)] / total) * 100])) };
    });
  const stack = stackFromBeat({ rows, left: LEFT.map(([, l]) => l), right: RIGHT.map(([, l]) => l), centre: "Nucléaire" }, "diverging-stacked-bar-likert");
  const france = rows.find((r: any) => r.name === "France");
  const others = [...LEFT, ...RIGHT].map(([, l]) => `France · ${l}`);
  const rest = others.reduce((s, m) => s + france.parts[m.split(" · ")[1]], 0);
  const claim = { takeaway: "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis", entity: "France", unit: "%", facts: {} };
  const gestures = [
    { do: "highlight", mark: "France", card: `En France, le nucléaire fait ${one(france.parts.Nucléaire)} % de l’électricité.` },
    { do: "compare", mark: "France · Nucléaire", of: others, note: `${one(france.parts.Nucléaire)} % contre ${one(rest)} %`, card: `Les deux autres réunis n’en font que ${one(rest)} %.` },
  ];
  return { stack, claim, gestures, format: one };
}

function bridge() {
  const t = table("waterfall-bridge");
  const col = (n: string) => t.columns.findIndex((c: any) => c.name === n);
  const row = (y: number) => t.rows.find((r: any[]) => r[col("Year")] === y);
  const sum = (r: any[], ns: string[]) => ns.reduce((s, n) => s + Number(r[col(n)] ?? 0), 0);
  const REN = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
  const FOS = ["Gas", "Oil", "Coal"];
  const ALL = [...REN, "Nuclear", ...FOS];
  const [a, b] = [row(2015), row(2024)];
  const steps = [
    { name: "Renouvelables", value: sum(b, REN) - sum(a, REN) },
    { name: "Nucléaire", value: sum(b, ["Nuclear"]) - sum(a, ["Nuclear"]) },
    { name: "Fossile", value: sum(b, FOS) - sum(a, FOS) },
  ];
  const opening = sum(a, ALL);
  const closing = sum(b, ALL);
  const stack = stackFromBeat({ opening: { name: "2015", value: opening }, steps, closing: { name: "2024", value: closing } }, "waterfall-bridge");
  const claim = { takeaway: "L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015", facts: {} };
  const gestures = [
    { do: "bracket", marks: steps.map((s) => s.name), note: `${one(opening - closing)} TWh de moins`, card: `Au bout du compte : ${one(opening - closing)} TWh de moins.` },
    { do: "name", mark: "Nucléaire", card: `La sortie du nucléaire retire ${one(-steps[1].value)} TWh.` },
    { do: "compare", marks: ["Fossile", "Renouvelables"], card: `Le fossile recule de ${one(-steps[2].value)} TWh, plus que les ${one(steps[0].value)} gagnés.` },
  ];
  return { stack, claim, gestures, format: one };
}

const CASES = { "stacked-bar": stacked, "diverging-stacked-bar-likert": likert, "waterfall-bridge": bridge };

for (const [slug, make] of Object.entries(CASES)) {
  describe(`stack scrolly — ${slug}`, () => {
    const { stack, claim, gestures, format } = make();
    const staged = stageStackScrolly({ gestures, stack, claim, format });
    const { states, plan } = staged.scheduled;

    it("should give one state per gesture card and one closing card", () => {
      expect(states.length).toBe(gestures.length + 1);
    });
    it("should change the picture on every card", () => {
      for (let k = 1; k < states.length; k++) expect(JSON.stringify(states[k])).not.toBe(JSON.stringify(states[k - 1]));
    });
    it("should land each gesture on its own card and keep it drawn after", () => {
      gestures.forEach((_, k) => {
        expect(states[k][`g${k}`]).toBe(1);
        if (k > 0) expect(states[k - 1][`g${k}`]).toBe(0);
        expect(states.at(-1)![`g${k}`]).toBe(1);
      });
    });
    it("should bring every bar back on the closing card, with the closing card's note", () => {
      const closing = states.at(-1)!;
      expect(closing.note).toBe(gestures.length);
      expect(Object.keys(closing).filter((k) => k.startsWith("back")).every((k) => closing[k] === 0)).toBe(true);
    });
    it("should hold every state as finite numbers", () => {
      expect(states.every((s: any) => Object.values(s).every((v) => typeof v === "number" && Number.isFinite(v)))).toBe(true);
    });
    it("should lay every compare's copy inside the page's one value axis", () => {
      const data = pageData({ stack, drawn: staged.drawn, plan, format, fills: () => "#000000" });
      for (const p of data.plan.filter((x: any) => x.do === "compare")) {
        expect(Math.min(p.from, p.to)).toBeGreaterThanOrEqual(data.domain[0] - 1e-9);
        expect(Math.max(p.from, p.to)).toBeLessThanOrEqual(data.domain[1] + 1e-9);
      }
    });
    it("should refuse a card stating a figure its picture does not draw, with a fix that is accepted", () => {
      const bad = structuredClone(gestures);
      bad[0].card = `${bad[0].card} Et 123456 de plus.`;
      let error: any;
      try {
        stageStackScrolly({ gestures: bad, stack, claim, format });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(GestureRefusal);
      expect(error.field).toBe("gestures[0].card");
      expect(() => stageStackScrolly({ gestures: applyFix(bad, error.fix), stack, claim, format })).not.toThrow();
    });
  });
}

describe("stack scrolly — family rules", () => {
  it("should accept a whole bar's segment as the figure a highlight card shows", () => {
    const { stack, claim, gestures, format } = stacked();
    const spain = stack.unit(stack.expand("Espagne")).segs.map((m: string) => stack.marks.find((x: any) => x.name === m).value);
    const g = [{ ...gestures[0], card: `L’Espagne produisait ${fr(spain[0])} TWh en 2000.` }];
    expect(() => stageStackScrolly({ gestures: g, stack, claim, format })).not.toThrow();
  });
  it("should accept a Likert side total as the figure a highlight card shows", () => {
    const { stack, claim, gestures, format } = likert();
    const g = [{ ...gestures[0], card: `Le fossile y fait ${one(stack.sideTotal("France", "left"))} %.` }];
    expect(() => stageStackScrolly({ gestures: g, stack, claim, format })).not.toThrow();
  });
  it("should start a reveal with no part drawn and end it with every part drawn", () => {
    const { stack, claim, gestures, format } = bridge();
    const g = [gestures[1], { do: "reveal", card: "De 2015 à 2024, étape par étape : 143,2 TWh de moins." }, gestures[2]];
    const { scheduled } = stageStackScrolly({ gestures: g, stack, claim, format });
    expect([scheduled.states[0].ink, scheduled.states[1].ink, scheduled.states.at(-1).ink]).toEqual([0, 1, 1]);
  });
  it("should step back the bars a filter leaves out, and bring them back on the closing card", () => {
    const { stack, claim, gestures, format } = stacked();
    const g = [gestures[0], { do: "filter", marks: ["Espagne", "France"], card: `L’Espagne et la France : ${fr(stack.whole("Espagne"))} et ${fr(stack.whole("France"))} TWh.` }];
    const { scheduled, drawn } = stageStackScrolly({ gestures: g, stack, claim, format });
    const other = drawn.findIndex((b: string) => b !== "Espagne" && b !== "France");
    expect(scheduled.states[1][`back${other}`]).toBe(1);
    expect(scheduled.states.at(-1)[`back${other}`]).toBe(0);
  });
});
