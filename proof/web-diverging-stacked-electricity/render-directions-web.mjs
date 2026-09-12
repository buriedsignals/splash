// twin/proof/web-diverging-stacked-electricity/render-directions-web.mjs
//
// Six countries' 2024 electricity mix as a three-way lean, rendered once per FILED DIRECTION into a
// self-contained interactive page. Fossil left, renewables right, nuclear straddling the centre.
//
// THE MIDDLE IS NOT A JUDGEMENT. Nuclear is neither fossil nor renewable by definition, which is what
// makes it the neutral band rather than a category assigned to a wing.
//
// Usage:  bun proof/web-diverging-stacked-electricity/render-directions-web.mjs

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
import { DirectedDivergingStackedWeb } from "./DirectedDivergingStackedWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SUBJECT = "FRA";
const RENEW = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL = ["Coal", "Gas", "Oil"];
const NUCLEAR = "Nuclear";
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
const FR_SOURCE = {
  Coal: "charbon", Gas: "gaz", Oil: "pétrole", Nuclear: "nucléaire", Hydropower: "hydraulique",
  Wind: "éolien", Solar: "solaire", Bioenergy: "biomasse", "Other renewables": "autres renouvelables",
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
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const k of [...RENEW, ...FOSSIL, NUCLEAR]) o[k] = Number(c[at(k)]);
  return o;
});

const rows = Object.keys(NAMES)
  .map((code) => {
    const r = raw.find((z) => z.code === code && z.year === YEAR);
    if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
    const total = [...RENEW, ...FOSSIL, NUCLEAR].reduce((s, k) => s + r[k], 0);
    if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
    const share = (k) => (r[k] / total) * 100;
    const parts = [...FOSSIL, NUCLEAR, ...RENEW]
      .map((k) => ({ key: k, pct: share(k) }))
      .filter((p) => p.pct >= 0.5)
      .sort((a, b) => b.pct - a.pct);
    const fossil = FOSSIL.reduce((s, k) => s + share(k), 0);
    const nuclear = share(NUCLEAR);
    const renewable = RENEW.reduce((s, k) => s + share(k), 0);
    const sum = fossil + nuclear + renewable;
    if (Math.abs(sum - 100) > 0.01)
      throw new Error(`${NAMES[code]}'s three groups sum to ${fr(sum, 2)} %, not 100`);
    return {
      code,
      name: NAMES[code],
      fossil,
      nuclear,
      renewable,
      labels: { fossil: `${fr(fossil)} %`, nuclear: `${fr(nuclear)} %`, renewable: `${fr(renewable)} %` },
      detail:
        `${NAMES[code]} · ${YEAR} · fossile ${fr(fossil)} %, nucléaire ${fr(nuclear)} %, ` +
        `renouvelable ${fr(renewable)} % · ` +
        parts.map((p) => `${FR_SOURCE[p.key]} ${fr(p.pct)} %`).join(", "),
    };
  })
  .sort((a, b) => b.fossil - a.fossil);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const subject = rows.find((r) => r.code === SUBJECT);
if (!(subject.nuclear > subject.fossil + subject.renewable))
  throw new Error(
    `the headline says the subject's nuclear band is larger than both its wings together; ` +
      `${fr(subject.nuclear)} against ${fr(subject.fossil + subject.renewable)}`,
  );
const mostFossil = rows[0];
const mostRenewable = [...rows].sort((a, b) => b.renewable - a.renewable)[0];
console.log(
  `${rows.length} pays en ${YEAR} · ${subject.name} : nucléaire ${fr(subject.nuclear)} % contre ` +
    `${fr(subject.fossil)} % fossile et ${fr(subject.renewable)} % renouvelable · plus fossile ` +
    `${mostFossil.name} ${fr(mostFossil.fossil)} % · plus renouvelable ${mostRenewable.name} ` +
    `${fr(mostRenewable.renewable)} %\n`,
);
console.table(rows.map((r) => ({ pays: r.name, fossile: r.labels.fossil, nucléaire: r.labels.nuclear, renouvelable: r.labels.renewable })));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.renewable })),
  { subject: subject.name, declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `En ${YEAR}, le nucléaire français pèse plus lourd que le fossile et le renouvelable réunis`;
const caveat =
  `Mix électrique ${YEAR}, en part de la production de chaque pays. Le fossile part à gauche, le ` +
  `renouvelable à droite, et le NUCLÉAIRE est à cheval sur le centre : il n'appartient ni à l'un ni ` +
  `à l'autre par définition, pas par arbitrage. Les trois parts font 100 % pour chaque pays.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une ligne pour lire le mix complet de ce pays — les trois ` +
  `groupes et chaque source qui atteint un demi-point. Trois bandes résument neuf colonnes.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;
const xTicks = [-100, -50, 0, 50, 100];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} fossile nucléaire renouvelable`,
  axis: `${xTicks.map((t) => Math.abs(t)).join(" ")} % ${rows.map((r) => r.name).join(" ")}`,
  annot: "fossile nucléaire renouvelable",
  value: rows.flatMap((r) => [r.labels.fossil, r.labels.nuclear, r.labels.renewable]).join(" "),
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
      component: DirectedDivergingStackedWeb,
      props: {
        rows,
        subject: SUBJECT,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        sideLabels: { left: "fossile", right: "renouvelable" },
        neutralLabel: "nucléaire",
        alt:
          `Six barres horizontales, une par pays, penchées de part et d'autre d'une ligne centrale : ` +
          `le fossile s'étend vers la gauche, le renouvelable vers la droite, et le nucléaire est ` +
          `posé à cheval sur le centre. La ${subject.name} a une bande centrale de ` +
          `${fr(subject.nuclear)} %, plus large que ses deux ailes réunies ; la ${mostFossil.name} ` +
          `penche le plus à gauche avec ${fr(mostFossil.fossil)} % de fossile, la ` +
          `${mostRenewable.name} le plus à droite avec ${fr(mostRenewable.renewable)} % de ` +
          `renouvelable et pas de nucléaire du tout.`,
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
