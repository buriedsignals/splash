// twin/proof/web-calendar-heatmap-geneva/render-directions-web.mjs
//
// Geneva's daily mean temperature through 2024 as a calendar heatmap, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// EVERY RUN IS FOUND, NOT TYPED. The claim's own threshold and each of the four lines the reader can
// move to are walked out of the frozen file, and the headline is asserted against the claim's run
// before the render. So is the page's own second reading — that the run's END DATE does not move
// across a band of thresholds — which is a statement about four runs at once and is refused here if
// the data stops supporting it.
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
import { DirectedCalendarWeb, FRAME, spanOf } from "./DirectedCalendarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Genève";

// THE CLAIM'S OWN LINE, AND THE FOUR THE READER CAN MOVE IT TO. Two degrees apart and centred on the
// claim: wide enough that the collapse is the point (78 days down to 4), tight enough that every
// stop is a line a meteorologist would actually draw.
const CLAIM_THRESHOLD = 20;
const THRESHOLDS = [16, 18, 20, 22, 24];

// FIVE BINS, AND THE COUNT IS ARITHMETIC RATHER THAN TASTE. A direction's whole usable ramp is
// `contrast(accent, ground)` — 6,64:1 in creme — spent from the 3,0:1 non-text floor up to the
// accent. Five bins put the worst adjacent pair at 1,195:1 in the tightest direction; a sixth drops
// it to 1,150 for no reading gained. The 20 °C break is the claim's own line, so the streak reads as
// a block before any control is touched.
const BREAKS = [5, 10, 15, 20];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const dayName = (r) => `${r.day} ${MONTHS_LONG[r.month - 1]}`;

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

// ── every line's run, found ───────────────────────────────────────────────────────────────────
/** The longest run of consecutive days at or above a threshold, and how many days clear it at all. */
const runAt = (threshold) => {
  let best = { length: 0, from: null, to: null };
  let run = [];
  for (const r of rows) {
    if (r.mean >= threshold) run.push(r);
    else run = [];
    if (run.length > best.length) best = { length: run.length, from: run[0], to: run[run.length - 1] };
  }
  return { ...best, threshold, days: rows.filter((r) => r.mean >= threshold).length };
};

/** A run split into one block per MONTH ROW, because on this grid that is what it is: a run across a
 *  month boundary reads as two blocks on two rows, and outlining it as one rectangle would claim a
 *  span of days it does not cover. */
const runsOf = (best) => {
  const inside = rows.filter(
    (r) =>
      r.month * 100 + r.day >= best.from.month * 100 + best.from.day &&
      r.month * 100 + r.day <= best.to.month * 100 + best.to.day,
  );
  const out = [];
  for (const r of inside) {
    const open = out[out.length - 1];
    if (open && open.month === r.month && open.to === r.day - 1) open.to = r.day;
    else out.push({ month: r.month, from: r.day, to: r.day });
  }
  return out;
};

const claim = runAt(CLAIM_THRESHOLD);
if (!(claim.length >= 20))
  throw new Error(
    `the headline needs a long run at or above ${CLAIM_THRESHOLD} °C; the longest is ${claim.length} days`,
  );
const claimRuns = runsOf(claim);

// EVERY LINE THE READER CAN MOVE TO MUST SELECT A DIFFERENT RUN, and it is asserted here as well as
// refused by `assertCutoffDeclaration` on the drawn regions: a control whose options outline the
// same cells tells the reader the claim is insensitive to the line when it is the control that is.
const lines = THRESHOLDS.map(runAt);
for (const line of lines)
  if (line.length === 0) throw new Error(`no day of ${year} reaches ${line.threshold} °C`);
const seen = new Map();
for (const line of lines) {
  const signature = `${line.from.month}-${line.from.day}..${line.to.month}-${line.to.day}`;
  if (seen.has(signature))
    throw new Error(
      `${seen.get(signature)} °C and ${line.threshold} °C select the same run (${signature}) — ` +
        `two lines under one outline`,
    );
  seen.set(signature, line.threshold);
}

// ── THE PAGE'S SECOND READING, DERIVED AND ASSERTED ───────────────────────────────────────────
// The run's END DATE does not move. Walked over every integer threshold, this is the widest
// contiguous band of lines whose longest run ends on the same day the claim's does — the fact that
// is in none of the five pictures on its own, only in the difference between them.
let anchorLow = CLAIM_THRESHOLD;
let anchorHigh = CLAIM_THRESHOLD;
const endsLikeClaim = (t) => {
  const r = runAt(t);
  return r.length > 0 && r.to.month === claim.to.month && r.to.day === claim.to.day;
};
while (endsLikeClaim(anchorLow - 1)) anchorLow -= 1;
while (endsLikeClaim(anchorHigh + 1)) anchorHigh += 1;
const anchorSpan = anchorHigh - anchorLow + 1;
if (anchorSpan < 3)
  throw new Error(
    `the reading claims the run's end is anchored across a band of thresholds; only ${anchorSpan} ` +
      `line(s) end on ${dayName(claim.to)}`,
  );
