// twin/proof/web-scatter-income-life-expectancy/render-directions-web.mjs
//
// Income against life expectancy across every country with both readings, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE BAND IS MEASURED, NOT DESCRIBED: the low and high ends of life expectancy above the threshold
// are read off the data, and the beat throws if the band above is not much narrower than the spread
// below it.
//
// Usage:  bun proof/web-scatter-income-life-expectancy/render-directions-web.mjs

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
import { levelSlugOf } from "../../skills/chart-web/assets/level.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { AXES, DirectedScatterWeb, FRAME, scalesFor } from "./DirectedScatterWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Monde";
const THRESHOLD = 30000;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const dollars = (v) => `${plain(Math.round(v).toLocaleString("fr-FR"))} $`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
/** The file is a real OWID export: a field may be quoted and contain a comma. */
const cells = (line) => {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
};

const rows = csv
  .slice(1)
  .map((line) => {
    const c = cells(line);
    return {
      entity: c[at("Entity")],
      code: c[at("Code")],
      year: Number(c[at("Year")]),
      life: Number(c[at("Life expectancy at birth")]),
      gdp: Number(c[at("GDP per capita")]),
      people: Number(c[at("Population")]),
      region: c[at("World region")],
    };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.life) && Number.isFinite(r.gdp) && r.gdp > 0);
const year = rows[0].year;
if (rows.some((r) => r.year !== year)) throw new Error("the frozen file spans more than one year");

const rich = rows.filter((r) => r.gdp >= THRESHOLD);
const poor = rows.filter((r) => r.gdp < THRESHOLD);
const band = { low: Math.min(...rich.map((r) => r.life)), high: Math.max(...rich.map((r) => r.life)) };
const poorBand = { low: Math.min(...poor.map((r) => r.life)), high: Math.max(...poor.map((r) => r.life)) };

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const spreadRich = band.high - band.low;
const spreadPoor = poorBand.high - poorBand.low;
if (!(spreadRich < spreadPoor * 0.75))
  throw new Error(
    `the headline says the band above ${THRESHOLD} is much narrower; it spans ${fr(spreadRich)} ` +
      `years against ${fr(spreadPoor)} below`,
  );
console.log(
  `${rows.length} pays en ${year} · ${rich.length} au-dessus de ${dollars(THRESHOLD)} : ` +
    `espérance de vie de ${fr(band.low)} à ${fr(band.high)} ans (${fr(spreadRich)} ans d'écart) · ` +
    `${poor.length} en dessous : de ${fr(poorBand.low)} à ${fr(poorBand.high)} (${fr(spreadPoor)})\n`,
);

