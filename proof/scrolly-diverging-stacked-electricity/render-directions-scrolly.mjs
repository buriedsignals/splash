// Six electricity mixes in 2024, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `diverging stacked bar` type in the scrolly format.
//
// THE SUBJECT OF `static-diverging-stacked-electricity`, CHOREOGRAPHED. The classification (fossil, nuclear,
// renewables), the shares, the claim and its assertions are the static beat's own; the scroll tells them with
// its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. six plain 100 % bars, aligned left;
//   2. each slides until its nuclear straddles the axis: the lean appears;
//   3. the fossil camp alone, its totals, Poland leading;
//   4. the renewable camp alone, Norway leading;
//   5. France: fossil and renewables laid end to end under its nuclear;
//   6. the pull back.
//
// Usage:  bun proof/scrolly-diverging-stacked-electricity/render-directions-scrolly.mjs

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
import { DirectedDivergingStackScrolly } from "./DirectedDivergingStackScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";

/** Ordered OUTWARD from the centre, which is what each ramp encodes. */
const FOSSIL = [
  { column: "Gas", label: "gaz" },
  { column: "Oil", label: "pétrole" },
  { column: "Coal", label: "charbon" },
];
const RENEWABLE = [
  { column: "Bioenergy", label: "bioénergie" },
  { column: "Other renewables", label: "autres" },
  { column: "Hydropower", label: "hydraulique" },
  { column: "Solar", label: "solaire" },
  { column: "Wind", label: "éolien" },
];
const CENTRE = { column: "Nuclear", label: "nucléaire" };
const FRENCH = {
  France: ["FRA", "France", "la France"], Germany: ["DEU", "Allemagne", "l’Allemagne"], Norway: ["NOR", "Norvège", "la Norvège"],
  Poland: ["POL", "Pologne", "la Pologne"], Sweden: ["SWE", "Suède", "la Suède"], Switzerland: ["CHE", "Suisse", "la Suisse"],
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const [code, name, withArticle] = FRENCH[entity];
  return { code, name, withArticle };
};

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const sources = header.slice(3);
const classified = [...FOSSIL, ...RENEWABLE, CENTRE].map((s) => s.column);
const missing = sources.filter((c) => !classified.includes(c));
if (missing.length) throw new Error(`unclassified source(s): ${missing.join(", ")}`);

const rows = csv
  .slice(1)
  .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => Number(r.Year) === YEAR)
  .map((r) => {
    const total = sources.reduce((sum, c) => sum + Number(r[c]), 0);
    const share = (column) => (Number(r[column]) / total) * 100;
    const { code, name } = french(r.Entity);
    // Drawn left to right: the fossil ramp from its outermost step in, the neutral, the renewable ramp out.
    const segments = [
      ...[...FOSSIL].reverse().map((s) => ({ key: s.column, label: s.label, value: share(s.column), side: "left", step: FOSSIL.indexOf(s) })),
      { key: CENTRE.column, label: CENTRE.label, value: share(CENTRE.column), side: "centre", step: 0 },
      ...RENEWABLE.map((s, i) => ({ key: s.column, label: s.label, value: share(s.column), side: "right", step: i })),
    ];
    const sum = (side) => segments.filter((s) => s.side === side).reduce((a, s) => a + s.value, 0);
    return { entity: r.Entity, code, name, fossil: sum("left"), nuclear: sum("centre"), renewable: sum("right"), segments };
  })
  .sort((a, b) => b.fossil - a.fossil);
if (rows.length !== 6) throw new Error(`the cards speak of six countries; the data has ${rows.length} for ${YEAR}`);
for (const row of rows) {
  const total = row.fossil + row.nuclear + row.renewable;
  if (Math.abs(total - 100) > 1e-9) throw new Error(`${row.entity}: the three groups sum to ${total.toFixed(6)} %, not 100`);
}
const subject = rows.reduce((a, b) => (b.nuclear > a.nuclear ? b : a));
if (subject.nuclear <= subject.fossil + subject.renewable)
  throw new Error(`the headline says the neutral outweighs both sides together in ${subject.entity}; ${subject.nuclear.toFixed(1)} against ${(subject.fossil + subject.renewable).toFixed(1)}`);
