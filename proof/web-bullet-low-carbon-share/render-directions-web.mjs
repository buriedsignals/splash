// twin/proof/web-bullet-low-carbon-share/render-directions-web.mjs
//
// Low-carbon electricity as a share of six countries' own generation, judged against a target THE
// READER CHOOSES, rendered once per FILED DIRECTION into a self-contained interactive page.
//
// THE SHARE IS COMPUTED FROM THE NINE SOURCE COLUMNS, never read off a "low-carbon" column that does
// not exist in the file. The same nine columns are what each row's own detail string carries.
//
// EVERY TARGET THE CONTROL OFFERS IS DERIVED HERE AND DECLARES WHERE IT CAME FROM, and
// `assertBenchmarkDeclaration` refuses a provenance it cannot check — the catalogue's own trap for
// this type is not a drawing bug, it is a manufactured judgement ("don't invent a target just to
// unlock the bullet's shape"), and a control that offers four targets invites inventing three.
//
// Usage:  bun proof/web-bullet-low-carbon-share/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertOneBenchmark,
  benchmarkGapOf,
  benchmarkSlugOf,
  BENCHMARK_CLAIM_SLUG,
} from "../../skills/chart-web/assets/benchmark.ts";
import { DirectedBulletWeb } from "./DirectedBulletWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const BEFORE = 2015;
const AFTER = 2024;
const THRESHOLD = 50;
const SCALE_MAX = 100;
const LOW_CARBON = ["Nuclear", "Hydropower", "Wind", "Solar", "Bioenergy", "Other renewables"];
const FOSSIL = ["Coal", "Gas", "Oil"];
const NAMES = {
  POL: "Pologne", DEU: "Allemagne", FRA: "France", CHE: "Suisse", NOR: "Norvège", SWE: "Suède",
};
const FR_SOURCE = {
  Nuclear: "nucléaire", Hydropower: "hydraulique", Wind: "éolien", Solar: "solaire",
  Bioenergy: "biomasse", "Other renewables": "autres renouvelables",
  Coal: "charbon", Gas: "gaz", Oil: "pétrole",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
/** A signed number of points, in the page's own words. `−` is U+2212, as everywhere on this base. */
const pts = (v) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v))} pts`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`the frozen file has no ${name} column; it has ${header.join(", ")}`);
  return i;
};
const rowsRaw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("Code")], entity: c[at("Entity")], year: Number(c[at("Year")]) };
  for (const key of [...LOW_CARBON, ...FOSSIL]) o[key] = Number(c[at(key)]);
  return o;
});

function shareFor(code, year) {
  const row = rowsRaw.find((r) => r.code === code && r.year === year);
  if (!row) throw new Error(`${code} has no row for ${year} in the frozen file`);
  const low = LOW_CARBON.reduce((s, k) => s + row[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + row[k], 0);
  if (!(total > 0)) throw new Error(`${code} ${year} generates nothing in this file`);
  return { row, low, total, share: (low / total) * 100 };
}

const base = Object.keys(NAMES).map((code) => {
  const before = shareFor(code, BEFORE);
  const after = shareFor(code, AFTER);
  const parts = LOW_CARBON.map((k) => ({ key: k, pct: (after.row[k] / after.total) * 100 }))
    .filter((p) => p.pct >= 0.5)
    .sort((a, b) => b.pct - a.pct);
  return {
    code,
    name: NAMES[code],
    before: before.share,
    after: after.share,
    change: after.share - before.share,
    beforeLabel: `${fr(before.share)} %`,
    afterLabel: `${fr(after.share)} %`,
    changeLabel: pts(after.share - before.share),
    detail:
      `${fr(after.share)} % bas-carbone en ${AFTER} (${fr(before.share)} % en ${BEFORE}, ` +
      `${pts(after.share - before.share)}) · ` +
      parts.map((p) => `${FR_SOURCE[p.key]} ${fr(p.pct)} %`).join(", "),
  };
}).sort((a, b) => b.change - a.change);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const mover = base[0];
const under = base.filter((r) => r.after < THRESHOLD);
if (under.length !== 1 || under[0].code !== mover.code)
  throw new Error(
    `the headline says the biggest mover is the only one still under ${THRESHOLD} %; ` +
      `under it are ${under.map((r) => r.name).join(", ") || "none"}, biggest mover ${mover.name}`,
  );

// ── THE FOUR TARGETS, DERIVED ─────────────────────────────────────────────────────────────────
// Not one of them is typed. The plate's own is each row's own 2015; the second is the line the title
// already draws in words; the last two are statistics OF THE SIX ROWS THIS BEAT DRAWS, which is the
// only kind of "target" a file with no policy column can honestly carry.
const values = base.map((r) => r.after).sort((a, b) => a - b);
const MEDIAN = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
const leader = base.reduce((best, r) => (r.after > best.after ? r : best));
const flat = (v) => Object.fromEntries(base.map((r) => [r.code, v]));

const TARGETS = [
  {
    slug: BENCHMARK_CLAIM_SLUG,
    label: `son propre ${BEFORE}`,
    provenance: "own-earlier-value",
    at: Object.fromEntries(base.map((r) => [r.code, r.before])),
  },
  { slug: benchmarkSlugOf("half"), label: "la moitié", provenance: "stated-in-the-claim", at: flat(THRESHOLD) },
  { slug: benchmarkSlugOf("median"), label: "la médiane des six", provenance: "a-statistic-of-the-drawn-set", at: flat(MEDIAN) },
  { slug: benchmarkSlugOf("leader"), label: `la ${leader.name}`, provenance: "a-statistic-of-the-drawn-set", at: flat(leader.after) },
];

/** Every row's verdict under one target, in the page's own order and its own words. */
const verdictsUnder = (target) =>
  base.map((r) => {
    const { gap, verdict } = benchmarkGapOf(r.after, target.at[r.code]);
    return {
      ...r,
      gap,
      verdict,
      // A gap of nothing prints as words and not as "+0,0 pts": the yardstick cannot be at a
      // distance from itself, and a zero-length rect draws as nothing at all.
      text: verdict === "level" ? `${r.afterLabel} · pile la cible` : `${r.afterLabel} · ${pts(gap)}`,
    };
  });
const underTarget = new Map(TARGETS.map((t) => [t.slug, verdictsUnder(t)]));
const clears = (slug) => underTarget.get(slug).filter((v) => v.verdict !== "short");

// ── WHAT THE CONTROL IS FOR, ASSERTED ─────────────────────────────────────────────────────────
// The gesture's whole claim is that the verdict is a property of the TARGET and not of the data: the
// six bars never move and the podium turns over anyway. If that stops being true the control still
// works and the sentence under it is a lie, so it is checked rather than written.
//
// AND IT IS CHECKED IN THE FORM THAT IS ACTUALLY TRUE. The two orders are not straight reverses of
// each other — the yardstick itself sits at rank one under its own target and rank five under the
// plate's — so the claim is stated with the yardstick removed, where it is exact.
const byChange = base.map((r) => r.code);
const byGap = [...underTarget.get(TARGETS[3].slug)]
  .sort((a, b) => b.gap - a.gap)
  .map((v) => v.code);
const withoutLeader = (list) => list.filter((code) => code !== leader.code);
if (withoutLeader(byChange).reverse().join(",") !== withoutLeader(byGap).join(","))
  throw new Error(
    `the note says that with ${leader.name} removed the other five rank exactly backwards under ` +
      `its own target; by gain they are ${withoutLeader(byChange).join(", ")} and by distance ` +
      `${withoutLeader(byGap).join(", ")}`,
  );
if (clears(TARGETS[0].slug).length !== base.length)
  throw new Error(`the plate's own target is "did it improve", and ${base.length - clears(TARGETS[0].slug).length} row(s) did not`);
