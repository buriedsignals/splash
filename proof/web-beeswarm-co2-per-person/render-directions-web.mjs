// twin/proof/web-beeswarm-co2-per-person/render-directions-web.mjs
//
// Every country's CO₂ per person in 2023 as a beeswarm, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// WHAT THIS RUNNER OWNS THAT THE COMPONENT DOES NOT: the three packings. The reader's control
// re-weighs the swarm — a circle's area is its population, or the same for every country, or the
// country's own tonnes of CO₂ — and a weighting is not a transform of a drawing, it is a drawing
// re-derived: the ladder picks how much ink the marks may spend between them, the packer runs again
// from nothing, and every mark's place is a function of every other mark's new size. All three are
// computed HERE, from the frozen file, and refused HERE, so a weighting that lied never reaches a
// browser. `skills/chart-web/assets/weigh.ts` holds the arithmetic and the refusals.
//
// THE READINGS EACH WEIGHTING ADDS ARE DERIVED AND BAKED SERVER-SIDE, one per mark per view, and
// they are different readings rather than the same one three times: the share of humanity below,
// the rank among 213, the share of the world's CO₂ emitted lower down. The browser never formats a
// number.
//
// Usage:  bun proof/web-beeswarm-co2-per-person/render-directions-web.mjs

import { readdirSync, rmSync } from "node:fs";
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
import {
  assertOneWeighing,
  weighLadder,
  weighRankCorrelation,
  flooredWeightShare,
} from "../../skills/chart-web/assets/weigh.ts";
import { DirectedSwarmWeb, FRAME } from "./DirectedSwarmWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const UNIT = "t/personne";
const YEAR = 2023;
const HEAVY = 20;

/** THE COUNTRY NAMES ON THIS PAGE ARE THE SOURCE'S OWN, and the page says so. 213 countries is far
 *  past the point where a hand-filed French name per country is safe: a wrong translation in a
 *  tooltip is a factual error nobody would catch. Only the two derived callouts — the largest circle
 *  and the farthest one out — are named in French, because they are also named in the headline's own
 *  prose and in the alt text, where the source's label would read as an error. */
const FR = { IND: "l'Inde", QAT: "le Qatar", CHN: "la Chine", USA: "les États-Unis" };
const frName = (code, fallback) => FR[code] ?? fallback;

const plain = (s) => plainSpaces(s);
/** A French article-carrying name is filed lower-case (`l'Inde`, `la Chine`) because it is written
 *  mid-sentence nine times out of ten; the tenth is a sentence opening, and it was printed there
 *  lower-case on the first render of the carbon sentence. */
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const int = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const people = (v) =>
  v >= 1e9 ? `${fr(v / 1e9)} milliard${v >= 2e9 ? "s" : ""} d'habitants`
  : v >= 1e6 ? `${fr(v / 1e6)} million${v >= 2e6 ? "s" : ""} d'habitants`
  : `${int(v)} habitants`;

// ── the countries ─────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return {
    name: c[at("entity")],
    code: c[at("code")],
    value: Number(c[at("co2_t_per_person")]),
    pop: Number(c[at("population")]),
  };
});
for (const c of all)
  if (!c.code || !Number.isFinite(c.value) || !(c.pop > 0))
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const worldPeople = all.reduce((s, c) => s + c.pop, 0);
const worldCo2 = all.reduce((s, c) => s + c.value * c.pop, 0);
const worldAverage = worldCo2 / worldPeople;
const sorted = [...all].sort((a, b) => a.value - b.value);
const median = sorted[Math.floor(sorted.length / 2)].value;

// The three cumulative readings, walked once up the sorted axis: what share of humanity, of the
// countries and of the world's CO₂ sits strictly BELOW each country's own figure. These are what the
// marks answer with, one per weighting, and they are the whole reason a weighting is a question and
// not a re-skin.
const belowPeople = new Map();
const belowCountries = new Map();
const belowCarbon = new Map();
let accPeople = 0;
let accCountries = 0;
let accCarbon = 0;
for (const c of sorted) {
  belowPeople.set(c.code, (accPeople / worldPeople) * 100);
  belowCountries.set(c.code, (accCountries / all.length) * 100);
  belowCarbon.set(c.code, (accCarbon / worldCo2) * 100);
  accPeople += c.pop;
  accCountries += 1;
  accCarbon += c.value * c.pop;
}
const rankOf = new Map(sorted.map((c, i) => [c.code, i + 1]));

