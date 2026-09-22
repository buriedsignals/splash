// twin/proof/web-pictogram-europe-lowcarbon/render-directions-web.mjs
//
// The forty European countries that report 2024 generation, drawn as a pictogram of three blocks and
// rendered once per FILED DIRECTION into a self-contained interactive page.
//
// WHAT THIS RUNNER OWNS THAT THE COMPONENT DOES NOT: the four fields, and the attribution of every
// square in every one of them. The reader's control changes what one square is WORTH — a country, a
// hundred terawatt-hours of electricity, of low-carbon generation, or of fossil generation — and a
// unit is not a transform of a drawing, it is a different count. All four are computed HERE, from
// the frozen file, and refused HERE, so a unit that dropped a remainder or emptied a block never
// reaches a browser. `skills/chart-web/assets/unit.ts` holds the arithmetic and the refusals.
//
// THE ATTRIBUTION IS ONE WALK, AND IT IS THE SAME WALK IN ALL FOUR OPTIONS. A block's countries are
// laid end to end in the block's own order and the field is cut into squares of `perValue`; a square
// is then whatever countries its interval overlaps, with the fraction each one contributes. Under
// « un pays » the quantity is 1 per country and the unit is 1, so a square is exactly one country
// and the walk degenerates into the static sibling's own plate — which is the point, and the reason
// there is one arithmetic here and not two.
//
// Usage:  bun proof/web-pictogram-europe-lowcarbon/render-directions-web.mjs

import { readdirSync, rmSync } from "node:fs";
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
import { assertOneUnit, unitCellId } from "../../skills/chart-web/assets/unit.ts";
import { DirectedPictogramWeb, GRID, fieldGeometry } from "./DirectedPictogramWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;

const LOW_COLUMNS = [
  "other_renewables_generation__twh",
  "bioenergy_stacked_generation__twh",
  "solar_generation__twh",
  "wind_generation__twh",
  "hydro_generation__twh",
  "nuclear_generation__twh",
];
const FOSSIL_COLUMNS = [
  "gas_generation__twh",
  "oil_generation__twh",
  "coal_generation__twh",
];

/** The two cuts the static sibling made, kept to the number. */
const HIGH = 75;
const MID = 60;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const int = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const pc = (v, d = 1) => `${fr(v, d)} %`;

/** THE COUNTRY NAMES ARE FILED IN FRENCH, one per drawn country, because there are forty of them and
 *  every one is printed under the pointer. Forty is few enough to file by hand and far too many to
 *  guess: an automatic translation in a tooltip is a factual error nobody would catch. */
const FR_NAME = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique",
  BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande",
  FRA: "France", DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie",
  ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie",
  MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège",
  POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne",
  SWE: "Suède", CHE: "Suisse", TUR: "Turquie", GBR: "Royaume-Uni",
};

// ── the countries ─────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",").map((h) => h.trim());
const at = (name) => {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`the frozen file has no column ${JSON.stringify(name)}`);
  return index;
};

const all = [];
const absent = [];
for (const line of csv.slice(1)) {
  const c = line.split(",");
  const code = c[at("code")].trim();
  const cells = [...LOW_COLUMNS, ...FOSSIL_COLUMNS].map((name) => c[at(name)].trim());
  // A COUNTRY WITH NO READING IS NOT DRAWN, AND IT IS NAMED. A unit grid counts things, and a square
  // for a country with no data would be counted — the static sibling's own rule, kept here because
  // this page invites the reader to count harder, not less.
  if (cells.some((v) => v === "" || !Number.isFinite(Number(v)))) {
    absent.push(code);
    continue;
  }
  const low = LOW_COLUMNS.reduce((s, name) => s + Number(c[at(name)]), 0);
  const fossil = FOSSIL_COLUMNS.reduce((s, name) => s + Number(c[at(name)]), 0);
  const total = low + fossil;
  if (!(total > 0)) {
    absent.push(code);
    continue;
  }
  const name = FR_NAME[code];
  if (!name) throw new Error(`${code} is drawn and has no filed French name`);
  all.push({ code, name, low, fossil, total, share: (low / total) * 100 });
}
// Sorted by the share the blocks are cut on, ties broken on the code so the same file produces the
// same field on every machine.
all.sort((a, b) => b.share - a.share || (a.code < b.code ? -1 : 1));

const BLOCKS = [
  { key: "high", name: `${HIGH} % et plus`, test: (r) => r.share >= HIGH },
  { key: "mid", name: `${MID} à ${HIGH} %`, test: (r) => r.share < HIGH && r.share >= MID },
  { key: "low", name: `moins de ${MID} %`, test: (r) => r.share < MID },
];
const membersOf = new Map(BLOCKS.map((b) => [b.key, all.filter(b.test)]));
const blockOf = new Map();
for (const b of BLOCKS) for (const r of membersOf.get(b.key)) blockOf.set(r.code, b.key);

