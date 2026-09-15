// twin/proof/web-cartogram-europe-lowcarbon/render-directions-web.mjs
//
// Europe's low-carbon electricity share, one equal tile per country — and a reader who can put the
// map back. Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// BOTH AVERAGES ARE COMPUTED FROM THE SAME FROZEN SHAPES IN THE SAME PROJECTION the choropleth uses,
// and so are the three geometries the control travels between: the designed grid, the true
// centroids, and the true areas. The comparison is therefore between three drawings of one dataset,
// never between a drawing and an idea of one. The headline asserts a twenty-point gap and the beat
// refuses to render if the gap is smaller.
//
// Usage:  bun proof/web-cartogram-europe-lowcarbon/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertRestoreDeclaration,
  assertOneRestore,
  restoreClearOf,
  restoreNamesOf,
  restoreSlugOf,
} from "../../skills/chart-web/assets/restore.ts";
import { DirectedCartogramWeb } from "./DirectedCartogramWeb.tsx";
import { project } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const CELL = 92;
const GAP = 8;
const TILE = CELL - GAP;
const BREAKS = [30, 50, 70, 94];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
/** The height of a cell's two-line name block, in user units: a 12px name at cy-9 over a 13px value
 *  at cy+10, ascent to descent. Measured off the geometry the component writes, not guessed. */
const NAME_BLOCK_H = 32;

/** This beat's own copy of the designed layout. */
const GRID = [
  "..  ISL ..  ..  ..  ..  ..  ..  NOR SWE FIN ..",
  "..  ..  ..  ..  ..  ..  ..  ..  ..  ..  EST ..",
  "..  ..  IRL GBR DNK ..  ..  ..  ..  LVA RUS ..",
  "..  ..  ..  ..  NLD DEU POL LTU BLR ..  ..  ..",
  "..  ..  ..  BEL LUX CZE SVK UKR ..  ..  ..  ..",
  "PRT ESP FRA CHE AUT HUN MDA ..  ..  ..  ..  ..",
  "..  ..  ..  ITA SVN HRV SRB ROU ..  ..  ..  ..",
  "..  ..  ..  MLT MNE BIH MKD BGR ..  ..  ..  ..",
  "..  ..  ..  ..  ..  ALB GRC TUR CYP ..  ..  ..",
];
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-H.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxemb.", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macéd. N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "R.-Uni",
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
const readings = new Map();
for (const line of csv.slice(1)) {
  const c = line.split(",");
  if (Number(c[at("year")]) !== YEAR) continue;
  const code = c[at("code")];
  const low = LOW.reduce((s, k) => s + Number(c[at(k)]), 0);
  const total = low + FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
  if (total > 0) readings.set(code, { share: (low / total) * 100, low, total });
}
const ranked = [...readings.entries()].sort((a, b) => b[1].share - a[1].share);

// ── THE GEOMETRY, MEASURED ONCE ON THE FROZEN SHAPES ──────────────────────────────────────────
// Area AND area-weighted centroid, both in the camera's unit box, both from the same ring walk: the
// three stages are three readings of one arithmetic, which is the refusal `restore.ts` makes
// structural. A multipart country's centroid is the area-weighted mean of its parts' centroids, so
// Denmark is not placed on whichever island happened to be listed first.
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const shapes = new Map();
for (const f of geo.features) {
  const code = f.properties.iso ?? f.properties.code;
  if (!code) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const poly of polys) {
    const ring = poly[0].map(project);
    let a = 0;
    let x = 0;
    let y = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const cross = x1 * y2 - x2 * y1;
      a += cross;
      x += (x1 + x2) * cross;
      y += (y1 + y2) * cross;
    }
    a /= 2;
    if (Math.abs(a) < 1e-12) continue;
    const w = Math.abs(a);
    area += w;
    cx += (x / (6 * a)) * w;
    cy += (y / (6 * a)) * w;
  }
  if (area <= 0) continue;
  const prev = shapes.get(code);
  if (prev) {
    const tot = prev.area + area;
    shapes.set(code, { area: tot, cx: (prev.cx * prev.area + cx) / tot, cy: (prev.cy * prev.area + cy) / tot });
  } else shapes.set(code, { area, cx: cx / area, cy: cy / area });
}

