// beat.mjs for the worked example proof/static-dot-density-europe-stations — "72 réacteurs sur 8 900
// centrales bas-carbone — et un tiers de la puissance". One dot per station, at its own coordinates;
// the nuclear stations are the subject, ringed. Every number on the plate is COMPUTED from data.json.
import { readPoints, readTable } from "./points.mjs";

// The join of a dot map is its coordinates: which columns hold them, and which value marks the subject.
const LON = "lon";
const LAT = "lat";
const SUBJECT = { fuel: "Nuclear" };

const points = readPoints(readTable(import.meta.dirname), { lon: LON, lat: LAT, subject: SUBJECT });
const subject = points.filter((p) => p.subject);
const total = points.length;
const mw = (list) => list.reduce((s, p) => s + Number(p.row.capacity_mw), 0);
const shareSites = (subject.length / total) * 100;
const shareCapacity = (mw(subject) / mw(points)) * 100;

// Capacity per site, by fuel: the standfirst says the subject is the most concentrated.
const byFuel = {};
for (const p of points) {
  const f = (byFuel[p.row.fuel] ??= { n: 0, mw: 0 });
  f.n += 1;
  f.mw += Number(p.row.capacity_mw);
}
const densest = Object.entries(byFuel).sort((a, b) => b[1].mw / b[1].n - a[1].mw / a[1].n)[0][0];

// toLocaleString("fr-FR") emits narrow no-break spaces no face covers: replace them with a plain space.
const plain = (s) => s.replace(/[   ]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  lon: LON,
  lat: LAT,
  subject: SUBJECT,
  thing: "centrale",
  // The headline in forms, longest first: the first is the journalist's takeaway, copied literally.
  title: [
    "72 réacteurs sur 8 900 centrales bas-carbone — et un tiers de la puissance",
    `${subject.length} sites nucléaires, un tiers de la puissance bas-carbone`,
    // Every shorter form still states the takeaway: the ladder may land on the last one.
    `${subject.length} réacteurs, un tiers de la puissance`,
  ],
  limits: [
    `Une centrale bas-carbone, un point, à ses propres coordonnées : les ${n0(total)} sites ` +
      `hydrauliques, éoliens, solaires, biomasse, géothermiques et nucléaires que la base recense en ` +
      `Europe. Le nucléaire n’est que ${one(shareSites)} % des sites et ${one(shareCapacity)} % de la ` +
      `puissance installée — ${n0(mw(subject) / subject.length)} MW par site, le plus concentré de tous.`,
    `Une centrale bas-carbone, un point, à ses propres coordonnées. Le nucléaire : ${one(shareSites)} % des sites, ${one(shareCapacity)} % de la puissance.`,
    `Une centrale bas-carbone, un point. Nucléaire : ${one(shareSites)} % des sites.`,
  ],
  reading: [
    "Lecture : chaque point est une centrale, placée là où la base la situe — pas répartie dans un polygone. La densité est la lecture ; les sites nucléaires sont cerclés, pas recolorés.",
    "Lecture : un point, une centrale, à sa position réelle. Les sites nucléaires sont cerclés.",
  ],
  dotIs: "un point = une centrale bas-carbone",
  subjectNote: `${subject.length} sites nucléaires`,
  limitNote: "La base recense les centrales qu’elle connaît ; le petit solaire et le petit éolien y sont sous-représentés.",
  source: "Source : WRI Global Power Plant Database v1.3.0 · fond de carte MapTiler (dataviz), teinté par la direction",
  alt:
    `Carte de points de l’Europe : ${n0(total)} centrales bas-carbone, une par point, chacune à ses ` +
    `propres coordonnées. Les ${subject.length} sites nucléaires, cerclés, sont rares. Ils font ` +
    `${one(shareSites)} % des sites et ${one(shareCapacity)} % de la puissance installée.`,
  evidenceLevels: 3,
  // The claim checked against the data, at the takeaway's precision.
  check() {
    if (subject.length !== 72) throw new Error(`the takeaway says 72 reactors; the data holds ${subject.length}`);
    if (Math.round(total / 100) * 100 !== 8900) throw new Error(`the takeaway says 8 900 stations; the data holds ${total}`);
    if (!(shareCapacity > 30 && shareCapacity < 37)) throw new Error(`the takeaway says a third of the capacity; nuclear holds ${shareCapacity.toFixed(1)} %`);
    if (densest !== "Nuclear") throw new Error(`the standfirst says nuclear is the most concentrated; ${densest} is`);
  },
};
