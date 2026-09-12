// twin/proof/web-calendar-heatmap-geneva/render-directions-web.mjs
//
// Geneva's daily mean temperature through 2024 as a calendar heatmap, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE STREAK IS FOUND, NOT TYPED: the longest run of consecutive days at or above the threshold is
// computed from the frozen file, and the headline is asserted against it before the render.
//
// Usage:  bun proof/web-calendar-heatmap-geneva/render-directions-web.mjs

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
import { DirectedCalendarWeb } from "./DirectedCalendarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Genève";
const THRESHOLD = 20;
const BREAKS = [0, 5, 10, 15, 20, 25];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

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
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  const [yy, mm, dd] = c[at("date")].split("-").map(Number);
  return { year: yy, month: mm, day: dd, mean: Number(c[at("mean_c")]), max: Number(c[at("max_c")]) };
});
for (const r of rows)
  if (!Number.isFinite(r.mean) || !Number.isFinite(r.max))
    throw new Error(`${r.year}-${r.month}-${r.day} has no usable reading`);
const year = rows[0].year;
if (rows.some((r) => r.year !== year)) throw new Error("the frozen file spans more than one year");

// ── the streak, found ─────────────────────────────────────────────────────────────────────────
let best = { length: 0, from: null, to: null };
let run = [];
for (const r of rows) {
  if (r.mean >= THRESHOLD) run.push(r);
  else run = [];
  if (run.length > best.length) best = { length: run.length, from: run[0], to: run[run.length - 1] };
}
if (!(best.length >= 20))
  throw new Error(`the headline needs a long run at or above ${THRESHOLD} °C; the longest is ${best.length} days`);

const streak = rows.filter(
  (r) =>
    r.month * 100 + r.day >= best.from.month * 100 + best.from.day &&
    r.month * 100 + r.day <= best.to.month * 100 + best.to.day,
);

const monthly = MONTHS.map((_, i) => {
  const inMonth = rows.filter((r) => r.month === i + 1);
  return { month: i + 1, mean: inMonth.reduce((s, r) => s + r.mean, 0) / inMonth.length };
});
const warmest = monthly.reduce((a, b) => (b.mean > a.mean ? b : a));
const hottest = rows.reduce((a, b) => (b.mean > a.mean ? b : a));
const coldest = rows.reduce((a, b) => (b.mean < a.mean ? b : a));

console.log(
  `${rows.length} jours en ${year} · plus longue série >= ${THRESHOLD} °C : ${best.length} jours, du ` +
    `${best.from.day} ${MONTHS_LONG[best.from.month - 1]} au ${best.to.day} ${MONTHS_LONG[best.to.month - 1]} · ` +
    `mois le plus chaud ${MONTHS_LONG[warmest.month - 1]} (${fr(warmest.mean)} °C) · ` +
    `jour le plus chaud ${hottest.day} ${MONTHS_LONG[hottest.month - 1]} ${fr(hottest.mean)} °C · ` +
    `le plus froid ${coldest.day} ${MONTHS_LONG[coldest.month - 1]} ${fr(coldest.mean)} °C\n`,
);
console.table(monthly.map((m) => ({ mois: MONTHS_LONG[m.month - 1], "moyenne °C": fr(m.mean) })));

// ── the bins, named in their own units ────────────────────────────────────────────────────────
const binOf = (mean) => {
  let i = 0;
  while (i < BREAKS.length && mean >= BREAKS[i]) i += 1;
  return i;
};
const bins = [
  { from: null, to: BREAKS[0], label: `< ${BREAKS[0]} °C` },
  ...BREAKS.slice(0, -1).map((b, i) => ({ from: b, to: BREAKS[i + 1], label: `${b}–${BREAKS[i + 1]}` })),
  { from: BREAKS[BREAKS.length - 1], to: null, label: `≥ ${BREAKS[BREAKS.length - 1]} °C` },
];

const days = rows.map((r) => {
  const bin = binOf(r.mean);
  return {
    month: r.month,
    day: r.day,
    bin,
    detail:
      `${r.day} ${MONTHS_LONG[r.month - 1]} · moyenne ${fr(r.mean)} °C · maximum ${fr(r.max)} °C · ` +
      `palier ${bins[bin].label}` +
      (r.mean >= THRESHOLD && streak.includes(r) ? ` · dans la série de ${best.length} jours` : ""),
  };
});

const facts = beatFacts(
  days.map((d) => ({ key: `${d.month}-${d.day}`, label: `${d.day}/${d.month}`, value: rows.find((r) => r.month === d.month && r.day === d.day).mean })),
  { subject: `${best.length} jours`, declaredSequence: "°C" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Genève a tenu ${best.length} jours d'affilée à ${THRESHOLD} °C ou plus en ${year}`;
const caveat =
  `Une case par jour, ${rows.length} cases : la température moyenne quotidienne. Les paliers sont ` +
  `bornés en °C dans la légende — une case colorée ne se lit pas au degré près, et la légende dit ` +
  `de combien. Les cinq cases impossibles (31 février et ses sœurs) sont dessinées vides.`;
const streakNote = `${best.length} jours ≥ ${THRESHOLD} °C`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une case pour lire sa date, sa moyenne, son maximum et ` +
  `son palier — les ${rows.length} valeurs exactes que la grille résume en couleur. Le pointeur ` +
  `résout à la case, pas à la colonne : douze mois partagent chaque abscisse.`;
const source = `Source : Open-Meteo (réanalyse ERA5), moyenne et maximum quotidiens à 2 m, Genève (46,20 N · 6,14 E), ${year}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${bins.map((b) => b.label).join(" ")}`,
  axis: `${MONTHS.join(" ")} 1 5 10 15 20 25 31 ${bins.map((b) => b.label).join(" ")}`,
  annot: streakNote,
  value: days.map((d) => bins[d.bin].label).join(" "),
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
      component: DirectedCalendarWeb,
      props: {
        days,
        bins,
        monthLabels: MONTHS,
        dayTicks: [1, 5, 10, 15, 20, 25, 31],
        streak: streak.map((r) => ({ month: r.month, day: r.day })),
        streakNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une grille de ${rows.length} cases, douze lignes de mois sur trente et un jours, chaque ` +
          `case teintée selon la température moyenne du jour à Genève en ${year}. Le bloc le plus ` +
          `foncé court du ${best.from.day} ${MONTHS_LONG[best.from.month - 1]} au ${best.to.day} ` +
          `${MONTHS_LONG[best.to.month - 1]} : ${best.length} jours consécutifs à ${THRESHOLD} °C ou ` +
          `plus, entourés d'un trait. Le mois le plus chaud est ${MONTHS_LONG[warmest.month - 1]} ` +
          `(${fr(warmest.mean)} °C de moyenne), le jour le plus chaud le ${hottest.day} ` +
          `${MONTHS_LONG[hottest.month - 1]} à ${fr(hottest.mean)} °C.`,
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
