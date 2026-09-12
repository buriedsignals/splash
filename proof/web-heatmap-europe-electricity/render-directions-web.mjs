// twin/proof/web-heatmap-europe-electricity/render-directions-web.mjs
//
// Twelve European countries against nine electricity sources, rendered once per FILED DIRECTION into
// a self-contained interactive page.
//
// THE THREE ROUTES ARE A COMPUTED PARTITION, not a caption: three disjoint groups, and a country that
// falls into none of them, or into two, throws.
//
// Usage:  bun proof/web-heatmap-europe-electricity/render-directions-web.mjs

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
import { DirectedHeatmapWeb } from "./DirectedHeatmapWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const FLOOR = 94;
const COLUMNS = [
  ["hydro_generation__twh", "hydraulique"],
  ["wind_generation__twh", "éolien"],
  ["solar_generation__twh", "solaire"],
  ["bioenergy_stacked_generation__twh", "biomasse"],
  ["other_renewables_generation__twh", "autres renouv."],
  ["nuclear_generation__twh", "nucléaire"],
  ["gas_generation__twh", "gaz"],
  ["coal_generation__twh", "charbon"],
  ["oil_generation__twh", "pétrole"],
];
const RENEW = COLUMNS.slice(0, 5).map(([k]) => k);
const NUCLEAR = "nuclear_generation__twh";
const NAMES = {
  ISL: "Islande", ALB: "Albanie", NOR: "Norvège", FRA: "France", SWE: "Suède", CHE: "Suisse",
  FIN: "Finlande", AUT: "Autriche", DNK: "Danemark", PRT: "Portugal", ESP: "Espagne",
  DEU: "Allemagne", POL: "Pologne", GBR: "Royaume-Uni", ITA: "Italie", NLD: "Pays-Bas",
  BEL: "Belgique", CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  MKD: "Macédoine du N.", ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie",
  SVN: "Slovénie", TUR: "Turquie", UKR: "Ukraine", BLR: "Biélorussie", BIH: "Bosnie-Herz.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", EST: "Estonie", HUN: "Hongrie",
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
  for (const [k] of COLUMNS) o[k] = Number(c[at(k)]);
  return o;
});

const measured = raw
  .filter((r) => r.year === YEAR)
  .map((r) => {
    const total = COLUMNS.reduce((s, [k]) => s + r[k], 0);
    const renew = RENEW.reduce((s, k) => s + r[k], 0);
    const nuclear = r[NUCLEAR];
    return {
      code: r.code,
      total,
      renewShare: total > 0 ? (renew / total) * 100 : 0,
      nuclearShare: total > 0 ? (nuclear / total) * 100 : 0,
      lowCarbon: total > 0 ? ((renew + nuclear) / total) * 100 : 0,
      shares: Object.fromEntries(COLUMNS.map(([k]) => [k, total > 0 ? (r[k] / total) * 100 : 0])),
      twh: Object.fromEntries(COLUMNS.map(([k]) => [k, r[k]])),
    };
  })
  .filter((r) => r.total > 0);

