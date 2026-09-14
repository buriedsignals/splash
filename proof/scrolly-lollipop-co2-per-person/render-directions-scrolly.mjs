// CO₂ per person in the six largest emitters, 2000 and 2023, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `lollipop` type in the scrolly format.
//
// THE SUBJECT OF `static-lollipop-co2-per-person`, CHOREOGRAPHED. The six (a computed rule), the levels, the claim and
// its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. 2000: six stems grow from zero;
//   2. 2023: a stem grows beside each;
//   3. China and the United States drawn together;
//   4. their ratio, 7.5 then 1.7;
//   5. every pair's direction of change;
//   6. the static plate: the six, 63.9 % of the world.
//
// Usage:  bun proof/scrolly-lollipop-co2-per-person/render-directions-scrolly.mjs

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
import { DirectedLollipopScrolly } from "./DirectedLollipopScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const NB = "\u00A0";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const OTHER = "USA";
const NAMES = {
  CHN: ["Chine", "la Chine"], USA: ["États-Unis", "les États-Unis"], IND: ["Inde", "l’Inde"], RUS: ["Russie", "la Russie"], JPN: ["Japon", "le Japon"],
  IRN: ["Iran", "l’Iran"], IDN: ["Indonésie", "l’Indonésie"], SAU: ["Arabie saoudite", "l’Arabie saoudite"], DEU: ["Allemagne", "l’Allemagne"],
  KOR: ["Corée du Sud", "la Corée du Sud"], BRA: ["Brésil", "le Brésil"],
};

// ── the countries, and the static beat's own assertions ────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { code: c[at("code")], before: Number(c[at("t_per_person_2000")]), after: Number(c[at("t_per_person_2023")]), people: Number(c[at("population_2023")]) };
});
for (const c of all) if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after) || !(c.people > 0)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);
const withTotals = all.map((c) => ({ ...c, total: (c.after * c.people) / 1e9 }));
const worldTotal = withTotals.reduce((s, c) => s + c.total, 0);
const chosen = [...withTotals].sort((a, b) => b.total - a.total).slice(0, HOW_MANY);
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed in this beat`);
const chosenShare = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;
const subject = chosen.find((c) => c.code === SUBJECT);
const other = chosen.find((c) => c.code === OTHER);
if (!subject || !other) throw new Error(`the headline names China and the United States; the computed six are ${chosen.map((c) => c.code).join(", ")}`);
const grew = subject.after / subject.before;
const ratioBefore = other.before / subject.before;
const ratioAfter = other.after / subject.after;
if (!(grew > 2.5)) throw new Error(`the headline says the subject roughly tripled; it multiplied by ${grew.toFixed(2)}`);
if (!(ratioBefore > 5 && ratioAfter < 2.5 && ratioAfter > 1)) throw new Error(`the headline says the ratio fell from above five to under two and a half; ${ratioBefore.toFixed(1)} to ${ratioAfter.toFixed(1)}`);
if (!(chosenShare > 55)) throw new Error(`a card says the six carry most of the world's emissions; they carry ${chosenShare.toFixed(1)} %`);
if (!(other.after < other.before)) throw new Error("a card says the American average fell");

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))}${NB}%`;
const pairs = chosen.map((c) => {
  const change = ((c.after - c.before) / c.before) * 100;
  return { code: c.code, name: NAMES[c.code][0], before: c.before, after: c.after, change, beforeText: one(c.before), afterText: one(c.after), changeText: pct(change) };
});
const max = Math.ceil(Math.max(...pairs.map((p) => Math.max(p.before, p.after))) / 5) * 5;
const rose = pairs.filter((p) => p.change > 0);
const fell = pairs.filter((p) => p.change < 0);
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
console.log(`${HOW_MANY} pays · ${chosenShare.toFixed(1)} % · CHN ×${grew.toFixed(2)} · rapport ${ratioBefore.toFixed(1)} -> ${ratioAfter.toFixed(1)}\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La Chine a triplé son CO₂ par personne depuis ${FROM} ; l’Américain moyen n’en émet plus que ${one(ratioAfter)} fois plus`,
  `Le rapport entre l’Américain et le Chinois moyens est passé de ${one(ratioBefore)} à ${one(ratioAfter)}`,
  `Le CO₂ par personne des six plus gros émetteurs`,
];
const prose = [
  [`Les six pays qui émettent le plus de CO₂. En ${FROM}, chaque tige part de zéro jusqu’aux tonnes émises par habitant : ${one(other.before)}${NB}t aux États-Unis, ${one(subject.before)}${NB}t en Chine.`],
  [`En ${TO}, une deuxième tige, pleine, pousse à côté de chacune. La Chine monte à ${one(subject.after)}${NB}t, les États-Unis descendent à ${one(other.after)}${NB}t.`],
  [`Mettons la Chine et les États-Unis côte à côte.`],
  [`En ${FROM}, l’Américain moyen émettait ${one(ratioBefore)} fois plus que le Chinois moyen. En ${TO}, ${one(ratioAfter)} fois plus.`],
  [`Sur les six, ${listOf(rose.map((p) => NAMES[p.code][1]))} émettent plus par personne qu’en ${FROM} ; ${listOf(fell.map((p) => NAMES[p.code][1]))}, moins.`],
  [`Lecture : chaque tige part de zéro, donc la hauteur est le niveau et l’écart entre les deux têtes est le changement. Ces six pays émettent ${one(chosenShare)}${NB}% du CO₂ mondial.`],
];
const source = `Sources : Global Carbon Budget 2025 · population (${TO}), via Our World in Data`;
const words = {
  unit: "tonnes de CO₂ par personne",
  rule: `Sélection : les ${HOW_MANY} pays au plus fort total ${TO}, par personne × population.`,
  beforeRatio: `× ${one(ratioBefore)}`,
  afterRatio: `× ${one(ratioAfter)}`,
  pairNote: `${FROM}${NB}: × ${one(ratioBefore)} · ${TO}${NB}: × ${one(ratioAfter)}`,
  changeNote: `${rose.length} en hausse, ${fell.length} en baisse`,
  shareNote: `${one(chosenShare)}${NB}% du CO₂ mondial`,
};
const alt =
  `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} (teinte claire) et en ${TO} (plein), chaque tige partant de zéro. ` +
  `La Chine monte de ${one(subject.before)} à ${one(subject.after)} tonnes, les États-Unis descendent de ${one(other.before)} à ${one(other.after)} : le rapport passe de ${one(ratioBefore)} à ${one(ratioAfter)}.`;

/** One state per card; see `lollipop-drive.mjs` for what each field paints. */
const STATES = [
  { before: 1, after: 0, pair: 0, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 1, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 1, ratio: 1, change: 0, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 1, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 1, share: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.rule} ${FROM} ${TO}`,
  annot: pairs.map((p) => p.name).join(" "),
  value: `${pairs.map((p) => `${p.beforeText} ${p.afterText} ${p.changeText}`).join(" ")} ${words.beforeRatio} ${words.afterRatio} ${words.pairNote} ${words.changeNote} ${words.shareNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "lollipop-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`niveaux-${FROM}`, `niveaux-${TO}`, "chine-etats-unis", "rapport", "sens", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedLollipopScrolly, { pairs, subject: SUBJECT, other: OTHER, years: [String(FROM), String(TO)], max, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyLollipopState",
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
