// twin/proof/web-stacked-bar-lowcarbon-growth/render-directions-web.mjs
//
// Sixteen European countries' low-carbon electricity in 2024, stacked by source, each bar carrying a
// tick at its own 2000 total. Rendered once per FILED DIRECTION.
//
// Usage:  bun proof/web-stacked-bar-lowcarbon-growth/render-directions-web.mjs

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
import { DirectedStackedBarWeb } from "./DirectedStackedBarWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;
const SOURCES = [
  ["nuclear_generation__twh", "nucléaire"],
  ["hydro_generation__twh", "hydraulique"],
  ["wind_generation__twh", "éolien"],
  ["solar_generation__twh", "solaire"],
  ["bioenergy_stacked_generation__twh", "biomasse"],
  ["other_renewables_generation__twh", "autres renouv."],
];
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
  for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const at_ = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  return r;
};

const rows = codes
  .map((code) => {
    const a = at_(code, FROM);
    const b = at_(code, TO);
    const before = SOURCES.reduce((s, [k]) => s + a[k], 0);
    const total = SOURCES.reduce((s, [k]) => s + b[k], 0);
    return { code, name: NAMES[code], before, total, added: total - before, by: b, wasBy: a };
  })
  .sort((x, z) => z.total - x.total);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const adder = [...rows].sort((a, b) => b.added - a.added)[0];
const leader = rows[0];
if (adder.code === leader.code)
  throw new Error("the headline rests on the largest adder NOT being the largest producer");
if (!(adder.added > leader.added))
  throw new Error(`the headline says the adder added more than the leader; ${fr(adder.added)} against ${fr(leader.added)}`);
if (!(leader.before > adder.before * 3))
  throw new Error(`the headline says the leader started several times higher; ${fr(leader.before)} against ${fr(adder.before)}`);
console.log(
  `${rows.length} pays · plus gros ajout ${adder.name} +${fr(adder.added, 0)} TWh (contre ` +
    `+${fr(leader.added, 0)} pour ${leader.name}) · départ ${fr(adder.before, 0)} contre ` +
    `${fr(leader.before, 0)} · total ${TO} : ${leader.name} ${fr(leader.total, 0)} TWh\n`,
);
console.table(rows.map((r) => ({ pays: r.name, [FROM]: fr(r.before, 0), [TO]: fr(r.total, 0), ajout: `+${fr(r.added, 0)}` })));

const span = Math.ceil(Math.max(...rows.map((r) => r.total)) / 50) * 50;
const xTicks = Array.from({ length: span / 100 + 1 }, (_, i) => i * 100);

const shaped = rows.map((r) => {
  let cursor = 0;
  const segments = SOURCES.map(([key, name], tone) => {
    const v = r.by[key];
    const was = r.wasBy[key];
    const from = cursor;
    cursor += v;
    return {
      key,
      tone,
      from,
      to: cursor,
      label: (v / span) * 100 > 6 ? fr(v, 0) : null,
      detail:
        `${r.name} · ${name} · ${fr(v)} TWh en ${TO} · ${fr((v / r.total) * 100)} % de son ` +
        `bas-carbone · ${fr(was)} TWh en ${FROM} (${was > 0 ? `${v >= was ? "+" : "−"}${fr(Math.abs(v - was))}` : "n'existait pas"})`,
    };
  }).filter((s) => s.to > s.from);
  return {
    code: r.code,
    name: r.name,
    total: r.total,
    before: r.before,
    totalLabel: `${fr(r.total, 0)} TWh · +${fr(r.added, 0)}`,
    segments,
    highlight: r.code === adder.code || r.code === leader.code,
  };
});

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.total })),
  { subject: adder.name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `L'${adder.name} a ajouté plus d'électricité bas-carbone que la ${leader.name} depuis ${FROM} — en partant ${fr(leader.before / adder.before, 0)} fois plus bas`;
const caveat =
  `Électricité bas-carbone produite en ${TO}, empilée par source, ${rows.length} pays classés par ` +
  `total. Le trait vertical sur chaque barre est le total de ${FROM} : l'AJOUT est la distance entre ` +
  `ce trait et le bout de la barre. Chaque barre porte son propre total, parce qu'un empilement ne ` +
  `se compare qu'à sa base.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un segment pour lire la source, ses TWh, sa part du ` +
  `bas-carbone de ce pays et ce qu'elle valait en ${FROM}. Un empilement cache sa propre ` +
  `arithmétique : on compare le premier segment et on devine le reste.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${SOURCES.map(([, n]) => n).join(" ")}`,
  axis: `${xTicks.join(" ")} ${shaped.map((r) => r.name).join(" ")}`,
  annot: `total ${FROM}`,
  value: shaped.map((r) => r.totalLabel).join(" "),
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
      component: DirectedStackedBarWeb,
      props: {
        rows: shaped,
        tones: SOURCES.length,
        toneLabels: SOURCES.map(([, n]) => n),
        span, xTicks,
        beforeLabel: `total ${FROM}`,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Seize barres horizontales empilées par source, classées par total ${TO}. Celle de la ` +
          `${leader.name} est la plus longue (${fr(leader.total, 0)} TWh) et presque entièrement ` +
          `nucléaire ; son trait de ${FROM} est déjà loin à droite, donc son ajout est court. Celle ` +
          `de l'${adder.name} est plus courte (${fr(adder.total, 0)} TWh) mais son trait de ${FROM} ` +
          `est tout près de l'origine : l'essentiel de la barre a été ajouté depuis.`,
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
