// twin/proof/web-parallel-coordinates-electricity/render-directions-web.mjs
//
// Sixteen European countries across seven electricity sources, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE AXIS ORDER IS THE ARGUMENT: only ADJACENT axes let a reader see a relationship, so nuclear sits
// beside wind because the crossing between them IS the claim. The correlation is computed, not
// asserted.
//
// Usage:  bun proof/web-parallel-coordinates-electricity/render-directions-web.mjs

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
import {
  assertBrushChangesThePicture,
  assertOneBrushVocabulary,
  buildBrushIndex,
} from "../../skills/chart-web/assets/brush.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedParallelWeb } from "./DirectedParallelWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
// THE BRUSH'S FIVE BANDS — `skills/chart-web/assets/brush.ts`, a gesture the corpus ships nowhere
// else. Each names the RAIL it cuts, its bounds in that rail's own units, and the rail its selection
// is READ AGAINST. That last field is what makes this control worth more than the plate: only
// ADJACENT rails show a relationship in a parallel-coordinates drawing, so the still can carry
// exactly one of the twenty-one pairs seven rails make. Two of these five are deliberately
// NON-ADJACENT pairs — readings that do not exist on the plate at all.
const BANDS = [
  { key: "nuclear-high", axis: "nuclear_generation__twh", from: NUCLEAR_FLOOR, to: null, against: "wind_generation__twh" },
  { key: "wind-high", axis: "wind_generation__twh", from: WIND_FLOOR, to: null, against: "nuclear_generation__twh" },
  { key: "wind-low", axis: "wind_generation__twh", from: 0, to: 10, against: "nuclear_generation__twh" },
  { key: "hydro-high", axis: "hydro_generation__twh", from: 30, to: null, against: "gas_generation__twh" },
  { key: "coal-high", axis: "coal_generation__twh", from: 15, to: null, against: "hydro_generation__twh" },
];
const AXES = [
  ["nuclear_generation__twh", "nucléaire"],
  ["wind_generation__twh", "éolien"],
  ["hydro_generation__twh", "hydraulique"],
  ["solar_generation__twh", "solaire"],
  ["bioenergy_stacked_generation__twh", "biomasse"],
  ["gas_generation__twh", "gaz"],
  ["coal_generation__twh", "charbon"],
];
const ALL = [...AXES.map(([k]) => k), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};

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
  const o = { code: c[at("code")], year: Number(c[at("year")]) };
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
});

const countries = [...new Set(raw.filter((r) => r.year === YEAR).map((r) => r.code))];
for (const code of countries) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const rows = countries.map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  const total = ALL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    shares: Object.fromEntries(AXES.map(([k]) => [k, (r[k] / total) * 100])),
    twh: Object.fromEntries(AXES.map(([k]) => [k, r[k]])),
    total,
  };
});

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const nuclearKey = AXES[0][0];
const windKey = AXES[1][0];
const heavyNuclear = rows.filter((r) => r.shares[nuclearKey] > NUCLEAR_FLOOR);
const heavyWind = rows.filter((r) => r.shares[windKey] > WIND_FLOOR);
const both = rows.filter((r) => r.shares[nuclearKey] > NUCLEAR_FLOOR && r.shares[windKey] > WIND_FLOOR);
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const corr = (() => {
  const a = rows.map((r) => r.shares[nuclearKey]);
  const b = rows.map((r) => r.shares[windKey]);
  const ma = mean(a);
  const mb = mean(b);
  const cov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const sa = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0));
  const sb = Math.sqrt(b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return cov / (sa * sb);
})();
if (!(both.length >= 1 && both.length <= 4))
  throw new Error(`the headline names a handful doing both; ${both.length} do`);
console.log(
  `${rows.length} pays en ${YEAR} · ${heavyNuclear.length} au-dessus de ${NUCLEAR_FLOOR} % de ` +
    `nucléaire · ${heavyWind.length} au-dessus de ${WIND_FLOOR} % d'éolien · ${both.length} les deux ` +
    `(${both.map((r) => r.name).join(", ")}) · corrélation nucléaire/éolien ${fr(corr, 2)}\n`,
);

