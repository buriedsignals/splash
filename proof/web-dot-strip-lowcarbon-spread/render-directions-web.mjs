// twin/proof/web-dot-strip-lowcarbon-spread/render-directions-web.mjs
//
// Sixteen European countries on two ruled strips — where the low-carbon share of their electricity
// stood in 2000 and in 2024 — rendered once per FILED DIRECTION into a self-contained interactive
// page.
//
// THE PAGE'S OWN ADDITION IS A LADDER, AND THE LADDER IS ARITHMETIC RATHER THAN DECORATION: the
// reader chooses which sources count as the thing the axis measures, and the sixteen dots take the
// exact positions their new values put them at. Every rung's numerator is a sum over the frozen
// file's own generation columns and every rung's denominator is the sum over all nine, which is
// what makes a position on this rail a share of the same total in all four. It is all computed
// HERE, from the file, and refused HERE, so a rung that lied never reaches a browser.
// `skills/chart-web/assets/qualify.ts` holds the refusals.
//
// Usage:  bun proof/web-dot-strip-lowcarbon-spread/render-directions-web.mjs

import { readdirSync, rmSync, existsSync } from "node:fs";
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
import { assertOneQualifying, qualifySlugOf } from "../../skills/chart-web/assets/qualify.ts";
import { DirectedDotStripWeb, FRAME } from "./DirectedDotStripWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const FROM = 2000;
const TO = 2024;

const NUCLEAR = "nuclear_generation__twh";
const HYDRO = "hydro_generation__twh";
const BIO = ["bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const WIND_SOLAR = ["solar_generation__twh", "wind_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const ALL = [NUCLEAR, HYDRO, ...BIO, ...WIND_SOLAR, ...FOSSIL];

// THE LADDER, AND IT IS A STRICT SUBTRACTION BY CONSTRUCTION. Each rung's numerator is the previous
// rung's minus one named group, so a dot can only move LEFT as the reader walks down — which is the
// one rule a reader has for reading the control, and `qualify.ts` refuses a rung that breaks it.
const LADDER = [
  {
    key: "low-carbon",
    label: "le bas-carbone",
    numerator: [NUCLEAR, HYDRO, ...BIO, ...WIND_SOLAR],
    stripped: null,
  },
  {
    key: "renewable",
    label: "sans le nucléaire",
    numerator: [HYDRO, ...BIO, ...WIND_SOLAR],
    stripped: "le nucléaire",
  },
  {
    key: "built",
    label: "ni l'hydraulique",
    numerator: [...BIO, ...WIND_SOLAR],
    stripped: "le nucléaire et l'hydraulique",
  },
  {
    key: "wind-solar",
    label: "ni la bioénergie",
    numerator: [...WIND_SOLAR],
    stripped: "le nucléaire, l'hydraulique et la bioénergie",
  },
];

const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
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
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
});
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);
const YEARS = [FROM, TO];
const LANES = YEARS.map(String);

const rowOf = (code, year) => {
  const r = raw.find((z) => z.code === code && z.year === year);
  if (!r) throw new Error(`${NAMES[code]} has no ${year} row`);
  return r;
};
/** The denominator. It is the same in every rung and that is the whole honesty of the ladder. */
const totalOf = (code, year) => {
  const t = ALL.reduce((s, k) => s + rowOf(code, year)[k], 0);
  if (!(t > 0)) throw new Error(`${NAMES[code]} generates nothing in ${year}`);
  return t;
};
const shareOf = (code, year, numerator) =>
  (numerator.reduce((s, k) => s + rowOf(code, year)[k], 0) / totalOf(code, year)) * 100;

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// THE JITTER, AND IT IS A HASH RATHER THAN A RANDOM NUMBER. The type sheet asks for "a small,
// deterministic jitter perpendicular to the axis — enough to reveal overlap through transparency,
// not a random scatter that would make the same data look different every time it renders". So it
// is derived from the country's own code, once, and reused on both rails and in all four rungs: a
// mark never moves across its rail, and the same country sits at the same height on both rails,
// which is the only identity cue this page gives without drawing the line it refuses to draw.
const jitterOf = (code) => {
  let h = 2166136261;
  for (const ch of code) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Number(((((h >>> 0) % 2001) / 1000 - 1) * FRAME.jitter).toFixed(3));
};

