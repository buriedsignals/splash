// twin/proof/web-stacked-bar-lowcarbon-growth/render-directions-web.mjs
//
// Sixteen European countries' low-carbon electricity in 2024, stacked by source, each bar carrying a
// tick at its own 2000 total — and, under each bar, a rail the reader can put on any one of four
// sources so that band gets the common baseline the stack cannot give it. Rendered once per FILED
// DIRECTION.
//
// Usage:  bun proof/web-stacked-bar-lowcarbon-growth/render-directions-web.mjs

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
import {
  assertOneRebasing,
  rebaseInversions,
  rebaseWorstMisread,
} from "../../skills/chart-web/assets/rebase.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedStackedBarWeb } from "./DirectedStackedBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = `Énergie · Europe · ${2000}-${2024}`;
const FROM = 2000;
const TO = 2024;
// THE STACKING ORDER, AND IT IS IDENTICAL IN EVERY ROW. `types/stacked-bar.md` puts it first:
// reordering per column "breaks the 'same colour, same series' contract even more badly than it
// would on a grouped bar, because a reordered stack also shifts the position of every segment
// sitting above the swap". Nuclear sits on the baseline because it is the largest band on the plate
// and the one the headline's leader is made of — and, as the control's own refusal then shows, that
// makes it the one band the stack already ranks correctly.
// FIVE BANDS AND NOT SIX, WHICH IS THE TYPE SHEET'S OWN LIMIT: past roughly five series a stack
// "turns into an unreadable ribbon — group the smallest into 'Other' rather than adding a sixth
// colour" (`types/stacked-bar.md`, `limit: series > 5`). The first form of this beat drew six, and
// the ramp measured it: three of the six bands were the same colour to any eye on `creme`. So
// bioenergy and the file's own "other renewables" column — whose largest value anywhere is Italy's
// 5,67 TWh — are one band.
const SOURCES = [
  { key: "nuclear", cols: ["nuclear_generation__twh"], short: "nucléaire", long: "le nucléaire" },
  { key: "hydro", cols: ["hydro_generation__twh"], short: "hydraulique", long: "l'hydraulique" },
  { key: "wind", cols: ["wind_generation__twh"], short: "éolien", long: "l'éolien" },
  { key: "solar", cols: ["solar_generation__twh"], short: "solaire", long: "le solaire" },
  {
    key: "other",
    cols: ["bioenergy_stacked_generation__twh", "other_renewables_generation__twh"],
    short: "biomasse et autres",
    long: "la biomasse et les autres",
  },
];
// WHICH BANDS THE READER MAY PUT ON THE BASELINE, AND WHY THE FIFTH IS NOT HERE. `nuclear` was
// designed, declared, and REFUSED BY THE VOCABULARY on this beat's own frozen file, with 0 of 120
// pairs inverted: it is the band ON the baseline, so its right edge already IS its length and the
// stack ranks it exactly right. A rail under it would draw a second copy of a line the reader can
// already measure. It is named here rather than quietly absent so that a future data update, which
// could change that fact, puts it back through the refusal instead of through nobody's memory.
const REBASED = ["hydro", "wind", "solar", "other"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};

const plain = (s) => plainSpaces(s);
/** French ordinals in plain characters. The superscript `ᵉ` belongs to no house family and would
 *  make all three directions refuse at the font census — a trap this branch has already paid for. */
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("code")], year: Number(c[at("year")]) };
  for (const s of SOURCES) o[s.key] = s.cols.reduce((sum, col) => sum + Number(c[at(col)]), 0);
  return o;
});
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const at_ = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  return r;
};

const rows = codes
  .map((code) => {
    const a = at_(code, FROM);
    const b = at_(code, TO);
    const before = SOURCES.reduce((sum, s) => sum + a[s.key], 0);
    const total = SOURCES.reduce((sum, s) => sum + b[s.key], 0);
    return { code, name: NAMES[code], before, total, added: total - before, by: b, wasBy: a };
  })
  .sort((x, z) => z.total - x.total);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const adder = [...rows].sort((a, b) => b.added - a.added)[0];
const leader = rows[0];
if (adder.code === leader.code)
  throw new Error("the headline rests on the largest adder NOT being the largest producer");
if (!(adder.added > leader.added))
  throw new Error(`the headline says the adder added more than the leader; ${fr(adder.added)} against ${fr(leader.added)}`);
if (!(leader.before > adder.before * 3))
  throw new Error(`the headline says the leader started several times higher; ${fr(leader.before)} against ${fr(adder.before)}`);
