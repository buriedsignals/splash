// beat.mjs for the worked example proof/web-treemap-europe-capacity — "Water and the atom still carry
// 79 % of Europe's 453 GW of low-carbon capacity", as an interactive page. Every number on the page
// is COMPUTED from data.json (one row per power station); the layouts, each cell's share and rank and
// each group's leader are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [COUNTRY, FUEL, MW] = [col("country"), col("fuel"), col("capacity_mw")];

const OLD = ["Hydro", "Nuclear"];
/** The groups the reader descends into, and the words each one's sentences need. */
const GROUPS = [
  { key: "Hydro", label: "Hydraulique", adj: "hydrauliques", of: "de l'eau européenne", noun: "L'eau" },
  { key: "Nuclear", label: "Nucléaire", adj: "nucléaires", of: "de l'atome européen", noun: "L'atome" },
  { key: "Wind", label: "Éolien", adj: "éoliens", of: "du vent européen", noun: "Le vent" },
  { key: "Solar", label: "Solaire", adj: "solaires", of: "du soleil européen", noun: "Le soleil" },
];
const byLabel = new Map(GROUPS.map((g) => [g.label, g]));
const NAMES = {
  France: "France", Germany: "Allemagne", Spain: "Espagne", Italy: "Italie",
  "United Kingdom": "Royaume-Uni", Sweden: "Suède", Norway: "Norvège", Turkey: "Turquie",
  Poland: "Pologne", Switzerland: "Suisse", Austria: "Autriche", Finland: "Finlande",
  Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique", Romania: "Roumanie",
  Ukraine: "Ukraine", Russia: "Russie", Denmark: "Danemark", Greece: "Grèce",
  "Czech Republic": "Tchéquie", Czechia: "Tchéquie", Ireland: "Irlande", Bulgaria: "Bulgarie",
  Hungary: "Hongrie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Croatia: "Croatie",
  Serbia: "Serbie", Albania: "Albanie", Iceland: "Islande", Latvia: "Lettonie",
  Lithuania: "Lituanie", Estonia: "Estonie", Luxembourg: "Luxembourg", Malta: "Malte",
  Belarus: "Biélorussie", Moldova: "Moldavie", Montenegro: "Monténégro",
  "Bosnia and Herzegovina": "Bosnie-Herz.", "North Macedonia": "Macédoine du N.", Cyprus: "Chypre",
  Macedonia: "Macédoine du N.", Armenia: "Arménie", Georgia: "Géorgie",
};
/** The file was cut by a bounding box, not by a continent: these are dropped before anything is summed. */
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);

// One cell per country: its capacity per group in GW (the unit the cells print) and its station count.
const by = new Map();
for (const r of table.rows) {
  const mw = Number(r[MW]);
  if (!GROUPS.some((g) => g.key === r[FUEL]) || !(mw > 0) || OUTSIDE.has(r[COUNTRY])) continue;
  const name = NAMES[r[COUNTRY]] ?? r[COUNTRY];
  if (!by.has(name)) by.set(name, { name, parts: {}, counts: {} });
  const c = by.get(name);
  c.parts[r[FUEL]] = (c.parts[r[FUEL]] ?? 0) + mw / 1000;
  c.counts[r[FUEL]] = (c.counts[r[FUEL]] ?? 0) + 1;
}
const total = (c) => Object.values(c.parts).reduce((s, v) => s + v, 0);
const fresh = (c) => (c.parts.Wind ?? 0) + (c.parts.Solar ?? 0);
// THE THREAD: a country has tipped when wind and sun make more than half of its low-carbon capacity.
const cells = [...by.values()].map((c) => ({ ...c, thread: fresh(c) > total(c) / 2 }));

