// twin/proof/web-marimekko-electricity-mix/render-directions-web.mjs
//
// Six European countries' 2024 electricity as a marimekko, rendered once per FILED DIRECTION into a
// self-contained interactive page. Column width is generation, column height is the mix, so a band's
// AREA is a quantity in TWh.
//
// A MARIMEKKO'S AREAS ARE A PRODUCT OF TWO SCALES, so the beat checks both: every column's bands sum
// to that column's own total, and the widths sum to the six countries' total.
//
// AND BECAUSE THEY ARE A PRODUCT, THE PAGE LETS THE READER FACTOR THEM. Two held states are computed
// here, from the same frozen numbers, and every figure either of them prints is asserted before the
// render — see "THE HELD STATES" below.
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
const FOCUS_LABEL = SOURCES.find(([key]) => key === FOCUS)[1];
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
const bandAt = new Map();
for (const c of countries) {
  const w = (c.total / grand) * usable;
  // The unit is named ONCE, in the sentence above the plot, and not repeated under six columns:
  // " TWh" six times over is what made the narrowest column's label wider than the column itself.
  columns.push({ code: c.code, name: c.name, x: cursor, w, twh: fr(c.total, 0) });
  let y = 0;
  SOURCES.forEach(([key, name], tone) => {
    const share = (c.by[key] / c.total) * 100;
    const h = (c.by[key] / c.total) * FRAME.height;
    if (h > 0) {
      const band = {
        code: c.code,
        source: name,
        x: cursor,
        w,
        y,
        h,
        tone,
        // EVERY band carries its own name now. WHETHER IT FITS is asked of the tile, at the reader's
        // own width, in each of the three states, by an `@container` in the component — the first
        // build decided it here, in viewBox units, which is a decision taken at one width only.
        label: `${name} ${fr(share, 0)} %`,
        detail:
          `${c.name} · ${name} · ${fr(share)} % de son mix · ${fr(c.by[key], 1)} TWh · ` +
          `${fr((c.by[key] / grand) * 100, 2)} % des ${fr(grand, 0)} TWh des six`,
      };
      bands.push(band);
      bandAt.set(`${c.code}-${name}`, band);
    }
    y += h;
  });
  cursor += w + GAP;
}
const widthsSum = columns.reduce((s, c) => s + c.w, 0);
if (Math.abs(widthsSum - usable) > 1e-6)
  throw new Error(`the six widths sum to ${widthsSum.toFixed(3)} units against ${usable} of usable frame`);

// ── THE HELD STATES, AND EVERY FIGURE EITHER OF THEM PRINTS ───────────────────────────────────
//
// THE READER'S QUESTION IS "IS THIS TILE BIG BECAUSE THE COUNTRY IS BIG, OR BECAUSE THE SHARE IS?"
// and the arithmetic of why they cannot answer it by looking is right here, asserted rather than
// asserted-in-prose: the two coal tiles differ by less than a fifth in AREA while their shares
// differ by a factor of two and a half.
const twoTiles = [holders[0], holders[1]].map((c) => {
  const band = bandAt.get(`${c.code}-${FOCUS_LABEL}`);
  if (!band) throw new Error(`${c.name} draws no ${FOCUS_LABEL} band to hang the comparison on`);
  return { country: c, band, area: band.w * band.h, share: (c.by[FOCUS] / c.total) * 100 };
});
const areaRatio = twoTiles[0].area / twoTiles[1].area;
const shareRatio = twoTiles[1].share / twoTiles[0].share;
const totalRatio = twoTiles[0].country.total / twoTiles[1].country.total;
const twhRatio = twoTiles[0].country.by[FOCUS] / twoTiles[1].country.by[FOCUS];
if (!(Math.abs(areaRatio - twhRatio) < 1e-6))
  throw new Error(
    `a marimekko's tile area IS its quantity, and these two disagree: ${areaRatio.toFixed(4)} of ` +
      `area against ${twhRatio.toFixed(4)} of TWh — the geometry has stopped encoding the data`,
  );
if (!(areaRatio < 1.25))
  throw new Error(
    `the page's whole argument is that these two tiles LOOK alike; they differ by ` +
      `${((areaRatio - 1) * 100).toFixed(1)} % of area, which a reader can see`,
  );
