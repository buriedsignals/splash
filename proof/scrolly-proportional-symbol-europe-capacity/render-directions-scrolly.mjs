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
//   4. the nuclear sites isolated, the camera centred on the country with most of them;
//   5. all 8,900: the field closes;
//   6. the static plate's cut and its key.
//
// THE MAP IS A LIVE, FLAT (WEB MERCATOR) MAPTILER MAP DRIVEN BY A PLAN (`plan.mjs`, addendum 2026-09-15 §2–§3): the
// circles are circle layers over the basemap's own land and sea, the largest station's name a symbol layer, each card
// carries its camera, and one frozen image per card is baked from the same plan under the live map (`fallback/`,
// `skills/scrolly/scripts/live-map-cards-bake.mjs`). The page carries `__MAPTILER_KEY__`; the key is substituted at
// delivery.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-proportional-symbol-europe-capacity/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, mercatorOf, lonLatOf, stageViewOf, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { arrivalsFor, proportionalPlan } from "./plan.mjs";
import { DirectedProportionalScrolly } from "./DirectedProportionalScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
const SUBJECT = "Nuclear";
const TOP = 100;
/** The static plate's cut: the stations it draws, the ones carrying most of the weight. */
const THRESHOLD = 400;
/** The largest station, named from its place: the dataset carries no names. */
const LARGEST = { country: "Ukraine", fuel: "Nuclear", mw: 6000, lon: 34.5863, lat: 47.5119, name: "Zaporijia" };
const COUNTRY = { France: ["France", "en France"], Russia: ["Russie", "en Russie"], Ukraine: ["Ukraine", "en Ukraine"] };
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

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
// Card 6 shows the plate's cut as the first `cutCount` stations by rank: that is the cut only if no station under it
// ranks above one at or over it.
if (stations.slice(0, cutCount).some((s) => s.mw < THRESHOLD)) throw new Error(`the ${cutCount} largest stations are not the stations of ${THRESHOLD} MW or more`);
const sitesBy = {};
for (const s of nuclear) sitesBy[s.country] = (sitesBy[s.country] ?? 0) + 1;
const [focus, focusSites] = Object.entries(sitesBy).sort((a, b) => b[1] - a[1])[0];
if (!COUNTRY[focus]) throw new Error(`${focus} now holds most of the nuclear sites and has no French name filed here`);
console.log(`${total} centrales · top ${TOP} ${shareTop.toFixed(1)} % (${nuclearInTop} nucléaires) · nucléaire ${nuclear.length} (${shareNuclearSites.toFixed(2)} %, ${shareNuclearMw.toFixed(1)} %) · ≥ ${THRESHOLD} MW ${cutCount} (${shareCut.toFixed(1)} %) · ${focus} ${focusSites}\n`);

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const [, inFocus] = COUNTRY[focus];

// ── the cameras, from the beat's own facts ─────────────────────────────────────────────────────
/** THE STUDY WINDOW: Iceland to Cyprus, Portugal to western Russia, as the SVG beat framed it, and north to the
 *  northernmost station (71.0° N), so the 43 small northern stations above 68° N are in the whole map too (owner,
 *  2026-09-15). A phone's view does not change with the north edge: its map is fitted by width and sits at the bottom
 *  of the stage, where only the south edge places it. */
const BOUNDS = { west: -24.6, east: 45, south: 34.5, north: 71.2 };
const northernmost = Math.max(...stations.map((s) => s.lat));
if (!(northernmost < BOUNDS.north)) throw new Error(`the whole map's north edge (${BOUNDS.north}° N) cuts off a station at ${northernmost}° N`);
const [bx0, by1] = mercatorOf([BOUNDS.west, BOUNDS.south]);
const [bx1, by0] = mercatorOf([BOUNDS.east, BOUNDS.north]);
/** The reference stage is the window itself, 1280 px wide: every stage keeps the whole window in view (`zoomShiftFor`
 *  fits it by the tighter axis). */
const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);
/** THE WINDOW THE OWNER APPROVED THE CIRCLE SIZES AND THE CLOSE-UP ON (north edge 68° N, 2026-09-15): the close-up and
 *  the radius anchor are fitted to it, so growing the window north leaves a phone's cards and every circle's size at a
 *  given zoom as they were; a desktop, fitted by height, draws every card 0.22 zoom levels further out. */
const APPROVED_WINDOW_NORTH = 68;
const approvedHeight = (1280 * (by1 - mercatorOf([BOUNDS.east, APPROVED_WINDOW_NORTH])[1])) / (bx1 - bx0);
/** THE CLOSE-UP CENTRES THE FOCUS COUNTRY'S NUCLEAR SITES ON BOTH AXES, no padding: their box, one and a half times
 *  over (the SVG's `boxAround(…, 1.5)`), fitted into the reference. */
