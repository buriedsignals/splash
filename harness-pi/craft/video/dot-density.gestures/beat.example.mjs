// beat.mjs for the worked example proof/static-dot-density-europe-stations, as a video GESTURE beat — "72 réacteurs sur
// 8 900 centrales bas-carbone — et un tiers de la puissance". One dot per station at its own coordinates; the marks
// a gesture names are the GROUPS (a fuel), each worth its count of dots. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [LON, LAT, FUEL, MW] = [col("lon"), col("lat"), col("fuel"), col("capacity_mw")];

// THE JOIN of a dot map is its coordinates: one { lon, lat, group } per row.
const points = table.rows.map((r) => ({ lon: Number(r[LON]), lat: Number(r[LAT]), group: r[FUEL] }));
const groupNames = { Nuclear: "nucléaire", Hydro: "hydraulique", Wind: "éolien", Solar: "solaire", Biomass: "biomasse", Geothermal: "géothermie" };
const nuclear = table.rows.filter((r) => r[FUEL] === "Nuclear");
const mw = (rs) => rs.reduce((s, r) => s + Number(r[MW]), 0);
const shareCapacity = (mw(nuclear) / mw(table.rows)) * 100;
const plain = (s) => s.replace(/[  ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  points,
  groupNames,
  // A video takes exactly three gestures: reveal, subject, conclusion (the third shows the whole map).
  gestures: [
    { do: "name", mark: "Nuclear" },
    { do: "filter", marks: ["Nuclear"], note: `${nuclear.length} sites nucléaires sur ${n0(points.length)} centrales` },
    { do: "pull-back" },
  ],
  unit: "un point = une centrale bas-carbone",
  missingLabel: "",
  format: (v) => n0(v),
  title: [
    "72 réacteurs sur 8 900 centrales bas-carbone — et un tiers de la puissance",
    `${nuclear.length} sites nucléaires, un tiers de la puissance`,
  ],
  limits: [
    `Une centrale bas-carbone, un point, à ses propres coordonnées : les ${n0(points.length)} sites que la base recense en Europe.`,
    `Une centrale, un point.`,
  ],
  reading: ["Lecture : chaque point est une centrale, là où la base la situe ; les sites nucléaires sont cerclés, pas recolorés.", "Lecture : un point, une centrale."],
  source: "Source : WRI Global Power Plant Database v1.3.0",
  alt: `Carte de points de l’Europe : ${n0(points.length)} centrales bas-carbone, une par point. Les ${nuclear.length} sites nucléaires, cerclés, font ${one(shareCapacity)} % de la puissance installée.`,
  check() {
    if (nuclear.length !== 72) throw new Error(`the takeaway says 72 reactors; the data holds ${nuclear.length}`);
    if (Math.round(points.length / 100) * 100 !== 8900) throw new Error(`the takeaway says 8 900 stations; the data holds ${points.length}`);
    if (!(shareCapacity > 30 && shareCapacity < 37)) throw new Error(`the takeaway says a third of the capacity; nuclear holds ${one(shareCapacity)} %`);
  },
};