const heavy = all.filter((c) => c.value >= HEAVY);
const heavyShare = (heavy.reduce((s, c) => s + c.pop, 0) / worldPeople) * 100;
const underAverage =
  (sorted.filter((c) => c.value < worldAverage).reduce((s, c) => s + c.pop, 0) / worldPeople) * 100;
const carbonUnderAverage =
  (sorted.filter((c) => c.value < worldAverage).reduce((s, c) => s + c.value * c.pop, 0) / worldCo2) * 100;
const countriesUnderAverage = (sorted.filter((c) => c.value < worldAverage).length / all.length) * 100;
const biggest = all.reduce((a, b) => (b.pop > a.pop ? b : a));
const farthest = all.reduce((a, b) => (b.value > a.value ? b : a));
const heaviestEmitter = all.reduce((a, b) => (b.pop * b.value > a.pop * a.value ? b : a));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(heavyShare < 1))
  throw new Error(`the headline says the heaviest emitters are under 1 % of humanity; they are ${fr(heavyShare)} %`);
if (!(underAverage > 60))
  throw new Error(`the headline says the world average sits above most people; it sits above ${fr(underAverage)} %`);
if (!(biggest.value < median))
  throw new Error(`the headline says the largest circle sits below the country median; it is at ${fr(biggest.value)} against ${fr(median)}`);
// The control's own claim, asserted before it is offered: the world average is one line, and which
// side of it the mass sits on depends entirely on what the reader agreed to count.
if (!(carbonUnderAverage < underAverage / 2))
  throw new Error(
    `the weighing's whole argument is that the average splits people and carbon differently; ` +
      `it sits above ${fr(underAverage)} % of people and ${fr(carbonUnderAverage)} % of the CO₂`,
  );

// ── the three weightings ──────────────────────────────────────────────────────────────────────
const xMax = Math.ceil(farthest.value / 5) * 5;
const X = (value) => (value / xMax) * FRAME.width;
const AXIS_Y = FRAME.height - 8;
/** The smallest radius a reader can see and point at. Declared once for the whole control: a floor
 *  that changed between weightings would make two swarms' thinnest marks mean different things. */
const FLOOR_R = 2.4;
/** Marks never touch: the gap is the one number that makes a swarm's width readable as a density
 *  rather than as a solid block. */
const GAP = 0.6;
/** The ink ladder, generous first, as a fraction of the band's own area. The first rung that packs
 *  inside the frame AND leaves the annotation band empty is the one taken — never a clip, and never
 *  a per-mark re-scale, which would make two neighbours mean different things. */
const RUNGS = [0.3, 0.26, 0.22, 0.19, 0.16, 0.13, 0.11, 0.09, 0.075, 0.06, 0.05, 0.04, 0.03, 0.025];

/**
 * THE PACKING, AND THE TWO RULES THAT MAKE IT HONEST.
 *
 * A mark is pushed only ACROSS the axis, never along it: `cx` is the country's own figure in every
 * weighting, which is what lets the two callout cards and both reference labels stand still while
 * everything else re-packs. And the largest circles are laid down first — a big circle placed late
 * has nowhere left to go and ends up thrown to the top of the band, where it reads as a place it
 * does not have.
 *
 * Candidate heights are exact rather than stepped: for every circle already placed whose x-range
 * this one overlaps, the tangent height above it is computed in closed form, and the lowest
 * candidate that clears everything wins. Deterministic, ties broken on the key, so the same file
 * produces the same three swarms on every machine.
 */
