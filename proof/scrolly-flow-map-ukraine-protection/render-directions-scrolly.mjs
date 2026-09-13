// Ukrainians under temporary protection in Europe, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `flow map` type in the scrolly format.
//
// THE SUBJECT OF `static-flow-map-ukraine-protection`, CHOREOGRAPHED. The flows, the claim and its assertions, the
// ten drawn bands and the camera fitted to them are the static beat's own; the scroll tells them with its own
// gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. Ukraine alone, the total;
//   2. the first band traced, to Germany;
//   3. the second, to Poland: half;
//   4. the eight next, one after another: 81 %;
//   5. the 21 countries too small for a band, a dot each;
//   6. the reading line, the key, the two largest named.
//
// Usage:  bun proof/scrolly-flow-map-ukraine-protection/render-directions-scrolly.mjs

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
import { flowGeometry } from "./flow-geometry.mjs";
import { DirectedFlowMapScrolly } from "./DirectedFlowMapScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const NB = "\u00A0";
const ORIGIN = "UKR";
const SUBJECT = "DEU";
/** The static beat's rule: bands to the ten largest hosts, the camera fitted to them. */
const DRAWN = 10;
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const NAMES = {
  DEU: ["Allemagne", "l’Allemagne"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"], ESP: ["Espagne", "l’Espagne"],
  ROU: ["Roumanie", "la Roumanie"], SVK: ["Slovaquie", "la Slovaquie"], NLD: ["Pays-Bas", "les Pays-Bas"], IRL: ["Irlande", "l’Irlande"],
  BEL: ["Belgique", "la Belgique"], AUT: ["Autriche", "l’Autriche"], NOR: ["Norvège"], BGR: ["Bulgarie"], CHE: ["Suisse"], FIN: ["Finlande"],
  PRT: ["Portugal"], FRA: ["France"], DNK: ["Danemark"], LTU: ["Lituanie"], HUN: ["Hongrie"], SWE: ["Suède"], GRC: ["Grèce"], ITA: ["Italie"],
  LVA: ["Lettonie"], EST: ["Estonie"], HRV: ["Croatie"], CYP: ["Chypre"], SVN: ["Slovénie"], ISL: ["Islande"], LUX: ["Luxembourg"],
  MLT: ["Malte"], LIE: ["Liechtenstein"],
};

// ── the flows, and the static beat's own assertions ────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const flows = csv.slice(1).map((l) => {
  const c = l.split(",");
  return { code: c[at("code")], month: c[at("month")], people: Number(c[at("people")]) };
});
for (const f of flows) {
  if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed in this beat`);
  if (!Number.isFinite(f.people) || f.people <= 0) throw new Error(`a flow has no usable count: ${JSON.stringify(f)}`);
}
const month = flows[0].month;
if (flows.some((f) => f.month !== month)) throw new Error("the plate draws one month and the file holds more than one");
const total = flows.reduce((s, f) => s + f.people, 0);
const ranked = [...flows].sort((a, b) => b.people - a.people);
const topTwoShare = ((ranked[0].people + ranked[1].people) / total) * 100;
if (ranked[0].code !== SUBJECT) throw new Error(`the subject is the largest host; that is ${ranked[0].code}`);
if (!(topTwoShare > 45 && topTwoShare < 55)) throw new Error(`the headline says the two largest hosts take about half; they take ${topTwoShare.toFixed(1)} %`);
if (!(total > 4e6)) throw new Error(`the headline says over four million; the file totals ${total}`);
for (const f of ranked.slice(0, DRAWN)) if (NAMES[f.code].length < 2) throw new Error(`${f.code} has a band and no article filed for the cards`);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const map = flowGeometry(geo, { window: WINDOW, width: 1000 });
for (const f of flows) if (!map.seats[f.code]) throw new Error(`${f.code} has no seat inside the frame`);
const origin = map.seats[ORIGIN];
if (!origin) throw new Error(`the origin ${ORIGIN} has no seat inside the frame`);
const drawn = ranked.slice(0, DRAWN);
const drawnShare = (drawn.reduce((s, f) => s + f.people, 0) / total) * 100;
const rest = ranked.slice(DRAWN);

/** THE BANDS FAN OUT: each bows away from the fan's mean bearing, so two bands leaving on close bearings part
 *  instead of lying on each other. */
const mean = drawn.reduce((acc, f) => {
  const [x, y] = map.seats[f.code];
  const len = Math.hypot(x - origin[0], y - origin[1]);
  return [acc[0] + (x - origin[0]) / len, acc[1] + (y - origin[1]) / len];
}, [0, 0]);
const bandPath = ([x, y]) => {
  const dx = x - origin[0];
  const dy = y - origin[1];
  const len = Math.hypot(dx, dy);
  const side = Math.sign(mean[0] * dy - mean[1] * dx) || 1;
  const bow = len * 0.14 * side;
  const cx = (origin[0] + x) / 2 - (dy / len) * bow;
  const cy = (origin[1] + y) / 2 + (dx / len) * bow;
  return `M${origin[0]} ${origin[1]}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`;
};

/** The camera: the origin and the drawn hosts' seats, padded — the static beat's own box. */
const pts = [origin, ...drawn.map((f) => map.seats[f.code])];
const fx0 = Math.min(...pts.map((p) => p[0]));
const fx1 = Math.max(...pts.map((p) => p[0]));
const fy0 = Math.min(...pts.map((p) => p[1]));
const fy1 = Math.max(...pts.map((p) => p[1]));
const padX = (fx1 - fx0) * 0.16;
const padY = (fy1 - fy0) * 0.22;
const focus = { x: fx0 - padX, y: fy0 - padY, w: fx1 - fx0 + 2 * padX, h: fy1 - fy0 + 2 * padY };

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const thousands = (v) => `${n0(v / 1000)}${NB}k`;
const [first, second] = drawn;
console.log(`${flows.length} pays · total ${total} · ${first.code}+${second.code} ${topTwoShare.toFixed(1)} % · ${DRAWN} rubans ${drawnShare.toFixed(1)} %\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire — l’Allemagne et la Pologne en accueillent la moitié`,
  `${one(total / 1e6)} millions d’Ukrainiens sous protection temporaire en Europe`,
  `La protection temporaire, pays par pays`,
];
const [year, mm] = month.split("-");
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const when = `${MONTHS[Number(mm) - 1]} ${year}`;
const prose = [
  [`En ${when}, ${n0(total)} Ukrainiens bénéficient de la protection temporaire dans ${flows.length} pays européens.`],
  [`Un ruban par pays d’accueil ; sa largeur est le nombre de personnes. Le plus large va en ${NAMES[first.code][0]} : ${n0(first.people)} personnes, ${one((first.people / total) * 100)}${NB}%.`],
  [`Le deuxième, en ${NAMES[second.code][0]} : ${n0(second.people)}. À elles deux, ${one(topTwoShare)}${NB}% : la moitié.`],
  [`Les huit pays suivants, de ${NAMES[drawn[2].code][1]} à ${NAMES[drawn[DRAWN - 1].code][1]}. Les ${DRAWN} rubans portent ${Math.round(drawnShare)}${NB}% des personnes.`],
  [`Les ${rest.length} autres pays en accueillent ${Math.round(100 - drawnShare)}${NB}% : un point chacun, trop peu pour un ruban.`],
  [`Lecture : les rubans ne sont pas des itinéraires, personne n’a suivi ces courbes. Seule leur largeur est une mesure.`],
];
const source = `Source : Eurostat, bénéficiaires de la protection temporaire (migr_asytpsm), ${month} · contours Natural Earth 50 m, projection équivalente`;
const words = {
  unit: `personnes sous protection temporaire, ${when}`,
  totalNote: `${n0(total)} personnes`,
  count: `{p}${NB}% des ${n0(total)} personnes`,
  othersNote: `${rest.length} autres pays${NB}: ${Math.round(100 - drawnShare)}${NB}%`,
  drawnNote: `${DRAWN} rubans, ${Math.round(drawnShare)}${NB}% des personnes`,
  othersKey: `${rest.length} autres pays, trop petits pour un ruban`,
};
const keySizes = [1e6, 1e5].map((people) => ({ people, label: `${n0(people)} personnes` }));
const bands = drawn.map((f) => ({
  code: f.code,
  name: NAMES[f.code][0],
  people: f.people,
  seat: map.seats[f.code],
  d: bandPath(map.seats[f.code]),
  subject: f.code === SUBJECT,
  label: `${NAMES[f.code][0]} ${thousands(f.people)}`,
}));
const others = rest.map((f) => ({ code: f.code, seat: map.seats[f.code] }));
const alt =
  `Carte des flux : un ruban part de l’Ukraine vers chacun des ${DRAWN} principaux pays d’accueil, sa largeur étant le nombre de personnes ` +
  `sous protection temporaire en ${when}. ${n0(total)} personnes au total ; l’Allemagne et la Pologne en accueillent ${one(topTwoShare)} %, ` +
  `les ${DRAWN} rubans ${Math.round(drawnShare)} %.`;

/** One state per card; see `flow-drive.mjs` for what each field paints. */
const STATES = [
  { bands: 0, others: 0, pair: 0, key: 0 },
  { bands: 1, others: 0, pair: 0, key: 0 },
  { bands: 2, others: 0, pair: 1, key: 0 },
  { bands: DRAWN, others: 0, pair: 0, key: 0 },
  { bands: DRAWN, others: 1, pair: 0, key: 0 },
  { bands: DRAWN, others: 1, pair: 1, key: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${bands.map((b) => b.label).join(" ")} ${words.drawnNote} ${words.othersKey} ${keySizes.map((k) => k.label).join(" ")}`,
  annot: "",
  value: `${words.totalNote} ${words.count} ${words.othersNote} Ukraine 0123456789,`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((file) => file.endsWith(".md"))
  .map((file) => readDirection(join(DIRECTIONS, file)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "flow-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((name) => name.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["ukraine", "allemagne", "pologne", "dix-rubans", "autres-pays", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedFlowMapScrolly, {
          land: map.land,
          width: map.width,
          height: map.height,
          focus,
          origin,
          originName: "Ukraine",
          originCode: ORIGIN,
          bands,
          others,
          total,
          keySizes,
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyFlowState",
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
