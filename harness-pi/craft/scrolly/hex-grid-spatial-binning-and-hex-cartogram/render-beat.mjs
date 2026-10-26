// The generic half of a hex grid (hex cartogram) SCROLLY beat, taken from
// proof/scrolly-hex-grid-europe-protection/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one equal hexagon per country on the kit's DESIGNED layout over an unmoving live MapTiler
// backdrop (plan.mjs, verbatim), counts and rates on the same cells (hex-drive.mjs, verbatim):
//
//   1 grid     the grid, uncoloured; the origin country greyed (on the grid, outside the count);
//   2 count    the cells take the count's classes; the count key;
//   3 rate     the same cells cross-fade to the rate's classes (per 1 000 residents); the rate key;
//   4 rank     the cells leave the map for a honeycomb in rate order, each with its rate;
//   5 pair     back on the map: the top rate and the largest count ringed with their rates;
//   6 limits   the grid by rate, its key and the note on the origin; the reading line.
//
// Under the backdrop, one frozen image (the map never changes). The page in renders/ carries
// `__MAPTILER_KEY__`; the key is substituted only in temporary copies, removed.
//
// This file computes every figure the cards may state (counts, rates, ranks) and checks the words
// against them; ./beat.mjs — the one file the model writes — gives the rows and the WORDS. Copied into
// the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { fitCamera, hexMapPlan, iso2Of } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids. */
const CARDS = ["grid", "count", "rate", "rank", "pair", "limits"];
const WINDOW = [-25, 34, 45, 72];
const REFERENCE = { width: 1200, height: 700 };
/** The rate's base: residents per cell's rate. */
const PER = 1000;
/** The worked example's designed layout: odd rows offset by half a cell. A cell the story does not give is left out. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const STATES_RAW = [
  { fill: 0, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 1, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 1 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedHexScrolly } = await import("./DirectedHexScrolly.tsx");

  const REQUIRED = ["eyebrow", "origin", "rows", "countBreaks", "rateBreaks", "number", "countUnit", "rateUnit", "countNote", "rateNote", "rankNote", "pairNote", "originNote", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["number", "countNote", "rateNote", "rankNote", "pairNote", "originNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: card 6's reading line (see CONTRACT.md)");

  // ── the cells: every row a country of the layout; the origin greyed ─────────────────────────────
  const onGrid = new Set(GRID.flatMap((l) => l.trim().split(/\s+/)).filter((c) => c !== "."));
  const origin = beat.origin;
  if (!origin || !onGrid.has(origin.iso) || !String(origin.name ?? "").trim())
    throw new Error(`origin must be { iso, name } — the country the people counted come from, a cell of the layout (${[...onGrid].join(" ")}); got ${JSON.stringify(origin)}`);
  if (!Array.isArray(beat.rows) || beat.rows.length < 6) throw new Error("rows must be one { iso, name, count, population } per host country, at least 6 (see CONTRACT.md)");
  const off = beat.rows.filter((r) => !onGrid.has(r.iso));
  if (off.length) throw new Error(`these rows have no cell on the layout: ${off.map((r) => JSON.stringify(r.iso)).join(", ")}. The layout holds ${[...onGrid].join(" ")} (ISO alpha-3); this kit cannot place another country`);
  const seen = new Set();
  for (const r of beat.rows) {
    if (r.iso === origin.iso) throw new Error(`rows hold the origin ${origin.iso}: it is on the grid and outside the count — leave it out of rows`);
    if (seen.has(r.iso)) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country (one month, one series)`);
    seen.add(r.iso);
    if (!String(r.name ?? "").trim()) throw new Error(`rows: ${r.iso} has no name`);
  }
  assertNumbers(beat.rows.flatMap((r) => [[`${r.iso} count`, r.count], [`${r.iso} population`, r.population]]));
  if (beat.rows.some((r) => !(r.count > 0) || !(r.population > 0))) throw new Error("rows hold a count or a population that is not above zero: every host needs both, the rate is count ÷ population");
  const hosts = beat.rows.map((r) => r.iso);
  for (const code of [...hosts, origin.iso]) iso2Of(code);
  const byIso = Object.fromEntries(beat.rows.map((r) => [r.iso, r]));
  const NAME = { ...Object.fromEntries(beat.rows.map((r) => [r.iso, plain(r.name)])), [origin.iso]: plain(origin.name) };
  const rate = (code) => (byIso[code].count / byIso[code].population) * PER;
  const cells = [];
  GRID.forEach((row, r) => row.trim().split(/\s+/).forEach((code, col) => code !== "." && (code === origin.iso || byIso[code]) && cells.push({ code, row: r, col })));
  const ranked = [...hosts].sort((a, b) => rate(b) - rate(a));
  const byCount = [...hosts].sort((a, b) => byIso[b].count - byIso[a].count);
  const [top, largest, last] = [ranked[0], byCount[0], ranked[ranked.length - 1]];
  if (top === largest) throw new Error(`${NAME[top]} leads both by count and by rate: this choreography is about the ranking turning over (card 5 rings the two), so it needs two different leaders`);
  const pub = (code) => ({ iso: code, name: NAME[code], count: byIso[code].count, population: byIso[code].population, rate: rate(code), rateRank: ranked.indexOf(code) + 1, countRank: byCount.indexOf(code) + 1 });

  const BREAKS = { count: beat.countBreaks, rate: beat.rateBreaks };
  for (const [k, b] of Object.entries(BREAKS))
    if (!Array.isArray(b) || b.length !== 4 || b.some((v, i) => typeof v !== "number" || !(v > 0) || (i && v <= b[i - 1])))
      throw new Error(`${k}Breaks must be 4 rising numbers above zero (five classes: the key has five swatches); got ${JSON.stringify(b)}`);
  const classBy = (breaks, v) => breaks.filter((b) => v >= b).length;

  const reading = {
    origin: { iso: origin.iso, name: NAME[origin.iso] },
    count: hosts.length,
    per: PER,
    topRate: pub(top),
    largestCount: pub(largest),
    secondCount: pub(byCount[1]),
    lastRate: pub(last),
    ranked: ranked.map(pub),
    byCount: byCount.map(pub),
    countBreaks: [...BREAKS.count],
    rateBreaks: [...BREAKS.rate],
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(hosts.map((c) => byIso[c].count), HERE);

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const n1 = (v) => plain(beat.number(v, 1));
  const n0 = (v) => plain(beat.number(v, 0));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const OWES = {
    grid: [["r.origin.name", reading.origin.name]],
    count: [["r.largestCount.name", reading.largestCount.name], ["number(r.largestCount.count, 0)", n0(reading.largestCount.count)], ["r.secondCount.name", reading.secondCount.name]],
    rate: [["r.topRate.name", reading.topRate.name], ["number(r.topRate.rate, 1)", n1(reading.topRate.rate)]],
    rank: [["r.topRate.name", reading.topRate.name], ["r.largestCount.rateRank", String(reading.largestCount.rateRank)], ["r.lastRate.name", reading.lastRate.name], ["number(r.lastRate.rate, 1)", n1(reading.lastRate.rate)]],
    pair: [["number(r.topRate.rate, 1)", n1(reading.topRate.rate)], ["number(r.largestCount.rate, 1)", n1(reading.largestCount.rate)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k]) if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const named = [reading.topRate, reading.largestCount, reading.secondCount, reading.lastRate];
  const known = [hosts.length, PER, ...named.flatMap((c) => [c.count, c.rate, c.rateRank, c.countRank]), ...BREAKS.count, ...BREAKS.rate];
  const check = figureCheck({ format: (v) => beat.number(v, 1), known, hint: "r.topRate.rate, r.largestCount.count, r.largestCount.rateRank, …" });
  WORDED.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  const words = {
    countUnit: plain(beat.countUnit),
    rateUnit: plain(beat.rateUnit),
    countNote: say("countNote", beat.countNote).join(" "),
    rateNote: say("rateNote", beat.rateNote).join(" "),
    rankNote: say("rankNote", beat.rankNote).join(" "),
    pairNote: say("pairNote", beat.pairNote).join(" "),
    originNote: say("originNote", beat.originNote).join(" "),
  };
  for (const k of ["countUnit", "rateUnit", "countNote", "rateNote", "rankNote", "pairNote", "originNote"]) check(k, words[k]);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [...hosts.map((c) => byIso[c].count), ...hosts.map(rate), PER], "cells");

  const tiles = cells.map((c) => {
    const isOrigin = c.code === origin.iso;
    return {
      ...c,
      name: NAME[c.code],
      count: isOrigin ? null : byIso[c.code].count,
      rate: isOrigin ? null : rate(c.code),
      countClass: isOrigin ? null : classBy(BREAKS.count, byIso[c.code].count),
      rateClass: isOrigin ? null : classBy(BREAKS.rate, rate(c.code)),
      rateText: isOrigin ? "" : n1(rate(c.code)),
    };
  });
  // The count key in thousands ("50 k"), the rate key at one decimal — the worked example's.
  const countBreakLabels = BREAKS.count.map((b) => `${n0(b / 1000)} k`);
  const rateBreakLabels = BREAKS.rate.map((b) => n1(b));
  const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, REFERENCE);
  const STATES = STATES_RAW.map((state) => ({ ...state, ...camera, card: 0 }));
  const BAKE_STATES = STATES.slice(0, 1);

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.countUnit} ${words.rateUnit} ${words.originNote} ${tiles.map((t) => t.code).join(" ")} ${countBreakLabels.join(" ")} ${rateBreakLabels.join(" ")} 0123456789,`,
    annot: "",
    value: `${words.countNote} ${words.rateNote} ${words.rankNote} ${words.pairNote} ${tiles.map((t) => t.rateText).join(" ")}`,
  };
  const key = maptilerKey(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";

  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 4,
    async render({ label, direction, outDir }) {
      const cards = await openCards(HERE, key);
      let outPath;
      try {
        const { ink, muted, grid } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const ground = direction.ground;
        const { water: sea, land } = plateTints(direction);
        const floorOnGround = (colour, what) => {
          if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
          const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
          if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
          return lifted;
        };
        const neutral = floorOnGround(mix(ground, ink, 0.22), "the map's host countries");
        const originFill = floorOnGround(mix(ground, ink, 0.16), "the map's origin country");
        const mutedInk = adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
        const colours = { sea, land, neutral, originFill, originEdge: mutedInk, border: grid };
        const strokes = { border: direction.stroke?.hairline ?? 0.6 };
        const mapPlan = hexMapPlan({ hosts, origin: origin.iso, colours, strokes, camera, referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height });
        const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
        const renderPage = (fallbacks) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedHexScrolly, {
                plan: mapPlan,
                fallbacks,
                reference: REFERENCE,
                tiles,
                ranked,
                subject: top,
                largest,
                countBreaks: countBreakLabels,
                rateBreaks: rateBreakLabels,
                words,
                alt,
                regs,
                ground: direction.ground,
                accent: direction.accent,
                ink,
                muted,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "hex-drive.mjs"), "utf8")}`,
              apply: "applyHexState",
            },
            vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
            title: titleForms,
            eyebrow,
            source,
            ground: direction.ground,
            type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
            lang,
            outDir,
            name: `${label}.html`,
          });
        ({ outPath } = await renderCardsPage(cards, HERE, outDir, label, {
          plan: mapPlan,
          states: BAKE_STATES,
          stageGround: ground,
          cardOf: (baked) => ({ zoom: baked.zoom }),
          renderPage,
        }));
      } finally {
        await cards.close();
      }
      liveGuard(HERE, outPath, key);
      return { outPath };
    },
  });
});
