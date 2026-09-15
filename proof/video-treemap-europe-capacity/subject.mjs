// THE SUBJECT OF `static-treemap-europe-capacity`, LOADED AND ASSERTED — installed low-carbon capacity by country, the
// countries whose wind and solar are over half of it: the static beat's own derivation (its runner runs it inline and
// exports nothing), read from its frozen file. Plus what the video derives: the tipped countries' sum against the largest
// cell's, which the gather lays out as a picture.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-treemap-europe-capacity");
const NEW_BUILD = ["Wind", "Solar"];
const LEGACY = ["Hydro", "Nuclear"];
const NAMES = {
  France: "France", "United Kingdom": "Royaume-Uni", Spain: "Espagne", Germany: "Allemagne",
  Russia: "Russie", Norway: "Norvège", Sweden: "Suède", Ukraine: "Ukraine", Italy: "Italie",
  Turkey: "Turquie", Switzerland: "Suisse", Austria: "Autriche", Belgium: "Belgique",
  Portugal: "Portugal", Finland: "Finlande", "Czech Republic": "Tchéquie", Romania: "Roumanie",
  Poland: "Pologne", Bulgaria: "Bulgarie", Netherlands: "Pays-Bas", Greece: "Grèce",
  Iceland: "Islande", Serbia: "Serbie", Slovakia: "Slovaquie", Hungary: "Hongrie",
  Croatia: "Croatie", Slovenia: "Slovénie", Ireland: "Irlande", Denmark: "Danemark",
  Georgia: "Géorgie", Armenia: "Arménie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Albania: "Albanie", Macedonia: "Macédoine du Nord", Montenegro: "Monténégro",
  Lithuania: "Lituanie", Latvia: "Lettonie", Estonia: "Estonie", Belarus: "Biélorussie",
  Moldova: "Moldavie", Luxembourg: "Luxembourg", Morocco: "Maroc", Algeria: "Algérie",
  Tunisia: "Tunisie", Iraq: "Irak", "Syrian Arab Republic": "Syrie",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "stations.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (n) => header.indexOf(n);
  const stations = csv.slice(1).map((l) => {
    const c = l.split(",");
    return { country: c[at("country")], fuel: c[at("fuel")], mw: Number(c[at("capacity_mw")]) };
  });
  for (const s of stations)
    if (!s.country || !s.fuel || !Number.isFinite(s.mw)) throw new Error(`a station has no usable country, fuel or capacity: ${JSON.stringify(s)}`);

  const byCountry = {};
  for (const s of stations) {
    const d = (byCountry[s.country] ??= { mw: 0, sites: 0, newBuild: 0, legacy: 0 });
    d.mw += s.mw;
    d.sites += 1;
    if (NEW_BUILD.includes(s.fuel)) d.newBuild += s.mw;
    if (LEGACY.includes(s.fuel)) d.legacy += s.mw;
  }
  for (const country of Object.keys(byCountry)) if (!NAMES[country]) throw new Error(`${country} has no French name filed in this beat`);

  const total = Object.values(byCountry).reduce((s, d) => s + d.mw, 0);
  const legacyShare = Object.values(byCountry).reduce((s, d) => s + d.legacy, 0) / total;
  const countries = Object.entries(byCountry)
    .map(([key, d]) => ({ key, name: NAMES[key], mw: d.mw, newBuild: d.newBuild, sites: d.sites, tipped: d.newBuild / d.mw > 0.5 }))
    .sort((a, b) => b.mw - a.mw);

  // THE STATIC'S CLAIM, ASSERTED AS IT IS THERE.
  const tipped = countries.filter((c) => c.tipped);
  const tippedMw = tipped.reduce((s, c) => s + c.mw, 0);
  const biggest = countries[0];
  if (!(legacyShare > 0.7)) throw new Error(`the headline says water and the atom carry over 70 %; they carry ${(legacyShare * 100).toFixed(1)} %`);
  if (!(tipped.length >= 5)) throw new Error(`the headline says a group of countries has tipped; ${tipped.length} have`);
  if (!(tippedMw / total < 0.25)) throw new Error(`the tipped countries are not the bulk; they hold ${((tippedMw / total) * 100).toFixed(1)} %`);
  if (biggest.tipped) throw new Error(`the largest cell (${biggest.name}) is in the accented thread`);

  // THE VIDEO'S DERIVED VALUE: the tipped countries, gathered, fit inside the largest cell — otherwise the gather has no
  // room to land in.
  const intoBiggest = tippedMw / biggest.mw;
  if (!(intoBiggest < 1)) throw new Error(`the ${tipped.length} tipped countries hold ${(tippedMw / 1000).toFixed(1)} GW, not less than ${biggest.name}'s ${(biggest.mw / 1000).toFixed(1)}`);
  return { countries, total, stations: stations.length, legacyShare, tipped, tippedMw, biggest, intoBiggest };
}
