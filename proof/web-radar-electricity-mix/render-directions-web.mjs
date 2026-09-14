// twin/proof/web-radar-electricity-mix/render-directions-web.mjs
//
// France against Germany, 2024 electricity, on eight axes. Rendered once per FILED DIRECTION.
//
// THE CLAIM IS ASSERTED against the frozen file: the two countries are within a fifth of each other
// and the nuclear gap is over fifty points, or the run refuses.
//
// AND THE BEAT'S OWN FINDING IS ASSERTED TOO, which is the part that is new. The catalogue sheet for
// this type says a radar's polygon AREA -- the thing a reader's eye actually judges -- moves with
// axis ORDER in a way the numbers do not, and that nothing in the type catches it. This runner
// MEASURES that: it enumerates all 5 040 orderings of the eight axes, takes the span of each
// country's area and of the ratio between them, and refuses to render if that span is not wide
// enough to be the page's argument. Every number the page prints about it is computed here.
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
import { ringArea, assertReorderChangesThePicture } from "../../skills/chart-web/assets/reorder.ts";
import { DirectedRadarWeb } from "./DirectedRadarWeb.tsx";

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
// `chart-beat/references/types/radar.md`: a polygon's AREA is sensitive to axis order and count in a
// way the underlying numbers aren't, and the type has no guard behind it. So it is measured here,
// over every ordering there is, and the page's whole argument is refused if the measurement does not
// support it. The area itself is `ringArea` (`chart-web/assets/reorder.ts`) -- the shoelace area of
// a closed polygon on evenly spaced spokes, which collapses to a sum over ADJACENT PAIRS and is
// exactly why order moves it.
const PLATE_ORDER = AXES.map(([k]) => k);
const disc = Math.PI * ceiling * ceiling;
/** The share of the ceiling ring's own disc this ordering's polygon covers, in percent. The disc is
 *  the only thing on the plate an area can honestly be stated against: it is what a reading of
 *  `ceiling` on every axis at once would enclose. */
const areaPct = (order, country) => (ringArea(order.map((k) => country.shares[k])) / disc) * 100;
const ratioOf = (order) => areaPct(order, b) / areaPct(order, a);

const permutations = (rest) =>
  rest.length <= 1
    ? [rest]
    : rest.flatMap((x, i) =>
        permutations([...rest.slice(0, i), ...rest.slice(i + 1)]).map((p) => [x, ...p]),
      );
// Rotations of one ordering draw the same polygon turned on the spot, so the first spoke is held
// fixed and the other seven are permuted: 7! = 5 040 orderings, which pair off under reflection into
// 2 520 distinct shapes (reversing an ordering mirrors the polygon and leaves its area untouched).
const everyOrder = permutations(PLATE_ORDER.slice(1)).map((p) => [PLATE_ORDER[0], ...p]);
const distinctShapes = new Set(
  everyOrder.map((order) => {
    const n = order.length;
    const forms = [];
    for (const seq of [order, [...order].reverse()])
      for (let s = 0; s < n; s++) forms.push(seq.slice(s).concat(seq.slice(0, s)).join(" "));
    forms.sort();
    return forms[0];
  }),
).size;

const span = (pick) => {
  let lo = { v: Infinity, order: null };
  let hi = { v: -Infinity, order: null };
  for (const order of everyOrder) {
    const v = pick(order);
    if (v < lo.v) lo = { v, order };
    if (v > hi.v) hi = { v, order };
  }
  return { lo, hi };
};
const frSpan = span((order) => areaPct(order, a));
const ratioSpan = span(ratioOf);
const frFactor = frSpan.hi.v / frSpan.lo.v;

if (!(frFactor > 2))
  throw new Error(
    `this page's whole argument is that a radar's area is a layout decision; across all ` +
      `${everyOrder.length} orderings ${a.name}'s area only moves by a factor of ${fr(frFactor, 2)} — ` +
      "not enough to be worth a reader's gesture, so the beat should ship as a still",
  );
