// twin/proof/web-treemap-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon generating capacity, drawn as a squarified treemap and delivered as a page the
// reader can DESCEND INTO. Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// FIVE LAYOUTS, NOT ONE. The root is the claim's own view — 41 countries at continental scale. Each
// of the four sources is laid out AGAIN, from zero, over the whole frame: that is what makes this a
// descent rather than a filter. A country's area inside a branch means "share of this source", and
// the magnification each branch buys is asserted here before the page is written.
//
// Usage:  bun proof/web-treemap-europe-capacity/render-directions-web.mjs

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
import {
  DESCEND_ROOT_SLUG,
  assertOneDescent,
  descendSlugOf,
  magnificationOf,
} from "../../skills/chart-web/assets/descend.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedTreemapWeb, FRAME } from "./DirectedTreemapWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];
/** The hierarchy this beat descends: Europe, then source, then country. The words are the beat's;
 *  `of` is what a country's share of that source is called and `adj` what its gigawatts are. */
const SOURCES = [
  { fuel: "Hydro", key: "hydro", label: "Hydraulique", adj: "hydrauliques", of: "de l'eau européenne", noun: "L'eau" },
  { fuel: "Nuclear", key: "nuclear", label: "Nucléaire", adj: "nucléaires", of: "de l'atome européen", noun: "L'atome" },
  { fuel: "Wind", key: "wind", label: "Éolien", adj: "éoliens", of: "du vent européen", noun: "Le vent" },
  { fuel: "Solar", key: "solar", label: "Solaire", adj: "solaires", of: "du soleil européen", noun: "Le soleil" },
];
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
const count = (n) => plain(n.toLocaleString("fr-FR"));

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
const tippedCountries = new Set(rows.filter((r) => r.tipped).map((r) => r.country));
const tipped = rows.filter((r) => r.tipped);
const tippedShare = (tipped.reduce((s, r) => s + r.mw, 0) / totalMw) * 100;
const biggest = rows[0];
const rankOf = new Map(rows.map((r, i) => [r.country, i + 1]));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(oldShare > 60)) throw new Error(`the headline says water and the atom still carry most of it; they carry ${fr(oldShare)} %`);
if (!(tipped.length >= 5 && tippedShare < oldShare))
  throw new Error(`the headline says a handful have tipped and they are a small share; ${tipped.length} at ${fr(tippedShare)} %`);
if (biggest.tipped) throw new Error("the headline says the largest cell is not one of the tipped");

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

/** One view's geometry. `the-set-a-claim-adds-up-is-drawn-as-a-set`: a layout that lays out fewer
 *  cells than it was given has dropped a country, and this throws rather than shipping the hole. */
function layout(items) {
  const laid = squarify(items, 0, 0, FRAME.width, FRAME.height);
  if (laid.length !== items.length)
    throw new Error(`the layout dropped ${items.length - laid.length} of ${items.length} cells`);
  return laid;
}

// ── THE ROOT VIEW: the claim's own picture ────────────────────────────────────────────────────
const rootCells = layout(rows.map((r) => ({ ...r, value: r.mw }))).map((c) => {
  const freshShare = (c.fresh / c.mw) * 100;
  return {
    key: c.country,
    name: NAMES[c.country],
    x: c.x, y: c.y, w: c.w, h: c.h,
    tipped: c.tipped,
    value: `${fr(c.mw / 1000)} GW`,
    detail:
      `${NAMES[c.country]} · ${fr(c.mw / 1000)} GW bas-carbone · ${fr((c.mw / totalMw) * 100)} % de ` +
      `l'Europe · rang ${rankOf.get(c.country)} sur ${rows.length} · ${count(c.count)} centrales · ` +
      `eau + atome ${fr(100 - freshShare, 0)} %, vent + soleil ${fr(freshShare, 0)} %` +
      `${c.tipped ? " — basculé" : ""}`,
  };
});

