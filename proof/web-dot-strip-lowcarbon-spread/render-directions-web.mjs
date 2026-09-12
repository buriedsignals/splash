// twin/proof/web-dot-strip-lowcarbon-spread/render-directions-web.mjs
//
// Sixteen European countries on two ruled strips — the low-carbon share of their electricity in 2000
// and in 2024 — rendered once per FILED DIRECTION into a self-contained interactive page.
//
// Usage:  bun proof/web-dot-strip-lowcarbon-spread/render-directions-web.mjs

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
import { DirectedDotStripWeb } from "./DirectedDotStripWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;
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
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);

const shareOf = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${year}`);
  return (low / total) * 100;
};

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const years = [FROM, TO];
const perYear = years.map((year) => {
  const values = codes.map((code) => ({ code, name: NAMES[code], value: shareOf(code, year) }));
  const sorted = [...values].sort((a, b) => a.value - b.value);
  return {
    year,
    values,
    sorted,
    floor: sorted[0],
    ceiling: sorted[sorted.length - 1],
    median: median(values.map((v) => v.value)),
  };
});

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const [before, after] = perYear;
const floorRise = after.floor.value - before.floor.value;
const ceilingRise = after.ceiling.value - before.ceiling.value;
const spreadBefore = before.ceiling.value - before.floor.value;
const spreadAfter = after.ceiling.value - after.floor.value;
const closed = spreadBefore - spreadAfter;
if (!(floorRise > 20 && ceilingRise < 5))
  throw new Error(`the headline says the floor rose far while the ceiling barely moved; ${fr(floorRise)} against ${fr(ceilingRise)}`);
if (!(closed / spreadBefore > 0.2))
  throw new Error(`the headline says the spread closed by more than a fifth; it closed by ${fr((closed / spreadBefore) * 100)} %`);
const SUBJECT = before.floor.code;
console.log(
  `${codes.length} pays · plancher ${fr(before.floor.value)} -> ${fr(after.floor.value)} ` +
    `(${fr(floorRise)} pts) · plafond ${fr(before.ceiling.value)} -> ${fr(after.ceiling.value)} ` +
    `(${fr(ceilingRise)} pts) · écart ${fr(spreadBefore)} -> ${fr(spreadAfter)} · médiane ` +
    `${fr(before.median)} -> ${fr(after.median)}\n`,
);
console.table(codes.map((code) => ({ pays: NAMES[code], [FROM]: fr(shareOf(code, FROM)), [TO]: fr(shareOf(code, TO)) })));

/** Chips are stacked into rows only where they would overlap on their own rail. Deterministic:
 *  ordered by value, each takes the lowest free row its neighbours leave it. */
const stack = (values) => {
  const CLEAR = 3.1; // percentage points, the width of a chip on this scale
  const ordered = [...values].sort((a, b) => a.value - b.value);
  const rows = [];
  return ordered.map((v) => {
    let row = 0;
    while (rows[row] !== undefined && v.value - rows[row] < CLEAR) row += 1;
    rows[row] = v.value;
    return { ...v, row };
  });
};

const rails = perYear.map((y, i) => {
  const other = perYear[1 - i];
  const rankIn = (list, code) => list.findIndex((z) => z.code === code) + 1;
  return {
    key: String(y.year),
    heading: `${y.year}`,
    floor: { value: y.floor.value, label: `plancher ${fr(y.floor.value)} %` },
    median: { value: y.median, label: `médiane ${fr(y.median)} %` },
    ceiling: { value: y.ceiling.value, label: `plafond ${fr(y.ceiling.value)} %` },
    chips: stack(y.values).map((c) => ({
      code: c.code,
      name: c.name,
      value: c.value,
      row: c.row,
      detail:
        `${c.name} · ${y.year} : ${fr(c.value)} % · ${other.year} : ${fr(shareOf(c.code, other.year))} % · ` +
        `${rankIn(y.sorted, c.code)}ᵉ sur ${codes.length} en ${y.year}, ` +
        `${rankIn(other.sorted, c.code)}ᵉ en ${other.year}`,
    })),
  };
});

const facts = beatFacts(
  after.values.map((v) => ({ key: v.code, label: v.name, value: v.value })),
  { subject: NAMES[SUBJECT], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `En vingt-quatre ans, le plancher de l'électricité bas-carbone européenne a monté de ${fr(floorRise, 0)} points et le plafond de ${fr(ceilingRise, 0)}`;
const caveat =
  `Deux rails, deux dates : chaque pastille est un pays, sa position la part bas-carbone de son ` +
  `électricité. Un rail se lit comme une FORME — où est le plancher, où est le plafond, où le ` +
  `milieu se serre — jamais comme la trajectoire d'un pays : aucune ligne ne relie les deux rails.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une pastille pour lire le pays, sa part sur ce rail, sa ` +
  `part sur l'autre et son rang aux deux dates — les quatre lectures qui redonnent des pays à une ` +
  `forme.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;
const xTicks = [0, 25, 50, 75, 100];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} %`,
  annot: rails.flatMap((r) => [r.heading, r.floor.label, r.median.label, r.ceiling.label]).join(" "),
  value: rails.flatMap((r) => r.chips.map((c) => fr(c.value))).join(" "),
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
      component: DirectedDotStripWeb,
      props: {
        rails,
        subject: SUBJECT,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        notes: [
          { rail: String(FROM), code: SUBJECT, text: `${NAMES[SUBJECT]} ${fr(before.floor.value)} %` },
          { rail: String(TO), code: SUBJECT, text: `${NAMES[SUBJECT]} ${fr(after.floor.value)} %` },
        ],
        alt:
          `Deux rails horizontaux gradués de 0 à 100 %. Sur celui de ${FROM}, ${codes.length} ` +
          `pastilles s'étalent de ${fr(before.floor.value)} % à ${fr(before.ceiling.value)} % ; sur ` +
          `celui de ${TO}, elles se resserrent entre ${fr(after.floor.value)} % et ` +
          `${fr(after.ceiling.value)} %. Le plancher monte de ${fr(floorRise)} points, le plafond de ` +
          `${fr(ceilingRise)}, et l'écart entre les deux se referme de ${fr(closed)} points. La ` +
          `pastille de la ${NAMES[SUBJECT]}, plancher aux deux dates, est colorée.`,
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
