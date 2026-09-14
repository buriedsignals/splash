// The renewable share of six European countries' electricity, 2015 and 2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `slope` type in the scrolly format.
//
// THE SUBJECT OF `static-renewables-shift`, CHOREOGRAPHED. The six countries, the two years, the claim are the static
// beat's own; the static predates the design base and is set in English, so this beat is set in French through the
// filed directions. The scroll tells it with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. the 2015 rail alone;
//   2. the slopes growing to 2024: all six rise;
//   3. Germany alone: the steepest climb;
//   4. Germany's change taken apart: what grew, what gave way;
//   5. the room each country had left to climb in 2015;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-renewables-shift/render-directions-scrolly.mjs

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
import { DirectedShiftScrolly } from "./DirectedShiftScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const FROM = 2015;
const TO = 2024;
const SUBJECT = "Germany";
const RENEWABLE = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const ALL = [...RENEWABLE, "Nuclear", "Gas", "Oil", "Coal"];
/** The subject's change taken apart: the groups every source falls into, once each. */
const GROUPS = [
  { key: "windsolar", label: "éolien et solaire", columns: ["Wind", "Solar"] },
  { key: "otherren", label: "autres renouvelables", columns: ["Hydropower", "Bioenergy", "Other renewables"] },
  { key: "gasoil", label: "gaz et pétrole", columns: ["Gas", "Oil"] },
  { key: "nuclear", label: "nucléaire", columns: ["Nuclear"] },
  { key: "coal", label: "charbon", columns: ["Coal"] },
];
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"], Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"] };