const SUM = {
  total: all.reduce((s, r) => s + r.total, 0),
  low: all.reduce((s, r) => s + r.low, 0),
  fossil: all.reduce((s, r) => s + r.fossil, 0),
};
const rankOf = new Map(all.map((r, i) => [r.code, i + 1]));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const nHigh = membersOf.get("high").length;
const nMid = membersOf.get("mid").length;
const nLow = membersOf.get("low").length;
if (nHigh + nMid + nLow !== all.length)
  throw new Error(`the three blocks hold ${nHigh + nMid + nLow} of ${all.length} countries`);
if (!(nMid < all.length / 4))
  throw new Error(`the headline says the middle holds under a quarter of the field; it holds ${nMid} of ${all.length}`);
if (!(nHigh === 16 && nLow === 18))
  throw new Error(`the static sibling's plate is 16 above and 18 below; this file gives ${nHigh} and ${nLow}`);
// The control's own claim, asserted before it is offered: the three blocks' RANKING by size must
// change with the unit, or the whole gesture is a re-skin.
const shareIn = (blockKey, pick) =>
  (membersOf.get(blockKey).reduce((s, r) => s + pick(r), 0) /
    all.reduce((s, r) => s + pick(r), 0)) * 100;
const headCount = shareIn("high", () => 1);
const headPower = shareIn("high", (r) => r.total);
if (!(headCount - headPower > 5))
  throw new Error(
    `the whole gesture is that counting countries and counting electricity disagree; the sixteen ` +
      `are ${fr(headCount)} % of the field and ${fr(headPower)} % of the electricity`,
  );

// ── the four units ────────────────────────────────────────────────────────────────────────────
const UNITS = [
  { key: "country", per: "un pays", perValue: 1, quantity: () => 1 },
  { key: "power", per: "100 TWh d'électricité", perValue: 100, quantity: (r) => r.total },
  { key: "clean", per: "100 TWh bas-carbone", perValue: 100, quantity: (r) => r.low },
  { key: "fossil", per: "100 TWh fossile", perValue: 100, quantity: (r) => r.fossil },
];

const iconsIn = (unit, blockKey) =>
  membersOf.get(blockKey).reduce((s, r) => s + unit.quantity(r), 0) / unit.perValue;

/** THE GRID'S CAPACITY IS A FACT ABOUT THE WIDEST OPTION, never about the data — which is why no
 *  empty cell is drawn as a ghost: a ghost would read as a denominator, and there is none. */
const blocks = BLOCKS.map((b) => ({
  key: b.key,
  capacity: Math.max(...UNITS.map((u) => Math.ceil(iconsIn(u, b.key) - 1e-9))),
}));

/**
 * WHICH COUNTRIES FILL ONE SQUARE, AND HOW MUCH OF IT EACH ONE FILLS.
 *
 * The block's countries laid end to end in the block's own order, the field cut into squares of
 * `perValue`, and a square attributed to whatever it overlaps. Under « un pays » the quantity is 1
 * and the unit is 1, so every square resolves to exactly one country and this walk IS the static
 * sibling's plate. One arithmetic, four fields.
 */
function attribute(unit, blockKey) {
  const members = membersOf.get(blockKey);
  const total = members.reduce((s, r) => s + unit.quantity(r), 0);
  const icons = total / unit.perValue;
  const out = [];
  const cells = Math.ceil(icons - 1e-9);
  let cursor = 0;
  let index = 0;
  for (let cell = 0; cell < cells; cell += 1) {
    const from = cell * unit.perValue;
    const to = Math.min((cell + 1) * unit.perValue, total);
    const parts = [];
    let walk = cursor;
    let i = index;
    while (i < members.length && walk < to) {
      const q = unit.quantity(members[i]);
      const overlap = Math.min(walk + q, to) - Math.max(walk, from);
      if (overlap > 1e-9) parts.push({ country: members[i], overlap });
      walk += q;
      i += 1;
    }
    // Where the next cell starts walking from, so the whole block is one pass and not one pass per
    // cell: everything strictly before `to` is behind us.
    while (index < members.length && cursor + unit.quantity(members[index]) <= to + 1e-9) {
      cursor += unit.quantity(members[index]);
      index += 1;
    }
    out.push({ cell, from, to, fill: (to - from) / unit.perValue, parts });
  }
  return { icons, total, cells: out };
}

