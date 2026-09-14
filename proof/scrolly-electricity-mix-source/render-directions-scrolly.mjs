// Six countries' 2024 electricity by family, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `stacked bar` type (100 %) in the scrolly format.
//
// THE SUBJECT OF `static-electricity-mix-source`, CHOREOGRAPHED. The six countries, the three families and the claim are
// the static beat's own; the static predates the design base and is set in English, so this beat is set in French
// through the filed directions. The scroll tells it with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. renewables alone, sorted: Norway 99 %;
//   2. nuclear stacked on top;
//   3. fossil closing every column at 100 %: Poland 69 %;
//   4. re-sorted by fossil share, fossil moved to the baseline;
//   5. renewables and nuclear merged into one low-carbon share;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-electricity-mix-source/render-directions-scrolly.mjs

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
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedMixScrolly } from "./DirectedMixScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const YEAR = 2024;
const FAMILIES = [
  { label: "renouvelables", columns: ["Hydropower", "Wind", "Solar", "Bioenergy", "Other renewables"] },
  { label: "nucléaire", columns: ["Nuclear"] },
  { label: "fossile", columns: ["Gas", "Oil", "Coal"] },
];
const FRENCH = { France: ["France", "la France", "en France"], Germany: ["Allemagne", "l’Allemagne", "en Allemagne"], Norway: ["Norvège", "la Norvège", "en Norvège"], Poland: ["Pologne", "la Pologne", "en Pologne"], Sweden: ["Suède", "la Suède", "en Suède"], Switzerland: ["Suisse", "la Suisse", "en Suisse"] };

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const counted = FAMILIES.flatMap((f) => f.columns);
const uncounted = header.slice(3).filter((h) => !counted.includes(h));
if (uncounted.length) throw new Error(`source column(s) in no family: ${uncounted.join(", ")}`);
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const base = rows.map((r) => {
  if (Number(r.Year) !== YEAR) throw new Error(`${r.Entity} is not ${YEAR}`);
  if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);
  const total = counted.reduce((s, k) => s + Number(r[k]), 0);
  return { key: r.Entity, shares: FAMILIES.map((f) => (f.columns.reduce((s, k) => s + Number(r[k]), 0) / total) * 100) };
});
for (const c of base) if (Math.abs(c.shares.reduce((s, v) => s + v, 0) - 100) > 1e-9) throw new Error(`${c.key}'s families do not sum to 100 %`);
const byRen = [...base].sort((a, b) => b.shares[0] - a.shares[0]);
const byFos = [...base].sort((a, b) => b.shares[2] - a.shares[2]);
if (byRen[0].key !== "Norway" || !(byRen[0].shares[0] >= 98.5)) throw new Error(`the headline says Norway runs on 99 % renewables, the highest; ${byRen[0].key} ${byRen[0].shares[0].toFixed(1)} %`);
if (byFos[0].key !== "Poland" || Math.round(byFos[0].shares[2]) !== 69) throw new Error(`the headline says Poland leans hardest on fossil, 69 %; ${byFos[0].key} ${byFos[0].shares[2].toFixed(1)} %`);
const nuclear = base.filter((c) => c.shares[1] > 0).sort((a, b) => b.shares[1] - a.shares[1]);
if (nuclear.map((c) => c.key).join() !== "France,Switzerland,Sweden") throw new Error(`card 2 names France, Switzerland and Sweden as the nuclear countries; ${nuclear.map((c) => c.key).join(", ")}`);
const low = (c) => c.shares[0] + c.shares[1];
const above98 = base.filter((c) => low(c) > 98).sort((a, b) => low(b) - low(a));
if (above98.map((c) => c.key).sort().join() !== "Norway,Sweden,Switzerland") throw new Error(`card 5 says Norway, Sweden and Switzerland are above 98 % low-carbon; ${above98.map((c) => c.key).join(", ")}`);
const france = base.find((c) => c.key === "France");
if (!(low(france) > 90 && low(france) < 98)) throw new Error(`card 5 puts France just under them; ${low(france).toFixed(1)} %`);
console.log(`${base.map((c) => `${c.key} ${c.shares.map((v) => v.toFixed(1)).join("/")}`).join(" · ")}\n`);