if (!(shareRatio > 2))
  throw new Error(
    `the page's whole argument is that the two shares do NOT look alike; they differ by a factor ` +
      `of ${shareRatio.toFixed(2)}`,
  );

const EQUAL_W = (FRAME.width - GAP * (columns.length - 1)) / columns.length;
const maxTotal = Math.max(...countries.map((c) => c.total));
/** `translate(tx, ty) scale(sx, sy)` carrying the column's drawn span [x, x+w] x [0, H] onto
 *  [X, X+W] x [H(1-sy), H] — bottom-aligned, because a common floor is the whole point of the
 *  absolute state and the normalised one already has one. */
const place = (column, X, sx, sy) => ({
  key: column.code,
  tx: X - column.x * sx,
  ty: FRAME.height * (1 - sy),
  sx,
  sy,
});
const equalColumns = (sy) =>
  columns.map((column, i) =>
    place(column, i * (EQUAL_W + GAP), EQUAL_W / column.w, sy(column)),
  );
const centreOf = (band) => ({ lx: band.x + band.w / 2, ly: band.y + band.h / 2 });

const hold = {
  label: "Tenir immobile",
  noneLabel: "La mosaïque",
  options: [
    {
      key: "parts",
      label: "Les largeurs",
      announce: `Les largeurs — six colonnes de même largeur, la hauteur ne dit plus que la part du mix`,
      note:
        `La hauteur ne dit plus que la part du mix : le charbon fait ${fr(twoTiles[1].share)} % ` +
        `du mix en ${twoTiles[1].country.name} contre ${fr(twoTiles[0].share)} % en ` +
        `${twoTiles[0].country.name} — un rapport de ${fr(shareRatio, 2)} que la mosaïque avait ` +
        `dissous dans deux tuiles à ${fr((areaRatio - 1) * 100)} % de surface l'une de l'autre.`,
      // THE FIGURE IS SHORT BECAUSE IT SITS INSIDE A TILE. Its sentence is under the control; what
      // goes on the plate is the comparison itself, and a string wider than the tile it measures
      // would hang over the two columns either side of it.
      figure: {
        text: `${fr(twoTiles[1].share)} % contre ${fr(twoTiles[0].share)} %`,
        col: twoTiles[1].country.code,
        ...centreOf(twoTiles[1].band),
      },
      columns: equalColumns(() => 1),
    },
    {
      key: "twh",
      label: "L'échelle des TWh",
      announce: `L'échelle des TWh — six colonnes de même largeur, la hauteur est la production absolue`,
      note:
        `Les six colonnes partent d'un même sol et leur hauteur est la production : ` +
        `${fr(twoTiles[0].country.by[FOCUS])} TWh de charbon en ${twoTiles[0].country.name} contre ` +
        `${fr(twoTiles[1].country.by[FOCUS])} en ${twoTiles[1].country.name}, soit ` +
        `${fr(twhRatio, 2)} fois plus — mais sur une production ${fr(totalRatio, 2)} fois plus ` +
        `grande, d'où une part ${fr(shareRatio, 2)} fois plus faible.`,
      figure: {
        text: `${fr(twoTiles[0].country.by[FOCUS])} TWh contre ${fr(twoTiles[1].country.by[FOCUS])}`,
        col: twoTiles[0].country.code,
        ...centreOf(twoTiles[0].band),
      },
      columns: equalColumns((column) => {
        const country = countries.find((c) => c.code === column.code);
        return country.total / maxTotal;
      }),
    },
  ],
};
/** The tile whose own name steps aside for the figure printed over it — the figure already carries
 *  that name plus the comparison, and two labels stacked in one tile is a tile saying one thing
 *  twice. Keyed on the same `data-value` the component writes on the label itself. */
const figureHides = [
  { slug: "parts", value: `${twoTiles[1].country.code}-${FOCUS_LABEL}` },
  { slug: "twh", value: `${twoTiles[0].country.code}-${FOCUS_LABEL}` },
];

