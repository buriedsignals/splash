// proof/scrolly-choropleth-europe-nuclear/render-directions-scrolly.mjs — where Europe's nuclear electricity
// is concentrated in 2024, as a choropleth scrolly on a live MapTiler map.
//
// THE CLAIM: only 16 of the 41 reporting countries generate any nuclear electricity at all, and three of
// those 16 — France, Russia, Spain — carry 69% of it, with France alone at nearly twice Russia's output.
//
// ONE ART DIRECTION BY DEFAULT (composed from PALETTE.md and this beat's own text); --filed renders the
// three demo directions instead. --no-bake reuses the card images already on disk. Every written page also
// gets a local, keyed `.local.html` copy beside it (git-ignored).
//
// Usage: set -a && . ./.env && set +a && bun proof/scrolly-choropleth-europe-nuclear/render-directions-scrolly.mjs [--filed] [--only <id>] [--no-bake]

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function splashRoot(startDir) {
  const looked = [];
  for (let dir = startDir; ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // not this function's business
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\n  ${looked.join("\n  ")}`);
    dir = parent;
  }
}

const ROOT = splashRoot(HERE);
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
const NB = " ";
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const FILED = process.argv.includes("--filed");
const NO_BAKE = process.argv.includes("--no-bake");

const { cameraFields } = await import("#shared/map-beat/scrolly.mjs");
const { readPalette } = await import("#shared/chart-beat/colour.mjs");

// ── the readings, and this beat's own assertions ──────────────────────────────────────────────
const YEAR = 2024;
function loadSubject() {
  const rows = readFileSync(join(HERE, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = rows[0].split(",");
  const iName = header.indexOf("entity");
  const iCode = header.indexOf("code");
  const iYear = header.indexOf("year");
  const iNuc = header.indexOf("nuclear_generation__twh");
  const entries = rows.slice(1).map((line) => {
    const cells = line.split(",");
    if (Number(cells[iYear]) !== YEAR) throw new Error(`${cells[iName]} is not ${YEAR}`);
    return { name: cells[iName], iso3: cells[iCode], nuclear: Number(cells[iNuc]) };
  });
  const total = entries.reduce((s, e) => s + e.nuclear, 0);
  const withNuclear = entries.filter((e) => e.nuclear > 0).sort((a, b) => b.nuclear - a.nuclear);
  if (entries.length !== 41) throw new Error(`the header says 41 reporting countries; the frozen file carries ${entries.length}`);
  if (withNuclear.length !== 16) throw new Error(`the claim says 16 of them generate any nuclear electricity; ${withNuclear.length} do`);
  const top3 = withNuclear.slice(0, 3);
  if (!(top3.map((e) => e.iso3).join(",") === "FRA,RUS,ESP")) throw new Error(`the claim names France, Russia, Spain as the top three; the data ranks ${top3.map((e) => e.name).join(", ")}`);
  const top3Share = (top3.reduce((s, e) => s + e.nuclear, 0) / total) * 100;
  if (Math.round(top3Share) !== 69) throw new Error(`the claim says the top three carry 69% of Europe's nuclear generation; the data says ${top3Share.toFixed(1)}%`);
  const france = top3[0];
  const russia = top3[1];
  if (!(france.nuclear > russia.nuclear * 1.7 && france.nuclear < russia.nuclear * 2)) throw new Error(`the claim says France generates nearly twice Russia's output; the data says ${(france.nuclear / russia.nuclear).toFixed(2)}x`);
  return { entries, total, withNuclear, top3, france, russia };
}
const subject = loadSubject();
const total = Math.round(subject.entries.length);
const nuclearCount = subject.withNuclear.length;
const franceTwh = Math.round(subject.france.nuclear);
const russiaTwh = Math.round(subject.russia.nuclear);

// ISO 3166-1 alpha-2, the code MapTiler Countries carries in `iso_a2` — the join key.
const ISO2 = { FRA: "FR", RUS: "RU", ESP: "ES", SWE: "SE", GBR: "GB", FIN: "FI", BEL: "BE", CZE: "CZ", CHE: "CH", SVK: "SK", HUN: "HU", BGR: "BG", BLR: "BY", ROU: "RO", SVN: "SI", NLD: "NL" };
const iso2Of = (iso3) => {
  if (!ISO2[iso3]) throw new Error(`no ISO A2 code recorded for ${iso3}`);
  return ISO2[iso3];
};
const HAS_NUCLEAR = subject.withNuclear.map((e) => iso2Of(e.iso3));
const TOP3 = subject.top3.map((e) => iso2Of(e.iso3));

// ── the words, and the cameras ────────────────────────────────────────────────────────────────
const EYEBROW = "Energy · Europe";
const title = [`Only ${nuclearCount} of Europe's ${total} countries generate nuclear electricity — and three of them carry most of it`, `Europe's nuclear power, concentrated`];
const prose = [
  [`Of the ${total} European countries reporting electricity generation in ${YEAR}, only ${nuclearCount} produced any nuclear power at all.`],
  [`Even among those ${nuclearCount}, output is concentrated: France, Russia and Spain alone account for 69${NB}% of Europe's nuclear generation.`],
  [`France leads by far — ${franceTwh}${NB}TWh in ${YEAR}, nearly twice Russia's ${russiaTwh}${NB}TWh, the next largest producer.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · basemap © MapTiler © OpenStreetMap";
const words = { unit: "nuclear electricity generation" };
const alt = `Choropleth map of Europe: ${nuclearCount} of ${total} countries generated nuclear electricity in ${YEAR}. Three of them — France (${franceTwh}${NB}TWh), Russia (${russiaTwh}${NB}TWh) and Spain — produced 69% of the total.`;
if ([title.join(""), prose.flat().join(""), source, JSON.stringify(words), alt].some((s) => s.includes("SCAFFOLD")))
  throw new Error("still carries placeholder copy");

const newsroom = readPalette(HERE);

const WHOLE = cameraFields({ center: [15, 52], zoom: 3.05 });
const FRANCE_SEAT = [2.4, 46.6];
const CLOSE = cameraFields({ center: FRANCE_SEAT, zoom: 4.7 });
const CAMERAS = [WHOLE, WHOLE, CLOSE];
if (CAMERAS.length !== prose.length) throw new Error(`CAMERAS carries ${CAMERAS.length} cameras for ${prose.length} cards of prose — one per card`);
const ODD_RING_DEGREES = 4;

const STATES = [
  { classes: 1, classes2: 0, odd: 0 },
  { classes: 1, classes2: 1, odd: 0 },
  { classes: 1, classes2: 1, odd: 1 },
].map((state, k) => ({ ...state, ...CAMERAS[k], card: k }));

const REFERENCE = { width: 1280, height: 800 };

// ── only past this point is the heavy machinery loaded ───────────────────────────────────────
const { createElement } = await import("react");
const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
const { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } = await import("#shared/chart-beat/colour.mjs");
const { readDirection } = await import("#shared/design-base/read-direction.mjs");
const { composeDirections, report } = await import("#shared/design-base/compose.mjs");
const { resolveDirectionFamilies } = await import("#shared/design-base/resolve-families.mjs");
const { webRegisters } = await import("#shared/design-base/web.mjs");
const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
const { validateExpressions } = await import("#shared/map-beat/mount.mjs");
const { validateScrollyPlan } = await import("#shared/map-beat/scrolly.mjs");
const { plateTints } = await import("#shared/map-beat/tints.mjs");
const { renderScrolly } = await import(join(ROOT, "skills", "scrolly", "scripts", "render-scrolly.mjs"));
const { openLiveMapCards, renderWithCardImages } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards-bake.mjs"));
const { nuclearChoroplethPlanOf } = await import("./choropleth-plan.mjs");
const { DirectedNuclearChoropleth } = await import("./DirectedNuclearChoropleth.tsx");

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: "France Russia Spain",
  annot: "",
  value: words.unit,
};

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort().map((f) => readDirection(join(DIRECTIONS, f)));
const BEAT_FACTS = { evidenceLevels: 2 };
const composition = composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister });
console.log(report(composition, { beat: BEAT_FACTS }));
console.log("");

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chosen = FILED
  ? filed.map((d) => ({ id: labelOf(d.id), direction: d }))
  : (() => {
      if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${report(composition, { beat: BEAT_FACTS })}`);
      return [{ id: labelOf(composition.offered[0].id), direction: composition.offered[0] }];
    })();
