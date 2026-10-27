// Models of the five keyed-family types, built from their proof examples' frozen data (eval/seeds/gx-<slug>).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const seed = (slug: string) => JSON.parse(readFileSync(join(import.meta.dirname, "..", "eval", "seeds", `gx-${slug}`, "beats", "1", "data.json"), "utf8"));
const colOf = (t: any) => (n: string) => t.columns.findIndex((c: any) => c.name === n);

export function ganttModel() {
  const t = seed("gantt");
  const c = colOf(t);
  const [E, C, Y, V] = [c("Entity"), c("Code"), c("Year"), c("Annual CO₂ emissions")];
  const held = new Map<string, number[]>();
  for (let y = 1990; y <= 2024; y++)
    for (const r of t.rows.filter((r: any) => r[Y] === y && /^[A-Z]{3}$/.test(r[C] ?? "") && Number.isFinite(r[V])).sort((a: any, b: any) => b[V] - a[V]).slice(0, 10))
      held.set(r[E], [...(held.get(r[E]) ?? []), y]);
  const rows = [...held].map(([name, ys]) => {
    const runs: any[] = [];
    let from = ys[0], prev = ys[0];
    for (const y of ys.slice(1)) { if (y !== prev + 1) { runs.push({ from, to: prev }); from = y; } prev = y; }
    runs.push({ from, to: prev, open: prev === 2024 });
    return { name, runs };
  });
  return { rows, first: 1990, last: 2024 };
}

const MIX = ["Wind", "Solar", "Hydropower", "Bioenergy", "Other renewables", "Nuclear", "Gas", "Coal", "Oil"];
export function sankeyFlows() {
  const t = seed("sankey");
  const c = colOf(t);
  const rows = t.rows.filter((r: any) => r[c("Year")] === 2024);
  return MIX.flatMap((s) => rows.map((r: any) => ({ from: s, to: r[c("Entity")], value: Number(r[c(s)]) })));
}
export function radarEntities() {
  const t = seed("radar-spider");
  const c = colOf(t);
  return ["France", "Germany"].map((e) => {
    const r = t.rows.find((r: any) => r[c("Entity")] === e && r[c("Year")] === 2024);
    const total = MIX.reduce((s, m) => s + Number(r[c(m)]), 0);
    return { name: e, values: Object.fromEntries(MIX.map((m) => [m, (Number(r[c(m)]) / total) * 100])) };
  });
}
const LOW = ["hydro", "wind", "solar", "bioenergy_stacked", "other_renewables", "nuclear"].map((k) => `${k}_generation__twh`);
const FOSSIL = ["gas", "coal", "oil"].map((k) => `${k}_generation__twh`);
export function multiplesPanelsData() {
  const t = seed("small-multiples");
  const c = colOf(t);
  const share = (r: any) => { const s = (ks: string[]) => ks.reduce((a, k) => a + Number(r[c(k)] || 0), 0); return (s(LOW) / (s(LOW) + s(FOSSIL))) * 100; };
  const names = [...new Set(t.rows.map((r: any) => r[c("entity")]))] as string[];
  return names.map((n) => ({ name: n, bars: [2000, 2024].map((y) => ({ name: String(y), value: share(t.rows.find((r: any) => r[c("entity")] === n && r[c("year")] === y)) })) }));
}
export function parallelEntities() {
  const t = seed("parallel-coordinates");
  const c = colOf(t);
  const axes = ["nuclear", "wind", "solar", "hydro", "gas", "coal"];
  const all = [...axes, "bioenergy_stacked", "oil", "other_renewables"];
  return {
    axes,
    entities: t.rows.filter((r: any) => r[c("year")] === 2024).map((r: any) => {
      const total = all.reduce((s, k) => s + Number(r[c(`${k}_generation__twh`)]), 0);
      return { name: r[c("entity")], values: Object.fromEntries(axes.map((a) => [a, (Number(r[c(`${a}_generation__twh`)]) / total) * 100])) };
    }),
  };
}
