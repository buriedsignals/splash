// twin/proof/web-connected-scatter-lowcarbon/render-directions-web.mjs
//
// Sixteen European countries between 2000 and 2024, as a connected scatter whose mark is a
// DISPLACEMENT. Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// EVERYTHING THE HEADLINE SAYS IS DERIVED HERE AND ASSERTED HERE: that all sixteen raised the
// low-carbon share of their own electricity, that the ones which lost European weight are a
// minority, that the subject moved right and down, and that not one of the sixteen produced LESS
// low-carbon electricity than it did in 2000 — which is the fact the fourth option of the control
// rests on and the only reason the counterfactual is honest.
//
// AND THE CONTROL IS COMPUTED TOO. Which readings are offered is not a list somebody wrote: each
// option's heads are the same two dates recombined, `aim.ts` derives every angle and every length
// from the two points, and an option that aimed a country off the plate is refused at the
// declaration — which is what set the vertical ceiling at 45 rather than at the 38,4 the default
// plate would have been happy with.
//
// Usage:  bun proof/web-connected-scatter-lowcarbon/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, mix, readPalette, adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, fitY } from "#shared/design-base/web.mjs";
import { assertOneAim } from "../../skills/chart-web/assets/aim.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedConnectedScatterWeb, FRAME } from "./DirectedConnectedScatterWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SUBJECT = "FRA";
/** The six low-carbon columns of the frozen file, and the three fossil ones it also carries. */
const LOW = [
  "other_renewables_generation__twh",
  "bioenergy_stacked_generation__twh",
  "solar_generation__twh",
  "wind_generation__twh",
  "hydro_generation__twh",
  "nuclear_generation__twh",
];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
/** The beat's own words for the sixteen, so nothing a reader sees is an English column name. */
const NAMES = {
  AUT: "Autriche", BEL: "Belgique", CZE: "Tchéquie", DNK: "Danemark", FIN: "Finlande",
  FRA: "France", DEU: "Allemagne", GRC: "Grèce", IRL: "Irlande", ITA: "Italie",
  NLD: "Pays-Bas", POL: "Pologne", PRT: "Portugal", ESP: "Espagne", SWE: "Suède",
  GBR: "Royaume-Uni",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (v, d = 1) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), d)}`;
const round = (n) => Number(n.toFixed(2));

// ── THE FROZEN FILE ───────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("code")], year: Number(c[at("year")]) };
  for (const k of [...LOW, ...FOSSIL]) o[k] = Number(c[at(k)]);
  const low = LOW.reduce((s, k) => s + o[k], 0);
  return { ...o, low, all: low + FOSSIL.reduce((s, k) => s + o[k], 0) };
});
const YEARS = [2000, 2024];
const totals = Object.fromEntries(
  YEARS.map((y) => [y, rows.filter((r) => r.year === y).reduce((s, r) => s + r.low, 0)]),
);
const codes = [...new Set(rows.map((r) => r.code))];
if (codes.length !== 16) throw new Error(`the frozen file carries ${codes.length} countries, not sixteen`);

const study = codes.map((code) => {
  const a = rows.find((r) => r.code === code && r.year === 2000);
  const b = rows.find((r) => r.code === code && r.year === 2024);
  if (!a || !b) throw new Error(`${code} is missing one of its two dates`);
  if (!NAMES[code]) throw new Error(`${code} has no French name in this beat's own list`);
  return {
    code,
    name: NAMES[code],
    own0: (a.low / a.all) * 100,
    own1: (b.low / b.all) * 100,
    w0: (a.low / totals[2000]) * 100,
    w1: (b.low / totals[2024]) * 100,
    // THE COUNTERFACTUAL: 2024's own low-carbon generation weighed against the 2000 total. It is a
    // DERIVED reading of the frozen file and not an invented datum — the numerator is measured, the
    // denominator is the other measured year's, and what it answers is "how much of this would have
    // been yours if the continent had stood still".
    wcf: (b.low / totals[2000]) * 100,
    low0: a.low,
    low1: b.low,
    growth: (b.low / a.low - 1) * 100,
  };
});

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const dirtier = study.filter((s) => s.own1 < s.own0);
if (dirtier.length) throw new Error(`${dirtier.map((s) => s.code).join(", ")} got dirtier at home — the headline says all sixteen cleaned up`);
const shrank = study.filter((s) => s.low1 < s.low0);
if (shrank.length) throw new Error(`${shrank.map((s) => s.code).join(", ")} produced less low-carbon than in 2000 — the counterfactual option would be a different story`);
const lost = study.filter((s) => s.w1 < s.w0);
if (!(lost.length > 0 && lost.length * 2 < study.length))
  throw new Error(`${lost.length} of ${study.length} lost European weight — the headline says a minority did`);