const fields = new Map();
for (const unit of UNITS)
  for (const block of blocks) fields.set(`${unit.key}:${block.key}`, attribute(unit, block.key));

// ── the readings every square answers with, one kind per unit ─────────────────────────────────
const blockName = (key) => BLOCKS.find((b) => b.key === key).name;

function detailFor(unit, blockKey, cell) {
  const field = fields.get(`${unit.key}:${blockKey}`);
  if (unit.key === "country") {
    const r = cell.parts[0].country;
    return (
      `${r.name} · ${pc(r.share)} de son électricité est bas-carbone · ` +
      `${fr(r.total)} TWh produits, dont ${fr(r.low)} bas-carbone · ` +
      `rang ${rankOf.get(r.code)} sur ${all.length}`
    );
  }
  const whole = cell.fill > 0.999;
  const head = whole
    ? `Carré ${cell.cell + 1} sur ${fr(field.icons)} du bloc « ${blockName(blockKey)} »`
    : `Dernier carré du bloc « ${blockName(blockKey)} », rempli à ${pc(cell.fill * 100, 0)} : ` +
      `${fr(cell.to - cell.from)} TWh`;
  const who = cell.parts
    .map((p) => `${p.country.name} (${pc((p.overlap / (cell.to - cell.from)) * 100, 0)})`)
    .join(", puis ");
  const solo =
    cell.parts.length === 1
      ? ` · ${cell.parts[0].country.name} en remplit ` +
        `${fr(unit.quantity(cell.parts[0].country) / unit.perValue, 2)} à elle seule`
      : "";
  return `${head} · un carré vaut ${unit.per} · ${who}${solo}`;
}

const geometry = fieldGeometry(blocks);
const plates = UNITS.map((unit) => ({
  slug: unit.key,
  cells: blocks.flatMap((block) => {
    const field = fields.get(`${unit.key}:${block.key}`);
    return field.cells.map((cell) => {
      const seat = geometry.seatOf(block.key, cell.cell);
      const detail = plain(detailFor(unit, block.key, cell));
      return {
        id: unitCellId(block.key, cell.cell),
        block: block.key,
        x: seat.x,
        y: seat.y,
        width: cell.fill * GRID.ink,
        detail,
        announce: detail,
      };
    });
  }),
}));

// ── the declaration ───────────────────────────────────────────────────────────────────────────
const squares = (n) => `${fr(n)} ${n >= 2 ? "carrés" : "carré"}`;
const NOTE_OF = {
  power:
    `Les ${nLow} pays sous ${MID} % sont ${pc(shareIn("low", () => 1))} du terrain et ` +
    `${pc(shareIn("low", (r) => r.total))} de l'électricité européenne : ${int(membersOf.get("low").reduce((s, r) => s + r.total, 0))} TWh ` +
    `sur ${int(SUM.total)}. Les ${nHigh} au-dessus de ${HIGH} % n'en font que ${pc(headPower)}, et la ` +
    `Russie à elle seule remplit ${fr(all.find((r) => r.code === "RUS").total / 100, 1)} des ` +
    `${fr(iconsIn(UNITS[1], "low"))} carrés du bloc du bas.`,
  clean:
    `Les ${nLow} pays sous ${MID} % produisent ${fr(membersOf.get("low").reduce((s, r) => s + r.low, 0))} TWh bas-carbone, ` +
    `soit ${pc(shareIn("low", (r) => r.low))} du bas-carbone européen — ` +
    `${pc((membersOf.get("low").reduce((s, r) => s + r.low, 0) / membersOf.get("high").reduce((s, r) => s + r.low, 0)) * 100, 0)} ` +
    `de ce que produisent les ${nHigh} (${fr(membersOf.get("high").reduce((s, r) => s + r.low, 0))} TWh). ` +
    `Le bloc du milieu, lui, tombe à ${squares(iconsIn(UNITS[2], "mid"))}.`,
  fossil:
    `${pc(shareIn("low", (r) => r.fossil))} de l'électricité fossile européenne sort des ${nLow} pays ` +
    `sous ${MID} %. Les ${nHigh} au-dessus de ${HIGH} % en font ${pc(shareIn("high", (r) => r.fossil))}, ` +
    `soit ${squares(iconsIn(UNITS[3], "high"))} : ${fr(membersOf.get("high").reduce((s, r) => s + r.fossil, 0))} TWh ` +
    `sur ${int(SUM.fossil)}.`,
};
const LABEL_OF = {
  country: "un pays",
  power: "100 TWh d'électricité",
  clean: "100 TWh bas-carbone",
  fossil: "100 TWh fossile",
};
const ANNOUNCE_OF = {
  country: "un pays — un carré par pays, quelle que soit sa taille : le terrain compte les pays",
  power:
    "100 TWh d'électricité — un carré pour cent térawattheures produits : le terrain compte l'électricité",
  clean:
    "100 TWh bas-carbone — un carré pour cent térawattheures bas-carbone : le terrain compte la production propre",
  fossil:
    "100 TWh fossile — un carré pour cent térawattheures fossiles : le terrain compte le charbon, le gaz et le fioul",
};

