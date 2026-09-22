// twin/proof/web-boxplot-france-co2-decades/render-directions-web.mjs
//
// France's CO₂ per person by decade since 1950 as box plots, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE SUMMARY IS COMPUTED, AND SO IS THE CLAIM ABOUT IT. Quartiles are the linear-interpolation
// definition, the whiskers are Tukey's 1.5 IQR fences clipped to real readings, and the beat throws
// rather than draw a "fell in every decade since the peak" headline its own medians do not support.
//
// AND SO IS EVERY WORD THE YARDSTICK ANSWERS WITH. The browser formats no number on this page: each
// option's sentence — its band, how the other seven boxes sit against it, which one recoups it, how
// many years from elsewhere fall inside it — is derived here, from the frozen file, and baked in.
//
// Usage:  bun proof/web-boxplot-france-co2-decades/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, fitY } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedBoxplotWeb, FRAME, LEVEL_SERIES } from "./DirectedBoxplotWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · France";
const UNIT = "t CO₂ par personne";
const FROM = 1950;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return { entity: c[at("Entity")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
  })
  .filter((r) => r.year >= FROM);
const entities = new Set(rows.map((r) => r.entity));
if (entities.size !== 1) throw new Error(`the frozen file carries ${entities.size} entities: ${[...entities].join(", ")}`);
for (const r of rows) if (!Number.isFinite(r.value)) throw new Error(`${r.year} has no usable reading`);

const quantile = (sorted, p) => {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
};

const decades = [...new Set(rows.map((r) => Math.floor(r.year / 10) * 10))].sort((a, b) => a - b);
const boxes = decades.map((d) => {
  const inDecade = rows.filter((r) => Math.floor(r.year / 10) * 10 === d).sort((a, b) => a.year - b.year);
  const values = inDecade.map((r) => r.value).sort((a, b) => a - b);
  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  // TUKEY'S FENCE, AND THE WHISKER IS CLIPPED TO A REAL READING INSIDE IT. `inside` is what the
  // whisker may reach; `outliers` is everything past the fence, drawn as its own mark. Letting the
  // whisker stretch to `values[0]` / `values.at(-1)` is the one shortcut this type's sheet names as
  // its honesty failure — it would launder 1980's 9,54 t into looking like ordinary 1980s spread.
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const inside = values.filter((v) => v >= lowFence && v <= highFence);
  const outliers = inDecade.filter((r) => r.value < lowFence || r.value > highFence);
  return {
    key: `${d}`,
    label: `${d}s`,
    n: values.length,
    min: Math.min(...inside),
    q1,
    median,
    q3,
    max: Math.max(...inside),
    medianLabel: fr(median),
    outliers: outliers.map((o) => ({ year: o.year, value: o.value, label: fr(o.value) })),
    readings: inDecade.map((r) => ({
      year: r.year,
      value: r.value,
      detail:
        `${fr(r.value)} ${UNIT} · décennie ${d}s (médiane ${fr(median)}, n=${values.length}) · ` +
        (r.value < lowFence || r.value > highFence
          ? "valeur aberrante au sens de Tukey"
          : r.value > median
            ? `au-dessus de la médiane de sa décennie`
            : `au-dessous de la médiane de sa décennie`),
    })),
  };
});

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const peak = boxes.reduce((a, b) => (b.median > a.median ? b : a));
const peakIndex = boxes.indexOf(peak);
for (let i = peakIndex + 1; i < boxes.length; i += 1)
  if (!(boxes[i].median < boxes[i - 1].median))
    throw new Error(
      `the headline says every decade after the peak is lower than the one before it; ` +
        `${boxes[i].label} (${fr(boxes[i].median)}) is not below ${boxes[i - 1].label} (${fr(boxes[i - 1].median)})`,
    );
