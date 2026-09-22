// twin/proof/web-radar-electricity-mix/render-directions-web.mjs
//
// France against Germany, 2024 electricity, on eight axes. Rendered once per FILED DIRECTION.
//
// THE CLAIM IS ASSERTED against the frozen file: the two countries are within a fifth of each other
// and the nuclear gap is over fifty points, or the run refuses.
//
// AND THE BEAT'S OWN FINDING IS ASSERTED TOO, which is the part that carries the gesture. The
// catalogue sheet for this type says a radar's polygon AREA -- the thing a reader's eye actually
// judges -- moves with axis order AND COUNT in a way the numbers do not, and that nothing in the type
// catches it. This runner MEASURES the COUNT half, which is the half a newsroom actually decides: it
// enumerates every subset of the eight axes that leaves a shape at all, takes the span of each
// country's area and of the ratio between them, and refuses to render if that span is not wide enough
// to be the page's argument -- and refuses outright if no honest subset turns "who covers more" over,
// because then the page would be claiming something its own data does not do.
//
// Usage:  bun proof/web-radar-electricity-mix/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { countedOutline, enclosedArea, assertCountChangesThePicture } from "../../skills/chart-web/assets/count.ts";
import { DirectedRadarWeb, FRAME } from "./DirectedRadarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const PAIR = ["FRA", "DEU"];
const AXES = [
  ["Nuclear", "nucléaire"],
  ["Wind", "éolien"],
  ["Solar", "solaire"],
  ["Hydropower", "hydraulique"],
  ["Bioenergy", "biomasse"],
  ["Gas", "gaz"],
  ["Coal", "charbon"],
  ["Oil", "pétrole"],
];
const ALL = [...AXES.map(([k]) => k), "Other renewables"];
const NAMES = { FRA: "France", DEU: "Allemagne" };

const plain = (s) => plainSpaces(s);
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
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
});

const countries = PAIR.map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  const total = ALL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    total,
    shares: Object.fromEntries(AXES.map(([k]) => [k, (r[k] / total) * 100])),
    twh: Object.fromEntries(AXES.map(([k]) => [k, r[k]])),
  };
});
const [a, b] = countries;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const sizeGap = Math.abs(a.total - b.total) / Math.max(a.total, b.total);
if (!(sizeGap < 0.2))
  throw new Error(`the headline says the two are within a fifth of each other; they differ by ${fr(sizeGap * 100)} %`);
const nuclearGap = a.shares.Nuclear - b.shares.Nuclear;
if (!(nuclearGap > 50)) throw new Error(`the headline rests on the nuclear gap; it is ${fr(nuclearGap)} points`);
console.log(
  `${a.name} ${fr(a.total, 0)} TWh contre ${b.name} ${fr(b.total, 0)} TWh (écart ${fr(sizeGap * 100)} %) · ` +
    `nucléaire ${fr(a.shares.Nuclear)} % contre ${fr(b.shares.Nuclear)} % · éolien+solaire ` +
    `${fr(a.shares.Wind + a.shares.Solar)} % contre ${fr(b.shares.Wind + b.shares.Solar)} %\n`,
);
console.table(AXES.map(([k, n]) => ({ source: n, [a.name]: fr(a.shares[k]), [b.name]: fr(b.shares[k]) })));

const ceiling = Math.ceil(Math.max(...countries.flatMap((c) => AXES.map(([k]) => c.shares[k]))) / 10) * 10;
const rings = Array.from({ length: ceiling / 20 }, (_, i) => (i + 1) * 20).filter((r) => r <= ceiling);
if (rings[rings.length - 1] !== ceiling) rings.push(ceiling);

