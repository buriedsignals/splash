// twin/proof/web-diverging-stacked-electricity/render-directions-web.mjs
//
// Six countries' 2024 electricity mix laid on a FIVE-BARREAU ORDERED SCALE and leaned about a fixed
// centre, rendered once per FILED DIRECTION into a self-contained interactive page.
//
// THE CUT IS THE THING THE READER OPERATES. Where the boundary between the two camps falls is a
// judgement, not a reading — the renewable directive counts biomass and not nuclear, the climate
// taxonomy counts nuclear, carbon accounting looks at what leaves the stack — and every row's
// apparent balance hangs on it. Four positions, one table of shares, nothing added or removed.
//
// Usage:  bun proof/web-diverging-stacked-electricity/render-directions-web.mjs

import { existsSync, readdirSync, rmSync } from "node:fs";
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
import { assertOneCut } from "../../skills/chart-web/assets/side.ts";
import { DirectedDivergingStackedWeb } from "./DirectedDivergingStackedWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SUBJECT = "FRA";

// ── THE LADDER ────────────────────────────────────────────────────────────────────────────────────
// Ordered by RENEWABILITY — the axis the European target is written in — with combustion breaking
// the tie among the non-renewables. Coal and oil are finite and the most carbon-intensive; gas is
// finite and roughly half as intensive; nuclear is the last non-renewable rung and the first that
// emits nothing at the stack; biomass is the first RENEWABLE rung and the last that is burned; wind,
// solar and hydro are renewable and burn nothing. The order is fixed and no cut may change it — a
// cut that re-ordered the scale would be redrawing the chart rather than moving the boundary.
const LEVELS = [
  { key: "charbon-petrole", label: "charbon et pétrole", cols: ["Coal", "Oil"] },
  { key: "gaz", label: "gaz", cols: ["Gas"] },
  { key: "nucleaire", label: "nucléaire", cols: ["Nuclear"] },
  { key: "biomasse", label: "biomasse", cols: ["Bioenergy"] },
  {
    key: "renouvelables",
    label: "éolien, solaire, hydraulique",
    cols: ["Wind", "Solar", "Hydropower", "Other renewables"],
  },
];
const COLUMNS = LEVELS.flatMap((level) => level.cols);

// ALPHABETICAL, AND IT IS A DECISION. `types/diverging-stacked-bar.md`: "rows keep their own natural
// order — by question number, by topic — never re-sorted by result, because the point is comparing
// many items' splits against each other in a fixed, referenceable order." Under a movable boundary
// that rule stops being a style note and becomes structural: a result order would re-sort itself at
// every click, six labels would rearrange under the reader's hand — the owner's first arbitration —
// and `interaction.mjs`, which resolves a pointer from coordinates read once at init, would answer
// for whichever country landed in the slot.
const NAMES = {
  DEU: "Allemagne",
  FRA: "France",
  NOR: "Norvège",
  POL: "Pologne",
  SWE: "Suède",
  CHE: "Suisse",
};
const CODES = Object.keys(NAMES);
const FR_SOURCE = {
  Coal: "charbon",
  Oil: "pétrole",
  Gas: "gaz",
  Nuclear: "nucléaire",
  Hydropower: "hydraulique",
  Wind: "éolien",
  Solar: "solaire",
  Bioenergy: "biomasse",
  "Other renewables": "autres renouvelables",
};

