// twin/proof/web-flow-map-ukraine-protection/render-directions-web.mjs
//
// Ukrainians under temporary protection in Europe, one band per destination. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// MINARD, REVERSED: one origin, many destinations, band WIDTH is the quantity, and the width scale is
// drawn in the key in people. A band too thin to see is counted into a stated remainder, never drawn
// as a hairline that reads as zero. A destination outside the frame is not drawn either — a ribbon
// leaving the plate cannot be named.
//
// Usage:  bun proof/web-flow-map-ukraine-protection/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedFlowMapWeb } from "./DirectedFlowMapWeb.tsx";
import { CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const SIZE = 900;
const W_MAX = 32;
const MIN_W = 1.2;
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const rows = await readCsv("data.csv");
const population = await readCsv("population.csv");
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const months = [...new Set(rows.map((r) => r.month))];
if (months.length !== 1) throw new Error(`the page draws one month and the file holds ${months.length}`);
const month = months[0];

const flows = rows
  .map((r) => ({ code: r.code, name: NAMES[r.code] ?? r.entity, people: Number(r.people) }))
  .filter((f) => Number.isFinite(f.people) && f.people > 0)
  .sort((a, b) => b.people - a.people);
for (const f of flows) if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed`);

const total = flows.reduce((s, f) => s + f.people, 0);
const two = flows.slice(0, 2);
const twoShare = (two.reduce((s, f) => s + f.people, 0) / total) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(total > 4e6)) throw new Error(`the headline says over four million; the file totals ${n0(total)}`);
if (!(twoShare > 40 && twoShare < 60))
  throw new Error(`the headline says the two largest take about half; they take ${fr(twoShare)} %`);
console.log(
  `${flows.length} destinations · ${n0(total)} personnes en ${month} · ${two.map((f) => `${f.name} ${n0(f.people)}`).join(" et ")} ` +
    `= ${fr(twoShare)} %\n`,
);

// ── the geography ─────────────────────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
// ── THE CAMERA IS THE PLATE'S ─────────────────────────────────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and it is what MEASURES. It no
// longer PLACES anything. What places every mark is the baked MapTiler plate's own recorded camera —
// `frameCorners`, read back with `map.unproject()` after the camera settled, not the nominal bounds
// handed to `fitBounds`, which fitBounds widens to keep the frame's aspect. Longitude is linear in
// pixel-x under Web Mercator; latitude is not, and needs the inverse Mercator formula, because
// pixel-y is linear in Mercator-y.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same mark in three places and nothing here would notice.
const PLATE_SIZE = "1600x1216";
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}

/** The two tints a basemap is allowed on a directed plate, both derived from the direction and
 *  neither invented: `water-is-a-tint-not-a-grey` says the sea takes a little of the accent, and the
 *  land takes a step off the ground toward the ink. Nothing else on the basemap carries colour. */
const plateTints = (d) => ({
  water: mix(d.ground, d.accent, 0.16),
  land: mix(d.ground, deriveFurniture(d.ground).ink, 0.07),
});

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)));
  ensurePlate(id, t.water, t.land);
}
const factsOf = async (id) => JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
const plateFacts = await factsOf(DIRECTION_FILES[0].replace(/\.md$/, ""));
for (const file of DIRECTION_FILES.slice(1)) {
  const id = file.replace(/\.md$/, "");
  const other = await factsOf(id);
  if (
    other.frame.width !== plateFacts.frame.width ||
    other.frame.height !== plateFacts.frame.height ||
    JSON.stringify(other.frameCorners) !== JSON.stringify(plateFacts.frameCorners)
  )
    throw new Error(
      `the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}: three plates that ` +
        `disagree about where a degree is would put the same mark in three places, and nothing ` +
        `else here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
