// Europe's low-carbon power stations, one dot each, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `dot density` type in the scrolly format, on a live MapTiler map (addendum 2026-09-15).
//
// THE SUBJECT OF `static-dot-density-europe-stations`, CHOREOGRAPHED:
//
//   1. the land, empty — the live basemap itself, no dots yet;
//   2. the stations arriving fuel by fuel, counted;
//   3. the 72 nuclear sites arriving, ringed, the rest stepping back;
//   4. every dot taking the area of its capacity;
//   5. the camera onto the country with most of the nuclear sites, its own averages;
//   6. back to one dot per station, and the database's limit.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-dot-density-europe-stations/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, mercatorOf, lonLatOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
import { dotDensityPlan } from "./plan.mjs";
import { DirectedDotDensityScrolly } from "./DirectedDotDensityScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const EYEBROW = "Énergie · Europe";
const NB = " ";
const SUBJECT = "Nuclear";
const WHOLE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const FUEL_WORDS = { Solar: "solaire", Wind: "éolien", Hydro: "hydraulique", Biomass: "biomasse", Geothermal: "géothermie", "Wave and Tidal": "marées", Nuclear: "nucléaire" };
const COUNTRY = { France: ["France", "en France"], "United Kingdom": ["Royaume-Uni", "au Royaume-Uni"], Germany: ["Allemagne", "en Allemagne"], Russia: ["Russie", "en Russie"] };
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// ── the stations, and the static beat's own assertions (unchanged) ──────────────────────────────
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

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const listOf = (xs) => `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;
const [focusName, inFocusWords] = COUNTRY[focus];
console.log(`${total} centrales · nucléaire ${nuclear.length} (${shareSites.toFixed(2)} %) · ${shareCapacity.toFixed(1)} % de la puissance · ${focus} ${focusSites} sites, ${focusNuclear.toFixed(0)} MW contre ${focusSolar.toFixed(1)} MW\n`);

// ── the cameras: whole-map is the box the stations fill, not the continental window ─────────────
const proj = stations.map((s) => ({ ...s, m: mercatorOf([s.lon, s.lat]) }));
const pctile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))];
const ex0 = pctile(proj.map((p) => p.m[0]), 0.01);
const ex1 = pctile(proj.map((p) => p.m[0]), 0.99);
const ey0 = pctile(proj.map((p) => p.m[1]), 0.01);
const ey1 = pctile(proj.map((p) => p.m[1]), 0.99);
const padX = (ex1 - ex0) * 0.06;
const padY = (ey1 - ey0) * 0.06;
const [bx0, bx1, by0, by1] = [ex0 - padX, ex1 + padX, ey0 - padY, ey1 + padY];
const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);

/** THE CLOSE-UP CENTRES THE FOCUS COUNTRY'S NUCLEAR SITES ON BOTH AXES: their box, 15 % over, fitted in. */
const focusNuclearPts = nuclear.filter((s) => s.country === focus).map((s) => mercatorOf([s.lon, s.lat]));
const fx0 = Math.min(...focusNuclearPts.map((p) => p[0]));
const fx1 = Math.max(...focusNuclearPts.map((p) => p[0]));
const fy0 = Math.min(...focusNuclearPts.map((p) => p[1]));
const fy1 = Math.max(...focusNuclearPts.map((p) => p[1]));
const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((fx1 - fx0) * 1.15 * 512), REFERENCE.height / ((fy1 - fy0) * 1.15 * 512)));
const CLOSE_CENTER = lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]);

const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
const closeUp = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM, alignY: 0 });
const cameras = [whole, whole, whole, whole, closeUp, whole];

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
const source = "Source : WRI Global Power Plant Database v1.3.0 · fond de carte © MapTiler © OpenStreetMap";
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
const alt =
  `Carte de l’Europe où chacune des ${n0(total)} centrales bas-carbone est un point à ses coordonnées. Les ${nuclear.length} sites nucléaires, ` +
  `cerclés, ne sont que ${one(shareSites)} % des centrales mais portent ${one(shareCapacity)} % de la puissance installée.`;
const firstCounter = words.count.replace("{n}", "0");

/** One state per card; see `dot-drive.mjs` for what each field paints. */
const STATES = [
  { arrive: 0, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 1, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 1 },
  { arrive: 1, subject: 1, fade: 0, weight: 0, zoom: 0 },
].map((state, k) => ({ ...state, ...cameras[k], card: k }));

// ── the fuel buckets, most numerous first (arrival order), and the nuclear set ───────────────────
const maxMw = Math.max(...stations.map((s) => s.mw));
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const asPoint = (s) => ({ lon: round4(s.lon), lat: round4(s.lat), r: round4(Math.sqrt(s.mw / maxMw)) });
const buckets = others.map((fuel) => ({ fuel, stations: stations.filter((s) => s.fuel === fuel).map(asPoint) }));
if (buckets.reduce((a, b) => a + b.stations.length, 0) !== total - nuclear.length) throw new Error("the fuel buckets do not hold every non-nuclear station once");
const nuclearPoints = nuclear.map(asPoint);

/** THE LARGEST SITE'S SCREEN RADIUS AT A WEIGHT: capped well under the size that fuses a dense cluster (France,
 *  Germany, Benelux) into one mass — measured live against the owner's own reading (2026-09-15). */
const WEIGHT_LARGEST_PX = 38;
/** THE STATIC PLATE'S OWN COUNT-DOT RANGE, taken at its low end: the field has to show gaps in its densest
 *  cell, not fuse into a mass. TEXTURE COMES FROM THIS RADIUS, NOT FROM OPACITY: every dot is fully opaque
 *  (owner, 2026-09-15 — a partial-opacity fill next to the fully-opaque weight-mode circles and the nuclear
 *  ring read as an unexplained "some circles have a border and some don't"). */
const COUNT_RADIUS_PX = 0.9;
const sizes = [100, 1000, 5000].map((mw) => ({ mw, label: `${n0(mw)}${NB}MW`, px: Math.max(1.2, Math.sqrt(mw / maxMw) * WEIGHT_LARGEST_PX * 2) }));

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

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "dot-drive.mjs"), "utf8")}`;
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
      // MEASURED AGAINST THE BASEMAP'S OWN TINTS (`tints.land`, `tints.water` — what the live sweep actually
      // paints), not the page ground: a mark sits on the map, never on the header's paper. THE DOT IS THE
      // DIRECTION'S OWN PALETTE (the accent), pushed only as far as the 3:1 mark floor needs — never pure black:
      // a field of 8,900 black dots read as a solid mass, not as a density (owner, 2026-09-15). The subject's ring
      // is the ink instead, thin, so it reads as an outline over the field rather than a second dot colour.
      const colours = {
        dot: adjustToContrast(adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent, tints.water, NON_TEXT_CONTRAST_MIN) ?? direction.accent,
        ring: adjustToContrast(adjustToContrast(ink, tints.land, NON_TEXT_CONTRAST_MIN) ?? ink, tints.water, NON_TEXT_CONTRAST_MIN) ?? ink,
        // A PALE TINT OF THE ACCENT, MOSTLY TOWARD THE LAND: ordinary stations at a weight are dust beside the
        // nuclear discs, not a second strong colour competing with them (owner, 2026-09-15).
        paleFill: mix(direction.accent, tints.land, 0.72),
        // THE STROKE THAT SEPARATES TWO OVERLAPPING DISCS reads as the page's own ground — a gap, never a black
        // outline (which is what a nuclear ring lost in a fused mass looked like) — but is nudged a few percent
        // off it: the live map's own guard samples the canvas for the page's exact ground colour to catch a
        // country the tiles never drew, and a stroke drawn in that exact colour is indistinguishable from one.
        strokeGround: mix(direction.ground, ink, 0.04),
      };
      if (contrast(colours.dot, colours.ring) < 1.5) throw new Error(`the dot (${colours.dot}) and the nuclear ring (${colours.ring}) measure ${contrast(colours.dot, colours.ring).toFixed(2)}:1 apart — under the 1.5:1 floor two neighbouring classes need`);
      if (contrast(colours.dot, colours.paleFill) < 1.5) throw new Error(`the nuclear disc (${colours.dot}) and the ordinary pale disc (${colours.paleFill}) measure ${contrast(colours.dot, colours.paleFill).toFixed(2)}:1 apart — the subject would not stand out from the dust`);
      const plan = dotDensityPlan({
        tints: { water: tints.water, land: tints.land },
        buckets,
        nuclear: nuclearPoints,
        colours,
        cameras,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        countRadius: COUNT_RADIUS_PX,
        weightLargestPx: WEIGHT_LARGEST_PX,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["carte", "centrales", "nucleaire", "puissance", "gros-plan", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedDotDensityScrolly, {
              plan: { ...plan, fallback: shapes },
              fallbacks,
              reference: REFERENCE,
              total: total - nuclear.length,
              firstCounter,
              sizes,
              dotColour: colours.dot,
              ringColour: colours.ring,
              paleColour: colours.paleFill,
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
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
