// beat.mjs for the worked example proof/video-donut-world-co2-share — « En 2000 les États-Unis émettaient un quart du CO₂
// mondial et la Chine un septième ; en 2023, c’est l’inverse », told in time. Every number the video draws is COMPUTED
// from data.json; each ring's shares are computed by render-beat.mjs and handed to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE] = [col("entity"), col("code")];
const [PP0, PP1, POP0, POP1] = [col("t_per_person_2000"), col("t_per_person_2023"), col("population_2000"), col("population_2023")];

const FROM = 2000;
const TO = 2023;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud",
};

// Every country's tonnes (per person × population), in billions of tonnes; the world is the sum of every country.
const all = data.rows.map((r) => ({ key: r[CODE], name: NAMES[r[CODE]] ?? r[ENTITY], before: (Number(r[PP0]) * Number(r[POP0])) / 1e9, after: (Number(r[PP1]) * Number(r[POP1])) / 1e9 }));
const wholeBefore = all.reduce((s, c) => s + c.before, 0);
const wholeAfter = all.reduce((s, c) => s + c.after, 0);
// The six largest emitters of 2023.
const rings = [...all].sort((a, b) => b.after - a.after).slice(0, 6);

const fr = (v, digits = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[   ]/g, " ");

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rings,
  wholeBefore,
  wholeAfter,
  subject: "CHN",
  // The two named beside their arcs on the world ring: the subject and the one the takeaway compares it with.
  named: ["CHN", "USA"],
  from: FROM,
  to: TO,
  formatShare: (v) => `${fr(v)} %`,
  formatAbsolute: (v) => `${fr(v)} Gt`,
  // The sentence the credit leads with, if the frame can only draw the first n rings.
  fewerNote: (n) => `Les ${n} premiers émetteurs de ${TO}`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c’est l’inverse",
    "La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial",
    `Les parts du CO₂ mondial, ${FROM} et ${TO}`,
  ],
  source: ["Sources : Global Carbon Budget 2025 · population, via Our World in Data", "Sources : Global Carbon Budget, Our World in Data"],
  evidenceLevels: 4,
  check({ rings: drawn, wholeGrowth }) {
    const chn = drawn.find((r) => r.code === "CHN");
    const usa = drawn.find((r) => r.code === "USA");
    if (!chn || !usa) throw new Error(`the title names China and the United States; the six are ${drawn.map((r) => r.code).join(", ")}`);
    if (Math.round(100 / usa.shareBefore) !== 4) throw new Error(`the title says a quarter; the United States held ${fr(usa.shareBefore)} % in ${FROM}`);
    if (Math.round(100 / chn.shareBefore) !== 7) throw new Error(`the title says a seventh; China held ${fr(chn.shareBefore)} % in ${FROM}`);
    if (!(chn.shareAfter > usa.shareAfter)) throw new Error(`the title says the two swapped; in ${TO} China holds ${fr(chn.shareAfter)} % and the United States ${fr(usa.shareAfter)} %`);
    if (!(wholeGrowth > 0)) throw new Error(`the world's CO₂ fell by ${fr(-wholeGrowth, 0)} %`);
  },
};