console.log(
  `${rows.length} pays · plus gros ajout ${adder.name} +${fr(adder.added, 0)} TWh (contre ` +
    `+${fr(leader.added, 0)} pour ${leader.name}) · départ ${fr(adder.before, 0)} contre ` +
    `${fr(leader.before, 0)} · total ${TO} : ${leader.name} ${fr(leader.total, 0)} TWh\n`,
);
console.table(rows.map((r) => ({ pays: r.name, [FROM]: fr(r.before, 0), [TO]: fr(r.total, 0), ajout: `+${fr(r.added, 0)}` })));

const span = Math.ceil(Math.max(...rows.map((r) => r.total)) / 50) * 50;
const xTicks = Array.from({ length: Math.floor(span / 100) + 1 }, (_, i) => i * 100);

/** Where each band starts and ends INSIDE the stack, in TWh, in the one stacking order. */
const stacked = new Map(
  rows.map((r) => {
    let cursor = 0;
    const bands = new Map();
    for (const s of SOURCES) {
      const v = r.by[s.key];
      bands.set(s.key, { from: cursor, to: cursor + v, value: v });
      cursor += v;
    }
    return [r.code, bands];
  }),
);
/** Each country's rank on each source, among the sixteen, by the band's own length. The reading the
 *  plate cannot draw and the rail cannot print: it is what the segment answers with. */
const rankOn = new Map(
  SOURCES.map((s) => {
    const order = [...rows].sort((a, b) => b.by[s.key] - a.by[s.key]);
    return [s.key, new Map(order.map((r, i) => [r.code, i + 1]))];
  }),
);

const shaped = rows.map((r) => {
  const segments = SOURCES.map(({ key, short: name }, tone) => {
    const band = stacked.get(r.code).get(key);
    const v = band.value;
    const was = r.wasBy[key];
    return {
      key,
      tone,
      from: band.from,
      to: band.to,
      label: (v / span) * 100 > 6 ? fr(v, 0) : null,
      detail:
        `${r.name} · ${name} · ${fr(v)} TWh en ${TO} · ${ordinal(rankOn.get(key).get(r.code))} sur ` +
        `${rows.length} · ${fr((v / r.total) * 100)} % de son bas-carbone · ${fr(was)} TWh en ` +
        `${FROM} (${was > 0 ? `${v >= was ? "+" : "−"}${fr(Math.abs(v - was))}` : "n'existait pas"})`,
    };
  }).filter((s) => s.to > s.from);
  return {
    code: r.code,
    name: r.name,
    total: r.total,
    before: r.before,
    totalLabel: `${fr(r.total, 0)} TWh · +${fr(r.added, 0)}`,
    segments,
    highlight: r.code === adder.code || r.code === leader.code,
  };
});

// ── THE RAILS, AND THE READING EACH ONE HANDS BACK ────────────────────────────────────────────
//
// The sentence under the control is derived from the frozen file and never written by hand: the
// pair the stack misreads by the widest margin, and how many of the 120 ordered pairs it ranks
// backwards. `rebaseInversions` and `rebaseWorstMisread` are the vocabulary's own — one function per
// number, read here for the prose and there for the refusal, because the last time this repository
// derived one identity twice a whole map emptied with nothing red.
const bandsFor = (key) =>
  shaped.map((r) => {
    const band = stacked.get(r.code).get(key);
    return { row: r.code, value: band.value, from: band.from };
  });
