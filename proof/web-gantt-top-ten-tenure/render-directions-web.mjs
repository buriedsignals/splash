// twin/proof/web-gantt-top-ten-tenure/render-directions-web.mjs
//
// Who held a place in the world's ten largest CO₂ emitters, and for how long, 1990-2024 — rendered
// once per FILED DIRECTION into a self-contained interactive page.
//
// EVERY SPAN IS COMPUTED FROM THE SAME RANKING THE BUMP BEAT READS, taken as tenure rather than as
// position. Interruptions are found, not listed: a row with more than one span had a gap, and the
// page says which years.
//
// Usage:  bun proof/web-gantt-top-ten-tenure/render-directions-web.mjs

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
import { DirectedGanttWeb } from "./DirectedGanttWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const TOP = 10;
const plain = (s) => plainSpaces(s);
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", DEU: "Allemagne",
  GBR: "Royaume-Uni", UKR: "Ukraine", ITA: "Italie", KOR: "Corée du Sud", CAN: "Canada",
  MEX: "Mexique", IRN: "Iran", SAU: "Arabie saoudite", IDN: "Indonésie", POL: "Pologne",
  ZAF: "Afrique du Sud", FRA: "France", BRA: "Brésil", AUS: "Australie", KAZ: "Kazakhstan",
  TUR: "Turquie", ESP: "Espagne", KWT: "Koweït", VNM: "Viêt Nam", THA: "Thaïlande",
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return { entity: c[at("Entity")], code: c[at("Code")], year: Number(c[at("Year")]), tonnes: Number(c[header.length - 1]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.tonnes));

const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
const table = new Map(years.map((y) => [y, rows.filter((r) => r.year === y).sort((a, b) => b.tonnes - a.tonnes)]));
const heldIn = new Map(); // code -> Set(years)
const bestRank = new Map();
for (const y of years)
  table.get(y).slice(0, TOP).forEach((r, i) => {
    if (!heldIn.has(r.code)) heldIn.set(r.code, new Set());
    heldIn.get(r.code).add(y);
    bestRank.set(r.code, Math.min(bestRank.get(r.code) ?? Infinity, i + 1));
  });

const members = [...heldIn.keys()];
for (const code of members)
  if (!NAMES[code]) throw new Error(`${code} held a place and has no French name filed in this beat`);

const first = years[0];
const last = years[years.length - 1];
const spansOf = (code) => {
  const held = [...heldIn.get(code)].sort((a, b) => a - b);
  const out = [];
  for (const y of held) {
    const open = out[out.length - 1];
    if (open && open.to === y - 1) open.to = y;
    else out.push({ from: y, to: y });
  }
  return out.map((s) => ({ ...s, open: s.to === last }));
};

const shaped = members
  .map((code) => {
    const spans = spansOf(code);
    const held = heldIn.get(code).size;
    const whole = held === years.length;
    const gaps = [];
    for (let i = 1; i < spans.length; i += 1) gaps.push(`${spans[i - 1].to + 1}${spans[i].from - 1 > spans[i - 1].to + 1 ? `–${spans[i].from - 1}` : ""}`);
    return {
      code,
      name: NAMES[code],
      spans,
      years: held,
      whole,
      tenureLabel: `${held} an${held > 1 ? "s" : ""}`,
      detail:
        `${NAMES[code]} · ${held} année${held > 1 ? "s" : ""} dans le top ${TOP} sur ${years.length} · ` +
        spans.map((s) => (s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`)).join(", ") +
        ` · meilleur rang atteint : ${bestRank.get(code)}` +
        (gaps.length ? ` · absente en ${gaps.join(", ")}` : "") +
        (spans[spans.length - 1].open ? " · toujours présente au dernier relevé" : ""),
    };
  })
  .sort((a, b) => b.years - a.years || a.spans[0].from - b.spans[0].from);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const whole = shaped.filter((r) => r.whole);
const interrupted = shaped.filter((r) => r.spans.length > 1);
const oneYear = shaped.filter((r) => r.years === 1);
if (!(whole.length >= 4 && whole.length < shaped.length))
  throw new Error(`the headline says a handful held the place throughout; ${whole.length} of ${shaped.length} did`);
console.log(
  `${shaped.length} pays ont tenu une place dans le top ${TOP} entre ${first} et ${last} · ` +
    `${whole.length} l'ont tenue chaque année (${whole.map((r) => r.name).join(", ")}) · ` +
    `${interrupted.length} interrompus · ${oneYear.length} sur une seule année\n`,
);
console.table(shaped.map((r) => ({ pays: r.name, ans: r.years, périodes: r.spans.map((s) => (s.from === s.to ? s.from : `${s.from}-${s.to}`)).join(" "), "meilleur rang": bestRank.get(r.code) })));

const facts = beatFacts(
  shaped.map((r) => ({ key: r.code, label: r.name, value: r.years })),
  { subject: whole[0].name, declaredSequence: "années" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const xTicks = years.filter((y) => y % 5 === 0);

const title = `Entre ${first} et ${last}, ${shaped.length} pays sont passés par le top ${TOP} mondial des émetteurs — ${whole.length} n'en sont jamais sortis`;
const caveat =
  `Une ligne par pays, une barre par période de présence dans les ${TOP} premiers émetteurs ` +
  `mondiaux de CO₂. Un gantt répond à « combien de temps » et refuse « à quelle hauteur » : la ` +
  `position verticale n'est plus un rang. Une barre encore ouverte au dernier relevé est dessinée ` +
  `en pointe, pas coupée net.`;
const wholeNote = `Les ${whole.length} pays en couleur n'ont jamais quitté le top ${TOP} : ${whole.map((r) => r.name).join(", ")}.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une ligne pour lire le nombre d'années tenues, les ` +
  `périodes exactes, le MEILLEUR RANG atteint pendant ce temps et les années d'absence — la ` +
  `hauteur qu'un gantt abandonne pour pouvoir mesurer la durée.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${first}-${last}, classement calculé sur les ${table.get(last).length} pays du fichier`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${xTicks.join(" ")} ${shaped.map((r) => r.name).join(" ")}`,
  annot: wholeNote,
  value: shaped.map((r) => r.tenureLabel).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
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
  try {
    await renderWeb({
      component: DirectedGanttWeb,
      props: {
        rows: shaped,
        years,
        xTicks,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, wholeNote,
        alt:
          `${shaped.length} lignes, une par pays, sur un axe des années allant de ${first} à ` +
          `${last}. Chaque barre est une période de présence dans les dix plus gros émetteurs ` +
          `mondiaux. ${whole.length} barres traversent tout le graphique sans interruption ` +
          `(${whole.map((r) => r.name).join(", ")}) ; les autres commencent tard, s'arrêtent tôt ou ` +
          `sont coupées en deux. ${oneYear.length > 0 ? `${oneYear.map((r) => r.name).join(", ")} n'apparaît qu'une seule année.` : ""}`,
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
