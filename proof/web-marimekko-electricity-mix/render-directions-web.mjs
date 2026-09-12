// twin/proof/web-marimekko-electricity-mix/render-directions-web.mjs
//
// Six European countries' 2024 electricity as a marimekko, rendered once per FILED DIRECTION into a
// self-contained interactive page. Column width is generation, column height is the mix, so a band's
// AREA is a quantity in TWh.
//
// A MARIMEKKO'S AREAS ARE A PRODUCT OF TWO SCALES, so the beat checks both: every column's bands sum
// to that column's own total, and the widths sum to the six countries' total.
//
// Usage:  bun proof/web-marimekko-electricity-mix/render-directions-web.mjs

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
import { DirectedMarimekkoWeb, FRAME } from "./DirectedMarimekkoWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const FOCUS = "Coal";
// Ordered from the lightest tone to the darkest: the ramp is the reading order.
const SOURCES = [
  ["Other renewables", "autres renouv."],
  ["Bioenergy", "biomasse"],
  ["Solar", "solaire"],
  ["Wind", "éolien"],
  ["Hydropower", "hydraulique"],
  ["Nuclear", "nucléaire"],
  ["Oil", "pétrole"],
  ["Gas", "gaz"],
  ["Coal", "charbon"],
];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };

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
  for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});

const countries = Object.keys(NAMES).map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  const total = SOURCES.reduce((s, [k]) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  const sum = SOURCES.reduce((s, [k]) => s + r[k], 0);
  if (Math.abs(sum - total) > 1e-9)
    throw new Error(`${NAMES[code]}'s bands sum to ${fr(sum)} TWh against a column total of ${fr(total)}`);
  return { code, name: NAMES[code], total, by: Object.fromEntries(SOURCES.map(([k]) => [k, r[k]])) };
}).sort((a, b) => b.total - a.total);

const grand = countries.reduce((s, c) => s + c.total, 0);
const focusTotal = countries.reduce((s, c) => s + c.by[FOCUS], 0);
const focusShare = (focusTotal / grand) * 100;
const holders = [...countries].sort((a, b) => b.by[FOCUS] - a.by[FOCUS]);
const twoShare = ((holders[0].by[FOCUS] + holders[1].by[FOCUS]) / focusTotal) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(twoShare > 95))
  throw new Error(`the headline says two countries hold nearly all the coal; they hold ${fr(twoShare)} %`);
console.log(
  `${countries.length} pays · ${fr(grand)} TWh au total · charbon ${fr(focusTotal)} TWh ` +
    `(${fr(focusShare)} %) dont ${fr(twoShare)} % dans ${holders[0].name} et ${holders[1].name}\n`,
);
console.table(countries.map((c) => ({ pays: c.name, TWh: fr(c.total, 0), "charbon TWh": fr(c.by[FOCUS], 1), "charbon %": fr((c.by[FOCUS] / c.total) * 100) })));

// ── geometry ──────────────────────────────────────────────────────────────────────────────────
const GAP = 6;
const usable = FRAME.width - GAP * (countries.length - 1);
let cursor = 0;
const columns = [];
const bands = [];
for (const c of countries) {
  const w = (c.total / grand) * usable;
  columns.push({ code: c.code, name: c.name, x: cursor, w, twh: `${fr(c.total, 0)} TWh` });
  let y = 0;
  SOURCES.forEach(([key, name], tone) => {
    const share = (c.by[key] / c.total) * 100;
    const h = (c.by[key] / c.total) * FRAME.height;
    if (h > 0)
      bands.push({
        code: c.code,
        source: name,
        x: cursor,
        w,
        y,
        h,
        tone,
        // A band is named inside itself only when it can hold its own name.
        label: h >= 20 && w >= 70 ? `${name} ${fr(share, 0)} %` : null,
        detail:
          `${c.name} · ${name} · ${fr(share)} % de son mix · ${fr(c.by[key], 1)} TWh · ` +
          `${fr((c.by[key] / grand) * 100, 2)} % des ${fr(grand, 0)} TWh des six`,
      });
    y += h;
  });
  cursor += w + GAP;
}

const facts = beatFacts(
  countries.map((c) => ({ key: c.code, label: c.name, value: c.total })),
  { subject: holders[0].name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Le charbon ne pèse que ${fr(focusShare)} % de l'électricité de ces six pays — et ${fr(twoShare)} % de ce charbon est brûlé dans deux d'entre eux`;
const caveat =
  `Six pays européens en ${YEAR}, ${fr(grand, 0)} TWh en tout. La LARGEUR d'une colonne est la ` +
  `production du pays, sa HAUTEUR est son mix : la SURFACE d'une bande est donc une quantité réelle ` +
  `en TWh, ce qu'une série de six colonnes en pourcentage ne pourrait pas dire.`;
const widthNote =
  `Largeur = production du pays ; hauteur = part de chaque source. La teinte ORDONNE les sources, ` +
  `du renouvelable au fossile ; c'est le nom dans la bande, ou le pointeur, qui les nomme.`;
const claimNote = `Charbon : ${fr(focusTotal, 0)} TWh sur ${fr(grand, 0)}.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une bande pour lire le pays, la source, sa part du mix, ` +
  `ses TWh et sa part des ${fr(grand, 0)} TWh des six. La surface EST la quantité — et une surface ` +
  `est justement ce qu'un œil ne sait pas lire.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${countries.map((c) => `${c.name} ${fr(c.total, 0)} TWh`).join(" ")} ${SOURCES.map(([, n]) => n).join(" ")}`,
  annot: `${claimNote} ${widthNote}`,
  value: bands.filter((b) => b.label).map((b) => b.label).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. A single U+202F or
// U+00A0 — the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to —
// refuses every family on the sans ladder and takes the whole render down. Measured here: a
// no-break space typed inside a band's own label string, invisible in the source, stopped all three
// directions with "no family on the sans ladder can set this beat's text".
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
      component: DirectedMarimekkoWeb,
      props: {
        bands, columns,
        tones: SOURCES.length,
        toneLabels: SOURCES.map(([, n]) => n),
        widthNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Six colonnes de largeurs inégales : la ${countries[0].name} est la plus large avec ` +
          `${fr(countries[0].total, 0)} TWh, la ${countries[countries.length - 1].name} la plus ` +
          `étroite avec ${fr(countries[countries.length - 1].total, 0)}. Chaque colonne est empilée ` +
          `par source, de la plus claire (renouvelables) à la plus foncée (charbon). Les bandes de ` +
          `charbon ne sont visibles que dans ${holders[0].name} et ${holders[1].name} ; ailleurs ` +
          `elles sont un filet ou rien.`,
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
