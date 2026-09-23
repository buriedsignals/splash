// twin/proof/static-parallel-coordinates-electricity-mix/render-directions.mjs
//
// Sixteen European electricity mixes as polylines across seven axes, once per filed direction,
// through the design base. The first `parallel coordinates` beat in this tree — and the last of the
// catalogue's forty forms to get one.
//
// WHAT THIS FORM IS FOR: an entity that has many numbers at once, where no two of them share a
// scale. A mix is exactly that — a country is seven shares, and the shape of the seven is what
// distinguishes it. The claim is a crossing between two ADJACENT axes, which is the only kind of
// relationship this form actually shows.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-parallel-coordinates-electricity-mix/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedParallelCoordinates } from "./DirectedParallelCoordinates.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = "2024";
/** THE AXIS ORDER IS THE ARGUMENT. Only ADJACENT axes let a reader see a relationship — the
 *  reference's own limitation, and the reason nuclear and wind are neighbours here: the crossing
 *  between them IS the claim. Everything after them is ordered low-carbon first, fossil last. */
const AXES = [
  { key: "nuclear_generation__twh", name: "Nucléaire" },
  { key: "wind_generation__twh", name: "Éolien" },
  { key: "solar_generation__twh", name: "Solaire" },
  { key: "hydro_generation__twh", name: "Hydraulique" },
  { key: "bioenergy_stacked_generation__twh", name: "Bioénergie" },
  { key: "gas_generation__twh", name: "Gaz" },
  { key: "coal_generation__twh", name: "Charbon" },
];
const ALL_SOURCES = [
  ...AXES.map((a) => a.key),
  "oil_generation__twh",
  "other_renewables_generation__twh",
];
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède",
  ITA: "Italie", FIN: "Finlande", AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique",
  POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};
const refused = [];

// ── the mixes ───────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const rows = csv
  .slice(1)
  .map((l) => l.split(","))
  .filter((c) => c[at("year")] === YEAR);
const countries = rows.map((c) => {
  const total = ALL_SOURCES.reduce((s, k) => s + Number(c[at(k)]), 0);
  if (!(total > 0)) throw new Error(`${c[at("code")]} reports no generation at all in ${YEAR}`);
  return {
    code: c[at("code")],
    name: NAMES[c[at("code")]],
    shares: Object.fromEntries(AXES.map((a) => [a.key, (Number(c[at(a.key)]) / total) * 100])),
  };
});
for (const c of countries) if (!c.name) throw new Error(`${c.code} has no French name filed`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const both = countries.filter(
  (c) =>
    c.shares[AXES[0].key] >= NUCLEAR_FLOOR && c.shares[AXES[1].key] >= WIND_FLOOR,
);
const nuclearHeavy = countries.filter((c) => c.shares[AXES[0].key] >= NUCLEAR_FLOOR);
const windHeavy = countries.filter((c) => c.shares[AXES[1].key] >= WIND_FLOOR);
if (!(both.length >= 1 && both.length <= 3))
  throw new Error(
    `the headline names a handful of countries that clear both floors; ${both.length} do, which is ` +
      `either nothing to point at or the whole field`,
  );
if (!(nuclearHeavy.length >= 3 && windHeavy.length >= 5))
  throw new Error(
    `the standfirst says each floor has a real group behind it; ${nuclearHeavy.length} clear the ` +
      `nuclear floor and ${windHeavy.length} the wind one`,
  );
/** AND THE CROSSING IS MEASURED, not asserted from the drawing: the correlation between the two
 *  adjacent axes the claim is about. A parallel-coordinates plate that says "these two cross" and
 *  cannot say how much is a plate arguing from its own ink. */
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const corr = (a, b) => {
  const xs = countries.map((c) => c.shares[a]);
  const ys = countries.map((c) => c.shares[b]);
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0),
  );
  return num / den;
};
const r = corr(AXES[0].key, AXES[1].key);
if (!(r < -0.2))
  throw new Error(`the headline says the two lean against each other; their correlation is ${r.toFixed(2)}`);
