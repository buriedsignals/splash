// twin/proof/web-gantt-top-ten-tenure/render-directions-web.mjs
//
// Who held a place in the world's ten largest CO₂ emitters, and for how long, 1990-2024 — rendered
// once per FILED DIRECTION into a self-contained interactive page whose ORIGIN IS THE THING THE
// READER OPERATES.
//
// EVERY SPAN IS COMPUTED FROM THE SAME RANKING THE BUMP BEAT READS, taken as tenure rather than as
// position. Interruptions are found, not listed: a row with more than one span had a gap, and the
// page says which years. Every figure in `BRIEF.md` is computed here and asserted here.
//
// Usage:  bun proof/web-gantt-top-ten-tenure/render-directions-web.mjs

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
import { DirectedGanttWeb, FRAME } from "./DirectedGanttWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const TOP = 10;

// HOW MANY GEOMETRY UNITS ONE CSS PIXEL IS WORTH AT THE NARROWEST WIDTH THIS FORMAT IS VERIFIED AT,
// and it is a MEASUREMENT rather than an estimate: `verify-web.mjs`'s narrowest viewport is 375 CSS
// pixels, and at that width `svg.chart` in this beat's own rendered page measures 211 px for a
// 780-unit viewBox, the same on all three directions. That is the floor `assertAlignDeclaration`
// refuses an indistinguishable origin with — two pills whose intervals nowhere differ by a whole
// pixel are two pills and one picture. Re-measure it if the gutter or the frame width changes.
const UNITS_PER_CSS_PX = 780 / 211;

const plain = (s) => plainSpaces(s);
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", DEU: "Allemagne",
  GBR: "Royaume-Uni", UKR: "Ukraine", ITA: "Italie", KOR: "Corée du Sud", CAN: "Canada",
  MEX: "Mexique", IRN: "Iran", SAU: "Arabie saoudite", IDN: "Indonésie", POL: "Pologne",
  ZAF: "Afrique du Sud", FRA: "France", BRA: "Brésil", AUS: "Australie", KAZ: "Kazakhstan",
  TUR: "Turquie", ESP: "Espagne", KWT: "Koweït", VNM: "Viêt Nam", THA: "Thaïlande",
};

// THE ARTICLE EVERY NAME TAKES, BECAUSE THE POINTER'S ANSWER IS A SENTENCE AND NOT A LIST. The
// first pass read "à égalité avec Canada" in all three captures, which is the give-away of a string
// assembled rather than written. Kept beside `NAMES` and checked with it: a country that reaches the
// top ten and has no article filed refuses the render rather than shipping the bare name.
const ARTICLE = {
  CHN: "la ", USA: "les ", IND: "l'", RUS: "la ", JPN: "le ", DEU: "l'", GBR: "le ", UKR: "l'",
  ITA: "l'", KOR: "la ", CAN: "le ", IRN: "l'", SAU: "l'", IDN: "l'", FRA: "la ", KWT: "le ",
  MEX: "le ", POL: "la ", ZAF: "l'", BRA: "le ", AUS: "l'", KAZ: "le ", TUR: "la ", ESP: "l'",
  VNM: "le ", THA: "la ",
};
const the = (r) => `${ARTICLE[r.code]}${r.name}`;
const The = (r) => `${ARTICLE[r.code][0].toUpperCase()}${ARTICLE[r.code].slice(1)}${r.name}`;
const of_ = (r) =>
  ({ "le ": "du ", "la ": "de la ", "les ": "des ", "l'": "de l'" })[ARTICLE[r.code]] + r.name;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const rawRows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return { code: c[at("Code")], year: Number(c[at("Year")]), tonnes: Number(c[header.length - 1]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.tonnes));

const years = [...new Set(rawRows.map((r) => r.year))].sort((a, b) => a - b);
const table = new Map(years.map((y) => [y, rawRows.filter((r) => r.year === y).sort((a, b) => b.tonnes - a.tonnes)]));
const heldIn = new Map();
const bestRank = new Map();
for (const y of years)
  table.get(y).slice(0, TOP).forEach((r, i) => {
    if (!heldIn.has(r.code)) heldIn.set(r.code, new Set());
    heldIn.get(r.code).add(y);
    bestRank.set(r.code, Math.min(bestRank.get(r.code) ?? Infinity, i + 1));
  });

const members = [...heldIn.keys()];
for (const code of members)
  if (!NAMES[code] || !ARTICLE[code])
    throw new Error(`${code} held a place and has no French name or article filed in this beat`);