// EVERY STRING THAT REACHES THE LADDER PASSES THROUGH `plain`. One U+202F or U+00A0 — the spaces
// `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses every family
// on the sans ladder and takes all three renders down with a message that names the code point and
// not the string. And no arrow glyph: neither font census reads one, and it is in no house family.
const plain = (text) => plainSpaces(text);
const fr = (value, digits = 1) =>
  plain(value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const signed = (value) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${fr(Math.abs(value))}`;

// ── THE FROZEN FILE ───────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`the frozen file has no ${name} column`);
  return index;
};
const raw = csv.slice(1).map((line) => {
  const cells = line.split(",");
  const row = { code: cells[at("Code")], year: Number(cells[at("Year")]) };
  for (const column of COLUMNS) row[column] = Number(cells[at(column)]);
  return row;
});

// ONE TABLE OF SHARES, read once and handed to every cut. `side.ts` gives a cut no place to declare
// its own, which is how "a cut may not resize a barreau" is guaranteed rather than checked.
const shares = [];
const shareOf = new Map();
const columnShare = new Map();
for (const code of CODES) {
  const row = raw.find((entry) => entry.code === code && entry.year === YEAR);
  if (!row) throw new Error(`${NAMES[code]} has no ${YEAR} row in the frozen file`);
  const total = COLUMNS.reduce((sum, column) => sum + row[column], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  for (const column of COLUMNS) columnShare.set(`${code}:${column}`, (row[column] / total) * 100);
  for (const level of LEVELS) {
    const share = level.cols.reduce((sum, column) => sum + (row[column] / total) * 100, 0);
    shares.push({ row: code, level: level.key, share });
    shareOf.set(`${code}:${level.key}`, share);
  }
}

// ── THE FOUR POSITIONS OF THE BOUNDARY ────────────────────────────────────────────────────────────
// Each is a position somebody actually holds, and each is a CONTIGUOUS cut of the one scale above.
// `left` counts the barreaux falling left; `straddle` names the barreau drawn across the centre.
const CUTS = [
  {
    key: "straddle",
    label: "le nucléaire à cheval",
    left: 2,
    straddle: "nucleaire",
    sides: { left: "fossile", right: "renouvelable" },
    camps: "À gauche le fossile, au centre le nucléaire à cheval, à droite le renouvelable.",
  },
  {
    key: "fossile",
    label: "ce qui n'est pas fossile",
    left: 2,
    straddle: null,
    sides: { left: "combustibles fossiles", right: "tout le reste" },
    camps: "À gauche les combustibles fossiles, à droite tout le reste.",
  },
  {
    key: "renouvelable",
    label: "ce qui est renouvelable",
    left: 3,
    straddle: null,
    sides: { left: "non renouvelable", right: "renouvelable" },
    camps:
      "À gauche ce qui n'est pas renouvelable, nucléaire compris ; à droite le renouvelable au " +
      "sens de la directive.",
  },
  {
    key: "non-brule",
    label: "éolien, solaire et hydraulique seuls",
    left: 4,
    straddle: null,
    sides: { left: "le reste", right: "éolien, solaire, hydraulique" },
    camps: "À gauche tout le reste, à droite l'éolien, le solaire et l'hydraulique seuls.",
  },
];

/** The lean of one row under one cut, derived from the one table. The same arithmetic `side.ts`
 *  re-runs against what is declared here — two readings of one arithmetic is the point. */
const leanOf = (cut, code) => {
  let left = 0;
  let right = 0;
  LEVELS.forEach((level, index) => {
    const value = shareOf.get(`${code}:${level.key}`);
    if (cut.straddle === level.key) {
      left += value / 2;
      right += value / 2;
    } else if (index < cut.left) left += value;
    else right += value;
  });
  return { row: code, left, right, net: right - left };
};

const leans = new Map();
for (const cut of CUTS) leans.set(cut.key, new Map(CODES.map((code) => [code, leanOf(cut, code)])));
const net = (cutKey, code) => leans.get(cutKey).get(code).net;
const deepestLeft = (cutKey) =>
  [...CODES].sort((a, b) => net(cutKey, a) - net(cutKey, b))[0];
const furthestRight = (cutKey) =>
  [...CODES].sort((a, b) => net(cutKey, b) - net(cutKey, a))[0];

// ── THE CLAIMS, ASSERTED BEFORE ANYTHING IS DRAWN ─────────────────────────────────────────────────
// 1. The static sibling's claim, which is the DEFAULT picture and the one a reader with no script
//    never leaves: the subject's centre band is larger than both its wings together.
const subjectNuclear = shareOf.get(`${SUBJECT}:nucleaire`);
const subjectWings =
  shareOf.get(`${SUBJECT}:charbon-petrole`) +
  shareOf.get(`${SUBJECT}:gaz`) +
  shareOf.get(`${SUBJECT}:biomasse`) +
  shareOf.get(`${SUBJECT}:renouvelables`);
if (!(subjectNuclear > subjectWings))
  throw new Error(
    `the default plate says the subject's centre band is larger than both its wings together; ` +
      `${fr(subjectNuclear)} against ${fr(subjectWings)}`,
  );
