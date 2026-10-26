// beat.mjs for the worked example proof/video-grouped-bar-wind-vs-solar — « Dans cinq de ces six pays l’éolien devance le
// solaire, la Suisse est l’exception », told in time. Every number the video draws is COMPUTED from data.json; the order,
// the lead and the one exception are worked out by render-beat.mjs from `groups`, and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const YEAR = 2024;
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
// The rest of each country's electricity, stacked from the bottom under the two series.
const OTHERS = ["Nuclear", "Hydropower", "Coal", "Gas", "Oil", "Bioenergy", "Other renewables"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation, in %.
const groups = data.rows
  .filter((r) => NAMES[r[at("Entity")]] && Number(r[at("Year")]) === YEAR)
  .map((r) => {
    const total = [...OTHERS, "Wind", "Solar"].reduce((s, c) => s + Number(r[at(c)]), 0);
    const share = (c) => (Number(r[at(c)]) / total) * 100;
    return { name: NAMES[r[at("Entity")]], first: share("Wind"), second: share("Solar"), others: OTHERS.map(share) };
  });
const reversals = groups.filter((g) => g.second > g.first);
const lead = groups.length - reversals.length;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe, 2024",
  groups,
  // The first series is drawn in the accent, the second in a muted ink.
  firstName: "Éolien",
  secondName: "Solaire",
  // The one group where the second series leads: it alone stays forward, then is ringed.
  subject: reversals[0]?.name ?? "",
  // Said once, after the two series' names: what the shares are of.
  unit: "· en % de l’électricité",
  // The lead count while the first series' level is carried across: k groups of n where the first leads.
  count: (k, n) => `éolien devant : ${k} sur ${n}`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Dans cinq de ces six pays l’éolien devance le solaire, la Suisse est l’exception", "L’éolien devance le solaire, sauf en Suisse"],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (lead !== 5 || groups.length !== 6) throw new Error(`wind leads solar in ${lead} of ${groups.length} countries, not 5 of 6`);
    if (reversals.length !== 1 || reversals[0].name !== "Suisse") throw new Error(`the exception is ${reversals.map((g) => g.name).join(", ") || "none"}, not Switzerland alone`);
  },
};
