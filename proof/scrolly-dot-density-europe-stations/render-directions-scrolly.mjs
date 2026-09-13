// Europe's low-carbon power stations, one dot each, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `dot density` type in the scrolly format.
//
// THE SUBJECT OF `static-dot-density-europe-stations`, CHOREOGRAPHED. The stations, the claim and its assertions
// are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the land, empty;
//   2. the stations arriving fuel by fuel, counted;
//   3. the 72 nuclear sites arriving, ringed, the rest stepping back;
//   4. every dot taking the area of its capacity;
//   5. the camera onto the country with most of the nuclear sites, its own averages;
//   6. back to one dot per station, and the database's limit.
//
// Usage:  bun proof/scrolly-dot-density-europe-stations/render-directions-scrolly.mjs

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
import { dotGeometry } from "./dot-geometry.mjs";
import { DirectedDotDensityScrolly } from "./DirectedDotDensityScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const SUBJECT = "Nuclear";
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
/** The order the other fuels arrive in: the most numerous first. */
const FUEL_WORDS = { Solar: "solaire", Wind: "éolien", Hydro: "hydraulique", Biomass: "biomasse", Geothermal: "géothermie", "Wave and Tidal": "marées", Nuclear: "nucléaire" };
const COUNTRY = { France: ["France", "en France"], "United Kingdom": ["Royaume-Uni", "au Royaume-Uni"], Germany: ["Allemagne", "en Allemagne"], Russia: ["Russie", "en Russie"] };

// ── the stations, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const stations = csv.slice(1).map((l) => {
  const r = Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
  return { country: r.country, fuel: r.fuel, mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
});
for (const s of stations)
  if (!Number.isFinite(s.lon) || !Number.isFinite(s.lat) || !Number.isFinite(s.mw)) throw new Error(`a station has no usable coordinates or capacity: ${JSON.stringify(s)}`);
for (const s of stations) if (!FUEL_WORDS[s.fuel]) throw new Error(`${s.fuel} has no French name filed in this beat`);
const total = stations.length;
const nuclear = stations.filter((s) => s.fuel === SUBJECT);
const mwAll = stations.reduce((a, s) => a + s.mw, 0);
const mwNuclear = nuclear.reduce((a, s) => a + s.mw, 0);
const shareSites = (nuclear.length / total) * 100;
const shareCapacity = (mwNuclear / mwAll) * 100;
if (!(shareSites < 1)) throw new Error(`the headline says nuclear is under 1 % of the sites; it is ${shareSites.toFixed(2)} %`);
if (!(shareCapacity > 30)) throw new Error(`the headline says nuclear carries over 30 % of the capacity; it is ${shareCapacity.toFixed(1)} %`);
const byFuel = {};
for (const s of stations) {
  byFuel[s.fuel] ??= { n: 0, mw: 0 };
  byFuel[s.fuel].n++;
  byFuel[s.fuel].mw += s.mw;
}
const perSite = Object.entries(byFuel).map(([fuel, v]) => ({ fuel, mw: v.mw / v.n })).sort((a, b) => b.mw - a.mw);
if (perSite[0].fuel !== SUBJECT) throw new Error(`a card says nuclear is the most concentrated; ${perSite[0].fuel} is`);
const others = Object.entries(byFuel).filter(([f]) => f !== SUBJECT).sort((a, b) => b[1].n - a[1].n).map(([f]) => f);

/** The close-up's country: the one holding most of the subject's sites, and its own averages. */
const sitesBy = {};
for (const s of nuclear) sitesBy[s.country] = (sitesBy[s.country] ?? 0) + 1;
const [focus, focusSites] = Object.entries(sitesBy).sort((a, b) => b[1] - a[1])[0];
if (!COUNTRY[focus]) throw new Error(`${focus} now holds most of the nuclear sites and has no French name filed here`);
const inFocus = stations.filter((s) => s.country === focus);
const avg = (fuel) => {
  const list = inFocus.filter((s) => s.fuel === fuel);
  if (!list.length) throw new Error(`the close-up compares ${fuel} in ${focus}, which has none`);
  return list.reduce((a, s) => a + s.mw, 0) / list.length;
};
const focusNuclear = avg(SUBJECT);
const focusSolar = avg("Solar");
if (!(focusNuclear / focusSolar > 100)) throw new Error(`the close-up says a nuclear site outweighs a solar site by orders of magnitude in ${focus}; the ratio is ${(focusNuclear / focusSolar).toFixed(0)}`);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const map = dotGeometry(geo, stations, { window: WINDOW, width: 1000 });
const fuelList = [...others, SUBJECT];
const drawn = stations.map((s) => [...map.place(s), fuelList.indexOf(s.fuel), Math.round(s.mw * 10) / 10]);
const focusPts = inFocus.map((s) => map.place(s)).filter(([x, y]) => x > -50 && x < map.width + 50 && y > -50 && y < map.height + 50);
// A station is placed in the frame or its margin; one outside both is a projection error, not a far place.
if (drawn.some(([x, y]) => x < -map.margin.x || x > map.width + map.margin.x || y < -map.margin.y || y > map.height + map.margin.y))
  throw new Error("a station lands outside the margin the land is drawn in");