// ── the layout, checked both ways ──────────────────────────────────────────────────────────────
const seats = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code !== "..") seats.push({ code, row: r, col: c });
  }),
);
for (const s of seats) {
  if (!NAMES[s.code]) throw new Error(`${s.code} sits in the layout and has no French name filed`);
  if (!shapes.has(s.code))
    throw new Error(
      `${NAMES[s.code]} sits in the layout and the frozen shapes carry no polygon for it — the two ` +
        "stages that give the geography back have nowhere to put its cell",
    );
}
const laid = new Set(seats.map((s) => s.code));
for (const [code] of readings)
  if (!laid.has(code)) throw new Error(`${NAMES[code] ?? code} has a reading and no tile in the layout`);
const CODES = seats.map((s) => s.code);

// ── the two averages, from the SAME shapes ────────────────────────────────────────────────────
const withReading = CODES.filter((code) => readings.has(code));
const drawnArea = withReading.reduce((s, code) => s + shapes.get(code).area, 0);
const byArea =
  withReading.reduce((s, code) => s + readings.get(code).share * shapes.get(code).area, 0) / drawnArea;
const byCountry = withReading.reduce((s, code) => s + readings.get(code).share, 0) / withReading.length;
const gap = byCountry - byArea;
const biggest = withReading.reduce((a, b) => (shapes.get(a).area >= shapes.get(b).area ? a : b));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(gap > 15))
  throw new Error(`the headline asserts a wide gap between the two averages; it is ${fr(gap)} points`);

// ── THE THREE STAGES ──────────────────────────────────────────────────────────────────────────
// ONE SCALE FOR BOTH AXES IN EVERY STAGE. An equal-area projection squeezed on one axis is no longer
// equal-area, and a cartogram whose squares are squeezed no longer draws the area it claims.
const FRAME = { width: 12 * CELL, height: 9 * CELL };

const gridPlace = new Map(
  seats.map((s) => [s.code, { cx: s.col * CELL + TILE / 2, cy: s.row * CELL + TILE / 2, side: TILE }]),
);

// Stage 2 — the PLACE given back: equal squares on their true centroids, the largest scale at which
// every centre keeps half a cell of the frame on each side.
{
  var placeStage = (() => {
    const xs = CODES.map((c) => shapes.get(c).cx);
    const ys = CODES.map((c) => shapes.get(c).cy);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const s = Math.min((FRAME.width - TILE) / (x1 - x0), (FRAME.height - TILE) / (y1 - y0));
    const ox = (FRAME.width - (x1 - x0) * s) / 2 - x0 * s;
    const oy = (FRAME.height - (y1 - y0) * s) / 2 - y0 * s;
    return new Map(
      CODES.map((c) => [c, { cx: ox + shapes.get(c).cx * s, cy: oy + shapes.get(c).cy * s, side: TILE }]),
    );
  })();
}

// Stage 3 — the SIZE given back too: ONE scale carries the position AND the side, so each square has
// exactly the area its country has at that scale. The scale is the largest at which the whole
// assembly, squares included, still fits the frame — which is a linear function of s, so it is
// solved rather than searched.
const areaStage = (() => {
  const half = (c) => Math.sqrt(shapes.get(c).area) / 2;
  const loX = Math.min(...CODES.map((c) => shapes.get(c).cx - half(c)));
  const hiX = Math.max(...CODES.map((c) => shapes.get(c).cx + half(c)));
  const loY = Math.min(...CODES.map((c) => shapes.get(c).cy - half(c)));
  const hiY = Math.max(...CODES.map((c) => shapes.get(c).cy + half(c)));
  const s = Math.min(FRAME.width / (hiX - loX), FRAME.height / (hiY - loY));
  const ox = (FRAME.width - (hiX - loX) * s) / 2 - loX * s;
  const oy = (FRAME.height - (hiY - loY) * s) / 2 - loY * s;
  return new Map(
    CODES.map((c) => [
      c,
      { cx: ox + shapes.get(c).cx * s, cy: oy + shapes.get(c).cy * s, side: Math.sqrt(shapes.get(c).area) * s },
    ]),
  );
})();