/** Into the drawing's own unit box: divided by the frame's WIDTH on both axes, so one scale serves
 *  both and nothing is sheared. */
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}\n`,
);

const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];
const inFrame = ([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height;

/** THE SEAT IS THE CENTRE OF THE PART IN FRAME, not of the country. Russia's centroid is in Siberia
 *  and Norway's is in the sea north of Trondheim; a seat taken from the whole polygon puts a band's
 *  end where the country is not. */
const seatOf = (f) => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys)
    for (const ring of poly)
      for (const p of ring) {
        const q = toPx(project(p));
        if (!inFrame(q)) continue;
        sx += q[0];
        sy += q[1];
        n += 1;
      }
  return n ? [sx / n, sy / n] : null;
};

const seats = {};
const MIN_STEP = 0.6;
const land = geo.features
  .flatMap((f) => {
    const iso = f.properties.iso ?? f.properties.code;
    const seat = seatOf(f);
    if (iso && seat) seats[iso] = seat;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polys.map((p) => {
      const out = [];
      for (const q of p[0]) {
        const px = toPx(project(q));
        const last = out[out.length - 1];
        if (!last || Math.hypot(px[0] - last[0], px[1] - last[1]) >= MIN_STEP) out.push(px);
      }
      return out.length >= 3 ? out : p[0].map((q) => toPx(project(q)));
    });
  })
  .map((r) => `M ${r.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
  .join(" ");

const origin = seats[ORIGIN];
if (!origin) throw new Error(`${ORIGIN} has no seat in frame — the fan has no source`);

const wOf = (people) => (people / flows[0].people) * W_MAX;
const bands = [];
let hidden = 0;
let hiddenPeople = 0;
let offFrame = 0;
for (const f of flows) {
  const seat = seats[f.code];
  if (!seat) {
    offFrame += 1;
    continue;
  }
  const w = wOf(f.people);
  if (w < MIN_W) {
    hidden += 1;
    hiddenPeople += f.people;
    continue;
  }
  // A band leaves the origin at the TRUE BEARING of its destination and arrives at its seat: the
  // curve is schematic, and the reading line says so, but the direction it leaves in is not.
  const dx = seat[0] - origin[0];
  const dy = seat[1] - origin[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (origin[0] + seat[0]) / 2 + nx * len * 0.12;
  const my = (origin[1] + seat[1]) / 2 + ny * len * 0.12;
  const half = w / 2;
  const rate = (f.people / inhabitants[f.code]) * 1000;
  bands.push({
    code: f.code,
    name: f.name,
    path:
      `M ${origin[0] + nx * half} ${origin[1] + ny * half} ` +
      `Q ${mx + nx * half} ${my + ny * half} ${seat[0] + nx * half * 0.5} ${seat[1] + ny * half * 0.5} ` +
      `L ${seat[0] - nx * half * 0.5} ${seat[1] - ny * half * 0.5} ` +
      `Q ${mx - nx * half} ${my - ny * half} ${origin[0] - nx * half} ${origin[1] - ny * half} Z`,
    lx: seat[0],
    ly: seat[1],
    label: w >= 10 ? f.name : null,
    detail:
      `${f.name} · ${n0(f.people)} personnes sous protection en ${month} · ` +
      `${fr((f.people / total) * 100)} % du total · ${flows.indexOf(f) + 1}ᵉ destination · ` +
      `${fr(rate)} pour 1 000 habitants`,
  });
}
if (offFrame) console.log(`${offFrame} destinations hors cadre, non dessinées\n`);

const facts = beatFacts(
  flows.map((f) => ({ key: f.code, label: f.name, value: f.people })),
  { subject: flows[0].name, declaredSequence: "personnes" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const keyWidths = [flows[0].people, flows[0].people / 4, flows[0].people / 16].map((p) => ({
  w: wOf(p),
  label: `${n0(p)} personnes`,
}));

const title = `${fr(total / 1e6)} millions d'Ukrainiens sous protection temporaire en Europe — l'${flows[0].name} et la ${flows[1].name} en accueillent ${fr(twoShare)} %`;
const caveat =
  `Une bande par pays d'accueil, sa LARGEUR proportionnelle au nombre de personnes. Le tracé est ` +
  `schématique : la courbe n'est pas un itinéraire. Ce qui est exact, c'est la largeur — et la ` +
  `direction dans laquelle chaque bande quitte l'origine.`;
const claimNote =
  `${flows.slice(0, 4).map((f) => `${f.name} ${n0(f.people)}`).join(", ")}. Par habitant, l'ordre ` +
  `s'inverse.`;
const remainder =
  hidden > 0
    ? `${hidden} destinations trop fines pour être dessinées à cette échelle ne le sont pas : elles ` +
      `pèsent ${n0(hiddenPeople)} personnes, soit ${fr((hiddenPeople / total) * 100)} % du total.`
    : null;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une bande pour lire la destination, le nombre, sa part, son ` +
  `rang et le TAUX pour 1 000 habitants — le chiffre qui renverse le classement.`;
const source = `Source : Eurostat, migr_asytpsm, ${month} · population 2023, via Our World in Data · fond de carte MapTiler (dataviz), teinté par la direction`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: keyWidths.map((k) => k.label).join(" "),
  annot: `${claimNote} ${remainder ?? ""}`,
  value: bands.filter((b) => b.label).map((b) => b.label).join(" "),
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
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  try {
    await renderWeb({
      component: DirectedFlowMapWeb,
      props: {
        plate,
        bands, land,
        originPoint: origin,
        originLabel: NAMES[ORIGIN],
        keyWidths, remainder,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe d'où partent ${bands.length} bandes, toutes issues d'un même point en ` +
          `${NAMES[ORIGIN]}. La plus large va vers l'${flows[0].name} (${n0(flows[0].people)} ` +
          `personnes), la deuxième vers la ${flows[1].name} (${n0(flows[1].people)}) ; ensemble elles ` +
          `font ${fr(twoShare)} % du total. Les autres s'amincissent rapidement vers l'ouest et le ` +
          `sud de la carte.`,
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