const nameOf = (code) => NAMES[code];
const rebaseOptions = REBASED.map((key) => {
  const { short, long } = SOURCES.find((s) => s.key === key);
  const bands = bandsFor(key);
  const { inverted, pairs } = rebaseInversions(bands);
  const worst = rebaseWorstMisread(bands);
  if (!worst)
    throw new Error(
      `${short}: the stack ranks every pair the right way round, so a rail under it draws a line ` +
        "the reader can already measure",
    );
  // MEASURED ON THE ROOM THE CONTROL RESERVES, NOT WRITTEN TO TASTE. Three lines of the source
  // register is what `rebaseChromeCss` reserves, and at 375 CSS px that is about 130 characters —
  // so the sentence carries the pair the stack misreads by the widest margin and the count, and
  // stops. The longer form, which also named the gap in TWh, ran to four lines on `nocturne` and
  // pushed the plot down the moment a reader chose an option.
  const note =
    `${nameOf(worst.longer.row)} ${fr(worst.longer.value)} TWh finit à ` +
    `${fr(worst.longer.from + worst.longer.value, 0)} sur l'axe, ` +
    `${nameOf(worst.righter.row)} ${fr(worst.righter.value)} finit à ` +
    `${fr(worst.righter.from + worst.righter.value, 0)}. ${fr(inverted, 0)} des ${fr(pairs, 0)} ` +
    `paires de pays sont classées à l'envers.`;
  return {
    key,
    label: long,
    announce: `Mesurer ${long} depuis zéro — un rail sous chaque barre, de l'origine à la valeur de sa bande`,
    note: plain(note),
    bands,
  };
});
const rebase = {
  label: "Mesurer une source depuis zéro",
  axisMax: span,
  options: [
    {
      key: "none",
      label: "l'empilement seul",
      announce: "l'empilement seul — la planche telle qu'elle est publiée, sans rail",
      bands: [],
    },
    ...rebaseOptions,
  ],
};
for (const option of rebaseOptions) {
  const { inverted, pairs } = rebaseInversions(option.bands);
  console.log(`rail ${option.label} : ${inverted}/${pairs} paires à l'envers`);
}
console.log("");

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.total })),
  { subject: adder.name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE TITLE IS NINE WORDS AND IT USED TO BE SEVENTEEN, AND EVERY WORD CUT WAS MEASURED RATHER THAN
// judged. On `nocturne` at 375 CSS px the display register resolves to 32 px with a 39 px leading,
// so a title costs 39 px A LINE and eleven characters is a line: the first form ran to six of them,
// 234 px of a 812 px window, and left the source line 45 px off screen. What the cut words carried
// is not lost — the two dates are in the eyebrow, which is one line of 11 px whatever it says, and
// the multiple the leader started at is in the caveat, one line of body instead of two of display.
const title = `L'${adder.name} a ajouté plus de bas-carbone que la ${leader.name}`;
const caveat =
  `Électricité bas-carbone produite en ${TO}, empilée par source, ${rows.length} pays classés par ` +
  `total. Le trait marque le total de ${FROM} : l'ajout est la distance jusqu'au bout. ` +
  `L'${adder.name} partait ${fr(leader.before / adder.before, 0)} fois plus bas.`;
const readingLine =
  `Lecture : seul le nucléaire part du même zéro pour tous ; toute bande au-dessus commence là où ` +
  `finit la somme de celles du dessous. Choisissez une source : un rail se déploie sous chaque ` +
  `barre, de l'origine à sa valeur. Survolez une bande pour son rang européen.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;

const interaction = {
  earns:
    "A still has to pick the one comparison a stack supports and ask to be trusted about the rest; " +
    "this page hands the missing baseline back one band at a time, without moving the stack, and " +
    "lets the reader go back and forth between two rankings of the same sixteen bars.",
  controls: [
    {
      question: "L'Espagne a ajouté 119 TWh — mais de quoi, et qui d'autre en a construit autant ?",
      gesture: "toggle-a-comparison",
      changes:
        "Un rail se déploie sous chaque barre, de l'origine à la valeur de sa bande pour la source " +
        "choisie, sur l'échelle de la planche ; l'empilement lui-même ne bouge pas d'un pixel.",
    },
    {
      question: "Cette bande-là, elle vaut combien, et elle est où en Europe ?",
      gesture: "ask-a-mark",
      changes:
        "La bande pointée s'assombrit depuis son propre remplissage et répond avec sa source, ses " +
        "TWh, son rang sur seize, sa part du bas-carbone du pays et sa valeur en 2000.",
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${SOURCES.map((s) => s.short).join(" ")}`,
  axis: `${xTicks.join(" ")} ${shaped.map((r) => r.name).join(" ")} ${rebase.label} ${rebase.options.map((o) => o.label).join(" ")}`,
  annot: `total ${FROM} ${rebaseOptions.map((o) => o.note).join(" ")}`,
  value: shaped.map((r) => r.totalLabel).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 6 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const outPath = join(OUT, `${id}.html`);
  try {
    await renderWeb({
      component: DirectedStackedBarWeb,
      props: {
        rows: shaped,
        tones: SOURCES.length,
        toneLabels: SOURCES.map((s) => s.short),
        span, xTicks,
        beforeLabel: `total ${FROM}`,
        rebase,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Seize barres horizontales empilées par source, classées par total ${TO}. Celle de la ` +
          `${leader.name} est la plus longue (${fr(leader.total, 0)} TWh) et presque entièrement ` +
          `nucléaire ; son trait de ${FROM} est déjà loin à droite, donc son ajout est court. Celle ` +
          `de l'${adder.name} est plus courte (${fr(adder.total, 0)} TWh) mais son trait de ${FROM} ` +
          `est tout près de l'origine : l'essentiel de la barre a été ajouté depuis. Sous chaque ` +
          `barre, une voie vide où se déploie le rail de la source choisie.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // The two refusals only the WRITTEN page can carry: a vocabulary that emitted no rules at all,
    // and a rail given its length before the blanket rule that zeroes them.
    assertOneRebasing(await readFile(outPath, "utf8"), rebase, {
      rows: shaped.map((r) => r.code),
      where: id,
    });
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
