// twin/proof/web-hex-grid-europe-protection/render-directions-web.mjs
//
// Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country.
// Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// THE LAYOUT IS DESIGNED, NOT DERIVED, and the page says so. It is CHECKED BOTH WAYS: every code in
// the layout has a reading and every reading has a cell — a hand-drawn layout is the one thing here a
// reader cannot check against the source, so nothing else about it is left unchecked.
//
// WHAT THE WEB ADDS is the GRAIN: over how many cells a cell adds up its own numerator and its own
// denominator before it divides. `skills/map-web/assets/pool.ts` is the vocabulary and `BRIEF.md`
// argues it; everything this file does with it is derived from the frozen files and asserted here
// before anything is drawn.
//
// Usage:  bun proof/web-hex-grid-europe-protection/render-directions-web.mjs

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
import {
  assertOnePool,
  assertPoolDeclaration,
  poolFiguresForMarkup,
  poolPartitionOf,
  poolSlugOf,
  pooledValues,
} from "../../skills/map-web/assets/pool.ts";
import { DirectedHexGridWeb } from "./DirectedHexGridWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const RADIUS = 44;
const BREAKS = [5, 10, 20, 30];
/** A hairline's worth of room outside the outermost hexagon, in the geometry's own units. The
 *  polygons carry a 2px NON-SCALING stroke, so half of it is painted outside the shape at every
 *  scale; two units is more than that at every width this page has been driven at. */
const PAD = 3;

/** This beat's own copy of the designed layout — odd rows offset by half a cell, which is what makes
 *  every neighbour an EDGE neighbour. Duplicated rather than imported from the static sibling: a
 *  beat renders on its own. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

/** THE THIRD GRAIN'S BLOCKS, named the way a reader already holds Europe. They are an EDITORIAL
 *  partition and the page says so: the point of the control is precisely that a grouping is a
 *  choice somebody made, so a grouping presented as natural would defeat it. Checked both ways
 *  below — every host is in exactly one block and every block names only hosts. */
const REGIONS = {
  Nordiques: ["ISL", "NOR", "SWE", "FIN", "DNK"],
  Baltes: ["EST", "LVA", "LTU"],
  "Europe centrale": ["DEU", "POL", "CZE", "SVK", "AUT", "HUN", "SVN"],
  "Europe de l'Ouest": ["IRL", "NLD", "BEL", "LUX", "CHE", "FRA", "LIE"],
  "Europe du Sud": ["PRT", "ESP", "ITA", "MLT", "GRC", "CYP", "HRV"],
  "Europe du Sud-Est": ["ROU", "BGR"],
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const count = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const protection = await readCsv("protection.csv");
const population = await readCsv("population.csv");
const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const month = protection[0].month;

const hosts = protection.map((r) => r.code);
for (const code of hosts) {
  if (!Number.isFinite(people[code]) || people[code] <= 0) throw new Error(`${code} has no usable count`);
  if (!Number.isFinite(inhabitants[code]) || inhabitants[code] <= 0)
    throw new Error(`${code} has no population in the frozen file`);
}
const rate = (code) => (people[code] / inhabitants[code]) * 1000;

// ── the layout, checked both ways ──────────────────────────────────────────────────────────────
const seats = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code !== ".") seats.push({ code, row: r, col: c });
  }),
);
const laidOut = new Set(seats.map((s) => s.code));
for (const s of seats) {
  if (!NAMES[s.code]) throw new Error(`${s.code} sits in the layout and has no French name filed`);
  if (s.code !== ORIGIN && !hosts.includes(s.code))
    throw new Error(`${s.code} sits in the layout and has no reading`);
}
for (const code of hosts)
  if (!laidOut.has(code)) throw new Error(`${NAMES[code] ?? code} has a reading and no cell in the layout`);

// ── the blocks, checked both ways as well ─────────────────────────────────────────────────────
const regionOf = {};
for (const [name, members] of Object.entries(REGIONS))
  for (const code of members) {
    if (!hosts.includes(code)) throw new Error(`the block ${JSON.stringify(name)} names ${code}, which has no reading`);
    if (regionOf[code]) throw new Error(`${code} sits in two blocks: ${regionOf[code]} and ${name}`);
    regionOf[code] = name;
  }
