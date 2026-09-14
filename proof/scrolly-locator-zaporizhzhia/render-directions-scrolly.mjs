// Where Europe's largest low-carbon power station is, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `locator` type in the scrolly format.
//
// THE SUBJECT OF `static-locator-zaporizhzhia`, CHOREOGRAPHED. The station, the unreported country, the named places
// by their stated rules and the assertions are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. Europe, its largest low-carbon stations;
//   2. Ukraine outlined: the one country with no reported 2024 generation;
//   3. the camera closes on the region;
//   4. countries, settlements and water named;
//   5. the station ringed and named;
//   6. the camera eases back: installed capacity, never output.
//
// Usage:  bun proof/scrolly-locator-zaporizhzhia/render-directions-scrolly.mjs

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
import { locatorGeometry } from "./locator-geometry.mjs";
import { DirectedLocatorScrolly } from "./DirectedLocatorScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const NB = " ";
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const TOPS = 4;
const FRENCH_COUNTRY = { Ukraine: "Ukraine", France: "France", Russia: "Russie", Romania: "Roumanie", Moldova: "Moldavie", Belarus: "Biélorussie" };
const FRENCH_PLACE = { Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Rostov: "Rostov", Bucharest: "Bucarest" };
/** A country's name is set where a reader sees the country, declared in degrees and checked to fall inside it. */
const AREAS = [
  { iso: "UKR", name: "Ukraine", at: [31.8, 49.0] },
  { iso: "RUS", name: "Russie", at: [40.5, 49.6] },
  { iso: "ROU", name: "Roumanie", at: [25.3, 45.8] },
  { iso: "MDA", name: "Moldavie", at: [28.6, 47.4] },
  { iso: "BLR", name: "Biélorussie", at: [28.4, 52.4] },
];
/** Water has no polygon in this file, so its label sits at a declared centre — the static beat's own admission. */
const WATERS = [
  { name: "Mer Noire", at: [33.5, 43.6] },
  { name: "Mer d’Azov", at: [36.5, 46.2] },
  { name: "Dniepr", at: [33.4, 47.0] },
];

// ── the station and the unreported country, asserted ───────────────────────────────────────────
const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const stations = (await readCsv("stations.csv")).map((s) => ({ ...s, mw: Number(s.capacity_mw), lon: Number(s.lon), lat: Number(s.lat) }));
const ranked = [...stations].sort((a, b) => b.mw - a.mw);
const biggest = ranked[0];
if (biggest.country !== "Ukraine") throw new Error(`the headline says the largest is in Ukraine; it is in ${biggest.country}`);
if (!(biggest.mw >= 6000)) throw new Error(`the headline says 6 000 MW; it is ${biggest.mw}`);
const tops = ranked.slice(0, TOPS);
for (const s of tops) if (!FRENCH_COUNTRY[s.country]) throw new Error(`${s.country} holds one of the ${TOPS} largest stations and has no French name filed`);
if (!tops.slice(1).every((s) => s.country === "France")) throw new Error(`the first card says the next ${TOPS - 1} largest are French; they are in ${tops.slice(1).map((s) => s.country).join(", ")}`);
const electricity = await readCsv("electricity.csv");
const FUELS = Object.keys(electricity[0]).filter((h) => h.endsWith("__twh"));
const unreported = electricity.filter((r) => FUELS.reduce((s, k) => s + Number(r[k] || 0), 0) <= 0);
if (unreported.length !== 1 || unreported[0].entity !== "Ukraine") throw new Error(`the second card says Ukraine is the only European country with no reported 2024 generation; the file reports none for ${unreported.map((r) => r.entity).join(", ") || "no country"}`);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const inCountry = (iso, [lon, lat]) =>
  geo.features
    .filter((f) => f.properties.iso === iso)
    .some((f) =>
      f.geometry.coordinates.some((poly) => {
        let inside = false;
        const ring = poly[0];
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i];
          const [xj, yj] = ring[j];
          if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      }),
    );
for (const a of AREAS) if (!inCountry(a.iso, a.at)) throw new Error(`the ${a.name} label is declared outside ${a.iso}`);
if (!inCountry("UKR", [biggest.lon, biggest.lat])) throw new Error("the station's coordinates fall outside Ukraine");

const map = locatorGeometry(geo, { window: WINDOW, width: 1000 });
const [sx, sy] = map.place([biggest.lon, biggest.lat]);
/** The close-up: the static plate's own window, ±9° of longitude and ±5.2° of latitude around the station. */
const corners = [
  [biggest.lon - 9, biggest.lat - 5.2],
  [biggest.lon + 9, biggest.lat - 5.2],
  [biggest.lon - 9, biggest.lat + 5.2],
  [biggest.lon + 9, biggest.lat + 5.2],
].map((p) => map.place(p));
const zx0 = Math.min(...corners.map((p) => p[0]));
const zx1 = Math.max(...corners.map((p) => p[0]));
const zy0 = Math.min(...corners.map((p) => p[1]));
const zy1 = Math.max(...corners.map((p) => p[1]));
const zoomBox = { x: zx0, y: zy0, w: zx1 - zx0, h: zy1 - zy0 };
const europeBox = { x: 0, y: 0, w: map.width, h: map.height };

