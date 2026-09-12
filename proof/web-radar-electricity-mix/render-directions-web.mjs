// twin/proof/web-radar-electricity-mix/render-directions-web.mjs
//
// France against Germany, 2024 electricity, on eight axes. Rendered once per FILED DIRECTION.
//
// Usage:  bun proof/web-radar-electricity-mix/render-directions-web.mjs

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
import { DirectedRadarWeb } from "./DirectedRadarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const PAIR = ["FRA", "DEU"];
const AXES = [
  ["Nuclear", "nucléaire"],
  ["Wind", "éolien"],
  ["Solar", "solaire"],
  ["Hydropower", "hydraulique"],
  ["Bioenergy", "biomasse"],
  ["Gas", "gaz"],
  ["Coal", "charbon"],
  ["Oil", "pétrole"],
];
const ALL = [...AXES.map(([k]) => k), "Other renewables"];
const NAMES = { FRA: "France", DEU: "Allemagne" };

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
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
});

const countries = PAIR.map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  const total = ALL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    total,
    shares: Object.fromEntries(AXES.map(([k]) => [k, (r[k] / total) * 100])),
    twh: Object.fromEntries(AXES.map(([k]) => [k, r[k]])),
  };
});
const [a, b] = countries;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const sizeGap = Math.abs(a.total - b.total) / Math.max(a.total, b.total);
if (!(sizeGap < 0.2))
  throw new Error(`the headline says the two are within a fifth of each other; they differ by ${fr(sizeGap * 100)} %`);
const nuclearGap = a.shares.Nuclear - b.shares.Nuclear;
if (!(nuclearGap > 50)) throw new Error(`the headline rests on the nuclear gap; it is ${fr(nuclearGap)} points`);
console.log(
  `${a.name} ${fr(a.total, 0)} TWh contre ${b.name} ${fr(b.total, 0)} TWh (écart ${fr(sizeGap * 100)} %) · ` +
    `nucléaire ${fr(a.shares.Nuclear)} % contre ${fr(b.shares.Nuclear)} % · éolien+solaire ` +
    `${fr(a.shares.Wind + a.shares.Solar)} % contre ${fr(b.shares.Wind + b.shares.Solar)} %\n`,
);
console.table(AXES.map(([k, n]) => ({ source: n, [a.name]: fr(a.shares[k]), [b.name]: fr(b.shares[k]) })));

const ceiling = Math.ceil(Math.max(...countries.flatMap((c) => AXES.map(([k]) => c.shares[k]))) / 10) * 10;
const rings = Array.from({ length: ceiling / 20 }, (_, i) => (i + 1) * 20).filter((r) => r <= ceiling);
if (rings[rings.length - 1] !== ceiling) rings.push(ceiling);

const shapes = countries.map((c, i) => ({
  code: c.code,
  name: c.name,
  values: AXES.map(([k]) => c.shares[k]),
  tone: i === 0 ? "a" : "b",
}));
const vertices = countries.flatMap((c) =>
  AXES.map(([k, n], i) => {
    const other = countries.find((z) => z.code !== c.code);
    return {
      code: c.code,
      axis: i,
      value: c.shares[k],
      detail:
        `${c.name} · ${n} · ${fr(c.shares[k])} % de son électricité (${fr(c.twh[k], 1)} TWh) · ` +
        `${other.name} sur le même axe : ${fr(other.shares[k])} %`,
    };
  }),
);

const facts = beatFacts(
  AXES.map(([k, n]) => ({ key: k, label: n, value: a.shares[k] })),
  { subject: a.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `${a.name} et ${b.name} produisent presque autant d'électricité et n'ont presque aucune source en commun`;
const caveat =
  `Mix électrique ${YEAR}, huit sources, en part de la production de chaque pays. ` +
  `${a.name} : ${fr(a.total, 0)} TWh ; ${b.name} : ${fr(b.total, 0)} TWh — à ${fr(sizeGap * 100, 0)} % ` +
  `l'un de l'autre. La grille est faite de CERCLES : une grille polygonale ferait paraître une même ` +
  `valeur plus grande près d'un axe qu'entre deux. Deux formes, jamais trois : au-delà, les ` +
  `superpositions ne se lisent plus.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un sommet pour lire le pays, la source, sa part exacte, ` +
  `les TWh derrière elle et ce que l'autre pays a sur le même axe. Une forme de radar est mémorable ` +
  `et ses valeurs ne le sont pas.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${countries.map((c) => c.name).join(" ")}`,
  axis: `${AXES.map(([, n]) => n).join(" ")} ${ceiling} %`,
  annot: `${ceiling} %`,
  value: countries.flatMap((c) => AXES.map(([k]) => fr(c.shares[k]))).join(" "),
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
      component: DirectedRadarWeb,
      props: {
        axes: AXES.map(([key, name]) => ({ key, name })),
        shapes, vertices, rings, ceiling,
        ceilingLabel: `${ceiling} %`,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Deux formes superposées sur huit axes. Celle de ${a.name} pointe très loin sur l'axe du ` +
          `nucléaire (${fr(a.shares.Nuclear)} %) et reste près du centre partout ailleurs. Celle de ` +
          `${b.name} est nulle sur le nucléaire et s'étend sur l'éolien (${fr(b.shares.Wind)} %), le ` +
          `solaire (${fr(b.shares.Solar)} %), le gaz (${fr(b.shares.Gas)} %) et le charbon ` +
          `(${fr(b.shares.Coal)} %). Les deux formes ne se recouvrent presque nulle part.`,
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