if (ONLY && !chosen.some((c) => c.id === ONLY)) throw new Error(`--only takes one of ${chosen.map((c) => c.id).join(", ")}`);
const toRender = chosen.filter((c) => !ONLY || c.id === ONLY);

const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "choropleth-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const { id, direction: picked } of toRender) {
    const direction = resolveDirectionFamilies(picked, textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const tints = plateTints(direction);
      const walked = (c, on, floor) => adjustToContrast(c, on, floor) ?? c;
      const accent = walked(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN);
      const classFills = [mix(accent, tints.land, 0.55), accent];
      const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent;
      const fonts = { face: await cards.faceOf(regs.axis, "axis"), size: Number.parseFloat(regs.axis.fontSize), accentInk };
      const plan = nuclearChoroplethPlanOf({
        tints: { water: tints.water, land: tints.land },
        cameras: CAMERAS,
        statesForCards: STATES,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        classFills,
        border: { color: mix(tints.land, grid, 0.4), width: direction.stroke?.hairline ?? 0.6 },
        hasNuclear: HAS_NUCLEAR,
        top3: TOP3,
        odd: { seat: FRANCE_SEAT, text: `France · ${franceTwh}${NB}TWh` },
        ringDegrees: ODD_RING_DEGREES,
        fonts,
      });
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: `card-${i + 1}`, prose: p })),
          reveal: {
            element: createElement(DirectedNuclearChoropleth, {
              plan: { ...plan, fallback: shapes },
              first: STATES[0],
              reference: REFERENCE,
              fallbacks,
              alt,
              ground: direction.ground,
              water: tints,
            }),
            states: STATES,
            driver,
            apply: "applyNuclearChoroplethState",
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
        plan,
        states: STATES,
        fallbackDir: FALLBACK,
        stageGround: tints.water,
        cardOf: (baked) => ({ zoom: baked.zoom }),
        renderPage,
        noBake: NO_BAKE,
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