// ── THE TYPE'S OWN WEAK POINT, MEASURED RATHER THAN QUOTED ────────────────────────────────────
// `chart-beat/references/types/radar.md`: a polygon's AREA is sensitive to axis order and COUNT in a
// way the underlying numbers aren't, and the type has no guard behind it. So it is measured here, on
// every subset of the eight that still closes into a shape, and the page's whole argument is refused
// if the measurement does not support it.
//
// AND IT IS MEASURED ON THE VERY COORDINATES THE PAGE DRAWS. `countedOutline` and `enclosedArea` are
// the vocabulary's own -- the same two functions the component builds its paths with and the same two
// the refusals are written against -- so the number printed on the plot cannot drift from the shape
// drawn under it. The geometry has to be restated here because it is the BEAT's: the frame's centre,
// its radius and where a share lands on a spoke are the scale's business, and `count.ts` owns no
// scale. It is the same arithmetic the component runs, which is stated rather than hidden, and the
// test `skills/chart-web/test/count-vocabulary.test.ts` holds the shared half.
const PLATE = AXES.map(([k]) => k);
const axes = AXES.map(([key, name]) => ({ key, name }));
const CX = FRAME.width / 2;
const CY = FRAME.height / 2;
const RADIUS = Math.min(CX, CY) - 70;
const angleOf = (slot) => (slot / AXES.length) * Math.PI * 2 - Math.PI / 2;
const vertexOf = (slot, v) => [
  CX + (v / ceiling) * RADIUS * Math.cos(angleOf(slot)),
  CY + (v / ceiling) * RADIUS * Math.sin(angleOf(slot)),
];
const verticesOf = (country) =>
  Object.fromEntries(PLATE.map((k, slot) => [k, vertexOf(slot, country.shares[k])]));
const VERTICES = Object.fromEntries(countries.map((c) => [c.code, verticesOf(c)]));
/** The share of the ceiling ring's own disc this subset's outline covers, in percent. The disc is the
 *  only thing on the plate an area can honestly be stated against: it is what a reading of `ceiling`
 *  on every axis at once would enclose. */
const disc = Math.PI * RADIUS * RADIUS;
const areaPct = (counts, country) =>
  (enclosedArea(countedOutline(axes, counts, VERTICES[country.code])) / disc) * 100;
const ratioOf = (counts) => areaPct(counts, b) / areaPct(counts, a);

// THE SPACE THE MEASUREMENT IS TAKEN OVER, AND IT IS DELIBERATELY THE MODEST ONE.
//
// Every subset of the eight that still closes into a shape is 219 counts, and the extremes of that
// space are three-spoke slivers whose area is near zero -- true, and worthless as an argument,
// because the ratio between two near-zero areas runs to hundreds and a reader would rightly read it
// as a trick. So the page quotes the span over the counts that drop AT MOST TWO of the eight: 37 of
// them, every one of them a comparison somebody could publish with a straight face. If the finding
// holds there it holds everywhere, and the numbers on the page are ones a reader can check against
// the picture.
const DROPPABLE = 2;
const everyCount = [];
for (let mask = 1; mask < 1 << PLATE.length; mask++) {
  const counts = PLATE.filter((_, i) => mask & (1 << i));
  if (counts.length >= PLATE.length - DROPPABLE) everyCount.push(counts);
}
const span = (pick) => {
  let lo = { v: Infinity, counts: null };
  let hi = { v: -Infinity, counts: null };
  for (const counts of everyCount) {
    const v = pick(counts);
    if (v < lo.v) lo = { v, counts };
    if (v > hi.v) hi = { v, counts };
  }
  return { lo, hi };
};
const frSpan = span((counts) => areaPct(counts, a));
const ratioSpan = span(ratioOf);
const frFactor = frSpan.hi.v / frSpan.lo.v;
const plateRatio = ratioOf(PLATE);
/** The counts in which the eye's answer to "who covers more" is the OTHER one -- a plain tally, which
 *  is the honest statistic on a space whose ratios can be made to say anything. */
const turnsOver = (counts) => (ratioOf(counts) - 1) * (plateRatio - 1) < 0;
const flipped = everyCount.filter(turnsOver);

if (!(frFactor > 2))
  throw new Error(
    `this page's whole argument is that a radar's area is an editorial decision; across the ` +
      `${everyCount.length} counts that drop at most ${DROPPABLE} of the ${PLATE.length} sources, ` +
      `${a.name}'s area only moves by a factor of ${fr(frFactor, 2)} — not enough to be worth a ` +
      "reader's gesture, so the beat should ship as a still",
  );
if (!flipped.length)
  throw new Error(
    `the page says the choice of sources can turn "who covers more" all the way round; not one of ` +
      `the ${everyCount.length} counts that drop at most ${DROPPABLE} sources does it (the ratio ` +
      `spans ${fr(ratioSpan.lo.v, 2)} to ${fr(ratioSpan.hi.v, 2)} around the plate's ` +
      `${fr(plateRatio, 2)}) — rewrite the claim before rendering`,
  );

