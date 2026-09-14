// Six countries' electricity by source, 2024, rendered once per FILED DIRECTION into a self-contained scrolly page. The
// `sankey` type in the scrolly format.
//
// THE SUBJECT OF `static-sankey-electricity-sources`, CHOREOGRAPHED. The sources and their order, the flows, the claim
// and its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the two rails alone, the same total on both;
//   2. nuclear's ribbons only: 84 % of it to France;
//   3. the whole web of 54 flows;
//   4. read back from France: its ribbons alone, 67.7 % nuclear;
//   5. read back from Germany: no nuclear ribbon at all;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-sankey-electricity-sources/render-directions-scrolly.mjs

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
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedSankeyScrolly } from "./DirectedSankeyScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const TRACKED = "Nuclear";
const SECOND = "Germany";
/** A country's share of a source is written only from this share up: under it the label would sit on a hairline. */
const WRITTEN_FROM = 2;
/** Renewables, nuclear, fossil: the same family order as the radar beat — an order that means something. */
const SOURCES = [
  { column: "Wind", label: "Éolien" },
  { column: "Solar", label: "Solaire" },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Nuclear", label: "Nucléaire" },
  { column: "Gas", label: "Gaz" },
  { column: "Coal", label: "Charbon" },
  { column: "Oil", label: "Pétrole" },
];
const FRENCH = { France: ["France", "la France", "en France"], Germany: ["Allemagne", "l’Allemagne", "en Allemagne"], Norway: ["Norvège", "la Norvège", "en Norvège"], Poland: ["Pologne", "la Pologne", "en Pologne"], Sweden: ["Suède", "la Suède", "en Suède"], Switzerland: ["Suisse", "la Suisse", "en Suisse"] };

