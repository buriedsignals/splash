// Europe's 2024 hydropower, rendered once per FILED DIRECTION into a self-contained scrolly page.
// The `cartogram` type in the scrolly format, on a live MapTiler map while it shows geography, the tiles
// outside it once it leaves (the same live-map handover as the sibling low-carbon cartogram).
//
// THE SUBJECT, CHOREOGRAPHED:
//
//   1. the map — every country as its territory, shaded by class, live;
//   2. Russia, the single largest producer, picked out on the map; "1 country" counts up to its own share;
//   3. the handover, then the morph — every country shrinks or swells into one equal tile; "3 countries"
//      (Russia, Norway, Turkey) counts up;
//   4. every tile resized to the hydro TWh its country produced; "5 countries" (+ France, Sweden) counts up;
//   5. the three counters on one rule, the tiles stepping back — one true concentration, counted three ways;
//   6. the equal tiles again, Ukraine (no 2024 reading) named.
//
// Usage:  set -a && . ./.env && set +a && bun stories/europe-hydropower-2024/beats/1/render-directions-scrolly.mjs [--only creme] [--no-bake]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { cartogramGeometry, cartogramMapPlan, fitCamera, iso2Of, projectorOf, withWidestName } from "./plan.mjs";
import { DirectedEuropeHydroScrolly } from "./DirectedEuropeHydroScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The Splash repo root — the nearest ancestor whose package.json declares the "#shared/*" import — found by
 *  walking up rather than counting levels, so this runner works unchanged from proof/<beat>/ or a story's own
 *  stories/<slug>/beats/<id>/. */
function splashRoot(startDir) {
  const looked = [];
  for (let dir = startDir; ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // an unparsable package.json is not this function's business — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\n  ${looked.join("\n  ")}`);
    dir = parent;
  }
}

const ROOT = splashRoot(HERE);
const { renderScrolly } = await import(join(ROOT, "skills", "scrolly", "scripts", "render-scrolly.mjs"));
const { openLiveMapCards, renderWithCardImages } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards-bake.mjs"));
// FIX (not in the scaffold): a story beat sits four levels below repo root (stories/<story>/beats/<n>/),
// not two (proof/<name>/, the worked example's own depth) — the scaffolded two-".." path resolved to a
// directory that does not exist and `readdirSync` threw. `stories/europe-coal-electricity-2024/beats/1/`
// carries the same unfixed bug.
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const YEAR = 2024;
const EYEBROW = "Energy · Europe";
const NB = " ";
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

/** The layout is designed, not derived — the static plate's own grid, unchanged. */
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
/** The map's window, [west, south, east, north]: Europe as the grid names it. Area figures are whole-country. */
const WINDOW = [-25, 34, 50, 72];
const FRAME = { width: 1000, height: 680 };
/** Shapes are kept this far past the frame, so a stage of any aspect stays covered (`fitViewBox`). */
const MARGIN = 900;
/** A seat inside Russia's own territory, west of the Urals, north enough to clear the card that reads
 *  over the map's middle (the same band the prose card and the beam sit in on every other card). */
const RUSSIA_SEAT = [42, 65];

