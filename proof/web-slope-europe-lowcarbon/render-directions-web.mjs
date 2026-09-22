// twin/proof/web-slope-europe-lowcarbon/render-directions-web.mjs
//
// Sixteen European countries' low-carbon electricity share in 2000 and 2024, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// A CROSSING IS DERIVED, NEVER EYEBALLED: a pair crosses when the sign of their gap flips between
// the rails. The headline's crossing is asserted before the render, and so is the POINT along the
// connector where it happens — the ring is drawn there and nowhere else.
//
// Usage:  bun proof/web-slope-europe-lowcarbon/render-directions-web.mjs

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
import { DirectedSlopeWeb, slopeY } from "./DirectedSlopeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;
const PIVOT = "FRA";
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};
/** Which country names take a feminine past participle in French, so "dépassé par" and
 *  "dépassée par" are a lookup rather than a guess. */
const FEM = new Set(["FRA", "ESP", "ITA", "POL", "SWE", "NOR", "CHE", "AUT", "FIN", "GRC", "IRL", "CZE", "BEL", "DEU"]);

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
/** Plain "1er" / "11e", not the superscript forms. The superscript e (U+1D49) and r (U+02B3) are
 *  on no face of the serif ladder, and these strings are declared to the body and annot registers —
 *  a direction that sets either in a serif refuses the whole beat over a typographic flourish. */
const ord = (n) => (n === 1 ? "1er" : `${n}e`);

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
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const shareOf = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (!(total > 0)) throw new Error(`${NAMES[code]} generates nothing in ${year}`);
  return (low / total) * 100;
};

const rows = codes
  .map((code) => ({ code, name: NAMES[code], before: shareOf(code, FROM), after: shareOf(code, TO) }))
  .map((r) => ({ ...r, gain: r.after - r.before }))
  .sort((a, b) => b.gain - a.gain);

// ── THE CROSSINGS, DERIVED ────────────────────────────────────────────────────────────────────
// A pair crosses when the sign of their gap flips between the rails. `passed` is the half of that
// where THIS country came from below; `passedBy` is the same relation read the other way, and it is
// derived from `passed` rather than computed a second time — two derivations of one fact is how a
// chart ends up disagreeing with itself.
const crossesWith = (a, b) => Math.sign(a.before - b.before) !== Math.sign(a.after - b.after);
const passed = (r) => rows.filter((z) => z.code !== r.code && crossesWith(r, z) && r.after > z.after);
const passedBy = (r) => rows.filter((z) => passed(z).some((w) => w.code === r.code));

const pivot = rows.find((r) => r.code === PIVOT);
const crossed = rows.filter((r) => r.code !== PIVOT && crossesWith(r, pivot));
const fell = rows.filter((r) => r.gain <= 0);
if (fell.length) throw new Error(`the headline says all gained; ${fell.map((r) => r.name).join(", ")} did not`);
if (crossed.length !== 1)
  throw new Error(`the headline names one country that overtook ${pivot.name}; ${crossed.length} did`);
const over = crossed[0];
const biggest = rows[0];

// WHERE ALONG THE CONNECTOR THE TWO ACTUALLY MEET. The gap between the pair is linear in t between
// the rails, so the crossing is the t where it is zero. Asserted inside the plot rather than
// assumed: the ring used to be parked at the plot's own midpoint, and on this data that is 98,4 %
// of the span away from the meeting point.
const gap0 = over.before - pivot.before;
const gap1 = over.after - pivot.after;
const crossT = gap0 / (gap0 - gap1);
if (!(crossT > 0 && crossT < 1))
  throw new Error(`the derived crossing sits at t=${crossT}, outside the two rails — nothing to ring`);
// AND THE POINT IS TAKEN OFF BOTH LINES, which is what makes the ring's position falsifiable. A
// crossing is where the two are EQUAL, so reading the height off one line and off the other has to
// give the same number; a `t` that is not the crossing gives two different ones. With the midpoint
// this replaces (t = 0,5) the two readings are 93,2 % and 80,8 % — 12,4 points apart, and the ring
// was drawn at one of them with nothing red.
const crossValue = pivot.before + crossT * (pivot.after - pivot.before);
const crossCheck = over.before + crossT * (over.after - over.before);
if (Math.abs(crossValue - crossCheck) > 1e-9)
  throw new Error(
    `at t=${crossT.toFixed(4)} the ${pivot.name} line is at ${fr(crossValue, 3)} % and the ` +
      `${over.name} line at ${fr(crossCheck, 3)} % — the two are not in the same place, so this is ` +
      `not where they cross and the ring would be drawn over empty plot`,
  );