const pct = (v) => `${Math.round(v)}${NB}%`;
const columns = base.map((c) => ({ key: c.key, label: FRENCH[c.key][0], shares: c.shares, texts: c.shares.map((v) => (v >= 1 ? pct(v) : "")), lowText: pct(low(c)) }));
const indexOf = (c) => base.indexOf(c);
const orders = [byRen.map(indexOf), byFos.map(indexOf)];
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const [norway, poland] = [byRen[0], byFos[0]];
const germany = base.find((c) => c.key === "Germany");

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La Norvège tourne à ${pct(norway.shares[0])} de renouvelables, la Pologne s’appuie sur le fossile`,
  `Norvège ${pct(norway.shares[0])} renouvelables, Pologne ${pct(poland.shares[2])} fossile`,
  `Six mix électriques, famille par famille`,
];
const prose = [
  [`La production électrique de six pays européens en ${YEAR}, chaque colonne à 100${NB}% de celle du pays. D’abord les renouvelables : ${pct(norway.shares[0])} en Norvège, ${pct(france.shares[0])} en France.`],
  [`Le nucléaire par-dessus : ${listOf(nuclear.map((c) => `${pct(c.shares[1])} ${FRENCH[c.key][2]}`))}. Les trois autres n’en ont pas.`],
  [`Le fossile ferme chaque colonne : ${pct(poland.shares[2])} en Pologne, ${pct(germany.shares[2])} en Allemagne.`],
  [`Rangeons-les par part fossile, le fossile posé en bas : la Pologne en tête.`],
  [`Réunissons renouvelables et nucléaire. ${listOf(above98.map((c) => FRENCH[c.key][0]))} dépassent ${pct(98)} de bas-carbone ; la France est à ${pct(low(france))}.`],
  [`Lecture : chaque colonne est la production électrique d’un pays en ${YEAR}, à 100${NB}% ; les totaux en TWh diffèrent beaucoup d’un pays à l’autre.`],
];
const source = "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `100${NB}%`,
  low: "bas-carbone",
  renNote: `Norvège${NB}: ${pct(norway.shares[0])} renouvelables`,
  nucNote: `nucléaire${NB}: ${nuclear.length} pays sur ${base.length}`,
  fosNote: `Pologne${NB}: ${pct(poland.shares[2])} fossile`,
  sortNote: "rangés par part fossile",
  lowNote: `bas-carbone${NB}: ${above98.length} pays au-dessus de ${pct(98)}`,
  readNote: `part de la production ${YEAR}`,
};
const alt =
  `Colonnes empilées à 100 % : la production électrique de six pays européens en ${YEAR}, par famille — renouvelables, nucléaire, fossile. ` +
  `La Norvège tourne à ${pct(norway.shares[0])} de renouvelables ; la Pologne tire ${pct(poland.shares[2])} de son électricité du fossile.`;

/** One state per card; see `mix-drive.mjs` for what each field paints. */
const STATES = [
  { grow0: 1, grow1: 0, grow2: 0, sort: 0, flip: 0, merge: 0, note: 0 },
  { grow0: 1, grow1: 1, grow2: 0, sort: 0, flip: 0, merge: 0, note: 1 },
  { grow0: 1, grow1: 1, grow2: 1, sort: 0, flip: 0, merge: 0, note: 2 },
  { grow0: 1, grow1: 1, grow2: 1, sort: 1, flip: 1, merge: 0, note: 3 },
  { grow0: 1, grow1: 1, grow2: 1, sort: 1, flip: 1, merge: 1, note: 4 },
  { grow0: 1, grow1: 1, grow2: 1, sort: 0, flip: 0, merge: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `0 50 ${words.unit}`,
  annot: `${FAMILIES.map((f) => f.label).join(" ")} ${columns.map((c) => c.label).join(" ")}`,
  value: `${columns.map((c) => `${c.texts.join(" ")} ${c.lowText}`).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "mix-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["renouvelables", "nucleaire", "fossile", "par-fossile", "bas-carbone", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedMixScrolly, { columns, families: FAMILIES.map((f) => f.label), orders, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyMixState",
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
