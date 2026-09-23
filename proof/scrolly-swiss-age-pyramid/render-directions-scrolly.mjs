// Switzerland's resident population by age band and sex, 2023, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `population pyramid` type in the scrolly format.
//
// THE SUBJECT OF `static-swiss-age-pyramid`, CHOREOGRAPHED. The bands, the shared mirrored scale, the claim and its
// assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the men, band by band, from 0-4 up;
//   2. the women mirrored: the pyramid;
//   3. every band turned into its difference, women minus men;
//   4. the tipping point, 60-64, marked;
//   5. the oldest bands as a ratio of women to men;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-swiss-age-pyramid/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedPyramidScrolly } from "./DirectedPyramidScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Démographie · Suisse";
const NB = "\u00A0";
const YEAR = 2023;
const OLDEST = 3;

// ── the bands, and the static beat's own assertions ────────────────────────────────────────────
const lines = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
if (lines[0] !== "age_band,male,female,year") throw new Error(`unexpected header: ${lines[0]}`);
const rows = lines.slice(1).map((l) => {
  const [band, male, female, year] = l.split(",");
  if (Number(year) !== YEAR) throw new Error(`${band} is not ${YEAR}`);
  return { band, male: Number(male), female: Number(female) };
});
const expected = [...Array.from({ length: 20 }, (_, i) => `${i * 5}-${i * 5 + 4}`), "100+"];
if (rows.map((r) => r.band).join() !== expected.join()) throw new Error(`the bands are not the 21 five-year bands in natural order: ${rows.map((r) => r.band).join(", ")}`);
/** THE TIPPING POINT, derived: the first band from which women outnumber men in every older band, with men at least as
 *  many in every younger one. A plate that says "from 60-64" says both halves. */
const crossingIndex = rows.findIndex((_, i) => rows.slice(i).every((r) => r.female > r.male) && rows.slice(0, i).every((r) => r.male >= r.female));
if (crossingIndex < 0) throw new Error("women never outnumber men from one band upward in this file");
const crossing = rows[crossingIndex];
if (crossing.band !== "60-64") throw new Error(`the headline says women pass men from 60-64; the tipping band is ${crossing.band}`);
const oldest = rows.slice(-OLDEST);
const ratios = oldest.map((r) => r.female / r.male);
if (!ratios.every((v, i) => i === 0 || v > ratios[i - 1])) throw new Error(`card 5 says the ratio climbs with age; ${ratios.map((v) => v.toFixed(2)).join(", ")}`);
if (!(ratios[ratios.length - 1] > 4)) throw new Error(`card 5 says four women for one man at ${oldest[oldest.length - 1].band}; ${ratios[ratios.length - 1].toFixed(2)}`);
const totalMen = rows.reduce((s, r) => s + r.male, 0);
const totalWomen = rows.reduce((s, r) => s + r.female, 0);
const biggestGap = rows.reduce((a, b) => (b.female - b.male > a.female - a.male ? b : a));
console.log(`${rows.length} bandes · bascule ${crossing.band} (+${crossing.female - crossing.male}) · ${oldest.map((r, i) => `${r.band} ×${ratios[i].toFixed(2)}`).join(" · ")} · plus grand écart ${biggestGap.band}\n`);

/** Thousands grouped with a no-break space, so a number never wraps across two lines of a card. */
const whole = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR")).replace(/ /g, NB);
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const bands = rows.map((r) => {
  const i = oldest.indexOf(r);
  return { ...r, ratioText: i >= 0 ? `× ${one(ratios[i])}` : "", diffText: r === crossing ? `+${whole(r.female - r.male)}` : "" };
});
const ticks = [100000, 200000, 300000].map((v) => ({ value: v, text: whole(v) }));
const diffTicks = [10000, 20000, 30000].map((v) => ({ value: v, text: whole(v) }));

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [`Les femmes passent devant les hommes à partir de ${crossing.band} ans`, `Plus de femmes que d’hommes dès ${crossing.band} ans`, `La pyramide des âges suisse`];
const prose = [
  [`La population résidente suisse en ${YEAR}, par bandes d’âge de cinq ans, la plus jeune en bas. D’abord les hommes : ${whole(totalMen)}.`],
  [`Puis les femmes, en miroir : ${whole(totalWomen)}.`],
  [`Gardons seulement l’écart dans chaque bande. À gauche, les bandes où les hommes sont plus nombreux ; à droite, celles où ce sont les femmes.`],
  [`Le basculement se fait à ${crossing.band} ans : ${whole(crossing.female)} femmes pour ${whole(crossing.male)} hommes. Au-dessus, les femmes sont plus nombreuses dans chaque bande.`],
  [`Chez les plus âgés, l’écart devient un multiple : ${oldest.map((r, i) => `${one(ratios[i])} femmes pour un homme à ${r.band} ans`).join(", ")}.`],
  [`Lecture : chaque barre est une bande de cinq ans, hommes à gauche, femmes à droite, sur la même échelle.`],
];
const source = "Source : ONU, World Population Prospects (2024), via Our World in Data";
const words = {
  men: "Hommes",
  women: "Femmes",
  menSurplus: "plus d’hommes",
  womenSurplus: "plus de femmes",
  totalNote: `population résidente, ${YEAR}`,
  menNote: `${whole(totalMen)} hommes`,
  womenNote: `${whole(totalWomen)} femmes`,
  diffNote: "femmes moins hommes, par bande",
  crossNote: `femmes devant dès ${crossing.band} ans`,
  oldNote: `${oldest[oldest.length - 1].band}${NB}: ${one(ratios[ratios.length - 1])} femmes pour un homme`,
  crossLabel: `femmes devant dès ${crossing.band} ans`,
};
const alt =
  `Pyramide des âges de la Suisse en ${YEAR}, hommes à gauche, femmes à droite, par bandes de cinq ans. ` +
  `Les hommes sont plus nombreux jusqu’à ${rows[crossingIndex - 1].band} ans, les femmes à partir de ${crossing.band} ; à ${oldest[oldest.length - 1].band} ans, ${one(ratios[ratios.length - 1])} femmes pour un homme.`;

const N = rows.length;
/** One state per card; see `pyramid-drive.mjs` for what each field paints. */
const STATES = [
  { men: N, women: 0, diff: 0, cross: 0, old: 0, note: 0 },
  { men: N, women: N, diff: 0, cross: 0, old: 0, note: 1 },
  { men: N, women: N, diff: 1, cross: 0, old: 0, note: 2 },
  { men: N, women: N, diff: 1, cross: 1, old: 0, note: 3 },
  { men: N, women: N, diff: 0, cross: 0, old: 1, note: 4 },
  { men: N, women: N, diff: 0, cross: 0, old: 0, note: -1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.menSurplus} ${words.womenSurplus} ${words.totalNote} ${[...ticks, ...diffTicks].map((t) => t.text).join(" ")}`,
  annot: `${words.men} ${words.women} ${rows.map((r) => r.band).join(" ")} ${words.crossLabel}`,
  value: `${bands.map((b) => `${b.ratioText} ${b.diffText}`).join(" ")} ${words.menNote} ${words.womenNote} ${words.diffNote} ${words.crossNote} ${words.oldNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "pyramid-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["hommes", "femmes", "ecart", "bascule", "plus-ages", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedPyramidScrolly, { bands, crossing: crossing.band, oldest: oldest.map((r) => r.band), ticks, diffTicks, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
        states: STATES,
        driver,
        apply: "applyPyramidState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