const whole = cells.reduce((s, c) => s + total(c), 0);
const oldShare = (cells.reduce((s, c) => s + OLD.reduce((t, k) => t + (c.parts[k] ?? 0), 0), 0) / whole) * 100;
const ranked = [...cells].sort((a, b) => total(b) - total(a));
const biggest = ranked[0];
const tipped = ranked.filter((c) => c.thread);
const tippedShare = (tipped.reduce((s, c) => s + total(c), 0) / whole) * 100;
const tippedShareIn = (key) => (tipped.reduce((s, c) => s + (c.parts[key] ?? 0), 0) / cells.reduce((s, c) => s + (c.parts[key] ?? 0), 0)) * 100;
const stations = cells.reduce((s, c) => s + Object.values(c.counts).reduce((t, n) => t + n, 0), 0);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const count = (n) => n.toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  groups: GROUPS.map(({ key, label }) => ({ key, label })),
  cells,
  format: (v) => `${fr(v)} GW`,
  // What a cell answers at the root, then inside a group.
  detail: (c) => {
    const freshShare = c.parts.filter((p) => p.group === "Éolien" || p.group === "Solaire").reduce((s, p) => s + p.share, 0);
    return (
      `${c.name} · ${fr(c.value)} GW bas-carbone · ${fr(c.share)} % de l'Europe · rang ${c.rank} sur ${c.count} · ` +
      `${count(c.sites)} centrales · eau + atome ${fr(100 - freshShare, 0)} %, vent + soleil ${fr(freshShare, 0)} %` +
      `${c.thread ? " — basculé" : ""}`
    );
  },
  branchDetail: (c) =>
    `${c.name} · ${fr(c.value)} GW ${byLabel.get(c.group).adj} · rang ${c.rank} sur ${c.count} pays · ` +
    `${fr(c.share)} % ${byLabel.get(c.group).of} · ${fr(c.ownShare, 0)} % de son propre parc bas-carbone · ` +
    `${count(c.sites)} centrales`,
  threadNote:
    `${tipped.length} pays ont basculé — vent et soleil y font plus de la moitié du parc : ` +
    `${tipped.map((c) => c.name).join(", ")}. Ils pèsent ${fr(tippedShare, 0)} % de la ` +
    `capacité européenne. La plus grosse cellule, ${biggest.name}, n'en est pas : ` +
    `${fr((fresh(biggest) / total(biggest)) * 100, 0)} % de vent et de soleil.`,
  // The descend control: its legend, the way back out, and each group's words.
  descendLabel: "Descendre dans une source",
  rootLabel: "Toute l'Europe",
  rootAnnounce: `Toute l'Europe — les ${cells.length} pays, à l'échelle du continent`,
  announce: (o) => `${o.group} — ${fr(o.value)} GW sur ${o.count} pays, ${fr(o.share, 0)} % du bas-carbone européen`,
  note: (o) =>
    `${byLabel.get(o.group).noun} : ${fr(o.value)} GW, ${fr(o.share, 0)} % du bas-carbone européen, ` +
    `sur ${count(o.sites)} centrales (${fr(o.sitesShare, 0)} % du parc) dans ${o.count} pays. ` +
    `Premier pays : ${o.leader.name}, ${fr(o.leader.share, 0)} % à lui seul. ` +
    `Les ${o.threadCount} pays basculés en tiennent ${fr(o.threadShare, 0)} %.`,
  title: "L'eau et l'atome portent encore 79 % des 453 GW bas-carbone européens",
  limits:
    `Une cellule par pays — les ${cells.length}, même les trop petites pour porter un nom —, sa ` +
    `SURFACE proportionnelle à sa capacité bas-carbone installée sur ${count(stations)} centrales.`,
  reading:
    `Lecture : interrogez une cellule pour son rang et ce qu'il y a dedans, puis DESCENDEZ dans une ` +
    `source : le cadre est recalculé sur elle seule, et l'accent des pays basculés passe de ` +
    `${fr(tippedShareIn("Nuclear"), 0)} % du cadre dans l'atome à ${fr(tippedShareIn("Wind"), 0)} % dans le vent.`,
  source: "Source : Global Power Plant Database (WRI) · capacité installée par centrale, agrégée par pays et par source",
  alt:
    `Un pavage de ${cells.length} rectangles, un par pays, chacun dimensionné par sa ` +
    `capacité bas-carbone. Le plus grand est ${biggest.name} avec ` +
    `${fr(total(biggest))} GW ; les plus petits, en bas à droite, sont des bandes de ` +
    `quelques pixels. Les ${tipped.length} pays où le vent et le soleil dépassent la moitié ` +
    `du parc sont colorés et représentent ${fr(tippedShare, 0)} % de la capacité totale. ` +
    `Un contrôle au-dessus redessine tout le pavage sur une seule source à la fois.`,
  evidenceLevels: 3,
  check() {
    if (Math.round(oldShare) !== 79) throw new Error(`water and the atom carry ${fr(oldShare)} %, not 79 %`);
    if (Math.round(whole) !== 453) throw new Error(`the total is ${fr(whole)} GW, not 453`);
    if (biggest.thread) throw new Error(`the largest cell, ${biggest.name}, has tipped`);
    if (!(tippedShareIn("Wind") > 2 * tippedShare)) throw new Error(`the tipped do not flood the wind: ${fr(tippedShareIn("Wind"), 0)} % against ${fr(tippedShare, 0)} % of Europe`);
  },
};