// ── the shares, and the static beat's own assertions ───────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const uncounted = header.slice(3).filter((h) => !ALL.includes(h));
if (uncounted.length) throw new Error(`source column(s) not counted: ${uncounted.join(", ")}`);
if (GROUPS.flatMap((g) => g.columns).sort().join() !== [...ALL].sort().join()) throw new Error("the change's groups do not cover every source exactly once");
const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
const shareOf = (entity, year, columns) => {
  const r = rows.find((x) => x.Entity === entity && Number(x.Year) === year);
  if (!r) throw new Error(`no ${year} row for ${entity}`);
  const total = ALL.reduce((s, k) => s + Number(r[k]), 0);
  return (columns.reduce((s, k) => s + Number(r[k]), 0) / total) * 100;
};
const entities = [...new Set(rows.map((r) => r.Entity))];
for (const e of entities) if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
const base = entities.map((e) => ({ key: e, from: shareOf(e, FROM, RENEWABLE), to: shareOf(e, TO, RENEWABLE) }));
for (const d of base) d.delta = d.to - d.from;
if (base.some((d) => d.delta <= 0)) throw new Error(`card 2 says all six rose; ${base.filter((d) => d.delta <= 0).map((d) => d.key).join(", ")} did not`);
const steepest = base.reduce((a, b) => (b.delta > a.delta ? b : a));
if (steepest.key !== SUBJECT) throw new Error(`the headline says ${SUBJECT} climbed most; ${steepest.key} did`);
const subject = base.find((d) => d.key === SUBJECT);
if (!(subject.to / subject.from > 1.9)) throw new Error(`the headline says ${SUBJECT}'s share nearly doubled; ×${(subject.to / subject.from).toFixed(2)}`);
const parts = GROUPS.map((g) => ({ ...g, value: shareOf(SUBJECT, TO, g.columns) - shareOf(SUBJECT, FROM, g.columns) }));
if (Math.abs(parts.reduce((s, p) => s + p.value, 0)) > 1e-9) throw new Error("the subject's changes do not sum to zero");
const biggestGain = parts.reduce((a, b) => (b.value > a.value ? b : a));
const biggestLoss = parts.reduce((a, b) => (b.value < a.value ? b : a));
if (biggestGain.key !== "windsolar" || biggestLoss.key !== "coal") throw new Error(`card 4 says wind and solar grew most and coal gave way most; ${biggestGain.key}, ${biggestLoss.key}`);
const highest = base.reduce((a, b) => (b.from > a.from ? b : a));
if (highest.key !== "Norway" || !(100 - highest.from < 3)) throw new Error(`card 5 says Norway had under 3 points of room in ${FROM}; ${highest.key} ${(100 - highest.from).toFixed(1)}`);
console.log(`${base.map((d) => `${d.key} ${d.from.toFixed(1)}→${d.to.toFixed(1)}`).join(" · ")} · ${parts.map((p) => `${p.key} ${p.value.toFixed(1)}`).join(" ")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(Math.abs(v))}`;
const pct = (v) => `${Math.round(v)}${NB}%`;
const lowest = base.reduce((a, b) => (b.from < a.from ? b : a));
const lines = base.map((d) => ({
  key: d.key,
  label: FRENCH[d.key][0],
  from: d.from,
  to: d.to,
  fromText: pct(d.from),
  toText: pct(d.to),
  subject: d.key === SUBJECT,
  roomText: d.key === SUBJECT || d === highest ? `${FRENCH[d.key][0]}${NB}: ${Math.round(100 - d.from)}${NB}pts` : "",
}));
const partsOut = parts.map((p) => ({ key: p.key, label: p.label, value: p.value, text: `${signed(p.value)}${NB}pts` }));
const find = (k) => parts.find((p) => p.key === k);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La part renouvelable de l’électricité allemande a presque doublé en neuf ans`,
  `L’Allemagne a presque doublé sa part renouvelable`,
  `Le renouvelable dans six pays européens, ${FROM} et ${TO}`,
];
const prose = [
  [`La part des renouvelables dans l’électricité de six pays européens en ${FROM} : de ${pct(highest.from)} en Norvège à ${pct(lowest.from)} en ${FRENCH[lowest.key][0]}.`],
  [`En ${TO}, chaque pays tire sa pente. Toutes montent.`],
  [`L’Allemagne passe de ${pct(subject.from)} à ${pct(subject.to)} : ${signed(subject.delta)}${NB}points, la plus forte hausse des six.`],
  [`D’où vient ce gain ? L’éolien et le solaire gagnent ${one(find("windsolar").value)}${NB}points. Ce qui a cédé : le charbon, ${signed(find("coal").value)}, et le nucléaire, ${signed(find("nuclear").value)}.`],
  [`Tous ne partaient pas de la même place. En ${FROM}, l’Allemagne avait ${Math.round(100 - subject.from)}${NB}points à gagner ; la Norvège, ${Math.round(100 - highest.from)}.`],
  [`Lecture : chaque ligne relie la part renouvelable d’un pays en ${FROM} et en ${TO} ; renouvelables : hydraulique, éolien, solaire, bioénergie et autres.`],
];
const source = "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: "part des renouvelables dans l’électricité, en %",
  gained: "a gagné",
  gave: "a cédé",
  railNote: `${FROM}${NB}: de ${pct(lowest.from)} à ${pct(highest.from)}`,
  riseNote: `${base.length} sur ${base.length} en hausse`,
  subjectNote: `Allemagne${NB}: ${signed(subject.delta)}${NB}pts`,
  partsNote: `Allemagne, ${FROM}–${TO}, en points`,
  roomNote: `place restante en ${FROM}`,
  readNote: `${FROM} et ${TO}`,
};
const alt =
  `Graphique en pente : la part des renouvelables dans l’électricité de six pays européens en ${FROM} et en ${TO}. Toutes montent ; ` +
  `l’Allemagne passe de ${pct(subject.from)} à ${pct(subject.to)}, la plus forte hausse, portée par l’éolien et le solaire quand le charbon et le nucléaire reculent.`;

/** One state per card; see `shift-drive.mjs` for what each field paints. */
const STATES = [
  { right: 0, subject: 0, parts: 0, room: 0, note: 0 },
  { right: 1, subject: 0, parts: 0, room: 0, note: 1 },
  { right: 1, subject: 1, parts: 0, room: 0, note: 2 },
  { right: 1, subject: 1, parts: 1, room: 0, note: 3 },
  { right: 1, subject: 0, parts: 0, room: 1, note: 4 },
  { right: 1, subject: 0, parts: 0, room: 0, note: 5 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.gained} ${words.gave} ${FROM} ${TO} ${lines.map((l) => l.roomText).join(" ")}`,
  annot: `${lines.map((l) => l.label).join(" ")} ${partsOut.map((p) => p.label).join(" ")}`,
  value: `${lines.map((l) => `${l.fromText} ${l.toText}`).join(" ")} ${partsOut.map((p) => p.text).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "shift-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`rail-${FROM}`, "pentes", "allemagne", "decomposition", "place-restante", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedShiftScrolly, { lines, parts: partsOut, years: [String(FROM), String(TO)], words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyShiftState",
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
