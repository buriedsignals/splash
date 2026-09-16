// THE SUBJECT OF `static-donut-world-co2-share`, LOADED AND ASSERTED — every country's tonnes in 2000 and 2023 (per person
// × population), the world's totals summed from them, the six largest 2023 emitters; the static beat's own checks (its
// `render-directions.mjs` runs them inline and exports nothing): the United States above China in 2000 and China above
// the United States in 2023, the world up by more than a third, at least one of the six whose share fell while its tonnes
// rose. The title's « un quart » and « un septième » are checked here too.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-donut-world-co2-share");
export const FROM = 2000;
export const TO = 2023;
export const HOW_MANY = 6;
export const SUBJECT = "CHN";
export const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud",
};
/** The two countries the world ring names. */
export const NAMED = ["CHN", "USA"];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (name) => header.indexOf(name);
  const all = csv.slice(1).map((l) => {
    const c = l.split(",");
    return {
      code: c[at("code")],
      entity: c[at("entity")],
      gt0: (Number(c[at(`t_per_person_${FROM}`)]) * Number(c[at(`population_${FROM}`)])) / 1e9,
      gt1: (Number(c[at(`t_per_person_${TO}`)]) * Number(c[at(`population_${TO}`)])) / 1e9,
    };
  });
  for (const c of all)
    if (!c.code || !Number.isFinite(c.gt0) || !Number.isFinite(c.gt1)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

  const world0 = all.reduce((s, c) => s + c.gt0, 0);
  const world1 = all.reduce((s, c) => s + c.gt1, 0);
  const six = [...all].sort((a, b) => b.gt1 - a.gt1).slice(0, HOW_MANY);
  for (const c of six) if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);
  const countries = six.map((c) => ({ ...c, name: NAMES[c.code], share0: (c.gt0 / world0) * 100, share1: (c.gt1 / world1) * 100 }));
  const byCode = Object.fromEntries(countries.map((c) => [c.code.toLowerCase(), c]));
  const { usa, chn } = byCode;
  if (!chn || !usa) throw new Error(`the headline names China and the United States; the computed six are ${six.map((c) => c.code).join(", ")}`);
  if (!(usa.share0 > chn.share0 && chn.share1 > usa.share1))
    throw new Error(`the headline says the two swapped; ${FROM} was ${usa.share0.toFixed(1)}/${chn.share0.toFixed(1)} and ${TO} is ${usa.share1.toFixed(1)}/${chn.share1.toFixed(1)}`);
  if (Math.round(100 / usa.share0) !== 4) throw new Error(`the title says a quarter; the United States held ${usa.share0.toFixed(1)} %`);
  if (Math.round(100 / chn.share0) !== 7) throw new Error(`the title says a seventh; China held ${chn.share0.toFixed(1)} %`);
  const growth = (world1 / world0 - 1) * 100;
  if (!(growth > 30)) throw new Error(`the whole should have grown by about half; it grew ${growth.toFixed(0)} %`);
  const fellButRose = countries.filter((c) => c.share1 < c.share0 && c.gt1 > c.gt0).map((c) => c.code);
  if (!fellButRose.length) throw new Error("none of the six holds a smaller share and larger tonnes; the trap this form sets has no case");

  return { countries, byCode, world0, world1, growth, fellButRose };
}