// NO THIRD VARIABLE, AND IT IS A CORRECTION RATHER THAN A SIMPLIFICATION.
//
// This runner used to size every mark `Math.max(2.4, Math.sqrt(people / maxPop) * 22)`. The square
// root is right — area proportional to value, which is the literal form of the trap
// `references/types/scatter.md` names — and the FLOOR is what lied: it pins 95 of these 165
// countries at an identical radius across a 253x population range (67 222 to 16 974 309 people),
// under a caveat that stated flatly « la surface du point étant la population ».
//
// The floor could not simply be lowered. The population range here is 21 220:1, so an area-true
// scale drawing China at 22 units draws Tuvalu at 0,15 — well under one reader pixel. And the floor
// was never buying reachability: `interaction.mjs` resolves the pointed mark by nearest cx/cy, not
// by hit-testing the circle. The static sibling had already refused this third variable IN WRITING
// (`IncomeLifeExpectancyScatter.tsx`: "no bubble, no third variable, so the 'radius should scale by
// area not by value' trap that sheet names does not apply here at all"); the web build quietly
// reintroduced it. Population is carried where it stays true: in the answer a mark gives when asked.
const points = rows.map((r) => ({
  code: r.code,
  x: r.gdp,
  y: r.life,
  detail:
    `${r.entity} · ${fr(r.life)} ans d'espérance de vie · ${dollars(r.gdp)} par personne et par an · ` +
    `${r.region || "région non renseignée"} · ${fr(r.people / 1e6, 1)} millions d'habitants`,
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.entity, value: r.life })),
  { subject: null, declaredSequence: "années" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE DOMAIN IS THE DATA'S OWN, and the ticks live inside it. A tick list chosen by hand set the
// scale's ends, so every country poorer than the first tick or richer than the last was drawn
// OUTSIDE the frame — three pixels of horizontal document scroll at all seven viewports, and, far
// worse, marks a reader could not see.
const gdps = rows.map((r) => r.gdp);
// The ends are the poorest and richest readings themselves, not the decades around them: rounding
// out to 100 $ and 1 000 000 $ left two thirds of the frame empty on a scale where empty space is
// itself a claim about how far apart countries are.
const xMin = Math.min(...gdps);
const xMax = Math.max(...gdps);
const xTicks = [xMin, ...[1000, 3000, 10000, 30000, 100000].filter((v) => v > xMin && v < xMax), xMax].map(
  (v) => ({ value: v, label: dollars(v) }),
);
// Same rule on the other axis: the floor is the data's own, rounded down to a decade.
const yFloor = Math.floor(Math.min(...rows.map((r) => r.life)) / 10) * 10;
const yCeil = Math.ceil(Math.max(...rows.map((r) => r.life)) / 10) * 10;
const yTicks = Array.from({ length: (yCeil - yFloor) / 10 + 1 }, (_, i) => yFloor + i * 10);

// ── THE YARDSTICK ─────────────────────────────────────────────────────────────────────────────
//
// THE OPTION SET IS DERIVED, NOT PICKED. The honest set for "find your own case" is every country,
// and it is refused by measurement rather than by taste: the control is `flex: 0 0 auto` inside a
// figure capped at 100dvh, so every pill row comes out of the plot's own height — see BRIEF.md for
// the two numbers. So the rule is: the most populous country of each world region the frozen file
// names. Six marks a reader can already point at, spanning the income axis end to end, and a rule a
// reader can check. The runner asserts it, so an option added by hand refuses the render.
//
// SORTED BY INCOME, so working left to right through the pills walks UP the x axis — and the claim
// is what the reader watches happen: the upright reference marches right while the flat one stops
// rising.
const regions = [...new Set(rows.map((r) => r.region).filter(Boolean))];
const cases = regions
  .map((region) => rows.filter((r) => r.region === region).reduce((a, b) => (b.people > a.people ? b : a)))
  .sort((a, b) => a.gdp - b.gdp);
for (const c of cases) {
  const biggest = Math.max(...rows.filter((r) => r.region === c.region).map((r) => r.people));
  if (c.people !== biggest)
    throw new Error(
      `${c.entity} is offered as ${c.region}'s case and is not its most populous country — the ` +
        `option set is derived by a rule a reader can check, never picked by hand`,
    );
}
if (cases.length !== regions.length)
  throw new Error(`${regions.length} regions in the file and ${cases.length} cases — every region gets one`);

const rank = (r, key, dir) => rows.filter((o) => (dir > 0 ? o[key] > r[key] : o[key] < r[key])).length + 1;
const caseFacts = cases.map((c) => {
  const richer = rows.filter((r) => r.gdp > c.gdp);
  const poorer = rows.filter((r) => r.gdp < c.gdp);
  return {
    ...c,
    incomeRank: rank(c, "gdp", 1),
    lifeRank: rank(c, "life", 1),
    richer: richer.length,
    richerShorter: richer.filter((r) => r.life < c.life).length,
    poorer: poorer.length,
    poorerLonger: poorer.filter((r) => r.life > c.life).length,
  };
});
console.table(
  caseFacts.map((c) => ({
    région: c.region,
    pays: c.entity,
    revenu: dollars(c.gdp),
    "rang revenu": `${c.incomeRank}/${rows.length}`,
    "rang espérance": `${c.lifeRank}/${rows.length}`,
    "+ riches et vivent moins": `${c.richerShorter}/${c.richer}`,
    "+ pauvres et vivent plus": `${c.poorerLonger}/${c.poorer}`,
  })),
);

const title = `Au-delà de ${dollars(THRESHOLD)} par personne, le revenu n'achète presque plus d'années de vie`;
const caveat =
  `${rows.length} pays en ${year} : le revenu par personne en abscisse, l'espérance de vie à la ` +
  `naissance en ordonnée. **L'axe des revenus est logarithmique** — chaque graduation vaut environ ` +
  `trois fois la précédente, le mensonge silencieux le plus courant de cette famille.`;
const thresholdNote = `${dollars(THRESHOLD)} par personne`;
const bandNote = `Au-dessus : ${rich.length} pays, de ${fr(band.low)} à ${fr(band.high)} ans — ${fr(spreadRich)} ans d'écart. En dessous : ${fr(spreadPoor)}.`;
const readingLine =
  `Lecture : choisissez un pays pour mesurer le nuage à son aune — combien de pays plus riches ` +
  `vivent moins longtemps que lui. Survolez ou tabulez un point pour son nom et ses valeurs.`;
const source = `Source : Our World in Data · espérance de vie et PIB par habitant (dollars internationaux constants), ${year}`;

// Every option lays its two references at exactly the coordinates the component draws that
// country's own point to: `scalesFor` is the one pair of scales in this beat and both callers use
// it, so a reference can never be drawn where the mark is not.
const { x: xOf, y: yOf } = scalesFor(xTicks, yTicks);
const levels = {
  label: "À l'aune de",
  noneLabel: "Le nuage entier",
  options: caseFacts.map((c) => ({
    key: c.code,
    label: c.entity,
    announce:
      `${c.entity} — ${dollars(c.gdp)} par personne, ${fr(c.life)} ans ; ${c.incomeRank}e revenu ` +
      `et ${c.lifeRank}e espérance de vie sur ${rows.length}`,
    note:
      `${c.entity} · ${dollars(c.gdp)} par personne · ${fr(c.life)} ans · ${c.incomeRank}e revenu ` +
      `et ${c.lifeRank}e espérance de vie sur ${rows.length} · ${c.richer} pays sont plus riches, ` +
      `dont ${c.richerShorter} vivent moins longtemps · ${c.poorer} sont plus pauvres, dont ` +
      `${c.poorerLonger} vivent plus longtemps`,
    marks: [
      { series: "income", x: xOf(c.gdp) },
      { series: "life", y: yOf(c.life) },
    ],
  })),
};
if (levels.options.some((o) => !AXES.every((a) => o.marks.some((m) => m.series === a))))
  throw new Error("every case lays both of its coordinates, or the yardstick answers half the question");
const levelPositions = caseFacts.map((c) => ({
  slug: levelSlugOf(c.code),
  code: c.code,
  label: c.entity,
  x: xOf(c.gdp),
  y: yOf(c.life),
}));
if (levelPositions.some((p) => p.x < 0 || p.x > FRAME.width || p.y < 0 || p.y > FRAME.height))
  throw new Error("a case's name would be written outside the plot");

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Un fixe peut tracer le seuil de l'auteur et affirmer que la bande au-dessus est étroite ; il ne " +
    "peut pas laisser le lecteur se placer ailleurs. Ici le lecteur pose le seuil sur un pays qu'il " +
    "tient, et ce qui revient est l'affirmation dans sa main : au Nigeria, 119 pays sont plus riches " +
    "et pas un ne vit moins longtemps ; aux États-Unis, 7e revenu sur 165, quarante pays plus " +
    "pauvres vivent plus longtemps.",
  controls: [
    {
      question:
        "Ce pays-ci, où est-il dans le nuage — et combien de pays plus pauvres que lui vivent plus " +
        "longtemps ?",
      gesture: "find-your-own-case",
      changes:
        "Deux références traversent le plot aux deux valeurs du pays choisi : une debout à son " +
        "revenu, une couchée à son espérance de vie, toutes deux en encre pleine et jamais dans " +
        "l'accent, qui porte déjà le seuil. Son point prend un cerne parmi 164 qui restent anonymes, " +
        "son nom s'écrit au pied de sa référence de revenu, et une phrase donne son rang sur chacun " +
        "des deux axes, le " +
        "nombre de pays plus riches qui vivent moins longtemps et le nombre de pays plus pauvres qui " +
        "vivent plus longtemps.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "le pays à l'aune duquel le nuage est lu",
      authorPicked: "none",
      readerPicks: ["none", "nga", "bra", "chn", "rus", "aus", "usa"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Lequel est-ce, et combien de gens vivent là ?",
      gesture: "ask-a-mark",
      changes:
        "Le point répond avec son pays, ses deux valeurs, sa région et sa population — la " +
        "population n'étant plus encodée nulle part sur la plaque, c'est le seul endroit de la page " +
        "où cette quantité existe.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel point est en question",
      authorPicked: "le Nigeria",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat.replace(/\*\*/g, "")} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${xTicks.map((t) => t.label).join(" ")} ${yTicks.join(" ")}`,
  annot: `${thresholdNote} ${bandNote} ${levels.options.map((o) => o.label).join(" ")}`,
  value: points.map((p) => fr(p.y)).join(" "),
};
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
      component: DirectedScatterWeb,
      props: {
        points, xTicks, yTicks,
        levels, levelPositions, interaction,
        threshold: THRESHOLD,
        thresholdNote,
        bandNote,
        band,
        title, eyebrow: EYEBROW, caveat: caveat.replace(/\*\*/g, ""), source, reading: readingLine,
        alt:
          `Un nuage de ${rows.length} points de taille identique, un par pays : le revenu par personne en abscisse sur ` +
          `une échelle logarithmique, l'espérance de vie en ordonnée. La courbe du nuage monte très ` +
          `vite jusqu'à environ ${dollars(THRESHOLD)}, puis s'aplatit : au-delà du trait vertical, ` +
          `les ${rich.length} pays tiennent dans une bande de ${fr(spreadRich)} ans ` +
          `(${fr(band.low)} à ${fr(band.high)}), là où les ${poor.length} pays en dessous s'étalent ` +
          `sur ${fr(spreadPoor)} ans.`,
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