const clean = measured.filter((r) => r.lowCarbon > FLOOR).sort((a, b) => b.lowCarbon - a.lowCarbon);
for (const c of clean) if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed in this beat`);

// ── THE PARTITION, COMPUTED ───────────────────────────────────────────────────────────────────
const routeOf = (r) => {
  const renewOnly = r.nuclearShare < 1;
  const nuclearLed = r.nuclearShare > 50;
  const both = r.renewShare > 50 && r.nuclearShare > 25;
  const hits = [renewOnly && "renouvelable", nuclearLed && "nucléaire", both && "les deux"].filter(Boolean);
  if (hits.length !== 1)
    throw new Error(
      `${NAMES[r.code]} falls into ${hits.length} routes (${hits.join(", ") || "none"}): ` +
        `renouvelable ${fr(r.renewShare)} %, nucléaire ${fr(r.nuclearShare)} %`,
    );
  return hits[0];
};
const rows = clean.map((r) => ({ ...r, route: routeOf(r) }));
const byRoute = (key) => rows.filter((r) => r.route === key);

console.log(
  `${measured.length} pays mesurés en ${YEAR} · ${rows.length} au-dessus de ${FLOOR} % bas-carbone · ` +
    `renouvelable seul : ${byRoute("renouvelable").map((r) => NAMES[r.code]).join(", ")} · ` +
    `nucléaire : ${byRoute("nucléaire").map((r) => NAMES[r.code]).join(", ")} · ` +
    `les deux : ${byRoute("les deux").map((r) => NAMES[r.code]).join(", ")}\n`,
);
console.table(rows.map((r) => ({ pays: NAMES[r.code], "bas-carbone %": fr(r.lowCarbon), "renouv. %": fr(r.renewShare), "nucléaire %": fr(r.nuclearShare), route: r.route })));

// ── the bins ──────────────────────────────────────────────────────────────────────────────────
const BREAKS = [0.5, 5, 15, 30, 50, 70];
const bins = [
  { label: "< 0,5 %" },
  ...BREAKS.slice(0, -1).map((b, i) => ({ label: `${b}–${BREAKS[i + 1]}` })),
  { label: `≥ ${BREAKS[BREAKS.length - 1]} %` },
];
const binOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};

/** A source's rank among the twelve rows drawn, for that source. */
const rankFor = (key, code) =>
  [...rows].sort((a, b) => b.shares[key] - a.shares[key]).findIndex((r) => r.code === code) + 1;

const cells = rows.flatMap((r, row) =>
  COLUMNS.map(([key, name], col) => {
    const v = r.shares[key];
    const bin = binOf(v);
    return {
      row,
      col,
      value: v,
      bin,
      // A number is printed only where it carries the argument: the cells above the top break.
      label: v >= BREAKS[BREAKS.length - 1] ? fr(v, 0) : null,
      detail:
        `${NAMES[r.code]} · ${name} · ${fr(v)} % de son électricité (${fr(r.twh[key], 1)} TWh sur ` +
        `${fr(r.total, 0)}) · ${rankFor(key, r.code)}ᵉ sur ${rows.length} pour cette source`,
    };
  }),
);

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: NAMES[r.code], value: r.lowCarbon })),
  { subject: NAMES[rows[0].code], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `${rows.length} pays européens tirent plus de ${FLOOR} % de leur électricité de sources bas-carbone — par trois routes différentes`;
const caveat =
  `${rows.length} pays sur ${COLUMNS.length} sources, en ${YEAR} : chaque case est la part d'une source dans ` +
  `l'électricité du pays. Une seule teinte, du plus clair au plus foncé — ${COLUMNS.length} colonnes ne sont pas ` +
  `${COLUMNS.length} couleurs. Les lignes sont classées par part bas-carbone, les colonnes groupées ` +
  `renouvelables d'abord.`;
// ONE paragraph, not three. Three stacked annotation lines cost 44px of a 812px phone window and
// the format's own fit check reported exactly that overflow.
const routes = [
  {
    key: "routes",
    text:
      `Sans nucléaire du tout : ${byRoute("renouvelable").map((r) => NAMES[r.code]).join(", ")}. ` +
      `Par le nucléaire : ${byRoute("nucléaire").map((r) => `${NAMES[r.code]} (${fr(r.nuclearShare)} %)`).join(", ")}. ` +
      `Par les deux, chacun au-dessus de 50 % de renouvelables ET de 25 % de nucléaire : ` +
      `${byRoute("les deux").map((r) => NAMES[r.code]).join(", ")}.`,
  },
];
const readingLine =
  `Lecture : survolez, touchez ou tabulez une case pour lire la part exacte, les TWh derrière elle ` +
  `et le rang du pays pour cette source — les ${cells.length} valeurs que la couleur range en ` +
  `${bins.length} paliers. Le pointeur résout à la case : ${rows.length} lignes partagent chaque abscisse.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${COLUMNS.map(([, n]) => n).join(" ")} ${rows.map((r) => NAMES[r.code]).join(" ")} ${bins.map((b) => b.label).join(" ")}`,
  annot: routes.map((r) => r.text).join(" "),
  value: cells.filter((c) => c.label).map((c) => c.label).join(" "),
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
      component: DirectedHeatmapWeb,
      props: {
        cells,
        rowLabels: rows.map((r) => ({ name: NAMES[r.code], route: r.route })),
        colLabels: COLUMNS.map(([, n]) => n),
        bins,
        routes,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une matrice de ${rows.length} lignes de pays sur ${COLUMNS.length} colonnes de sources, ` +
          `chaque case teintée selon la part de cette source dans l'électricité du pays en ${YEAR}. ` +
          `Trois motifs apparaissent : des lignes foncées uniquement dans les colonnes ` +
          `renouvelables (${byRoute("renouvelable").map((r) => NAMES[r.code]).join(", ")}), une ` +
          `ligne foncée dans la colonne nucléaire ` +
          `(${byRoute("nucléaire").map((r) => NAMES[r.code]).join(", ")}), et des lignes foncées des ` +
          `deux côtés (${byRoute("les deux").map((r) => NAMES[r.code]).join(", ")}).`,
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