const unit = {
  label: "Un carré vaut",
  blocks,
  cell: GRID.cell,
  ink: GRID.ink,
  /** The thinnest ink a partial square may draw, in geometry units — a twelfth of the glyph. Below
   *  it a reader sees nothing and the page is indistinguishable from one whose data was missing. */
  sliver: 2.8,
  /** The most squares one option may spend. The type sheet: a unit so fine that the field sprawls
   *  has given up the only thing a pictogram has over a bar chart. This is what the grid seats. */
  ceiling: blocks.reduce((s, b) => s + b.capacity, 0),
  options: UNITS.map((u) => ({
    key: u.key,
    label: plain(LABEL_OF[u.key]),
    per: plain(LABEL_OF[u.key]),
    perValue: u.perValue,
    announce: plain(ANNOUNCE_OF[u.key]),
    ...(NOTE_OF[u.key] ? { note: plain(NOTE_OF[u.key]) } : {}),
    counts: blocks.map((b) => ({ block: b.key, icons: iconsIn(u, b.key) })),
    figures: blocks.map((b) => ({ block: b.key, text: plain(squares(iconsIn(u, b.key))) })),
  })),
};

console.log(
  `${all.length} pays dessinés · ${absent.length} sans donnée 2024 (${absent.join(", ")}) · ` +
    `${int(SUM.total)} TWh, dont ${int(SUM.low)} bas-carbone et ${int(SUM.fossil)} fossiles\n`,
);
console.table(
  UNITS.map((u) => {
    const row = { "un carré vaut": LABEL_OF[u.key], "en tout": fr(blocks.reduce((s, b) => s + iconsIn(u, b.key), 0), 2) };
    for (const b of blocks) {
      const field = fields.get(`${u.key}:${b.key}`);
      const fraction = field.icons - Math.floor(field.icons + 1e-9);
      row[blockName(b.key)] =
        `${fr(field.icons, 3)} (${pc(shareIn(b.key, u.quantity))})` +
        (fraction > 1e-9 ? ` reste ${fr(fraction, 3)} = ${fr(fraction * GRID.ink, 1)} u` : " entier");
    }
    return row;
  }),
);
// The ink every cell REALLY carries, read off the plates this runner is about to hand the
// component rather than recomputed beside them. Nothing here may be the first thing to throw: a
// declaration that refuses must refuse inside `renderWeb`, where the loop below takes the stale
// render off the disk and sets a non-zero exit, and not out here where it would leave three pages
// from the last good run sitting on disk looking produced.
const thinnest = plates.reduce((least, plate) => {
  for (const cell of plate.cells)
    if (cell.width > 1e-9 && cell.width < least.width)
      least = { width: cell.width, label: LABEL_OF[plate.slug] };
  return least;
}, { width: Infinity, label: "" });
console.log(
  `\nplus fine encre dessinée : ${fr(thinnest.width, 2)} unités sur ${GRID.ink} ` +
    `(${thinnest.label}), pour un liseré minimum de ${unit.sliver}\n`,
);

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const title = `${nHigh} pays européens sur ${all.length} dépassent ${HIGH} % bas-carbone`;
const caveat =
  `Un carré, un pays : les ${all.length} pays européens qui publient leur production ${YEAR}, rangés ` +
  `par la part bas-carbone de leur électricité. Ce que vaut un carré est en dessous, et c'est vous ` +
  `qui le choisissez.`;
const readingLine =
  `Lecture : ${nHigh} pays sont au-dessus de ${HIGH} %, ${nLow} sous ${MID} %, ${nMid} entre les deux. ` +
  `Changez ce que vaut un carré et le terrain se recompte : les ${nLow} du bas passent de ` +
  `${pc(shareIn("low", () => 1))} du terrain à ${pc(shareIn("low", (r) => r.total))} de l'électricité ` +
  `et à ${pc(shareIn("low", (r) => r.fossil))} du fossile. Survolez, touchez ou tabulez n'importe quel ` +
  `carré : sous « un pays » il répond avec son pays, sous les autres avec les pays qui le remplissent.`;