for (const code of hosts)
  if (!regionOf[code])
    throw new Error(
      `${NAMES[code]} has a reading and sits in no block. A grain that leaves a cell out sets its ` +
        `colour by no rule, so it would keep whatever the state before it painted.`,
    );

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
if (byRate[0] === byCount[0])
  throw new Error(`the pair has nothing to show: ${NAMES[byRate[0]]} leads both rankings`);
const subject = byRate[0];
const biggest = byCount[0];
console.log(
  `${hosts.length} pays d'accueil · par habitant : ${NAMES[subject]} ${fr(rate(subject))} pour 1 000 · ` +
    `en nombre : ${NAMES[biggest]} ${count(people[biggest])} (${fr(rate(biggest))} pour 1 000, ` +
    `${byRate.indexOf(biggest) + 1}e) · dernier ${NAMES[byRate[byRate.length - 1]]} ` +
    `${fr(rate(byRate[byRate.length - 1]))}\n`,
);

const klassOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};
const klassLabel = (i) =>
  i === 0 ? `moins de ${BREAKS[0]}` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} et plus` : `${BREAKS[i - 1]}–${BREAKS[i]}`;
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

// ── the geometry, derived from what the cells actually occupy ─────────────────────────────────
//
// THE FRAME IS THE CELLS' OWN EXTENT, NOT A FORMULA ABOUT THE GRID. The premier jet took the frame
// from `(columns + 0.5) * dx`, which is the width the widest row WOULD have if every row were full;
// on a hand-drawn layout with holes in it that is a guess, and a guess about a frame is how cells
// end up outside one. Here the outermost vertices are measured, the drawing is shifted so the
// leftmost and topmost sit at `PAD`, and every hexagon is then asserted to be inside the viewBox.
const DX = RADIUS * Math.sqrt(3);
const DY = RADIUS * 1.5;
const HALF_W = DX / 2;
const rawX = (s) => s.col * DX + (s.row % 2 ? HALF_W : 0);
const rawY = (s) => s.row * DY;
const minX = Math.min(...seats.map((s) => rawX(s) - HALF_W));
const maxX = Math.max(...seats.map((s) => rawX(s) + HALF_W));
const minY = Math.min(...seats.map((s) => rawY(s) - RADIUS));
const maxY = Math.max(...seats.map((s) => rawY(s) + RADIUS));
const width = Number((maxX - minX + PAD * 2).toFixed(1));
const height = Number((maxY - minY + PAD * 2).toFixed(1));
const centreOf = (s) => ({
  cx: Number((rawX(s) - minX + PAD).toFixed(1)),
  cy: Number((rawY(s) - minY + PAD).toFixed(1)),
});
for (const s of seats) {
  const { cx, cy } = centreOf(s);
  if (cx - HALF_W < 0 || cx + HALF_W > width || cy - RADIUS < 0 || cy + RADIUS > height)
    throw new Error(
      `${NAMES[s.code]}'s hexagon runs outside the ${width} x ${height} frame ` +
        `(x ${(cx - HALF_W).toFixed(1)}..${(cx + HALF_W).toFixed(1)}, y ${(cy - RADIUS).toFixed(1)}..` +
        `${(cy + RADIUS).toFixed(1)}). A cell nobody can see is a cell the title still counts.`,
    );
}
console.log(`frame ${width} x ${height} · ${seats.length} hexagons, all inside\n`);

// ── the grain ─────────────────────────────────────────────────────────────────────────────────
//
// The six edge directions of an odd-row-offset pointy-top grid, in the order the hexagon's own
// vertices are wound (edge `e` runs from vertex `e` to vertex `e + 1`, vertex `i` at 60i − 30°), so
// one table serves both the neighbour lookup and the block outline.
const EDGE_DIRS = {
  even: [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]],
  odd: [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]],
};
const seatAt = new Map(seats.map((s) => [`${s.row},${s.col}`, s]));
const neighbourAcross = (s, edge) => {
  const [dr, dc] = EDGE_DIRS[s.row % 2 ? "odd" : "even"][edge];
  return seatAt.get(`${s.row + dr},${s.col + dc}`) ?? null;
};
const seatOf = new Map(seats.map((s) => [s.code, s]));
const neighbourhoodOf = (code) => {
  const s = seatOf.get(code);
  const out = [code];
  for (let edge = 0; edge < 6; edge += 1) {
    const n = neighbourAcross(s, edge);
    if (n && n.code !== ORIGIN) out.push(n.code);
  }
  return out;
};