const axes = AXES.map(([key, name]) => {
  const ceiling = Math.ceil(Math.max(...rows.map((r) => r.shares[key])) / 10) * 10;
  return { key, name, ceiling, ceilingLabel: `${ceiling} %` };
});

const lines = rows
  .map((r) => ({
    code: r.code,
    name: r.name,
    values: axes.map((a) => r.shares[a.key]),
    highlight: both.some((b) => b.code === r.code),
    detail:
      `${r.name} · ${axes.map((a) => `${a.name} ${fr(r.shares[a.key])} %`).join(", ")} · ` +
      `${fr(r.total, 0)} TWh au total`,
  }))
  .sort((a, b) => Number(a.highlight) - Number(b.highlight));

console.table(rows.map((r) => Object.fromEntries([["pays", r.name], ...axes.map((a) => [a.name, fr(r.shares[a.key])])])));

// ── THE BRUSH, DERIVED FROM THE FROZEN FILE AND NEVER TYPED ───────────────────────────────────
//
// The runner owns the arithmetic — the count inside a band and the two means the band's sentence
// carries come out of ONE pass over the same numbers the lines are drawn from — and the component
// owns the scale that turns the bounds into a rectangle. `DirectedParallelWeb` checks the set this
// pass measured against the set its own geometry puts inside the band, and refuses them if they
// differ: two derivations of one selection is how a sentence ends up describing a picture that is
// not on the page.
const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const brushOptions = BANDS.map((band) => {
  const i = axes.findIndex((a) => a.key === band.axis);
  const j = axes.findIndex((a) => a.key === band.against);
  if (i < 0 || j < 0) throw new Error(`the band ${band.key} names a rail this beat does not draw`);
  if (i === j) throw new Error(`the band ${band.key} is read against its own rail, which says nothing`);
  const lo = band.from;
  const hi = band.to ?? axes[i].ceiling;
  const inside = lines.filter((l) => l.values[i] >= lo && l.values[i] <= hi);
  const outside = lines.filter((l) => !(l.values[i] >= lo && l.values[i] <= hi));
  if (!inside.length || !outside.length)
    throw new Error(
      `the band ${band.key} holds ${inside.length} of ${lines.length} lines — a band that keeps ` +
        "none, or keeps them all, is a threshold that does nothing",
    );
  const label = plain(lo === 0 ? `${cap(axes[i].name)} < ${hi} %` : `${cap(axes[i].name)} > ${lo} %`);
  const adjacent = Math.abs(i - j) === 1;
  const note = plain(
    `${label} : ${inside.length} pays sur ${lines.length} · leur ${axes[j].name} vaut ` +
      `${fr(mean(inside.map((l) => l.values[j])))} % en moyenne, contre ` +
      `${fr(mean(outside.map((l) => l.values[j])))} % pour les ${outside.length} autres` +
      (adjacent
        ? ""
        : ` · ${axes[i].name} et ${axes[j].name} ne sont pas voisins sur le tracé, donc c'est une ` +
          "lecture que l'image fixe ne peut pas faire"),
  );
  return {
    key: band.key,
    axis: band.axis,
    label,
    announce: plain(`${label} — ${inside.length} pays sur ${lines.length}`),
    note,
    lo,
    hi,
    keys: inside.map((l) => l.code),
  };
});
const brushPlan = {
  label: "Sélectionner une bande",
  noneLabel: "Toutes les lignes",
  options: brushOptions,
};
console.table(
  brushOptions.map((o) => ({
    bande: o.label,
    pays: o.keys.length,
    lecture: o.note.split(" · ")[1],
  })),
);
console.log("");


