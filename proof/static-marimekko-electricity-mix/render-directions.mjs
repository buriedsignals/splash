// twin/proof/static-marimekko-electricity-mix/render-directions.mjs
//
// Six countries' electricity mixes as variable-width columns, 2024, drawn once per filed direction
// through the design base. The thirteenth beat in this tree and the fourth of the nine forms the
// harvest reached with no directed component.
//
// A marimekko multiplies two scales, so a band's AREA is a quantity — and that is exactly what makes
// it easy to ship a lie. Every figure here is computed from the frozen CSV and asserted: the tracked
// band's share of the six, the two countries that hold it, and that each column's bands sum to that
// column's own total.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-marimekko-electricity-mix/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedMarimekko } from "./DirectedMarimekko.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const YEAR = 2024;
const UNIT = "TWh";
const EYEBROW = "Énergie · Europe";
const TRACKED = "Coal";
const refused = [];

/** Stacked bottom to top in family order: fossil first, then nuclear, then the renewables — so the
 *  tracked band sits at the foot of every column where the eye lands first, and the order means
 *  something rather than repeating the CSV's.
 *
 *  THE ORDER IS THE ENCODING. Fossil, then nuclear, then the renewables: an ordinal axis, which is
 *  what lets the plate colour its nine bands with one sequential ramp of the direction's own accent
 *  instead of nine categorical hues or nine greys. The families are kept here because the order is
 *  built from them and because the reading line names them. */
const SOURCES = [
  { column: "Coal", label: "Charbon", family: "fossile" },
  { column: "Oil", label: "Pétrole", family: "fossile" },
  { column: "Gas", label: "Gaz", family: "fossile" },
  { column: "Nuclear", label: "Nucléaire", family: "nucléaire" },
  { column: "Bioenergy", label: "Bioénergie", family: "renouvelable" },
  { column: "Other renewables", label: "Autres renouv.", family: "renouvelable" },
  { column: "Hydropower", label: "Hydraulique", family: "renouvelable" },
  { column: "Solar", label: "Solaire", family: "renouvelable" },
  { column: "Wind", label: "Éolien", family: "renouvelable" },
];
const FRENCH = {
  France: "France",
  Germany: "Allemagne",
  Norway: "Norvège",
  Poland: "Pologne",
  Sweden: "Suède",
  Switzerland: "Suisse",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv
  .slice(1)
  .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => Number(r.Year) === YEAR);

const columns = rows
  .map((r) => ({
    key: r.Entity,
    label: french(r.Entity),
    bands: SOURCES.map((s) => ({ key: s.column, label: s.label, value: Number(r[s.column]) })),
    total: SOURCES.reduce((sum, s) => sum + Number(r[s.column]), 0),
  }))
  .sort((a, b) => b.total - a.total);

// THE AREAS ARE A PRODUCT OF TWO SCALES, so the arithmetic under them is checked before drawing.
for (const c of columns) {
  const summed = c.bands.reduce((sum, b) => sum + b.value, 0);
  if (Math.abs(summed - c.total) > 1e-9)
    throw new Error(`${c.key}: bands sum to ${summed} against a total of ${c.total}`);
}

/**
 * THE REMOVAL LADDER'S R8, AND IT IS THE ONLY RUNG THIS FORM HAS.
 *
 * `DirectedMarimekko` refuses a column narrower than 26px — the width a two-digit percentage needs,
 * and the IEA's marginal cost curve is the corpus's worked case of what a sliver-wide column tells a
 * reader. MEASURED at 1080x1080 and 1080x1920: the six columns share 303px there, and Switzerland is
 * 4.8 % of the six, so its column comes to 14.3px. It is not a layout problem — clearing the 26px
 * floor at 4.8 % needs 542px of plot on a 540px plate, and no rung of any ladder can produce that.
 *
 * So the two narrowest countries share ONE column, which is Horak §2.4.4's reclassification with
 * §2.4.5's condition attached: the column is NAMED for both of them, its bands are the two mixes
 * added, and the standfirst says it happened. Nothing is dropped and no figure moves — every
 * assertion above still runs over all six.
 */
const drawnColumns =
  SIZE === "landscape"
    ? columns
    : (() => {
        const kept = columns.slice(0, -2);
        const [a, b] = columns.slice(-2);
        return [
          ...kept,
          {
            key: `${a.key}+${b.key}`,
            /** THE SHARED COLUMN'S NAME IS ABBREVIATED, and that is a width decision with a
             *  measured cause: « NORVÈGE + SUISSE » sets 250px in the tracked capitals `nocturne`
             *  gives the annot register, against a 292px band that has four other names to fit.
             *  Laid out in full it was pulled 49px off its own column and came to rest under
             *  « ALLEMAGNE ». Both names are written out in the reading line below the plot. */
            label: `${a.label.slice(0, 3)}. + ${b.label}`,
            bands: a.bands.map((band, i) => ({
              ...band,
              value: band.value + b.bands[i].value,
            })),
            total: a.total + b.total,
          },
        ].sort((x, y) => y.total - x.total);
      })();
