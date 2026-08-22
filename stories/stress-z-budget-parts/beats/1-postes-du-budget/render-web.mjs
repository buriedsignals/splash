// stories/stress-z-budget-parts/beats/1-postes-du-budget/render-web.mjs
//
// This beat's own WEB runner — the shape
// `stories/stress-k-flat-inspections/beats/1-flat-inspections/render-web.mjs` and
// `proof/webz-diverging-bar-eu-per-capita/render-web.mjs` teach: the story's own constants, the
// story's own CSV reader, the story's own component, handed to the format's generic `renderWeb`,
// then two in-place repairs (this beat's own interaction script and its own grid CSS) before
// anything is served or checked.
//
// EVERY CLAIM IN THE DELIVERED WORDS IS COMPUTED HERE, from the story's own frozen
// `source/data.csv` — never typed. The headline says the parts do not make a whole, which is a
// claim that quietly stops being true with a data refresh, so it is ASSERTED: this script throws
// rather than shipping a stale sentence over fresh numbers.
//
// Usage: bun stories/stress-z-budget-parts/beats/1-postes-du-budget/render-web.mjs [outDir]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette, framingMeasurement } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { storyboardGateStatus } from "#shared/chart-web/scripts/storyboard-gate.mjs";
import { BudgetPartsWeb, FRAME } from "./BudgetPartsWeb.tsx";
import { fr } from "./budget-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

const DEFAULT_DATA_PATH = join(STORY, "source", "data.csv");
const DEFAULT_OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "postes-du-budget.html";

/** The language this beat's words are written in — `STORYBOARD.md`'s own `language:` field, handed
 *  to `renderWeb` as a real input rather than patched into the shipped file afterwards. */
const LANGUAGE = "fr";

/** Millions of euros, as the frozen column is (`montant_meur`). */
const UNIT = "M€";

/** The row the takeaway is about: the one line the nomenclature allows to be negative. */
const WRITE_BACK = "Recettes exceptionnelles";

const SOURCE =
  "Source : budget primitif 2026, poste par poste, tel que repris dans l'article · données de démonstration";

// RFC 4180 row tokeniser, inlined — a bare `.split(",")` tears a quoted or thousands-grouped field
// in half; `csv-hand-split.test.ts` walks this project for that exact mistake.
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** One row per budget line, sorted largest amount first, so the single negative line lands last and
 *  the reader's eye walks down to it. */
export function rowsFromCsv(csv) {
  const [header, ...lines] = parseCsvRows(csv.trim());
  const nameAt = header.indexOf("poste");
  const amountAt = header.indexOf("montant_meur");
  const shareAt = header.indexOf("part_pct");
  if (nameAt < 0 || amountAt < 0 || shareAt < 0)
    throw new Error(`csv has no poste / montant_meur / part_pct column, got: ${header}`);
  return lines
    .map((cells) => ({
      name: cells[nameAt],
      amount: Number(cells[amountAt]),
      share: Number(cells[shareAt]),
    }))
    .filter((r) => r.name && Number.isFinite(r.amount) && Number.isFinite(r.share))
    .sort((a, b) => b.amount - a.amount);
}

/** The arithmetic the delivered words state, all of it read off the frozen table. */
export function budgetArithmetic(rows) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const positives = rows.filter((r) => r.amount > 0);
  const negatives = rows.filter((r) => r.amount < 0);
  const positiveTotal = positives.reduce((sum, r) => sum + r.amount, 0);
  const negativeTotal = negatives.reduce((sum, r) => sum + r.amount, 0);
  return {
    total: Math.round(total * 10) / 10,
    positives,
    negatives,
    positiveTotal: Math.round(positiveTotal * 10) / 10,
    negativeTotal: Math.round(negativeTotal * 10) / 10,
    /** What the six expenditure lines are worth AS A SHARE of the budget they are lines of. Above
     *  100 exactly because one member is negative — the whole point of the beat. */
    positiveSharePct: Math.round((positiveTotal / total) * 1000) / 10,
    /** The same number read off the frozen `part_pct` column instead of recomputed, so the two
     *  readings can be compared rather than one of them trusted. */
    positiveSharePctAsPublished:
      Math.round(positives.reduce((sum, r) => sum + r.share, 0) * 10) / 10,
  };
}

/** Strips the `export` keyword from each top-level declaration, the same transform the format's own
 *  `inlineable` applies, so this beat's interaction module runs as a plain classic `<script>`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/**
 * CSS appended after the skill's own generic stylesheet. None of it can live there: the format's
 * `.chart-plot` is two columns (a measured y gutter and the fluid plot); a diverging bar prints its
 * value label just outside its bar's growing END, on EITHER side, so a fixed-pixel track is reserved
 * on each side with the row names in a third track outside the left one.
 */
