// beat.mjs for the worked example proof/video-proportional-symbol-europe-capacity — « Un centième des sites porte plus
// d'un tiers de la puissance bas-carbone d'Europe », told in time. data.json is the register of low-carbon stations.
// Every number the video draws is COMPUTED from data.json; the ranking, the shares and the circles are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [MW, LON, LAT] = [col("capacity_mw"), col("lon"), col("lat")];
const symbols = table.rows.map((r) => ({ lon: Number(r[LON]), lat: Number(r[LAT]), value: Number(r[MW]) }));

// The video is in French; the counts are set with non-breaking spaces, as the proof sets them.
const NB = " ";
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TOP = 100;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe", "Un centième des sites, plus d’un tiers de la puissance"],
  symbols,
  drawCount: TOP,
  // The climbing count after k circles; `last` is the final step, printed to one decimal.
  count: (k, share, last) => `${k}${NB}centrales${NB}: ${last ? one(share) : share}${NB}%`,
  rest: (n, share) => `${n0(n)}${NB}autres${NB}: ${one(share)}${NB}%`,
  figure: (v) => `${n0(v)}${NB}MW`,
  source: [
    "Source : WRI Global Power Plant Database · © MapTiler © OpenStreetMap",
    "WRI Global Power Plant Database · © MapTiler © OpenStreetMap",
    "WRI · © MapTiler © OpenStreetMap",
    "© MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: the hundred are under a fiftieth of the sites (« a hundredth », rounded),
  // and carry over a third of the capacity.
  check(map) {
    if (!(map.drawCount / map.total < 0.02)) throw new Error(`the title calls ${map.drawCount} of ${map.total} a hundredth of the sites`);
    if (!(map.shareTop > 33)) throw new Error(`the title says the ${map.drawCount} largest carry over a third; they carry ${map.shareTop.toFixed(1)} %`);
  },
};