function packWith(radii) {
  const placed = [];
  const order = all
    .map((c, i) => ({ c, r: radii[i] }))
    .sort((a, b) => b.r - a.r || (a.c.code < b.c.code ? -1 : 1));
  const seats = new Map();
  let top = Infinity;
  for (const { c, r } of order) {
    const cx = X(c.value);
    const base = AXIS_Y - r;
    const candidates = [base];
    for (const p of placed) {
      const reach = p.r + r + GAP;
      const dx = Math.abs(p.cx - cx);
      if (dx >= reach) continue;
      candidates.push(p.cy - Math.sqrt(reach * reach - dx * dx));
    }
    candidates.sort((a, b) => b - a);
    let cy = null;
    for (const candidate of candidates) {
      if (candidate > base + 1e-9) continue;
      let clear = true;
      for (const p of placed) {
        const reach = p.r + r + GAP;
        if ((p.cx - cx) ** 2 + (p.cy - candidate) ** 2 < reach * reach - 1e-6) {
          clear = false;
          break;
        }
      }
      if (clear) {
        cy = candidate;
        break;
      }
    }
    if (cy === null) return null;
    placed.push({ cx, cy, r });
    seats.set(c.code, { cx, cy, r });
    top = Math.min(top, cy - r);
  }
  // The band the annotation lives in is reserved in EVERY packing, which is what makes "no word on
  // this page moves" a property of the geometry rather than a hope.
  return top >= FRAME.topBand ? seats : null;
}

const WEIGHTINGS = [
  { key: "people", label: "les habitants", weight: (c) => c.pop },
  { key: "countries", label: "les pays", weight: () => 1 },
  { key: "carbon", label: "le CO₂", weight: (c) => c.pop * c.value },
];

const frameArea = FRAME.width * FRAME.height;
const laid = WEIGHTINGS.map((w) => {
  const weights = all.map(w.weight);
  const total = weights.reduce((s, x) => s + x, 0);
  const { fraction, radii, seats } = weighLadder(weights, {
    frameArea,
    rungs: RUNGS,
    floorRadius: FLOOR_R,
    fit: packWith,
    what: `the swarm weighed by ${w.label}`,
  });
  // Where half this weighting's weight lies on the axis — the reading the control hands back, and
  // the value the page's own centre-of-mass caret slides to.
  let acc = 0;
  let centreValue = sorted[0].value;
  for (const c of sorted) {
    acc += w.weight(c);
    if (acc >= total / 2) {
      centreValue = c.value;
      break;
    }
  }
  const floored = flooredWeightShare(weights, radii, FLOOR_R);
  return { ...w, weights, total, fraction, radii, seats, centreValue, floored,
    rho: weighRankCorrelation(all.map((c) => c.value), weights) };
});

console.log(
  `${all.length} pays · ${fr(worldPeople / 1e9)} milliards d'habitants · médiane ${fr(median, 2)} · ` +
    `moyenne mondiale ${fr(worldAverage, 2)} (au-dessus de ${fr(underAverage)} % des gens, ` +
    `${fr(countriesUnderAverage)} % des pays, ${fr(carbonUnderAverage)} % du CO₂) · ` +
    `${heavy.length} pays au-dessus de ${HEAVY} t = ${fr(heavyShare, 2)} % de l'humanité\n`,
);
console.table(
  laid.map((l) => ({
    "l'essaim pèse": l.label,
    encre: `${fr(l.fraction * 100)} %`,
    "plus gros": `${[...l.seats.entries()].reduce((a, b) => (b[1].r > a[1].r ? b : a))[0]} r=${fr(Math.max(...l.radii))}`,
    "moitié du poids": `${fr(l.centreValue, 2)} t`,
    "sur le plancher": `${l.floored.count} (${fr(l.floored.share * 100, 2)} % du poids)`,
    "rho avec l'axe": fr(l.rho, 4),
    "> 20 t": `${fr((heavy.reduce((s, c) => s + l.weight(c), 0) / l.total) * 100, 2)} %`,
  })),
);