const subject = study.find((s) => s.code === SUBJECT);
if (!(subject.own1 > subject.own0 && subject.w1 < subject.w0))
  throw new Error("the subject did not move right and down, which is the whole reason this form is here");
const euGrowth = (totals[2024] / totals[2000] - 1) * 100;
const slowestGainer = study.filter((s) => s.w1 >= s.w0).reduce((a, b) => (a.growth < b.growth ? a : b));
const fastestLoser = lost.reduce((a, b) => (a.growth > b.growth ? a : b));
if (!(fastestLoser.growth < euGrowth && slowestGainer.growth > euGrowth))
  throw new Error("the growth threshold the fourth option states does not separate the two groups on this data");
const rose = study.filter((s) => s.wcf > s.w0);
if (rose.length !== study.length)
  throw new Error("a country still falls against the 2000 total — the fourth option's sentence would be false");

console.log(
  `total bas-carbone des seize : ${fr(totals[2000])} -> ${fr(totals[2024])} TWh (${signed(euGrowth)} %)\n` +
    `seize plus propres chez eux, ${lost.length} plus légers en Europe : ${lost.map((s) => s.code).join(", ")}\n` +
    `seuil : le plus rapide des perdants ${fastestLoser.code} ${signed(fastestLoser.growth, 0)} %, ` +
    `le plus lent des gagnants ${slowestGainer.code} ${signed(slowestGainer.growth, 0)} % — ` +
    `de part et d'autre de ${signed(euGrowth)} %\n`,
);
console.table(
  study
    .slice()
    .sort((a, b) => b.w1 - b.w0 - (a.w1 - a.w0))
    .map((s) => ({
      pays: s.name,
      "part chez soi": `${fr(s.own0)} -> ${fr(s.own1)}`,
      "poids europ.": `${fr(s.w0, 2)} -> ${fr(s.w1, 2)}`,
      "si total figé": fr(s.wcf, 2),
      "TWh": `${fr(s.low0)} -> ${fr(s.low1)}`,
    })),
);

// ── THE PLANE ─────────────────────────────────────────────────────────────────────────────────
//
// Both axes are continuous positions and neither needs to include zero — `types/connected-scatter.md`
// is explicit that this is not a length encoding. Both include it anyway, because both are SHARES of
// a whole and a share's zero is a real, meaningful place to be: Poland starts at 1,6 % of its own mix
// and Ireland at 0,09 % of the continent's, and a fitted floor would have made those two look like
// ordinary readings rather than the near-nothings they are.
//
// THE CEILING IS SET BY THE CONTROL AND NOT BY THE DEFAULT PLATE. The highest reading the default
// draws is France's 38,4 % of 2000; the highest any OPTION aims at is its 42,4 % under a frozen
// European total. `assertAimDeclaration` refuses a head outside the frame, so an axis topped at 40
// takes the whole page down rather than drawing that arrow off the plate in silence.
const X_TICKS = [0, 20, 40, 60, 80, 100];
const Y_TICKS = [0, 10, 20, 30, 40];
const Y_TOP = 45;
const highest = Math.max(...study.map((s) => Math.max(s.w0, s.w1, s.wcf)));
if (highest > Y_TOP) throw new Error(`the vertical ceiling ${Y_TOP} is under the highest reading any state draws, ${fr(highest, 2)}`);
const x = (v) => (v / 100) * FRAME.width;
const y = fitY(0, Y_TOP, FRAME.height);
const point = (own, weight) => ({ x: round(x(own)), y: round(y(weight)) });

const arrows = study.map((s) => ({
  key: s.code,
  name: s.name,
  tail: point(s.own0, s.w0),
  head: point(s.own1, s.w1),
  subject: s.code === SUBJECT,
}));

