// twin/proof/web-streamgraph-swiss-electricity/render-directions-web.mjs
//
// Switzerland's electricity by source, 2000 to 2024, as a streamgraph. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE RANK AND THE YEAR IT WAS REACHED ARE COMPUTED, and the beat throws if the claim's source is not
// third from that year onward.
//
// Usage:  bun proof/web-streamgraph-swiss-electricity/render-directions-web.mjs

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
import { DirectedStreamWeb, FRAME } from "./DirectedStreamWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Suisse";
const CODE = "CHE";
const SUBJECT = "Solar";
const SOURCES = [
  ["Hydropower", "hydraulique"],
  ["Nuclear", "nucléaire"],
  ["Solar", "solaire"],
  ["Bioenergy", "biomasse"],
  ["Wind", "éolien"],
  ["Gas", "gaz"],
  ["Oil", "pétrole"],
  ["Coal", "charbon"],
  ["Other renewables", "autres renouv."],
];

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
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
    for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
    return o;
  })
  .filter((r) => r.code === CODE)
  .sort((a, b) => a.year - b.year);
if (!rows.length) throw new Error(`the frozen file carries no ${CODE} rows`);
for (let i = 1; i < rows.length; i += 1)
  if (rows[i].year !== rows[i - 1].year + 1)
    throw new Error(`the series skips from ${rows[i - 1].year} to ${rows[i].year}`);

const years = rows.map((r) => r.year);
const totalOf = (r) => SOURCES.reduce((s, [k]) => s + r[k], 0);
const rankOf = (r, key) =>
  SOURCES.map(([k]) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((z) => z.k === key) + 1;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const firstThird = rows.find((r) => rankOf(r, SUBJECT) <= 3);
if (!firstThird) throw new Error(`${SUBJECT} never reaches third place in this series`);
const heldSince = rows.filter((r) => r.year >= firstThird.year).every((r) => rankOf(r, SUBJECT) <= 3);
if (!heldSince) throw new Error(`${SUBJECT} reached third in ${firstThird.year} and did not hold it`);
const first = rows[0];
const last = rows[rows.length - 1];
console.log(
  `${rows.length} années ${years[0]}-${years[years.length - 1]} · solaire ${fr(first[SUBJECT], 2)} -> ` +
    `${fr(last[SUBJECT], 2)} TWh · troisième source depuis ${firstThird.year}, sans interruption · ` +
    `total ${fr(totalOf(first))} -> ${fr(totalOf(last))} TWh\n`,
);
console.table(
  SOURCES.map(([k, n]) => ({ source: n, [years[0]]: fr(first[k], 2), [years[years.length - 1]]: fr(last[k], 2) })),
);

// ── geometry: a wiggle baseline, computed ─────────────────────────────────────────────────────
const maxTotal = Math.max(...rows.map(totalOf));
const x = (year) => ((year - years[0]) / (years[years.length - 1] - years[0])) * FRAME.width;
const scale = (FRAME.height * 0.9) / maxTotal;
/** The baseline every band is stacked on: centred, so the stream is symmetric about the middle. */
const baseline = rows.map((r) => FRAME.height / 2 + (totalOf(r) * scale) / 2);

const stacked = rows.map((r, i) => {
  let y = baseline[i];
  const out = {};
  for (const [k] of SOURCES) {
    const h = r[k] * scale;
    out[k] = { bottom: y, top: y - h };
    y -= h;
  }
  return out;
});

const bands = SOURCES.map(([key, name], tone) => {
  const top = rows.map((r, i) => `${i === 0 ? "M" : "L"} ${x(r.year)} ${stacked[i][key].top}`).join(" ");
  const bottom = [...rows]
    .map((r, i) => ({ r, i }))
    .reverse()
    .map(({ r, i }) => `L ${x(r.year)} ${stacked[i][key].bottom}`)
    .join(" ");
  const thickest = rows.reduce((best, r, i) => (r[key] > rows[best][key] ? i : best), 0);
  const h = stacked[thickest][key].bottom - stacked[thickest][key].top;
  return {
    key,
    name,
    tone,
    path: `${top} ${bottom} Z`,
    label:
      h >= 18
        ? {
            // Clamped away from both edges: the thickest year of a band that peaks at the end of
            // the record is the last one, and a label centred there is half outside the frame.
            x: Math.min(Math.max(x(rows[thickest].year), FRAME.width * 0.08), FRAME.width * 0.92),
            y: (stacked[thickest][key].top + stacked[thickest][key].bottom) / 2,
            text: name,
          }
        : null,
  };
});

const marks = [];
for (const [key, name] of SOURCES) {
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const h = stacked[i][key].bottom - stacked[i][key].top;
    if (h < 3) continue;
    marks.push({
      key: `${key}-${r.year}`,
      x: x(r.year),
      y: (stacked[i][key].top + stacked[i][key].bottom) / 2,
      detail:
        `${name} · ${r.year} · ${fr(r[key], 2)} TWh · ${fr((r[key] / totalOf(r)) * 100)} % de ` +
        `l'électricité suisse cette année-là · ${rankOf(r, key)}ᵉ source sur ${SOURCES.length}`,
    });
  }
}

