// twin/proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs
//
// Europe's low-carbon electricity share by country, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// THE CLASSES ARE STATED BREAKS, NOT QUANTILES: a reader is told where the lines are, in per cent,
// and every country's own share is one pointer away. A country the file has no reading for is drawn
// as MISSING, never dropped into the lowest class.
//
// Usage:  bun proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs

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
import { DirectedChoroplethWeb } from "./DirectedChoroplethWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SIZE = 900;
const BREAKS = [30, 50, 70, 94];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herz.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the readings ──────────────────────────────────────────────────────────────────────────────
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
const readings = new Map();
for (const r of raw.filter((z) => z.year === YEAR)) {
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (total > 0) readings.set(r.code, { share: (low / total) * 100, low, total });
}
const ranked = [...readings.entries()].sort((a, b) => b[1].share - a[1].share);

// ── THE CAMERA IS THE PLATE'S ─────────────────────────────────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and this file still prints it: it
// is what MEASURES. It no longer PLACES anything. What places every mark is the baked MapTiler
// plate's own recorded camera — `frameCorners`, read back with `map.unproject()` after the camera
// settled, not the nominal bounds handed to `fitBounds`, which fitBounds widens to keep the frame's
// aspect. Longitude is linear in pixel-x under Web Mercator; latitude is not, and needs the inverse
// Mercator formula, because pixel-y is linear in Mercator-y.
//
// THE COST, STATED. Web Mercator inflates the north: at 60° a shape draws about twice the area it
// holds. This beat's headline is a COUNT of countries above a stated break, and a count survives the
// inflation untouched — but the eye still weights a class by the page it covers, so the caveat no
// longer claims an equal-area reading and says instead what the reader is looking at.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same country in three places and nothing here would notice.
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
        `disagree about where a degree is would put the same country in three places, and nothing ` +
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
/** Into the drawing's own unit box: x over the frame's WIDTH on both axes, so one scale serves both
 *  and nothing is sheared. */
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};

// ── the shapes ────────────────────────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];

/** A ring is thinned by dropping vertices closer than half a drawn pixel to the last one kept.
 *  A ring too small to thin is kept WHOLE: the first version of this rule made Malta vanish, and a
 *  choropleth with a country silently absent is the failure every reference sheet warns about. */
const MIN_STEP = 0.5;
const thin = (ring) => {
  const out = [];
  for (const p of ring) {
    const q = toPx(project(p));
    const last = out[out.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= MIN_STEP) out.push(q);
  }
  return out.length >= 4 ? out : ring.map((p) => toPx(project(p)));
};

const klassOf = (share) => {
  let i = 0;
  while (i < BREAKS.length && share >= BREAKS[i]) i += 1;
  return i;
};