/** The four readings, each one a recombination of the same two dates — never a third number. */
const READINGS = [
  { slug: "chez-eux", head: (s) => point(s.own1, s.w0) },
  { slug: "en-europe", head: (s) => point(s.own0, s.w1) },
  { slug: "total-fige", head: (s) => point(s.own1, s.wcf) },
];

const ownGains = study.map((s) => s.own1 - s.own0).sort((a, b) => a - b);
const medianOwnGain = (ownGains[7] + ownGains[8]) / 2;
const biggestOwn = study.reduce((a, b) => (b.own1 - b.own0 > a.own1 - a.own0 ? b : a));
const smallestOwn = study.reduce((a, b) => (b.own1 - b.own0 < a.own1 - a.own0 ? b : a));
const biggestCf = study.reduce((a, b) => (b.wcf - b.w0 > a.wcf - a.w0 ? b : a));
const smallestCf = study.reduce((a, b) => (b.wcf - b.w0 < a.wcf - a.w0 ? b : a));
const gained = study.filter((s) => s.w1 >= s.w0);

const NOTES = {
  "chez-eux": plain(
    `La jambe horizontale du déplacement, seule : les seize ont tous nettoyé leur propre ` +
      `électricité, de ${signed(smallestOwn.own1 - smallestOwn.own0)} points en ` +
      `${smallestOwn.name} à ${signed(biggestOwn.own1 - biggestOwn.own0)} au ` +
      `${biggestOwn.name}, médiane ${signed(medianOwnGain)}. Aucune flèche ne pointe à gauche.`,
  ),
  "en-europe": plain(
    `La jambe verticale, seule : ${gained.length} montent, ${lost.length} descendent — ` +
      `${lost
        .slice()
        .sort((a, b) => a.w1 - a.w0 - (b.w1 - b.w0))
        .map((s) => `${s.name} ${signed(s.w1 - s.w0, 2)}`)
        .join(", ")} point de part. Les cinq ont pourtant tous produit plus de bas-carbone qu'en 2000.`,
  ),
  "total-fige": plain(
    `Le bas-carbone des seize est passé de ${fr(totals[2000], 0)} à ${fr(totals[2024], 0)} TWh, ` +
      `${signed(euGrowth)} %. Rapportée à ce total de 2000, plus personne ne recule : ` +
      `${biggestCf.name} ${signed(biggestCf.wcf - biggestCf.w0, 2)} points, ` +
      `${smallestCf.name} ${signed(smallestCf.wcf - smallestCf.w0, 2)}, et la ${subject.name} ` +
      `${signed(subject.wcf - subject.w0, 2)} au lieu de ${signed(subject.w1 - subject.w0, 2)}. ` +
      `Le seuil est net : croître de plus de ${signed(euGrowth)} % fait gagner du poids, moins en ` +
      `fait perdre — les cinq sont entre ${signed(lost.reduce((a, b) => (a.growth < b.growth ? a : b)).growth, 0)} % ` +
      `et ${signed(fastestLoser.growth, 0)} %.`,
  ),
};

const PILLS = {
  "chez-eux": { label: "Chez eux", announce: "Chez eux seulement" },
  "en-europe": { label: "En Europe", announce: "En Europe seulement" },
  "total-fige": { label: "Total figé", announce: "Total figé : à total européen de 2000" },
};

const FIGURES = {
  none: plain(`${subject.name} : ${signed(subject.own1 - subject.own0)} chez elle, ${signed(subject.w1 - subject.w0)} en Europe`),
  "chez-eux": plain(`${subject.name} : ${signed(subject.own1 - subject.own0)} points chez elle`),
  "en-europe": plain(`${subject.name} : ${signed(subject.w1 - subject.w0)} points de poids européen`),
  "total-fige": plain(`${subject.name} : ${signed(subject.wcf - subject.w0)} points, à total figé`),
};

const aim = {
  label: "La flèche montre",
  noneLabel: "Le trajet",
  protect: SUBJECT,
  figure: { key: SUBJECT, text: FIGURES.none },
  options: READINGS.map((reading) => ({
    key: reading.slug,
    label: PILLS[reading.slug].label,
    // The accessible name CONTAINS the visible one by construction — it starts with it — which is
    // the WCAG 2.5.3 rule `assertAimDeclaration` refuses on rather than hopes for.
    announce: plain(`${PILLS[reading.slug].announce} — ${NOTES[reading.slug]}`),
    note: NOTES[reading.slug],
    figure: { key: SUBJECT, text: FIGURES[reading.slug] },
    heads: study.map((s) => ({ key: s.code, ...reading.head(s) })),
  })),
};

