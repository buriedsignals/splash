// beat.mjs for the worked example proof/static-proportional-symbol-europe-capacity — "A hundredth of
// the sites carries over a third of Europe's low-carbon capacity" — written for the SCROLLY gesture kit: the
// staging is the `gestures` list. Every number on the plate is COMPUTED from data.json; the runner reads
// the coordinates and the values itself, by the column names given here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [FUEL, MW] = [col("fuel"), col("capacity_mw")];

const all = table.rows.map((r) => ({ fuel: r[FUEL], mw: Number(r[MW]) }));
const total = all.length;
const mwAll = all.reduce((a, s) => a + s.mw, 0);
const nuclear = all.filter((s) => s.fuel === "Nuclear");
const shareSites = (nuclear.length / total) * 100;
const shareCapacity = (nuclear.reduce((a, s) => a + s.mw, 0) / mwAll) * 100;
const TOP = 100;
const shareTop = ([...all].sort((a, b) => b.mw - a.mw).slice(0, TOP).reduce((a, s) => a + s.mw, 0) / mwAll) * 100;

const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  // THE JOIN: which columns of data.json hold each point's longitude, latitude and value.
  lon: "lon",
  lat: "lat",
  value: "capacity_mw",
  // Optional: the column printed as the point's name (not drawn; used in refusals).
  name: "country",
  // The rows the takeaway is about: ringed in the accent.
  subject: { column: "fuel", equals: "Nuclear" },
  // Optional: keep only the rows matching every { column: value }.
  where: {},
  // The staging, in story order: the nuclear circles in the accent (their count stated), the largest
  // circle named with its value. A circle is named by its rank ("site 1", the largest), a group by its value of the
  // subject column ("Nuclear"), a place by its value of the name column ("France").
  gestures: [
    { do: "reveal", card: `${total} centrales bas-carbone, de la plus grande à la plus petite : l’aire du cercle est la puissance.` },
    { do: "highlight", mark: "Nuclear", note: `${nuclear.length} sites nucléaires`, card: `Le nucléaire : ${nuclear.length} sites, ${one(shareCapacity)} % de la puissance.` },
    { do: "filter", mark: "Nuclear", card: `Seuls, les sites nucléaires portent à eux seuls une part énorme de la puissance installée.` },
    { do: "name", mark: "site 1", card: `La plus grosse centrale est en Ukraine.` },
  ],

  unit: "MW",
  // How the key's two circles and the cut's threshold are printed.
  format: (v) => n0(v),
  dotIs: "MW · un cercle = une centrale",
  // `cut` is what the runner chose to draw: { threshold, drawn, total, drawnSubject, totalSubject,
  // drawnShare, drawnValueShare }. Every form of limitNote must print cut.threshold when it is above 0.
  subjectNote: (cut) => `${cut.drawnSubject} sites nucléaires`,
  limitNote: (cut) =>
    cut.threshold > 0
      ? [
          `Sous ${n0(cut.threshold)} MW, non dessiné : à ${n0(cut.total)} cercles le champ se referme.`,
          `Sous ${n0(cut.threshold)} MW, non dessiné.`,
        ]
      : [`Toutes les ${n0(cut.total)} centrales sont dessinées.`],
  title: [
    `Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe`,
    `Un centième des sites, plus d’un tiers de la puissance`,
    `La puissance tient dans peu de sites`,
  ],
  limits: [
    `Un cercle par centrale, à ses propres coordonnées ; l’aire du cercle est sa puissance installée. ` +
      `Le nucléaire y pèse le plus : ${one(shareSites)} % des sites pour ${one(shareCapacity)} % de la puissance.`,
    `Un cercle par centrale ; l’aire est la puissance installée.`,
  ],
  reading: [
    `Lecture : l’aire du cercle est proportionnelle à la puissance — les cercles de la légende donnent ` +
      `des repères en MW, parce qu’une aire ne se lit pas à l’œil. Les cercles sont creux.`,
    `Lecture : l’aire est la puissance.`,
  ],
  source: "Source : WRI Global Power Plant Database v1.3.0 · fond de carte MapTiler (dataviz)",
  alt: (cut) =>
    `Carte de cercles proportionnels de l’Europe : les ${n0(cut.drawn)} centrales bas-carbone de ` +
    `${n0(cut.threshold)} MW ou plus, sur ${n0(cut.total)}, l’aire du cercle valant la puissance installée ; ` +
    `elles portent ${one(cut.drawnValueShare)} % de la puissance. ${cut.drawnSubject} cercles nucléaires sont cerclés.`,
  check() {
    if (!(TOP / total < 0.02)) throw new Error(`${TOP} of ${total} is not about a hundredth of the sites`);
    if (!(shareTop > 33)) throw new Error(`the ${TOP} largest carry ${shareTop.toFixed(1)} %, not over a third`);
  },
};
