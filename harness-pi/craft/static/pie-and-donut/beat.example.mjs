// beat.mjs for the worked example proof/static-donut-world-co2-share — "En 2000 les États-Unis
// émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c'est l'inverse". The
// absolute values and the two wholes come from data.json; render-beat.mjs computes the shares.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE] = [col("entity"), col("code")];
const [PER0, PER1, POP0, POP1] = [col("per_person_2000"), col("per_person_2023"), col("population_2000"), col("population_2023")];

// Each country's total emissions, in billions of tonnes, at both dates.
const all = data.rows.map((r) => ({
  key: r[CODE],
  name: r[NAME],
  before: (Number(r[PER0]) * Number(r[POP0])) / 1e9,
  after: (Number(r[PER1]) * Number(r[POP1])) / 1e9,
}));
// THE WHOLE is every country, not only the six drawn: one turn is 100 % of the world.
const wholeBefore = all.reduce((s, c) => s + c.before, 0);
const wholeAfter = all.reduce((s, c) => s + c.after, 0);

const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const rings = [...all]
  .sort((a, b) => b.after - a.after)
  .slice(0, 6)
  .map((c) => ({ key: c.key, name: FRENCH[c.key] ?? c.name, before: c.before, after: c.after }));

const share = (c, state) => (state === "before" ? c.before / wholeBefore : c.after / wholeAfter) * 100;
const cn = rings.find((r) => r.key === "CHN");
const us = rings.find((r) => r.key === "USA");
// The trap the form sets, found in the data: a share that fell while the tonnes rose.
const trap = rings.find((r) => share(r, "after") < share(r, "before") && r.after > r.before);
const growth = Math.round((wholeAfter / wholeBefore - 1) * 100);

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Climat · Monde",
  rings,
  wholeBefore,
  wholeAfter,
  subject: "CHN",
  from: 2000,
  to: 2023,
  formatShare: (v) => `${one(v)} %`,
  formatAbsolute: (v) => `${one(v)} Gt`,
  unit: "part du CO₂ mondial — un tour complet = 100 %",
  wholeNote: `Monde : ${one(wholeBefore)} Gt en 2000, ${one(wholeAfter)} Gt en 2023.`,
  title: [
    "En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c’est l’inverse",
    "La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial",
    "Les parts du CO₂ mondial, 2000 et 2023",
  ],
  limits: [
    `Un anneau par pays : l’arc gris est sa part du CO₂ mondial en 2000, l’arc plein sa part en 2023, et un tour complet vaut 100 % du monde — la même échelle sur les six anneaux. La Chine passe de ${one(share(cn, "before"))} à ${one(share(cn, "after"))} %, les États-Unis de ${one(share(us, "before"))} à ${one(share(us, "after"))} %. Mais le total mondial a grossi de ${growth} % entre les deux dates : une part qui rétrécit n’est pas un chiffre qui baisse, et les tonnes sont écrites sous chaque anneau.`,
    `Un anneau par pays : la part du CO₂ mondial en 2000 et en 2023, un tour complet valant 100 %. Le total mondial a grossi de ${growth} % entre les deux dates.`,
    "Un anneau par pays : sa part du CO₂ mondial en 2000 et en 2023.",
  ],
  reading: [
    `Lecture : l’écart entre les deux arcs est le changement de part. La ${trap?.name ?? ""} montre le piège : sa part baisse et ses tonnes montent, parce que le monde a grossi autour d’elle.`,
    "Lecture : l’écart entre les deux arcs est le changement de part, pas de tonnes.",
  ],
  source: "Sources : Global Carbon Budget 2025 · population, via Our World in Data",
  alt: ({ wholeGrowth }) =>
    `Six anneaux, un par pays, où un tour complet vaut 100 % du CO₂ mondial. Sur chaque anneau, un arc pour 2000 et un arc concentrique pour 2023. La Chine passe de ${one(share(cn, "before"))} à ${one(share(cn, "after"))} % du total mondial et les États-Unis de ${one(share(us, "before"))} à ${one(share(us, "after"))} % : les deux ont échangé leurs places. Sous chaque anneau, les tonnes des deux années, parce que le total mondial a grossi de ${Math.round(wholeGrowth)} % entre-temps.`,
  evidenceLevels: 4,
  check({ rings, wholeGrowth }) {
    const c = rings.find((r) => r.code === "CHN");
    const u = rings.find((r) => r.code === "USA");
    if (!c || !u) throw new Error(`China and the United States are not both among the rings drawn`);
    // "a quarter" and "a seventh", read at the takeaway's precision, then swapped.
    if (Math.round(100 / u.shareBefore) !== 4 || Math.round(100 / c.shareBefore) !== 7)
      throw new Error(`in 2000 the US held ${u.shareBefore.toFixed(1)} % and China ${c.shareBefore.toFixed(1)} %: not a quarter and a seventh`);
    if (!(c.shareAfter > u.shareAfter)) throw new Error(`in 2023 China (${c.shareAfter.toFixed(1)} %) does not exceed the US (${u.shareAfter.toFixed(1)} %)`);
    if (!trap) throw new Error(`no ring's share fell while its tonnes rose: the reading line would warn about nothing`);
    if (!(wholeGrowth > 30)) throw new Error(`the whole grew ${wholeGrowth.toFixed(0)} %, not about half`);
  },
};
