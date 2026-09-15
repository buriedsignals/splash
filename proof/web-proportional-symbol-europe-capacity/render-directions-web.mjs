// twin/proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon capacity as proportional symbols, one circle per country. Rendered once per
// FILED DIRECTION into a self-contained interactive page.
//
// THE RESTING LAW IS THE AREA LAW: a circle twice the area stands for twice the capacity. The page
// then hands the reader the exponent itself — the one parameter this type sets in silence — through
// `skills/map-web/assets/area-scale.ts`. Every number the control's sentences print is derived here
// from the frozen file by that vocabulary and asserted before anything is drawn.
//
// Usage:  bun proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
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
// The map skill's own symbol core, reused rather than repeated: the legend's magnitudes are its
// nice-number ladder, not three fractions of a total. Its own header records why — a legend over
// 9 815 / 19 629 / 29 444 is one datum's arithmetic showing through, and a reader cannot carry
// 19 629 back to a circle they are looking at, which is the single job the legend has.
import { niceReferenceValues } from "../../skills/map-web/assets/geo-symbol.ts";
import {
  areaScaleFacts,
  areaScaleSlugOf,
  assertAreaScaleDeclaration,
  assertOneAreaScale,
} from "../../skills/map-web/assets/area-scale.ts";
// The window a reader may move, and the bounds it moves inside — a map vocabulary, not a gesture:
// it adds nothing to what this beat argues. Its ceiling is DERIVED below from the subject the claim
// is about, so the framing can never be zoomed past the country the headline names.
import {
  assertNavigateDeclaration,
  assertOneNavigation,
  maxScaleOf,
} from "../../skills/map-web/assets/navigate.ts";
import { DirectedSymbolMapWeb } from "./DirectedSymbolMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SIZE = 900;
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];
const R_MAX = 46;
/** THE LEGIBILITY FLOOR, in the drawing's own units. A circle drawn under it is, on the page,
 *  indistinguishable from a place with no data at all. One unit of this geometry is about 1,5 CSS
 *  pixels at the width this page fills on a laptop, so a radius under 1 is a mark under three
 *  pixels across — a dot, not a circle, and certainly not an area anyone can compare. The area law
 *  is refused outright if it puts anything under this; a law offered as a counterexample may, and
 *  then it owes the reader the count. */
const R_FLOOR = 1;
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const NAMES = {
  France: "France", Germany: "Allemagne", Spain: "Espagne", Italy: "Italie",
  "United Kingdom": "Royaume-Uni", Sweden: "Suède", Norway: "Norvège", Turkey: "Turquie",
  Poland: "Pologne", Switzerland: "Suisse", Austria: "Autriche", Finland: "Finlande",
  Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique", Romania: "Roumanie",
  Ukraine: "Ukraine", Russia: "Russie", Denmark: "Danemark", Greece: "Grèce",
  "Czech Republic": "Tchéquie", Ireland: "Irlande", Bulgaria: "Bulgarie", Hungary: "Hongrie",
  Slovakia: "Slovaquie", Slovenia: "Slovénie", Croatia: "Croatie", Serbia: "Serbie",
  Albania: "Albanie", Iceland: "Islande", Latvia: "Lettonie", Lithuania: "Lituanie",
  Estonia: "Estonie", Luxembourg: "Luxembourg", Belarus: "Biélorussie", Moldova: "Moldavie",
  Montenegro: "Monténégro", "Bosnia and Herzegovina": "Bosnie-Herz.", Macedonia: "Macédoine du N.",
  Armenia: "Arménie", Georgia: "Géorgie",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const stations = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return {
      country: c[at("country")],
      fuel: c[at("fuel")],
      mw: Number(c[at("capacity_mw")]),
      lon: Number(c[at("lon")]),
      lat: Number(c[at("lat")]),
    };
  })
  .filter(
    (s) =>
      [...OLD, ...NEW].includes(s.fuel) &&
      Number.isFinite(s.mw) && s.mw > 0 &&
      Number.isFinite(s.lon) && Number.isFinite(s.lat) &&
      !OUTSIDE.has(s.country),
  );