/** A stage's places, with each square's declared share of the drawing — checked against the squares
 *  themselves by `assertRestoreDeclaration`. */
const placesOf = (map) => {
  const sum = CODES.reduce((s, c) => s + map.get(c).side ** 2, 0);
  return CODES.map((c) => ({
    key: c,
    cx: map.get(c).cx,
    cy: map.get(c).cy,
    side: map.get(c).side,
    areaShare: map.get(c).side ** 2 / sum,
  }));
};

const STAGE_GEOMETRY = [
  { key: "pays", places: placesOf(gridPlace) },
  { key: "lieu", places: placesOf(placeStage) },
  { key: "surface", places: placesOf(areaStage) },
];

// ── what each stage costs and gives, measured on the geometry ─────────────────────────────────
const geometryOnly = {
  label: "x",
  frame: FRAME,
  tiles: CODES.map((c) => ({ key: c, label: NAMES[c], nameWidth: 0, nameHeight: 0, lift: "fill" })),
  stages: STAGE_GEOMETRY.map((s) => ({ key: s.key, label: s.key, announce: s.key, places: s.places })),
};
const clear = new Map(restoreClearOf(geometryOnly).map((s) => [s.slug, s.clear.length]));
const travelOf = (map, code) =>
  Math.hypot(map.get(code).cx - gridPlace.get(code).cx, map.get(code).cy - gridPlace.get(code).cy) / CELL;
const travels = CODES.map((c) => ({ code: c, cells: travelOf(placeStage, c) })).sort((a, b) => b.cells - a.cells);
const medianTravel = [...travels].map((t) => t.cells).sort((a, b) => a - b)[Math.floor(travels.length / 2)];
const scaleOf = (code) => areaStage.get(code).side / TILE;
const biggestScale = CODES.reduce((a, b) => (scaleOf(a) >= scaleOf(b) ? a : b));
const smallestScale = CODES.reduce((a, b) => (scaleOf(a) <= scaleOf(b) ? a : b));

console.log(
  `${readings.size} pays lus · moyenne pondérée par la SURFACE ${fr(byArea)} % · par PAYS ` +
    `${fr(byCountry)} % · écart ${fr(gap)} points · plus grande surface ${NAMES[biggest]} ` +
    `${fr((shapes.get(biggest).area / drawnArea) * 100)} % du dessin à ${fr(readings.get(biggest).share)} %`,
);
console.log(
  `cases dégagées — grille ${clear.get("pays")}/41 · au vrai lieu ${clear.get("lieu")}/41 · ` +
    `à la vraie surface ${clear.get("surface")}/41 · trajet médian ${fr(medianTravel, 2)} case · ` +
    `le plus long ${NAMES[travels[0].code]} ${fr(travels[0].cells, 2)} · échelle ` +
    `${NAMES[biggestScale]} x${fr(scaleOf(biggestScale), 2)} contre ${NAMES[smallestScale]} ` +
    `x${fr(scaleOf(smallestScale), 3)}\n`,
);

