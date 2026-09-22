// twin/proof/web-heatmap-europe-electricity/render-directions-web.mjs
//
// The seven European countries above the 94 % low-carbon floor, against nine electricity sources,
// rendered once per FILED DIRECTION into a self-contained interactive page.
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
import { slugOf } from "../../skills/chart-web/assets/filter.ts";
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

/** One cell's identity, and the ONE place it is derived — the string `data-key` carries, the
 *  string the filter's options name, and the string the generated selector narrows on. */
const cellKey = (code, source) => `${code}:${source}`;

/** A source's rank among the seven rows drawn, for that source. */
const rankFor = (key, code) =>
  [...rows].sort((a, b) => b.shares[key] - a.shares[key]).findIndex((r) => r.code === code) + 1;

const cells = rows.flatMap((r, row) =>
  COLUMNS.map(([key, name], col) => {
    const v = r.shares[key];
    const bin = binOf(v);
    return {
      row,
      col,
      key: cellKey(r.code, key),
      value: v,
      bin,
      // A number is printed only where it carries the argument: the cells above the top break.
      label: v >= BREAKS[BREAKS.length - 1] ? fr(v, 0) : null,
      detail:
        `${NAMES[r.code]} · ${name} · ${fr(v)} % de son électricité (${fr(r.twh[key], 1)} TWh sur ` +
        `${fr(r.total, 0)}) · ${rankFor(key, r.code)}e sur ${rows.length} pour cette source`,
    };
  }),
);

// ── THE FLOOR ─────────────────────────────────────────────────────────────────────────────────
// The one gesture this page reaches for, written in BRIEF.md before this code existed: a heatmap's
// only quantitative channel is colour, colour ranks but does not measure, and the low end of a
// sequential ramp is close to the ground BY CONSTRUCTION. On this beat that is 29 cells under
// 0,5 % and 44 under 5 % — two thirds of the grid is a pale wash the reader cannot read and does
// not need to. So the reader is given the floor itself.
//
// It is `filter.ts`'s THRESHOLD-AS-NAMED-BANDS form, which that file's own header names as one of
// the three shapes the vocabulary reduces to (`keys: rows.filter(r => r.value >= t)`). The bands
// NEST — every cell at or above 25 % is also at or above 15 % and 5 % — which is why `data-filter`
// is a token list matched with `~=` rather than one slug, and why the options do not have to
// partition the data. No script: one generated CSS rule per band, so the floor works identically
// with JavaScript off.
const BANDS = [5, 15, 25];
const drawnKeys = rows.flatMap((r) => COLUMNS.map(([k]) => cellKey(r.code, k)));
const keptAt = (t) =>
  rows.flatMap((r) => COLUMNS.filter(([k]) => r.shares[k] >= t).map(([k]) => cellKey(r.code, k)));

const filter = {
  label: "Ne garder que les parts d'au moins",
  allLabel: "Toutes les parts",
  unit: "cases",
  options: BANDS.map((t) => ({ label: `${fr(t, 0)} %`, keys: keptAt(t) })),
};

// EVERY ROW SURVIVES EVERY BAND, AND THAT IS CHECKED RATHER THAN HOPED. A country whose every cell
// fell below the floor would vanish from the ranking the rows are ordered by, which is the one
// thing a narrowing control on this type must not do: the frame a cell is measured against is the
// RAMP KEY, and the key never moves. A source whose every cell falls away is a different case — an
// empty category, not frame — and its column label leaves with its column, below.
for (const t of BANDS) {
  const kept = new Set(keptAt(t));
  const gone = rows.filter((r) => !COLUMNS.some(([k]) => kept.has(cellKey(r.code, k))));
  if (gone.length)
    throw new Error(
      `the ${fr(t, 0)} % band empties ${gone.map((r) => NAMES[r.code]).join(", ")} — a country ` +
        `with no cell left is a row label standing over a blank strip, which is the orphan the ` +
        `filter vocabulary exists to refuse`,
    );
}