// 2. The page's reason to exist: the subject CHANGES SIDE as the boundary moves.
if (!(net("fossile", SUBJECT) > 0 && net("renouvelable", SUBJECT) < 0))
  throw new Error(
    `the page claims the subject crosses the centre between two cuts; it leans ` +
      `${signed(net("fossile", SUBJECT))} under "ce qui n'est pas fossile" and ` +
      `${signed(net("renouvelable", SUBJECT))} under "ce qui est renouvelable"`,
  );
// 3. And the finding the revealed sentence prints: under the renewable reading the subject leans
//    further left than the country that burns coal for most of its electricity.
if (deepestLeft("renouvelable") !== SUBJECT)
  throw new Error(
    `the page claims the subject leans furthest left under the renewable reading; ` +
      `${NAMES[deepestLeft("renouvelable")]} does`,
  );
const swing = net("fossile", SUBJECT) - net("renouvelable", SUBJECT);

console.log(
  `${CODES.length} pays en ${YEAR} · ${NAMES[SUBJECT]} : nucléaire ${fr(subjectNuclear)} % contre ` +
    `${fr(subjectWings)} % pour les quatre autres barreaux réunis · bascule de ` +
    `${signed(net("fossile", SUBJECT))} à ${signed(net("renouvelable", SUBJECT))}, soit ` +
    `${fr(swing)} points, sans qu'un chiffre change\n`,
);
console.table(
  CODES.map((code) => ({
    pays: NAMES[code],
    ...Object.fromEntries(CUTS.map((cut) => [cut.key, signed(net(cut.key, code))])),
  })),
);
console.log("");

// ── THE SENTENCES THE CONTROL OWES ────────────────────────────────────────────────────────────────
// Every figure is read off the tables above rather than typed, so a note and the bands it describes
// cannot drift apart.
const NOTES = {
  fossile:
    `Si la coupure ne sépare que les combustibles fossiles du reste, la ${NAMES[SUBJECT]} monte à ` +
    `${signed(net("fossile", SUBJECT))} points — mais trois pays la devancent encore : ` +
    `${NAMES["SWE"]} ${signed(net("fossile", "SWE"))}, ${NAMES["NOR"]} ` +
    `${signed(net("fossile", "NOR"))}, ${NAMES["CHE"]} ${signed(net("fossile", "CHE"))}. Compter le ` +
    `nucléaire comme le solaire ne met pas la ${NAMES[SUBJECT]} en tête.`,
  renouvelable:
    `Au sens de la directive européenne, le nucléaire n'est pas renouvelable : la ${NAMES[SUBJECT]} ` +
    `bascule à ${signed(net("renouvelable", SUBJECT))} points et devient le pays des ` +
    `${CODES.length} qui penche LE PLUS à gauche — devant la ${NAMES["POL"]} ` +
    `(${signed(net("renouvelable", "POL"))}), dont ` +
    `${fr(shareOf.get("POL:charbon-petrole"))} % du courant vient du charbon et du pétrole. Pas un ` +
    `chiffre n'a changé : c'est la définition qui a bougé.`,
  "non-brule":
    `Si l'on retire aussi la biomasse, renouvelable par la loi mais brûlée, l'${NAMES["DEU"]} ` +
    `traverse le centre à son tour : ${signed(net("non-brule", "DEU"))} après ` +
    `${signed(net("renouvelable", "DEU"))}. Ses ${fr(shareOf.get("DEU:biomasse"))} % de biomasse ` +
    `faisaient à eux seuls la différence.`,
};