// ── THE ANSWERING LAYER ───────────────────────────────────────────────────────────────────────
//
// One reading per country, carried on every point that country's own arrow occupies across the four
// states — its tail and each of its four heads, deduplicated. `interaction.mjs` resolves the mark
// under a pointer from coordinates read ONCE at initialisation and a CSS transform never changes
// them, so a beat whose arrows swing cannot have an answering layer that swings with them. The way
// out is not to move the points but to put one wherever the arrow ever is, ALL CARRYING THE SAME
// ANSWER: a near miss then picks a different corner of the same country rather than a different
// country. `assertAimDeclaration` refuses an anchor parked where its arrow never goes, and refuses a
// state no anchor covers.
//
// Only the tail is in the tab order. The others are the same reading in another place, and a
// keyboard reader owed sixteen readings should not be handed seventy-odd.
const detailOf = (s) =>
  plain(
    `${s.name} · 2000 : ${fr(s.own0)} % de son mix, ${fr(s.w0, 2)} % du bas-carbone des seize, ` +
      `${fr(s.low0)} TWh · 2024 : ${fr(s.own1)} %, ${fr(s.w1, 2)} %, ${fr(s.low1)} TWh · ` +
      `production ${signed(s.growth, 0)} % contre ${signed(euGrowth)} % pour les seize · ` +
      `à total européen figé elle pèserait ${fr(s.wcf, 2)} %`,
  );

const anchors = [];
for (const s of study) {
  const arrow = arrows.find((a) => a.key === s.code);
  const places = [arrow.tail, arrow.head, ...READINGS.map((r) => r.head(s))];
  const seen = [];
  for (const place of places) {
    if (seen.some((p) => Math.hypot(p.x - place.x, p.y - place.y) <= 0.34)) continue;
    seen.push(place);
    anchors.push({
      key: s.code,
      x: place.x,
      y: place.y,
      detail: detailOf(s),
      focusable: seen.length === 1,
    });
  }
}
console.log(`ancres : ${anchors.length} pour ${study.length} pays, dont ${anchors.filter((a) => a.focusable).length} dans l'ordre de tabulation\n`);

// ── THE NAMES, AND THE DE-COLLISION IS A MEASUREMENT ──────────────────────────────────────────
//
// The five that lose European weight are the half of the headline a reader has to be able to find,
// so those five are named on the plate and the other eleven are named by the pointer. Each name sits
// at its own TAIL, which no option touches — see the component's header.
//
// Whether two of them collide is decided by measuring the widest of them in the VALUE register of
// the widest of the three filed directions, at the canonical mapping where one viewBox unit is one
// CSS pixel, and by the same register's own leading for the vertical. Belgium and Austria sit 0,46
// of a point apart on the vertical axis — four units — so at any width one of them has to go under
// its own ring rather than over it.
const filedFiles = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"));
const named = lost.slice().sort((a, b) => a.own0 - b.own0);
const valueRegisters = filedFiles.map((f) => {
  const d = resolveDirectionFamilies(readDirection(join(DIRECTIONS, f)), { value: named.map((s) => s.name).join(" ") });
  return { id: f.replace(/\.md$/, ""), reg: registerOf(d, "value", {}) };
});
const widest = Math.max(
  ...valueRegisters.flatMap(({ reg }) =>
    named.map((s) => measureText(s.name, { fontSize: reg.fontSize, fontWeight: reg.fontWeight, fontFamily: reg.fontFamily })),
  ),
);
const tallest = Math.max(...valueRegisters.map(({ reg }) => leadOf(reg)));