// ── THE FOUR BRANCHES: each source laid out AGAIN over the whole frame ─────────────────────────
const branches = SOURCES.map((source) => {
  const sub = lowCarbon.filter((s) => s.fuel === source.fuel);
  const by = new Map();
  for (const s of sub) {
    if (!by.has(s.country)) by.set(s.country, { mw: 0, count: 0 });
    const c = by.get(s.country);
    c.mw += s.mw;
    c.count += 1;
  }
  const items = [...by.entries()]
    .map(([country, c]) => ({ country, ...c, value: c.mw, tipped: tippedCountries.has(country) }))
    .sort((a, b) => b.mw - a.mw);
  const branchMw = items.reduce((s, r) => s + r.mw, 0);
  const rank = new Map(items.map((r, i) => [r.country, i + 1]));
  const tippedInBranch = items.filter((r) => r.tipped);
  const cells = layout(items).map((c) => ({
    key: c.country,
    name: NAMES[c.country],
    x: c.x, y: c.y, w: c.w, h: c.h,
    tipped: c.tipped,
    value: `${fr(c.mw / 1000)} GW`,
    detail:
      `${NAMES[c.country]} · ${fr(c.mw / 1000)} GW ${source.adj} · rang ${rank.get(c.country)} sur ` +
      `${items.length} pays · ${fr((c.mw / branchMw) * 100)} % ${source.of} · ` +
      `${fr((c.mw / byCountry.get(c.country).mw) * 100, 0)} % de son propre parc bas-carbone · ` +
      `${count(c.count)} centrales`,
  }));
  return {
    ...source,
    slug: descendSlugOf(source.key),
    cells,
    items,
    mw: branchMw,
    stations: sub.length,
    parentShare: branchMw / totalMw,
    leaderShare: (items[0].mw / branchMw) * 100,
    leader: NAMES[items[0].country],
    tippedShare: (tippedInBranch.reduce((s, r) => s + r.mw, 0) / branchMw) * 100,
  };
});

// ── WHAT THE DESCENT IS FOR, ASSERTED ─────────────────────────────────────────────────────────
// The gesture's whole claim is that the accent behaves differently inside the sources: the tipped
// countries barely register in the old ones and own the wind. If that ever stops being true, the
// control still works and the sentence under it is a lie, so it is checked rather than written.
const wind = branches.find((b) => b.fuel === "Wind");
const solar = branches.find((b) => b.fuel === "Solar");
const nuclear = branches.find((b) => b.fuel === "Nuclear");
if (!(wind.tippedShare > 2 * tippedShare))
  throw new Error(
    `descending is supposed to SHOW the tipping: the tipped hold ${fr(tippedShare, 0)} % of Europe ` +
      `and ${fr(wind.tippedShare, 0)} % of its wind, which is not the flood the note claims`,
  );
if (!(nuclear.tippedShare < tippedShare))
  throw new Error(`the note says the accent nearly disappears inside the atom; it holds ${fr(nuclear.tippedShare, 0)} %`);
if (!((solar.stations / totalStations) * 100 > 3 * (solar.parentShare * 100)))
  throw new Error(
    `the solar note rests on "7 % of the capacity, 47 % of the stations"; measured ` +
      `${fr(solar.parentShare * 100, 0)} % and ${fr((solar.stations / totalStations) * 100, 0)} %`,
  );

/** The countries the ROOT cannot name that a branch can — the count the reading line quotes, and the
 *  one number that says what descending is worth. Measured on the same fit rule the page applies:
 *  a cell holds a line of the value register when it is at least that tall, which at this frame's
 *  own aspect is a fraction of the plate, so the comparison is made on AREA, view against view. */
const rootArea = new Map(rootCells.map((c) => [c.key, c.w * c.h]));
const gained = new Set();
for (const branch of branches)
  for (const c of branch.cells)
    if (c.w * c.h > 3 * rootArea.get(c.key)) gained.add(c.key);

const views = [
  { slug: DESCEND_ROOT_SLUG, cells: rootCells },
  ...branches.map((b) => ({ slug: b.slug, cells: b.cells })),
];

const descend = {
  label: "Descendre dans une source",
  rootLabel: "Toute l'Europe",
  rootAnnounce: `Toute l'Europe — les ${rows.length} pays, à l'échelle du continent`,
  rootKeys: rootCells.map((c) => c.key),
  options: branches.map((b) => ({
    key: b.key,
    label: b.label,
    announce:
      `${b.label} — ${fr(b.mw / 1000)} GW sur ${b.items.length} pays, ` +
      `${fr(b.parentShare * 100, 0)} % du bas-carbone européen`,
    note:
      `${b.noun} : ${fr(b.mw / 1000)} GW, ${fr(b.parentShare * 100, 0)} % du bas-carbone européen, ` +
      `sur ${count(b.stations)} centrales (${fr((b.stations / totalStations) * 100, 0)} % du parc) ` +
      `dans ${b.items.length} pays. Premier pays : ${b.leader}, ${fr(b.leaderShare, 0)} % à lui ` +
      `seul. Les ${tipped.length} pays basculés en tiennent ${fr(b.tippedShare, 0)} %.`,
    parentShare: b.parentShare,
    keys: b.cells.map((c) => c.key),
  })),
};