// ── THE DECLARATION ───────────────────────────────────────────────────────────────────────────────
const side = {
  label: "La coupure",
  axisMax: 100,
  levels: LEVELS.map((level) => ({ key: level.key, label: plain(level.label) })),
  rows: CODES,
  shares,
  cuts: CUTS.map((cut, index) => {
    const note = index === 0 ? undefined : NOTES[cut.key];
    const leftMost = deepestLeft(cut.key);
    const rightMost = furthestRight(cut.key);
    return {
      key: cut.key,
      label: plain(cut.label),
      announce: plain(
        `${cut.label} — ${NAMES[leftMost]} penche ${signed(net(cut.key, leftMost))} points, ` +
          `${NAMES[rightMost]} ${signed(net(cut.key, rightMost))}`,
      ),
      ...(note ? { note: plain(note) } : {}),
      left: cut.left,
      straddle: cut.straddle,
      sides: { left: plain(cut.sides.left), right: plain(cut.sides.right) },
      leans: CODES.map((code) => leans.get(cut.key).get(code)),
    };
  }),
};

// ── WHAT THE POINTER ANSWERS, AND WHAT THE GUTTERS PRINT ──────────────────────────────────────────
// A band's answer names the country, the barreau, its share, WHAT IS INSIDE IT (three bands is three
// numbers; the mix they summarise is nine), which camp this cut puts it in, and where that leaves
// the row. Every figure is derived here; the browser formats nothing.
const CAMP_WORD = { left: "à gauche", right: "à droite", centre: "à cheval sur le centre" };
const details = {};
const totals = {};
const camps = {};
for (const cut of CUTS) {
  camps[cut.key] = plain(cut.camps);
  for (const code of CODES) {
    const lean = leans.get(cut.key).get(code);
    totals[`${cut.key}:${code}`] = {
      left: plain(`${fr(lean.left)} %`),
      right: plain(`${fr(lean.right)} %`),
    };
    LEVELS.forEach((level, index) => {
      const share = shareOf.get(`${code}:${level.key}`);
      if (!(share > 0)) return;
      const where =
        cut.straddle === level.key ? "centre" : index < cut.left ? "left" : "right";
      const inside =
        level.cols.length > 1
          ? ` · ${level.cols
              .map((column) => ({ name: FR_SOURCE[column], pct: columnShare.get(`${code}:${column}`) }))
              .filter((part) => part.pct >= 0.5)
              .sort((a, b) => b.pct - a.pct)
              .map((part) => `${part.name} ${fr(part.pct)} %`)
              .join(", ")}`
          : "";
      details[`${cut.key}:${code}:${level.key}`] = plain(
        `${NAMES[code]} · ${level.label} · ${fr(share)} % du mix${inside} · ${CAMP_WORD[where]} ` +
          `sous cette coupure · le pays penche ${signed(lean.net)} points`,
      );
    });
  }
}

const facts = beatFacts(
  CODES.map((code) => ({
    key: code,
    label: NAMES[code],
    value: shareOf.get(`${code}:renouvelables`),
  })),
  { subject: NAMES[SUBJECT], declaredSequence: "%" },
);
console.log(`treatments applicable: ${applicableTreatments(facts).map((t) => t.id).join(", ") || "(none)"}\n`);

// ── THE WORDS ─────────────────────────────────────────────────────────────────────────────────────
const title = `Le nucléaire décide seul de quel côté penche la France`;
const caveat =
  `Part du courant de chaque pays en ${YEAR}, sur une échelle ordonnée à cinq barreaux. La ` +
  `${NAMES[SUBJECT]} en tire ${fr(subjectNuclear)} % du nucléaire, contre ` +
  `${fr(shareOf.get(`${SUBJECT}:charbon-petrole`) + shareOf.get(`${SUBJECT}:gaz`))} % de fossile. ` +
  `Les cinq barreaux font 100 % sous chacune des quatre coupures.`;