const pool = {
  label: plain("À quelle échelle la case met sa valeur en commun"),
  unit: plain("pour 1 000 habitants"),
  scale: 1000,
  breaks: BREAKS,
  cells: hosts.map((code) => ({ code, numerator: people[code], denominator: inhabitants[code] })).map((c) => ({
    key: c.code,
    numerator: c.numerator,
    denominator: c.denominator,
  })),
  grains: [
    {
      key: "pays",
      label: plain("le pays"),
      announce: plain("Chaque case mesure le pays, et le pays seul — le pays"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: [code] })),
    },
    {
      key: "voisinage",
      label: plain("le voisinage"),
      announce: plain("Chaque case est mise en commun avec ses voisines par une arête — le voisinage"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: neighbourhoodOf(code) })),
    },
    {
      key: "region",
      label: plain("la région"),
      announce: plain("Chaque case prend le taux de son bloc régional — la région"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: REGIONS[regionOf[code]] })),
    },
  ],
};

// The two sentences the control owes the reader, derived from the frozen file rather than typed.
const classesUnder = (grain) => {
  const values = pooledValues(pool, grain);
  return new Map([...values].map(([k, v]) => [k, klassOf(v)]));
};
const baseClasses = classesUnder(pool.grains[0]);
const movedUnder = (grain) =>
  [...baseClasses.keys()].filter((k) => classesUnder(grain).get(k) !== baseClasses.get(k)).length;
const valueUnder = (grain, code) => pooledValues(pool, grain).get(code);
const hoodMoved = movedUnder(pool.grains[1]);
const regionMoved = movedUnder(pool.grains[2]);
const swing = [...hosts]
  .map((code) => ({ code, from: rate(code), to: valueUnder(pool.grains[1], code) }))
  .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0];
const swingNeighbour = neighbourhoodOf(swing.code)
  .filter((c) => c !== swing.code)
  .sort((a, b) => inhabitants[b] - inhabitants[a])[0];
const widestBlock = Object.keys(REGIONS)
  .map((name) => {
    const pooledRate = valueUnder(pool.grains[2], REGIONS[name][0]);
    const mean = REGIONS[name].reduce((a, c) => a + rate(c), 0) / REGIONS[name].length;
    return { name, pooledRate, mean, gap: Math.abs(mean - pooledRate) };
  })
  .sort((a, b) => b.gap - a.gap)[0];
const wholeRate = (hosts.reduce((a, c) => a + people[c], 0) / hosts.reduce((a, c) => a + inhabitants[c], 0)) * 1000;
const meanOfRates = hosts.reduce((a, c) => a + rate(c), 0) / hosts.length;

pool.grains[1].note = plain(
  `Chaque case additionne ses personnes et ses habitants avec ceux de ses voisines par une arête, ` +
    `puis divise : ${hoodMoved} cases sur ${hosts.length} changent de classe. ` +
    `${NAMES[swing.code]} passe de ${fr(swing.from)} à ${fr(swing.to)} pour 1 000, parce que ses ` +
    `${count(inhabitants[swing.code])} habitants sont mis en commun avec les ` +
    `${count(inhabitants[swingNeighbour])} de ${NAMES[swingNeighbour]}, assis à côté ` +
    `de lui DANS LE DESSIN. Un voisinage n'est pas un découpage : les fenêtres se recouvrent, donc ` +
    `il n'y a aucun bloc à contourner ici.`,
);
pool.grains[2].note = plain(
  `Les ${hosts.length} pays sont réunis en ${Object.keys(REGIONS).length} blocs nommés, et chaque ` +
    `bloc divise la somme de ses personnes par la somme de ses habitants : ${regionMoved} cases sur ` +
    `${hosts.length} changent de classe et le contour des blocs apparaît. ` +
    `${widestBlock.name} tombe à ${fr(widestBlock.pooledRate)} quand la moyenne des taux de ses ` +
    `${REGIONS[widestBlock.name].length} membres est ${fr(widestBlock.mean)} : le quotient des ` +
    `sommes n'est pas la moyenne des quotients, et c'est ce que coûte un découpage.`,
);

