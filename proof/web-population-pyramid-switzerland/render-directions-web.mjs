// twin/proof/web-population-pyramid-switzerland/render-directions-web.mjs
//
// Switzerland's population by age band and sex in 2023, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// THE WIDEST BAND IS FOUND, NOT TYPED, and the headline is asserted against it: a pyramid whose
// widest band is not its youngest is an ageing population, and that is the whole claim.
//
// AND SO IS THE CROSSING. The web gesture on this beat is a FOLD — one half's profile laid over the
// other so the difference between the sexes becomes a shape — and its whole product is the band where
// that outline crosses the bars it lies on. That band is found by walking the sign of (femmes -
// hommes) down the frozen file, and the run REFUSES if the sign turns more than once: every sentence
// the control reveals is written as "twelve bands one way, nine the other, one crossing between
// them", and a second crossing would make all of them false while the picture still looked plausible.
//
// Usage:  bun proof/web-population-pyramid-switzerland/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { assertFoldChangesThePicture } from "../../skills/chart-web/assets/fold.ts";
import { DirectedPyramidWeb } from "./DirectedPyramidWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Démographie · Suisse";

const plain = (s) => plainSpaces(s);
const fr = (v, d = 0) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  return {
    band: c[at("age_band")],
    male: Number(c[at("male")]),
    female: Number(c[at("female")]),
    year: Number(c[at("year")]),
  };
});
const year = rows[0].year;
if (rows.some((r) => r.year !== year)) throw new Error("the frozen file spans more than one year");
for (const r of rows)
  if (!Number.isFinite(r.male) || !Number.isFinite(r.female)) throw new Error(`${r.band} has no usable reading`);