const byCountry = new Map();
for (const s of stations) {
  if (!byCountry.has(s.country)) byCountry.set(s.country, { mw: 0, count: 0, old: 0, fresh: 0, lon: 0, lat: 0, w: 0 });
  const c = byCountry.get(s.country);
  c.mw += s.mw;
  c.count += 1;
  if (OLD.includes(s.fuel)) c.old += s.mw;
  else c.fresh += s.mw;
  // The symbol sits at the CAPACITY-WEIGHTED centre of its own stations, not at the country's
  // centroid: a country's fleet is where its plants are, and a centroid can sit in a mountain range
  // with nothing in it.
  c.lon += s.lon * s.mw;
  c.lat += s.lat * s.mw;
  c.w += s.mw;
}
const rows = [...byCountry.entries()]
  .map(([country, c]) => ({ country, key: areaScaleSlugOf(country), ...c, lon: c.lon / c.w, lat: c.lat / c.w }))
  .sort((a, b) => b.mw - a.mw);
for (const r of rows) if (!NAMES[r.country]) throw new Error(`${r.country} has no French name filed`);

const totalMw = rows.reduce((s, r) => s + r.mw, 0);
const biggest = rows[0];
const topFive = rows.slice(0, 5);
const topShare = (topFive.reduce((s, r) => s + r.mw, 0) / totalMw) * 100;
/** The country at the MEDIAN of the field — what the biggest is read against. Not the smallest: a
 *  ratio against the tail is arithmetic nobody carries around, and the median is the country a
 *  reader can actually picture as "an ordinary one of these forty-one". */
const median = rows[Math.floor(rows.length / 2)];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(topShare > 50))
  throw new Error(`the headline says five countries hold more than half; they hold ${fr(topShare)} %`);
console.log(
  `${rows.length} pays · ${fr(totalMw / 1000, 0)} GW sur ${plain(stations.length.toLocaleString("fr-FR"))} centrales · ` +
    `cinq premiers ${fr(topShare, 0)} % · plus gros ${NAMES[biggest.country]} ${fr(biggest.mw / 1000, 0)} GW · ` +
    `médiane ${NAMES[median.country]} ${fr(median.mw / 1000)} GW\n`,
);
console.table(topFive.map((r) => ({ pays: NAMES[r.country], GW: fr(r.mw / 1000), centrales: r.count })));

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
//
// NOTHING IN THIS BEAT'S GESTURE TOUCHES ANY OF IT. The reader changes the exponent of the size
// scale; the camera, the plate, the frame and every `cx`/`cy` are the same bytes in all three states.
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
    `zoom ${plateFacts.zoom} · caméra qui MESURE (camera.ts, EPSG:3035) aspect ${MEASURE_ASPECT.toFixed(2)}:1 ` +
    `sur ${WINDOW.west}..${WINDOW.east}E\n`,
);

const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];

// ── THE SCALE LAWS THE READER HOLDS ───────────────────────────────────────────────────────────
//
// Three laws over the same 41 circles at the same 41 centres. The vocabulary normalises each to the
// same anchor radius, so the biggest circle is identical in all three and the ONLY thing that
// changes is the spread — which is the one quantity the exponent decides.
//
// The legend's magnitudes are `niceReferenceValues`'s own ladder, and they are part of this
// declaration rather than of the drawing: `assertOneAreaScale` reads the written page back and
// refuses it unless each swatch re-scales under each law. A size legend that stood still while the
// marks re-sized would be the only instrument on a symbol map for turning an area back into a
// quantity, calibrated to a scale nothing on the page is drawn in.
const keyValues = niceReferenceValues(biggest.mw, 3).map((mw, i) => ({ key: `k${i}`, value: mw }));
const baseScale = {
  label: "L'échelle des aires",
  values: rows.map((r) => ({ key: r.key, value: r.mw })),
  keyValues,
  maxRadius: R_MAX,
  floor: R_FLOOR,
  subjectKey: biggest.key,
  referenceKey: median.key,
};
/** The three laws, before their sentences exist: the sentences quote numbers this vocabulary
 *  derives from exactly these laws, so the facts are computed first and the words written round
 *  them — never the other way about. */
const LAWS = [
  { key: "Aire proportionnelle", label: "Aire proportionnelle", exponent: 0.5 },
  { key: "Rayon proportionnel", label: "Rayon proportionnel", exponent: 1 },
  { key: "Aire aplatie", label: "Aire aplatie", exponent: 1 / 3 },
];
const lawFacts = LAWS.map((law) => areaScaleFacts({ ...baseScale, options: LAWS }, law));
const SUBJECT = NAMES[biggest.country];
const REFERENCE = NAMES[median.country];
const FLOOR_WORDS = `moins de trois pixels de diamètre`;