// Data loading — hydro generation TWh per country, this beat's own frozen copy of the CSV
// (fields coerced to numbers, null preserved as no-data, throw on anything unusable).
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const hydro = new Map();
for (const line of csv.slice(1)) {
  const raw = Object.fromEntries(header.map((h, i) => [h, line.split(",")[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const v = raw.hydro_generation__twh;
  hydro.set(raw.code, v === "" || v === undefined ? null : Number(v));
}

const placed = [];
GRID.forEach((line, row) =>
  line.trim().split(/\s+/).forEach((code, col) => {
    if (code === "..") return;
    if (!hydro.has(code)) throw new Error(`the grid places ${code} and the data has no such code`);
    placed.push({ iso: code, col, row });
  }),
);
const missingFromGrid = [...hydro.keys()].filter((c) => !placed.some((p) => p.iso === c));
if (missingFromGrid.length) throw new Error(`the data has ${missingFromGrid.join(", ")} and the grid has no tile for them`);
for (const p of placed) iso2Of(p.iso); // every studied country joins MapTiler Countries, or refuses loudly here

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));

// ── THE CLAIM, ASSERTED — recomputed from the frozen data every render, never typed ────────────────
const withData = [...hydro.entries()].filter(([, v]) => v !== null);
const totalHydro = withData.reduce((s, [, v]) => s + v, 0);
const ranked = withData.map(([c]) => c).sort((a, b) => hydro.get(b) - hydro.get(a));
const shareOfTop = (n) => (ranked.slice(0, n).reduce((s, c) => s + hydro.get(c), 0) / totalHydro) * 100;
const leader = ranked[0];
if (leader !== "RUS") throw new Error(`the claim says Russia is the largest hydro producer; the largest is ${leader}`);
const top1Share = shareOfTop(1);
const top3Share = shareOfTop(3);
const top5Share = shareOfTop(5);
if (!(top1Share > 20)) throw new Error(`Russia alone is claimed near a quarter of Europe's hydro; it is ${top1Share.toFixed(1)}%`);
if (!(top3Share > top1Share && top5Share > top3Share)) throw new Error(`the three counters must grow: 1=${top1Share.toFixed(1)} 3=${top3Share.toFixed(1)} 5=${top5Share.toFixed(1)}`);
if (!(top5Share > 60)) throw new Error(`the headline says the top five are almost two-thirds; they are ${top5Share.toFixed(1)}%`);
const top5 = ranked.slice(0, 5);
if (top5.join() !== "RUS,NOR,TUR,FRA,SWE") throw new Error(`the top five producers are claimed as Russia, Norway, Turkey, France, Sweden; they are ${top5.join(", ")}`);
const unreported = [...hydro.entries()].filter(([, v]) => v === null).map(([c]) => c);
if (unreported.length !== 1 || unreported[0] !== "UKR") throw new Error(`the last card names Ukraine as the one country with no 2024 reading; unreported is ${unreported.join(", ") || "none"}`);
const smallestTwo = ranked.slice(-2).sort();
if (smallestTwo.join() !== "CYP,MLT") throw new Error(`the smallest producers are claimed as Cyprus and Malta; they are ${smallestTwo.join(", ")}`);

const BREAKS = [1, 5, 15, 50];
const CLASS_COUNT = BREAKS.length + 1;
const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);
const NAMES = { RUS: "Russia", NOR: "Norway", TUR: "Turkey", FRA: "France", SWE: "Sweden", UKR: "Ukraine", CYP: "Cyprus", MLT: "Malta" };
const nameOf = (iso) => {
  if (!NAMES[iso]) throw new Error(`${iso} is named by a card and this beat has no name recorded for it`);
  return NAMES[iso];
};
const one = (v) => plainSpaces(v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const twh = (iso) => plainSpaces(Math.round(hydro.get(iso)).toLocaleString("en-GB"));

// ── the live map's own camera and shapes, ONE coordinate space with the tile grid ────────────────
const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, FRAME);
const project = projectorOf(camera, FRAME);
const geometry = cartogramGeometry({ geo, placed }, { project, stage: FRAME, margin: MARGIN });
const countries = geometry.countries.map((c) => ({ ...c, value: hydro.get(c.iso), classIndex: classOf(hydro.get(c.iso)), twh: hydro.get(c.iso) ?? 0 }));
const leaderClassIndex = classOf(hydro.get(leader));

// ── the words ────────────────────────────────────────────────────────────────────────────────────
const title = [
  `Five countries produced ${one(top5Share)} % of Europe's 2024 hydropower — Russia alone, ${one(top1Share)} %`,
  `Europe's hydropower, concentrated in a handful of countries`,
  `Just five countries produced ${one(top5Share)} % of Europe's hydro in 2024`,
];
const prose = [
  [`2024 hydro generation of ${countries.length} European countries, on the map: each country takes the place of its own territory.`],
  [`${nameOf(leader)} alone generated ${twh(leader)} TWh of hydropower in 2024 — ${one(top1Share)} % of everything Europe's hydro plants produced.`],
  [`Give every country the same room: one equal tile, arranged roughly as the map. Add Norway and Turkey and the top three already reach ${one(top3Share)} %.`],
  [`Now resize each tile to the hydro TWh its country actually produced. ${nameOf("FRA")} and ${nameOf("SWE")} complete the top five — ${one(top5Share)} % from just five of ${withData.length} reporting countries.`],
  [`One country already a quarter, three near half, five nearly two-thirds: three counts of the same concentration.`],
  [`${nameOf("UKR")} has no 2024 reading: its tile stays empty. The other thirty-plus countries in this panel share what is left.`],
];
const source = "Source: Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · basemap © MapTiler © OpenStreetMap";
const top1Counter = { template: `1 country : {n} %`, value: Number(top1Share.toFixed(1)) };
const top3Counter = { template: `3 countries : {n} %`, value: Number(top3Share.toFixed(1)) };
const top5Counter = { template: `5 countries : {n} %`, value: Number(top5Share.toFixed(1)) };
const subjectNote = `${nameOf(leader)} · ${twh(leader)} TWh · ${one(top1Share)} %`;
const leaderMapLabel = `${nameOf(leader).toUpperCase()} · ${one(top1Share)} %`;
const missingNote = `${nameOf(unreported[0])} · no 2024 reading`;
const alt =
  `Map of Europe that becomes a tiled cartogram: ${countries.length} countries tinted by their 2024 hydro generation. ` +
  `Five of them produced ${one(top5Share)} % of the continent's hydropower; Russia alone, ${one(top1Share)} %.`;

/** One state per card; see `cartogram-drive.mjs`. `area`/`country`/`production` drive the three counters
 *  (top-1/top-3/top-5 share) — reusing the sibling low-carbon cartogram's three-counter mechanism for a
 *  single-metric concentration claim instead of three different means. */
const STATES_RAW = [
  { morph: 0, size: 0, subject: 0, area: 0, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 0, size: 0, subject: 1, area: 1, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 1, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 1 },
];
/** The live map's camera never moves; every card carries it, plus which card it is (`cartogram-drive.mjs`). */
const STATES = STATES_RAW.map((state, k) => ({ ...state, ...camera, card: k }));
const BAKE_STATES = STATES.slice(0, 2);
const CARD_TO_BAKE = STATES_RAW.map((state) => (state.subject ? 1 : 0));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${countries.map((c) => c.iso).join(" ")} ${BREAKS.map((b) => `${b} TWh`).join(" ")} hydro generation no 2024 reading`,
  annot: `${subjectNote} ${missingNote} ${leaderMapLabel}`,
  value: `${top1Counter.template} ${top3Counter.template} ${top5Counter.template} 0123456789, 0 50 100`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: CLASS_COUNT };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log(`1 country ${top1Share.toFixed(1)} · 3 countries ${top3Share.toFixed(1)} · 5 countries ${top5Share.toFixed(1)} · leader ${leader}\n`);

// ── the live map: its key, its faces, its frozen cards ─────────────────────────────────────────
const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "cartogram-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const ground = direction.ground;
      const accent = direction.accent;
      const { water: sea, land } = plateTints(direction);
      const floorOnGround = (colour, what) => {
        if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
        const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
        if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
        return lifted;
      };
      // The static plate's own colour rules, computed once here so the live map and the SVG tiles share the
      // exact same hex values (the video's own `build.mjs`).
      const low = floorOnGround(mix(accent, ground, 0.9), "the lowest class of the ramp");
      const high = mix(accent, ink, 0.3);
      const classFills = Array.from({ length: CLASS_COUNT }, (_, i) => mix(low, high, i / (CLASS_COUNT - 1)));
      const neutral = floorOnGround(mix(ground, ink, 0.22), "the neutral tile");
      const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
      const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
      const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
      const colours = { ground, sea, land, neutral, border: grid, missingEdge: mutedInk, classFills, text: { ink: inkOnGround, muted: mutedInk, accent: accentInk } };
      const hairline = direction.stroke?.hairline ?? 0.6;
      const strokes = { border: hairline, halo: hairline * 1.7 };

      const face = await cards.faceOf(regs.annot, "annot");
      const annotPx = Number.parseFloat(String(regs.annot.fontSize));
      let mapPlan = cartogramMapPlan({
        countries,
        widest: leader,
        colours,
        strokes,
        cameras: BAKE_STATES.map(() => camera),
        statesForCards: BAKE_STATES,
        referenceWidth: FRAME.width,
        referenceHeight: FRAME.height,
      });
      mapPlan = withWidestName(mapPlan, {
        at: RUSSIA_SEAT,
        text: leaderMapLabel,
        register: { fontSize: annotPx },
        face,
        ink: inkOnGround,
        halo: strokes.halo,
        haloColour: classFills[leaderClassIndex],
      });
      const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["map", "leader", "tiles", "resize", "counts", "missing"][i], prose: p })),
          reveal: {
            element: createElement(DirectedEuropeHydroScrolly, {
              plan: { ...mapPlan, fallback: shapes },
              // Every card gets its own fallback entry, reusing the two real bakes' bytes (`CARD_TO_BAKE`) —
              // no new images, so the fallback guard sees nothing duplicated.
              fallbacks: CARD_TO_BAKE.map((i) => fallbacks[i]),
              reference: FRAME,
              countries,
              width: FRAME.width,
              height: FRAME.height,
              breaks: BREAKS.map((b) => `${b}${NB}TWh`),
              unit: "hydro generation, TWh",
              missingLabel: "no 2024 reading",
              subject: leader,
              subjectNote,
              byArea: top1Counter,
              byCountry: top3Counter,
              byProduction: top5Counter,
              missingNote,
              alt,
              regs,
              colours,
            }),
            states: STATES,
            driver,
            apply: "applyEuropeHydroState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "en",
          outDir: OUT,
          name: `${id}.html`,
        });

      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan: mapPlan,
        states: BAKE_STATES,
        fallbackDir: FALLBACK,
        stageGround: ground,
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
