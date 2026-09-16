// proof/web-heatmap-coal-share-europe/render-directions-web.mjs
//
// Coal's share of electricity in the twelve most coal-dependent countries of the EU-27 plus the UK,
// 2010-2024, rendered once per FILED DIRECTION into a self-contained interactive page.
//
// What this page proves is the still's own claim — all twelve fell, Poland alone is still above half
// — and what the reader OPERATES is the line that claim was written at. Every run above every line
// is WALKED OUT of the frozen file here, never typed, and so is each line's own sentence: how many
// of the twelve cleared it in 2010, how many still do in 2024, and how many came back above it after
// having dropped below. That last count is the page's own finding and the render throws if the file
// stops supporting it.
//
// Usage:  bun proof/web-heatmap-coal-share-europe/render-directions-web.mjs

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
import { DirectedCoalShareEuropeWeb, FRAME } from "./DirectedCoalShareEuropeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Energie · Union europeenne";

const FIRST_YEAR = 2010;
const LAST_YEAR = 2024;
const ROWS = 12;

/** The claim's own line — the one the title was written at — and the four the reader can move it
 *  to. They are the key's own breaks, so the outline confirms a boundary the ramp only suggests;
 *  1 % is deliberately NOT offered, because its frontier is the 2 % frontier minus a single cell and
 *  `assertCutoffDeclaration` is right to call that one threshold under two names. */
const CLAIM_LINE = 50;
const LINES = [50, 25, 10, 5, 2];
/** The key's six bands, bounded by the same numbers the reader's line can take. */
const BREAKS = [2, 5, 10, 25, 50];
const BIN_LABELS = [
  "moins de 2 %",
  "2 a 5 %",
  "5 a 10 %",
  "10 a 25 %",
  "25 a 50 %",
  "50 % et plus",
];

/** The names as a French reader holds them. The frozen file's own `Entity` values are the join key
 *  and never the label; a missing translation is a stop, not a fallback to English. */
const FR_NAME = {
  Poland: "Pologne",
  Czechia: "Tchequie",
  Greece: "Grece",
  Bulgaria: "Bulgarie",
  Denmark: "Danemark",
  Germany: "Allemagne",
  Romania: "Roumanie",
  Slovenia: "Slovenie",
  "United Kingdom": "Royaume-Uni",
  Netherlands: "Pays-Bas",
  Finland: "Finlande",
  Hungary: "Hongrie",
};

/** The same names carrying their definite article, because a sentence needs one and a label must
 *  not. Two maps rather than a rule: French articles are not derivable from a country's name. */
const FR_THE = {
  Poland: "la Pologne",
  Czechia: "la Tchequie",
  Greece: "la Grece",
  Bulgaria: "la Bulgarie",
  Denmark: "le Danemark",
  Germany: "l'Allemagne",
  Romania: "la Roumanie",
  Slovenia: "la Slovenie",
  "United Kingdom": "le Royaume-Uni",
  Netherlands: "les Pays-Bas",
  Finland: "la Finlande",
  Hungary: "la Hongrie",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const ord = (n) => (n === 1 ? "1er" : `${n}e`);

// ── THE FROZEN FILE, READ FOR ITS OWN EXACT HEADER ────────────────────────────────────────────
// A heatmap has no honest way to draw a hole: at this density a missing cell reads as a low value.
// So a gap is a stop here rather than a note, and the grid is never drawn ragged.
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const iEntity = at("Entity");
const iYear = at("Year");
const iCoal = at("Coal");
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  if (c.length !== header.length) throw new Error(`row has ${c.length} cells, header has ${header.length}: ${line}`);
  const value = Number(c[iCoal]);
  if (!Number.isFinite(value) || value < 0 || value > 100)
    throw new Error(`${c[iEntity]} ${c[iYear]} is ${c[iCoal]}, which is not a share of a whole`);
  return { entity: c[iEntity], year: Number(c[iYear]), value };
});

const years = [];
for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) years.push(y);
const entities = [...new Set(raw.map((r) => r.entity))];
if (entities.length !== ROWS) throw new Error(`the frozen file holds ${entities.length} countries, the grid draws ${ROWS}`);
const untranslated = entities.filter((e) => !FR_NAME[e] || !FR_THE[e]);
if (untranslated.length) throw new Error(`no French name for ${untranslated.join(", ")}`);

