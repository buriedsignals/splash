// Europe's installed low-carbon capacity, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `treemap` type in the scrolly format.
//
// THE SUBJECT OF `static-treemap-europe-capacity`, CHOREOGRAPHED. The stations, the countries, the thread, the claim
// and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. one block: 469 GW over 8,900 stations;
//   2. divided by fuel: water and the atom, 77 %;
//   3. re-divided by country: France first;
//   4. the ten countries tipped to wind and solar in the accent, 14 % of the total;
//   5. France opened into its own fuels: 14 % wind and solar;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-treemap-europe-capacity/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedTreemapScrolly } from "./DirectedTreemapScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const NEW_BUILD = ["Wind", "Solar"];
const LEGACY = ["Hydro", "Nuclear"];
/** The countries drawn as their own cells; the rest folded into two remainders, split along the thread. */
const DRAWN = 12;
const FUELS = { Hydro: "Hydraulique", Nuclear: "Nucléaire", Wind: "Éolien", Solar: "Solaire" };
const OTHER_FUELS = "Biomasse, géothermie, marées";
const NAMES = {
  France: "France", "United Kingdom": "Royaume-Uni", Spain: "Espagne", Germany: "Allemagne", Russia: "Russie", Norway: "Norvège", Sweden: "Suède", Ukraine: "Ukraine",
  Italy: "Italie", Turkey: "Turquie", Switzerland: "Suisse", Austria: "Autriche", Belgium: "Belgique", Portugal: "Portugal", Finland: "Finlande", "Czech Republic": "Tchéquie",
  Romania: "Roumanie", Poland: "Pologne", Bulgaria: "Bulgarie", Netherlands: "Pays-Bas", Greece: "Grèce", Iceland: "Islande", Serbia: "Serbie", Slovakia: "Slovaquie",
  Hungary: "Hongrie", Croatia: "Croatie", Slovenia: "Slovénie", Ireland: "Irlande", Denmark: "Danemark", Georgia: "Géorgie", Armenia: "Arménie",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", Albania: "Albanie", Macedonia: "Macédoine du Nord", Montenegro: "Monténégro", Lithuania: "Lituanie", Latvia: "Lettonie",
  Estonia: "Estonie", Belarus: "Biélorussie", Moldova: "Moldavie", Luxembourg: "Luxembourg", Morocco: "Maroc", Algeria: "Algérie", Tunisia: "Tunisie", Iraq: "Irak", "Syrian Arab Republic": "Syrie",
};

// ── the stations, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const stations = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return { country: cells[at("country")], fuel: cells[at("fuel")], mw: Number(cells[at("capacity_mw")]) };
});
for (const s of stations) if (!s.country || !s.fuel || !Number.isFinite(s.mw)) throw new Error(`a station has no usable country, fuel or capacity: ${JSON.stringify(s)}`);
const total = stations.reduce((s, x) => s + x.mw, 0);
const byCountry = {};
const byFuel = {};
for (const s of stations) {
  const d = (byCountry[s.country] ??= { mw: 0, sites: 0, newBuild: 0, fuels: {} });
  d.mw += s.mw;
  d.sites += 1;
  if (NEW_BUILD.includes(s.fuel)) d.newBuild += s.mw;
  d.fuels[s.fuel] = (d.fuels[s.fuel] ?? { mw: 0, sites: 0 });
  d.fuels[s.fuel].mw += s.mw;
  d.fuels[s.fuel].sites += 1;
  const f = (byFuel[s.fuel] ??= { mw: 0, sites: 0 });
  f.mw += s.mw;
  f.sites += 1;
}
for (const country of Object.keys(byCountry)) if (!NAMES[country]) throw new Error(`${country} has no French name filed in this beat`);
const legacyShare = (LEGACY.reduce((s, k) => s + byFuel[k].mw, 0) / total) * 100;
const countries = Object.entries(byCountry)
  .map(([country, d]) => ({ country, ...d, tipped: d.newBuild / d.mw > 0.5, newShare: (d.newBuild / d.mw) * 100 }))
  .sort((a, b) => b.mw - a.mw);