const shapes = [];
for (const f of geo.features) {
  const code = f.properties.iso ?? f.properties.code ?? f.properties.ISO_A3 ?? f.properties.iso_a3;
  if (!code || !NAMES[code]) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = polys.map((p) => thin(p[0])).filter((r) => r.length >= 3);
  if (!rings.length) continue;
  const path = rings
    .map((r) => `M ${r.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
    .join(" ");
  // The hit seat: the centre of the LARGEST ring's bounding box, nudged onto a vertex-free interior
  // point by averaging that ring — good enough for a target a reader aims at, and never outside the
  // frame.
  const biggest = rings.reduce((a, b) => (b.length > a.length ? b : a));
  const cx = biggest.reduce((s, p) => s + p[0], 0) / biggest.length;
  const cy = biggest.reduce((s, p) => s + p[1], 0) / biggest.length;
  const reading = readings.get(code) ?? null;
  const klass = reading ? klassOf(reading.share) : null;
  const rank = reading ? ranked.findIndex(([c]) => c === code) + 1 : null;
  shapes.push({
    code,
    name: NAMES[code],
    path,
    klass,
    cx,
    cy,
    detail: reading
      ? `${NAMES[code]} · ${fr(reading.share)} % de son électricité est bas-carbone en ${YEAR} · ` +
        `palier ${klassLabel(klass)} · ${fr(reading.low, 0)} TWh bas-carbone sur ` +
        `${fr(reading.total, 0)} · ${rank}ᵉ sur ${ranked.length}`
      : `${NAMES[code]} · aucune production publiée pour ${YEAR} dans ce fichier — dessiné en creux, ` +
        `jamais rangé dans le palier le plus bas`,
  });
}
function klassLabel(i) {
  if (i === 0) return `moins de ${BREAKS[0]} %`;
  if (i === BREAKS.length) return `${BREAKS[BREAKS.length - 1]} % et plus`;
  return `${BREAKS[i - 1]}–${BREAKS[i]} %`;
}
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const top = ranked.filter(([, r]) => r.share > BREAKS[BREAKS.length - 1]);
if (!(top.length >= 5 && top.length <= 9))
  throw new Error(`the headline names a handful above ${BREAKS[BREAKS.length - 1]} %; ${top.length} are`);
const drawn = shapes.filter((s) => s.klass !== null).length;
const missing = shapes.length - drawn;
console.log(
  `${shapes.length} pays dessinés · ${drawn} avec une lecture ${YEAR}, ${missing} en creux · ` +
    `${top.length} au-dessus de ${BREAKS[BREAKS.length - 1]} % : ` +
    `${top.map(([c, r]) => `${NAMES[c]} ${fr(r.share)}`).join(", ")}\n`,
);
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}`,
);
console.log(
  `camera qui MESURE (inchangé) : LAEA 52N 10E, fenêtre ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1\n`,
);

const facts = beatFacts(
  ranked.map(([c, r]) => ({ key: c, label: NAMES[c], value: r.share })),
  { subject: NAMES[ranked[0][0]], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `${top.length} pays européens tirent plus de ${BREAKS[BREAKS.length - 1]} % de leur électricité de sources bas-carbone`;
const caveat =
  `Part bas-carbone — nucléaire et toutes renouvelables — de l'électricité produite en ${YEAR}. ` +
  `Fond de carte MapTiler, en Web Mercator : le titre compte des PAYS, pas des surfaces, mais la ` +
  `projection gonfle le nord — la Norvège et la Suède couvrent plus de page qu'elles ne pèsent.`;
const claimNote =
  `Au-dessus de ${BREAKS[BREAKS.length - 1]} % : ${top.map(([c]) => NAMES[c]).join(", ")}. ` +
  `${missing} pays du fond de carte ${missing > 1 ? "n'ont" : "n'a"} pas de production publiée pour ` +
  `${YEAR} et ${missing > 1 ? "sont dessinés" : "est dessiné"} en creux — le palier le plus bas est un ` +
  `pays à 10 %, pas un pays sans donnée.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un pays pour lire sa part exacte, le palier où il tombe et ` +
  `les bornes de ce palier, ses TWh bas-carbone et son rang. Un choroplèthe transforme un nombre en ` +
  `CLASSE, et une classe est une bande qu'on ne peut pas resserrer : deux pays de la même couleur ` +
  `peuvent être à douze points l'un de l'autre.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR} · fond de carte MapTiler (dataviz), teinté par la direction`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: classes.map((c) => c.label).join(" "),
  annot: claimNote,
  value: ranked.map(([, r]) => fr(r.share)).join(" "),
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
      component: DirectedChoroplethWeb,
      props: {
        plate,
        shapes, classes,
        missingLabel: "pas de donnée",
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe sur fond MapTiler, chaque pays teinté selon la part ` +
          `bas-carbone de son électricité en ${YEAR}. Les teintes les plus foncées forment un arc au ` +
          `nord et à l'ouest — ${top.map(([c]) => NAMES[c]).join(", ")} — et une tache isolée dans ` +
          `les Balkans. Le centre et l'est de la carte restent clairs. ${missing} pays sont dessinés ` +
          `en creux, faute de donnée.`,
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