const distinct = new Set(TARGETS.map((t) => clears(t.slug).length));
if (distinct.size < 3)
  throw new Error(
    `four targets that sort the six into ${distinct.size} distinct verdicts are not four questions; ` +
      `they clear ${TARGETS.map((t) => `${t.label}: ${clears(t.slug).length}`).join(", ")}`,
  );

// ── THE ROWS THE COMPONENT DRAWS ──────────────────────────────────────────────────────────────
const rows = base.map((r) => ({
  code: r.code,
  name: r.name,
  before: r.before,
  after: r.after,
  change: r.change,
  afterLabel: r.afterLabel,
  detail: r.detail,
  verdicts: TARGETS.map((t) => ({
    slug: t.slug,
    text: underTarget.get(t.slug).find((v) => v.code === r.code).text,
  })),
}));

// THE HEADLINE IS THE STATIC SIBLING'S CLAIM, SAID SHORTER, and the shortening is a measurement and
// not a preference: `nocturne` sets the display register at 32 px, uppercase, tracked 3,4, so at
// 375 px the longer form ran to twelve lines — 408 px of a 812 px window, before the control, the
// sentence it reserves and the plot. Both halves of the claim survive, and the number the old title
// carried is printed on the row it belongs to. `la moitié` has to stay in these words: it is what
// `assertBenchmarkDeclaration` checks the `stated-in-the-claim` target against.
const title = `Seule des six sous la moitié, la ${mover.name} est celle qui a le plus gagné depuis ${BEFORE}`;

