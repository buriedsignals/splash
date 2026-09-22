// twin/proof/web-dumbbell-life-expectancy-gains/render-directions-web.mjs
//
// Ten countries' life expectancy in 2000 and 2023 as dumbbells, rendered once per FILED DIRECTION
// into a self-contained interactive page.
//
// Usage:  bun proof/web-dumbbell-life-expectancy-gains/render-directions-web.mjs

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
import { levelSlugOf } from "../../skills/chart-web/assets/level.ts";
import { DirectedDumbbellWeb, SERIES, scaleFor } from "./DirectedDumbbellWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Monde";
const FROM = 2000;
const TO = 2023;
const NAMES = {
  POL: "Pologne", KOR: "Corée du Sud", PRT: "Portugal", ESP: "Espagne", ITA: "Italie",
  FRA: "France", DEU: "Allemagne", GBR: "Royaume-Uni", CHE: "Suisse", USA: "États-Unis",
  JPN: "Japon", SWE: "Suède", NLD: "Pays-Bas", AUT: "Autriche", NOR: "Norvège",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
// ASCII ordinals and no arrow, on purpose. The subset build embeds only what an embedded face can
// SET, and neither Open Sans nor Montserrat carries the superscript modifier U+1D49 or U+2192 — a
// `text=` request for characters a family does not have comes back as a kit URL that 404s the face,
// which refused all three directions of this beat before the change. "1er", not "1ᵉ"; "puis", not
// "→". Same rule the donut beat wrote down.
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { code: c[at("Code")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
});
const value = (code, year) => all.find((r) => r.code === code && r.year === year)?.value ?? null;
const codes = [...new Set(all.map((r) => r.code))].filter((c) => /^[A-Z]{3}$/.test(c));
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);

const rows = codes
  .map((code) => {
    const before = value(code, FROM);
    const after = value(code, TO);
    if (before === null || after === null)
      throw new Error(`${NAMES[code]} has no reading in ${before === null ? FROM : TO}`);
    return { code, name: NAMES[code], before, after, gain: after - before };
  })
  .sort((a, b) => b.gain - a.gain);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const losers = rows.filter((r) => r.gain <= 0);
if (losers.length)
  throw new Error(`the headline says every country gained years; ${losers.map((r) => r.name).join(", ")} did not`);
const most = rows[0];
const least = rows[rows.length - 1];
const gains = rows.map((r) => r.gain).sort((a, b) => a - b);
const medianGain = gains.length % 2 ? gains[(gains.length - 1) / 2] : (gains[gains.length / 2 - 1] + gains[gains.length / 2]) / 2;
console.log(
  `${rows.length} pays · tous en hausse · plus fort gain ${most.name} +${fr(most.gain)} ans · plus ` +
    `faible ${least.name} +${fr(least.gain)} · gain médian +${fr(medianGain)}\n`,
);
console.table(rows.map((r, i) => ({ rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after), gain: `+${fr(r.gain)}` })));

const signed = (v) => `${v >= 0 ? "+" : "-"}${fr(Math.abs(v))}`;
// A DISTANCE THAT ROUNDS TO ZERO IS NOT A READING. The page prints one decimal everywhere, so a row
// within half a tenth of the median would answer "+0,0 an face au gain médian" — a sentence that
// looks like a measurement and says nothing. Two of the ten are in that band.
const vsMedian = (gain) =>
  Math.abs(gain - medianGain) < 0.05
    ? `au niveau du gain médian (+${fr(medianGain)})`
    : `${signed(gain - medianGain)} an face au gain médian (+${fr(medianGain)})`;