const scale = {
  ...baseScale,
  options: [
    {
      ...LAWS[0],
      announce:
        `Aire proportionnelle — la surface de chaque cercle est proportionnelle à la capacité ; ` +
        `c'est l'échelle honnête et celle que la page affiche par défaut`,
    },
    {
      ...LAWS[1],
      announce:
        `Rayon proportionnel — le rayon de chaque cercle est proportionnel à la capacité, ` +
        `l'échelle que la fiche de type appelle mécaniquement fausse ; le seuil de lisibilité ` +
        `qu'elle fait franchir est de ${FLOOR_WORDS}`,
      // THE SENTENCE IS BUILT OUT OF THE DERIVED NUMBERS AND NOTHING ELSE, and it is deliberately
      // written as a comparison table in words rather than as a French sentence with prepositions:
      // the subject and the reference are DERIVED from the data (the biggest and the median), so a
      // sentence needing "la France" and "la Grèce" would need an article table nobody could keep
      // correct for the forty-one countries this file can pick from.
      note:
        `Rayon proportionnel — aire montrée, ${SUBJECT} contre ${REFERENCE} : ` +
        `${fr(lawFacts[1].shown, 1)} fois. Aire réelle : ${fr(lawFacts[1].truth, 1)} fois. ` +
        `${fr(lawFacts[1].erased.length, 0)} des ${fr(rows.length, 0)} pays passent sous le seuil ` +
        `de lisibilité.`,
    },
    {
      ...LAWS[2],
      announce:
        `Aire aplatie — les écarts entre les cercles sont compressés, l'échelle flatteuse qu'on ` +
        `choisit quand le plus gros cercle écrase la carte`,
      note:
        `Aire aplatie — aire montrée, ${SUBJECT} contre ${REFERENCE} : ` +
        `${fr(lawFacts[2].shown, 1)} fois. Aire réelle : ${fr(lawFacts[2].truth, 1)} fois. Aucun ` +
        `pays ne passe sous le seuil, mais l'écart que la carte doit prouver a fondu.`,
    },
  ],
};
assertAreaScaleDeclaration(scale, { fr });
for (const [i, law] of LAWS.entries())
  console.log(
    `loi « ${law.label} » (exposant ${law.exponent.toFixed(4)}) : ${SUBJECT} montrée ` +
      `${fr(lawFacts[i].shown, 1)} fois ${REFERENCE}, pour ${fr(lawFacts[i].truth, 1)} fois sa ` +
      `capacité · ${lawFacts[i].erased.length} pays sous le seuil de ${R_FLOOR}`,
  );
console.log("");

const symbols = rows.map((r, index) => {
  const [cx, cy] = toPx(project([r.lon, r.lat]));
  return {
    key: r.key,
    name: NAMES[r.country],
    figure: `${fr(r.mw / 1000, 0)} GW`,
    // THE LABELLED SET IS THE CLAIM'S OWN FIVE, not "whatever happens to be big enough". A radius
    // threshold labelled seven countries here, and the two it added are Norvège and Suède, whose
    // weighted fleet centres are close enough for their labels to collide. The claim names five.
    labelled: index < 5,
    cx,
    cy,
    detail:
      `${NAMES[r.country]} · ${fr(r.mw / 1000)} GW bas-carbone (${fr((r.mw / totalMw) * 100)} % de ` +
      `l'Europe) · ${plain(r.count.toLocaleString("fr-FR"))} centrales · eau + atome ` +
      `${fr((r.old / r.mw) * 100)} %, vent + soleil ${fr((r.fresh / r.mw) * 100)} %`,
  };
});

const keySizes = keyValues.map((k) => ({ key: k.key, label: `${fr(k.value / 1000, 0)} GW` }));