const focusSites_ = nuclear.filter((s) => s.country === focus).map((s) => mercatorOf([s.lon, s.lat]));
const fx0 = Math.min(...focusSites_.map((p) => p[0]));
const fx1 = Math.max(...focusSites_.map((p) => p[0]));
const fy0 = Math.min(...focusSites_.map((p) => p[1]));
const fy1 = Math.max(...focusSites_.map((p) => p[1]));
// Fitted into the approved window's reference, whose zoom shift is the phone's: a phone's close-up is unchanged.
const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((fx1 - fx0) * 1.5 * 512), approvedHeight / ((fy1 - fy0) * 1.5 * 512)));
const CLOSE_CENTER = lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]);
/** ON A PHONE THE WHOLE WINDOW SITS AT THE BOTTOM OF THE STAGE (`camAlignY: 1`), so the station card 1 names stands
 *  below the resting card, not under it; a desktop stage is fitted by its height and has no room to move. */
const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
const closeUp = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM, alignY: 0 });
const cameras = [whole, whole, whole, closeUp, whole, whole];

/** THE RADIUS THE SVG BEAT GAVE THE LARGEST STATION AT THE WHOLE-MAP CAMERA, on the stage its page published at
 *  1280 × 800 (1168 × 536, measured on 2026-09-15): `clamp(12, 30, width / 42)`, anchored at the zoom that stage drew
 *  the window to 68° N at — the circle sizes the owner approved, kept when the window grew north to hold every station
 *  (a desktop now draws the largest at 26.4 px, a phone unchanged at 21.9 px). Every other stage and camera takes it
 *  through one zoom interpolation (`plan.mjs`). */
const SVG_DESKTOP_STAGE = { width: 1168, height: 536 };
const referencePlan = { referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height };
const radius = {
  largestPx: Math.max(12, Math.min(30, SVG_DESKTOP_STAGE.width / 42)),
  anchorZoom: WHOLE_ZOOM + zoomShiftFor({ referenceWidth: REFERENCE.width, referenceHeight: approvedHeight }, SVG_DESKTOP_STAGE.width, SVG_DESKTOP_STAGE.height),
  growth: 0.35,
};

/** EVERY CARD'S SUBJECT IS IN ITS VIEW, on a desktop stage and on a phone's: the named station on the whole map,
 *  and every one of the focus country's nuclear sites in the close-up. */
const inView = (plan, camera, stage, [lon, lat], margin) => {
  const view = stageViewOf(plan, camera, stage.width, stage.height);
  const scale = 512 * 2 ** view.zoom;
  const [cx, cy] = mercatorOf(view.center);
  const [x, y] = mercatorOf([lon, lat]);
  const px = (x - cx) * scale + stage.width / 2;
  const py = (y - cy) * scale + stage.height / 2;
  return px > margin && px < stage.width - margin && py > margin && py < stage.height - margin;
};
for (const stage of [SVG_DESKTOP_STAGE, { width: 330, height: 414 }]) {
  if (!inView(referencePlan, whole, stage, [LARGEST.lon, LARGEST.lat], 30)) throw new Error(`card 1 names ${LARGEST.name}, which the whole-map camera does not hold on a ${stage.width} × ${stage.height} stage`);
  for (const s of nuclear.filter((s) => s.country === focus))
    if (!inView(referencePlan, closeUp, stage, [s.lon, s.lat], 0)) throw new Error(`card 4 centres ${focus}'s nuclear sites, and one of them leaves the close-up on a ${stage.width} × ${stage.height} stage`);
}

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
const source = "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap";
const words = {
  unit: "centrales bas-carbone, de la plus puissante à la plus petite",
  counter: `{n} centrales · {sites} des sites · {mw} de la puissance`,
  subjectNote: `${nuclear.length} sites nucléaires${NB}: ${one(shareNuclearSites)}${NB}% des sites, ${one(shareNuclearMw)}${NB}% de la puissance`,
  cutNote: `${cutCount} centrales de ${THRESHOLD}${NB}MW ou plus${NB}: ${one(shareCut)}${NB}% de la puissance`,
  circleIs: "un cercle = une centrale, aire proportionnelle à la puissance",
  cut: `Sous ${THRESHOLD}${NB}MW, non dessiné${NB}: à ${n0(total)} cercles le champ se referme. Le petit solaire et le petit éolien sont sous-représentés dans la base.`,
};
const sizes = [4000, 1000, 400].map((mw) => ({ mw, label: `${n0(mw)}${NB}MW` }));
const largestLabel = `${LARGEST.name} · ${n0(first.mw)}${NB}MW`;
const percent = (v) => `${(v < 0.1 ? v.toFixed(2) : v.toFixed(1)).replace(".", ",")}${NB}%`;
const firstCounter = words.counter.replace("{n}", "1").replace("centrales", "centrale").replace("{sites}", percent((1 / total) * 100)).replace("{mw}", percent(cumulative[0]));
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
].map((state, k) => ({ ...state, ...cameras[k], card: k }));