/** The token list one element carries when it is drawn from SEVERAL cells — a row's own country
 *  label, a column's own source label. `attrsFor` hands out the attributes for a single datum; an
 *  axis label belongs to nine cells or to seven, so its list is the UNION, derived here from the
 *  same `keptAt` the options are, never typed. It carries no `data-key`, which is what keeps
 *  `assertOneVocabulary` — a check about ONE datum's elements agreeing — out of its way. */
const unionFilter = (keys) =>
  BANDS.map((t) => ({ t, kept: new Set(keptAt(t)) }))
    .filter(({ kept }) => keys.some((k) => kept.has(k)))
    .map(({ t }) => slugOf(`${fr(t, 0)} %`))
    .join(" ");
// A source none of whose cells reaches ANY band gets an empty list, which is the honest answer:
// it belongs to no band, so every band's rule hides it and the unfiltered view keeps it.
const rowFilters = rows.map((r) => unionFilter(COLUMNS.map(([k]) => cellKey(r.code, k))));
const colFilters = COLUMNS.map(([k]) => unionFilter(rows.map((r) => cellKey(r.code, k))));

/** THE SENTENCE EACH BAND OWES THE READER, IN THE BEAT'S OWN WORDS AND IN ITS OWN LANGUAGE.
 *
 *  `filterNotes` derives the same sentence in English ("Showing … — n of m cases"), which is the
 *  right default and the wrong language for a page written in French; the slug, the CSS that
 *  reveals it and the `data-filter-note` attribute it is keyed on are all still the vocabulary's,
 *  so this is the same mechanism saying the beat's own words — what `stack.ts` and `level.ts` make
 *  a required field for exactly this reason.
 *
 *  AND IT CARRIES THE DERIVED READING, which is the whole reason the control is worth shipping:
 *  not "19 of 63 cells" (a count of what left) but HOW MUCH OF EACH COUNTRY'S ELECTRICITY THE
 *  SURVIVORS STILL ACCOUNT FOR, and how few of them it takes. Both computed from the frozen file
 *  here, printed nowhere at rest, and asserted above. */
const coverageAt = (t) =>
  rows.map((r) => ({
    name: NAMES[r.code],
    cells: COLUMNS.filter(([k]) => r.shares[k] >= t).length,
    share: COLUMNS.filter(([k]) => r.shares[k] >= t).reduce((s, [k]) => s + r.shares[k], 0),
  }));
const filterNotesFr = BANDS.map((t) => {
  const kept = keptAt(t);
  const sources = new Set(kept.map((k) => k.split(":")[1])).size;
  const cover = coverageAt(t);
  const low = cover.reduce((a, b) => (b.share < a.share ? b : a));
  const high = cover.reduce((a, b) => (b.share > a.share ? b : a));
  const fewest = cover.reduce((a, b) => (b.cells < a.cells ? b : a));
  const most = cover.reduce((a, b) => (b.cells > a.cells ? b : a));
  return {
    slug: slugOf(`${fr(t, 0)} %`),
    text: plain(
      `Au moins ${fr(t, 0)} % : ${kept.length} cases sur ${drawnKeys.length}, sur ${sources} des ` +
        `${COLUMNS.length} sources. Ce qui reste couvre encore de ${fr(low.share)} % ` +
        `(${low.name}) à ${fr(high.share)} % (${high.name}) de l'électricité du pays — ` +
        `${fewest.cells} source pour le plus concentré (${fewest.name}), ${most.cells} pour le ` +
        `plus réparti (${most.name}).`,
    ),
  };
});
console.log(filterNotesFr.map((n) => `  ${n.slug}: ${n.text}`).join("\n"), "\n");

/** THE INTERACTION, DECLARED — `BRIEF.md`'s own sentences, carried into the render so the prose and
 *  the page cannot drift (`assets/interaction-plan.ts`). */