const anchorStartLow = runAt(anchorLow).from;
const anchorStartHigh = runAt(anchorHigh).from;

const monthly = MONTHS.map((_, i) => {
  const inMonth = rows.filter((r) => r.month === i + 1);
  return { month: i + 1, mean: inMonth.reduce((s, r) => s + r.mean, 0) / inMonth.length };
});
const warmest = monthly.reduce((a, b) => (b.mean > a.mean ? b : a));
const hottest = rows.reduce((a, b) => (b.mean > a.mean ? b : a));
const coldest = rows.reduce((a, b) => (b.mean < a.mean ? b : a));

console.log(
  `${rows.length} jours en ${year} · seuil de la revendication ${CLAIM_THRESHOLD} °C : ` +
    `${claim.length} jours, du ${dayName(claim.from)} au ${dayName(claim.to)}\n` +
    `fin ancrée au ${dayName(claim.to)} de ${anchorLow} à ${anchorHigh} °C ` +
    `(${anchorSpan} lignes) · début de ${dayName(anchorStartLow)} à ${dayName(anchorStartHigh)}\n` +
    `mois le plus chaud ${MONTHS_LONG[warmest.month - 1]} (${fr(warmest.mean)} °C) · ` +
    `jour le plus chaud ${dayName(hottest)} ${fr(hottest.mean)} °C · le plus froid ` +
    `${dayName(coldest)} ${fr(coldest.mean)} °C\n`,
);
console.table(
  lines.map((l) => ({
    "seuil °C": l.threshold,
    "série la plus longue": l.length,
    du: dayName(l.from),
    au: dayName(l.to),
    "jours au-dessus": l.days,
  })),
);

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

// THE RANK IS DERIVED IN THE RUNNER AND BAKED INTO THE ANSWER. A bin destroys exactly this reading —
// it is what a binned cell costs — and the browser never computes one (`directed-interaction.md`,
// rule 4). Ties share the warmer rank, so two identical means are never ranked apart.
const byWarmth = [...rows].sort((a, b) => b.mean - a.mean);
const rank = new Map();
byWarmth.forEach((r, i) => {
  const previous = byWarmth[i - 1];
  const key = `${r.month}-${r.day}`;
  rank.set(key, previous && previous.mean === r.mean ? rank.get(`${previous.month}-${previous.day}`) : i + 1);
});

const days = rows.map((r) => {
  const bin = binOf(r.mean);
  return {
    month: r.month,
    day: r.day,
    bin,
    detail:
      `${dayName(r)} · moyenne ${fr(r.mean)} °C · maximum ${fr(r.max)} °C · palier ` +
      `${bins[bin].label} · rang ${rank.get(`${r.month}-${r.day}`)} sur ${rows.length} jours, ` +
      `du plus chaud au plus froid`,
  };
});