if (!(ratioSpan.lo.v < 1 && ratioSpan.hi.v > 1))
  throw new Error(
    `the page says the ordering can turn "who covers more" all the way round; the ratio only spans ` +
      `${fr(ratioSpan.lo.v, 2)} to ${fr(ratioSpan.hi.v, 2)}, which never crosses 1 — rewrite the ` +
      "claim before rendering",
  );

const plateRatio = ratioOf(PLATE_ORDER);
const byShare = (country) => [...PLATE_ORDER].sort((x, y) => country.shares[y] - country.shares[x]);
const ORDERS = {
  france: byShare(a),
  allemagne: byShare(b),
  "avantage-france": ratioSpan.lo.order,
};
console.log(
  `\naire (en % du disque de ${ceiling} %) sur ${everyOrder.length} ordres, ${distinctShapes} formes distinctes :\n` +
    `  ${a.name} de ${fr(frSpan.lo.v, 2)} à ${fr(frSpan.hi.v, 2)} (facteur ${fr(frFactor, 2)})\n` +
    `  rapport ${b.name}/${a.name} de ${fr(ratioSpan.lo.v, 2)} à ${fr(ratioSpan.hi.v, 2)}\n`,
);
console.table(
  [["la plaque", PLATE_ORDER], ...Object.entries(ORDERS)].map(([name, order]) => ({
    ordre: name,
    [a.name]: fr(areaPct(order, a), 2),
    [b.name]: fr(areaPct(order, b), 2),
    rapport: fr(ratioOf(order), 2),
  })),
);

// ── WHAT THE READER MAY REORDER ───────────────────────────────────────────────────────────────
// The words and the orderings only. Where the eighth spoke of a circle lands is arithmetic only the
// thing that owns the scale can do, and `reorder.ts` refuses an ordering that draws a polygon
// already on the page or that moves no area at all.
const nameOf = Object.fromEntries(AXES);
const listOf = (order) => order.map((k) => nameOf[k]).join(", ");
// THE READOUT IS SHORT BECAUSE TWO OF THE THREE FILED DIRECTIONS SET THE ANNOTATION REGISTER IN
// TRACKED UPPERCASE. At its first length -- the ordering's own name, then both areas, then the ratio
// -- it wrapped to three lines of shouting over the drawing in `nocturne` and `rapport`. Which
// ordering is showing is already said by the chosen pill and spelled out in the sentence under the
// control; what the plot owes the reader is the two numbers their eye cannot get from the polygons.
const areaWords = (order) =>
  `Aire · ${a.name} ${fr(areaPct(order, a), 2)} % · ${b.name} ${fr(areaPct(order, b), 2)} % du disque ` +
  `· ${fr(ratioOf(order), 2)} fois`;
const plateReadout = plain(areaWords(PLATE_ORDER));