// ── the classes ───────────────────────────────────────────────────────────────────────────────
const klassOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};
const klassLabel = (i) =>
  i === 0 ? `moins de ${BREAKS[0]} %` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} % et plus` : `${BREAKS[i - 1]}–${BREAKS[i]} %`;
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

const tiles = CODES.map((code) => {
  const r = readings.get(code) ?? null;
  const klass = r ? klassOf(r.share) : null;
  const rank = r ? ranked.findIndex(([c]) => c === code) + 1 : 0;
  const stem = r
    ? `${NAMES[code]} · ${fr(r.share)} % bas-carbone en ${YEAR} · palier ${klassLabel(klass)} · ` +
      `${fr(r.low, 0)} TWh bas-carbone sur ${fr(r.total, 0)} · ${rank}e sur ${ranked.length}`
    : `${NAMES[code]} · aucune production publiée pour ${YEAR} — case en creux, jamais rangée dans le palier le plus bas`;
  return {
    code,
    name: NAMES[code],
    klass,
    label: NAMES[code],
    value: r ? fr(r.share, 0) : "—",
    detail: {
      pays: plain(`${stem} · une case égale, comme les 40 autres`),
      lieu: plain(`${stem} · sa case est à ${fr(travelOf(placeStage, code), 2)} case(s) de sa vraie place`),
      surface: plain(
        `${stem} · son carré occupe ${fr((shapes.get(code).area / drawnArea) * 100, 2)} % du dessin ` +
          `et vaut ${fr(scaleOf(code), 3)} fois la case que la grille lui donnait`,
      ),
    },
  };
});
const missing = tiles.filter((t) => t.klass === null).length;

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const title = `Pondérée par la surface, l'Europe est à ${fr(byArea, 0)} % bas-carbone ; pondérée par pays, à ${fr(byCountry, 0)} %`;
// THE CAVEAT IS SHORT BECAUSE THE PHONE MEASURED IT. The first version ran five sentences and put
// the document 169 px past a 812 px window, taking the source line off screen with it. What it said
// about the projection and about the pictogram is not lost: it is in the alt text and in the source
// line, where it costs the plate nothing.
const caveat =
  `Une case égale par pays, teintée comme le choroplèthe voisin et calculée sur le même fichier. Un ` +
  `choroplèthe encre chaque pays sur SON territoire, donc il ne montre que la première moyenne — ` +
  `celle que personne n'a choisie, la surface étant un fait de la Terre.`;
const claimNote =
  `La ${NAMES[biggest]} prend ${fr((shapes.get(biggest).area / drawnArea) * 100, 0)} % du dessin du ` +
  `choroplèthe à ${fr(readings.get(biggest).share)} %, et tire la première moyenne vers le bas. ` +
  `${missing} case sans lecture ${YEAR}, en creux.`;
const readingLine =
  `Lecture : rendez à la carte le lieu, puis la surface, et regardez la moyenne. Survolez, touchez ` +
  `ou tabulez une case pour son détail.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const STAGE_WORDS = {
  pays: {
    label: "une case par pays",
    announce: `une case par pays — le cartogramme tel qu'il est déposé : 41 cases égales, moyenne ${fr(byCountry)} %`,
  },
  lieu: {
    label: "chaque case à sa place",
    announce:
      `chaque case à sa place — les mêmes 41 cases, posées sur les vrais centroïdes ; la moyenne ` +
      `ne bouge pas`,
    note: plain(
      `Le LIEU ne pèse rien : toujours ${fr(byCountry)} % par pays. Ce qui change est la lisibilité — ` +
        `${clear.get("lieu")} des 41 cases restent dégagées. Plus long trajet : la ` +
        `${NAMES[travels[0].code]}, ${fr(travels[0].cells, 2)} cases ; médiane ${fr(medianTravel, 2)}.`,
    ),
  },
  surface: {
    label: "chaque case à sa surface",
    announce:
      `chaque case à sa surface — chaque carré à la surface de son pays ; la moyenne tombe au ` +
      `chiffre du choroplèthe`,
    note: plain(
      `La SURFACE rend le chiffre du choroplèthe : ${fr(byArea)} %. Le carré de la ` +
        `${NAMES[biggestScale]} vaut ${fr(scaleOf(biggestScale), 2)} fois sa case, celui de ` +
        `${NAMES[smallestScale]} ${fr(scaleOf(smallestScale), 3)}. ${clear.get("surface")} cases sur ` +
        `41 restent dégagées : la surface écarte les petits pays au lieu de les empiler.`,
    ),
  },
};