const fx0 = Math.min(...focusPts.map((p) => p[0]));
const fx1 = Math.max(...focusPts.map((p) => p[0]));
const fy0 = Math.min(...focusPts.map((p) => p[1]));
const fy1 = Math.max(...focusPts.map((p) => p[1]));
const aspect = map.width / map.height;
let zw = (fx1 - fx0) * 1.15;
let zh = (fy1 - fy0) * 1.15;
if (zw / zh < aspect) zw = zh * aspect;
else zh = zw / aspect;
const zoomBox = { x: (fx0 + fx1) / 2 - zw / 2, y: (fy0 + fy1) / 2 - zh / 2, w: zw, h: zh };
/** The whole-map view: the box holding the stations between the 1st and 99th percentile on each axis, padded —
 *  not the window, whose corners are Greenland and the Sahara. On a phone the window fitted to the width left
 *  Europe a strip in the middle of the stage. */
const pctile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))];
const inFrame = drawn.filter(([x, y]) => x >= 0 && x <= map.width && y >= 0 && y <= map.height);
const ex0 = pctile(inFrame.map((d) => d[0]), 0.01);
const ex1 = pctile(inFrame.map((d) => d[0]), 0.99);
const ey0 = pctile(inFrame.map((d) => d[1]), 0.01);
const ey1 = pctile(inFrame.map((d) => d[1]), 0.99);
const europeBox = { x: ex0 - (ex1 - ex0) * 0.05, y: ey0 - (ey1 - ey0) * 0.05, w: (ex1 - ex0) * 1.1, h: (ey1 - ey0) * 1.1 };

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const listOf = (xs) => `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;
const [focusName, inFocusWords] = COUNTRY[focus];
console.log(`${total} centrales · nucléaire ${nuclear.length} (${shareSites.toFixed(2)} %) · ${shareCapacity.toFixed(1)} % de la puissance · ${focus} ${focusSites} sites, ${focusNuclear.toFixed(0)} MW contre ${focusSolar.toFixed(1)} MW\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${nuclear.length} réacteurs sur ${n0(total)} centrales bas-carbone — et un tiers de la puissance`,
  `${nuclear.length} sites nucléaires, un tiers de la puissance bas-carbone`,
  `Où sont les centrales bas-carbone d’Europe`,
];
const prose = [
  [`La base mondiale des centrales du WRI recense ${n0(total)} centrales bas-carbone dans ce cadre, chacune à ses propres coordonnées.`],
  [`Un point par centrale, filière par filière : ${listOf(others.map((f) => FUEL_WORDS[f]))}. ${n0(total - nuclear.length)} points.`],
  [`Il en manque ${nuclear.length} : les sites nucléaires. ${one(shareSites)}${NB}% des centrales seulement.`],
  [`Donnons à chaque point la surface de sa puissance. Le solaire devient poussière ; les ${nuclear.length} sites nucléaires portent ${one(shareCapacity)}${NB}% de la puissance.`],
  [`${inFocusWords[0].toUpperCase()}${inFocusWords.slice(1)}, qui compte ${focusSites} des ${nuclear.length} sites, un site nucléaire pèse en moyenne ${n0(focusNuclear)}${NB}MW ; un site solaire, ${one(focusSolar)}${NB}MW.`],
  [`Lecture : un point, une centrale, à ses coordonnées. La base recense les centrales qu’elle connaît : le petit solaire et le petit éolien y sont sous-représentés.`],
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · contours Natural Earth 50 m, projection équivalente";
const words = {
  unit: "centrales bas-carbone recensées",
  count: `{n} centrales`,
  subjectNote: `${nuclear.length} sites nucléaires${NB}: ${one(shareSites)}${NB}% des centrales`,
  weightNote: `${nuclear.length} sites nucléaires${NB}: ${one(shareCapacity)}${NB}% de la puissance`,
  zoomNote: `${focusName}${NB}: ${n0(focusNuclear)}${NB}MW par site nucléaire, ${one(focusSolar)}${NB}MW par site solaire`,
  dotIs: "un point = une centrale bas-carbone",
  subjectIs: `${nuclear.length} sites nucléaires`,
  weightIs: "surface proportionnelle à la puissance",
  limit: "La base recense les centrales qu’elle connaît ; le petit solaire et le petit éolien y sont sous-représentés.",
};
const sizes = [100, 1000, 5000].map((mw) => ({ mw, label: `${n0(mw)}${NB}MW` }));
const alt =
  `Carte de l’Europe où chacune des ${n0(total)} centrales bas-carbone est un point à ses coordonnées. Les ${nuclear.length} sites nucléaires, ` +
  `cerclés, ne sont que ${one(shareSites)} % des centrales mais portent ${one(shareCapacity)} % de la puissance installée.`;

/** One state per card; see `dot-drive.mjs` for what each field paints. */
const STATES = [
  { arrive: 0, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 1, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 1 },
  { arrive: 1, subject: 1, fade: 0, weight: 0, zoom: 0 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.dotIs} ${words.subjectIs} ${words.weightIs} ${words.limit} ${sizes.map((s) => s.label).join(" ")}`,
  annot: "",
  value: `${words.count} ${words.subjectNote} ${words.weightNote} ${words.zoomNote} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "dot-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["carte", "centrales", "nucleaire", "puissance", "gros-plan", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDotDensityScrolly, {
          width: map.width,
          height: map.height,
          land: map.land,
          stations: drawn,
          fuels: fuelList,
          arrival: others.map((f) => fuelList.indexOf(f)),
          subjectFuel: fuelList.indexOf(SUBJECT),
          zoomBox,
          europeBox,
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
        apply: "applyDotState",
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