/** THE RANK BUCKETS, a layer each (`plan.mjs`), TEN TO A DECADE: every one of the ten largest alone, then buckets a
 *  quarter wider each, so as the count climbs the circles arrive nearly one by one, each bucket fading in over its own
 *  ranks. The plate's cut and 1,000 are bucket edges, so card 6 keeps exactly its stations. */
const EDGES = [...new Set([
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 29 }, (_, i) => Math.round(10 ** (1 + (i + 1) / 10))).filter((e) => e > 10 && e < total),
  cutCount,
  1000,
  total,
])].sort((a, b) => a - b);
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const bands = arrivalsFor(EDGES.map((to, i) => {
  const from = i === 0 ? 1 : EDGES[i - 1] + 1;
  const members = stations.slice(from - 1, to).map((s) => ({ lon: round4(s.lon), lat: round4(s.lat), r: round4(Math.sqrt(s.mw / first.mw)), nuclear: s.fuel === SUBJECT }));
  return { from, to, nuclear: members.filter((m) => m.nuclear), others: members.filter((m) => !m.nuclear) };
}), STATES.map((s) => s.level));
if (bands.reduce((a, b) => a + b.nuclear.length + b.others.length, 0) !== total) throw new Error("the rank bands do not hold every station once");
// EVERY CARD SHOWS EXACTLY ITS STATIONS once the staggered arrivals have landed: the counter's count (`symbol-drive.mjs`)
// equals the card's own count at its level.
for (const [k, state] of STATES.entries()) {
  const arrived = bands.reduce((n, b) => n + (b.to - b.from + 1) * Math.max(0, Math.min(1, (state.level - b.a) / (b.b - b.a))), 0);
  if (Math.abs(arrived - Math.round(10 ** state.level)) > 1e-6) throw new Error(`card ${k + 1} should show ${Math.round(10 ** state.level)} stations; the arrivals give ${arrived}`);
}

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.circleIs} ${words.cut} ${sizes.map((s) => s.label).join(" ")}`,
  annot: largestLabel,
  value: `${words.counter} ${words.subjectNote} ${words.cutNote} 0123456789,%`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "symbol-drive.mjs"), "utf8")}`;
const trackingEm = (register) => Number.parseFloat(register.letterSpacing ?? "0") / Number.parseFloat(register.fontSize);
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const tints = plateTints(direction);
      const colours = {
        circle: adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent,
      };
      const fonts = {
        annot: await cards.faceOf(regs.annot, "annot"),
        annotSize: Number.parseFloat(regs.annot.fontSize),
        annotTracking: trackingEm(regs.annot),
        ink: adjustToContrast(ink, tints.land, TEXT_CONTRAST_MIN) ?? ink,
      };
      const plan = proportionalPlan({
        tints: { water: tints.water, land: tints.land },
        bands,
        colours,
        fonts,
        largest: { lon: first.lon, lat: first.lat, text: largestLabel },
        cameras,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        radius,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["la-plus-grosse", "dix", "cent", "nucleaire", "toutes", "coupe"][i], prose: p })),
          reveal: {
            element: createElement(DirectedProportionalScrolly, {
              plan: { ...plan, fallback: shapes },
              fallbacks,
              reference: REFERENCE,
              cumulative: cumulative.map((v) => Math.round(v * 100) / 100),
              maxMw: first.mw,
              firstCounter,
              firstSwatchPx: radius.largestPx,
              sizes,
              circle: colours.circle,
              words,
              alt,
              regs,
              ground: direction.ground,
              accent: direction.accent,
              ink,
              muted,
              water: tints.water,
            }),
            states: STATES,
            driver,
            apply: "applySymbolState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "fr",
          outDir: OUT,
          name: `${id}.html`,
        });

      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan,
        states: STATES,
        fallbackDir: FALLBACK,
        stageGround: tints.water,
        cardOf: (baked) => ({ zoom: baked.zoom }),
        renderPage,
        noBake: process.argv.includes("--no-bake"),
      });
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")} · face ${fonts.annot}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
console.log(`faces served by MapTiler, each checked against the Noto Sans fallback: ${[...cards.servedFaces.keys()].join(", ")}`);
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
