// twin/proof/web-boxplot-france-co2-decades/render-directions-web.mjs
//
// France's CO₂ per person by decade since 1950 as box plots, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE SUMMARY IS COMPUTED, AND SO IS THE CLAIM ABOUT IT. Quartiles are the linear-interpolation
// definition, the whiskers are Tukey's 1.5 IQR fences clipped to real readings, and the beat throws
// rather than draw a "fell in every decade since the peak" headline its own medians do not support.
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
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedBoxplotWeb } from "./DirectedBoxplotWeb.tsx";

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

const title = `Le CO₂ par personne des Français a culminé dans les années ${peak.key} et baisse à chaque décennie depuis`;
const caveat =
  `Une boîte par décennie : les quartiles, la médiane en trait plein, les moustaches à 1,5 écart ` +
  `interquartile. À droite de chaque boîte, les années qu'elle résume, une par point — une ` +
  `médiane identique peut recouvrir deux décennies qui n'ont rien fait pareil. L'axe est ajusté ` +
  `aux lectures et ne part pas de zéro : une boîte encode des positions, jamais des longueurs.`;
const peakNote = `pic : ${peak.label}, médiane ${fr(peak.median)}`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quel point pour lire l'année, sa valeur, la ` +
  `médiane de sa décennie et sa position dans sa propre boîte — les ${rows.length} lectures que la ` +
  `boîte résume et que l'image fixe ne pouvait pas nommer.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · France, ${FROM}-${rows[rows.length - 1].year}`;
// Fitted to the readings, not anchored at zero: a box encodes POSITIONS, and no mark on this page
// is measured by its length from a baseline. Computed from the data so a moved file moves the axis.
const lo = Math.floor(Math.min(...boxes.map((b) => Math.min(b.min, ...b.outliers.map((o) => o.value)))));
const hi = Math.ceil(Math.max(...boxes.map((b) => Math.max(b.max, ...b.outliers.map((o) => o.value)))));
const yTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
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
      component: DirectedBoxplotWeb,
      props: {
        boxes,
        peakKey: peak.key,
        yTicks,
        title, eyebrow: EYEBROW, caveat, source, unit: UNIT, reading: readingLine, peakNote,
        alt:
          `Huit boîtes, une par décennie de ${FROM} à aujourd'hui, mesurant le CO₂ émis par ` +
          `personne en France. La médiane monte de ${fr(boxes[0].median)} tonnes dans les ` +
          `${boxes[0].label} jusqu'à ${fr(peak.median)} dans les ${peak.label}, puis baisse à ` +
          `chaque décennie jusqu'à ${fr(last.median)} dans les ${last.label} (n=${last.n}, décennie ` +
          `incomplète). À droite de chaque boîte, les années qu'elle résume sont dessinées une à une.`,
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