const readingLine =
  `Lecture : déplacez la coupure. Rien n'est ajouté ni retiré — chaque barreau garde sa part et ` +
  `change de côté, et la ${NAMES[SUBJECT]} passe de ${signed(net("fossile", SUBJECT))} à ` +
  `${signed(net("renouvelable", SUBJECT))} points. Survolez ou tabulez une bande pour son contenu.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;
const netLegend = "le net de chaque pays";
const xTicks = [-100, -50, 0, 50, 100];
const alt =
  `Six barres horizontales, une par pays, dans l'ordre alphabétique, penchées de part et d'autre ` +
  `d'une ligne centrale fixe. Chaque barre empile cinq barreaux ordonnés : charbon et pétrole, gaz, ` +
  `nucléaire, biomasse, puis éolien, solaire et hydraulique. Par défaut le fossile part à gauche, le ` +
  `renouvelable à droite et le nucléaire est à cheval sur le centre : la ${NAMES[SUBJECT]} a une ` +
  `bande centrale de ${fr(subjectNuclear)} %, plus large que ses quatre autres barreaux réunis. Un ` +
  `contrôle déplace la coupure entre les deux camps sans rien changer aux parts : si le nucléaire ` +
  `compte comme non renouvelable, la ${NAMES[SUBJECT]} passe de ` +
  `${signed(net("fossile", SUBJECT))} à ${signed(net("renouvelable", SUBJECT))} points et devient le ` +
  `pays qui penche le plus à gauche des six, devant la ${NAMES["POL"]} ` +
  `(${signed(net("renouvelable", "POL"))}).`;

// ── THE PLAN, WRITTEN IN `BRIEF.md` BEFORE THE CODE AND CARRIED INTO THE RENDER ───────────────────
const interaction = {
  earns: plain(
    `Le lecteur déplace la coupure entre les deux camps et voit la ${NAMES[SUBJECT]} passer de ` +
      `${signed(net("fossile", SUBJECT))} à ${signed(net("renouvelable", SUBJECT))} points sans ` +
      `qu'un seul chiffre change — un still doit choisir une définition et demander qu'on lui fasse ` +
      `confiance, une vidéo et un scrolly choisissent en plus l'ordre dans lequel on les voit, qui ` +
      `est l'argument de quelqu'un.`,
  ),
  controls: [
    {
      question: "Et si on comptait autrement ?",
      gesture: "toggle-a-comparison",
      changes: plain(
        "Chaque barreau garde sa taille et change de camp : les bandes traversent le centre, les " +
          "deux totaux de côté se réécrivent dans les gouttières, le repère de net glisse jusqu'à " +
          "sa nouvelle position et une phrase nomme ce que la nouvelle coupure renverse.",
      ),
    },
    {
      question: "Qu'est-ce qu'il y a dans cette bande ?",
      gesture: "ask-a-mark",
      changes: plain(
        "La bande pointée s'assombrit depuis son propre remplissage et répond avec le pays, le " +
          "barreau, sa part, les sources qui le composent et le camp où cette coupure le range.",
      ),
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis:
    `${xTicks.map((tick) => Math.abs(tick)).join(" ")} % ` +
    `${CODES.map((code) => NAMES[code]).join(" ")} ` +
    `${LEVELS.map((level) => level.label).join(" ")} ${netLegend} ` +
    `${Object.values(camps).join(" ")} ${side.label} ` +
    `${side.cuts.map((cut) => cut.label).join(" ")}`,
  annot:
    `${side.cuts.map((cut) => `${cut.announce} ${cut.note ?? ""}`).join(" ")} ` +
    `${Object.values(details).join(" ")} ${alt}`,
  value: Object.values(totals)
    .map((pair) => `${pair.left} ${pair.right}`)
    .join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS)
  .filter((file) => file.endsWith(".md"))
  .map((file) => readDirection(join(DIRECTIONS, file)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 5 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const outPath = join(OUT, `${id}.html`);
  try {
    await renderWeb({
      component: DirectedDivergingStackedWeb,
      props: {
        side,
        rows: CODES.map((code) => ({ key: code, name: NAMES[code] })),
        subject: SUBJECT,
        details,
        totals,
        camps,
        xTicks,
        netLegend,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        reading: readingLine,
        alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // The three refusals only the WRITTEN page can carry: a half-tagged band, a vocabulary that
    // emitted no rules at all, and a blanket hide that landed after the default plate's own reveal.
    assertOneCut(await readFile(outPath, "utf8"), side, id);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // A REFUSED PAGE MUST NOT LOOK LIKE A PRODUCED ONE. The previous render of this direction is
    // taken off the disk rather than left there to be mistaken for this run's.
    if (existsSync(outPath)) rmSync(outPath);
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that catches a refusal and exits 0 makes a refused page look like a produced one.
  process.exitCode = 1;
}
