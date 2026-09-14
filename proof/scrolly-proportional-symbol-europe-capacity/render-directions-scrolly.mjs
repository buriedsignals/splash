// Europe's low-carbon power stations, one hollow circle each sized by capacity, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `proportional symbol` type in the scrolly format.
//
// THE SUBJECT OF `static-proportional-symbol-europe-capacity`, CHOREOGRAPHED. The stations, the scale, the claim and
// its assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the largest station alone, named, and the counter: its share of the sites and of the power;
//   2. the ten largest;
//   3. the hundred largest: a hundredth of the sites, over a third of the power;
//   4. the nuclear sites isolated, the camera on the country with most of them;
//   5. all 8,900: the field closes;
//   6. the static plate's cut and its key.
//
// Usage:  bun proof/scrolly-proportional-symbol-europe-capacity/render-directions-scrolly.mjs

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
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { symbolGeometry } from "./symbol-geometry.mjs";
import { DirectedProportionalScrolly } from "./DirectedProportionalScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const SUBJECT = "Nuclear";
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const TOP = 100;
/** The static plate's cut: the stations it draws, the ones carrying most of the weight. */
const THRESHOLD = 400;
/** The largest station, named from its place: the dataset carries no names. */
const LARGEST = { country: "Ukraine", fuel: "Nuclear", mw: 6000, lon: 34.5863, lat: 47.5119, name: "Zaporijia" };
const COUNTRY = { France: ["France", "en France"], Russia: ["Russie", "en Russie"], Ukraine: ["Ukraine", "en Ukraine"] };