// ── the basemap ───────────────────────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const MIN_STEP = 0.6;
const land = geo.features
  .flatMap((f) => {
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

// ── THE WINDOW THE READER MAY MOVE ────────────────────────────────────────────────────────────
//
// THE CEILING IS A COUNTRY, AND IT IS MEASURED HERE RATHER THAN CHOSEN. The reason to bring this
// map closer is the caveat's own claim — that a symbol sits at the capacity-weighted centre of its
// country's OWN stations and not at its centroid — and that claim is unreadable at the published
// width, where the whole of France is 170 units of a 900-unit drawing. So the window is never
// allowed to be narrower than the subject the headline names: a reader who has zoomed in to see
// where inside France its centre of gravity falls can always still see the whole of France around
// it, and past that the map would be showing terrain this beat holds no datum for.
//
// `navigate.ts` recomputes the ceiling from these two numbers and refuses a beat that types one.
const subjectShape = geo.features.filter((f) => f.properties.name === biggest.country);
if (subjectShape.length === 0)
  throw new Error(
    `${biggest.country} holds the biggest fleet and has no shape in the frozen file, so the zoom ` +
      `ceiling cannot be measured against the country the headline names`,
  );
const subjectSpan = (() => {
  let west = Infinity;
  let east = -Infinity;
  const walk = (node) => {
    if (typeof node[0] === "number") {
      const [x] = toPx(project(node));
      west = Math.min(west, x);
      east = Math.max(east, x);
    } else node.forEach(walk);
  };
  for (const f of subjectShape) walk(f.geometry.coordinates);
  return east - west;
})();
const navigate = {
  label: "La fenêtre",
  view: { width, height },
  subject: { label: NAMES[biggest.country], width: subjectSpan },
  // Doubling and halving: the one step a reader does not have to learn, and the one that keeps the
  // ceiling two presses away rather than five.
  step: 2,
  // An eighth of the window per press — far enough that something new comes into view, near enough
  // that the landmarks a reader was using are still on screen when it lands.
  pan: 0.125,
  controls: {
    in: { label: "Zoom avant", announce: "Zoom avant — rapprocher la carte" },
    out: { label: "Zoom arrière", announce: "Zoom arrière — éloigner la carte" },
    home: {
      label: "Revenir au cadrage publié",
      announce: "Revenir au cadrage publié — celui de la carte telle qu'elle est parue",
    },
  },
  // THE HINT IS ALSO THE MAP'S OWN ACCESSIBLE DESCRIPTION. The script points the svg's
  // `aria-describedby` at this row, so the reader who has just tabbed onto the map is told the
  // keys before they press one — and the last sentence is the promise this navigation makes about
  // the beat's own claim: the window moves, the scale of the areas does not.
  hint: {
    before: "Agrandissement ",
    // TRIMMED AGAINST A PHONE, NOT AGAINST TASTE. The first version ran to six lines at 375px and
    // pushed the map below the fold on its own; this one says the same three things — how to move
    // it, which keys, and what does NOT change — in four.
    after:
      " fois. Glissez la carte pour la déplacer ; au clavier, les flèches la déplacent, plus et " +
      "moins zooment, zéro revient au cadrage publié. Cercles, étiquettes et légende gardent leur " +
      "taille : la carte s'approche, l'échelle des aires ne change pas.",
  },
};
assertNavigateDeclaration(navigate, "web-proportional-symbol-europe-capacity");
console.log(
  `fenêtre : plancher ${fr(1)} (le cadrage publié) · plafond ${fr(maxScaleOf(navigate), 2)} = ` +
    `${fr(width, 0)} unités de dessin sur ${fr(subjectSpan, 0)} pour ${NAMES[biggest.country]} · ` +
    `pas ${fr(navigate.step, 0)} · déplacement ${fr(navigate.pan * 100, 1)} % de la fenêtre\n`,
);

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Cinq pays portent ${fr(topShare, 0)} % de la capacité bas-carbone européenne`;
const caveat =
  `Un cercle par pays, sa SURFACE proportionnelle à la capacité bas-carbone installée, posé au ` +
  `centre pondéré de ses propres centrales et translucide, pour qu'un recouvrement se voie.`;
const claimNote =
  `${topFive.map((r) => `${NAMES[r.country]} ${fr(r.mw / 1000, 0)} GW`).join(", ")} — ` +
  `${fr(topShare, 0)} % des ${fr(totalMw / 1000, 0)} GW du continent, sur ` +
  `${plain(stations.length.toLocaleString("fr-FR"))} centrales.`;
const readingLine =
  `Lecture : l'exposant qui fait la taille des cercles est le seul réglage qu'une carte à symboles ` +
  `ne montre jamais — il est ci-dessus, et aucun pays ne bouge quand on en change. Survolez ou ` +
  `tabulez un cercle pour le détail.`;
const source = `Source : Global Power Plant Database (WRI) · fond de carte MapTiler`;

/** THE INTERACTION, WRITTEN BEFORE THE CODE (`BRIEF.md`) and carried into the render so the two
 *  cannot drift. `assertInteractionPlan` refuses a control shipped and not declared, and a control
 *  declared and not shipped. */
const interaction = {
  earns:
    `Une carte à symboles cache l'exposant de sa propre échelle : le classement est juste sous ` +
    `n'importe quelle loi, et l'écart entre les cercles — la seule chose que la carte prouve — est ` +
    `un paramètre libre que l'auteur a fixé en silence. Un still ne peut qu'en choisir un et ` +
    `demander qu'on lui fasse confiance ; cette page le met dans la main du lecteur et chiffre ce ` +
    `que chaque loi fait dire à la même carte.`,
  controls: [
    {
      question: `De combien la France est-elle vraiment plus grande que la Grèce ?`,
      gesture: "toggle-a-comparison",
      changes:
        `Chaque cercle change de rayon et rien d'autre : aucun centre ne bouge, aucune étiquette ne ` +
        `bouge, le plus gros cercle reste au même rayon dans les trois états, la légende de taille ` +
        `se remet à l'échelle avec les marques, et la phrase révélée chiffre le rapport de surfaces ` +
        `montré, le rapport réel des capacités, et le nombre de pays que la loi efface.`,
    },
    {
      question: `Où exactement, dans son propre pays, ce cercle est-il posé ?`,
      gesture: "zoom-and-pan",
      changes:
        `La fenêtre se resserre sur le dessin — le viewBox, jamais la projection : la caméra reste ` +
        `celle du beat et aucun lieu ne se déplace. Les cercles, les étiquettes et les traits ` +
        `gardent leur taille à l'écran, donc la légende de taille dit toujours vrai et deux ` +
        `étiquettes ne peuvent que s'éloigner l'une de l'autre. On ne peut pas dézoomer sous le ` +
        `cadrage publié ni pousser la géographie hors du cadre, et le contrôle de retour dit en ` +
        `toutes lettres où il ramène.`,
    },
    {
      question: `Que vaut ce cercle-là, et de quoi est-il fait ?`,
      gesture: "ask-a-mark",
      changes:
        `Le cercle lui-même s'assombrit depuis son propre remplissage, mesuré à travers sa ` +
        `translucidité, et répond avec le pays, ses GW, sa part de l'Europe, son nombre de ` +
        `centrales et le partage entre eau-et-atome et vent-et-soleil.`,
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${scale.label} ${scale.options.map((o) => o.label).join(" ")} ` +
    `${navigate.label} ${Object.values(navigate.controls).map((c) => c.label).join(" ")}`,
  axis: keySizes.map((k) => k.label).join(" "),
  annot:
    `${claimNote} ${scale.options.filter((o) => o.note).map((o) => o.note).join(" ")} ` +
    `${navigate.hint.before} ${navigate.hint.after}`,
  value: symbols.filter((s) => s.labelled).map((s) => `${s.name} ${s.figure}`).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  const name = `${id}.html`;
  try {
    const { outPath } = await renderWeb({
      component: DirectedSymbolMapWeb,
      props: {
        plate,
        symbols, keySizes, scale, navigate, land,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe portant un cercle par pays, dont la SURFACE est proportionnelle à sa ` +
          `capacité bas-carbone. Le plus grand, ${NAMES[biggest.country]}, fait ` +
          `${fr(biggest.mw / 1000, 0)} GW ; viennent ensuite ` +
          `${topFive.slice(1).map((r) => NAMES[r.country]).join(", ")}. Ces cinq cercles couvrent ` +
          `${fr(topShare, 0)} % de la capacité du continent ; le reste de la carte est un semis de ` +
          `petits cercles. Un contrôle au-dessus de la carte change la loi qui transforme une ` +
          `capacité en taille de cercle, sans déplacer aucun pays.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    // THE VOCABULARY CHECKS THE PAGE IT ACTUALLY WROTE. `assertOneAreaScale` is the half of this
    // control that no declaration-level check can make: dropping the stylesheet call leaves every
    // attribute perfectly correct and every state drawn on top of every other. A page that fails it
    // is REMOVED rather than left on disk, because a stale render on disk looks exactly like a
    // render that succeeded.
    const written = await readFile(outPath, "utf8");
    try {
      assertOneAreaScale(written, scale, name);
      // THE SAME HALF, FOR THE WINDOW. Every refusal here is a way the navigation ships with every
      // attribute correct and lies in a browser: a rail that draws itself with the script absent, a
      // hit target counter-scaled about anything but its own centre, a mark that grows with the
      // zoom while the key beside it does not.
      assertOneNavigation(written, navigate, name);
    } catch (error) {
      await rm(outPath, { force: true });
      throw error;
    }
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render sitting on disk as if it were today's.
  process.exitCode = 1;
}
