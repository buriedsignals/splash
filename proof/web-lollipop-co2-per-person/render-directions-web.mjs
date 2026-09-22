// twin/proof/web-lollipop-co2-per-person/render-directions-web.mjs
//
// The six largest CO₂ emitters, per person, in 2000 and 2023, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE SIX ARE A COMPUTED RULE, NOT A PICK: the countries with the largest TOTAL emissions in 2023,
// where the total is the per-person figure times the population, both from the frozen file. Which is
// also why the plate's order is NOT the order of the levels it draws — the reader's yardstick below
// is what gives that order back.
//
// ASCII ORDINALS AND NO ARROW, ON PURPOSE. The subset build embeds only what an embedded face can
// SET, and neither Open Sans nor Montserrat carries U+1D49 or U+2192 — a `text=` request for
// characters a family does not have comes back as a kit URL that 400s the face and refuses all three
// directions. "1er", not "1ᵉ"; "puis", not an arrow.
//
// Usage:  bun proof/web-lollipop-co2-per-person/render-directions-web.mjs

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
import { DirectedLollipopWeb, SERIES, scaleFor } from "./DirectedLollipopWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const UNIT = "tonnes de CO₂ par personne";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};
// The same names inside a sentence. A country's name is a label on the plate and a subject in the
// yardstick's own prose, and French does not let one string be both: "aujourd'hui, Japon est entre
// ses deux niveaux" is what a template writes and nobody says.
const IN_PROSE = {
  CHN: "la Chine", USA: "les États-Unis", IND: "l'Inde", RUS: "la Russie", JPN: "le Japon",
  IRN: "l'Iran", IDN: "l'Indonésie", SAU: "l'Arabie saoudite", DEU: "l'Allemagne",
  KOR: "la Corée du Sud", BRA: "le Brésil",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const people = (v) => `${fr(v / 1e6, 0)} millions d'habitants`;
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
const listOf = (names) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    before: Number(c[at("t_per_person_2000")]),
    after: Number(c[at("t_per_person_2023")]),
    people: Number(c[at("population_2023")]),
  };
});
for (const c of all)
  if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after) || !(c.people > 0))
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const withTotals = all.map((c) => ({ ...c, total: (c.after * c.people) / 1e9 }));
const worldTotal = withTotals.reduce((s, c) => s + c.total, 0);
const ranked = [...withTotals].sort((a, b) => b.total - a.total);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen)
  if (!NAMES[c.code] || !IN_PROSE[c.code])
    throw new Error(`${c.code} (${c.entity}) has no French name filed, or no form to put in a sentence`);
const chosenShare = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const subject = chosen.find((c) => c.code === SUBJECT);
const other = chosen.find((c) => c.code === "USA");
if (!subject || !other) throw new Error("the headline names China and the United States");
const grew = subject.after / subject.before;
const ratioBefore = other.before / subject.before;
const ratioAfter = other.after / subject.after;
if (!(grew > 2.5)) throw new Error(`the headline says the subject roughly tripled; it multiplied by ${fr(grew, 2)}`);
if (!(ratioBefore > 5 && ratioAfter < 2.5 && ratioAfter > 1))
  throw new Error(`the ratio went from ${fr(ratioBefore)} to ${fr(ratioAfter)}`);
if (!(chosenShare > 55)) throw new Error(`the six carry ${fr(chosenShare)} % of the world total`);
console.log(
  `${all.length} pays lus · les ${HOW_MANY} plus gros émetteurs ${TO} pèsent ${fr(chosenShare)} % · ` +
    `${NAMES[SUBJECT]} x${fr(grew, 2)} · rapport USA/${SUBJECT} ${fr(ratioBefore)} -> ${fr(ratioAfter)}\n`,
);

const pairs = chosen.map((c) => {
  const change = ((c.after - c.before) / c.before) * 100;
  return {
    code: c.code,
    name: NAMES[c.code],
    before: c.before,
    after: c.after,
    beforeLabel: fr(c.before),
    afterLabel: fr(c.after),
    changeLabel: `${change >= 0 ? "+" : "−"}${fr(Math.abs(change), 0)} %`,
    rising: change >= 0,
    detail:
      `${NAMES[c.code]} · ${fr(c.before)} t par personne en ${FROM}, puis ${fr(c.after)} t en ${TO} ` +
      `(${change >= 0 ? "+" : "−"}${fr(Math.abs(change), 0)} %) · ${people(c.people)} · ` +
      `${fr(c.total, 2)} Gt au total en ${TO}, soit ${fr((c.total / worldTotal) * 100)} % du monde`,
  };
});
console.table(pairs.map((p) => ({ pays: p.name, [FROM]: p.beforeLabel, [TO]: p.afterLabel, écart: p.changeLabel })));