const source =
  `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in ` +
  `Data · ${YEAR} · l'Ukraine ne publie pas ${YEAR} et n'est pas dessinée`;
const alt =
  `Un terrain de carrés en trois blocs, un carré par pays. En haut les ${nHigh} pays dont au moins ` +
  `${HIGH} % de l'électricité est bas-carbone, au milieu les ${nMid} entre ${MID} et ${HIGH} %, en bas ` +
  `les ${nLow} sous ${MID} %. Un choix sous le titre change ce que vaut un carré — un pays, ou cent ` +
  `térawattheures d'électricité, de bas-carbone ou de fossile — et l'encre coule dans le terrain ou ` +
  `s'en retire sans qu'aucun carré ne bouge : le bloc du bas passe de ${fr(iconsIn(UNITS[0], "low"), 0)} ` +
  `carrés à ${fr(iconsIn(UNITS[1], "low"))}, et le bloc du haut de ${fr(iconsIn(UNITS[0], "high"), 0)} ` +
  `à ${fr(iconsIn(UNITS[3], "high"))}.`;

const blockNames = BLOCKS.map((b) => ({ key: b.key, name: plain(b.name) }));

const interaction = {
  earns: plain(
    `Un still doit choisir ce que vaut un carré et demander qu'on lui fasse confiance ; une vidéo ou ` +
      `un scrolly ne peuvent que jouer les quatre unités dans l'ordre de l'auteur, une fois. Ici le ` +
      `lecteur tient l'unité, fait l'aller-retour autant qu'il veut sur un terrain dont aucun carré ` +
      `ne bouge, et chaque carré répond avec ce qui le remplit — ce qu'aucune planche fixe ne peut ` +
      `dire, puisqu'elle n'a qu'une unité.`,
  ),
  controls: [
    {
      question: plain("Un carré, ça vaut quoi au juste ?"),
      gesture: "toggle-a-comparison",
      changes: plain(
        `l'encre coule dans le terrain ou s'en retire : chaque bloc garde ses places et change de ` +
          `longueur, le dernier carré de chaque bloc se remplit à son propre reste, et le chiffre ` +
          `de chaque bloc se remplace sur place dans la gouttière.`,
      ),
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "ce qu'un carré vaut",
      authorPicked: "country",
      readerPicks: ["country", "power", "clean", "fossil"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: plain("Ce carré-là, c'est qui ?"),
      gesture: "ask-a-mark",
      changes: plain(
        `le carré lui-même se fonce depuis son propre remplissage, et répond sous « un pays » avec ` +
          `son pays, sa part, sa production et son rang — et sous les unités en térawattheures avec ` +
          `les pays qui le remplissent et la fraction que chacun y met.`,
      ),
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel carré est en question",
      authorPicked: "la France",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

// WHAT THIS BEAT DECLARES TO THE ARBITER, and two of these fields are the difference between the
// pictogram treatments being offered and not. `units` says one mark is one thing and names the
// thing; `interaction.readerParameter` says the reader's own choice is a parameter of the CLAIM and
// not only of the view, which on this beat is literally true — the unit they set is what the count
// means. The default field's 40 squares are the count declared, because that is the picture a reader
// who touches nothing is looking at.
const facts = beatFacts(
  all.map((r) => ({ key: r.code, label: r.name, value: r.share })),
  {
    subject: FR_NAME.FRA,
    declaredSequence: "% bas-carbone",
    units: { count: all.length, thing: "un pays" },
    interaction: { controls: interaction.controls.length, readerParameter: true },
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);


const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: blockNames.map((b) => b.name).join(" "),
  annot:
    `${unit.label} ` +
    unit.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""} ${o.figures.map((f) => f.text).join(" ")}`).join(" "),
  value: all.map((r) => fr(r.share)).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
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
  const name = `${id}.html`;
  try {
    const { outPath } = await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedPictogramWeb,
      props: {
        plates,
        unit,
        blockNames,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, alt, reading: readingLine,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    // READ THE WRITTEN PAGE BACK. Several of this vocabulary's refusals can only be made here: a
    // cell drawn at a seat no rule sets, a blanket emitted after the rules it is supposed to
    // outrank, and a stylesheet that forgot to hide the answering layers it generated — the
    // mutation `descend.ts` and `aim.ts` both record, where every attribute stayed perfectly
    // correct and the page shipped every state drawn on top of every other.
    assertOneUnit(await readFile(outPath, "utf8"), unit, name);
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // A REFUSED PAGE MUST NOT LOOK LIKE A PRODUCED ONE. The stale render goes off the disk and the
    // process exits non-zero, which is the half a runner that only prints a message leaves out.
    rmSync(join(OUT, name), { force: true });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