console.log(
  `${countries.length} pays · ${YEAR} · nucléaire ≥ ${NUCLEAR_FLOOR} % : ${nuclearHeavy.length} · ` +
    `éolien ≥ ${WIND_FLOOR} % : ${windHeavy.length} · les deux : ` +
    `${both.map((c) => c.code).join(", ")} · corrélation ${r.toFixed(2)}\n`,
);
console.table(
  countries
    .slice()
    .sort((a, b) => b.shares[AXES[0].key] - a.shares[AXES[0].key])
    .map((c) => ({
      pays: c.name,
      ...Object.fromEntries(AXES.map((a) => [a.name, c.shares[a.key].toFixed(1)])),
    })),
);

const lines = countries.map((c) => ({
  code: c.code,
  name: c.name,
  values: AXES.map((a) => c.shares[a.key]),
  thread: both.some((b) => b.code === c.code),
}));
/** EACH AXIS KEEPS ITS OWN SCALE, fitted to its own column and rounded outward to a readable top —
 *  the reference's first rule, and the reason nothing here is normalised to a shared 0–100. */
const axes = AXES.map((a, i) => {
  const top = Math.max(...countries.map((c) => c.shares[a.key]));
  const ceiling = Math.ceil(top / 10) * 10;
  return { name: a.name, ceiling, index: i };
});

const facts = beatFacts(
  countries.map((c) => ({ key: c.code, label: c.name, value: c.shares[AXES[0].key] })),
  {
    subject: both[0].name,
    comparisonSet: both.map((c) => c.code),
    namedSeries: AXES.map((a) => a.name),
    declaredSequence: "share of the country's own mix",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `${both.length} pays sur ${countries.length} font les deux : plus de ${NUCLEAR_FLOOR} % de nucléaire et plus de ${WIND_FLOOR} % d’éolien`,
  `Seuls ${both.map((c) => c.name).join(" et ")} passent les deux seuils, nucléaire et éolien`,
  `Les mix électriques européens, axe par axe`,
];
const limits = [
  `Chaque pays est une ligne qui traverse sept axes — sa part de chaque source dans sa propre ` +
    `électricité en ${YEAR}. Chaque axe porte sa propre échelle, ajustée à sa propre colonne. Les ` +
    `deux premiers axes sont voisins parce que c’est là que se lit la revendication : ` +
    `${nuclearHeavy.length} pays dépassent ${NUCLEAR_FLOOR} % de nucléaire, ${windHeavy.length} ` +
    `dépassent ${WIND_FLOOR} % d’éolien, et ${both.length} font les deux — ` +
    `${both.map((c) => c.name).join(" et ")}. La corrélation entre les deux parts est de ${one(r)}.`,
  `Chaque pays est une ligne qui traverse sept axes : sa part de chaque source en ${YEAR}, chaque ` +
    `axe à sa propre échelle. ${both.length} pays seulement passent les deux premiers seuils.`,
  `Chaque pays est une ligne qui traverse sept axes, chacun à sa propre échelle.`,
];
const reading = [
  `Lecture : seuls deux axes VOISINS se comparent — un croisement entre eux est une relation, une ` +
    `ligne qui monte trois axes plus loin n’est rien. L’ordre des axes est donc un choix, et il est ` +
    `dit ici : nucléaire et éolien côte à côte, le fossile au bout.`,
  `Lecture : seuls deux axes voisins se comparent. L’ordre des axes est un choix.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const unit = `part de la production électrique du pays, en %, ${YEAR}`;
const threadNote = `En couleur : les pays qui passent les deux premiers seuils.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${threadNote} ${axes.map((a) => `${a.name} ${a.ceiling}`).join(" ")} 0`,
  annot: `${reading.join(" ")} ${lines.map((l) => l.name).join(" ")}`,
  value: lines.map((l) => one(l.values[0])).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedParallelCoordinates, {
        axes,
        lines,
        unit,
        threadNote,
        title,
        limits,
        reading,
        source,
        alt:
          `Graphique en coordonnées parallèles : ${countries.length} pays européens, chacun une ` +
          `ligne traversant sept axes verticaux — nucléaire, éolien, solaire, hydraulique, ` +
          `bioénergie, gaz, charbon — chaque axe à sa propre échelle et portant sa part de la ` +
          `production du pays en ${YEAR}. Entre les deux premiers axes les lignes se croisent : ` +
          `${nuclearHeavy.length} pays dépassent ${NUCLEAR_FLOOR} % de nucléaire, ` +
          `${windHeavy.length} dépassent ${WIND_FLOOR} % d’éolien, et seuls ` +
          `${both.map((c) => c.name).join(" et ")} font les deux ; leurs lignes sont en couleur.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