// A THRESHOLD IN PIXELS DOES NOT SURVIVE THE DIRECTING, AND IT DOES NOT SURVIVE THE FRAME EITHER.
// A name is a FIXED number of CSS pixels wide at every width — that is this format's own rule — while
// the gap between two tails is a fraction of the plot, so the two are only the same number at the
// canonical mapping, where one viewBox unit is one CSS pixel. Comparing them directly decides the
// collision once, at 820 px, and is simply wrong everywhere else: Belgium and Austria are 109,9 units
// apart, which is 110 px at the canonical width and 38 px on a 375 px phone, against a name 78 px
// wide in every one of them.
//
// So the question is asked at the NARROWEST frame this format verifies at, and the answer is
// width-independent by construction: what separates two names there is a vertical offset, and a
// vertical offset costs nothing at any wider width. `.chart-figure` pads 24 px on each side and this
// beat opens a 44 px gutter, so a 375 px viewport leaves the plot 283 px wide; its height follows
// from the aspect ratio the component pins, less the x-axis row.
const NARROW_VIEWPORT_PX = 375;
const NARROW_PLOT_W = NARROW_VIEWPORT_PX - 24 * 2 - 44;
const NARROW_PLOT_H = ((NARROW_VIEWPORT_PX - 24 * 2) / ((FRAME.width + 44) / (FRAME.height + FRAME.xAxisRowPx))) - FRAME.xAxisRowPx;
/** The two gaps, in the geometry's own units, under which two names overlap at that frame. */
const NEAR_X = (widest * FRAME.width) / NARROW_PLOT_W;
const NEAR_Y = (tallest * FRAME.height) / NARROW_PLOT_H;
console.log(
  `registre value par direction : ${valueRegisters.map((v) => `${v.id} ${v.reg.fontSize}px/${leadOf(v.reg).toFixed(2)}`).join(" · ")}\n` +
    `nom le plus large ${widest.toFixed(1)} px, interligne le plus grand ${tallest.toFixed(2)} px\n` +
    `au cadre le plus étroit (plot ${NARROW_PLOT_W} x ${NARROW_PLOT_H.toFixed(0)} px) deux noms se ` +
    `chevauchent sous ${NEAR_X.toFixed(0)} u horizontalement et ${NEAR_Y.toFixed(0)} u verticalement`,
);
const names = named.map((s) => ({
  key: s.code,
  text: s.name,
  x: round(x(s.own0)),
  y: round(y(s.w0)),
  below: false,
}));
for (let i = 0; i < names.length; i += 1)
  for (let j = i + 1; j < names.length; j += 1) {
    const a = names[i];
    const b = names[j];
    if (Math.abs(a.x - b.x) >= NEAR_X) continue;
    if (Math.abs(a.y - b.y) >= NEAR_Y) continue;
    // The lower of the two on screen goes under its own ring; the other keeps the default place.
    const lower = a.y > b.y ? a : b;
    lower.below = true;
    console.log(`collision ${a.key}/${b.key} (${Math.abs(a.x - b.x).toFixed(1)} u d'écart) : ${lower.key} passe sous son anneau`);
  }
console.log("");

// ── THE WORDS ─────────────────────────────────────────────────────────────────────────────────
// SHORT ON PURPOSE, AND THE NUMBER IS MEASURED. At 375 px the first form of this title — twenty
// words — set the `nocturne` header to 486 px on its own, and with the plot already pressed onto its
// 120 px floor the figure came to 878 px in an 812 px window. The words a beat spends on its own
// title are height it takes out of its plot at the narrowest frame, which is the one place it cannot
// give any back. This is the static sibling's own headline, which says the same thing in seven.
const title = plain("Tous plus propres chez eux, cinq plus légers en Europe");
const caveat = plain(
  `Part bas-carbone du mix national contre part du bas-carbone des seize, 2000 et 2024. L'anneau ` +
    `est 2000, la pointe 2024 : le fichier ne tient que ces deux dates.`,
);
const xTitle = plain("Part bas-carbone de son propre mix (%)");
const yTitle = plain("Part du bas-carbone des seize (%)");
const readingLine = plain(
  `Lecture : survolez ou tabulez un pays pour ses deux dates et ses TWh.`,
);
const source = plain(
  `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data`,
);
const alt = plain(
  `Seize flèches dans un plan. Horizontalement, la part bas-carbone du mix national ; ` +
    `verticalement, la part du bas-carbone des seize pays. Chaque flèche part d'un anneau, la ` +
    `position du pays en 2000, et pointe vers sa position en 2024. Toutes vont vers la droite : ` +
    `les seize ont tous nettoyé leur électricité. Cinq pointent vers le bas — Autriche, Belgique, ` +
    `Allemagne, Suède et France — parce qu'elles pèsent moins dans le total européen qu'en 2000. ` +
    `La flèche de la France, en accent, est la plus longue vers le bas : ${signed(subject.w1 - subject.w0)} points. ` +
    `Un bouton choisit ce que la flèche montre : le déplacement entier, sa jambe horizontale seule, ` +
    `sa jambe verticale seule, ou la position de 2024 rapportée au total européen de 2000 — état ` +
    `dans lequel aucune des seize ne descend.`,
);