// ── THE FOUR RUNGS, MEASURED ──────────────────────────────────────────────────────────────────
const rungs = LADDER.map((rung) => {
  const lanes = YEARS.map((year) => {
    const values = codes
      .map((code) => ({ code, name: NAMES[code], value: shareOf(code, year, rung.numerator) }))
      .sort((a, b) => a.value - b.value);
    return {
      lane: String(year),
      year,
      values,
      floor: values[0],
      ceiling: values[values.length - 1],
      median: median(values.map((v) => v.value)),
      span: values[values.length - 1].value - values[0].value,
    };
  });
  return { ...rung, slug: qualifySlugOf(rung.key), lanes };
});
const base = rungs[0];
const last = rungs[rungs.length - 1];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const [before, after] = base.lanes;
const floorRise = after.floor.value - before.floor.value;
const ceilingRise = after.ceiling.value - before.ceiling.value;
const closed = before.span - after.span;
if (!(floorRise > 20 && ceilingRise < 5))
  throw new Error(`the headline says the floor rose far while the ceiling barely moved; ${fr(floorRise)} against ${fr(ceilingRise)}`);
if (!(closed / before.span > 0.2))
  throw new Error(`the headline says the spread closed by more than a fifth; it closed by ${fr((closed / before.span) * 100)} %`);
// AND THE HALF THE STILL CANNOT STATE: the last rung has to OPEN the spread, or this control is
// four pictures of one argument instead of the argument itself.
if (!(last.lanes[1].span > last.lanes[0].span))
  throw new Error(
    `the page argues that the convergence belongs to the legacy fleet, so the last rung must OPEN ` +
      `the spread; ${fr(last.lanes[0].span)} to ${fr(last.lanes[1].span)}`,
  );
const SUBJECT = before.floor.code;

// THE SECOND ACCENTED CASE IS DERIVED, NOT CHOSEN: the country that falls furthest down the ladder.
const fallOf = (code) => shareOf(code, TO, base.numerator) - shareOf(code, TO, last.numerator);
const falls = codes.map((code) => ({ code, fall: fallOf(code) })).sort((a, b) => b.fall - a.fall);
const FALLER = falls[0].code;
const SMALLEST = falls[falls.length - 1];
if (!(falls[0].fall > falls[1].fall + 5))
  throw new Error(
    `the page names one country as the furthest fall and two are within ${fr(falls[0].fall - falls[1].fall)} points`,
  );

console.log(
  `${codes.length} pays · plancher ${fr(before.floor.value)} -> ${fr(after.floor.value)} ` +
    `(${fr(floorRise)} pts) · plafond ${fr(before.ceiling.value)} -> ${fr(after.ceiling.value)} ` +
    `(${fr(ceilingRise)} pts) · écart ${fr(before.span)} -> ${fr(after.span)}\n`,
);
console.table(
  rungs.map((r) => ({
    rung: r.label,
    [`écart ${FROM}`]: fr(r.lanes[0].span),
    [`écart ${TO}`]: fr(r.lanes[1].span),
    delta: fr(r.lanes[1].span - r.lanes[0].span),
    [`plancher ${TO}`]: `${r.lanes[1].floor.code} ${fr(r.lanes[1].floor.value)}`,
    [`plafond ${TO}`]: `${r.lanes[1].ceiling.code} ${fr(r.lanes[1].ceiling.value)}`,
  })),
);
console.log(
  `\nchute la plus forte du ${TO} en descendant l'échelle : ${NAMES[FALLER]} ${fr(falls[0].fall)} points · ` +
    `la plus faible : ${NAMES[SMALLEST.code]} ${fr(SMALLEST.fall)}\n`,
);

// ── THE DECLARATION AND THE DRAWING, BUILT FROM ONE PASS ──────────────────────────────────────
const rankIn = (lane, code) => lane.values.findIndex((z) => z.code === code) + 1;