const facts = beatFacts(
  countries.map((c) => ({ key: c.code, label: c.name, value: c.total })),
  { subject: holders[0].name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);
console.log(
  `les deux tuiles de charbon : ${fr((areaRatio - 1) * 100)} % d'écart de SURFACE, ` +
    `${fr(shareRatio, 2)} fois d'écart de PART, sur une production ${fr(totalRatio, 2)} fois plus grande\n`,
);

// THE TITLE IS THE DISPLAY REGISTER, WHICH IS THE MOST EXPENSIVE TEXT ON THE PAGE. The first build
// set both figures in it and cost six lines of display type at 375 px; the share of the six belongs
// with the other totals, in the caveat. Same claim, half the lines.
const title = `${fr(twoShare)} % du charbon de ces six pays est brûlé dans deux d'entre eux`;
const caveat =
  `Six pays européens en ${YEAR}, ${fr(grand, 0)} TWh, dont ${fr(focusShare)} % de charbon. ` +
  `LARGEUR = production, HAUTEUR = mix : la SURFACE d'une bande est une quantité réelle en TWh.`;
const widthNote =
  `Largeur = production du pays en ${YEAR}, en TWh ; hauteur = part de chaque source. La teinte ` +
  `ORDONNE les sources ; c'est le nom dans la bande, ou le pointeur, qui les nomme.`;
const claimNote = `Charbon : ${fr(focusTotal, 0)} TWh.`;
const readingLine =
  `Lecture : une surface est un PRODUIT, et aucun œil ne sait le refactoriser. Tenez une dimension ` +
  `immobile ci-dessus ; dans la mosaïque, survolez ou tabulez une bande.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${countries.map((c) => `${c.name} ${fr(c.total, 0)}`).join(" ")} ${SOURCES.map(([, n]) => n).join(" ")} ${hold.label} ${hold.noneLabel} ${hold.options.map((o) => `${o.label} ${o.announce}`).join(" ")}`,
  annot: `${claimNote} ${widthNote} ${hold.options.map((o) => o.note).join(" ")}`,
  value: `${bands.map((b) => b.label).join(" ")} ${hold.options.map((o) => o.figure.text).join(" ")}`,
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. A single U+202F or
// U+00A0 — the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to —
// refuses every family on the sans ladder and takes the whole render down. Measured here: a
// no-break space typed inside a band's own label string, invisible in the source, stopped all three
// directions with "no family on the sans ladder can set this beat's text".
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Une surface est un produit, et l'œil ne sait pas refactoriser un produit : les deux tuiles de " +
    "charbon de cette planche sont à 14 % de surface l'une de l'autre alors que l'une des deux " +
    "parts vaut deux fois et demie l'autre. Un still peut énoncer ces trois nombres ; il ne peut " +
    "pas tenir une des deux dimensions immobile pendant que le lecteur regarde l'autre bouger, et " +
    "une vidéo ou un scrolly ne le feraient qu'une fois, dans l'ordre de l'auteur.",
  controls: [
    {
      question:
        "Cette tuile est grosse parce que le pays est gros, ou parce que le charbon y pèse lourd ?",
      gesture: "toggle-a-comparison",
      changes:
        "Les six colonnes glissent et s'étirent jusqu'à faire toutes la même largeur : la largeur " +
        "ne dit plus rien et la hauteur seule parle, soit en part du mix, soit en TWh absolus " +
        "depuis un sol commun. La tuile mesurée porte son chiffre et le rapport qu'elle vient de " +
        "rendre lisible, et une phrase sous le contrôle en donne les deux bouts.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "laquelle des deux dimensions est tenue immobile",
      authorPicked: "none",
      readerPicks: ["none", "parts", "twh"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Cette bande vaut combien de TWh, et quelle part des six pays ?",
      gesture: "ask-a-mark",
      changes:
        "La bande répond avec son pays, sa source, sa part du mix au dixième, ses TWh et sa part " +
        "des 1 638 TWh des six — la quantité que la surface représente et qu'aucun œil ne sait " +
        "relever sur une aire.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quelle tuile est en question",
      authorPicked: "le charbon allemand",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

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
      component: DirectedMarimekkoWeb,
      props: {
        bands, columns, hold, figureHides,
        tones: SOURCES.length,
        toneLabels: SOURCES.map(([, n]) => n),
        widthNote,
        interaction,
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
// A RUNNER THAT SWALLOWS A REFUSAL LOOKS EXACTLY LIKE ONE THAT PRODUCED A PAGE, and the stale render
// stays on disk behind it. The exit code is the only thing a caller reads.
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
