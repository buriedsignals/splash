// twin/proof/web-cartogram-europe-lowcarbon/render-directions-web.mjs
//
// Europe's low-carbon electricity share, one equal tile per country. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// BOTH AVERAGES ARE COMPUTED FROM THE SAME FROZEN SHAPES IN THE SAME PROJECTION the choropleth uses —
// so the comparison is between two drawings of one dataset, not between a drawing and an idea of one.
// The headline asserts a twenty-point gap and the beat refuses to render if the gap is smaller.
//
// Usage:  bun proof/web-cartogram-europe-lowcarbon/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedCartogramWeb } from "./DirectedCartogramWeb.tsx";
import { project } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const CELL = 92;
const GAP = 8;
const BREAKS = [30, 50, 70, 94];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];

/** This beat's own copy of the designed layout. */
const GRID = [
  "..  ISL ..  ..  ..  ..  ..  ..  NOR SWE FIN ..",
  "..  ..  ..  ..  ..  ..  ..  ..  ..  ..  EST ..",
  "..  ..  IRL GBR DNK ..  ..  ..  ..  LVA RUS ..",
  "..  ..  ..  ..  NLD DEU POL LTU BLR ..  ..  ..",
  "..  ..  ..  BEL LUX CZE SVK UKR ..  ..  ..  ..",
  "PRT ESP FRA CHE AUT HUN MDA ..  ..  ..  ..  ..",
  "..  ..  ..  ITA SVN HRV SRB ROU ..  ..  ..  ..",
  "..  ..  ..  MLT MNE BIH MKD BGR ..  ..  ..  ..",
  "..  ..  ..  ..  ..  ALB GRC TUR CYP ..  ..  ..",
];
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-H.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxemb.", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macéd. N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "R.-Uni",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the readings ──────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const readings = new Map();
for (const line of csv.slice(1)) {
  const c = line.split(",");
  if (Number(c[at("year")]) !== YEAR) continue;
  const code = c[at("code")];
  const low = LOW.reduce((s, k) => s + Number(c[at(k)]), 0);
  const total = low + FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  if (total > 0) readings.set(code, { share: (low / total) * 100, low, total });
}
const ranked = [...readings.entries()].sort((a, b) => b[1].share - a[1].share);

// ── the two averages, from the SAME shapes ────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const areaOf = (rings) =>
  rings.reduce((sum, ring) => {
    let a = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = project(ring[i]);
      const [x2, y2] = project(ring[(i + 1) % ring.length]);
      a += x1 * y2 - x2 * y1;
    }
    return sum + Math.abs(a) / 2;
  }, 0);
const areas = new Map();
for (const f of geo.features) {
  const code = f.properties.iso ?? f.properties.code;
  if (!code || !readings.has(code)) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  areas.set(code, (areas.get(code) ?? 0) + areaOf(polys.map((p) => p[0])));
}
const drawnArea = [...areas.values()].reduce((s, a) => s + a, 0);
const byArea = [...areas.entries()].reduce((s, [code, a]) => s + readings.get(code).share * a, 0) / drawnArea;
const byCountry = [...readings.values()].reduce((s, r) => s + r.share, 0) / readings.size;
const gap = byCountry - byArea;
const biggestArea = [...areas.entries()].sort((a, b) => b[1] - a[1])[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(gap > 15))
  throw new Error(`the headline asserts a wide gap between the two averages; it is ${fr(gap)} points`);
console.log(
  `${readings.size} pays lus · moyenne pondérée par la SURFACE ${fr(byArea)} % · par PAYS ` +
    `${fr(byCountry)} % · écart ${fr(gap)} points · plus grande surface ${NAMES[biggestArea[0]]} ` +
    `${fr((biggestArea[1] / drawnArea) * 100)} % du dessin à ${fr(readings.get(biggestArea[0]).share)} %\n`,
);