// THE SENTENCES THE CONTROL OWES. Every figure in them is read off `rungs` above rather than
// typed, so a note and the bar it describes cannot drift apart.
const NOTES = {
  renewable:
    `Sans le nucléaire, l'écart ne se referme plus du tout : ${fr(rungs[1].lanes[0].span)} points ` +
    `en ${FROM}, ${fr(rungs[1].lanes[1].span)} en ${TO}. Le plafond change de pays — ` +
    `${NAMES[rungs[1].lanes[0].ceiling.code]} en ${FROM}, ${NAMES[rungs[1].lanes[1].ceiling.code]} ` +
    `en ${TO} — et la France tombe de ${fr(shareOf("FRA", TO, base.numerator))} % à ` +
    `${fr(rungs[1].lanes[1].values.find((v) => v.code === "FRA").value)} %.`,
  built:
    `Sans l'hydraulique non plus, il ne reste que ce qui a été bâti depuis. En ${FROM} les ` +
    `${codes.length} tiennent dans ${fr(rungs[2].lanes[0].span)} points, parce que personne ` +
    `n'avait encore rien construit ; en ${TO} ils s'étalent sur ${fr(rungs[2].lanes[1].span)}. ` +
    `L'écart est cinq fois plus grand qu'au départ, au lieu d'être un quart plus petit.`,
  "wind-solar":
    `Le vent et le soleil seuls : ${fr(rungs[3].lanes[0].span)} points d'écart en ${FROM}, ` +
    `${fr(rungs[3].lanes[1].span)} en ${TO}. ${NAMES[FALLER]} y perd ${fr(falls[0].fall)} points ` +
    `par rapport au bas-carbone, la plus forte chute des ${codes.length} ; ` +
    `${NAMES[SMALLEST.code]} en perd ${fr(SMALLEST.fall)}, la plus faible. La convergence ` +
    `appartenait au parc hérité, pas à celui qu'on construit.`,
};

const qualify = {
  label: "L'axe mesure",
  axisMax: 100,
  options: rungs.map((rung, i) => {
    const note = i === 0 ? undefined : NOTES[rung.key];
    return {
      key: rung.key,
      label: rung.label,
      announce: `${rung.label} — écart ${fr(rung.lanes[0].span)} points en ${FROM}, ${fr(rung.lanes[1].span)} en ${TO}`,
      ...(note ? { note } : {}),
      seats: rung.lanes.flatMap((lane) =>
        lane.values.map((v) => ({
          lane: lane.lane,
          key: v.code,
          value: v.value,
          across: jitterOf(v.code),
          denominator: totalOf(v.code, lane.year),
        })),
      ),
      spans: rung.lanes.map((lane) => ({
        lane: lane.lane,
        floor: lane.floor.value,
        ceiling: lane.ceiling.value,
      })),
    };
  }),
};

const rails = rungs.map((rung, i) => ({
  slug: rung.slug,
  lanes: rung.lanes.map((lane, l) => {
    const other = rung.lanes[1 - l];
    return {
      key: lane.lane,
      ticks: [lane.floor.value, lane.median, lane.ceiling.value],
      marks: lane.values.map((v) => {
        const otherValue = other.values.find((z) => z.code === v.code).value;
        const withBase = shareOf(v.code, lane.year, base.numerator);
        const detail =
          i === 0
            ? `${v.name} · ${lane.year} : ${fr(v.value)} % · ${other.year} : ${fr(otherValue)} % · ` +
              `rang ${rankIn(lane, v.code)} sur ${codes.length} en ${lane.year}, ` +
              `${rankIn(other, v.code)} en ${other.year}`
            : `${v.name} · ${lane.year} : ${fr(v.value)} % · ${fr(withBase - v.value)} points de moins ` +
              `qu'avec ${rung.stripped} · ${other.year} : ${fr(otherValue)} % · ` +
              `rang ${rankIn(lane, v.code)} sur ${codes.length} en ${lane.year}`;
        return {
          key: v.code,
          name: v.name,
          value: v.value,
          across: jitterOf(v.code),
          lit: v.code === SUBJECT || v.code === FALLER,
          detail: plain(detail),
        };
      }),
    };
  }),
}));