// ── the stations, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const stations = csv
  .slice(1)
  .map((l) => {
    const r = Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
    return { country: r.country, fuel: r.fuel, mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
  })
  .sort((a, b) => b.mw - a.mw);
for (const s of stations)
  if (!Number.isFinite(s.lon) || !Number.isFinite(s.lat) || !Number.isFinite(s.mw)) throw new Error(`a station has no usable coordinates or capacity: ${JSON.stringify(s)}`);
const total = stations.length;
const mwAll = stations.reduce((a, s) => a + s.mw, 0);
const cumulative = [];
let run = 0;
for (const s of stations) cumulative.push(((run += s.mw) / mwAll) * 100);
const [first] = stations;
if (!(first.country === LARGEST.country && first.fuel === LARGEST.fuel && first.mw === LARGEST.mw && Math.abs(first.lon - LARGEST.lon) < 0.01 && Math.abs(first.lat - LARGEST.lat) < 0.01))
  throw new Error(`card 1 names ${LARGEST.name} as the largest station; the largest is ${JSON.stringify(first)}`);
if (!(TOP / total < 0.02)) throw new Error(`the headline calls ${TOP} of ${total} a hundredth of the sites`);
const shareTop = cumulative[TOP - 1];
if (!(shareTop > 33)) throw new Error(`the headline says the ${TOP} largest carry over a third of the power; they carry ${shareTop.toFixed(1)} %`);
const nuclear = stations.filter((s) => s.fuel === SUBJECT);
const shareNuclearSites = (nuclear.length / total) * 100;
const shareNuclearMw = (nuclear.reduce((a, s) => a + s.mw, 0) / mwAll) * 100;
if (!(shareNuclearSites < 1 && shareNuclearMw > 30)) throw new Error(`card 4 says nuclear is under 1 % of the sites and over 30 % of the power; ${shareNuclearSites.toFixed(2)} and ${shareNuclearMw.toFixed(1)}`);
const nuclearInTop = stations.slice(0, TOP).filter((s) => s.fuel === SUBJECT).length;
if (!(nuclearInTop * 2 > TOP)) throw new Error(`card 3 says most of the hundred largest are nuclear; ${nuclearInTop} are`);
const cutCount = stations.filter((s) => s.mw >= THRESHOLD).length;
const shareCut = cumulative[cutCount - 1];
if (!(shareCut > 50)) throw new Error(`the cut note says the stations of ${THRESHOLD} MW or more carry over half the power; ${shareCut.toFixed(1)} %`);
const sitesBy = {};
for (const s of nuclear) sitesBy[s.country] = (sitesBy[s.country] ?? 0) + 1;
const [focus, focusSites] = Object.entries(sitesBy).sort((a, b) => b[1] - a[1])[0];
if (!COUNTRY[focus]) throw new Error(`${focus} now holds most of the nuclear sites and has no French name filed here`);
console.log(`${total} centrales · top ${TOP} ${shareTop.toFixed(1)} % (${nuclearInTop} nucléaires) · nucléaire ${nuclear.length} (${shareNuclearSites.toFixed(2)} %, ${shareNuclearMw.toFixed(1)} %) · ≥ ${THRESHOLD} MW ${cutCount} (${shareCut.toFixed(1)} %) · ${focus} ${focusSites}\n`);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const map = symbolGeometry(geo, stations, { window: WINDOW, width: 1000 });
const fuelList = [...new Set(stations.map((s) => s.fuel))];
const drawn = stations.map((s) => [...map.place(s), fuelList.indexOf(s.fuel), Math.round(s.mw * 10) / 10]);
if (drawn.some(([x, y]) => x < -map.margin.x || x > map.width + map.margin.x || y < -map.margin.y || y > map.height + map.margin.y))
  throw new Error("a station lands outside the margin the land is drawn in");
const aspect = map.width / map.height;
const boxAround = (pts, pad) => {
  const x0 = Math.min(...pts.map((p) => p[0]));
  const x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  let w = (x1 - x0) * pad;
  let h = (y1 - y0) * pad;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  // Centred on the subject both ways: the close-up puts its subject in the middle of the stage.
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
};
const zoomBox = boxAround(nuclear.filter((s) => s.country === focus).map((s) => map.place(s)), 1.5);
const pctile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))];
const inFrame = drawn.filter(([x, y]) => x >= 0 && x <= map.width && y >= 0 && y <= map.height);
const ex0 = pctile(inFrame.map((d) => d[0]), 0.01);
const ex1 = pctile(inFrame.map((d) => d[0]), 0.99);
const ey0 = pctile(inFrame.map((d) => d[1]), 0.01);
const ey1 = pctile(inFrame.map((d) => d[1]), 0.99);
const europeBox = { x: ex0 - (ex1 - ex0) * 0.05, y: ey0 - (ey1 - ey0) * 0.05, w: (ex1 - ex0) * 1.1, h: (ey1 - ey0) * 1.1 };
const [lx, ly] = map.place(first);
if (!(lx > europeBox.x && lx < europeBox.x + europeBox.w && ly > europeBox.y && ly < europeBox.y + europeBox.h)) throw new Error(`card 1 names ${LARGEST.name}, which the whole-map camera does not hold`);

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const [focusName, inFocus] = COUNTRY[focus];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe`,
  `Un centième des sites, plus d’un tiers de la puissance`,
  `La puissance tient dans peu de sites`,
];
const prose = [
  [`La base du WRI recense ${n0(total)} centrales bas-carbone en Europe. Rangeons-les de la plus puissante à la plus petite. La première, ${LARGEST.name}, en Ukraine : ${n0(first.mw)}${NB}MW, ${one(cumulative[0])}${NB}% de la puissance à elle seule.`],
  [`Les dix plus puissantes : ${one((10 / total) * 100)}${NB}% des sites, ${one(cumulative[9])}${NB}% de la puissance.`],
  [`Les ${TOP} plus puissantes : ${one((TOP / total) * 100)}${NB}% des sites, ${one(shareTop)}${NB}% de la puissance. ${nuclearInTop} sont nucléaires.`],
  [`Le nucléaire seul : ${nuclear.length} sites, ${one(shareNuclearSites)}${NB}% des centrales, ${one(shareNuclearMw)}${NB}% de la puissance. ${inFocus[0].toUpperCase()}${inFocus.slice(1)}, ${focusSites} sites.`],
  [`Ajoutons toutes les autres, jusqu’à la ${n0(total)}e. Le champ se referme : les petites centrales sont trop nombreuses pour se lire.`],
  [`D’où la coupe de la carte : les ${cutCount} centrales de ${THRESHOLD}${NB}MW ou plus, ${one((cutCount / total) * 100)}${NB}% des sites et ${one(shareCut)}${NB}% de la puissance. Lecture : l’aire du cercle est la puissance ; les cercles sont creux, un gros n’efface pas les petits.`],
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · contours Natural Earth 50 m, projection équivalente";
const words = {
  unit: "centrales bas-carbone, de la plus puissante à la plus petite",
  counter: `{n} centrales · {sites} des sites · {mw} de la puissance`,
  total: `${n0(total)} centrales`,
  subjectNote: `${nuclear.length} sites nucléaires${NB}: ${one(shareNuclearSites)}${NB}% des sites, ${one(shareNuclearMw)}${NB}% de la puissance`,
  cutNote: `${cutCount} centrales de ${THRESHOLD}${NB}MW ou plus${NB}: ${one(shareCut)}${NB}% de la puissance`,
  circleIs: "un cercle = une centrale, aire proportionnelle à la puissance",
  cut: `Sous ${THRESHOLD}${NB}MW, non dessiné${NB}: à ${n0(total)} cercles le champ se referme. Le petit solaire et le petit éolien sont sous-représentés dans la base.`,
};
const sizes = [4000, 1000, 400].map((mw) => ({ mw, label: `${n0(mw)}${NB}MW` }));
const alt =
  `Carte de l’Europe : chaque centrale bas-carbone est un cercle creux à ses coordonnées, d’aire proportionnelle à sa puissance. ` +
  `Les ${TOP} plus puissantes, ${one((TOP / total) * 100)} % des ${n0(total)} sites, portent ${one(shareTop)} % de la puissance ; ` +
  `les ${nuclear.length} sites nucléaires ${one(shareNuclearMw)} %.`;

/** One state per card; see `symbol-drive.mjs` for what each field paints. */
const STATES = [
  { level: 0, largest: 1, subject: 0, zoom: 0, cut: 0 },
  { level: 1, largest: 1, subject: 0, zoom: 0, cut: 0 },
  { level: 2, largest: 0, subject: 0, zoom: 0, cut: 0 },
  { level: 2, largest: 0, subject: 1, zoom: 1, cut: 0 },
  { level: Math.log10(total), largest: 0, subject: 0, zoom: 0, cut: 0 },
  { level: Math.log10(cutCount), largest: 0, subject: 0, zoom: 0, cut: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.circleIs} ${words.cut} ${sizes.map((s) => s.label).join(" ")}`,
  annot: `${LARGEST.name} ${n0(first.mw)} MW`,
  value: `${words.counter} ${words.total} ${words.subjectNote} ${words.cutNote} 0123456789,%`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "symbol-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["la-plus-grosse", "dix", "cent", "nucleaire", "toutes", "coupe"][i], prose: p })),
      reveal: {
        element: createElement(DirectedProportionalScrolly, {
          width: map.width,
          height: map.height,
          land: map.land,
          stations: drawn,
          subjectFuel: fuelList.indexOf(SUBJECT),
          cumulative: cumulative.map((v) => Math.round(v * 100) / 100),
          threshold: THRESHOLD,
          europeBox,
          zoomBox,
          largest: `${LARGEST.name} · ${n0(first.mw)}${NB}MW`,
          sizes,
          tints: plateTints(direction),
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
        apply: "applySymbolState",
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