const half = underTarget.get(TARGETS[1].slug);
const halfShort = half.filter((v) => v.verdict === "short");
const halfNearest = half.filter((v) => v.verdict !== "short").sort((a, b) => a.gap - b.gap)[0];
const med = underTarget.get(TARGETS[2].slug);
const medNearestShort = med.filter((v) => v.verdict === "short").sort((a, b) => b.gap - a.gap)[0];
const lead = underTarget.get(TARGETS[3].slug);
const leadFirst = lead.find((v) => v.code === byChange[0]);
const leadLast = lead.find((v) => v.code === byChange[byChange.length - 1]);

// THE SENTENCES ARE SHORT BECAUSE THEY ARE ALL RESERVED AT ONCE. `benchmark.ts` stacks every note
// in one grid cell so that choosing a target cannot push the plot down — the reader operates a
// control and the picture stands exactly still — and the price of that is a box as tall as the
// LONGEST of them at every width. Measured: at 375 px the first draft's sentences took 112 px and
// carried `nocturne` 93 px past the fold. The height had to come out of the words.
const NOTES = {
  [TARGETS[1].slug]:
    `${clears(TARGETS[1].slug).length} des ${base.length} franchissent la moitié ; ` +
    `${halfShort.length === 1 ? `seule la ${halfShort[0].name} reste dessous` : `${halfShort.length} restent dessous`}, ` +
    `à ${fr(Math.abs(halfShort[0].gap))} pts. La plus juste au-dessus : ${halfNearest.name}, ${pts(halfNearest.gap)}.`,
  [TARGETS[2].slug]:
    `Médiane des ${base.length} en ${AFTER} : ${fr(MEDIAN)} %. ` +
    `${clears(TARGETS[2].slug).length} sur ${base.length} la franchissent. ` +
    `La ${medNearestShort.name} passe dessous de ${fr(Math.abs(medNearestShort.gap))} pts, ` +
    `la ${mover.name} de ${fr(Math.abs(med.find((v) => v.code === mover.code).gap))}.`,
  [TARGETS[3].slug]:
    `Contre la ${leader.name}, ${clears(TARGETS[3].slug).length} sur ${base.length} : elle-même. ` +
    `Retirez l'étalon et les cinq autres se rangent à l'envers du gain depuis ${BEFORE} — ` +
    `la ${leadFirst.name}, première au gain, est la plus loin (${fr(Math.abs(leadFirst.gap))} pts) ; ` +
    `la ${leadLast.name}, dernière, la plus proche (${fr(Math.abs(leadLast.gap))} pts).`,
};

const benchmark = {
  label: "Mesurer chaque pays contre",
  claimText: title,
  claim: {
    label: TARGETS[0].label,
    announce: `${TARGETS[0].label} — chaque pays jugé contre sa propre part de ${BEFORE}, la cible du graphique`,
    provenance: TARGETS[0].provenance,
    at: TARGETS[0].at,
  },
  options: TARGETS.slice(1).map((t, i) => ({
    key: ["half", "median", "leader"][i],
    label: t.label,
    announce:
      `${t.label} — ` +
      (t.provenance === "stated-in-the-claim"
        ? `${THRESHOLD} % de la production, la ligne que le titre nomme`
        : `${fr(t.at[base[0].code])} %, calculée sur les ${base.length} pays du graphique`) +
      ` · ${clears(t.slug).length} sur ${base.length} la franchissent`,
    note: NOTES[t.slug],
    provenance: t.provenance,
    at: t.at,
  })),
};