const interaction = {
  earns:
    "A reader can raise the floor under the grid and watch which cells survive — the 44 of 63 that " +
    "are rounding error leave, and the page says how much of each country's electricity the " +
    "survivors still account for. A still has to draw all 63 at once, and 29 are under 0,5 %.",
  controls: [
    {
      question:
        "Which sources actually run each of these countries — and how little is the rest of this grid worth?",
      gesture: "filter-to-a-subset",
      changes:
        "Every cell under the chosen share leaves — rect, printed value, hit target, and a source's " +
        "own column label once its whole column has fallen away. The ramp key never moves.",
    },
    {
      question: "What is this cell actually worth, and is this country big or small on this source?",
      gesture: "ask-a-mark",
      changes:
        "The cell answers with its exact share, the TWh behind it, and the country's rank among the " +
        "seven for that source — the comparison the grid's own geometry makes impossible.",
    },
  ],
};

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: NAMES[r.code], value: r.lowCarbon })),
  { subject: NAMES[rows[0].code], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// SHORTENED AGAINST A MEASURED WINDOW, NOT A TASTE. The floor's fieldset costs 74-78 px of an
// 812 px phone, and nocturne sets `display` large enough that this title ran to NINE lines of
// 39 px there — 351 px of a 812 px window before a single cell was drawn. Every word that went
// said again what another word already said ("tirent ... de sources" / "différentes").
const title = `${rows.length} pays européens : plus de ${FLOOR} % d'électricité bas-carbone, par trois routes`;
// The clause that went — "9 colonnes ne sont pas 9 couleurs" — said twice what "une seule teinte"
// says once, and its line was one of the two the phone window did not have.
const caveat =
  `${rows.length} pays sur ${COLUMNS.length} sources, en ${YEAR} : chaque case est la part d'une ` +
  `source dans l'électricité du pays, en une teinte unique du clair au foncé. Lignes par part ` +
  `bas-carbone, colonnes renouvelables d'abord.`;
// ONE paragraph, not three. Three stacked annotation lines cost 44px of a 812px phone window and
// the format's own fit check reported exactly that overflow.
const routes = [
  {
    key: "routes",
    text:
      `Sans nucléaire du tout : ${byRoute("renouvelable").map((r) => NAMES[r.code]).join(", ")}. ` +
      `Par le nucléaire : ${byRoute("nucléaire").map((r) => `${NAMES[r.code]} (${fr(r.nuclearShare)} %)`).join(", ")}. ` +
      `Par les deux (plus de 50 % de renouvelables ET plus de 25 % de nucléaire) : ` +
      `${byRoute("les deux").map((r) => NAMES[r.code]).join(", ")}.`,
  },
];
// ONE SHORT PARAGRAPH. The filter's own fieldset costs 78 px of an 812 px phone window, and the
// format's fit check measured exactly 83 px of overflow the first time this line kept its old
// three sentences beside it. What went is the machinery (how many paliers, how the pointer
// resolves); what stayed is what a reader DOES.
const belowFloor = cells.filter((c) => c.value < BANDS[0]).length;
const readingLine =
  `Lecture : relevez le seuil — ${belowFloor} des ${cells.length} cases sont sous ` +
  `${fr(BANDS[0], 0)} %. Survolez ou tabulez une case pour sa part, ses TWh et son rang.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${filter.label} ${filter.allLabel} ` +
    `${filter.options.map((o) => o.label).join(" ")} ${filterNotesFr.map((n) => n.text).join(" ")}`,
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedHeatmapWeb,
      props: {
        cells,
        rowLabels: rows.map((r) => ({ name: NAMES[r.code], route: r.route })),
        colLabels: COLUMNS.map(([, n]) => n),
        bins,
        routes,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        rowFilters,
        colFilters,
        notes: filterNotesFr,
        filter,
        filterKeys: drawnKeys,
        interaction,
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