// ── WHAT THE READER MAY COUNT ─────────────────────────────────────────────────────────────────
// THREE EDITORIAL SUBSETS, NOT THREE DRAWS FROM THE 219. Each one is a line somebody actually argues
// about in an energy newsroom, and that is the point: a subset nobody would defend proves nothing
// about how a radar is read in practice.
//
//   - WITHOUT NUCLEAR. The single axis the French mix is built on, and the one every comparison of
//     "renewables" quietly drops. It takes the answer further the way it already pointed.
//   - LOW-CARBON ONLY. The standard European frame, and the one that TURNS THE ANSWER OVER: France
//     covers more of the disc than Germany under it.
//   - DISPATCHABLE ONLY. Wind and solar set aside. Two axes leave the count and the French shape
//     gets BIGGER, which is the finding no subtraction vocabulary can express: a small reading was
//     pulling the outline in, and closing over it lets the outline out.
const COUNTS = {
  "sans-nucleaire": PLATE.filter((k) => k !== "Nuclear"),
  "bas-carbone": ["Nuclear", "Wind", "Solar", "Hydropower", "Bioenergy"],
  pilotables: ["Nuclear", "Hydropower", "Bioenergy", "Gas", "Coal", "Oil"],
};
// THE REVERSAL IS ASSERTED AND NOT ASSUMED. The page's whole argument is that the choice of sources
// can turn "who covers more" over, so at least one offered subset has to actually do it against the
// plate. If the frozen file ever stops supporting that, this refuses instead of printing a sentence
// that is no longer true.
const turned = Object.entries(COUNTS).filter(([, counts]) => turnsOver(counts));
if (!turned.length)
  throw new Error(
    `not one of the offered subsets turns "who covers more" over: the plate reads ` +
      `${fr(plateRatio, 2)} and the three offered read ` +
      Object.entries(COUNTS)
        .map(([name, counts]) => `${name} ${fr(ratioOf(counts), 2)}`)
        .join(", ") +
      " — the page would be claiming something its own data does not do",
  );

console.log(
  `\naire (en % du disque de ${ceiling} %) sur ${everyCount.length} comptes écartant au plus ${DROPPABLE} des ${PLATE.length} sources :\n` +
    `  ${a.name} de ${fr(frSpan.lo.v, 2)} à ${fr(frSpan.hi.v, 2)} (facteur ${fr(frFactor, 2)})\n` +
    `  rapport ${b.name}/${a.name} de ${fr(ratioSpan.lo.v, 2)} à ${fr(ratioSpan.hi.v, 2)}\n` +
    `  renversent la réponse : ${fr(flipped.length, 0)} de ces ${everyCount.length} comptes\n` +
    `  parmi les trois proposés : ${turned.map(([n]) => n).join(", ")}\n`,
);
console.table(
  [["les huit", PLATE], ...Object.entries(COUNTS)].map(([name, counts]) => ({
    compte: name,
    axes: counts.length,
    [a.name]: fr(areaPct(counts, a), 2),
    [b.name]: fr(areaPct(counts, b), 2),
    rapport: fr(ratioOf(counts), 2),
  })),
);

const nameOf = Object.fromEntries(AXES);
const listOf = (counts) => counts.map((k) => nameOf[k]).join(", ");
const asideOf = (counts) => PLATE.filter((k) => !counts.includes(k));
// THE READOUT IS SHORT BECAUSE TWO OF THE THREE FILED DIRECTIONS SET THE ANNOTATION REGISTER IN
// TRACKED UPPERCASE. At its first length -- the subset's own name, then both areas, then the ratio --
// it wrapped to three lines of shouting over the drawing in `nocturne` and `rapport`. Which subset is
// showing is already said by the chosen pill and spelled out in the sentence under the control; what
// the plot owes the reader is the two numbers their eye cannot get from the shapes.
const areaWords = (counts) =>
  `Aire · ${a.name} ${fr(areaPct(counts, a), 2)} % · ${b.name} ${fr(areaPct(counts, b), 2)} % du disque ` +
  `· ${fr(ratioOf(counts), 2)} fois`;