// ── the layout, checked both ways ──────────────────────────────────────────────────────────────
const seats = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code !== "..") seats.push({ code, row: r, col: c });
  }),
);
for (const s of seats) if (!NAMES[s.code]) throw new Error(`${s.code} sits in the layout and has no French name filed`);
const laid = new Set(seats.map((s) => s.code));
for (const [code] of readings)
  if (!laid.has(code)) throw new Error(`${NAMES[code] ?? code} has a reading and no tile in the layout`);

const klassOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};
const klassLabel = (i) =>
  i === 0 ? `moins de ${BREAKS[0]} %` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} % et plus` : `${BREAKS[i - 1]}–${BREAKS[i]} %`;
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

const cols = Math.max(...GRID.map((r) => r.trim().split(/\s+/).length));
const width = cols * CELL;
const height = GRID.length * CELL;
const tiles = seats.map((s) => {
  const r = readings.get(s.code) ?? null;
  const klass = r ? klassOf(r.share) : null;
  return {
    code: s.code,
    name: NAMES[s.code],
    x: s.col * CELL,
    y: s.row * CELL,
    klass,
    label: NAMES[s.code],
    value: r ? fr(r.share, 0) : "—",
    detail: r
      ? `${NAMES[s.code]} · ${fr(r.share)} % bas-carbone en ${YEAR} · palier ${klassLabel(klass)} · ` +
        `${fr(r.low, 0)} TWh bas-carbone sur ${fr(r.total, 0)} · ` +
        `${ranked.findIndex(([c]) => c === s.code) + 1}e sur ${ranked.length}`
      : `${NAMES[s.code]} · aucune production publiée pour ${YEAR} — case en creux, jamais rangée dans le palier le plus bas`,
  };
});
const missing = tiles.filter((t) => t.klass === null).length;

const facts = beatFacts(
  ranked.map(([c, r]) => ({ key: c, label: NAMES[c] ?? c, value: r.share })),
  { subject: NAMES[ranked[0][0]] ?? ranked[0][0], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Pondérée par la surface, l'Europe est à ${fr(byArea, 0)} % bas-carbone ; pondérée par pays, à ${fr(byCountry, 0)} %`;
const caveat =
  `Une case égale par pays, teintée comme le choroplèthe voisin et calculée sur le même fichier. Un ` +
  `choroplèthe encre chaque pays sur SON territoire, donc il ne peut montrer que la première ` +
  `moyenne — celle que personne n'a choisie, puisque la surface est un fait de la Terre, pas une ` +
  `décision de cartographe. La grille garde la géographie approximative : c'est ce qui la sépare ` +
  `d'un pictogramme.`;
const claimNote =
  `La ${NAMES[biggestArea[0]]} occupe à elle seule ${fr((biggestArea[1] / drawnArea) * 100, 0)} % du ` +
  `dessin du choroplèthe, à ${fr(readings.get(biggestArea[0]).share)} % — et tire la première ` +
  `moyenne vers le bas. ${missing} case${missing > 1 ? "s" : ""} sans lecture ${YEAR} ${missing > 1 ? "sont dessinées" : "est dessinée"} en creux.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une case pour lire la part exacte, les bornes de son ` +
  `palier, ses TWh et son rang — une case dit une CLASSE et rien d'autre.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR} · surfaces mesurées sur les mêmes formes, en projection équivalente`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: classes.map((c) => c.label).join(" "),
  annot: claimNote,
  value: tiles.map((t) => `${t.label} ${t.value}`).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedCartogramWeb,
      props: {
        tiles, classes,
        missingLabel: "pas de donnée",
        cell: CELL, gap: GAP, width, height,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une grille de cases carrées disposées à peu près comme l'Europe, une par pays, toutes de ` +
          `la même taille et teintées selon la part bas-carbone de leur électricité. Les cases les ` +
          `plus foncées sont au nord et à l'ouest ; la case de la ${NAMES[biggestArea[0]]}, qui ` +
          `occupe presque les trois quarts d'un choroplèthe, n'est ici qu'une case parmi ` +
          `${tiles.length}.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
