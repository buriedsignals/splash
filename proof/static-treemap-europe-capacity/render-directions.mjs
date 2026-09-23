// twin/proof/static-treemap-europe-capacity/render-directions.mjs
//
// Europe's installed low-carbon capacity, country by country, as a treemap, once per filed direction
// through the design base. The first `treemap` beat in this tree.
//
// WHY A TREEMAP HERE: the quantities span three orders of magnitude — France at 97 GW, Estonia at
// 0.3 — and they are parts of one whole. That is what an area encoding is for. What it costs is
// comparison across distance, which is why the reference's rule — print the value in every cell — is
// not a nicety on this form but the repair for its known weakness.
//
// THE ACCENT IS A THREAD, NOT A MAXIMUM. The argument running through the figure is the countries
// whose low-carbon fleet has already tipped to wind and solar. France is the largest cell and is not
// one of them; the beat refuses to render if it ever is.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-treemap-europe-capacity/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedTreemap } from "./DirectedTreemap.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const EYEBROW = "Énergie · Europe";
const NEW_BUILD = ["Wind", "Solar"];
const LEGACY = ["Hydro", "Nuclear"];
const refused = [];

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

// ── the stations ────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const stations = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { country: c[at("country")], fuel: c[at("fuel")], mw: Number(c[at("capacity_mw")]) };
});
for (const s of stations)
  if (!s.country || !s.fuel || !Number.isFinite(s.mw))
    throw new Error(`a station has no usable country, fuel or capacity: ${JSON.stringify(s)}`);

const byCountry = {};
for (const s of stations) {
  const d = (byCountry[s.country] ??= { mw: 0, sites: 0, newBuild: 0, legacy: 0 });
  d.mw += s.mw;
  d.sites += 1;
  if (NEW_BUILD.includes(s.fuel)) d.newBuild += s.mw;
  if (LEGACY.includes(s.fuel)) d.legacy += s.mw;
}
for (const country of Object.keys(byCountry))
  if (!NAMES[country]) throw new Error(`${country} has no French name filed in this beat`);

const total = Object.values(byCountry).reduce((s, d) => s + d.mw, 0);
const legacyShare = (Object.values(byCountry).reduce((s, d) => s + d.legacy, 0) / total) * 100;
const countries = Object.entries(byCountry)
  .map(([country, d]) => ({
    country,
    name: NAMES[country],
    mw: d.mw,
    sites: d.sites,
    tipped: d.newBuild / d.mw > 0.5,
    newShare: (d.newBuild / d.mw) * 100,
  }))
  .sort((a, b) => b.mw - a.mw);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const tipped = countries.filter((c) => c.tipped);
const tippedShare = (tipped.reduce((s, c) => s + c.mw, 0) / total) * 100;
const biggest = countries[0];
if (!(legacyShare > 70))
  throw new Error(`the headline says water and the atom still carry over 70 %; they carry ${legacyShare.toFixed(1)} %`);
if (!(tipped.length >= 5))
  throw new Error(`the headline says a group of countries has tipped; ${tipped.length} have`);
if (!(tippedShare < 25))
  throw new Error(`the headline says the tipped countries are not the bulk; they hold ${tippedShare.toFixed(1)} %`);
/** THE RULE THIS BEAT EXISTS TO SPEND, ASSERTED RATHER THAN TRUSTED: the accent marks a thread, and
 *  a thread that contains the largest cell is indistinguishable from an accent on the maximum. */
if (biggest.tipped)
  throw new Error(
    `the largest cell (${biggest.name}) is in the accented thread. The accent would then be ` +
      `indistinguishable from a highlight on the maximum, which is the one thing this beat's own ` +
      `reference is filed for refusing.`,
  );
console.log(
  `${countries.length} pays · ${(total / 1000).toFixed(0)} GW · hydro+nucléaire ` +
    `${legacyShare.toFixed(1)} % · basculés : ${tipped.length} pays, ${tippedShare.toFixed(1)} % de ` +
    `la puissance · plus gros : ${biggest.name} ${(biggest.mw / 1000).toFixed(1)} GW ` +
    `(${biggest.newShare.toFixed(0)} % éolien+solaire)\n`,
);
console.table(
  countries.slice(0, 10).map((c) => ({
    pays: c.name,
    GW: (c.mw / 1000).toFixed(1),
    "% Europe": ((c.mw / total) * 100).toFixed(1),
    sites: c.sites,
    "% éolien+solaire": c.newShare.toFixed(0),
    basculé: c.tipped ? "oui" : "",
  })),
);