const crossingIndex = rows.findIndex((r) => r.year === firstThird.year);
const crossing = {
  x: x(firstThird.year),
  y: (stacked[crossingIndex][SUBJECT].top + stacked[crossingIndex][SUBJECT].bottom) / 2,
  text: `${firstThird.year} : le solaire passe troisième`,
};

const facts = beatFacts(
  SOURCES.map(([k, n]) => ({ key: k, label: n, value: last[k] })),
  { subject: "solaire", declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const xTicks = years.filter((y) => y % 5 === 0).map((year) => ({ year, x: x(year) }));

const title = `Le solaire suisse est passé de ${fr(first[SUBJECT], 2)} à ${fr(last[SUBJECT], 2)} TWh — troisième source du pays depuis ${firstThird.year}`;
const caveat =
  `Production d'électricité suisse par source, ${years[0]} à ${years[years.length - 1]}. La ligne ` +
  `de base d'un streamgraph FLOTTE : aucune bande ne se mesure depuis un zéro fixe, donc la page ` +
  `n'a pas d'axe des valeurs — elle écrit le total aux deux bouts et confie chaque chiffre au ` +
  `pointeur.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quel endroit d'une bande pour lire la source, ` +
  `l'année, ses TWh, sa part de cette année-là et son rang. Un streamgraph est le graphique le moins ` +
  `mesurable de ce catalogue : on voit une bande enfler et on ne peut dire ni de combien, ni depuis ` +
  `quoi, ni quand elle a dépassé sa voisine.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Suisse, ${years[0]}-${years[years.length - 1]}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${SOURCES.map(([, n]) => n).join(" ")}`,
  axis: xTicks.map((t) => t.year).join(" "),
  annot: `${crossing.text} total ${fr(totalOf(first))} TWh total ${fr(totalOf(last))} TWh`,
  value: SOURCES.map(([, n]) => n).join(" "),
};
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
      component: DirectedStreamWeb,
      props: {
        bands, marks, xTicks,
        tones: SOURCES.length,
        toneLabels: SOURCES.map(([, n]) => n),
        totals: { left: `${years[0]} : ${fr(totalOf(first))} TWh`, right: `${years[years.length - 1]} : ${fr(totalOf(last))} TWh` },
        crossing,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un flux de neuf bandes empilées sur une ligne de base flottante, de ${years[0]} à ` +
          `${years[years.length - 1]}. Les deux bandes les plus épaisses, l'hydraulique et le ` +
          `nucléaire, tiennent presque toute la hauteur. Une bande fine, le solaire, part d'un filet ` +
          `invisible et s'épaissit régulièrement jusqu'à ${fr(last[SUBJECT], 2)} TWh ; elle passe ` +
          `troisième en ${firstThird.year} et le reste.`,
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
