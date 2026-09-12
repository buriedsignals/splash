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
import { DirectedHistogramWeb } from "./DirectedHistogramWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const YEAR = 2023;
const BIN = 2;
const THRESHOLD = 4;
const UNIT = "t CO₂ par personne";

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

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(share > 55 && share < 70))
  throw new Error(`the headline says about six in ten are under ${THRESHOLD} t; ${fr(share)} % are`);
const highest = rows[rows.findIndex((r) => r.value === Math.max(...rows.map((z) => z.value)))];
console.log(
  `${rows.length} pays en ${YEAR} · ${under.length} sous ${THRESHOLD} t (${fr(share)} %) · médiane ` +
    `${fr(median)} t · maximum ${highest.entity} ${fr(highest.value)} t\n`,
);

const lastEdge = Math.ceil(Math.max(...rows.map((r) => r.value)) / BIN) * BIN;
const edges = Array.from({ length: lastEdge / BIN }, (_, i) => i * BIN);
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
    count: inBin.length,
    inClaim: to <= THRESHOLD,
    label: isLast ? `${from} et plus` : `${from}–${to}`,
    detail:
      `${isLast ? `${from} ${UNIT} et plus` : `de ${from} à moins de ${to} ${UNIT}`} · ` +
      `${inBin.length} pays (${fr((inBin.length / rows.length) * 100)} % du total) · ` +
      `${fr((running / rows.length) * 100)} % des pays sont sous ${isLast ? "ce palier et au-delà" : `${to} t`}` +
      (inBin.length ? ` · ${named.join(", ")}${inBin.length > named.length ? ` et ${inBin.length - named.length} autres` : ""}` : ""),
  };
});

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

const title = `${under.length} pays sur ${rows.length} émettent moins de ${THRESHOLD} tonnes de CO₂ par personne`;
const caveat =
  `Un pays par observation, ${rows.length} en tout, rangés par paliers de ${BIN} tonnes. Chaque ` +
  `palier est nommé par SES DEUX BORDS, et le dernier dit qu'il est ouvert : un axe gradué ` +
  `« 0 2 4 6 » laisse le lecteur deviner de quel côté de 4 tombe un pays qui émet exactement 4.`;
const claimNote = `${fr(share)} % des pays sous ${THRESHOLD} t`;
const medianNote = `médiane ${fr(median)} t`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un palier pour lire son intervalle, son effectif, sa part ` +
  `du total, la part cumulée jusqu'à son bord haut et les pays qui s'y trouvent — un histogramme ` +
  `dit « combien sont tombés là » et refuse de dire QUI.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${YEAR}, ${rows.length} pays`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${UNIT}`,
  annot: `${claimNote} ${medianNote}`,
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
      component: DirectedHistogramWeb,
      props: {
        bars, yTicks, xTicks, binWidth: BIN, median,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, medianNote,
        alt:
          `Un histogramme très déséquilibré vers la droite : ${rows.length} pays rangés par paliers ` +
          `de ${BIN} tonnes de CO₂ par personne en ${YEAR}. Les deux premiers paliers, colorés, ` +
          `contiennent ${under.length} pays — ${fr(share)} % du total. La médiane est à ` +
          `${fr(median)} tonnes. La queue de droite s'étire jusqu'à ${fr(highest.value)} tonnes ` +
          `(${highest.entity}), avec un ou deux pays par palier.`,
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