/** Settlements by the static beat's rule: the six largest. */
const places = (await readCsv("places.csv")).map((p) => ({ ...p, pop: Number(p.pop), lon: Number(p.lon), lat: Number(p.lat) })).sort((a, b) => b.pop - a.pop).slice(0, 6);
for (const p of places) if (!FRENCH_PLACE[p.name]) throw new Error(`no French name recorded for ${p.name}`);

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const labels = [
  { id: "subject", kind: "subject", text: `Zaporijjia · ${n0(biggest.mw)}${NB}MW installés`, x: sx, y: sy, mw: biggest.mw },
  ...tops.slice(1).map((s, i) => {
    const [x, y] = map.place([s.lon, s.lat]);
    return { id: `top${i}`, kind: "station", text: `${n0(s.mw)}${NB}MW`, x, y, mw: s.mw };
  }),
  ...places.map((p, i) => {
    const [x, y] = map.place([p.lon, p.lat]);
    return { id: `place${i}`, kind: "place", text: FRENCH_PLACE[p.name], x, y };
  }),
  ...AREAS.map((a) => {
    const [x, y] = map.place(a.at);
    return { id: a.iso, kind: "area", text: a.name, x, y };
  }),
  ...WATERS.map((w, i) => {
    const [x, y] = map.place(w.at);
    return { id: `water${i}`, kind: "water", text: w.name, x, y };
  }),
];
const stationMarks = tops.map((s, i) => {
  const [x, y] = map.place([s.lon, s.lat]);
  return { id: `s${i}`, x, y, mw: s.mw };
});
console.log(`${biggest.mw} MW · suivantes : ${tops.slice(1).map((s) => `${s.country} ${s.mw}`).join(", ")} · non rapporté : ${unreported[0].entity}\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La plus grosse centrale bas-carbone d’Europe est en Ukraine`,
  `La plus grosse centrale d’Europe est en Ukraine`,
  `Zaporijjia, ${n0(biggest.mw)}${NB}MW`,
];
const prose = [
  [`Les plus grosses centrales bas-carbone que la base mondiale du WRI recense en Europe : une en Ukraine, ${n0(biggest.mw)}${NB}MW, puis trois centrales nucléaires françaises, de ${n0(tops[3].mw)} à ${n0(tops[1].mw)}${NB}MW.`],
  [`La plus grosse est en Ukraine, le seul pays du continent dont la production électrique de 2024 n’est pas rapportée.`],
  [`Approchons : l’Ukraine, la mer Noire, la mer d’Azov.`],
  [`Pays en capitales, villes en bas de casse sur un point, eaux en italique : Kiev, Kharkiv, Dnipro, Odessa.`],
  [`Zaporijjia, sur le Dniepr : ${n0(biggest.mw)}${NB}MW de puissance installée, la plus grosse centrale bas-carbone d’Europe.`],
  [`Lecture : la base enregistre une puissance installée, jamais une production. La centrale est dessinée là où elle est, pas là où elle produit.`],
];
const source = "Source : WRI Global Power Plant Database v1.3.0 · lieux et contours Natural Earth 50 m, projection équivalente";
const words = {
  unit: "centrales bas-carbone, puissance installée",
  topNote: `${n0(biggest.mw)}${NB}MW en Ukraine`,
  countryNote: "production 2024 non rapportée",
  zoomNote: "Ukraine et mer Noire",
  subjectNote: `Zaporijjia${NB}: ${n0(biggest.mw)}${NB}MW`,
  limitNote: "puissance installée, jamais une production",
};
const alt =
  `Carte de l’Europe puis de l’Ukraine : la centrale de Zaporijjia, ${n0(biggest.mw)} MW de puissance installée, la plus grosse centrale bas-carbone ` +
  `recensée en Europe, sur le Dniepr près de la mer d’Azov. L’Ukraine est le seul pays du continent sans production électrique rapportée en 2024.`;

/** One state per card; see `locator-drive.mjs` for what each field paints. */
const STATES = [
  { tops: 1, country: 0, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 1, country: 1, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 1, limit: 0 },
  { tops: 0, country: 1, zoom: 0.6, places: 1, subject: 1, limit: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${AREAS.map((a) => a.name.toUpperCase()).join(" ")} ${AREAS.map((a) => a.name).join(" ")} ${labels.filter((l) => l.kind === "station").map((l) => l.text).join(" ")} ${words.limitNote}`,
  annot: `${places.map((p) => FRENCH_PLACE[p.name]).join(" ")} ${WATERS.map((w) => w.name).join(" ")}`,
  value: `${labels[0].text} ${words.topNote} ${words.countryNote} ${words.zoomNote} ${words.subjectNote} ${words.limitNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "locator-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["europe", "ukraine", "approche", "lieux", "zaporijjia", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedLocatorScrolly, {
          width: map.width,
          height: map.height,
          countries: map.countries,
          subjectCountry: "UKR",
          europeBox,
          zoomBox,
          stations: stationMarks,
          subject: { x: sx, y: sy },
          labels,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          tints: plateTints(direction),
        }),
        states: STATES,
        driver,
        apply: "applyLocatorState",
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