const total = rows.reduce((s, r) => s + r.male + r.female, 0);
const widest = rows.reduce((a, b) => (b.male + b.female > a.male + a.female ? b : a));
const youngest = rows[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (widest.band === youngest.band)
  throw new Error(`the headline says the widest band is not the youngest; it is ${widest.band}`);
console.log(
  `${rows.length} tranches · ${fr(total)} habitants en ${year} · bande la plus large ${widest.band} ` +
    `(${fr(widest.male + widest.female)}) · 0-4 ans ${fr(youngest.male + youngest.female)}\n`,
);
console.table(rows.map((r) => ({ tranche: r.band, hommes: fr(r.male), femmes: fr(r.female), total: fr(r.male + r.female), "% du total": ((r.male + r.female) / total * 100).toFixed(1) })));

const bands = rows.map((r) => {
  const bandTotal = r.male + r.female;
  const gap = r.female - r.male;
  return {
    key: r.band,
    left: r.male,
    right: r.female,
    peak: r.band === widest.band,
    detail:
      `${r.band} ans · ${fr(r.male)} hommes, ${fr(r.female)} femmes · ${fr(bandTotal)} personnes, ` +
      `${((bandTotal / total) * 100).toFixed(1).replace(".", ",")} % de la population · ` +
      `${gap === 0 ? "parité exacte" : `${fr(Math.abs(gap))} ${gap > 0 ? "femmes" : "hommes"} de plus`}`,
  };
});

// ── THE CROSSING, FOUND ───────────────────────────────────────────────────────────────────────
const lead = rows.map((r) => Math.sign(r.female - r.male));
if (lead.some((s) => s === 0)) throw new Error("a band is an exact tie, so no side leads it and the fold has no crossing to name");
const turns = lead.map((s, i) => (i > 0 && s !== lead[i - 1] ? i : -1)).filter((i) => i >= 0);
if (turns.length !== 1)
  throw new Error(
    `the fold's sentences say the sign turns ONCE and this file turns it ${turns.length} time(s) ` +
      `(${turns.map((i) => rows[i].band).join(", ") || "never"}) — rewrite them before rendering`,
  );
const cross = turns[0];
const before = cross;
const after = rows.length - cross;
const crossBand = rows[cross];
const widestGap = rows.reduce((a, b) => (Math.abs(b.female - b.male) > Math.abs(a.female - a.male) ? b : a));
const widestMale = rows.slice(0, cross).reduce((a, b) => (b.male - b.female > a.male - a.female ? b : a));
const menTotal = rows.reduce((s, r) => s + r.male, 0);
const womenTotal = rows.reduce((s, r) => s + r.female, 0);
console.log(
  `hommes devant sur ${before} tranches (0-4 -> ${rows[cross - 1].band}), femmes sur ${after} ` +
    `(${crossBand.band} -> ${rows.at(-1).band}) · bascule ${crossBand.band} (+${fr(crossBand.female - crossBand.male)} femmes) · ` +
    `ecart max ${widestGap.band} (${fr(Math.abs(widestGap.female - widestGap.male))})\n`,
);

// ── WHAT THE READER MAY FOLD ──────────────────────────────────────────────────────────────────
// The words only. Where each profile's edges sit is a question only the component owns the scale to
// answer, and `fold.ts` refuses a declaration that offers the gesture one way round only.
const MEN = "hommes";
const WOMEN = "femmes";
const foldPlan = {
  // Short, because the legend shares its row with the pills and the width of that row is plot height
  // on a 375px screen — but not a single word: "Rabattre" alone does not say WHAT is being folded,
  // and it is the only text on this page set at the weight the legend takes, which makes it the whole
  // sample `verify-web.mjs` measures that face's own drawing against.
  label: "Rabattre une moitié",
  noneLabel: "Aucune",
  options: [
    {
      key: MEN,
      host: WOMEN,
      label: `les ${MEN}`,
      announce: plain(
        `Rabattre les ${MEN} sur les ${WOMEN} : le profil masculin posé sur les barres féminines`,
      ),
      note: plain(
        `Le profil des ${MEN}, posé sur celui des ${WOMEN} : il SORT de la barre sur les ${before} ` +
          `tranches de ${rows[0].band} à ${rows[cross - 1].band}, et RENTRE dedans sur les ${after} ` +
          `suivantes. La bascule est à ${crossBand.band} ans, où ${fr(crossBand.female - crossBand.male)} ` +
          `femmes de plus suffisent à faire pencher la tranche.`,
      ),
      crossing: {
        key: crossBand.band,
        text: plain(`${crossBand.band} ans : le profil des ${MEN} rentre dans la barre`),
      },
    },
    {
      key: WOMEN,
      host: MEN,
      label: `les ${WOMEN}`,
      announce: plain(
        `Rabattre les ${WOMEN} sur les ${MEN} : le profil féminin posé sur les barres masculines`,
      ),
      note: plain(
        `Le profil des ${WOMEN}, posé sur celui des ${MEN} : il reste DANS la barre jusqu'à ` +
          `${rows[cross - 1].band} ans — au plus loin à ${widestMale.band}, ` +
          `${fr(widestMale.male - widestMale.female)} hommes de plus — puis il en SORT et ne rentre ` +
          `plus, jusqu'à ${fr(Math.abs(widestGap.female - widestGap.male))} d'écart à ` +
          `${widestGap.band}. Au total ${fr(womenTotal)} femmes contre ${fr(menTotal)} hommes.`,
      ),
      crossing: {
        key: crossBand.band,
        text: plain(`${crossBand.band} ans : le profil des ${WOMEN} sort de la barre`),
      },
    },
  ],
};

const facts = beatFacts(
  rows.map((r) => ({ key: r.band, label: r.band, value: r.male + r.female })),
  { subject: widest.band, declaredSequence: "personnes" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const span = Math.ceil(Math.max(...rows.flatMap((r) => [r.male, r.female])) / 50000) * 50000;
const xTicks = [-span, -span / 2, 0, span / 2, span];

const title = `La tranche la plus large de la Suisse est celle des ${widest.band} ans, pas celle des 0-4 ans`;
const caveat =
  `Population suisse en ${year}, par tranche de cinq ans, hommes à gauche et femmes à droite d'une ` +
  `ligne centrale. Une pyramide la plus large au MILIEU est une population qui vieillit, pas une ` +
  `population qui croît — et rien d'autre que la tranche nommée ne dit laquelle.`;
const peakNote = `${widest.band} ans : ${fr(widest.male + widest.female)} personnes`;
const readingLine =
  `Lecture : rabattez une moitié sur l'autre — son profil vient se poser sur les barres d'en face, et ` +
  `là où il les traverse, les deux sexes changent de rang. Survolez, touchez ou tabulez une tranche ` +
  `pour ses deux effectifs, leur total, l'écart entre les sexes et sa part de la population.`;
const source = `Source : Office fédéral de la statistique · population résidente permanente, ${year}`;

// A REGISTER'S DECLARED TEXT IS WHAT THE PAGE'S OWN FACES ARE SUBSETTED FROM, so a glyph the page can
// display and no register names is a glyph the delivered file cannot draw. The control's own words —
// the legend, the three pills, the two sentences it reveals and the two crossings it prints — are new
// words on this page and they go in.
const foldWords = foldPlan.options
  .map((o) => `${o.label} ${o.announce} ${o.note} ${o.crossing.text}`)
  .join(" ");
const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${MEN} ${WOMEN} ${foldPlan.label} ${foldPlan.noneLabel} ${foldWords}`,
  axis: `${bands.map((b) => b.key).join(" ")} ${xTicks.map((t) => `${Math.abs(t) / 1000}k`).join(" ")}`,
  annot: `${peakNote} ${foldPlan.options.map((o) => o.crossing.text).join(" ")}`,
  value: bands.map((b) => `${fr(b.left)} ${fr(b.right)}`).join(" "),
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
  let outPath = null;
  try {
    ({ outPath } = await renderWeb({
      component: DirectedPyramidWeb,
      props: {
        bands, span, xTicks,
        sideLabels: { left: MEN, right: WOMEN },
        foldPlan,
        peakNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une pyramide des âges : ${rows.length} tranches de cinq ans empilées, les hommes vers la ` +
          `gauche et les femmes vers la droite. La silhouette ne s'élargit pas vers le bas : elle est ` +
          `la plus large à la tranche ${widest.band} ans (${fr(widest.male + widest.female)} ` +
          `personnes) et se resserre vers les plus jeunes, où les 0-4 ans ne comptent que ` +
          `${fr(youngest.male + youngest.female)} personnes. Un choix au-dessus du graphique rabat ` +
          `une moitié sur l'autre : son profil est redessiné en trait plein par-dessus les barres ` +
          `d'en face, et il les traverse une seule fois, à ${crossBand.band} ans.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    }));
    // THE CONTROL CHANGES THE PICTURE, MEASURED ON THE PAGE THAT WAS JUST WRITTEN. `renderWeb` runs
    // `assertInteractionPlan`, whose census discovers a filter, a stack and a yardstick by their own
    // radio ids and knows nothing of this vocabulary's — so the refusal ships with the vocabulary
    // instead of being squatted onto another one's name. A page that fails it is removed rather than
    // left on disk, because a written file is a file somebody will open.
    assertFoldChangesThePicture(await readFile(outPath, "utf8"), foldPlan, `renders/${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    if (outPath) await unlink(outPath).catch(() => {});
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