const leaningLeft = rows[0];
const leaningRight = rows.reduce((a, b) => (b.renewable > a.renewable ? b : a));
if (leaningRight.nuclear !== 0) throw new Error(`a card says ${leaningRight.entity} has no nuclear at all; it has ${leaningRight.nuclear.toFixed(2)} %`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${one(v)}${NB}%`;
const S = french(subject.entity);
const PL = french(leaningLeft.entity);
const NO = french(leaningRight.entity);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const sides = subject.fossil + subject.renewable;

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le nucléaire tient le centre : en ${S.name} il pèse plus que le fossile et le renouvelable réunis`,
  `En ${S.name}, le nucléaire pèse plus que le fossile et le renouvelable réunis`,
  `Le nucléaire tient le centre`,
];
const prose = [
  [`Le mix électrique de six pays européens en ${YEAR}. Chaque rang fait 100${NB}% : le fossile, le nucléaire, puis le renouvelable.`],
  [`Posons le nucléaire à cheval sur l’axe : il n’est ni fossile ni renouvelable. Chaque pays penche alors vers son camp le plus lourd.`],
  [`À gauche, le fossile : gaz, pétrole, charbon. ${cap(PL.withArticle)} penche le plus de ce côté, avec ${pct(leaningLeft.fossil)} de sa production.`],
  [`À droite, le renouvelable. ${cap(NO.withArticle)} y met ${pct(leaningRight.renewable)} de sa production, sans aucun nucléaire.`],
  [`En ${S.name}, le nucléaire fait ${pct(subject.nuclear)} : plus que le fossile (${pct(subject.fossil)}) et le renouvelable (${pct(subject.renewable)}) mis bout à bout, ${pct(sides)}.`],
  [`Lecture : chaque rang fait 100${NB}%. La masse nucléaire est posée à cheval sur l’axe, moitié de chaque côté, donc elle ne fait pencher ni l’un ni l’autre : le penchant se lit au côté le plus long.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `part de la production d’électricité en ${YEAR}, en %`,
  leftNote: `${PL.name}${NB}: ${pct(leaningLeft.fossil)} de fossile`,
  rightNote: `${NO.name}${NB}: ${pct(leaningRight.renewable)} de renouvelable`,
  compareNote: `${S.name}${NB}: ${pct(subject.nuclear)} de nucléaire contre ${pct(sides)}`,
  format: Object.fromEntries(rows.flatMap((r) => [[`${r.code}:fossil`, pct(r.fossil)], [`${r.code}:renewable`, pct(r.renewable)], [`${r.code}:nuclear`, pct(r.nuclear)], [`${r.code}:sides`, pct(r.fossil + r.renewable)]])),
};
const legend = { left: { name: "Fossile", levels: FOSSIL.map((s) => s.label) }, centre: "nucléaire", right: { name: "Renouvelable", levels: RENEWABLE.map((s) => s.label) } };
const L = Math.max(...rows.map((r) => r.fossil + r.nuclear / 2));
const R = Math.max(...rows.map((r) => r.renewable + r.nuclear / 2));
const ticks = { stack: [0, 50, 100], diverging: [-50, 0, 50, 100].filter((t) => t >= -L && t <= R) };
const alt =
  `Barres empilées divergentes : le mix électrique de six pays européens en ${YEAR}, fossile à gauche, renouvelable à droite, ` +
  `nucléaire à cheval sur l’axe. ${cap(S.withArticle)} porte ${one(subject.nuclear)} % de nucléaire, plus que ses ${one(subject.fossil)} % de fossile ` +
  `et ses ${one(subject.renewable)} % de renouvelable réunis ; ${PL.withArticle} penche à gauche avec ${one(leaningLeft.fossil)} % de fossile et ` +
  `${NO.withArticle} à droite avec ${one(leaningRight.renewable)} %.`;

/** One state per card; see `diverging-stack-drive.mjs` for what each field paints. */
const STATES = [
  { centre: 0, left: 0, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 1, right: 0, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 1, compare: 0, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 1, all: 0 },
  { centre: 1, left: 0, right: 0, compare: 0, all: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${rows.map((r) => r.name).join(" ")} ${words.unit} Fossile Renouvelable ${[...FOSSIL, CENTRE, ...RENEWABLE].map((s) => s.label).join(" ")} 0 50 100`,
  annot: "",
  value: `${Object.values(words.format).join(" ")} ${words.leftNote} ${words.rightNote} ${words.compareNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "diverging-stack-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["cent-pour-cent", "centre", "fossile", "renouvelable", "france", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDivergingStackScrolly, {
          rows: rows.map(({ code, name, fossil, nuclear, renewable, segments }) => ({ code, name, fossil, nuclear, renewable, segments })),
          subject: S.code,
          leaningLeft: PL.code,
          leaningRight: NO.code,
          legend,
          words,
          ticks,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyDivergingStackState",
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
