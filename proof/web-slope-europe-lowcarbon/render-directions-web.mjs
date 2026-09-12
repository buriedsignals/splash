// twin/proof/web-slope-europe-lowcarbon/render-directions-web.mjs
//
// Sixteen European countries' low-carbon electricity share in 2000 and 2024, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// A CROSSING IS DERIVED, NEVER EYEBALLED: a pair crosses when the sign of their gap flips between
// the rails. The headline's crossing is asserted before the render.
//
// Usage:  bun proof/web-slope-europe-lowcarbon/render-directions-web.mjs

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
import { DirectedSlopeWeb } from "./DirectedSlopeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;
const PIVOT = "FRA";
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
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
  for (const k of [...LOW, ...FOSSIL]) o[k] = Number(c[at(k)]);
  return o;
});
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const shareOf = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${year}`);
  return (low / total) * 100;
};

const rows = codes
  .map((code) => ({ code, name: NAMES[code], before: shareOf(code, FROM), after: shareOf(code, TO) }))
  .map((r) => ({ ...r, gain: r.after - r.before }))
  .sort((a, b) => b.gain - a.gain);

// ── THE CROSSINGS, DERIVED ────────────────────────────────────────────────────────────────────
const pivot = rows.find((r) => r.code === PIVOT);
const crossed = rows.filter(
  (r) => r.code !== PIVOT && Math.sign(r.before - pivot.before) !== Math.sign(r.after - pivot.after),
);
const fell = rows.filter((r) => r.gain <= 0);
if (fell.length) throw new Error(`the headline says all gained; ${fell.map((r) => r.name).join(", ")} did not`);
if (crossed.length !== 1)
  throw new Error(`the headline names one country that overtook ${pivot.name}; ${crossed.length} did`);
const over = crossed[0];
const biggest = rows[0];
console.log(
  `${rows.length} pays · tous en hausse · un seul dépasse ${pivot.name} : ${over.name} ` +
    `(${fr(over.before)} -> ${fr(over.after)} contre ${fr(pivot.before)} -> ${fr(pivot.after)}) · ` +
    `plus fort gain ${biggest.name} +${fr(biggest.gain)} pts\n`,
);
console.table(rows.map((r, i) => ({ rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after), gain: `+${fr(r.gain)}` })));

const crossedBy = (r) =>
  rows.filter(
    (z) => z.code !== r.code && Math.sign(r.before - z.before) !== Math.sign(r.after - z.after) && r.gain > z.gain,
  );

const lines = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  before: r.before,
  after: r.after,
  beforeLabel: `${fr(r.before, 0)} %`,
  afterLabel: `${fr(r.after, 0)} %`,
  highlight: r.code === over.code || r.code === PIVOT,
  detail:
    `${r.name} · ${fr(r.before)} % en ${FROM} → ${fr(r.after)} % en ${TO} · +${fr(r.gain)} points · ` +
    `${i + 1}ᵉ gain sur ${rows.length}` +
    (crossedBy(r).length
      ? ` · a dépassé ${crossedBy(r).map((z) => z.name).join(", ")}`
      : " · n'a dépassé personne"),
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: over.name,
    states: [String(FROM), String(TO)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "%",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const yTicks = [0, 100];
const title = `Les seize ont tous gagné de l'électricité bas-carbone depuis ${FROM} — et un seul a dépassé la ${pivot.name}`;
const caveat =
  `Part bas-carbone de l'électricité de chaque pays, ${FROM} à gauche et ${TO} à droite. La PENTE ` +
  `porte le sens et la vitesse, les deux nombres portent la grandeur : ni l'un ni l'autre ne fait le ` +
  `travail de l'autre, et c'est pourquoi un graphique en pentes peut se passer d'axe entre ses deux ` +
  `rails.`;
const crossings = [
  {
    at: (over.after + pivot.after) / 2,
    text:
      `${over.name} était ${fr(pivot.before - over.before)} points sous la ${pivot.name} en ${FROM} ` +
      `et passe devant en ${TO} (${fr(over.after)} % contre ${fr(pivot.after)} %). C'est le seul ` +
      `croisement avec elle : un croisement est ce qu'un graphique en pentes existe pour montrer, ` +
      `donc il est calculé, jamais cru sur parole.`,
  },
];
const readingLine =
  `Lecture : survolez, touchez ou tabulez une ligne pour lire les deux niveaux, le gain en points, ` +
  `le rang du pays parmi les seize et QUI il a dépassé en chemin.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: lines.map((l) => `${l.name} ${l.beforeLabel} ${l.afterLabel}`).join(" "),
  annot: crossings.map((c) => c.text).join(" "),
  value: `${FROM} ${TO}`,
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
    await renderWeb({
      component: DirectedSlopeWeb,
      props: {
        lines,
        railLabels: { left: String(FROM), right: String(TO) },
        yTicks,
        crossings,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Deux rails verticaux, ${FROM} à gauche et ${TO} à droite, reliés par ${lines.length} ` +
          `segments, un par pays. Tous montent. Celui de ${over.name} part de ${fr(over.before)} % ` +
          `— ${fr(pivot.before - over.before)} points sous la ${pivot.name} — et arrive à ` +
          `${fr(over.after)} %, au-dessus d'elle. ${biggest.name} a la pente la plus raide, ` +
          `+${fr(biggest.gain)} points.`,
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