const merged = drawnColumns.length !== columns.length;

/**
 * R8 AGAIN, ON THE OTHER AXIS — because at square the refusal moved there.
 *
 * With the two narrowest countries sharing a column the width floor is cleared at square (the
 * narrowest of five is 10.5 % of the six, 45px of a 428px band). What refused instead was the
 * HEIGHT: nine stacked bands owe one line of the value register each — 114px in `nocturne` — and
 * every rung of the copy ladder left 23px of plot. Half a plate of header and footer cannot be
 * bought back by setting the same nine bands smaller; that is the sliver argument again, turned
 * ninety degrees.
 *
 * So the two SMALLEST pairs in the stack are reclassified, each inside its own family and each
 * contiguous in the order the stack already encodes: oil and gas become one fossil band (157 TWh of
 * 1 638), bioenergy and the residual renewables become one renewable band (83 TWh). Seven bands,
 * nothing dropped, every value added — and the reading line says both merges happened. Coal, which
 * the headline is about, is never merged; nor is any band big enough to stand alone.
 */
const SQUARE_SOURCES = [
  { column: "Coal", label: "Charbon", family: "fossile", parts: ["Coal"] },
  { column: "Oil+Gas", label: "Pétrole et gaz", family: "fossile", parts: ["Oil", "Gas"] },
  { column: "Nuclear", label: "Nucléaire", family: "nucléaire", parts: ["Nuclear"] },
  { column: "Hydropower", label: "Hydraulique", family: "renouvelable", parts: ["Hydropower"] },
  { column: "Solar", label: "Solaire", family: "renouvelable", parts: ["Solar"] },
  { column: "Wind", label: "Éolien", family: "renouvelable", parts: ["Wind"] },
  {
    column: "Bioenergy+Other",
    label: "Bioén. + autres",
    family: "renouvelable",
    parts: ["Bioenergy", "Other renewables"],
  },
];
const drawnSources =
  SIZE === "square" ? SQUARE_SOURCES : SOURCES.map((s) => ({ ...s, parts: [s.column] }));
const bandsMerged = drawnSources.length !== SOURCES.length;
const regroup = (bands) =>
  drawnSources.map((s) => ({
    key: s.column,
    label: s.label,
    value: s.parts.reduce((sum, part) => sum + bands.find((b) => b.key === part).value, 0),
  }));
const drawnBandColumns = bandsMerged
  ? drawnColumns.map((c) => ({ ...c, bands: regroup(c.bands) }))
  : drawnColumns;
// The regrouping is an addition and nothing else: every column's bands must still sum to the total
// asserted over the ungrouped CSV above.
for (const c of drawnBandColumns) {
  const summed = c.bands.reduce((sum, b) => sum + b.value, 0);
  if (Math.abs(summed - c.total) > 1e-9)
    throw new Error(`${c.key}: regrouped bands sum to ${summed} against a total of ${c.total}`);
}

const grand = columns.reduce((sum, c) => sum + c.total, 0);
const trackedTotal = columns.reduce(
  (sum, c) => sum + c.bands.find((b) => b.key === TRACKED).value,
  0,
);
const trackedShare = trackedTotal / grand;
const holders = columns
  .map((c) => ({ key: c.key, value: c.bands.find((b) => b.key === TRACKED).value }))
  .sort((a, b) => b.value - a.value);
const topTwoShare = (holders[0].value + holders[1].value) / trackedTotal;
if (topTwoShare < 0.95)
  throw new Error(
    `the headline says two countries hold nearly all of it; they hold ${(topTwoShare * 100).toFixed(1)} %`,
  );