const series = entities.map((entity) => {
  const readings = raw.filter((r) => r.entity === entity).sort((a, b) => a.year - b.year);
  if (readings.length !== years.length)
    throw new Error(`${entity} has ${readings.length} readings, the grid needs ${years.length}`);
  readings.forEach((r, i) => {
    if (r.year !== years[i]) throw new Error(`${entity} is missing ${years[i]}`);
  });
  return { entity, name: FR_NAME[entity], values: readings.map((r) => r.value) };
});
// ROWS ARE ORDERED BY THE 2010 SHARE, DESCENDING — the grid's own first column, which is also the
// rule that chose the twelve. A real cluster then reads as a block instead of scattering, and the
// frontier the control draws is legible as a staircase rather than as confetti.
series.sort((a, b) => b.values[0] - a.values[0]);
console.log(`read ${raw.length} rows, ${series.length} countries x ${years.length} years\n`);

// ── THE CLAIMS, COMPUTED AND ASSERTED ─────────────────────────────────────────────────────────
const fell = series.every((s) => s.values.at(-1) < s.values[0]);
if (!fell) throw new Error("the headline says all twelve fell; the frozen file no longer agrees");
const stillOverHalf = series.filter((s) => s.values.at(-1) >= CLAIM_LINE);
if (stillOverHalf.length !== 1)
  throw new Error(
    `the headline names ONE country still above ${CLAIM_LINE} %, the file holds ${stillOverHalf.length}`,
  );
const leader = stillOverHalf[0];
const steepest = series.reduce((a, b) =>
  b.values.at(-1) / b.values[0] < a.values.at(-1) / a.values[0] ? b : a,
);
console.log(
  `all twelve fell · still above ${CLAIM_LINE} %: ${leader.name} ` +
    `(${fr(leader.values[0])} -> ${fr(leader.values.at(-1))}) · steepest relative fall: ` +
    `${steepest.name} (${fr(steepest.values[0])} -> ${fr(steepest.values.at(-1), 1)})`,
);

// ── THE CELLS ─────────────────────────────────────────────────────────────────────────────────
const binOf = (v) => BREAKS.filter((b) => v >= b).length;
/** Every reading's rank among the twelve in its OWN year — a derived reading with no channel on
 *  this plate, baked here so the browser formats nothing. */
const rankAt = years.map((_, c) => {
  const order = series.map((s, r) => ({ r, v: s.values[c] })).sort((a, b) => b.v - a.v);
  const rank = new Map();
  order.forEach((o, i) => rank.set(o.r, i + 1));
  return rank;
});
const cells = series.flatMap((s, r) =>
  s.values.map((value, c) => {
    const delta = value - s.values[0];
    return {
      row: r,
      col: c,
      key: `${s.entity}-${years[c]}`,
      value,
      bin: binOf(value),
      label: c === 0 || c === years.length - 1 ? plain(fr(value)) : null,
      detail: plain(
        `${s.name} · ${years[c]} · ${fr(value)} % de l'electricite · ` +
          `${c === 0 ? "point de depart" : `${delta >= 0 ? "+" : "-"}${fr(Math.abs(delta))} points depuis 2010`} · ` +
          `${ord(rankAt[c].get(r))} sur ${ROWS} cette annee-la`,
      ),
    };
  }),
);

