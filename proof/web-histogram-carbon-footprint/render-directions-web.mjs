// twin/proof/web-histogram-carbon-footprint/render-directions-web.mjs
//
// The distribution of CO₂ per person across every country in 2023, rendered once per FILED DIRECTION
// into a self-contained interactive page.
//
// Usage:  bun proof/web-histogram-carbon-footprint/render-directions-web.mjs

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
import { DirectedHistogramWeb, FRAME } from "./DirectedHistogramWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const YEAR = 2023;
const BIN = 2;
const THRESHOLD = 4;
const UNIT = "t CO₂ par personne";
/** The one series this beat draws. `level.ts` checks every option's mark against it. */
const SERIES = "paliers";
/** The coverage bands the reader may measure the plate against, as fractions of the 213 countries.
 *  ALL OF THEM SIT ABOVE THE THRESHOLD, and that is rule 5 rather than taste: a band below it would
 *  hollow one of the two bins the headline counts, and the accent that carries the claim is drawn in
 *  every state of this page. The component asserts it again on the bars it is handed. */
const BANDS = [
  { p: 0.75, label: "3 sur 4", words: "Trois quarts" },
  { p: 0.9, label: "9 sur 10", words: "Neuf dixièmes" },
  { p: 0.99, label: "99 sur 100", words: "Quatre-vingt-dix-neuf centièmes" },
];

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return { entity: c[at("Entity")], code: c[at("Code")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && r.year === YEAR && Number.isFinite(r.value));

const sorted = [...rows].sort((a, b) => a.value - b.value);
const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2].value : (sorted[sorted.length / 2 - 1].value + sorted[sorted.length / 2].value) / 2;
const under = rows.filter((r) => r.value < THRESHOLD);
const share = (under.length / rows.length) * 100;
/** The distribution's own quantiles, linearly interpolated on the sorted values. These are what the
 *  reader's control is made of, and the reason it is made of them: a quantile is a property of the
 *  213 numbers, not of the width someone chose to bin them at. */
const quantile = (p) => {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo].value + (sorted[hi].value - sorted[lo].value) * (i - lo);
};

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(share > 55 && share < 70))
  throw new Error(`the headline says about six in ten are under ${THRESHOLD} t; ${fr(share)} % are`);
const highest = rows[rows.findIndex((r) => r.value === Math.max(...rows.map((z) => z.value)))];

// ── THE BIN WIDTH, ASSERTED RATHER THAN TYPED ─────────────────────────────────────────────────
//
// `chart-beat/references/types/histogram.md`: bin width "can manufacture or erase a peak that isn't
// a property of the data at all", with a floor of about three bins and a ceiling of about fifty.
// This beat's 2 t used to be a bare literal with its reason written nowhere — `BRIEF.md` now carries
// the three measurements, and these are the three of them that a future edit can break.
const lastEdge = Math.ceil(Math.max(...rows.map((r) => r.value)) / BIN) * BIN;
const binCount = lastEdge / BIN;
// 1. The threshold the headline counts has to land ON a bin edge. Any width that does not divide it
//    puts 4 t inside a bar, and the accent would then colour a bin the claim does not count.
if (THRESHOLD % BIN !== 0)
  throw new Error(
    `the headline counts the countries under ${THRESHOLD} t and the accent is spent on exactly the ` +
      `bins it counts, so ${THRESHOLD} has to be a bin EDGE — a width of ${BIN} puts it inside a bar`,
  );
// 2. The sheet's own floor and ceiling: fewer than three bins is a number rather than a distribution,
//    more than about fifty is noise rather than a chart.
if (binCount < 3 || binCount > 50)
  throw new Error(`${binCount} bins at ${BIN} t — the sheet's sanity band is 3 to 50`);
// 3. Too narrow and the body of the distribution comes apart into a comb, in a form whose bars must
//    TOUCH. What separates a real outlier from a comb is not how many bins are empty but WHERE the
//    first gap falls: at 1 t the unbroken run from the left breaks at 18 t and leaves SEVEN
//    countries (3,3 %) scattered past gaps; at 2 t it breaks at 28 t and leaves exactly one, Qatar,
//    which is an outlier and not noise. The floor held here is that the unbroken run must carry 99 %
//    of the observations.
const counts = Array.from({ length: binCount }, (_, i) =>
  rows.filter((r) => r.value >= i * BIN && (i === binCount - 1 ? true : r.value < (i + 1) * BIN)).length,
);
const emptyBins = counts.filter((c) => c === 0).length;
let unbroken = 0;
while (unbroken < binCount && counts[unbroken] > 0) unbroken += 1;
const inRun = counts.slice(0, unbroken).reduce((a, b) => a + b, 0);
if (inRun / rows.length < 0.99)
  throw new Error(
    `at ${BIN} t the unbroken run of bins from the left carries only ${inRun} of ${rows.length} ` +
      `countries — the other ${rows.length - inRun} sit past gaps, and a histogram's bars touch: ` +
      `a width that combs the body draws sampling noise as structure`,
  );