const last = boxes[boxes.length - 1];
console.log(
  `${rows.length} lectures ${FROM}-${rows[rows.length - 1].year} · ${boxes.length} décennies · ` +
    `pic ${peak.label} à ${fr(peak.median)} · dernière ${last.label} à ${fr(last.median)} (n=${last.n})\n`,
);
console.table(boxes.map((b) => ({ décennie: b.label, n: b.n, min: fr(b.min), q1: fr(b.q1), médiane: b.medianLabel, q3: fr(b.q3), max: fr(b.max), aberrantes: b.outliers.length })));

const facts = beatFacts(
  boxes.map((b) => ({ key: b.key, label: b.label, value: b.median })),
  { subject: peak.label, declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// Fitted to the readings, not anchored at zero: a box encodes POSITIONS, and no mark on this page
// is measured by its length from a baseline. Computed from the data so a moved file moves the axis.
const lo = Math.floor(Math.min(...boxes.map((b) => Math.min(b.min, ...b.outliers.map((o) => o.value)))));
const hi = Math.ceil(Math.max(...boxes.map((b) => Math.max(b.max, ...b.outliers.map((o) => o.value)))));
const yTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

// ── THE YARDSTICK THE READER HOLDS ────────────────────────────────────────────────────────────
//
// Written into `BRIEF.md` before a line of this existed. A still can print eight falling medians;
// what it cannot do is say whether the decades SEPARATE — eight medians fall monotonically just as
// happily when the boxes underneath them overlap, and nobody sees that in a row of rectangles at
// eight different x. So the reader lays ONE decade's own three levels flat across all eight, and
// the sentence under the control carries the four readings a rule cannot draw.
//
// THE MARKS ARE IN THE GEOMETRY'S OWN UNITS, never in CSS pixels: the `<svg>` carries
// `preserveAspectRatio="none"`, so a viewBox unit is a different number of reader pixels at every
// width, and a reference placed in reader pixels would slide off its own level on the first resize.
const yOf = fitY(yTicks[0], yTicks[yTicks.length - 1], FRAME.height);

const comparisons = boxes.map((b) => {
  const others = boxes.filter((o) => o !== b);
  return {
    box: b,
    above: others.filter((o) => o.q1 > b.q3).length,
    below: others.filter((o) => o.q3 < b.q1).length,
    overlapping: others.filter((o) => !(o.q1 > b.q3) && !(o.q3 < b.q1)),
    // Years belonging to OTHER decades that fall inside this decade's own interquartile band. This
    // is the reading the page earns its format with: four years of the 1950s sit inside the 2010s
    // band, which is to say the 2010s put France back where it was sixty years earlier.
    strangers: rows.filter(
      (r) => Math.floor(r.year / 10) * 10 !== Number(b.key) && r.value >= b.q1 && r.value <= b.q3,
    ),
  };
});

const counted = (n, one, many, none) => (n === 0 ? none : n === 1 ? one : `${n} ${many}`);
const levels = {
  // SHORT WORDS, AND THE PHONE IS WHY. Nine pills at 375 px wrap; every extra row is a row the
  // plot pays for, and this beat's own title already takes 351 px of an 812 px window in nocturne.
  label: "À l'aune de",
  noneLabel: "Aucun repère",
  options: comparisons.map((c) => {
    const band = `bande interquartile ${fr(c.box.q1)}-${fr(c.box.q3)} ${UNIT}`;
    const above = counted(
      c.above,
      "une décennie passe entièrement au-dessus",
      "décennies passent entièrement au-dessus",
      "aucune décennie ne passe au-dessus",
    );
    const below = counted(
      c.below,
      "une entièrement au-dessous",
      "entièrement au-dessous",
      "aucune au-dessous",
    );
    const cut = c.overlapping.length
      ? `recoupée par ${c.overlapping.map((o) => `les ${o.label}`).join(" et ")}`
      : "aucune autre décennie ne la recoupe";
    const strangers = counted(
      c.strangers.length,
      "une année d'une autre décennie y tombe",
      "années d'autres décennies y tombent",
      "aucune année d'une autre décennie n'y tombe",
    );
    return {
      key: c.box.key,
      label: c.box.label,
      announce: plain(`${c.box.label} — ${band} ; ${above}, ${below} ; ${cut} ; ${strangers}`),
      note: plain(`${c.box.label} · ${band} · ${above} · ${below} · ${cut} · ${strangers}`),
      // THREE LEVELS, NEVER ONE. A box plot's argument is the SPREAD, and a yardstick carrying only
      // the median would measure this picture on the one channel a line chart already has — word
      // for word the half-answer `assertLevelDeclaration` refuses.
      marks: LEVEL_SERIES.map((series) => ({ series, y: yOf(c.box[series]) })),
    };
  }),
};

// The pair of boxes that overlap the hardest, and the band that swallows the most years from
// elsewhere — both READ OFF the data rather than typed, so a moved file moves the sentence.
let widest = null;
for (let i = 0; i < boxes.length; i += 1)
  for (let j = i + 1; j < boxes.length; j += 1) {
    const w = Math.min(boxes[i].q3, boxes[j].q3) - Math.max(boxes[i].q1, boxes[j].q1);
    if (w > 0 && (!widest || w > widest.w)) widest = { w, a: boxes[i], b: boxes[j] };
  }
if (!widest)
  throw new Error(
    "no two decades' boxes overlap, so the sentence this page earns its format with is false — " +
      "rewrite it against what the file now says",
  );
let strangerCase = null;
for (const c of comparisons) {
  const byDecade = new Map();
  for (const r of c.strangers) {
    const d = Math.floor(r.year / 10) * 10;
    byDecade.set(d, (byDecade.get(d) ?? 0) + 1);
  }
  for (const [d, count] of byDecade)
    if (!strangerCase || count > strangerCase.count)
      strangerCase = { count, from: `${d}s`, of: c.box.label };
}
if (!strangerCase)
  throw new Error("no decade's interquartile band contains a year from another decade");
console.log(
  `recouvrement le plus large : ${widest.a.label} / ${widest.b.label} (${fr(widest.w)} t) · ` +
    `${strangerCase.count} années des ${strangerCase.from} dans la bande des ${strangerCase.of}\n`,
);

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    `Un fixe peut imprimer les huit médianes, et huit médianes qui baissent est exactement ce que ` +
    `le titre affirme. Ce qu'il ne peut pas faire, c'est dire si les décennies SE SÉPARENT : huit ` +
    `médianes baissent tout aussi bien quand les boîtes qui les portent se chevauchent, et ` +
    `personne ne voit cela dans une rangée de rectangles à huit abscisses différentes. Ici le ` +
    `lecteur pose les trois niveaux d'une décennie à plat sur les sept autres, et ce qui revient ` +
    `est le fait que les médianes enterrent : la boîte des ${widest.a.label} et celle des ` +
    `${widest.b.label} sont la même boîte, et ${strangerCase.count} années des ` +
    `${strangerCase.from} tombent dans la bande interquartile des ${strangerCase.of}.`,
  controls: [
    {
      question:
        `Cette décennie-là, elle est vraiment au-dessous de la précédente, ou est-ce que les deux ` +
        `se recouvrent ?`,
      gesture: "find-your-own-case",
      changes:
        `Les trois niveaux de la décennie choisie — Q1, médiane, Q3 — se couchent en pointillé à ` +
        `travers les huit boîtes, chacun sur une gaine couleur fond pour rester lisible là où il ` +
        `croise une boîte. Sa propre boîte prend un cerne d'encre pleine ; son étiquette sous ` +
        `l'axe passe en encre pleine et les sept autres reculent. Une phrase donne sa bande en ` +
        `tonnes, combien des sept autres boîtes la dépassent entièrement et combien passent ` +
        `entièrement dessous, laquelle la recoupe, et combien d'années d'autres décennies tombent ` +
        `dedans.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "la décennie à l'aune de laquelle les huit sont lues",
      authorPicked: "none",
      readerPicks: ["none", "1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Cette année-là, elle vaut combien, et elle est où dans sa propre décennie ?",
      gesture: "ask-a-mark",
      changes:
        `Le point visé passe en encre pleine — la forme dont il est question, pas une pastille ` +
        `posée par-dessus — et répond avec son année, sa valeur, la médiane et le n de sa ` +
        `décennie, et s'il est au-dessus ou au-dessous de cette médiane, ou qu'il est la valeur ` +
        `aberrante de sa décennie au sens de Tukey. Une boîte résume dix lectures et n'en nomme ` +
        `aucune.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quelle boîte est en question",
      authorPicked: "la décennie 2020",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const title = `Le CO₂ par personne des Français a culminé dans les années ${peak.key} et baisse à chaque décennie depuis`;
// THE WHISKER RULE, STATED IN FULL AND NOT JUST NAMED. The shipped caveat used to read « les
// moustaches à 1,5 écart interquartile », which gives the multiplier and stops: it does not say the
// whisker is CLIPPED TO A REAL READING, and nothing on the page said what the hollow ring above the
// 1980s was. A box plot that does not state where its whiskers stop is unreadable in principle, and
// a mark with no key is worse than a mark that is absent. Both halves are computed, never typed.
const allOutliers = boxes.flatMap((b) => b.outliers.map((o) => ({ ...o, box: b })));
const outlierClause = allOutliers.length
  ? `au-delà, l'année est un cercle creux ` +
    `(${allOutliers.map((o) => `${o.year}, ${fr(o.value)} t`).join(" ; ")}).`
  : `aucune lecture ne sort de sa clôture ici, donc aucun cercle creux n'est dessiné.`;
const caveat =
  `Une boîte par décennie : quartiles, médiane en trait plein. Moustaches de Tukey — chacune ` +
  `s'arrête à la dernière lecture réelle située à moins de 1,5 écart interquartile de son quartile, ` +
  `jamais à l'extrême ; ${outlierClause} Axe ajusté aux lectures, pas à zéro.`;
const peakNote = `pic : ${peak.label}, médiane ${fr(peak.median)}`;
// SHORT, AND MEASURED RATHER THAN JUDGED. This beat's title takes 351 px of an 812 px window in
// nocturne, and the yardstick's own fieldset and sentence take 94 more; every line of prose after
// that comes straight out of the plot. What the reader needs here is the two gestures, named.
const readingLine =
  `Lecture : une décennie choisie couche ses trois niveaux ; un point survolé ou tabulé donne son ` +
  `année.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · France, ${FROM}-${rows[rows.length - 1].year}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${yTicks.join(" ")} ${boxes.map((b) => `${b.label} n=${b.n}`).join(" ")}`,
  annot: peakNote,
  value: boxes.map((b) => b.medianLabel).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedBoxplotWeb,
      props: {
        boxes,
        peakKey: peak.key,
        yTicks,
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, unit: UNIT, reading: readingLine, peakNote,
        alt:
          `Huit boîtes, une par décennie de ${FROM} à aujourd'hui, mesurant le CO₂ émis par ` +
          `personne en France. La médiane monte de ${fr(boxes[0].median)} tonnes dans les ` +
          `${boxes[0].label} jusqu'à ${fr(peak.median)} dans les ${peak.label}, puis baisse à ` +
          `chaque décennie jusqu'à ${fr(last.median)} dans les ${last.label} (n=${last.n}, décennie ` +
          `incomplète). À droite de chaque boîte, les années qu'elle résume sont dessinées une à ` +
          `une. Choisir une décennie couche ses trois niveaux — Q1, médiane, Q3 — à travers les ` +
          `huit boîtes : celle des ${widest.a.label} et celle des ${widest.b.label} se recouvrent ` +
          `presque entièrement, et ${strangerCase.count} années des ${strangerCase.from} tombent ` +
          `dans la bande interquartile des ${strangerCase.of}.`,
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