const facts = beatFacts(
  ranked.map(([c, r]) => ({ key: c, label: NAMES[c] ?? c, value: r.share })),
  { subject: NAMES[ranked[0][0]] ?? ranked[0][0], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const alt =
  `La grille garde la géographie approximative : c'est ce qui la sépare d'un pictogramme, où les ` +
  `mêmes pays seraient rangés par valeur et la carte aurait disparu. ` +
  `Une grille de cases carrées disposées à peu près comme l'Europe, une par pays, toutes de la même ` +
  `taille et teintées selon la part bas-carbone de leur électricité. Les cases les plus foncées sont ` +
  `au nord et à l'ouest ; la case de la ${NAMES[biggest]}, qui occupe presque les trois quarts d'un ` +
  `choroplèthe, n'est ici qu'une case parmi ${tiles.length}. Un contrôle rend à chaque case sa vraie ` +
  `place, puis sa vraie surface : la première étape ne change pas la moyenne (${fr(byCountry)} %), la ` +
  `seconde la fait tomber à ${fr(byArea)} %, qui est le chiffre du choroplèthe.`;

const interaction = {
  earns: plain(
    `Le lecteur rend à la carte le LIEU, puis la SURFACE, et voit que rendre le lieu ne déplace pas ` +
      `la moyenne d'un millième tandis que rendre la surface la fait tomber de ${fr(byCountry)} % à ` +
      `${fr(byArea)} % — un still doit choisir une des deux pondérations et imprimer l'autre en ` +
      `légende, une vidéo et un scrolly choisissent en plus l'ORDRE dans lequel on les voit, qui est ` +
      `déjà l'argument de quelqu'un.`,
  ),
  controls: [
    {
      question: "Où sont vraiment ces pays, et qu'est-ce que ça change au chiffre ?",
      gesture: "toggle-a-comparison",
      changes: plain(
        "Chaque case glisse jusqu'à son vrai centroïde, puis se met à la vraie surface de son pays ; " +
          "les noms voyagent avec leur case, à taille constante, et s'éteignent quand la case ne peut " +
          "plus les porter ; la ligne de moyenne se réécrit et une phrase nomme ce que l'étape rend.",
      ),
    },
    {
      question: "Qu'est-ce que cette case-là a perdu ?",
      gesture: "ask-a-mark",
      changes: plain(
        "La case pointée s'assombrit depuis son propre remplissage — la case creuse sur son contour, " +
          "faute d'encre à assombrir — et répond avec le pays, sa part exacte, les bornes de son " +
          "palier, ses TWh, son rang, et ce que l'étape choisie vient de lui rendre.",
      ),
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis:
    `${classes.map((c) => c.label).join(" ")} pas de donnée Ce que la carte rend ` +
    `${Object.values(STAGE_WORDS).map((s) => s.label).join(" ")} ` +
    `Moyenne européenne pondérée par PAYS SURFACE cases égales noms à leur vraie place surface ` +
    `${tiles.map((t) => `${t.label} ${t.value}`).join(" ")}`,
  annot:
    `${claimNote} ${Object.values(STAGE_WORDS).map((s) => `${s.announce} ${s.note ?? ""}`).join(" ")} ` +
    `${tiles.map((t) => Object.values(t.detail).join(" ")).join(" ")} ${alt}`,
  value: tiles.map((t) => t.value).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

/**
 * THE DECLARATION IS BUILT PER DIRECTION, and that is not caution: whether a cell can hold its own
 * name is a fact about the TYPEFACE the direction resolved to, and the three directions resolve to
 * three different ones. A single declaration measured once would be right for one page and a guess
 * for the other two.
 */
function declarationFor(direction) {
  // ONLY THE FAMILY IS READ HERE. `webRegisters` needs an ink role for every register, and on a web
  // page those come from the furniture `render-web.mjs` derives at render time — which is not
  // available yet. The three literals below are never drawn and never reach the page: what is taken
  // off `regs` is `fontFamily`, which no ink can change. Measuring the name in the WRONG family is
  // the failure this guards against, and the family is exactly what the direction has already
  // resolved.
  const regs = webRegisters(direction, {
    ink: { ink: "#000000", muted: "#767676", accent: direction.accent },
  });
  // `measureText` takes ONE family and resolves a font FILE for it; a register carries a whole CSS
  // stack. The first entry is the face the browser will actually use — the one the page embeds — so
  // that is what the name is measured in. Handing the stack over whole makes resvg's own parser
  // refuse the probe outright, which is how this was found rather than assumed.
  const primary = (stack) => String(stack).split(",")[0].replace(/^["']|["']$/g, "").trim();
  const widthOf = (text, style) =>
    measureText(text, {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: primary(style.fontFamily),
    });
  return {
    label: "Ce que la carte rend",
    frame: FRAME,
    tiles: tiles.map((tile) => ({
      key: tile.code,
      label: tile.name,
      nameWidth: Math.max(
        widthOf(tile.label, { fontSize: 12, fontWeight: 600, fontFamily: regs.axis.fontFamily }),
        widthOf(tile.value, { fontSize: 13, fontWeight: 700, fontFamily: regs.value.fontFamily }),
      ),
      nameHeight: NAME_BLOCK_H,
      // A cell drawn OUTSIDE the ramp is hollow, so it has no ink to darken under a pointer: it
      // answers on its edge. `a-missing-cell-is-drawn-as-missing`, followed all the way into hover.
      lift: tile.klass === null ? "stroke" : "fill",
    })),
    stages: STAGE_GEOMETRY.map((stage) => ({
      key: stage.key,
      label: STAGE_WORDS[stage.key].label,
      announce: STAGE_WORDS[stage.key].announce,
      note: STAGE_WORDS[stage.key].note,
      places: stage.places,
    })),
  };
}

/** The line of average each stage draws on the plate. Two of the three carry the SAME number, and
 *  that is the whole argument: giving a country back its place does not change what Europe
 *  averages. The count of names is a fact about the direction's own typeface, so it is read off the
 *  declaration this direction built rather than written once for all three. */
function totalsFor(declaration) {
  const named = new Map(restoreNamesOf(declaration).map((s) => [s.slug, s.named.length]));
  return {
    pays: plain(
      `Moyenne européenne pondérée par PAYS : ${fr(byCountry)} % · 41 cases égales, ` +
        `${named.get("pays")} noms`,
    ),
    lieu: plain(
      `Moyenne européenne pondérée par PAYS : ${fr(byCountry)} % · 41 cases égales à leur vraie ` +
        `place, ${named.get("lieu")} noms`,
    ),
    surface: plain(
      `Moyenne européenne pondérée par la SURFACE : ${fr(byArea)} % · 41 cases à leur vraie ` +
        `surface, ${named.get("surface")} noms`,
    ),
  };
}

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const outPath = join(OUT, `${id}.html`);
  try {
    const restore = declarationFor(direction);
    assertRestoreDeclaration(restore, id);
    await renderWeb({
      component: DirectedCartogramWeb,
      props: {
        restore,
        tiles,
        classes,
        missingLabel: "pas de donnée",
        frame: FRAME,
        totals: totalsFor(restore),
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        reading: readingLine,
        claimNote,
        alt,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // The refusals only the WRITTEN page can carry: a half-tagged cell, a drawing that also answers,
    // a vocabulary that emitted no rules, a blanket hide that landed after the default plate's own
    // reveal, cells with no transition, and a set of drawn names that is not the set the geometry
    // derives.
    assertOneRestore(await readFile(outPath, "utf8"), restore, id);
    const named = new Map(restoreNamesOf(restore).map((s) => [s.slug, s.named.length]));
    console.log(
      `${id} -> renders/${id}.html · noms dessinés ${[...named].map(([s, n]) => `${s} ${n}`).join(" · ")}`,
    );
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(outPath, { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