// ── the declaration, and the plates ───────────────────────────────────────────────────────────
const NOTE_OF = {
  countries:
    `Un pays, un point : la moitié des ${all.length} pays émet moins de ${fr(median, 2)} t — la médiane ` +
    `que la planche dessine déjà, et la seule pondération où cette ligne est le milieu de la masse. ` +
    `Les ${heavy.length} pays au-dessus de ${HEAVY} t font ${fr((heavy.length / all.length) * 100, 2)} % des pays, ` +
    `et ${fr(countriesUnderAverage)} % des pays sont sous la moyenne mondiale.`,
  carbon:
    `La surface compte les tonnes : la moitié du CO₂ mondial est émise par des pays au-dessus de ` +
    `${fr(laid[2].centreValue, 2)} t par personne, trois fois plus haut que la moitié de l'humanité ` +
    `(${fr(laid[0].centreValue, 2)} t). ${capitalise(frName(heaviestEmitter.code, heaviestEmitter.name))} à ` +
    `${fr(heaviestEmitter.value)} t en fait ${fr((heaviestEmitter.pop * heaviestEmitter.value) / worldCo2 * 100)} % ` +
    `à elle seule ; les pays sous la moyenne mondiale, où vivent ${fr(underAverage)} % des gens, ` +
    `n'en émettent que ${fr(carbonUnderAverage)} %.`,
};
const ANNOUNCE_OF = {
  people: `les habitants — la surface d'un cercle est la population du pays : la largeur de l'essaim compte les gens`,
  countries: `les pays — un cercle par pays, tous de la même taille : la largeur de l'essaim compte les pays`,
  carbon: `le CO₂ — la surface d'un cercle est le CO₂ total du pays : la largeur de l'essaim compte les tonnes`,
};

const weigh = {
  label: "L'essaim pèse",
  floorRadius: FLOOR_R,
  options: laid.map((l) => ({
    key: l.key,
    label: l.label,
    announce: ANNOUNCE_OF[l.key],
    ...(NOTE_OF[l.key] ? { note: plain(NOTE_OF[l.key]) } : {}),
    weights: l.weights,
    centre: X(l.centreValue),
  })),
};

const detailOf = {
  people: (c) =>
    `${fr(c.value)} ${UNIT} · ${people(c.pop)} · ${fr(belowPeople.get(c.code))} % de l'humanité émet moins`,
  countries: (c) =>
    `${fr(c.value)} ${UNIT} · rang ${rankOf.get(c.code)} sur ${all.length} · ` +
    `${fr(belowCountries.get(c.code))} % des pays émettent moins`,
  carbon: (c) =>
    `${fr(c.value)} ${UNIT} · ${int((c.pop * c.value) / 1e6)} Mt de CO₂ · ` +
    `${fr((c.pop * c.value) / worldCo2 * 100, 2)} % du CO₂ mondial · ` +
    `${fr(belowCarbon.get(c.code))} % du CO₂ est émis plus bas`,
};

const CALLED_OUT = [biggest.code, farthest.code];
const plates = laid.map((l) => ({
  slug: l.key,
  marks: all.map((c) => {
    const seat = l.seats.get(c.code);
    return {
      key: c.code,
      name: c.name,
      cx: seat.cx,
      cy: seat.cy,
      r: seat.r,
      lit: CALLED_OUT.includes(c.code),
      detail: plain(detailOf[l.key](c)),
    };
  }),
  leaders: CALLED_OUT.map((code) => {
    const seat = l.seats.get(code);
    return { key: code, cx: seat.cx, y: seat.cy - seat.r };
  }),
}));