const facts = beatFacts(
  pairs.map((p) => ({ key: p.code, label: p.name, value: p.after })),
  {
    subject: NAMES[SUBJECT],
    states: [String(FROM), String(TO)],
    markers: pairs.map((p) => ({ key: p.code, label: p.name, value: p.before })),
    declaredSequence: UNIT,
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(...pairs.flatMap((p) => [p.before, p.after])) / 5) * 5;
const yTicks = Array.from({ length: ceiling / 5 + 1 }, (_, i) => i * 5);

// ── THE YARDSTICK THE READER LAYS ACROSS THE PLATE ────────────────────────────────────────────
//
// The six are ranked by TOTAL emissions, which is the selection rule and also what buries the levels
// a per-person chart exists to show: India is third on the plate and last of the six per person. A
// chosen country's own two levels, laid flat across all six pairs, is the reading that order hides —
// and the counting below is what a reader would otherwise do by eye, one head at a time.
const byLevel = (year) => [...chosen].sort((a, b) => b[year] - a[year]).map((c) => c.code);
const rank2000 = byLevel("before");
const rank2023 = byLevel("after");
const top2000 = chosen.reduce((m, c) => (c.before > m.before ? c : m));
const top2023 = chosen.reduce((m, c) => (c.after > m.after ? c : m));

// THE SECOND CLAIM, ASSERTED — it is what the yardstick is for, so it is held to the same standard
// as the headline. The note generalises the headline's own arithmetic to whichever country the
// reader picks: "the highest of the six out-emitted it R times per person". That sentence is only
// the headline's when the highest of the six at BOTH dates is the country the headline names.
if (top2000.code !== "USA" || top2023.code !== "USA")
  throw new Error(
    `the yardstick's sentence generalises the headline's ratio, which needs the United States to be ` +
      `the highest per-person level of the six at both dates; ${FROM} is ${top2000.code} and ${TO} is ${top2023.code}`,
  );
const movedRank = chosen.filter((c) => rank2000.indexOf(c.code) !== rank2023.indexOf(c.code));
if (!movedRank.length)
  throw new Error(`the page says the level order moved under the total order; not one of the six changed level rank`);
console.log(
  `niveaux ${FROM}: ${rank2000.join(" ")} · ${TO}: ${rank2023.join(" ")} · ` +
    `${movedRank.length} des ${HOW_MANY} ont changé de rang de niveau\n`,
);

const y = scaleFor(yTicks);
const levels = {
  label: "À l'aune de",
  noneLabel: "Aucun repère",
  options: chosen.map((c) => {
    const others = chosen.filter((o) => o.code !== c.code);
    const lo = Math.min(c.before, c.after);
    const hi = Math.max(c.before, c.after);
    const between = others.filter((o) => o.after >= lo && o.after <= hi).map((o) => IN_PROSE[o.code]);
    const head =
      `${ordinal(rank2000.indexOf(c.code) + 1)} niveau sur ${HOW_MANY} en ${FROM}, ` +
      `${ordinal(rank2023.indexOf(c.code) + 1)} en ${TO}`;
    const spread =
      c.code === top2000.code && c.code === top2023.code
        ? `c'est lui le plus haut niveau des ${HOW_MANY} pays aux deux dates`
        : `le plus haut niveau des ${HOW_MANY} pays valait ${fr(top2000.before / c.before)} fois le ` +
          `sien en ${FROM}, ${fr(top2023.after / c.after)} fois en ${TO}`;
    const inside =
      between.length === 0
        ? `aucun des ${HOW_MANY - 1} autres n'est aujourd'hui entre ses deux niveaux`
        : `aujourd'hui, ${listOf(between)} ${between.length > 1 ? "sont" : "est"} entre son niveau ` +
          `de ${FROM} et celui de ${TO}`;
    return {
      key: c.code,
      label: NAMES[c.code],
      announce: plain(`${NAMES[c.code]} — ${head} ; ${spread}`),
      note: plain(`${NAMES[c.code]} · ${head} · ${spread} · ${inside}`),
      // TWO REFERENCES, LAID FLAT. On this shape the value axis is vertical, so a country's own
      // levels are horizontal rules — `level.ts`'s original `y` mark, unwidened. Both, never one: an
      // option laying a rule on one of the two dates answers half the question while looking like it
      // answered all of it.
      marks: [
        { series: SERIES[0], y: y(c.before) },
        { series: SERIES[1], y: y(c.after) },
      ],
    };
  }),
};

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    `Le fixe fige les deux bouts choisis par l'auteur — ${fr(ratioBefore)} hier, ${fr(ratioAfter)} ` +
    `aujourd'hui, la ${NAMES[SUBJECT]} contre les ${NAMES.USA} — et l'ordre dessiné, celui des ` +
    `émissions TOTALES, cache justement les niveaux : l'${NAMES.IND} est troisième sur la plaque et ` +
    `dernière des ${HOW_MANY} par personne. Ici le lecteur choisit le pays à l'aune duquel les cinq ` +
    `autres sont mesurés, et ce qui revient est ce que cet ordre enterre : ${movedRank.length} des ` +
    `${HOW_MANY} ont changé de rang de niveau en ${TO - FROM} ans, et le ${NAMES.JPN} est ` +
    `aujourd'hui entre le niveau de ${FROM} de la ${NAMES[SUBJECT]} et celui de ${TO}.`,
  controls: [
    {
      question:
        `L'écart, moi je le veux avec ce pays-là — il est où par rapport aux cinq autres, et qui est ` +
        `passé entre ses deux niveaux ?`,
      gesture: "find-your-own-case",
      changes:
        `Deux références en pointillé se couchent à travers les six paires, aux deux niveaux du pays ` +
        `choisi, chacune sur une gaine couleur fond pour rester lisible là où elle croise une tige, ` +
        `une tête ou une ligne de grille. Ses deux têtes prennent un cerne d'encre pleine parmi ` +
        `douze qui ne gardent que la couleur de leur date ; son nom passe en encre pleine et les ` +
        `cinq autres reculent. Une phrase donne son rang de NIVEAU en ${FROM} et en ${TO}, combien ` +
        `de fois le plus haut des ${HOW_MANY} en émettait plus que lui à chaque date, et lesquels ` +
        `des cinq autres sont aujourd'hui entre ses deux niveaux.`,
    },
    {
      question: `Une moyenne par personne, c'est une division. Combien de personnes ?`,
      gesture: "ask-a-mark",
      changes:
        `La paire visée prend un halo d'encre sur ses deux têtes — les deux formes dont il est ` +
        `question, qui gardent la couleur de leur date — et répond avec le POIDS derrière le ` +
        `rapport : la population par laquelle la division a été faite, le total du pays en ` +
        `gigatonnes et sa part du monde, qu'un encodage par personne ne peut pas dessiner.`,
    },
  ],
};