const stats = rungs.flatMap((rung) =>
  rung.lanes.map((lane) => ({
    lane: lane.lane,
    slug: rung.slug,
    text: plain(
      `plancher ${fr(lane.floor.value)} % · milieu ${fr(lane.median)} % · ` +
        `plafond ${fr(lane.ceiling.value)} % · écart ${fr(lane.span)} points`,
    ),
  })),
);

const laneHeadings = Object.fromEntries(LANES.map((lane) => [lane, lane]));

const facts = beatFacts(
  after.values.map((v) => ({ key: v.code, label: v.name, value: v.value })),
  { subject: NAMES[SUBJECT], declaredSequence: "%" },
);
console.log(`treatments applicable: ${applicableTreatments(facts).map((t) => t.id).join(", ") || "(none)"}\n`);

// THE TITLE IS THE STATIC SIBLING'S OWN, AND IT IS SHORT ON PURPOSE. The words a beat spends on
// its title are height it takes out of its plot at the narrowest frame, which is the one place the
// plot cannot give any back: a fifteen-word form of this title left `nocturne` 28 px past its own
// 812 px window and pushed the source line off screen. The ladder's half of the argument is in the
// caveat, in the pills and in every revealed sentence, where a reader meets it anyway.
const title = `Le plancher européen est monté de ${fr(floorRise, 0)} points, le plafond de ${fr(ceilingRise, 0)}`;
const caveat =
  `Deux rails, deux dates : chaque pastille est un pays, sa position la part de son électricité que ` +
  `la définition choisie compte. Le dénominateur ne bouge jamais. Un rail se lit comme une FORME, ` +
  `jamais comme la trajectoire d'un pays.`;
const readingLine =
  `Lecture : chaque cran retire une source de plus, donc une pastille ne peut que reculer. ` +
  `Survolez, touchez ou tabulez-en une pour le pays, ce qu'il vaut sous cette définition et ce que ` +
  `les sources retirées lui valent.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`;
const xTicks = [0, 25, 50, 75, 100];
const alt =
  `Deux rails horizontaux gradués de 0 à 100 %. Sur celui de ${FROM}, ${codes.length} pastilles ` +
  `s'étalent de ${fr(before.floor.value)} % à ${fr(before.ceiling.value)} % ; sur celui de ${TO}, ` +
  `elles se resserrent entre ${fr(after.floor.value)} % et ${fr(after.ceiling.value)} %. Le plancher ` +
  `monte de ${fr(floorRise)} points, le plafond de ${fr(ceilingRise)}, et l'écart entre les deux se ` +
  `referme de ${fr(closed)} points. Les pastilles de la ${NAMES[SUBJECT]}, plancher aux deux dates, ` +
  `et de la ${NAMES[FALLER]} sont colorées. Un contrôle change ce que l'axe mesure : sans le ` +
  `nucléaire ni l'hydraulique, l'écart de ${TO} vaut ${fr(last.lanes[1].span)} points contre ` +
  `${fr(last.lanes[0].span)} en ${FROM} — il s'ouvre au lieu de se refermer.`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} %`,
  annot:
    `${LANES.join(" ")} ${stats.map((s) => s.text).join(" ")} ` +
    `${qualify.label} ${qualify.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""}`).join(" ")} ` +
    `${rails.flatMap((r) => r.lanes.flatMap((l) => l.marks.map((m) => m.detail))).join(" ")} ${alt}`,
  value: rails[0].lanes.flatMap((l) => l.marks.map((m) => fr(m.value))).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
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
  const outPath = join(OUT, `${id}.html`);
  try {
    await renderWeb({
      component: DirectedDotStripWeb,
      props: {
        rails,
        qualify,
        lanes: LANES,
        laneHeadings,
        stats,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, alt,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // The three refusals only the WRITTEN page can carry: a half-tagged datum, a vocabulary that
    // emitted no rules at all, and a blanket hide that landed after the default rail's own reveal.
    assertOneQualifying(await readFile(outPath, "utf8"), qualify, id);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // A REFUSED PAGE MUST NOT LOOK LIKE A PRODUCED ONE. The previous render of this direction is
    // taken off the disk rather than left there to be mistaken for this run's.
    if (existsSync(outPath)) rmSync(outPath);
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that catches a refusal and exits 0 makes a refused page look like a produced one.
  process.exitCode = 1;
}