const shaped = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  before: r.before,
  after: r.after,
  gain: r.gain,
  beforeLabel: fr(r.before),
  afterLabel: fr(r.after),
  gainLabel: `+${fr(r.gain)}`,
  // WHAT LINKS THE TWO ENDS, AND NEVER EITHER END AGAIN. `ask-a-line`, not `ask-a-mark`: the two
  // levels are printed beside their own heads on every row, so an answer repeating them is the
  // plate read back aloud. What the page cannot print ten times is the rank and the distance from
  // the group's own median gain, and that is what the bar answers with.
  detail:
    `${r.name} · +${fr(r.gain)} an${r.gain >= 2 ? "s" : ""} gagnés · ${ordinal(i + 1)} gain sur ` +
    `${rows.length} · ${vsMedian(r.gain)}`,
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: most.name,
    states: [String(FROM), String(TO)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "années",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const lo = Math.floor(Math.min(...rows.map((r) => r.before)));
const hi = Math.ceil(Math.max(...rows.map((r) => r.after)));
const xTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((t) => (t - lo) % 2 === 0);
if (xTicks[xTicks.length - 1] < hi) xTicks.push(hi);

// ── THE YARDSTICK THE READER LAYS ACROSS THE PLATE ────────────────────────────────────────────
//
// The plate is sorted by GAIN, which is the claim. That order buries the LEVELS: Poland tops the
// chart and is still, in 2023, the shortest-lived of the ten. A chosen country's own two levels,
// stood up across all ten rows, is the reading that order hides — and the counting below is what a
// reader would otherwise do by eye, one head at a time, ten times.
const byLevel = (year) => [...rows].sort((a, b) => b[year] - a[year]).map((r) => r.code);
const rank2000 = byLevel("before");
const rank2023 = byLevel("after");

// THE SECOND CLAIM, ASSERTED — it is what the yardstick is for, so it is held to the same standard
// as the headline. If a country ever does overtake another, the sentence in `BRIEF.md` stops being
// true and this refuses rather than ships it.
const overtook = rows.filter((r) => rank2000.indexOf(r.code) !== rank2023.indexOf(r.code));
if (overtook.length)
  throw new Error(
    `the page says not one of the ten changed rank between ${FROM} and ${TO}; ` +
      `${overtook.map((r) => r.name).join(", ")} did`,
  );

const xOf = scaleFor(xTicks);
const caseFacts = rows.map((r, i) => {
  const others = rows.filter((o) => o.code !== r.code);
  return {
    code: r.code,
    name: r.name,
    before: r.before,
    after: r.after,
    gainRank: i + 1,
    r2000: rank2000.indexOf(r.code) + 1,
    r2023: rank2023.indexOf(r.code) + 1,
    // Already living longer in 2000 than this country manages in 2023 — the count the two uprights
    // draw, on the left of the left rule.
    aheadThen: others.filter((o) => o.before >= r.after).length,
    // Still, in 2023, below where this country stood in 2000 — the same count on the other side.
    behindNow: others.filter((o) => o.after <= r.before).length,
  };
});

const counted = (n, one, many, none) => (n === 0 ? none : n === 1 ? one : `${n} ${many}`);
const levels = {
  label: "À l'aune de",
  noneLabel: "Aucun repère",
  options: caseFacts.map((c) => {
    const head = `${ordinal(c.r2000)} niveau sur ${rows.length} en ${FROM}, ${ordinal(c.r2023)} en ${TO}`;
    const ahead = counted(
      c.aheadThen,
      `un pays vivait déjà en ${FROM}`,
      `pays vivaient déjà en ${FROM}`,
      `aucun pays ne vivait en ${FROM}`,
    );
    const behind = counted(
      c.behindNow,
      `un est encore en ${TO}`,
      `sont encore en ${TO}`,
      `aucun n'est encore en ${TO}`,
    );
    return {
      key: c.code,
      label: c.name,
      announce: plain(`${c.name} — ${head} ; ${ahead} plus longtemps que son niveau de ${TO}`),
      note: plain(
        `${c.name} · ${head} · ${ahead} plus longtemps que son niveau de ${TO} · ` +
          `${behind} sous son niveau de ${FROM}`,
      ),
      // TWO REFERENCES, STOOD UP. On this shape the value axis is horizontal, so a country's own
      // levels are uprights, not flat rules — `level.ts`'s `x` mark, cut for the scatter and
      // unchanged here. Both, never one: an option laying a rule on one of the two states answers
      // half the question while looking like it answered all of it.
      marks: [
        { series: SERIES[0], x: xOf(c.before) },
        { series: SERIES[1], x: xOf(c.after) },
      ],
    };
  }),
};

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    `Un fixe doit choisir un ordre, et cet ordre est celui de l'auteur. Rangée par gain, cette ` +
    `plaque dit qui a le plus progressé et cache qui vit le plus longtemps : la ${most.name} est ` +
    `en tête avec +${fr(most.gain)} ans et reste, en ${TO}, la moins longévive des dix. Ici le ` +
    `lecteur choisit le pays à l'aune duquel les neuf autres sont mesurés, et ce qui revient est ` +
    `le fait que l'ordre des gains enterre : aucun des dix n'a changé de rang en ` +
    `${TO - FROM} ans.`,
  controls: [
    {
      question:
        `Ce pays-là, il est où par rapport aux autres — et est-ce que ça a bougé entre ${FROM} et ` +
        `${TO} ?`,
      gesture: "find-your-own-case",
      changes:
        `Deux références en pointillé se dressent à travers les dix lignes, aux deux niveaux du ` +
        `pays choisi, chacune sur une gaine couleur fond pour rester lisible là où elle croise une ` +
        `barre ou une tête. Ses deux têtes prennent un cerne d'encre pleine parmi dix-huit qui ne ` +
        `gardent que la couleur de leur état ; son nom passe en encre pleine et les neuf autres ` +
        `reculent. Une phrase donne son rang de niveau en ${FROM} et en ${TO}, combien des neuf ` +
        `autres étaient déjà au-dessus de son niveau de ${TO}, et combien sont encore sous son ` +
        `niveau de ${FROM}.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "le pays à l'aune duquel les autres sont mesurés",
      authorPicked: "none",
      readerPicks: ["none", "pol", "fra", "esp", "che", "ita", "nld", "jpn", "gbr", "deu", "usa"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Celui-là a gagné combien, et ça le met où parmi les dix ?",
      gesture: "ask-a-line",
      changes:
        `La barre de la ligne visée passe en encre pleine — la forme dont il est question, pas un ` +
        `point posé en son milieu — et répond avec le gain, son rang parmi les dix et son écart au ` +
        `gain médian, qui n'est imprimé nulle part sur la page. Jamais avec les deux niveaux : ils ` +
        `sont déjà écrits à côté de leurs propres têtes.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel trait est en question",
      authorPicked: "la Pologne",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const title = `Les dix ont tous gagné des années de vie depuis ${FROM} — la ${most.name} +${fr(most.gain)}, les ${least.name} +${fr(least.gain)}`;
const caveat =
  `Espérance de vie à la naissance, ${FROM} et ${TO}. La barre entre les deux têtes EST l'écart : ` +
  `un haltère répond à « de combien se sont-ils éloignés », pas à « à quelle distance de zéro » — ` +
  `l'axe est ajusté pour cette raison et ne part pas de zéro.`;
const readingLine =
  `Lecture : lignes rangées par gain. Choisissez un pays pour dresser ses deux niveaux sur la ` +
  `plaque ; survolez ou tabulez une ligne pour son rang.`;
const source = `Source : UN WPP via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${FROM} ${TO} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${xTicks.join(" ")} ${rows.map((r) => r.name).join(" ")}`,
  annot: shaped.map((r) => r.gainLabel).join(" "),
  value: shaped.flatMap((r) => [r.beforeLabel, r.afterLabel]).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedDumbbellWeb,
      props: {
        rows: shaped,
        subject: most.code,
        xTicks,
        stateLabels: { before: String(FROM), after: String(TO) },
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Dix haltères horizontaux, un par pays, classés du plus fort au plus faible gain. Chaque ` +
          `barre relie l'espérance de vie de ${FROM} à celle de ${TO}. La ${most.name} gagne le ` +
          `plus, +${fr(most.gain)} ans (${fr(most.before)} puis ${fr(most.after)}) ; les ` +
          `${least.name} le moins, +${fr(least.gain)} (${fr(least.before)} puis ${fr(least.after)}). ` +
          `Aucune barre ne va vers la gauche. Un choix de pays dresse les deux niveaux de ce pays ` +
          `en références verticales à travers les dix lignes ; aucun des dix n'a changé de rang de ` +
          `niveau entre ${FROM} et ${TO}.`,
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