const xTicks = X_TICKS.map((t) => ({ text: `${t} %`, at: round(x(t)) }));
const yTicks = Y_TICKS.map((t) => ({ text: `${t} %`, at: round(y(t)) }));

const interaction = {
  earns: plain(
    `Un still ne peut dessiner qu'une des quatre lectures et une vidéo ne peut que les jouer dans ` +
      `l'ordre de l'auteur, une fois : ici le lecteur fait l'aller-retour entre l'hypoténuse et ` +
      `chacune de ses deux jambes autant de fois qu'il veut, sur les mêmes axes, et chaque pays ` +
      `répond avec les TWh qu'aucun des deux axes ne porte.`,
  ),
  controls: [
    {
      question: plain("Il a bougé de combien chez lui, et de combien en Europe ?"),
      gesture: "toggle-a-comparison",
      changes: plain(
        `chaque flèche garde son anneau et fait pivoter sa pointe sur la lecture choisie : seize ` +
          `flèches horizontales, ou seize verticales dont cinq vers le bas, ou seize rapportées au ` +
          `total européen de 2000, dont aucune ne descend.`,
      ),
    },
    {
      question: plain("Ce pays-là, c'est lequel, et il vaut combien en TWh ?"),
      gesture: "ask-a-mark",
      changes: plain(
        `la flèche du pays visé — hampe et pointe ensemble — se détache de sa propre encre d'une ` +
          `dose cherchée, et répond avec ses deux dates sur les deux axes, sa production absolue, ` +
          `sa croissance contre celle des seize et son poids à total figé.`,
      ),
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: plain(
    `${caveat} ${readingLine} ${source} ${aim.label} ${aim.noneLabel} ` +
      `${aim.options.map((o) => `${o.label} ${o.note}`).join(" ")}`,
  ),
  axis: [...xTicks, ...yTicks].map((t) => t.text).join(" "),
  annot: plain(`${xTitle} ${yTitle} ${Object.values(FIGURES).join(" ")}`),
  value: named.map((s) => s.name).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const facts = beatFacts(
  study.map((s) => ({ key: s.code, label: s.name, value: s.w1 })),
  { subject: subject.name, declaredSequence: "%" },
);
console.log(`treatments applicable: ${applicableTreatments(facts).map((t) => t.id).join(", ") || "(none)"}\n`);

const filed = filedFiles.map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of filedFiles) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  // THE COLOURS THE PAGE REALLY PAINTS, MEASURED HERE TOO so the numbers `PALETTE.md` carries come
  // off the same arithmetic the component refuses on rather than off a second one.
  const subjectInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent;
  let contextInk = mix(direction.ground, direction.accent, 0.5);
  if (contrast(contextInk, direction.ground) < NON_TEXT_CONTRAST_MIN)
    contextInk = adjustToContrast(contextInk, direction.ground, NON_TEXT_CONTRAST_MIN) ?? contextInk;
  console.log(
    `${id}: accent du sujet ${subjectInk} ${contrast(subjectInk, direction.ground).toFixed(2)}:1 · ` +
      `teinte de contexte ${contextInk} ${contrast(contextInk, direction.ground).toFixed(2)}:1 · ` +
      `les deux encres l'une contre l'autre ${contrast(subjectInk, contextInk).toFixed(2)}:1`,
  );
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedConnectedScatterWeb,
      props: {
        arrows, anchors, names, aim, xTicks, yTicks, xTitle, yTitle,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // THE RULES, READ BACK OFF THE PAGE THAT WAS JUST WRITTEN. `assertAimDeclaration` runs inside
    // the component and can only see a DECLARATION; this reads the file. Dropping `aimCss` from the
    // beat's stylesheet passed every other guard on this branch — see `assertOneAim`'s own comment.
    assertOneAim(await readFile(join(OUT, `${id}.html`), "utf8"), aim, arrows, { idPrefix: "chart-stack" });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