const reorderPlan = {
  label: "Ordre des axes",
  noneLabel: "la plaque",
  options: [
    {
      key: "france",
      label: "sur la France",
      announce: plain(
        `Ranger les axes sur la France : les huit sources par part décroissante de l'électricité française`,
      ),
      note: plain(
        `Trié sur la ${a.name}, le tri que fait n'importe quel tableur : ` +
          `${fr(areaPct(ORDERS.france, a), 2)} % du disque contre ${fr(areaPct(ORDERS.france, b), 2)} %, ` +
          `soit ${fr(ratioOf(ORDERS.france), 2)} fois au lieu de ${fr(plateRatio, 2)}.`,
      ),
      readout: plain(areaWords(ORDERS.france)),
      order: ORDERS.france,
      alt: plain(
        `Les deux mêmes formes, sur les mêmes huit axes rangés par part décroissante en ${a.name} : ` +
          `${listOf(ORDERS.france)}. Les valeurs sont identiques ; les deux polygones couvrent ` +
          `${fr(areaPct(ORDERS.france, a), 2)} % et ${fr(areaPct(ORDERS.france, b), 2)} % du disque.`,
      ),
    },
    {
      key: "allemagne",
      label: "sur l'Allemagne",
      announce: plain(
        `Ranger les axes sur l'Allemagne : la même règle, appliquée à l'électricité allemande`,
      ),
      note: plain(
        `Le même tri sur l'${b.name} : ${fr(areaPct(ORDERS.allemagne, a), 2)} % contre ` +
          `${fr(areaPct(ORDERS.allemagne, b), 2)} %, soit ${fr(ratioOf(ORDERS.allemagne), 2)} fois au ` +
          `lieu de ${fr(plateRatio, 2)}. Une règle, deux pays, deux réponses.`,
      ),
      readout: plain(areaWords(ORDERS.allemagne)),
      order: ORDERS.allemagne,
      alt: plain(
        `Les deux mêmes formes, sur les mêmes huit axes rangés par part décroissante en ${b.name} : ` +
          `${listOf(ORDERS.allemagne)}. Les valeurs sont identiques ; les deux polygones couvrent ` +
          `${fr(areaPct(ORDERS.allemagne, a), 2)} % et ${fr(areaPct(ORDERS.allemagne, b), 2)} % du disque.`,
      ),
    },
    {
      key: "avantage-france",
      label: "au plus flatteur pour la France",
      announce: plain(
        `Ranger les axes au plus flatteur pour la France : l'ordre, trouvé par énumération, où la ` +
          `forme française couvre le plus par rapport à l'allemande`,
      ),
      note: plain(
        `Trouvé en énumérant les ${fr(everyOrder.length, 0)} ordres, choisi par personne : ` +
          `${fr(areaPct(ORDERS["avantage-france"], a), 2)} % contre ` +
          `${fr(areaPct(ORDERS["avantage-france"], b), 2)} %, soit ` +
          `${fr(ratioOf(ORDERS["avantage-france"]), 2)} fois. L'ordre a inversé la réponse.`,
      ),
      readout: plain(areaWords(ORDERS["avantage-france"])),
      order: ORDERS["avantage-france"],
      alt: plain(
        `Les deux mêmes formes, sur les mêmes huit axes rangés dans l'ordre le plus flatteur pour la ` +
          `${a.name} : ${listOf(ORDERS["avantage-france"])}. La forme française est maintenant la ` +
          `plus grande des deux, à ${fr(areaPct(ORDERS["avantage-france"], a), 2)} % du disque contre ` +
          `${fr(areaPct(ORDERS["avantage-france"], b), 2)} %.`,
      ),
    },
  ],
};

