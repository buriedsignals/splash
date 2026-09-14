// twin/proof/web-grouped-bar-wind-vs-solar/render-directions-web.mjs
//
// Wind against solar in six countries' 2024 electricity, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// Usage:  bun proof/web-grouped-bar-wind-vs-solar/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, fitY } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedGroupedBarWeb, FRAME } from "./DirectedGroupedBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };

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
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const k of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});

const measured = Object.keys(NAMES).map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  const total = SOURCES.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    wind: (r.Wind / total) * 100,
    solar: (r.Solar / total) * 100,
    windTwh: r.Wind,
    solarTwh: r.Solar,
    total,
  };
});

// ── THE DERIVED READINGS THE YARDSTICK ANSWERS WITH ───────────────────────────────────────────
// A rank among the drawn data and the ratio between the two series: neither is printed anywhere on
// the plate, and neither is something a reader can take off a grouped bar by eye, because the group
// boundary is built to keep each series' six columns apart. Derived here, in the runner, from the
// frozen file — the browser never computes one (`directed-interaction.md`, rule 4).
const rankOn = (key) => {
  const order = [...measured].sort((a, b) => b[key] - a[key]);
  return new Map(order.map((g, i) => [g.code, i + 1]));
};
const windRank = rankOn("wind");
const solarRank = rankOn("solar");

const groups = measured
  .map((g) => {
    const ratio = g.solar / g.wind;
    return {
      ...g,
      windRank: windRank.get(g.code),
      solarRank: solarRank.get(g.code),
      ratio,
      ratioPhrase:
        ratio >= 1
          ? `son solaire vaut ${fr(ratio, 1)} fois son éolien`
          : `son solaire vaut ${fr(ratio * 100, 0)} % de son éolien`,
      windLabel: fr(g.wind),
      solarLabel: fr(g.solar),
      detail:
        `${g.name} · ${YEAR} · éolien ${fr(g.wind)} % = ${fr(g.windTwh, 1)} TWh, solaire ` +
        `${fr(g.solar)} % = ${fr(g.solarTwh, 1)} TWh · sur une production totale de ` +
        `${fr(g.total, 0)} TWh`,
    };
  })
  .sort((x, z) => z.wind + z.solar - (x.wind + x.solar));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const outliers = groups.filter((g) => g.solar > g.wind);
if (outliers.length !== 1)
  throw new Error(`the headline names one country where solar beats wind; ${outliers.length} do`);
const subject = outliers[0];
console.log(
  `${groups.length} pays en ${YEAR} · un seul où le solaire dépasse l'éolien : ${subject.name} ` +
    `(${fr(subject.solar)} % contre ${fr(subject.wind)} %)\n`,
);
console.table(
  groups.map((g) => ({
    pays: g.name,
    "éolien %": g.windLabel,
    "rang éolien": `${g.windRank}/6`,
    "solaire %": g.solarLabel,
    "rang solaire": `${g.solarRank}/6`,
    "solaire/éolien": g.ratioPhrase,
  })),
);

const facts = beatFacts(
  groups.map((g) => ({ key: g.code, label: g.name, value: g.wind })),
  { subject: subject.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`\ntreatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(...groups.flatMap((g) => [g.wind, g.solar])) / 5) * 5;
const yTicks = Array.from({ length: ceiling / 5 + 1 }, (_, i) => i * 5).filter((t) => t % 10 === 0 || ceiling <= 20);

// ── THE YARDSTICK ─────────────────────────────────────────────────────────────────────────────
// Every option lays its two references at the SAME y the beat draws that country's two columns to.
// `fitY` is the one scale in this beat, called here with the same arguments the component calls it
// with, so a rule can never be drawn at a height the columns do not use.
const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);
const levels = {
  label: "Mesurer les six à l'aune de",
  noneLabel: "Chaque pays pour lui-même",
  options: groups.map((g) => ({
    key: g.code,
    label: g.name,
    announce:
      `${g.name} — éolien ${fr(g.wind)} %, ${g.windRank}e sur 6 ; solaire ${fr(g.solar)} %, ` +
      `${g.solarRank}e sur 6`,
    note:
      `${g.name} · éolien ${fr(g.wind)} % — ${g.windRank}e sur 6 · solaire ${fr(g.solar)} % — ` +
      `${g.solarRank}e sur 6 · ${g.ratioPhrase}`,
    marks: [
      { series: "wind", y: y(g.wind) },
      { series: "solar", y: y(g.solar) },
    ],
  })),
};

const title = `La ${subject.name} est la seule des six où le solaire dépasse l'éolien`;
const caveat =
  `Part de l'éolien et du solaire dans la production d'électricité de chaque pays en ${YEAR}. Les ` +
  `deux barres d'un pays se touchent, et l'écart avec le pays suivant est plus large qu'une barre : ` +
  `c'est ce qui fait lire des GROUPES plutôt qu'une file de barres alternées.`;
const readingLine =
  `Lecture : choisissez un pays pour poser ses deux niveaux en travers des cinq autres — la ` +
  `comparaison d'un groupe à l'autre que la séparation des groupes rend justement difficile. ` +
  `Survolez, touchez ou tabulez un groupe pour les TWh derrière chaque part.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} éolien solaire ${levels.label} ${levels.noneLabel} ` +
    `${groups.map((g) => g.name).join(" ")} ` +
    `${levels.options.map((o) => `${o.note} ${o.announce}`).join(" ")}`,
  axis: `${yTicks.join(" ")} % ${groups.map((g) => g.name).join(" ")}`,
  annot: `${groups.map((g) => g.detail).join(" ")}`,
  value: groups.flatMap((g) => [g.windLabel, g.solarLabel]).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Un fixe peut désigner la Suisse et affirmer qu'elle est la seule à basculer ; cette page laisse " +
    "le lecteur poser les deux niveaux suisses en travers des cinq autres pays et voir que son " +
    "solaire est 3e des six pendant que son éolien est dernier — la moitié de la démonstration " +
    "qu'un fixe n'a aucun moyen de dessiner.",
  controls: [
    {
      question:
        "La Suisse bascule — mais est-ce que son solaire est grand, ou son éolien absent ? Et ce " +
        "pays-ci, où se situe-t-il face aux cinq autres ?",
      gesture: "toggle-a-comparison",
      changes:
        "Deux règles traversent tout le plot, à la part d'éolien et à la part de solaire du pays " +
        "choisi, chacune dans l'encre de sa série ; le pays choisi prend un cerne et son nom passe " +
        "en encre pleine ; une phrase donne son rang sur chacune des deux séries et le rapport " +
        "entre les deux.",
    },
    {
      question:
        "7,2 % de quoi ? Combien de TWh y a-t-il derrière ces deux barres, et sur quelle " +
        "production totale ?",
      gesture: "ask-a-mark",
      changes:
        "Le groupe répond avec les TWh derrière chacune de ses deux parts et la production totale " +
        "du pays pour l'année — les quantités que le pourcentage a divisées, qu'aucun axe de cette " +
        "plaque ne porte.",
    },
  ],
};

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
      component: DirectedGroupedBarWeb,
      props: {
        groups,
        subject: subject.code,
        seriesLabels: { wind: "éolien", solar: "solaire" },
        yTicks,
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Six paires de colonnes, une paire par pays, mesurant la part de l'éolien et celle du ` +
          `solaire dans l'électricité de ${YEAR}. Dans cinq paires la colonne éolienne est la plus ` +
          `haute ; dans celle de la ${subject.name}, c'est la colonne solaire, ${fr(subject.solar)} % ` +
          `contre ${fr(subject.wind)} %.`,
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