assertPoolDeclaration(pool, hosts, { where: "web-hex-grid-europe-protection", changeFloor: 4 });

console.log(
  `grains · ${pool.grains
    .map((g) => `${g.label}: ${new Set(classesUnder(g).values()).size} classes`)
    .join(" · ")} · voisinage bouge ${hoodMoved}/${hosts.length}, région ${regionMoved}/${hosts.length}`,
);
console.log(
  `toute l'Europe mise en commun : ${fr(wholeRate)} pour 1 000, moyenne des ${hosts.length} taux : ` +
    `${fr(meanOfRates)}\n`,
);

// ── the block outline, one path per grain ─────────────────────────────────────────────────────
//
// A segment is drawn on every edge that separates two cells this grain does NOT pool together. A
// grain that is a MOVING WINDOW rather than a partition has no such edge set at all — the windows
// overlap — and `poolPartitionOf` says so by returning `null`; it gets an empty path rather than an
// invented boundary, which keeps the element set identical in every state so `opacity` can travel.
const vertexOf = (cx, cy, i) => {
  const a = (Math.PI / 180) * (60 * i - 30);
  return [cx + RADIUS * Math.cos(a), cy + RADIUS * Math.sin(a)];
};
const seams = pool.grains.map((grain) => {
  const partition = poolPartitionOf(grain);
  const slug = poolSlugOf(grain.key);
  if (!partition) return { slug, d: "" };
  const blockOf = (code) => partition.get(code) ?? null;
  const parts = [];
  for (const s of seats) {
    const mine = blockOf(s.code);
    // A block of one cell is the cell itself, and its outline is the ground-coloured stroke the
    // polygon already carries. Drawing it again in ink would be new ink for no new fact.
    if (mine === null || grain.windows.find((w) => w.cell === s.code).with.length < 2) continue;
    const { cx, cy } = centreOf(s);
    for (let edge = 0; edge < 6; edge += 1) {
      const n = neighbourAcross(s, edge);
      if (n && blockOf(n.code) === mine) continue;
      const [x0, y0] = vertexOf(cx, cy, edge);
      const [x1, y1] = vertexOf(cx, cy, edge + 1);
      parts.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
    }
  }
  return { slug, d: parts.join("") };
});
console.log(
  `outlines · ${seams.map((s) => `${s.slug}: ${s.d ? `${s.d.split("M").length - 1} segments` : "none (a window has no boundary)"}`).join(" · ")}\n`,
);

// ── the cells the component draws ─────────────────────────────────────────────────────────────
const cells = seats.map((s) => {
  const { cx, cy } = centreOf(s);
  if (s.code === ORIGIN)
    return {
      code: s.code,
      name: NAMES[s.code],
      cx,
      cy,
      isOrigin: true,
      figures: [{ slug: "origine", text: plain("origine"), klass: 0, isDefault: true }],
      detail: plain(
        `${NAMES[s.code]} · pays d'origine — la carte compte les personnes qui en sont parties, pas ` +
          `celles qui y sont, et aucun regroupement ne l'inclut`,
      ),
    };
  const figures = poolFiguresForMarkup(pool, s.code, (v) => fr(v));
  return {
    code: s.code,
    name: NAMES[s.code],
    cx,
    cy,
    isOrigin: false,
    figures,
    detail: plain(
      `${NAMES[s.code]} · seul ${fr(rate(s.code))} pour 1 000 · avec ses voisines ` +
        `${fr(valueUnder(pool.grains[1], s.code))} · ${regionOf[s.code]} ` +
        `${fr(valueUnder(pool.grains[2], s.code))} · ${count(people[s.code])} personnes pour ` +
        `${count(inhabitants[s.code])} habitants · ` +
        `${byRate.indexOf(s.code) + 1}e par habitant, ${byCount.indexOf(s.code) + 1}e en nombre absolu`,
    ),
  };
});