const first = years[0];
const last = years[years.length - 1];
const EXTENT = years.length; // one unit of length is one YEAR, in every state of the page

// A ROW'S SPANS ARE BUILT BY WALKING ITS SORTED HELD YEARS, so an end can never precede its own
// start — the type sheet's literal failure mode is absent from this file by construction. It is NOT
// absent from this PAGE, which is the whole reason `align.ts` makes the refusal anyway: an alignment
// re-places both ends of every interval and closes gaps between them, so it is exactly the operation
// that could invert one or lay two spans of a row on top of each other.
const spansOf = (code) => {
  const held = [...heldIn.get(code)].sort((a, b) => a - b);
  const out = [];
  for (const y of held) {
    const open = out[out.length - 1];
    if (open && open.to === y - 1) open.to = y;
    else out.push({ from: y, to: y });
  }
  return out.map((s, i) => ({ ...s, key: `${code}-${i}`, open: s.to === last }));
};

const shaped = members
  .map((code) => {
    const spans = spansOf(code);
    const held = heldIn.get(code).size;
    const entry = spans[0].from;
    const exit = spans[spans.length - 1].to;
    const gaps = [];
    for (let i = 1; i < spans.length; i += 1)
      gaps.push(`${spans[i - 1].to + 1}${spans[i].from - 1 > spans[i - 1].to + 1 ? `–${spans[i].from - 1}` : ""}`);
    return {
      code,
      name: NAMES[code],
      spans,
      years: held,
      entry,
      exit,
      /** Entry to last exit inclusive — the elapsed time a calendar bar covers, which is NOT the
       *  tenure for a row that was interrupted. The gap between these two numbers is what the third
       *  origin closes, and it is the second finding on this page. */
      window: exit + 1 - entry,
      gaps,
      whole: held === years.length,
      tenureLabel: `${held} an${held > 1 ? "s" : ""}`,
    };
  })
  // `types/gantt.md`: rows sort by START DATE, earliest first, so overlapping items cluster visibly.
  // Then by tenure, then by best rank, then by code — every one of those is a property of the DATA,
  // so the order is the same under all three origins and no name ever moves.
  .sort(
    (a, b) =>
      a.entry - b.entry ||
      b.years - a.years ||
      bestRank.get(a.code) - bestRank.get(b.code) ||
      a.code.localeCompare(b.code),
  );

// ── THE CLAIM, AND EVERY FIGURE THE BRIEF LEANS ON, ASSERTED ──────────────────────────────────
const whole = shaped.filter((r) => r.whole);
const interrupted = shaped.filter((r) => r.spans.length > 1);
const oneYear = shaped.filter((r) => r.years === 1);
if (shaped.length !== 16 || whole.length !== 6)
  throw new Error(`the headline says 16 countries and 6 unbroken; this file gives ${shaped.length} and ${whole.length}`);
if (interrupted.length !== 2)
  throw new Error(`the page says two rows are interrupted; this file has ${interrupted.length}`);
if (oneYear.length !== 1 || oneYear[0].code !== "KWT")
  throw new Error(`the note on the plate names Kuwait's single year; this file gives ${oneYear.map((r) => r.code).join(", ")}`);
// THE PAIR THE WEB FORMAT EXISTS FOR ON THIS BEAT. Two rows of equal tenure that the calendar can
// never put side by side — and the third origin makes them the same bar. If the file ever stops
// carrying such a pair, the argument in `BRIEF.md` is no longer true and this page must not render.
// The pair is FOUND, not named: an interrupted row and an unbroken one that hold the same number of
// years. `twinB` is the interrupted one — the row the third origin shortens — and `twinA` is the
// unbroken row its bar lands on.
const twinB = interrupted
  .filter((r) => !r.whole && shaped.some((o) => o !== r && o.years === r.years && o.window === o.years))
  .sort((a, b) => b.window - b.years - (a.window - a.years))[0];
if (!twinB)
  throw new Error(
    "no interrupted row shares its tenure with an unbroken one, so closing the interruptions lands " +
      "no bar on another — the page's own finding is gone",
  );
const twinA = shaped.find((o) => o !== twinB && o.years === twinB.years && o.window === o.years);
const twinGap = Math.abs(shaped.indexOf(twinA) - shaped.indexOf(twinB));
for (const r of interrupted)
  if (r.window <= r.years) throw new Error(`${r.name} is interrupted and its window is not longer than its tenure`);