console.log(
  `${rows.length} pays · ${fr(totalMw / 1000, 0)} GW bas-carbone sur ${count(totalStations)} centrales · ` +
    `eau + atome ${fr(oldShare, 0)} % · ${tipped.length} pays basculés (${fr(tippedShare, 0)} % de la capacité) · ` +
    `plus grosse cellule ${NAMES[biggest.country]} ${fr((biggest.fresh / biggest.mw) * 100, 0)} % vent+soleil\n`,
);
console.table(
  branches.map((b) => ({
    source: b.label,
    GW: fr(b.mw / 1000),
    pays: b.items.length,
    centrales: b.stations,
    "part du parc": `${fr(b.parentShare * 100, 0)} %`,
    "grossissement": `x${fr(magnificationOf({ parentShare: b.parentShare }))}`,
    "accent y pèse": `${fr(b.tippedShare, 0)} %`,
  })),
);
console.log(`\n${gained.size} pays gagnent au moins le triple de surface en descendant\n`);

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `L'eau et l'atome portent encore ${fr(oldShare, 0)} % des ${fr(totalMw / 1000, 0)} GW bas-carbone européens`;
const caveat =
  `Une cellule par pays — les ${rows.length}, même les trop petites pour porter un nom —, sa ` +
  `SURFACE proportionnelle à sa capacité bas-carbone installée sur ${count(totalStations)} centrales.`;
const tippedNote =
  `${tipped.length} pays ont basculé — vent et soleil y font plus de la moitié du parc : ` +
  `${tipped.map((r) => NAMES[r.country]).join(", ")}. Ils pèsent ${fr(tippedShare, 0)} % de la ` +
  `capacité européenne. La plus grosse cellule, ${NAMES[biggest.country]}, n'en est pas : ` +
  `${fr((biggest.fresh / biggest.mw) * 100, 0)} % de vent et de soleil.`;
const readingLine =
  `Lecture : interrogez une cellule pour son rang et ce qu'il y a dedans, puis DESCENDEZ dans une ` +
  `source : le cadre est recalculé sur elle seule, et l'accent des pays basculés passe de ` +
  `${fr(nuclear.tippedShare, 0)} % du cadre dans l'atome à ${fr(wind.tippedShare, 0)} % dans le vent.`;
const source = `Source : Global Power Plant Database (WRI) · capacité installée par centrale, agrégée par pays et par source`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: [
    descend.label,
    descend.rootLabel,
    ...descend.options.map((o) => o.label),
  ].join(" "),
  annot: `${tippedNote} ${descend.options.map((o) => o.note).join(" ")}`,
  value: views.flatMap((v) => v.cells.map((c) => `${c.name} ${c.value}`)).join(" "),
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
  const outPath = join(OUT, `${id}.html`);
  try {
    await renderWeb({
      component: DirectedTreemapWeb,
      props: {
        views, descend, tippedNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un pavage de ${rootCells.length} rectangles, un par pays, chacun dimensionné par sa ` +
          `capacité bas-carbone. Le plus grand est ${NAMES[biggest.country]} avec ` +
          `${fr(biggest.mw / 1000)} GW ; les plus petits, en bas à droite, sont des bandes de ` +
          `quelques pixels. Les ${tipped.length} pays où le vent et le soleil dépassent la moitié ` +
          `du parc sont colorés et représentent ${fr(tippedShare, 0)} % de la capacité totale. ` +
          `Un contrôle au-dessus redessine tout le pavage sur une seule source à la fois.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // THE MARKUP, READ BACK. `renderWeb` holds the format's own guards; a vocabulary this beat
    // brought with it holds its own, on the page that was actually written — a half-tagged datum
    // here is a branch's label left over the root's cells.
    assertOneDescent(await readFile(outPath, "utf8"), descend);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    // A refused page must not stay on the disk looking like a produced one, and a runner that
    // swallows a refusal makes a red render look green to everything downstream.
    await rm(outPath, { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