const plateReadout = plain(areaWords(PLATE));

const countPlan = {
  label: "Sources comptées",
  noneLabel: "les huit",
  // WHAT PRESSING A PILL DOES, SAID BEFORE ANYBODY PRESSES ONE -- the one thing kept from the gesture
  // this replaces. The owner read that page twice and wrote both times that the axis labels moved
  // under what he read as a filter. They no longer move at all, and this sentence says what DOES: a
  // source leaves the COUNT, not the picture.
  noneNote: plain(
    `Les boutons ci-dessus retirent des sources du compte : les huit axes gardent leur place et leur ` +
      `nom, les sommets restent posés, la forme cesse d'y passer.`,
  ),
  options: [
    {
      key: "sans-nucleaire",
      label: "sans le nucléaire",
      announce: plain(
        `Ne compter que les sept autres sources, sans le nucléaire : l'axe où la ${a.name} fait ` +
          `${fr(a.shares.Nuclear)} % reste dessiné et sort du compte`,
      ),
      note: plain(
        `Sans le nucléaire, où la ${a.name} fait ${fr(a.shares.Nuclear)} % : ` +
          `${fr(areaPct(COUNTS["sans-nucleaire"], a), 2)} % du disque contre ` +
          `${fr(areaPct(COUNTS["sans-nucleaire"], b), 2)} %, soit ` +
          `${fr(ratioOf(COUNTS["sans-nucleaire"]), 2)} fois au lieu de ${fr(plateRatio, 2)}. ` +
          `Le sommet reste, il ne compte plus.`,
      ),
      readout: plain(areaWords(COUNTS["sans-nucleaire"])),
      counts: COUNTS["sans-nucleaire"],
      alt: plain(
        `Les deux mêmes formes, sur les mêmes huit axes, le nucléaire écarté du compte : son rayon ` +
          `passe en pointillés et les deux sommets y restent posés, mais aucune des deux formes n'y ` +
          `passe plus. Elles couvrent ${fr(areaPct(COUNTS["sans-nucleaire"], a), 2)} % et ` +
          `${fr(areaPct(COUNTS["sans-nucleaire"], b), 2)} % du disque.`,
      ),
    },
    {
      key: "bas-carbone",
      label: "le bas-carbone",
      announce: plain(
        `Ne compter que le bas-carbone : ${listOf(COUNTS["bas-carbone"])}`,
      ),
      note: plain(
        `Bas-carbone seules : ${fr(areaPct(COUNTS["bas-carbone"], a), 2)} % du disque contre ` +
          `${fr(areaPct(COUNTS["bas-carbone"], b), 2)} %, soit ${fr(ratioOf(COUNTS["bas-carbone"]), 2)} ` +
          `fois au lieu de ${fr(plateRatio, 2)} — la réponse s'est inversée.`,
      ),
      readout: plain(areaWords(COUNTS["bas-carbone"])),
      counts: COUNTS["bas-carbone"],
      alt: plain(
        `Les deux mêmes formes, seules les cinq sources bas-carbone comptées ` +
          `(${listOf(COUNTS["bas-carbone"])}) ; ${listOf(asideOf(COUNTS["bas-carbone"]))} restent ` +
          `dessinés, en pointillés, hors du compte. La forme française est maintenant la plus ` +
          `grande des deux, à ${fr(areaPct(COUNTS["bas-carbone"], a), 2)} % du disque contre ` +
          `${fr(areaPct(COUNTS["bas-carbone"], b), 2)} %.`,
      ),
    },
    {
      key: "pilotables",
      label: "les pilotables",
      announce: plain(
        `Ne compter que les pilotables : ${listOf(COUNTS.pilotables)}, l'éolien et le solaire ` +
          `écartés`,
      ),
      note: plain(
        `Sans l'éolien ni le solaire : ${fr(areaPct(COUNTS.pilotables, a), 2)} % contre ` +
          `${fr(areaPct(COUNTS.pilotables, b), 2)} %, soit ${fr(ratioOf(COUNTS.pilotables), 2)} fois. ` +
          `Deux axes sortent du compte et la forme française GRANDIT ` +
          `: ${fr(areaPct(PLATE, a), 2)} % avec les huit, ${fr(areaPct(COUNTS.pilotables, a), 2)} % sans eux.`,
      ),
      readout: plain(areaWords(COUNTS.pilotables)),
      counts: COUNTS.pilotables,
      alt: plain(
        `Les deux mêmes formes, seules les six sources pilotables comptées ; l'éolien et le solaire ` +
          `restent dessinés, en pointillés, hors du compte. La forme française couvre ` +
          `${fr(areaPct(COUNTS.pilotables, a), 2)} % du disque — plus qu'avec les huit axes — contre ` +
          `${fr(areaPct(COUNTS.pilotables, b), 2)} % pour l'allemande.`,
      ),
    },
  ],
};