const shapes = countries.map((c, i) => ({
  code: c.code,
  name: c.name,
  tone: i === 0 ? "a" : "b",
  values: Object.fromEntries(AXES.map(([k]) => [k, c.shares[k]])),
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
// EVERY WORD HERE IS PRINTED IN EVERY STATE THE CONTROL CAN PRODUCE. The claim is the two mixes,
// not the two shapes, so the shares that carry it are on the plate and not behind a gesture.
//
// WHAT IS NOT HERE, AND THE REASON. The plate used to narrate its own two treatments -- "the grid is
// made of CIRCLES, a polygonal one would make the same value look larger near an axis" and "two
// shapes, never three". Both are spent in the DRAWING, which is where a treatment lives: the rings
// are concentric circles with the outermost carrying its own value, and the legend names exactly two
// countries. The words cost a wrapped line of the caveat at 375 px, and every pixel of this figure's
// height is spoken for by the reading the control owes a reader who cannot see the picture.
const caveat = plain(
  `Mix électrique ${YEAR}, en part de la production de chaque pays. ` +
    `${fr(a.total, 0)} TWh contre ${fr(b.total, 0)} — à ${fr(sizeGap * 100, 0)} % l'un de l'autre. ` +
    `Nucléaire ${fr(a.shares.Nuclear)} % contre ${fr(b.shares.Nuclear, 0)} %, éolien et solaire ` +
    `${fr(a.shares.Wind + a.shares.Solar)} % contre ${fr(b.shares.Wind + b.shares.Solar)} %.`,
);
// THE BEAT'S OWN FINDING, PRINTED RATHER THAN HIDDEN BEHIND THE CONTROL THAT DEMONSTRATES IT. A
// reader who touches nothing is still told that the area they are about to judge is a layout
// decision; the control only lets them watch it happen.
const readingLine = plain(
  `Lecture : l'aire d'un radar ne mesure rien. Sur ses ${fr(everyOrder.length, 0)} ordres, celle de la ` +
    `${a.name} va de ${fr(frSpan.lo.v, 2)} % à ${fr(frSpan.hi.v, 2)} % du disque et le rapport ` +
    `${b.name}/${a.name} de ${fr(ratioSpan.lo.v, 2)} à ${fr(ratioSpan.hi.v, 2)}, sans qu'un chiffre ` +
    `bouge. Survolez un sommet.`,
);
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

// A REGISTER'S DECLARED TEXT IS WHAT THE PAGE'S OWN FACES ARE SUBSETTED FROM, so a glyph the page can
// display and no register names is a glyph the delivered file cannot draw. The control's own words --
// the legend, the four pills, the three sentences it reveals and the four readouts it prints -- are
// new words on this page and they go in.
const reorderWords = reorderPlan.options
  .map((o) => `${o.label} ${o.announce} ${o.note} ${o.readout}`)
  .join(" ");
const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${countries.map((c) => c.name).join(" ")} ` +
    `${reorderPlan.label} ${reorderPlan.noneLabel} ${reorderWords}`,
  axis: `${AXES.map(([, n]) => n).join(" ")} ${ceiling} %`,
  annot: `${plateReadout} ${reorderPlan.options.map((o) => o.readout).join(" ")}`,
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
      component: DirectedRadarWeb,
      props: {
        axes: AXES.map(([key, name]) => ({ key, name })),
        shapes, rings, ceiling,
        ceilingLabel: `${ceiling} %`,
        reorderPlan,
        plateReadout,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt: plain(
          `Deux formes superposées sur huit axes. Celle de ${a.name} pointe très loin sur l'axe du ` +
            `nucléaire (${fr(a.shares.Nuclear)} %) et reste près du centre partout ailleurs. Celle de ` +
            `${b.name} est nulle sur le nucléaire et s'étend sur l'éolien (${fr(b.shares.Wind)} %), le ` +
            `solaire (${fr(b.shares.Solar)} %), le gaz (${fr(b.shares.Gas)} %) et le charbon ` +
            `(${fr(b.shares.Coal)} %). Les deux formes ne se recouvrent presque nulle part. Un choix ` +
            `au-dessus du graphique range les huit axes autrement : les mêmes valeurs, aux mêmes ` +
            `rayons, sur des rayons échangés — et les deux aires changent.`,
        ),
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    }));
    // THE CONTROL CHANGES THE PICTURE, MEASURED ON THE PAGE THAT WAS JUST WRITTEN. `renderWeb` runs
    // `assertInteractionPlan`, whose census discovers a filter, a stack and a yardstick by their own
    // radio ids and knows nothing of this vocabulary's -- so the refusal ships with the vocabulary
    // instead of being squatted onto another one's name. A page that fails it is removed rather than
    // left on disk, because a written file is a file somebody will open.
    assertReorderChangesThePicture(await readFile(outPath, "utf8"), { ...reorderPlan, axes: AXES.map(([key, name]) => ({ key, name })) }, `renders/${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    if (outPath) await unlink(outPath).catch(() => {});
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
// A RUNNER THAT SWALLOWS A REFUSAL LOOKS EXACTLY LIKE A RUNNER THAT PRODUCED A PAGE. The exit code
// is what the difference is made of.
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