const tipped = countries.filter((c) => c.tipped);
const tippedShare = (tipped.reduce((s, c) => s + c.mw, 0) / total) * 100;
const biggest = countries[0];
if (!(legacyShare > 70)) throw new Error(`the headline says water and the atom still carry over 70 %; they carry ${legacyShare.toFixed(1)} %`);
if (!(tipped.length >= 5)) throw new Error(`the headline says a group of countries has tipped; ${tipped.length} have`);
if (!(tippedShare < 25)) throw new Error(`the headline says the tipped countries are not the bulk; they hold ${tippedShare.toFixed(1)} %`);
if (biggest.tipped) throw new Error(`the largest cell (${biggest.country}) is in the accented thread; the accent would read as a highlight on the maximum`);
if (biggest.country !== "France") throw new Error(`card 3 names France as the largest cell; it is ${biggest.country}`);
const largestFuels = Object.entries(byFuel).sort((a, b) => b[1].mw - a[1].mw).slice(0, 2).map(([k]) => k).sort();
if (largestFuels.join() !== [...LEGACY].sort().join()) throw new Error(`card 2 says hydropower and nuclear are the two largest fuels; they are ${largestFuels.join(", ")}`);
const drawnCountries = countries.slice(0, DRAWN);
const tail = countries.slice(DRAWN);
if (!drawnCountries.some((c) => c.tipped)) throw new Error(`none of the ${DRAWN} drawn countries is tipped; the thread would live only in a remainder`);
console.log(`${countries.length} pays · ${(total / 1000).toFixed(0)} GW · eau+atome ${legacyShare.toFixed(1)} % · basculés ${tipped.length} (${tippedShare.toFixed(1)} %) · ${biggest.country} ${(biggest.mw / 1000).toFixed(1)} GW, ${biggest.newShare.toFixed(0)} % éolien+solaire\n`);

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR")).replace(/ /g, NB);
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const power = (mw) => (mw >= 1000 ? `${one(mw / 1000)}${NB}GW` : `${n0(mw)}${NB}MW`);
const sitesText = (n) => `${n0(n)} ${n > 1 ? "centrales" : "centrale"}`;
const pct = (v) => `${Math.round(v)}${NB}%`;
const fuelCells = (fuels, basisOf) => {
  const named = Object.keys(FUELS).map((k) => ({ key: k, mw: fuels[k]?.mw ?? 0, sites: fuels[k]?.sites ?? 0, name: FUELS[k] }));
  const others = Object.entries(fuels).filter(([k]) => !FUELS[k]);
  const rest = { key: "Other", mw: others.reduce((s, [, v]) => s + v.mw, 0), sites: others.reduce((s, [, v]) => s + v.sites, 0), name: OTHER_FUELS };
  return [...named, rest].filter((f) => f.mw > 0).map((f) => ({ key: f.key, mw: f.mw, value: power(f.mw), name: f.name, basis: basisOf(f), thread: NEW_BUILD.includes(f.key) }));
};
const block = { key: "Europe", mw: total, value: power(total), name: "Europe", basis: sitesText(stations.length), thread: false };
const fuels = fuelCells(byFuel, (f) => `${pct((f.mw / total) * 100)} · ${sitesText(f.sites)}`);
const remainder = (list, name) => ({ key: name, mw: list.reduce((s, c) => s + c.mw, 0), value: power(list.reduce((s, c) => s + c.mw, 0)), name, basis: sitesText(list.reduce((s, c) => s + c.sites, 0)), thread: list.every((c) => c.tipped) });
const tailTipped = tail.filter((c) => c.tipped);
const tailRest = tail.filter((c) => !c.tipped);
const lands = [
  ...drawnCountries.map((c) => ({ key: c.country, mw: c.mw, value: power(c.mw), name: NAMES[c.country], basis: sitesText(c.sites), thread: c.tipped })),
  remainder(tailRest, `${tailRest.length} autres pays`),
  remainder(tailTipped, `${tailTipped.length} pays basculés`),
];
const inside = fuelCells(biggest.fuels, (f) => pct((f.mw / biggest.mw) * 100));
const franceNew = biggest.newShare;
if (!(franceNew < 20)) throw new Error(`card 5 says wind and solar are a small part of France's fleet; they are ${franceNew.toFixed(1)} %`);
const franceNuclear = (biggest.fuels.Nuclear.mw / biggest.mw) * 100;

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `L’eau et l’atome portent encore ${Math.round(legacyShare)}${NB}% du bas-carbone européen — mais ${tipped.length} pays ont déjà basculé`,
  `${tipped.length} pays européens où l’éolien et le solaire pèsent déjà plus de la moitié`,
  `La puissance bas-carbone européenne, pays par pays`,
];
const prose = [
  [`La puissance bas-carbone installée en Europe : ${n0(total / 1000)}${NB}GW, répartis sur ${n0(stations.length)} centrales. Un rectangle, dont la surface est cette puissance.`],
  [`Découpons-le par filière. L’hydraulique en fait ${pct((byFuel.Hydro.mw / total) * 100)}, le nucléaire ${pct((byFuel.Nuclear.mw / total) * 100)} : l’eau et l’atome, ${pct(legacyShare)}. L’éolien et le solaire, en couleur, ${pct(((byFuel.Wind.mw + byFuel.Solar.mw) / total) * 100)}.`],
  [`Redécoupons-le par pays. La France arrive en tête avec ${power(biggest.mw)}.`],
  [`En couleur, les ${tipped.length} pays où l’éolien et le solaire font déjà plus de la moitié de la puissance bas-carbone. Ils ne pèsent que ${one(tippedShare)}${NB}% du total.`],
  [`La France, le plus grand rectangle, ouverte par filière : ${pct(franceNuclear)} de nucléaire, ${pct(franceNew)} seulement d’éolien et de solaire.`],
  [`Lecture : la surface est la puissance, et une surface ne se compare pas d’un bout à l’autre du dessin — c’est pourquoi chaque case porte son chiffre. La couleur suit un fil, pas un maximum.`],
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production";
const words = {
  unit: "puissance bas-carbone installée",
  blockNote: `${n0(total / 1000)}${NB}GW`,
  fuelNote: `eau et atome${NB}: ${pct(legacyShare)}`,
  landNote: `${countries.length} pays`,
  tippedNote: `${tipped.length} pays basculés${NB}: ${one(tippedShare)}${NB}%`,
  openNote: `France${NB}: ${pct(franceNew)} éolien et solaire`,
  readNote: "chaque case porte son chiffre",
};
const alt =
  `Treemap de la puissance bas-carbone installée en Europe, ${n0(total / 1000)} GW : un rectangle par pays, sa surface est sa puissance. ` +
  `L’hydraulique et le nucléaire font ${pct(legacyShare)} ; ${tipped.length} pays, en couleur, ont plus de la moitié en éolien et solaire et pèsent ${one(tippedShare)} % du total. La France, le plus grand rectangle, n’en fait pas partie.`;

/** One state per card; see `treemap-drive.mjs` for what each field paints. */
const STATES = [
  { split: 0, byLand: 0, tipped: 0, open: 0, note: 0 },
  { split: 1, byLand: 0, tipped: 0, open: 0, note: 1 },
  { split: 1, byLand: 1, tipped: 0, open: 0, note: 2 },
  { split: 1, byLand: 1, tipped: 1, open: 0, note: 3 },
  { split: 1, byLand: 1, tipped: 1, open: 1, note: 4 },
  { split: 1, byLand: 1, tipped: 1, open: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${[block, ...fuels, ...lands, ...inside].map((c) => c.basis).join(" ")}`,
  annot: [block, ...fuels, ...lands, ...inside].map((c) => c.name).join(" "),
  value: `${[block, ...fuels, ...lands, ...inside].map((c) => c.value).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "treemap-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["europe", "filieres", "pays", "bascules", "france", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedTreemapScrolly, { block, fuels, lands, inside, opens: biggest.country, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyTreemapState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
