// twin/proof/web-treemap-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon generating capacity, one cell per country, sized by megawatts. Rendered once
// per FILED DIRECTION into a self-contained interactive page.
//
// SQUARIFIED, AND THE REMAINDER IS SPLIT ALONG THE THREAD: cells are laid out by the standard
// squarify pass so no cell is a sliver whose area nobody can judge.
//
// Usage:  bun proof/web-treemap-europe-capacity/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedTreemapWeb, FRAME } from "./DirectedTreemapWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];
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
/** THE FILE'S CAMERA IS NOT THIS BEAT'S. The WRI export reaches past Europe — Algeria, Iraq, Morocco,
 *  Syria, Tunisia sit in it because the extract was cut by a bounding box, not by a continent. A
 *  treemap of "Europe" that silently included them would be a claim about a set nobody stated, so the
 *  set is stated here and every country outside it is dropped BEFORE anything is summed. */
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const stations = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { country: c[at("country")], fuel: c[at("fuel")], mw: Number(c[at("capacity_mw")]) };
});
const lowCarbon = stations.filter(
  (s) => [...OLD, ...NEW].includes(s.fuel) && Number.isFinite(s.mw) && s.mw > 0 && !OUTSIDE.has(s.country),
);

const byCountry = new Map();
for (const s of lowCarbon) {
  if (!byCountry.has(s.country)) byCountry.set(s.country, { mw: 0, count: 0, old: 0, fresh: 0 });
  const c = byCountry.get(s.country);
  c.mw += s.mw;
  c.count += 1;
  if (OLD.includes(s.fuel)) c.old += s.mw;
  else c.fresh += s.mw;
}
const rows = [...byCountry.entries()]
  .map(([country, c]) => ({ country, ...c, tipped: c.fresh > c.mw / 2 }))
  .sort((a, b) => b.mw - a.mw);
for (const r of rows) if (!NAMES[r.country]) throw new Error(`${r.country} has no French name filed`);

const totalMw = rows.reduce((s, r) => s + r.mw, 0);
const totalStations = rows.reduce((s, r) => s + r.count, 0);
const oldShare = (rows.reduce((s, r) => s + r.old, 0) / totalMw) * 100;
const tipped = rows.filter((r) => r.tipped);
const tippedShare = (tipped.reduce((s, r) => s + r.mw, 0) / totalMw) * 100;
const biggest = rows[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(oldShare > 60)) throw new Error(`the headline says water and the atom still carry most of it; they carry ${fr(oldShare)} %`);
if (!(tipped.length >= 5 && tippedShare < oldShare))
  throw new Error(`the headline says a handful have tipped and they are a small share; ${tipped.length} at ${fr(tippedShare)} %`);
if (biggest.tipped) throw new Error("the headline says the largest cell is not one of the tipped");
console.log(
  `${rows.length} pays · ${fr(totalMw / 1000, 0)} GW bas-carbone sur ${plain(totalStations.toLocaleString("fr-FR"))} centrales · ` +
    `eau + atome ${fr(oldShare, 0)} % · ${tipped.length} pays basculés (${fr(tippedShare, 0)} % de la capacité) · ` +
    `plus grosse cellule ${NAMES[biggest.country]} ${fr((biggest.fresh / biggest.mw) * 100, 0)} % vent+soleil\n`,
);
console.table(rows.slice(0, 10).map((r) => ({ pays: NAMES[r.country], GW: fr(r.mw / 1000), "vent+soleil %": fr((r.fresh / r.mw) * 100), basculé: r.tipped ? "oui" : "" })));