// ── THE CONTROL: THE LINE, AND THE FRONTIER EACH ONE DRAWS ────────────────────────────────────
// A run is a maximal block of consecutive years a country spends at or above the line. The set of
// runs at a line IS that line's region, one span per run, in the geometry's own units — never in
// CSS pixels, because this `<svg>` carries `preserveAspectRatio="none"` and a reader-pixel span
// would slide off the cells it names the moment the page is resized.
const CELL_W = FRAME.width / years.length;
const CELL_H = FRAME.height / ROWS;
function runsAt(values, line) {
  const runs = [];
  let start = -1;
  values.forEach((v, i) => {
    if (v >= line && start < 0) start = i;
    if (v < line && start >= 0) {
      runs.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start, values.length - 1]);
  return runs;
}
function frontierAt(line) {
  const spans = [];
  let above2010 = 0;
  let above2024 = 0;
  const returned = [];
  series.forEach((s, r) => {
    const runs = runsAt(s.values, line);
    if (s.values[0] >= line) above2010++;
    if (s.values.at(-1) >= line) above2024++;
    // A country "comes back" when it clears the line in a block that is not the one it started in:
    // more than one run, or a first run that does not begin in 2010.
    if (runs.length > 1 || (runs.length === 1 && runs[0][0] > 0)) returned.push(s.name);
    for (const [a, b] of runs)
      spans.push({ x: a * CELL_W, y: r * CELL_H, width: (b - a + 1) * CELL_W, height: CELL_H });
  });
  return { spans, above2010, above2024, returned };
}
const frontiers = new Map(LINES.map((line) => [line, frontierAt(line)]));
for (const line of LINES) {
  const f = frontiers.get(line);
  console.log(
    `line ${line} % · ${f.above2010} above in 2010, ${f.above2024} in 2024 · ` +
      `${f.returned.length} came back: ${f.returned.join(", ") || "(none)"} · ${f.spans.length} runs`,
  );
}
// THE PAGE'S OWN SECOND READING, asserted rather than written. It is a statement about five states
// at once — the returns thin out as the line drops and vanish at 5 % — and it is the sentence the
// control exists to make findable, so it is refused here if the file stops supporting it.
const CLEAN_LINE = 5;
if (frontiers.get(CLEAN_LINE).returned.length !== 0)
  throw new Error(
    `the reading says NO country comes back above ${CLEAN_LINE} %; the frozen file now holds ` +
      `${frontiers.get(CLEAN_LINE).returned.join(", ")}`,
  );
const noisiest = LINES.filter((l) => frontiers.get(l).returned.length > 0);
if (noisiest.length < 2)
  throw new Error("the reading says the returns are the pattern at the higher lines; only one line has any");

const sentence = (line) => {
  const f = frontiers.get(line);
  const back =
    f.returned.length === 0
      ? "aucun pays ne la repasse apres l'avoir quittee : sous cette ligne, le recul est definitif"
      : `${f.returned.length} ${f.returned.length > 1 ? "pays la repassent" : "pays la repasse"} ` +
        `apres l'avoir quittee (${f.returned.join(", ")})`;
  return plain(`Ligne ${line} % · ${f.above2010} pays sur ${ROWS} au-dessus en 2010, ${f.above2024} en 2024 · ${back}`);
};
const cutoff = {
  label: "La ligne :",
  claim: {
    label: `${CLAIM_LINE} %`,
    announce:
      `${CLAIM_LINE} % — la ligne du titre : ${frontiers.get(CLAIM_LINE).above2010} pays au-dessus ` +
      `en 2010, ${FR_THE[leader.entity]} seule en 2024`,
    spans: frontiers.get(CLAIM_LINE).spans,
  },
  options: LINES.filter((l) => l !== CLAIM_LINE).map((line) => {
    const f = frontiers.get(line);
    return {
      key: String(line),
      label: `${line} %`,
      announce: `${line} % — ${f.above2010} pays au-dessus en 2010, ${f.above2024} en 2024`,
      note: sentence(line),
      spans: f.spans,
    };
  }),
};

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
const interaction = {
  earns:
    "Une plaque fixe n'imprime que deux colonnes de chiffres sur quinze, et la ligne qui definit " +
    "son titre a ete choisie par son auteur. Ici le lecteur deplace cette ligne, et ce qu'il " +
    "trouve n'est dans aucune des cinq images prise seule : a 50 %, a 25 % et a 10 % des pays " +
    "repassent au-dessus apres l'avoir quittee, a 5 % plus aucun. Le charbon n'a pas glisse, il " +
    "est revenu — un fait qui ne vit que dans la difference entre les etats.",
  controls: [
    {
      question:
        "Plus de la moitie, d'accord — mais c'est qui qui a choisi la moitie ? Si la ligne etait " +
        "a 10 %, est-ce que le charbon europeen raconte encore la meme histoire ?",
      gesture: "toggle-a-comparison",
      changes:
        "Le trait quitte les quatre blocs de la ligne des 50 % et se retrace autour de toutes les " +
        "cases encore au-dessus de la ligne choisie, ou qu'elles soient dans la grille. Son bord " +
        "droit est l'annee ou chaque pays est passe dessous, et ses trous sont les retours. Une " +
        "phrase donne le compte en 2010, le compte en 2024 et le nom des pays revenus. Les " +
        "couleurs, l'echelle et les valeurs imprimees ne bougent pas.",
    },
    {
      question:
        "Cette case-la, elle valait combien exactement ? Et c'etait beaucoup pour l'annee, ou " +
        "beaucoup pour ce pays ?",
      gesture: "ask-a-mark",
      changes:
        `La case repond avec son pays, son annee, sa part au dixieme, son ecart en points depuis ` +
        `son propre 2010 et son rang sur les ${ROWS} pays cette annee-la — les deux lectures qu'un ` +
        `palier de couleur detruit par construction, sur les ${cells.length} cases et pas ` +
        `seulement sur les ${series.length * 2} qui impriment leur chiffre.`,
    },
  ],
};

const facts = beatFacts(
  series.map((s) => ({ key: s.entity, label: s.name, value: s.values.at(-1) })),
  { subject: leader.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`\ntreatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── THE WORDS ─────────────────────────────────────────────────────────────────────────────────
const title = plain(
  `Le charbon a recule dans les douze, et ${FR_THE[leader.entity]} est le seul pays ou il fait encore plus de la moitie de l'electricite`,
);
const caveat = plain(
  `Une case par pays et par annee : la part du charbon dans l'electricite. Les douze pays sont ceux ` +
    `de l'UE-27 plus le Royaume-Uni ou le charbon en produisait le plus en 2010 — une grille sur le ` +
    `recul du charbon, pas un portrait de l'Europe. Seules les deux annees du titre impriment leur ` +
    `chiffre ; les paliers de la legende bornent les autres.`,
);
const readingLine = plain(
  `Lecture : deplacez la ligne — le trait se retrace autour des cases encore au-dessus, et son bord ` +
    `droit est l'annee du passage. De ${CLAIM_LINE} % a 10 % des pays y reviennent apres l'avoir ` +
    `quittee ; a ${CLEAN_LINE} % aucun. Survolez ou tabulez une case pour sa part exacte.`,
);
const source = plain(
  `Source : Ember via Our World in Data, part du charbon dans la production d'electricite, ` +
    `${FIRST_YEAR}-${LAST_YEAR} · donnees gelees le 9 aout 2026`,
);
const alt = plain(
  `Une grille de ${cells.length} cases, douze pays en lignes et quinze annees en colonnes, chaque ` +
    `case teintee selon la part du charbon dans l'electricite. Les lignes sont classees par la part ` +
    `de 2010, de ${FR_THE[leader.entity]} en haut (${fr(leader.values[0])} %) a la Hongrie en bas. Toutes ` +
    `palissent de gauche a droite : ${FR_THE[steepest.entity]} passe de ${fr(steepest.values[0])} % a ` +
    `${fr(steepest.values.at(-1))} %, et seule ${FR_THE[leader.entity]} reste au-dessus de la moitie en ` +
    `${LAST_YEAR} (${fr(leader.values.at(-1))} %). Un trait entoure les cases encore au-dessus de la ` +
    `ligne choisie par le lecteur ; a ${CLAIM_LINE} % il tient les quinze annees de ` +
    `${FR_THE[leader.entity]}, deux blocs de la Tchequie, deux de la Grece et la seule annee 2011 de la Bulgarie.`,
);

const controlWords = [
  cutoff.label,
  cutoff.claim.label,
  cutoff.claim.announce,
  ...cutoff.options.flatMap((o) => [o.label, o.announce, o.note]),
].join(" ");

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${BIN_LABELS.join(" ")} ${controlWords}`,
  axis: `${years.join(" ")} ${series.map((s) => s.name).join(" ")} ${BIN_LABELS.join(" ")}`,
  annot: "",
  value: cells.map((c) => c.detail).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
// Six ramp bands plus the frontier's own cased line: the ink has to separate more than a mark from
// a ground here, so the composition is asked for three levels of evidence rather than two.
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const name = `${id}.html`;
  try {
    await renderWeb({
      component: DirectedCoalShareEuropeWeb,
      props: {
        cells,
        rowLabels: series.map((s) => s.name),
        colLabels: years.map((y) => ({ text: String(y), strong: y === FIRST_YEAR || y === LAST_YEAR })),
        bins: BIN_LABELS.map((label) => ({ label })),
        cutoff,
        interaction,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        reading: readingLine,
        alt,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // AND THE REFUSED DIRECTION'S PREVIOUS RENDER COMES OFF THE DISK. A page that was refused and
    // whose last good render is still sitting there is a page that looks produced to everything
    // downstream — the verifier, a capture, a reader.
    rmSync(join(OUT, name), { force: true });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE.
  process.exitCode = 1;
}
console.log(`\nframe ${FRAME.width} x ${FRAME.height}`);