const shapes = countries.map((c, i) => ({
  code: c.code,
  name: c.name,
  tone: i === 0 ? "a" : "b",
  values: Object.fromEntries(AXES.map(([k]) => [k, c.shares[k]])),
  // THE SIXTEEN READINGS, IDENTICAL IN EVERY STATE -- they are the part of this page the count cannot
  // touch, which is the editorial point restated on a channel the reader can check.
  details: Object.fromEntries(
    AXES.map(([k, n]) => {
      const other = countries.find((z) => z.code !== c.code);
      return [
        k,
        plain(
          `${c.name} · ${n} · ${fr(c.shares[k])} % de son électricité (${fr(c.twh[k], 1)} TWh) · ` +
            `${other.name} sur le même axe : ${fr(other.shares[k])} %`,
        ),
      ];
    }),
  ),
  // AND THE ONE CLAUSE A SET-ASIDE VERTEX ADDS. The reading does not change -- that is the whole
  // argument -- but the vertex must not answer as though the shape still went through it.
  asideDetails: Object.fromEntries(
    AXES.map(([k, n]) => {
      const other = countries.find((z) => z.code !== c.code);
      return [
        k,
        plain(
          `${c.name} · ${n} · ${fr(c.shares[k])} % de son électricité (${fr(c.twh[k], 1)} TWh) · ` +
            `${other.name} sur le même axe : ${fr(other.shares[k])} % · hors du compte : la forme ne ` +
            `passe plus par ce sommet`,
        ),
      ];
    }),
  ),
}));