const facts = beatFacts(
  drawnBandColumns.map((c) => ({ key: c.key, label: c.label, value: c.total })),
  {
    subject: holders[0].key,
    widths: drawnBandColumns.map((c) => ({ key: c.key, value: c.total })),
    namedSeries: drawnSources.map((s) => s.label),
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${columns.length} colonnes · la plus étroite ${(facts.smallestWidthShare * 100).toFixed(1)} % du total · ` +
    `${TRACKED} ${(trackedShare * 100).toFixed(1)} % dont ${(topTwoShare * 100).toFixed(1)} % dans ` +
    `${french(holders[0].key)} + ${french(holders[1].key)} · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

/** `fr-FR` groups thousands with a NARROW no-break space and no face on these ladders covers it —
 *  see METHOD correction 25, where the same trap took three beats in a row. */
const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const format = (v) => whole(v);
const percent = (share) =>
  share >= 0.095
    ? `${Math.round(share * 100)} %`
    : share >= 0.005
      ? `${plainSpaces((share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))} %`
      : "";

/** THREE FORMS OF EACH, LONGEST FIRST — the component's ladder spends the standfirst before the
 *  headline. Measured at 1080x1080, the long forms leave no plot at all; the third form of each was
 *  filed when square proved that two rungs are not a ladder. */
const title = [
  `Le charbon fait ${(trackedShare * 100).toFixed(0)} % de l’électricité de ces six pays, et il tient dans deux colonnes`,
  `Le charbon de ces six pays tient dans deux colonnes`,
  `Le charbon tient dans deux colonnes`,
];
const limitsLong =
  `Production électrique ${YEAR}, par source. La LARGEUR de chaque colonne est la production du pays ` +
  `en ${UNIT}, sa hauteur son mix : l’aire d’une bande est donc une quantité. ` +
  `${one(trackedTotal)} ${UNIT} de charbon sur ${whole(grand)} au total, dont ` +
  `${one(topTwoShare * 100)} % en ${french(holders[0].key)} et en ${french(holders[1].key)}.`;
const limits = [
  limitsLong,
  `Production électrique ${YEAR}, par source. La LARGEUR d’une colonne est la production du pays en ` +
    `${UNIT}, sa hauteur son mix : l’aire d’une bande est une quantité.`,
  /** THE SHORTEST STANDFIRST STILL SAYS THE WIDTH IS A QUANTITY, because that is the one thing a
   *  reader of this form has to be told and nothing else on the plate says it in a sentence. What
   *  it gives up is the unit and the totals — both of which the brace under each column prints,
   *  with `Largeur : production totale, en TWh` set beneath them. */
  `Production électrique ${YEAR} : la largeur d’une colonne est la production, sa hauteur son mix.`,
];
/** THE MERGE NOTE IS NOT ON THE LADDER. It is R8's own condition — the reader is told the plate
 *  reclassified — so it heads every form and the shortest form is it alone. What the ladder may
 *  spend is the rest of the reading line, which restates rules the plate already shows. */
const mergeNote = !merged
  ? ""
  : bandsMerged
    ? /** THE MERGE NOTE IS THE SHORTEST SENTENCE THAT STILL NAMES BOTH RECLASSIFICATIONS. It heads
       *  every reading rung and IS the shortest rung, so in the direction whose annot register is
       *  tracked capitals it is the footer's whole cost: the first draft ran three sentences and
       *  four lines of caps, and `nocturne` was 29px of plot short because of them. */
      `Réunis : Norvège + Suisse en une colonne, pétrole + gaz et bioénergie + autres en une bande. `
    : `Norvège et Suisse partagent une colonne : à cette taille, une colonne plus étroite aurait ` +
      `cessé d’encoder sa largeur. Leurs deux mixes y sont additionnés. `;
const reading = [
  mergeNote +
    `Lecture : chaque colonne fait 100 % de haut ; les parts sous 0,5 % ne sont pas chiffrées mais ` +
    `restent dessinées. Les sources sont nommées une fois, à droite, dans l’ordre où elles s’empilent ` +
    `dans toutes les colonnes.`,
  mergeNote + `Lecture : chaque colonne fait 100 % de haut ; les sources sont nommées à droite.`,
  mergeNote.trim() || `Lecture : chaque colonne fait 100 % de haut.`,
];
/** THE CREDIT HAS A SHORT FORM OFF LANDSCAPE, and it is a shortening rather than a removal: all
 *  three parties the long form names — who compiled, who published, who redistributed — are still
 *  named. What goes is the publication's title, which no reader follows from a plate. It is worth a
 *  line of the body register at the foot of a square frame. */
const source =
  SIZE === "landscape"
    ? "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data"
    : "Source : Ember / Energy Institute (2025), via Our World in Data";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: UNIT,
  annot:
    `${drawnBandColumns.map((c) => c.label).join(" ")} ${drawnSources.map((s) => s.label).join(" ")} ` +
    `${reading.join(" ")} Largeur : production totale, en ${UNIT}`,
  value: columns.map((c) => format(c.total)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  /** Every band's colour is derived from the direction's own accent, ground and ink — see the
   *  component. All this map carries is where each band sits in the ordered stack. */
  const families = Object.fromEntries(
    drawnSources.map((s, order) => [
      s.column,
      { family: s.family, order, total: drawnSources.length },
    ]),
  );

  try {
    await renderStill({
      element: createElement(DirectedMarimekko, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        columns: drawnBandColumns,
        onLadder: (note) => console.log(`  ${note}`),
        bandOrder: drawnSources.map((s) => s.column),
        families,
        tracked: TRACKED,
        unit: UNIT,
        widthName: `Largeur : production totale, en ${UNIT}`,
        title,
        limits,
        reading,
        source,
        alt:
          `Marimekko : six pays européens en ${YEAR}, chaque colonne aussi large que sa production ` +
          `(${whole(grand)} ${UNIT} au total) et haute de 100 % de son mix. La bande charbon, en ` +
          `accent, fait ${(trackedShare * 100).toFixed(0)} % de l’ensemble et n’est visible que dans ` +
          `les colonnes ${french(holders[0].key)} et ${french(holders[1].key)}.`,
        eyebrow: EYEBROW,
        format,
        percent,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