const facts = beatFacts(
  all.map((c) => ({ key: c.code, label: c.name, value: c.value })),
  { subject: biggest.name, declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`\ntreatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Les ${heavy.length} pays au-dessus de ${HEAVY} tonnes de CO₂ par personne pèsent ${fr(heavyShare, 1)} % de l'humanité`;
const caveat =
  `Un cercle par pays (${all.length}), posé sur l'axe du CO₂ émis par personne en ${YEAR}. Sa surface est ` +
  `ce que vous choisissez de compter. L'écart d'un cercle à l'axe, lui, ne dit rien : seule la ` +
  `LARGEUR de l'essaim en dit une.`;
const readingLine =
  `Lecture : la moitié de l'humanité émet moins de ${fr(laid[0].centreValue, 2)} t, la moitié des pays ` +
  `moins de ${fr(laid[1].centreValue, 2)} t, mais la moitié du CO₂ mondial est émise au-dessus de ` +
  `${fr(laid[2].centreValue, 2)} t. Survolez, touchez ou tabulez n'importe quel cercle : les ` +
  `${all.length} pays répondent, chacun à la question de la pondération choisie.`;
const source =
  `Source : Global Carbon Budget 2025 · population ${YEAR}, via Our World in Data · ` +
  `les noms de pays sont ceux publiés par la source`;
// THE LAST TICK IS THE ONE THE AXIS NAMES, and it stops SHORT of the frame's right edge on
// purpose. The format centres an x label on its own value, so a tick at 100 % puts half of
// "45 t/personne" outside the plot: measured, it pushed the document 15 px wider than the window at
// all seven widths this format claims, phone included. The scale still runs to xMax — the rightmost
// circle sits inside it — but the last graduation a reader is given is 40.
const xTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40].filter((t) => t < xMax);
const notes = [
  { key: biggest.code, text: `${frName(biggest.code, biggest.name)} · ${people(biggest.pop)} à ${fr(biggest.value)} t` },
  { key: farthest.code, text: `${frName(farthest.code, farthest.name)} · ${fr(farthest.value)} t` },
];
const levels = {
  median: { value: median, label: `médiane des pays ${fr(median, 2)}` },
  average: { value: worldAverage, label: `moyenne mondiale ${fr(worldAverage, 2)}` },
};
const centreLabel = "milieu de la masse";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} ${UNIT} ${centreLabel}`,
  annot:
    `${levels.median.label} ${levels.average.label} ${notes.map((n) => n.text).join(" ")} ` +
    `${weigh.label} ${weigh.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""}`).join(" ")}`,
  value: all.map((c) => fr(c.value)).join(" "),
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
  const name = `${id}.html`;
  try {
    const { outPath } = await renderWeb({
      component: DirectedSwarmWeb,
      props: {
        plates,
        weigh,
        centreLabel,
        xTicks,
        xMax,
        median: levels.median,
        average: levels.average,
        title, eyebrow: EYEBROW, caveat, source, unit: UNIT, reading: readingLine, notes,
        alt:
          `Un essaim de ${all.length} cercles, un par pays, posés le long d'un axe qui va de 0 à ` +
          `${xMax} tonnes de CO₂ par personne. La masse se concentre sous ${fr(median, 2)} tonnes ; ` +
          `le plus gros cercle, ${frName(biggest.code, biggest.name)} et ses ${people(biggest.pop)}, est à ` +
          `${fr(biggest.value)} tonnes, sous la médiane des pays. La queue de droite est faite de ` +
          `petits cercles : les ${heavy.length} pays au-dessus de ${HEAVY} tonnes ne pèsent que ` +
          `${fr(heavyShare, 1)} % de l'humanité. Un choix sous le titre change ce que la surface d'un ` +
          `cercle compte — les habitants, les pays, ou les tonnes de CO₂ — et l'essaim se repose.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    // READ THE WRITTEN PAGE BACK. Two of this vocabulary's refusals can only be made here: a datum
    // tagged with a mark and not with a weighting, and a stylesheet that forgot to hide the plates
    // it generated — the mutation `descend.ts` records, where every attribute stayed perfectly
    // correct and the page shipped three swarms drawn on top of each other.
    assertOneWeighing(await readFile(outPath, "utf8"), weigh, name);
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // A REFUSED PAGE MUST NOT LOOK LIKE A PRODUCED ONE. The stale render goes off the disk and the
    // process exits non-zero, which is the half a runner that only prints a message leaves out.
    rmSync(join(OUT, name), { force: true });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