// ── squarify ──────────────────────────────────────────────────────────────────────────────────
function squarify(items, x, y, w, h, out = []) {
  if (!items.length) return out;
  const total = items.reduce((s, i) => s + i.value, 0);
  const scale = (w * h) / total;
  const vertical = w >= h;
  const side = vertical ? h : w;
  let row = [];
  let rowSum = 0;
  const worst = (r, sum, len) => {
    if (!r.length) return Number.POSITIVE_INFINITY;
    const max = Math.max(...r.map((i) => i.value)) * scale;
    const min = Math.min(...r.map((i) => i.value)) * scale;
    const s2 = (sum * scale) ** 2;
    return Math.max((len * len * max) / s2, s2 / (len * len * min));
  };
  let rest = [...items];
  while (rest.length) {
    const next = rest[0];
    if (row.length && worst(row, rowSum, side) < worst([...row, next], rowSum + next.value, side)) break;
    row.push(next);
    rowSum += next.value;
    rest = rest.slice(1);
  }
  const thickness = (rowSum * scale) / side;
  let cursor = vertical ? y : x;
  for (const item of row) {
    const length = (item.value * scale) / thickness;
    out.push(
      vertical
        ? { ...item, x, y: cursor, w: thickness, h: length }
        : { ...item, x: cursor, y, w: length, h: thickness },
    );
    cursor += length;
  }
  return vertical
    ? squarify(rest, x + thickness, y, w - thickness, h, out)
    : squarify(rest, x, y + thickness, w, h - thickness, out);
}

const laid = squarify(
  rows.map((r) => ({ ...r, value: r.mw })),
  0,
  0,
  FRAME.width,
  FRAME.height,
);
if (laid.length !== rows.length) throw new Error(`the layout dropped ${rows.length - laid.length} countries`);

const cells = laid.map((c) => {
  const share = (c.mw / totalMw) * 100;
  const freshShare = (c.fresh / c.mw) * 100;
  return {
    key: c.country,
    name: NAMES[c.country],
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    tipped: c.tipped,
    label: c.w > 78 && c.h > 34 ? "full" : c.w > 52 && c.h > 16 ? "name" : "none",
    value: `${fr(c.mw / 1000)} GW`,
    detail:
      `${NAMES[c.country]} · ${fr(c.mw / 1000)} GW bas-carbone (${fr(share)} % de l'Europe) · ` +
      `${plain(c.count.toLocaleString("fr-FR"))} centrales · eau + atome ${fr(100 - freshShare)} %, ` +
      `vent + soleil ${fr(freshShare)} %${c.tipped ? " — basculé" : ""}`,
  };
});

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `L'Europe compte ${fr(totalMw / 1000, 0)} GW bas-carbone, et l'eau et l'atome en portent encore ${fr(oldShare, 0)} %`;
const caveat =
  `Une cellule par pays, sa SURFACE proportionnelle à sa capacité bas-carbone installée, sur ` +
  `${plain(totalStations.toLocaleString("fr-FR"))} centrales. Tous les pays du fichier sont ` +
  `dessinés, y compris ceux trop petits pour porter un nom : un treemap qui laisse tomber sa queue ` +
  `est un camembert avec de meilleures manières.`;
const tippedNote =
  `${tipped.length} pays ont basculé — le vent et le soleil y font plus de la moitié du parc ` +
  `bas-carbone : ${tipped.map((r) => NAMES[r.country]).join(", ")}. Ils pèsent ${fr(tippedShare, 0)} % ` +
  `de la capacité européenne. La plus grosse cellule, ${NAMES[biggest.country]}, n'en est pas : ` +
  `${fr((biggest.fresh / biggest.mw) * 100, 0)} % de vent et de soleil.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une cellule pour lire le pays, ses GW, sa part de ` +
  `l'Europe, son nombre de centrales et le partage entre eau-et-atome et vent-et-soleil. Une ` +
  `surface se classe et ne se mesure pas — et deux cellules de même taille peuvent avoir des parcs ` +
  `entièrement différents.`;
const source = `Source : Global Power Plant Database (WRI) · capacité installée par centrale, agrégée par pays`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: cells.filter((c) => c.label !== "none").map((c) => c.name).join(" "),
  annot: tippedNote,
  value: cells.filter((c) => c.label === "full").map((c) => c.value).join(" "),
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
      component: DirectedTreemapWeb,
      props: {
        cells, tippedNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un pavage de ${cells.length} rectangles, un par pays, chacun dimensionné par sa capacité ` +
          `bas-carbone. Le plus grand est ${NAMES[biggest.country]} avec ${fr(biggest.mw / 1000)} GW ; ` +
          `les plus petits, en bas à droite, sont des bandes de quelques pixels. Les ` +
          `${tipped.length} pays où le vent et le soleil dépassent la moitié du parc sont colorés ` +
          `et représentent ${fr(tippedShare, 0)} % de la capacité totale.`,
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
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