console.log(
  `${shaped.length} pays ont tenu une place dans le top ${TOP} entre ${first} et ${last} · ` +
    `${whole.length} l'ont tenue chaque année (${whole.map((r) => r.name).join(", ")}) · ` +
    `${interrupted.length} interrompus · ${oneYear.length} sur une seule année\n`,
);
console.table(
  shaped.map((r) => ({
    pays: r.name,
    ans: r.years,
    fenêtre: r.window,
    entrée: r.entry,
    périodes: r.spans.map((s) => (s.from === s.to ? s.from : `${s.from}-${s.to}`)).join(" "),
    "meilleur rang": bestRank.get(r.code),
  })),
);
console.log(
  `\nla paire : ${twinA.name} et ${twinB.name}, ${twinA.years} ans chacun · fenêtres ` +
    `${twinA.window} et ${twinB.window} ans · ${Math.abs(twinA.entry - twinB.entry)} ans d'écart à l'entrée\n`,
);

// ── THE POINTER'S ANSWER, ONE SENTENCE PER ROW, TRUE IN EVERY STATE ───────────────────────────
// Where a row stands in the tenure order is a READING, and a reading is what a pointer is for — it
// is the instrument that pays for refusing to re-sort the rows into a ladder (see `BRIEF.md`).
const rankOf = (row) => 1 + shaped.filter((o) => o.years > row.years).length;
const detailOf = (row) => {
  const rank = rankOf(row);
  const ties = shaped.filter((o) => o !== row && o.years === row.years);
  const standing =
    `${rank}${rank === 1 ? "re" : "e"} tenure la plus longue` +
    (ties.length === 1 ? ` à égalité avec ${the(ties[0])}` : ties.length > 1 ? ` à égalité avec ${ties.length} autres` : "");
  return plain(
    `${row.name} · ${row.years} an${row.years > 1 ? "s" : ""} tenus sur ${years.length} · ${standing} · ` +
      row.spans.map((s) => (s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`)).join(", ") +
      (row.gaps.length ? ` · absente en ${row.gaps.join(", ")}` : "") +
      (row.entry > first ? ` · entrée ${row.entry - first} ans après l'ouverture du relevé` : ` · présente dès ${first}`) +
      ` · meilleur rang atteint : ${bestRank.get(row.code)}` +
      (row.spans[row.spans.length - 1].open ? " · toujours présente au dernier relevé" : ` · sortie après ${row.exit}`),
  );
};

// ── THE ALIGNMENT: THREE ORIGINS, ONE SCALE ───────────────────────────────────────────────────
const bars = shaped.flatMap((r) => r.spans.map((s) => ({ key: s.key, row: r.code, length: s.to + 1 - s.from })));
/** x = 0 is the year the record opens, for all sixteen. The plate. */
const placeCalendar = shaped.flatMap((r) => r.spans.map((s) => ({ key: s.key, at: s.from - first })));
/** x = 0 is each row's OWN first year. Every interval keeps its length and its gaps. */
const placeEntry = shaped.flatMap((r) => r.spans.map((s) => ({ key: s.key, at: s.from - r.entry })));
/** x = 0 is each row's own first year AND the gaps are closed, so a bar is exactly its own tenure. */
const placeHeld = shaped.flatMap((r) => {
  let cursor = 0;
  return r.spans.map((s) => {
    const place = { key: s.key, at: cursor };
    cursor += s.to + 1 - s.from;
    return place;
  });
});

const TICK_AT = years.filter((y) => y % 5 === 0).map((y) => y - first);
const align = {
  label: "Aligner les barres sur",
  noneLabel: "le calendrier",
  noneAnnounce: `Aligner les barres sur le calendrier : chaque barre part de son année d'entrée réelle, de ${first} à ${last}`,
  noneNote:
    `Une longueur est une durée, une position est une date. Deux tenures égales ne commencent pas au ` +
    `même endroit : c'est ce qui les rend impossibles à comparer d'un coup d'oeil.`,
  noneTicks: TICK_AT.map((t) => `${first + t}`),
  extent: EXTENT,
  tickAt: TICK_AT,
  bars,
  base: placeCalendar,
  options: [
    {
      key: "entry",
      label: "leur propre entrée",
      announce:
        "Aligner les barres sur leur propre entrée : toutes partent du même bord et la graduation " +
        "compte des années de présence, plus des années du calendrier",
      note:
        `Les ${shaped.length} barres partent du même bord : la graduation ne compte plus des années ` +
        `du calendrier mais des années écoulées depuis l'entrée.`,
      ticks: TICK_AT.map((t) => `${t}`),
      places: placeEntry,
    },
    {
      key: "held",
      label: "les seules années tenues",
      announce:
        "Aligner les barres sur les seules années tenues : les interruptions sont refermées et chaque " +
        "barre mesure exactement la tenure inscrite à son bout",
      note:
        `Interruptions refermées : chaque barre mesure exactement sa tenure. ${The(twinB)} passe de ` +
        `${twinB.window} à ${twinB.years} ans — la tenure ${of_(twinA)}, ${twinGap} lignes plus haut.`,
      ticks: TICK_AT.map((t) => `${t}`),
      places: placeHeld,
    },
  ],
};

const facts = beatFacts(
  shaped.map((r) => ({ key: r.code, label: r.name, value: r.years })),
  { subject: whole[0].name, declaredSequence: "années" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE WORDS A BEAT SPENDS ON ITS TITLE ARE HEIGHT IT TAKES OUT OF ITS PLOT AT THE NARROWEST FRAME,
// which is the one place the plot cannot give any back. The first form of this page ran 18 words and
// put `nocturne` 181 px past an 812 px window. This is the static sibling's own title, and the count
// it drops — sixteen — is in the caveat, in the note under the plot and in the alt text.
const title = `${whole.length} pays n'ont jamais quitté le top ${TOP} mondial des émetteurs depuis ${first}`;
const caveat =
  `${shaped.length} pays y sont passés depuis ${first} : une ligne chacun, une barre par période de ` +
  `présence. Une année vaut la même longueur dans les trois états — seule l'origine des barres change.`;
const kuwaitNote = `une seule année, ${oneYear[0].spans[0].from}`;
// The six are named IN THE GUTTER, in the accent, so this line does not have to list them again —
// which at 375 px was three wrapped lines of a window this page overflowed.
const wholeNote = `Les ${whole.length} pays en couleur n'ont jamais quitté le top ${TOP}.`;
const readingLine =
  `Lecture : changez l'alignement — les barres glissent, l'axe passe des années du calendrier aux ` +
  `années de présence. Survolez ou tabulez une ligne pour ses périodes, ses absences et son rang.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${first}-${last}, classement calculé sur les ${table.get(last).length} pays du fichier`;

const controlText = [
  align.label, align.noneLabel, align.noneAnnounce, align.noneNote, ...align.noneTicks,
  ...align.options.flatMap((o) => [o.label, o.announce, o.note, ...o.ticks]),
].join(" ");

const shapedWithDetail = shaped.map((r) => ({ ...r, detail: detailOf(r) }));

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${controlText} ${shapedWithDetail.map((r) => r.detail).join(" ")}`,
  axis: `${align.noneTicks.join(" ")} ${align.options[0].ticks.join(" ")} ${shaped.map((r) => r.name).join(" ")}`,
  annot: `${wholeNote} ${kuwaitNote}`,
  value: shaped.map((r) => r.tenureLabel).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const alt =
  `${shaped.length} lignes, une par pays, sur un axe du temps. Chaque barre est une période de ` +
  `présence dans les dix plus gros émetteurs mondiaux de CO₂. Aligné sur le calendrier, de ${first} ` +
  `à ${last}, ${whole.length} barres traversent tout le graphique sans interruption ` +
  `(${whole.map((r) => r.name).join(", ")}) ; les autres commencent tard, s'arrêtent tôt ou sont ` +
  `coupées en deux, et ${oneYear[0].name} n'apparaît qu'une seule année, ${oneYear[0].spans[0].from}. ` +
  `Aligné sur l'entrée de chaque pays, les seize barres partent du même bord et se lisent comme des ` +
  `durées : ${whole.length} à ${years.length} ans, ${twinA.name} et ${twinB.name} à ${twinA.years} ans ` +
  `chacun, ${oneYear[0].name} à un an. Aligné sur les seules années tenues, les interruptions se ` +
  `referment et ${twinB.name} raccourcit de ${twinB.window} à ${twinB.years} ans.`;

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedGanttWeb,
      props: {
        rows: shapedWithDetail,
        align,
        unitsPerCssPx: UNITS_PER_CSS_PX,
        kuwaitNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, wholeNote,
        alt: plain(alt),
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
    // AND THE REFUSED DIRECTION'S PREVIOUS RENDER COMES OFF THE DISK. A page that was refused and
    // whose last good render is still sitting there is a page that looks produced to everything
    // downstream — the verifier, a capture, a reader. Measured during this beat's own mutations.
    rmSync(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE, and leaves the
  // previous render on disk to be read as this one.
  process.exitCode = 1;
}
console.log(`\nframe ${FRAME.width} x ${shaped.length * 26} · une année = ${(FRAME.width / EXTENT).toFixed(3)} unités, dans les trois états`);