const facts = beatFacts(
  days.map((d) => ({
    key: `${d.month}-${d.day}`,
    label: `${d.day}/${d.month}`,
    value: rows.find((r) => r.month === d.month && r.day === d.day).mean,
  })),
  { subject: `${claim.length} jours`, declaredSequence: "°C" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── THE CONTROL ───────────────────────────────────────────────────────────────────────────────
// The claim's own line first — it is the picture the page ships in and the one a reader with no
// script never leaves, so it owes no sentence: it IS the claim the title states.
const lineOf = (threshold) => lines.find((l) => l.threshold === threshold);
const cutoff = {
  label: "Le seuil de la série :",
  claim: {
    label: `${CLAIM_THRESHOLD} °C`,
    announce:
      `${CLAIM_THRESHOLD} °C — le seuil du titre : ${claim.length} jours d'affilée, du ` +
      `${dayName(claim.from)} au ${dayName(claim.to)}`,
    spans: claimRuns.map(spanOf),
  },
  options: THRESHOLDS.filter((t) => t !== CLAIM_THRESHOLD).map((threshold) => {
    const line = lineOf(threshold);
    return {
      key: String(threshold),
      label: `${threshold} °C`,
      announce:
        `${threshold} °C — la plus longue série tombe à ${line.length} jours, du ` +
        `${dayName(line.from)} au ${dayName(line.to)}`,
      note:
        `Seuil ${threshold} °C · ${line.length} jours d'affilée, du ${dayName(line.from)} au ` +
        `${dayName(line.to)} · ${line.days} jours dans l'année passent cette ligne`,
      spans: runsOf(line).map(spanOf),
    };
  }),
};

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Un fixe n'a qu'une plaque, donc il n'imprime qu'une série — et le seuil qui la définit a été " +
    "choisi par son auteur. Ici le lecteur déplace la ligne, et ce qu'il trouve n'est dans aucune " +
    `des cinq images prise seule : de ${anchorLow} à ${anchorHigh} °C la série se termine toujours ` +
    `le ${dayName(claim.to)} pendant que son début glisse de trois semaines. L'été de Genève ne ` +
    "s'est pas essoufflé, il s'est arrêté — un fait qui ne vit que dans la différence entre les " +
    "états, ce qui est précisément ce à quoi sert un contrôle.",
  controls: [
    {
      question:
        "31 jours à 20 °C — mais 20, c'est qui qui l'a choisi ? Si la ligne avait été à 18, ou à " +
        "22, est-ce que l'été de Genève raconte encore la même chose ?",
      gesture: "toggle-a-comparison",
      changes:
        "Le trait quitte le bloc du 18 juillet au 17 août et se retrace autour de la plus longue " +
        "série au seuil choisi, où qu'elle soit sur le calendrier — quatre segments de ligne à " +
        "16 °C, un seul à 24 °C. Une phrase donne la longueur de cette série, ses deux dates et le " +
        "nombre de jours de l'année qui passent cette ligne. Les couleurs, elles, ne bougent pas.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "le seuil qui définit la série",
      authorPicked: "claim",
      readerPicks: ["claim", "16", "18", "22", "24"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question:
        "Cette case-là, elle valait combien exactement ? Et c'était un jour chaud pour l'année, ou " +
        "juste chaud pour mars ?",
      gesture: "ask-a-mark",
      changes:
        "Le jour répond avec sa date, sa moyenne, son maximum, son palier et son rang sur les " +
        `${rows.length} jours de l'année — la lecture qu'un palier détruit par construction et ` +
        "qu'aucun axe de cette plaque ne porte.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel jour est en question",
      authorPicked: "le jour le plus chaud",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const title = `Genève a tenu ${claim.length} jours d'affilée à ${CLAIM_THRESHOLD} °C ou plus en ${year}`;
const caveat =
  `Une case par jour, ${rows.length} cases : la température moyenne quotidienne. Les paliers sont ` +
  `bornés en °C dans la légende — une case colorée ne se lit pas au degré près, et la légende dit ` +
  `de combien. Les cinq cases impossibles (31 février et ses sœurs) sont dessinées vides.`;
// THE NOTE SPELLS ITS COMPARISON IN WORDS. U+2265 refused all three directions the moment the
// serif ladder became Merriweather: creme sets `annot` in it, and a face is cut down to the
// characters the page declares, so a sign outside the cut is a glyph drawn by the bridge.
const streakNote = `${claim.length} jours à ${CLAIM_THRESHOLD} °C ou plus`;
const readingLine =
  `Lecture : déplacez le seuil — la plus longue série est retracée à la ligne choisie, avec sa ` +
  `longueur, ses dates et le nombre de jours qui la passent. De ${anchorLow} à ${anchorHigh} °C ` +
  `elle se termine toujours le ${dayName(claim.to)} : son début glisse du ` +
  `${dayName(anchorStartLow)} au ${dayName(anchorStartHigh)}, sa fin ne bouge pas. Survolez ou ` +
  `tabulez une case pour lire sa date, sa moyenne, son maximum, son palier et son rang sur ` +
  `l'année.`;
const source = `Source : Open-Meteo (réanalyse ERA5), moyenne et maximum quotidiens à 2 m, Genève (46,20 N · 6,14 E), ${year}`;

const controlWords = [
  cutoff.label,
  cutoff.claim.label,
  cutoff.claim.announce,
  ...cutoff.options.flatMap((o) => [o.label, o.announce, o.note]),
].join(" ");

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${bins.map((b) => b.label).join(" ")} ${controlWords}`,
  axis: `${MONTHS.join(" ")} 1 5 10 15 20 25 31 ${bins.map((b) => b.label).join(" ")}`,
  annot: streakNote,
  value: days.map((d) => d.detail).join(" "),
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedCalendarWeb,
      props: {
        days,
        bins,
        monthLabels: MONTHS,
        dayTicks: [1, 5, 10, 15, 20, 25, 31],
        claimRuns,
        streakNote,
        cutoff,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une grille de ${rows.length} cases, douze lignes de mois sur trente et un jours, chaque ` +
          `case teintée selon la température moyenne du jour à Genève en ${year}. Le bloc le plus ` +
          `foncé court du ${dayName(claim.from)} au ${dayName(claim.to)} : ${claim.length} jours ` +
          `consécutifs à ${CLAIM_THRESHOLD} °C ou plus, entourés d'un trait que le lecteur peut ` +
          `retracer à un autre seuil. Le mois le plus chaud est ${MONTHS_LONG[warmest.month - 1]} ` +
          `(${fr(warmest.mean)} °C de moyenne), le jour le plus chaud le ${dayName(hottest)} à ` +
          `${fr(hottest.mean)} °C.`,
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
if (refused.length) {
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
}