console.log(
  `${rows.length} pays · tous en hausse · un seul dépasse ${pivot.name} : ${over.name} ` +
    `(${fr(over.before)} -> ${fr(over.after)} contre ${fr(pivot.before)} -> ${fr(pivot.after)}) · ` +
    `croisement à t=${crossT.toFixed(3)} (${fr(crossValue)} %) · ` +
    `plus fort gain ${biggest.name} +${fr(biggest.gain)} pts\n`,
);
console.table(rows.map((r, i) => ({
  rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after), gain: `+${fr(r.gain)}`,
  "a dépassé": passed(r).length, "dépassé par": passedBy(r).length,
})));

const lines = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  before: r.before,
  after: r.after,
  beforeLabel: `${fr(r.before, 0)} %`,
  afterLabel: `${fr(r.after, 0)} %`,
  highlight: r.code === over.code || r.code === PIVOT,
  detail:
    `${r.name} · de ${fr(r.before)} % en ${FROM} à ${fr(r.after)} % en ${TO} · +${fr(r.gain)} points · ` +
    `${ord(i + 1)} gain sur ${rows.length}` +
    (passed(r).length
      ? ` · a dépassé ${passed(r).map((z) => z.name).join(", ")}`
      : " · n'a dépassé personne"),
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: over.name,
    states: [String(FROM), String(TO)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "%",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const yTicks = [0, 100];

// ── THE YARDSTICK ─────────────────────────────────────────────────────────────────────────────
// Every option lays TWO rules, one per rail, at the same heights the composition draws that
// country's own two dots to — `slopeY` is the one scale in this beat and both callers use it.
//
// The SENTENCE is where the derived readings live, and they are the ones no rule can draw: the rank
// among the sixteen gains, and the crossings the reader's choice implies in BOTH directions. The
// plate carries one pivot's crossings — France's — because that is all a still has room for; this
// is the other fifteen.
const y = slopeY(yTicks[0], yTicks[yTicks.length - 1]);
const levels = {
  label: `Mesurer les seize à l'aune de`,
  noneLabel: "Chaque pays pour lui-même",
  options: rows.map((r, i) => {
    const up = passed(r);
    const down = passedBy(r);
    const fem = FEM.has(r.code);
    const upPhrase = up.length
      ? `a dépassé ${up.length} des ${rows.length - 1} autres (${up.map((z) => z.name).join(", ")})`
      : "n'a dépassé personne";
    const downPhrase = down.length
      ? `${fem ? "dépassée" : "dépassé"} par ${down.length} (${down.map((z) => z.name).join(", ")})`
      : `${fem ? "dépassée" : "dépassé"} par personne`;
    return {
      key: r.code,
      label: r.name,
      announce:
        `${r.name} — de ${fr(r.before)} % en ${FROM} à ${fr(r.after)} % en ${TO}, ` +
        `${ord(i + 1)} gain sur ${rows.length} ; ${upPhrase} ; ${downPhrase}`,
      note:
        `${r.name} · de ${fr(r.before)} % en ${FROM} à ${fr(r.after)} % en ${TO} · ` +
        `${ord(i + 1)} gain sur ${rows.length} · ${upPhrase} · ${downPhrase}`,
      marks: [
        { series: String(FROM), y: y(r.before) },
        { series: String(TO), y: y(r.after) },
      ],
    };
  }),
};

// THE TWO RAILS PRINT THE YEARS, so the title does not repeat them. Measured on nocturne at
// 375 x 812, where the display is uppercase: the longer wording set eight lines and 312 px of
// title alone, and the figure could not hold its own control underneath it. The claim is the
// same claim, word for word on both halves.
const title = `Les seize ont tous gagné de l'électricité bas-carbone — un seul a dépassé la ${pivot.name}`;
// SHORT ON PURPOSE, AND THE LENGTH IS A MEASUREMENT. This page carries a seventeen-option control
// the plate does not, and a control costs height: at 375 x 812 the figure overflowed its own 100dvh
// by 187 px in creme and 296 px in nocturne with the longer prose this replaces, and the plot was
// already on its floor, so the only thing left to give was words. The treatment is still stated.
const caveat =
  `Part bas-carbone de l'électricité, ${FROM} à gauche et ${TO} à droite. La pente porte le sens, ` +
  `les nombres la grandeur — d'où l'absence d'axe entre les rails.`;
const crossings = [
  {
    at: crossValue,
    t: crossT,
    text:
      `${over.name} était ${fr(pivot.before - over.before)} points sous la ${pivot.name} en ${FROM} ` +
      `et passe devant en ${TO} (${fr(over.after)} % contre ${fr(pivot.after)} %). Le seul ` +
      `croisement, et il n'arrive qu'à ${fr(crossT * 100, 0)} % du trajet : le cercle est posé là. ` +
      `Un croisement se calcule.`,
  },
];
const readingLine =
  `Lecture : survolez ou tabulez une ligne pour son gain, son rang et qui elle a dépassé. Ou ` +
  `choisissez un pays ci-dessus : ses deux niveaux se posent en travers des rails, et les quinze ` +
  `autres se lisent contre lui.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    `Une plaque doit dessiner les seize d'un coup pour soutenir « tous ont monté », et c'est ` +
    `exactement ce qui rend le second croisement illisible — elle ne peut porter qu'un seul pivot, ` +
    `celui de l'auteur. Ici le pivot est au lecteur : n'importe lequel des seize se pose en travers ` +
    `des deux rails, et la phrase qui revient dit qui ce pays a dépassé et qui l'a dépassé, les ` +
    `quinze lectures qu'un fixe et une vidéo doivent choisir de taire.`,
  controls: [
    {
      question:
        "Cette ligne-là, dans l'enchevêtrement, c'est quel pays — et qu'est-ce qu'elle a traversé " +
        "entre les deux rails ?",
      gesture: "ask-a-line",
      changes:
        `Le connecteur répond avec ce qui relie ses deux bouts et que ni l'un ni l'autre ne porte : ` +
        `le gain en points, le rang de ce gain parmi les seize, et le nom de chaque pays dépassé en ` +
        `chemin.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quelle ligne est en question",
      authorPicked: "le Danemark",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question:
        "Tout est mesuré contre la France. Et contre MON pays, ça donne quoi — qui est passé " +
        "devant lui, qui est passé derrière ?",
      gesture: "find-your-own-case",
      changes:
        `Deux règles en pointillé traversent le plot, à la part ${FROM} et à la part ${TO} du pays ` +
        `choisi ; ses deux points prennent un cerne et son nom passe en encre pleine pendant que les ` +
        `quinze autres reculent ; une phrase donne son rang parmi les seize gains et nomme les pays ` +
        `qu'il a dépassés et ceux qui l'ont dépassé.`,
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "le pivot posé en travers des deux rails",
      authorPicked: "none",
      readerPicks: ["none", "dnk", "prt", "nld", "irl", "grc", "gbr", "cze", "esp", "ita", "fin", "pol", "deu", "bel", "aut", "fra", "swe"],
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ` +
    `${rows.map((r) => r.name).join(" ")} ` +
    `${levels.options.map((o) => `${o.note} ${o.announce}`).join(" ")}`,
  axis: lines.map((l) => `${l.name} ${l.beforeLabel} ${l.afterLabel}`).join(" "),
  annot: crossings.map((c) => c.text).join(" "),
  value: `${FROM} ${TO}`,
};
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
      component: DirectedSlopeWeb,
      props: {
        lines,
        railLabels: { left: String(FROM), right: String(TO) },
        yTicks,
        crossings,
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Deux rails verticaux, ${FROM} à gauche et ${TO} à droite, reliés par ${lines.length} ` +
          `segments, un par pays. Tous montent. Celui de ${over.name} part de ${fr(over.before)} % ` +
          `— ${fr(pivot.before - over.before)} points sous la ${pivot.name} — et arrive à ` +
          `${fr(over.after)} %, au-dessus d'elle ; les deux lignes ne se coupent qu'à ` +
          `${fr(crossT * 100, 0)} % du trajet. ${biggest.name} a la pente la plus raide, ` +
          `+${fr(biggest.gain)} points.`,
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