const facts = beatFacts(
  hosts.map((c) => ({ key: c, label: NAMES[c], value: rate(c) })),
  {
    subject: NAMES[subject],
    declaredSequence: "pour 1 000 habitants",
    units: { count: hosts.length, thing: "un pays" },
    interaction: { controls: 2, readerParameter: true },
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const title = `Par habitant, ce n'est pas l'${NAMES[biggest]} : la ${NAMES[subject]} accueille ${fr(rate(subject))} Ukrainiens pour 1 000 habitants`;
const caveat =
  `Une case par pays d'accueil, toutes de la même taille : la carte abandonne la surface et achète ` +
  `ce qu'un choroplèthe des mêmes données ne peut pas donner — chaque pays également visible. Six ` +
  `voisins, tous par une arête. Ce que la planche fixe a dû trancher pour vous est en dessous : ` +
  `à quelle échelle une case met sa valeur en commun.`;
const claimNote =
  `En nombre absolu l'ordre s'inverse : ${NAMES[biggest]} ${count(people[biggest])} personnes ` +
  `(${byRate.indexOf(biggest) + 1}e par habitant), ${NAMES[subject]} ${count(people[subject])} ` +
  `(1re par habitant). Aucun des deux chiffres n'est le plus vrai — ils répondent à deux questions.`;
const readingLine =
  `Lecture : changez le grain et les mêmes 32 cases, aux mêmes 32 places et sous la même légende, ` +
  `disent autre chose — ${hoodMoved} sur ${hosts.length} changent de classe d'un grain à l'autre. ` +
  `Mise en commun sur toute l'Europe, la protection vaut ${fr(wholeRate)} pour 1 000 quand la ` +
  `moyenne des ${hosts.length} taux vaut ${fr(meanOfRates)}. Survolez, touchez ou tabulez une case ` +
  `pour lire ses trois taux d'un coup, les personnes, la population qui les divise et son rang ` +
  `dans LES DEUX classements.`;
const source = `Source : Eurostat, migr_asytpsm — bénéficiaires de la protection temporaire, ${month} · population 2023, via Our World in Data`;
const alt =
  `Une grille d'hexagones disposés à peu près comme l'Europe, un par pays d'accueil, tous de la ` +
  `même taille et teintés selon le nombre d'Ukrainiens sous protection pour 1 000 habitants. Chaque ` +
  `case porte le code du pays et son taux. Les cases les plus foncées sont en Europe centrale — la ` +
  `${NAMES[subject]} à ${fr(rate(subject))} en tête — tandis que l'${NAMES[biggest]}, la plus ` +
  `grande en nombre absolu, n'est qu'à ${fr(rate(biggest))}. La case de l'${NAMES[ORIGIN]} est ` +
  `neutre : c'est le pays d'origine. Un choix sous le titre change l'échelle à laquelle une case ` +
  `met sa valeur en commun — le pays seul, le pays avec ses voisines, ou le bloc régional — et ` +
  `${hoodMoved} cases sur ${hosts.length} changent de classe sans qu'aucune ne bouge : ` +
  `${NAMES[swing.code]} passe de ${fr(swing.from)} à ${fr(swing.to)}.`;

const interaction = {
  earns: plain(
    `Une planche fixe doit choisir l'échelle à laquelle elle met les cases en commun, l'imprimer ` +
      `dans le chapô et demander qu'on lui fasse confiance ; une vidéo ou un scrolly ne peuvent ` +
      `jouer les trois grains que dans l'ordre de l'auteur, une seule fois. Ici le lecteur tient le ` +
      `grain, fait l'aller-retour autant qu'il veut sur une grille dont aucune case ne bouge et ` +
      `sous une légende qui ne change pas, et chaque case répond avec ses trois taux à la fois — ce ` +
      `qu'aucune image fixe ne peut dire, puisqu'elle n'a qu'un grain.`,
  ),
  controls: [
    {
      question: plain("Ce taux-là, il est calculé sur quoi au juste ?"),
      gesture: "toggle-a-comparison",
      changes: plain(
        `chaque case garde sa place et son code, et change de teinte et de chiffre : le taux est ` +
          `recalculé sur le pays seul, sur le pays plus ses voisines par une arête, ou sur son bloc ` +
          `régional — et au grain régional le contour des blocs apparaît par-dessus les cases.`,
      ),
    },
    {
      question: plain("Cette case-là, c'est qui, et combien fait-elle aux trois grains ?"),
      gesture: "ask-a-mark",
      changes: plain(
        `la case elle-même s'assombrit depuis son propre remplissage et répond avec le pays, ses ` +
          `trois taux d'un coup, les personnes, la population qui les divise et son rang dans les ` +
          `deux classements.`,
      ),
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${classes.map((c) => c.label).join(" ")} ${NAMES[ORIGIN]} origine ${seats.map((s) => s.code).join(" ")}`,
  annot: `${claimNote} ${pool.label} ${pool.grains.map((g) => `${g.label} ${g.announce} ${g.note ?? ""}`).join(" ")}`,
  value: cells.flatMap((c) => c.figures.map((f) => f.text)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

// ── NO MAGNITUDE THIS PAGE PRINTS MAY ROUND TO NOTHING ────────────────────────────────────────
//
// Found by looking, not by reasoning: hovering Iceland answered *"4 800 personnes pour 0 millions
// d'habitants"*. Its 393 396 inhabitants had been divided by a million and rounded, and on the one
// country small enough for that to matter the sentence told the reader the denominator was zero —
// on a page whose whole subject is that the denominator is what changes. The divisions are gone and
// the populations are printed as they are frozen; this refuses the next one rather than trusting
// that it will be noticed. A scale word next to a zero is the shape of the defect, so that is what
// is searched for, in every string the reader can actually read.
const ROUNDED_TO_NOTHING = /\b0\s+(millions?|milliers?|milliards?)\b/;
const spokenWords = [
  title, caveat, claimNote, readingLine, alt, pool.label,
  ...pool.grains.flatMap((g) => [g.label, g.announce, g.note ?? ""]),
  ...cells.flatMap((c) => [c.detail, ...c.figures.map((f) => f.text)]),
];
for (const said of spokenWords) {
  const hit = ROUNDED_TO_NOTHING.exec(said);
  if (hit)
    throw new Error(
      `a sentence this page says out loud reads ${JSON.stringify(hit[0])}: ` +
        `${JSON.stringify(said.slice(Math.max(0, hit.index - 60), hit.index + 60))}. A quantity ` +
        `divided into a scale it is smaller than prints as none, and a reader is told a real ` +
        `population is zero. Print the figure at a scale it survives, never at a smaller size.`,
    );
}

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const name = `${id}.html`;
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    const { outPath } = await renderWeb({
      component: DirectedHexGridWeb,
      props: {
        cells,
        pool,
        seams,
        classes,
        originLabel: `${NAMES[ORIGIN]} · origine`,
        radius: RADIUS,
        width, height,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    // READ THE WRITTEN PAGE BACK. Several of this vocabulary's refusals can only be made here: a
    // cell drawn with a token no grain generates, a blanket emitted after the rules it is supposed
    // to outrank, and a stylesheet that forgot to emit its own rules at all — the mutation
    // `descend.ts` records, where every attribute stayed perfectly correct and the page shipped
    // every state drawn on top of every other.
    const html = await readFile(outPath, "utf8");
    assertOnePool(html, pool, { where: name });
    // ONE GEOMETRY, AND THEREFORE NOTHING THAT CAN MOVE. The whole gesture rests on the cells being
    // drawn once for every state; a page that had grown a second set of polygons would be a page
    // where a state COULD move one, whatever this beat's arithmetic says.
    const polygons = [...html.matchAll(/<polygon\b[^>]*\spoints="([^"]*)"/g)].map((m) => m[1]);
    if (polygons.length !== cells.length || new Set(polygons).size !== cells.length)
      throw new Error(
        `${name}: the page draws ${polygons.length} polygons at ${new Set(polygons).size} distinct ` +
          `geometries for ${cells.length} cells. One cell, one polygon, every state — that is the ` +
          `whole reason nothing on this map can move.`,
      );
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, name), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