const facts = beatFacts(
  AXES.map(([k, n]) => ({ key: k, label: n, value: a.shares[k] })),
  { subject: a.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE HEADLINE IS THE STATIC SIBLING'S OWN, IN FRENCH AND AT ITS OWN LENGTH. It read `produisent
// presque autant d'électricité et n'ont presque aucune source en commun` — 100 characters, which the
// nocturne direction sets at 32 px and wrapped to ELEVEN lines at 375 px wide, over half the phone's
// window for one sentence. The static plate says "make nearly the same electricity from opposite
// mixes" in 71; this is that sentence, not a shorter claim.
const title = `${a.name} et ${b.name} : presque autant d'électricité, des mix opposés`;
// EVERY WORD HERE IS PRINTED IN EVERY STATE THE CONTROL CAN PRODUCE. The claim is the two mixes, not
// the two shapes, so the shares that carry it are on the plate and not behind a gesture.
const caveat = plain(
  `Mix électrique ${YEAR}, en part de la production de chaque pays. ` +
    `${fr(a.total, 0)} TWh contre ${fr(b.total, 0)} — à ${fr(sizeGap * 100, 0)} % l'un de l'autre. ` +
    `Nucléaire ${fr(a.shares.Nuclear)} % contre ${fr(b.shares.Nuclear, 0)} %, éolien et solaire ` +
    `${fr(a.shares.Wind + a.shares.Solar)} % contre ${fr(b.shares.Wind + b.shares.Solar)} %.`,
);
// THE BEAT'S OWN FINDING, PRINTED RATHER THAN HIDDEN BEHIND THE CONTROL THAT DEMONSTRATES IT. A
// reader who touches nothing is still told that the area they are about to judge is an editorial
// decision; the control only lets them watch it happen.
const readingLine = plain(
  `Lecture : l'aire d'un radar ne mesure rien. Écartez une ou deux des huit sources : celle de la ` +
    `${a.name} va de ${fr(frSpan.lo.v, 2)} % à ${fr(frSpan.hi.v, 2)} % du disque, et ` +
    `${fr(flipped.length, 0)} fois sur ${everyCount.length} elle dépasse l'${b.name}. ` +
    `Survolez un sommet.`,
);
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

// A REGISTER'S DECLARED TEXT IS WHAT THE PAGE'S OWN FACES ARE SUBSETTED FROM, so a glyph the page can
// display and no register names is a glyph the delivered file cannot draw. The control's own words --
// the legend, the four pills, the four sentences it reveals and the four readouts it prints -- are new
// words on this page and they go in.
const countWords = [
  countPlan.noneNote,
  ...countPlan.options.map((o) => `${o.label} ${o.announce} ${o.note} ${o.readout}`),
].join(" ");
const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${countries.map((c) => c.name).join(" ")} ` +
    `${countPlan.label} ${countPlan.noneLabel} ${countWords}`,
  axis: `${AXES.map(([, n]) => n).join(" ")} ${ceiling} %`,
  annot: `${plateReadout} ${countPlan.options.map((o) => o.readout).join(" ")}`,
  value: countries.flatMap((c) => AXES.map(([k]) => fr(c.shares[k]))).join(" "),
};
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
  let outPath = null;
  try {
    ({ outPath } = await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedRadarWeb,
      props: {
        axes,
        shapes, rings, ceiling,
        ceilingLabel: `${ceiling} %`,
        countPlan,
        plateReadout,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt: plain(
          `Deux formes superposées sur huit axes. Celle de ${a.name} pointe très loin sur l'axe du ` +
            `nucléaire (${fr(a.shares.Nuclear)} %) et reste près du centre partout ailleurs. Celle de ` +
            `${b.name} est nulle sur le nucléaire et s'étend sur l'éolien (${fr(b.shares.Wind)} %), le ` +
            `solaire (${fr(b.shares.Solar)} %), le gaz (${fr(b.shares.Gas)} %) et le charbon ` +
            `(${fr(b.shares.Coal)} %). Les deux formes ne se recouvrent presque nulle part. Un choix ` +
            `au-dessus du graphique retire des sources du compte : les axes gardent leur place et ` +
            `leur nom, les sommets restent où ils sont, et les deux formes se referment sans eux.`,
        ),
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
      // WHAT THIS BEAT SAYS ABOUT ITS OWN FRAME: NOTHING OPENS.
      //
      // A radar is radial. Its whole claim is that a distance from the centre is one number and
      // that the same distance in any direction is the same number, so the ring it is read against
      // must be a CIRCLE. Give the frame a wider ratio and the composition either draws an ellipse
      // — in which case a spoke pointing north and a spoke pointing east no longer mean the same
      // thing at the same length — or it keeps the circle and pads the sides, which is the margin
      // it already has, reached by a longer route. Measured at 1512x860, `rapport`: 831px of
      // drawing inside a 1464px track, 633px of it left as margin. That margin is the right
      // answer, and it is the owner's own: "pour les charts qui peuvent pas s'étendre garde-le
      // comme ça".
      frame: {
        extends: false,
        base: { width: FRAME.width, height: FRAME.height },
        why:
          "A radar is radial: the reading IS the distance from one centre, and the same distance " +
          "must mean the same number in every direction. A wider frame either makes the rings " +
          "ellipses, which makes the radius lie, or keeps them round and pads the sides, which is " +
          "the margin it already has. So nothing opens, the base height stays, and the surplus " +
          "width — 633px of a 1464px track at 1512x860 — stays margin on purpose.",
      },
    }));
    // THE CONTROL CHANGES THE PICTURE, MEASURED ON THE PAGE THAT WAS JUST WRITTEN. `renderWeb` runs
    // `assertInteractionPlan`, whose census discovers a filter, a stack and a yardstick by their own
    // radio ids and knows nothing of this vocabulary's -- so the refusal ships with the vocabulary
    // instead of being squatted onto another one's name. A page that fails it is removed rather than
    // left on disk, because a written file is a file somebody will open.
    assertCountChangesThePicture(await readFile(outPath, "utf8"), { ...countPlan, axes }, `renders/${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    if (outPath) await unlink(outPath).catch(() => {});
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
// A RUNNER THAT SWALLOWS A REFUSAL LOOKS EXACTLY LIKE A RUNNER THAT PRODUCED A PAGE. The exit code is
// what the difference is made of.
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