console.log(
  `${rows.length} pays en ${YEAR} · ${under.length} sous ${THRESHOLD} t (${fr(share)} %) · médiane ` +
    `${fr(median)} t · maximum ${highest.entity} ${fr(highest.value)} t · ${binCount} paliers de ` +
    `${BIN} t dont ${emptyBins} vides, tous au-delà du palier ${unbroken * BIN}\n`,
);

const edges = Array.from({ length: binCount }, (_, i) => i * BIN);
const bandFacts = BANDS.map((band) => {
  const value = quantile(band.p);
  const from = Math.min(lastEdge - BIN, Math.floor(value / BIN) * BIN);
  const below = rows.filter((r) => r.value < value).length;
  return {
    ...band,
    value,
    from,
    key: String(from),
    below,
    above: rows.length - below,
    ratio: value / median,
    widthBeyond: ((lastEdge - value) / lastEdge) * 100,
  };
});
if (new Set(bandFacts.map((b) => b.key)).size !== bandFacts.length)
  throw new Error(`two coverage bands fall in the same bin — ${bandFacts.map((b) => b.key).join(", ")}`);

let running = 0;
const bars = edges.map((from, i) => {
  const to = from + BIN;
  const isLast = i === edges.length - 1;
  const inBin = rows.filter((r) => r.value >= from && (isLast ? true : r.value < to));
  running += inBin.length;
  const named = [...inBin].sort((a, b) => b.value - a.value).slice(0, 4).map((r) => r.entity);
  return {
    from,
    to: isLast ? null : to,
    key: String(from),
    count: inBin.length,
    inClaim: to <= THRESHOLD,
    // The bands this bar lies ENTIRELY beyond — the span outside the reader's chosen coverage.
    beyond: bandFacts.filter((b) => from >= b.value).map((b) => b.key),
    label: isLast ? `${from} et plus` : `${from}–${to}`,
    detail:
      `${isLast ? `${from} ${UNIT} et plus` : `de ${from} à moins de ${to} ${UNIT}`} · ` +
      `${inBin.length} pays (${fr((inBin.length / rows.length) * 100)} % du total) · ` +
      `${fr((running / rows.length) * 100)} % des pays sont sous ${isLast ? "ce palier et au-delà" : `${to} t`}` +
      (inBin.length ? ` · ${named.join(", ")}${inBin.length > named.length ? ` et ${inBin.length - named.length} autres` : ""}` : ""),
  };
});
const byKey = new Map(bars.map((b) => [b.key, b]));

console.table(bars.filter((b) => b.count > 0).map((b) => ({ palier: b.label, pays: b.count, "% du total": fr((b.count / rows.length) * 100) })));