const EXTRA_CSS = `
/* THE THREE FIXED TRACKS ARE CAPPED AS A SHARE OF THE CONTAINER, and this is the one thing in
   this file that is not a style choice. The format's frame is fluid, but a measured gutter is a
   FIXED pixel width: a name column of 170px, a left value track of ~76px and a right one of ~76px
   summed to 322 of a 375px phone, and the 1fr plot column was then whatever was left — measured on
   this beat's first render, FIVE pixels, seven bars drawn as slivers. The format's own driver went
   green on it: "the plot is still a chart, not a strip" reads .chart-plot's box HEIGHT (the whole
   grid, gutters included) against a 100px floor and never looks at the plot column's width at all.
   So the cap is here, in the beat: a min() of the measured pixel width and a percentage, so the
   plot column can never be squeezed below roughly half the frame at any width, and the names wrap
   onto a second line instead of stealing the chart. */
.chart-plot.budget-plot {
  grid-template-columns:
    min(var(--y-gutter), 34%)
    1fr
    min(var(--r-gutter), 22%);
  grid-template-rows: 1fr var(--x-axis-h);
  min-height: var(--min-plot-h);
}
.chart-plot.budget-plot .y-axis { grid-column: 1; grid-row: 1; }
.chart-plot.budget-plot svg.chart { grid-column: 2; grid-row: 1; }
.chart-plot.budget-plot .overlay { grid-column: 2; grid-row: 1; }
.chart-plot.budget-plot .x-axis { grid-column: 2; grid-row: 2; position: relative; }

/* The name wraps rather than overflowing its capped track. Type size never changes — the format's
   own rule — only the number of lines it is allowed to take, and the row band is tall enough for
   two of them (FRAME.rowLeadPx + rowAirPx). */
.chart-plot .y-axis .cat-label {
  position: absolute;
  right: 8px;
  left: 0;
  transform: translateY(-50%);
  font-size: var(--category-size);
  font-weight: var(--category-weight);
  line-height: 1.15;
  text-align: right;
  text-wrap: balance;
}
.chart-plot .y-axis .cat-label.subject { font-weight: 700; }

.chart-plot .overlay .value-label {
  position: absolute;
  font-size: var(--value-size);
  font-weight: var(--value-weight);
  background: var(--ground);
  padding: 0 3px;
  border-radius: 2px;
  white-space: nowrap;
}
.chart-plot .overlay .value-label.positive { transform: translateY(-50%) translateX(6px); }
/* Anchored to the zero line and set INSIDE the plot, on the write-back's own tinted row — see
   BudgetPartsWeb.tsx's header, item 2, for the collision at 375px that moved it here. */
.chart-plot .overlay .value-label.from-zero { transform: translateY(-50%) translateX(8px); }
.chart-plot .overlay .on-band { background: var(--subject-band); }

.chart-plot .x-axis .zero {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  font-size: var(--axis-size);
  font-weight: var(--axis-weight);
  color: var(--ink);
  white-space: nowrap;
}

.row-hit { cursor: pointer; }
svg.chart rect.row-hit:hover, svg.chart rect.row-hit.row-active {
  fill: var(--muted);
  fill-opacity: 0.12;
}
.row-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
`;

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  const interactionSource = await readFile(join(HERE, "budget-interaction.mjs"), "utf8");
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `<script>\n${inlineable(interactionSource)}\n</script>\n</body>`);

  if (!html.includes("</style>")) throw new Error("renderWeb output has no </style> to repair");
  html = html.replace("</style>", `${EXTRA_CSS}</style>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = rowsFromCsv(csv);
  if (data.length < 2) throw new Error(`need at least two budget lines, got ${data.length}`);

  const sums = budgetArithmetic(data);

  // THE CLAIM, ASSERTED BEFORE IT IS PRINTED. The headline says the parts do not make a whole and
  // names ONE negative line as the reason; both halves are checked against the frozen table rather
  // than trusted from the article.
  if (sums.negatives.length !== 1)
    throw new Error(
      `the words name ONE negative line; the frozen table carries ${sums.negatives.length} ` +
        `(${sums.negatives.map((r) => r.name).join(", ")})`,
    );
  if (sums.negatives[0].name !== WRITE_BACK)
    throw new Error(
      `the negative line is "${sums.negatives[0].name}", not "${WRITE_BACK}" — the caveat names the wrong row`,
    );
  if (!(sums.positiveSharePct > 100))
    throw new Error(
      `the headline says the expenditure lines exceed the budget; they are ${sums.positiveSharePct}% of it`,
    );
  // The recomputed share and the published one are two readings of the same fact. They are allowed
  // to differ by rounding and by nothing else.
  const drift = Math.abs(sums.positiveSharePct - sums.positiveSharePctAsPublished);
  if (drift > 0.15)
    throw new Error(
      `the recomputed share (${sums.positiveSharePct}%) and the published part_pct sum ` +
        `(${sums.positiveSharePctAsPublished}%) disagree by ${drift.toFixed(2)} points — more than rounding`,
    );

  // REPORTED, never a refusal (`chart-web/scripts/storyboard-gate.mjs`): is there an editorial gate
  // above this beat at all, and is it closed?
  const gate = storyboardGateStatus(HERE);
  console.log(
    `storyboard gate: found=${gate.found} closed=${gate.closed}` +
      (gate.reason ? ` — ${gate.reason}` : ` — ${gate.path}`),
  );

  // FINDING, printed before anything is drawn (chart-beat/references/static-discipline.md,
  // "framing-serves-the-point"). NOTE the measure's own limit on a SIGNED series: its
  // `spreadAgainstExtent` is (max − min) / max, which exceeds 1 whenever the minimum is negative,
  // and `largestAgainstMedian` divides by a median that a signed series can put at or below zero.
  // Both are printed as read, with the raw extremes beside them, rather than dressed up.
  const framing = framingMeasurement(data.map((r) => r.amount));
  console.log(
    `framing: amounts run ${framing.min} to ${framing.max} ${UNIT}, median ${framing.median}; ` +
      `spread against extent ${(framing.spreadAgainstExtent * 100).toFixed(1)}% (over 100% because ` +
      `the minimum is negative — this ratio was defined for a non-negative series), largest against ` +
      `median ${framing.largestAgainstMedian.toFixed(2)}x. The plot's own domain is ` +
      `[${Math.min(0, framing.min)}, ${Math.max(0, framing.max)}], zero inside it — see BRIEF.md, "The decision"`,
  );

  console.log(
    `arithmetic: ${sums.positives.length} expenditure lines sum to ${sums.positiveTotal} ${UNIT} ` +
      `(${sums.positiveSharePct}% of the ${sums.total} ${UNIT} budget; the frozen part_pct column's own ` +
      `positive sum is ${sums.positiveSharePctAsPublished}%), and the single write-back of ` +
      `${sums.negativeTotal} ${UNIT} brings the total back to ${sums.total} ${UNIT}`,
  );

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  // ONE OBJECT, not a run of consts: `claims-grounded-in-data.test.ts` reads a reader-facing string
  // either as `prop:` inside an object or as a `const` whose own name is a reader-facing prop, and
  // its expression reader does not terminate on `;`, so consecutive claim consts are swallowed by
  // their predecessor and never scanned. Inside an object every entry ends at its own comma.
  const words = {
    title: "Le budget 2026 ne se partage pas",
    subtitle:
      `Les ${sums.positives.length} postes de dépense pèsent ${fr(sums.positiveTotal)} ${UNIT} à eux seuls, ` +
      `soit ${fr(sums.positiveSharePct)} % d'un budget primitif de ${fr(sums.total)} ${UNIT}. ` +
      `« ${WRITE_BACK} » est une reprise sur provision de ${fr(sums.negativeTotal)} ${UNIT}, inscrite en ` +
      `dépense négative : c'est elle qui comble l'écart, et c'est pour cela que ces sept lignes ne sont ` +
      `pas les parts d'un camembert. Survolez, touchez ou tabulez une ligne pour sa part en pourcentage.`,
    alt:
      `Barres divergentes des sept lignes du budget primitif 2026, triées du montant le plus élevé au ` +
      `plus faible, sur une ligne de zéro commune. Six barres partent vers la droite : ` +
      data
        .filter((r) => r.amount > 0)
        .map((r) => `${r.name} ${fr(r.amount)} ${UNIT}`)
        .join(", ") +
      `. Une seule part vers la gauche, dessinée dans la couleur d'accent sur une ligne teintée : ` +
      `${WRITE_BACK}, ${fr(sums.negativeTotal)} ${UNIT}. Les six dépenses font ensemble ` +
      `${fr(sums.positiveTotal)} ${UNIT}, soit ${fr(sums.positiveSharePct)} % du budget ; la reprise sur ` +
      `provision ramène le total à ${fr(sums.total)} ${UNIT}. Chaque ligne est atteignable au clavier et ` +
      `annonce son montant et sa part.`,
  };

  const { outPath } = await renderWeb({
    component: BudgetPartsWeb,
    props: {
      data,
      frame: FRAME,
      title: words.title,
      subtitle: words.subtitle,
      alt: words.alt,
      source: SOURCE,
      ground,
      accent,
      language: LANGUAGE,
      unit: UNIT,
      zeroLabel: `0 ${UNIT}`,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, rows: data, sums, framing, palette: { ground, accent, origin, source: paletteSource }, words };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const outDir = resolve(positional ?? DEFAULT_OUT_DIR);
  const dataPath = resolve(DEFAULT_DATA_PATH);

  const result = await render({ dataPath, outDir });
  console.table(
    result.rows.map((r, i) => ({
      row: i + 1,
      poste: r.name,
      "M€": r.amount,
      "%": r.share,
    })),
  );
  console.log(`title:    ${result.words.title}`);
  console.log(`subtitle: ${result.words.subtitle}`);
  console.log(`alt:      ${result.words.alt}`);
  console.log(`web beat → ${result.outPath}  [${result.rows.length} rows]`);
}