const title = `La ${NAMES[SUBJECT]} a triplé son CO₂ par personne depuis ${FROM} ; l'Américain moyen n'en émet plus que ${fr(ratioAfter)} fois plus`;
// THE PROSE IS WHERE THE CONTROL IS PAID FOR. Seven pills and a reserved sentence are 94 px of
// chrome, which at 375 x 812 pushed the figure 49 px past the window in nocturne, whose display
// register alone takes 444 px there. Given back in words rather than in plot: the caveat and the
// reading line are each a sentence shorter than the still's.
const caveat =
  `${FROM} en teinte claire, ${TO} en plein, chaque niveau mesuré DEPUIS ZÉRO — ce qu'une paire de ` +
  `sucettes montre et qu'un haltère cache. Chaque chiffre est écrit au-dessus de sa propre tête, ` +
  `donc pas d'axe des valeurs.`;
const rule = `Sélection : les ${HOW_MANY} pays au plus fort total ${TO} — par personne × population — soit ${fr(chosenShare)} % du CO₂ mondial.`;
const readingLine =
  `Lecture : les six sont rangés par total, pas par niveau. Choisissez un pays pour coucher ses deux ` +
  `niveaux sur la plaque ; survolez ou tabulez une paire pour la POPULATION derrière le ratio.`;
const source = `Source : Global Carbon Budget 2025 · population ${TO}, via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${UNIT} ${FROM} ${TO} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${yTicks.join(" ")} ${pairs.map((p) => `${p.name} ${p.changeLabel}`).join(" ")}`,
  annot: rule,
  value: pairs.flatMap((p) => [p.beforeLabel, p.afterLabel]).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
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
      component: DirectedLollipopWeb,
      props: {
        pairs,
        subject: SUBJECT,
        yTicks,
        unit: UNIT,
        stateLabels: { before: String(FROM), after: String(TO) },
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, rule,
        alt:
          `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} ` +
          `(teinte claire) et en ${TO} (plein), chaque tige partant de zéro. La ${NAMES[SUBJECT]} ` +
          `monte de ${fr(subject.before)} à ${fr(subject.after)} tonnes, les États-Unis descendent ` +
          `de ${fr(other.before)} à ${fr(other.after)} : le rapport entre les deux passe de ` +
          `${fr(ratioBefore)} à ${fr(ratioAfter)}. Sous chaque paire, le nom du pays et son ` +
          `pourcentage d'évolution. Les six sont rangés par émissions totales, pas par niveau ; ` +
          `choisir un pays couche ses deux niveaux en références horizontales sur les six paires.`,
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