const facts = beatFacts(
  bars.map((b) => ({ key: String(b.from), label: b.label, value: b.count })),
  { subject: bars[1].label, declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(...bars.map((b) => b.count)) / 20) * 20;
const yTicks = Array.from({ length: ceiling / 20 + 1 }, (_, i) => i * 20);
const xTicks = edges.filter((e) => e % 8 === 0).concat([lastEdge]);
const xOf = (v) => (v / lastEdge) * FRAME.width;

// ── THE READER'S YARDSTICK ────────────────────────────────────────────────────────────────────
//
// THE OPTION'S KEY IS THE BAR THE QUANTILE FALLS INSIDE, never the quantile itself, so the reader
// measures against a datum that is on the plate and `assertLevelDeclaration`'s own refusal stays
// meaningful rather than vacuous. Every number in every sentence is computed from the frozen file
// here, in the runner: the browser formats nothing.
const levels = {
  label: "Mesurer contre",
  noneLabel: "La distribution seule",
  options: bandFacts.map((b) => {
    const bar = byKey.get(b.key);
    const head = `${b.words} des ${rows.length} pays sous ${fr(b.value)} t`;
    return {
      key: b.key,
      label: b.label,
      announce: plain(`${b.label} — ${head.toLowerCase()}, dans le palier ${bar.label} ${UNIT}`),
      note: plain(
        `${head}, dans le palier ${bar.label} · ${b.below} sous ce trait, ${b.above} au-dessus · ` +
          `${fr(b.ratio)} fois la médiane (${fr(median)} t) · les ${b.above} restants s'étalent sur ` +
          `les ${fr(b.widthBeyond, 0)} % de largeur qui suivent`,
      ),
      // ONE REFERENCE, STOOD UP. On a histogram the measured variable IS the x axis, so a coverage
      // band's edge is an upright — `level.ts`'s `x` mark, cut for the scatter and unwidened here.
      marks: [{ series: SERIES, x: xOf(b.value) }],
    };
  }),
};

/** The foot label each band's rule carries on the plot: the quantile's own value. A quantile is NOT
 *  a bin edge, so the axis under it cannot print where the line stands, and the sentence alone would
 *  leave a reader looking at the picture with an unlabelled rule. */
const bandFeet = Object.fromEntries(bandFacts.map((b) => [b.key, plain(`${fr(b.value)} t`)]));

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const widest = bandFacts[bandFacts.length - 1];
const interaction = {
  earns:
    `Un fixe doit choisir une largeur de palier et le lecteur n'a qu'à la croire. Celle-ci ne peut ` +
    `pas se donner — les sept largeurs mesurées dessinent la même décroissance monotone, et aucune ` +
    `des trois grammaires de ce format n'échange une géométrie — alors elle donne les lectures ` +
    `qu'AUCUN choix de paliers ne déplace : les quantiles de la distribution elle-même. Trois quarts ` +
    `des ${rows.length} pays s'arrêtent à ${fr(bandFacts[0].value)} t, soit ` +
    `${fr(100 - bandFacts[0].widthBeyond, 0)} % de la largeur du graphique ; les ` +
    `${widest.above} pays au-delà de ${fr(widest.value)} t en occupent ` +
    `${fr(widest.widthBeyond, 0)} %. Aucun de ces nombres n'est un bord de palier, donc aucun ne ` +
    `peut être imprimé sur un fixe de cette affirmation.`,
  controls: [
    {
      question:
        "Cette queue qui prend la moitié du graphique, elle pèse combien — et les trois quarts des " +
        "pays, ils s'arrêtent où au juste ?",
      gesture: "toggle-a-comparison",
      changes:
        `Un trait en pointillé se dresse au quantile choisi, sur une gaine couleur fond pour rester ` +
        `lisible là où il traverse une barre. Le palier dans lequel il tombe garde son remplissage ` +
        `et prend un cerne d'encre ; tous les paliers entièrement au-delà se vident et ne gardent ` +
        `que leur contour — la part de l'axe hors de la couverture choisie qui recule, ` +
        `géométriquement et non par un second ton. Une phrase donne la valeur du quantile, combien ` +
        `des ${rows.length} pays sont sous ce trait, son multiple de la médiane, et la part de la ` +
        `largeur du graphique que les pays au-delà occupent. Les deux paliers accentués, le titre, ` +
        `la médiane et l'axe sont dessinés dans tous les états de la page.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "le quantile auquel la couverture est lue",
      authorPicked: "none",
      readerPicks: ["none", "4", "10", "24"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Combien sont tombés là — et QUI ?",
      gesture: "ask-a-mark",
      changes:
        `La barre visée passe en encre pleine — la forme dont il est question, pas un point posé ` +
        `sur son sommet — et répond avec son intervalle, son effectif, sa part du total, la part ` +
        `cumulée jusqu'à son bord haut et les pays qui s'y trouvent. Un histogramme dit « combien ` +
        `sont tombés là » et refuse de dire QUI.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel palier est en question",
      authorPicked: "le palier modal",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const title = `${under.length} pays sur ${rows.length} émettent moins de ${THRESHOLD} tonnes de CO₂ par personne`;
const caveat =
  `Un pays par observation, ${rows.length} en tout, rangés par paliers de ${BIN} tonnes. Chaque ` +
  `palier est nommé par SES DEUX BORDS, et le dernier dit qu'il est ouvert : un axe gradué ` +
  `« 0 2 4 6 » laisse le lecteur deviner de quel côté de 4 tombe un pays qui émet exactement 4.`;
const claimNote = `${fr(share)} % des pays sous ${THRESHOLD} t`;
const medianNote = `médiane ${fr(median)} t`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un palier pour lire son intervalle, son effectif, sa part ` +
  `du total, la part cumulée jusqu'à son bord haut et les pays qui s'y trouvent. Choisissez une ` +
  `couverture pour dresser le seuil sous lequel tombe cette part des pays : les paliers ` +
  `entièrement au-delà se vident.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${YEAR}, ${rows.length} pays`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${UNIT}`,
  annot: `${claimNote} ${medianNote} ${Object.values(bandFeet).join(" ")}`,
  value: bars.map((b) => String(b.count)).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedHistogramWeb,
      props: {
        bars, yTicks, xTicks, binWidth: BIN, median, levels, bandFeet, interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, medianNote,
        alt:
          `Un histogramme très déséquilibré vers la droite : ${rows.length} pays rangés par paliers ` +
          `de ${BIN} tonnes de CO₂ par personne en ${YEAR}. Les deux premiers paliers, colorés, ` +
          `contiennent ${under.length} pays — ${fr(share)} % du total. La médiane est à ` +
          `${fr(median)} tonnes. La queue de droite s'étire jusqu'à ${fr(highest.value)} tonnes ` +
          `(${highest.entity}), avec un ou deux pays par palier. Trois quarts des pays sont sous ` +
          `${fr(bandFacts[0].value)} tonnes ; les ${widest.above} pays au-delà de ` +
          `${fr(widest.value)} tonnes occupent ${fr(widest.widthBeyond, 0)} % de la largeur.`,
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