const facts = beatFacts(
  countries.map((c) => ({ key: c.country, label: c.name, value: c.mw })),
  {
    subject: tipped[0].name,
    comparisonSet: tipped.map((c) => c.country),
    units: { count: countries.length, thing: "pays" },
    declaredSequence: "installed capacity",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const cells = countries.map((c) => ({
  key: c.country,
  name: c.name,
  mw: c.mw,
  sites: c.sites,
  tipped: c.tipped,
  value: c.mw >= 1000 ? `${one(c.mw / 1000)} GW` : `${n0(c.mw)} MW`,
  basis: `${n0(c.sites)} ${c.sites > 1 ? "centrales" : "centrale"}`,
}));

const title = [
  `L’eau et l’atome portent encore ${Math.round(legacyShare)} % du bas-carbone européen — mais ${tipped.length} pays ont déjà basculé`,
  `${tipped.length} pays européens où l’éolien et le solaire pèsent déjà plus de la moitié`,
  `La puissance bas-carbone européenne, pays par pays`,
  // TWO SHORTER HEADLINES, FOR A COLUMN HALF AS WIDE. The ladder takes the FIRST rung that fits, so
  // these are never reached at landscape — an 868px column sets the long headline in two lines. A
  // 428px one sets the third headline in FOUR, which took nocturne's plate down to 428 x 121px, a
  // 3.5:1 strip in which a treemap's areas cannot be compared at all. Each line of display type the
  // headline gives back is 39px of plate.
  `La puissance bas-carbone européenne`,
  `${tipped.length} pays ont déjà basculé`,
];
const limits = [
  `Un rectangle par pays, sa surface est sa puissance bas-carbone installée : ` +
    `${n0(total / 1000)} GW en tout, sur ${n0(stations.length)} centrales. Les rectangles en ` +
    `couleur sont les ${tipped.length} pays où l’éolien et le solaire font déjà plus de la moitié ` +
    `de cette puissance — ${one(tippedShare)} % du total européen. Le plus grand rectangle, la ` +
    `${biggest.name}, n’en fait pas partie : ${Math.round(biggest.newShare)} % seulement.`,
  `Un rectangle par pays, sa surface est sa puissance bas-carbone installée — ${n0(total / 1000)} GW ` +
    `en tout. En couleur, les ${tipped.length} pays où l’éolien et le solaire font plus de la moitié.`,
  `Un rectangle par pays : sa puissance bas-carbone installée.`,
];
const reading = [
  `Lecture : la surface est la puissance, et une surface ne se compare pas d’un bout à l’autre du ` +
    `dessin — c’est pourquoi chaque case porte son chiffre. La couleur suit un fil, pas un maximum.`,
  `Lecture : chaque case porte son chiffre, parce qu’une surface ne se compare pas à distance.`,
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production";
const unit = "puissance bas-carbone installée";
const threadNote = `En couleur : les ${tipped.length} pays où l’éolien et le solaire dépassent la moitié.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${threadNote} ${cells.map((c) => c.basis).join(" ")}`,
  annot: `${reading.join(" ")} ${cells.map((c) => c.name).join(" ")}`,
  value: cells.map((c) => c.value).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedTreemap, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        cells,
        unit,
        threadNote,
        restLabel: "autres pays",
        title,
        limits,
        reading,
        source,
        alt:
          `Treemap de la puissance bas-carbone installée en Europe : un rectangle par pays, sa ` +
          `surface proportionnelle à ses mégawatts, sur ${n0(total / 1000)} GW au total. La ` +
          `${biggest.name} occupe le plus grand rectangle avec ${one(biggest.mw / 1000)} GW. Les ` +
          `${tipped.length} pays où l’éolien et le solaire dépassent déjà la moitié de la puissance ` +
          `bas-carbone sont en couleur et pèsent ${one(tippedShare)} % du total ; le plus grand ` +
          `rectangle n’en fait pas partie. Chaque case porte sa puissance et son nombre de centrales.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