// ── the flows, and the static beat's own assertions ────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]))).filter((r) => Number(r.Year) === YEAR);
const missing = header.slice(3).filter((h) => !SOURCES.some((s) => s.column === h));
if (missing.length) throw new Error(`source column(s) with no node: ${missing.join(", ")}`);
for (const r of rows) if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);
const raw = SOURCES.flatMap((s) => rows.map((r) => ({ from: s.column, to: r.Entity, value: Number(r[s.column]) })));
const sourceTotal = (k) => raw.filter((f) => f.from === k).reduce((s, f) => s + f.value, 0);
const targetTotal = (k) => raw.filter((f) => f.to === k).reduce((s, f) => s + f.value, 0);
const grand = raw.reduce((s, f) => s + f.value, 0);
const bySource = SOURCES.reduce((s, x) => s + sourceTotal(x.column), 0);
const byTarget = rows.reduce((s, r) => s + targetTotal(r.Entity), 0);
if (Math.abs(bySource - byTarget) > 1e-6 || Math.abs(bySource - grand) > 1e-6) throw new Error(`conservation fails: ${bySource.toFixed(3)} out, ${byTarget.toFixed(3)} in`);
if (raw.length !== SOURCES.length * rows.length) throw new Error(`expected ${SOURCES.length * rows.length} flows, built ${raw.length}`);
const ranked = SOURCES.map((s) => ({ ...s, total: sourceTotal(s.column) })).sort((a, b) => b.total - a.total);
if (ranked[0].column !== TRACKED) throw new Error(`the headline says nuclear is the largest source; it is ${ranked[0].label}`);
const holders = raw.filter((f) => f.from === TRACKED).sort((a, b) => b.value - a.value);
const holder = holders[0];
const holderShare = (holder.value / sourceTotal(TRACKED)) * 100;
if (holderShare < 80) throw new Error(`the headline says one country holds more than four fifths of nuclear; ${holder.to} holds ${holderShare.toFixed(1)} %`);
const nuclearIn = (k) => (raw.find((f) => f.from === TRACKED && f.to === k).value / targetTotal(k)) * 100;
if (nuclearIn(SECOND) !== 0) throw new Error(`card 5 says ${SECOND} has no nuclear ribbon; it has ${nuclearIn(SECOND).toFixed(1)} %`);
const nuclearCountries = holders.filter((f) => f.value > 0);
const secondTop = raw.filter((f) => f.to === SECOND).sort((a, b) => b.value - a.value).slice(0, 3).map((f) => f.from);
if (secondTop.join() !== "Wind,Coal,Gas") throw new Error(`card 5 names wind, coal and gas as ${SECOND}'s largest sources; they are ${secondTop.join(", ")}`);
console.log(`${raw.length} flux · ${grand.toFixed(1)} TWh · nucléaire ${sourceTotal(TRACKED).toFixed(1)}, ${holder.to} ${holderShare.toFixed(1)} % · ${holder.to} ${nuclearIn(holder.to).toFixed(1)} % nucléaire\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const pct = (v) => `${one(v)}${NB}%`;
const SOURCE_WORD = Object.fromEntries(SOURCES.map((s) => [s.column, s.label.toLowerCase()]));
const sources = SOURCES.map((s) => ({ key: s.column, label: s.label, total: sourceTotal(s.column), totalText: one(sourceTotal(s.column)) }));
const targets = rows.map((r) => ({ key: r.Entity, label: FRENCH[r.Entity][0], total: targetTotal(r.Entity), totalText: one(targetTotal(r.Entity)) })).sort((a, b) => b.total - a.total);
const flows = raw.map((f) => {
  const ofSource = (f.value / sourceTotal(f.from)) * 100;
  const ofTarget = (f.value / targetTotal(f.to)) * 100;
  return {
    ...f,
    ofSource: f.from === TRACKED ? `${Math.round(ofSource)}${NB}%` : "",
    valueText: one(f.value),
    ofTarget: ofTarget >= WRITTEN_FROM ? pct(ofTarget) : "",
    fromLabel: SOURCES.find((s) => s.column === f.from).label,
  };
});
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const [hName, , hIn] = FRENCH[holder.to];
const [sName] = FRENCH[SECOND];
const secondShares = secondTop.map((k) => `${SOURCE_WORD[k]} ${pct((raw.find((f) => f.from === k && f.to === SECOND).value / targetTotal(SECOND)) * 100)}`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Le nucléaire de ces six pays est français à ${Math.round(holderShare)}${NB}%`,
  `Le nucléaire des six, français à ${Math.round(holderShare)}${NB}%`,
  `Six pays, neuf sources d’électricité`,
];
const prose = [
  [`La production électrique de six pays européens en ${YEAR}, ${whole(grand)}${NB}TWh. À gauche, les neuf sources ; à droite, les six pays. Les deux côtés font le même total.`],
  [`Suivons le nucléaire, la première des neuf sources : ${one(sourceTotal(TRACKED))}${NB}TWh. ${one(holder.value)}${NB}TWh vont ${hIn}, ${Math.round(holderShare)}${NB}%. Il n’en reste que pour ${listOf(nuclearCountries.slice(1).map((f) => FRENCH[f.to][1]))}.`],
  [`Toutes les sources, vers tous les pays : ${raw.length} rubans. Ceux d’un nœud font exactement son total.`],
  [`Remontons depuis la France : ${pct(nuclearIn(holder.to))} de son électricité est nucléaire.`],
  [`Depuis l’Allemagne, deuxième producteur : aucun ruban nucléaire. D’abord ${listOf(secondShares)}.`],
  [`Lecture : chaque ruban est une source dans un pays ; les rubans d’un nœud se rejoignent exactement au total imprimé. Les rubans sont translucides, un croisement s’assombrit au lieu de cacher ce qu’il traverse.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `production électrique ${YEAR}, en TWh`,
  railNote: `${whole(grand)}${NB}TWh de chaque côté`,
  sourceNote: `nucléaire${NB}: ${Math.round(holderShare)}${NB}% ${hIn}`,
  webNote: `${raw.length} rubans`,
  subjectNote: `${hName}${NB}: ${pct(nuclearIn(holder.to))} nucléaire`,
  otherNote: `${sName}${NB}: ${pct(nuclearIn(SECOND))} nucléaire`,
};
const alt =
  `Diagramme de Sankey : neuf sources d’électricité à gauche, six pays européens à droite, ${raw.length} rubans larges comme les TWh produits en ${YEAR}. ` +
  `Le nucléaire, première source avec ${one(sourceTotal(TRACKED))} TWh, part à ${Math.round(holderShare)} % vers la France ; l’Allemagne n’en reçoit aucun.`;

/** One state per card; see `sankey-drive.mjs` for what each field paints. */
const STATES = [
  { source: 0, shares: 0, web: 0, focus0: 0, focus1: 0, note: 0 },
  { source: 1, shares: 1, web: 0, focus0: 0, focus1: 0, note: 1 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 0, note: 2 },
  { source: 1, shares: 0, web: 1, focus0: 1, focus1: 0, note: 3 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 1, note: 4 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 0, note: -1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: words.unit,
  annot: [...sources, ...targets].map((n) => n.label).join(" "),
  value: `${[...sources, ...targets].map((n) => n.totalText).join(" ")} ${flows.map((f) => `${f.valueText} · ${f.ofSource} ${f.ofTarget}`).join(" ")} ${Object.values(words).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "sankey-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["rails", "nucleaire", "toile", "france", "allemagne", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedSankeyScrolly, { sources, targets, flows, tracked: { from: TRACKED, to: holder.to }, focus: [holder.to, SECOND], words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applySankeyState",
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
