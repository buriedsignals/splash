// beat.mjs for the worked example proof/video-dot-density-europe-stations — « 72 réacteurs sur 8 900 centrales
// bas-carbone — et un tiers de la puissance », told in time. data.json is the register of low-carbon stations. Every
// number the video draws is COMPUTED from data.json; the arrival order, the shares and the growth are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [FUEL, MW, LON, LAT] = [col("fuel"), col("capacity_mw"), col("lon"), col("lat")];
const dots = table.rows.map((r) => ({ lon: Number(r[LON]), lat: Number(r[LAT]), value: Number(r[MW]), group: r[FUEL] }));

// The video is in French; the counts are set with non-breaking spaces, as the proof sets them.
const NB = " ";
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [`72 réacteurs sur 8${NB}900 centrales bas-carbone — et un tiers de la puissance`, "72 sites nucléaires, un tiers de la puissance bas-carbone"],
  dots,
  subject: "Nuclear",
  count: (n) => `${n0(n)}${NB}centrales`,
  // Under « 8 900 centrales », the share is of the stations: the key does not say « des sites » twice over.
  subjectLine: (n, share) => `${n} nucléaires · ${one(share)}${NB}%`,
  // The share of the value: whole percents while it climbs, one decimal at the end.
  power: (p) => `${Number.isInteger(p) ? p : one(p)}${NB}% de la puissance`,
  dotLabel: "une centrale",
  ringLabel: "nucléaire",
  figure: (v) => `${n0(v)}${NB}MW`,
  source: [
    "Source : WRI Global Power Plant Database · © MapTiler © OpenStreetMap",
    "WRI Global Power Plant Database · © MapTiler © OpenStreetMap",
    "WRI · © MapTiler © OpenStreetMap",
    "© MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: 72 nuclear sites of 8 900, under 1 % of the sites, over 30 % of the
  // capacity, and nuclear the most concentrated group.
  check(map) {
    if (map.subjectCount !== 72) throw new Error(`the title says 72 reactors; the register holds ${map.subjectCount} nuclear sites`);
    if (Math.round(map.total / 100) * 100 !== 8900) throw new Error(`the title says 8 900 stations; the register holds ${map.total}`);
    if (!(map.shareSites < 1)) throw new Error(`nuclear should be under 1 % of the sites; it is ${map.shareSites.toFixed(2)} %`);
    if (!(map.shareCapacity > 30)) throw new Error(`nuclear should carry a third of the capacity; it carries ${map.shareCapacity.toFixed(1)} %`);
    if (map.groups[0].group !== "Nuclear") throw new Error(`nuclear is no longer the most concentrated group; ${map.groups[0].group} is`);
  },
};