const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.shares[nuclearKey] })),
  { subject: both[0].name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE HEADLINE IS SHORT BECAUSE ONE DIRECTION SETS IT IN 32 px UPPERCASE. `nocturne` wraps this
// line to ten rows at 375 px, and every row it takes comes out of the plot below it — measured, not
// guessed: the longer form this page used to carry put the source line 64 px under the fold on that
// direction alone. The subject the shorter line drops ("de leur électricité") is carried by the
// eyebrow, by the caveat's own first words and by the source.
const title = `${heavyNuclear.length} pays sur ${rows.length} dépassent ${NUCLEAR_FLOOR} % de nucléaire, ${heavyWind.length} dépassent ${WIND_FLOOR} % d'éolien — ${both.length} font les deux`;
const caveat =
  `Sept axes, un par source, chacun avec SON PROPRE plafond : un axe partagé mentirait sur sept ` +
  `quantités. Une ligne par pays.`;
const claimNote = `${both.map((r) => r.name).join(" et ")} : au-dessus des deux seuils`;
const readingLine =
  `Lecture : survolez un point pour lire le pays et ses sept parts d'un coup. Seuls deux axes ` +
  `VOISINS montrent une relation : ici nucléaire contre éolien, corrélation ${fr(corr, 2)}. Les ` +
  `${brushOptions.length} bandes lèvent la limite — choisissez-en une, les pays qui la traversent ` +
  `passent au premier plan.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${brushPlan.label} ${brushPlan.noneLabel} ${brushOptions
    .map((o) => `${o.label} ${o.announce} ${o.note}`)
    .join(" ")}`,
  axis: `${axes.map((a) => `${a.name} ${a.ceilingLabel}`).join(" ")}`,
  annot: claimNote,
  value: axes.map((a) => a.ceilingLabel).join(" "),
};
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
    const { outPath } = await renderWeb({
      component: DirectedParallelWeb,
      props: {
        axes, lines, brushPlan,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Sept axes verticaux, un par source d'électricité, reliés par ${lines.length} lignes, une ` +
          `par pays. Chaque axe a son propre plafond. Entre l'axe du nucléaire et celui de l'éolien, ` +
          `les lignes se croisent abondamment : les pays hauts sur l'un sont bas sur l'autre ` +
          `(corrélation ${fr(corr, 2)}). Deux lignes, ${both.map((r) => r.name).join(" et ")}, sont ` +
          `hautes sur les deux et dessinées en couleur. ${brushOptions.length} bandes nommées ` +
          `permettent de sélectionner une tranche d'un rail : les lignes qui la traversent ` +
          `s'épaississent et leurs sommets sont cerclés, et une phrase donne ce que cette ` +
          `sélection vaut sur un autre rail.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // THE TWO CHECKS THE FORMAT'S OWN GUARDS CANNOT MAKE FOR THIS VOCABULARY, run on the page that
    // was just written rather than on the props it was written from. `renderWeb` reads its markup
    // back for the FILTER vocabulary (`assertOneVocabulary`) and `assertInteractionPlan` discovers a
    // control by the shape of its markup — `chart-filter-*` / `chart-stack-*` / `chart-level-*`
    // radios — so a brush is invisible to both and would ship unmeasured. See `BRIEF.md`, "Why no
    // `interaction` prop travels with the render".
    const written = await readFile(outPath, "utf8");
    const brushIndex = buildBrushIndex({ options: brushOptions }, lines.map((l) => l.code));
    // `perKey` is this beat's own number: one polyline plus one vertex per rail. Without it the
    // scan cannot see a whole kind of element losing the vocabulary — measured, not assumed.
    assertOneBrushVocabulary(written, brushIndex, { perKey: 1 + axes.length });
    assertBrushChangesThePicture(written, { options: brushOptions }, `renders/${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
// A REFUSAL IS AN EXIT CODE, NOT ONLY A LINE OF OUTPUT. Every guard this beat added — the band that
// keeps everything, the declared set that disagrees with the geometry, the datum that stopped
// carrying the vocabulary, the two states that are not a measured step apart — throws INSIDE the
// loop above and is caught here. Found while mutating: without this line the process still exits 0,
// so each of those mutations printed a red sentence and left a green build behind it, with the last
// good renders still on disk.
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