console.log(
  `${rows.length} pays · plus fort gain ${mover.name} ${mover.changeLabel} · seul sous ${THRESHOLD} % : ` +
    `${under.map((r) => r.name).join(", ")} · médiane ${fr(MEDIAN)} % · étalon ${leader.name} ${leader.afterLabel}\n`,
);
console.table(
  base.map((r) => ({
    pays: r.name,
    [BEFORE]: r.beforeLabel,
    [AFTER]: r.afterLabel,
    ...Object.fromEntries(
      TARGETS.map((t) => [t.label, underTarget.get(t.slug).find((v) => v.code === r.code).text.split(" · ")[1]]),
    ),
  })),
);
console.log(
  `\nfranchissent : ${TARGETS.map((t) => `${t.label} ${clears(t.slug).length}/${base.length}`).join(" · ")}\n` +
    `gain : ${withoutLeader(byChange).map((c) => NAMES[c]).join(" > ")}\n` +
    `écart à l'étalon : ${withoutLeader(byGap).map((c) => NAMES[c]).join(" > ")} (exactement l'inverse)\n`,
);

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: mover.name,
    states: [String(BEFORE), String(AFTER)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "% d'électricité bas-carbone",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE WORDS ARE SHORT BECAUSE THE PAGE HAS TO FIT A PHONE, and this beat measured the cost of the
// control rather than guessing at it: the fieldset and its reserved sentence take 85 px at 375 px
// wide, and `nocturne` — whose display register is the largest of the three — came out 902 px in an
// 812 px window with the plot already squeezed onto its own 120 px floor. The height had to come out
// of the prose, which is the only part of the figure that was longer than it needed to be.
const caveat =
  `Part du nucléaire et de toutes les renouvelables dans la production de chaque pays ; à droite de ` +
  `la barre, le fossile. Le trait est la CIBLE que vous choisissez — aucune n'est une politique.`;
const thresholdNote = "la moitié";
const readingLine =
  `Lecture : changez de cible. Les barres ne bougent pas, c'est l'étalon qui change — le trait glisse ` +
  `et l'écart se redessine : plein au-delà, creux en deçà. Survolez une ligne pour ses sources.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${BEFORE} et ${AFTER}`;
const xTicks = [0, 25, 50, 75, 100];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} % ${rows.map((r) => r.name).join(" ")} ${benchmark.label} ${TARGETS.map((t) => t.label).join(" ")}`,
  annot: `${thresholdNote} ${Object.values(NOTES).join(" ")}`,
  value: rows.flatMap((r) => r.verdicts.map((v) => v.text)).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const outPath = join(OUT, `${id}.html`);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedBulletWeb,
      props: {
        rows,
        subject: mover.code,
        benchmark,
        scaleMax: SCALE_MAX,
        threshold: THRESHOLD,
        thresholdNote,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Six pistes horizontales allant de 0 à ${SCALE_MAX} %, une par pays, mesurant la part de ` +
          `l'électricité bas-carbone en ${AFTER}. La ${mover.name} passe de ${mover.beforeLabel} à ` +
          `${mover.afterLabel}, le plus fort gain des six, et reste la seule dont la barre n'atteint ` +
          `pas la moitié de la piste. ${base[base.length - 1].name} est à ${base[base.length - 1].afterLabel}. ` +
          `Sur chaque ligne, un trait marque la cible et un bloc marque l'écart à cette cible : plein ` +
          `au-delà, creux en deçà. Un contrôle au-dessus change la cible des six lignes à la fois — ` +
          `leur propre ${BEFORE}, la moitié, la médiane des six, ou la ${leader.name}.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // THE MARKUP, READ BACK. `renderWeb` holds the format's own guards; a vocabulary this beat
    // brought with it holds its own, on the page that was actually written — a half-tagged row here
    // is a country sitting under every target with the plate's own tick still drawn on it.
    assertOneBenchmark(
      await readFile(outPath, "utf8"),
      benchmark,
      rows.map((r) => ({ key: r.code, value: r.after })),
    );
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    // A refused page must not stay on the disk looking like a produced one, and a runner that
    // swallows a refusal makes a red render look green to everything downstream.
    await rm(outPath, { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
