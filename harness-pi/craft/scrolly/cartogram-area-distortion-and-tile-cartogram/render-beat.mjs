// The generic half of a cartogram SCROLLY beat, taken from
// proof/scrolly-cartogram-europe-lowcarbon/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, a LIVE MapTiler map while the picture is geography, then a tile cartogram on the kit's
// designed grid (cartogram-drive.mjs, verbatim):
//
//   1 map      every country as its territory, shaded by class (live map);
//   2 widest   the country that takes the most room picked out; the area-weighted mean counts up;
//   3 tiles    the morph: every country into one equal tile; the country mean counts up;
//   4 weight   every tile resized to its weight (its share of what the mean is a share of); the
//              weighted mean counts up;
//   5 means    the three means on one 0–100 rule, the tiles stepping back;
//   6 limits   the equal tiles again, the country with no value ringed and named.
//
// Under the live map, one frozen image for card 1 and one for card 2 (the only two distinct map
// pictures), baked from the same plan (fallback/). The page in renders/ carries `__MAPTILER_KEY__`;
// the key is substituted only in temporary copies, removed.
//
// This file computes every figure the cards may state (the three means, the widest country's share of
// the territory, the weight ranking) and checks the words against them; ./beat.mjs — the one file the
// model writes — gives the rows and the WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { areaOf } from "./cartogram-geometry.mjs";
import { cartogramGeometry, cartogramMapPlan, fitCamera, projectorOf, withWidestName } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids. */
const CARDS = ["map", "widest", "tiles", "weight", "means", "limits"];
/** The layout is designed, not derived — the worked example's grid, unchanged. A grid country the
 *  story does not give is left out. */
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
const WINDOW = [-25, 34, 50, 72];
const FRAME = { width: 1000, height: 680 };
const MARGIN = 900;
/** Where the widest country's name sits on the live map: Russia's hand seat (inside its territory,
 *  north of the card); another widest country is named at the centre of its largest ring's box. */
const SEATS = { RUS: [42, 65] };
const STATES_RAW = [
  { morph: 0, size: 0, subject: 0, area: 0, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 0, size: 0, subject: 1, area: 1, country: 0, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 0, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 0 },
  { morph: 1, size: 1, subject: 0, area: 1, country: 1, production: 1, rule: 1, missing: 0 },
  { morph: 1, size: 0, subject: 0, area: 1, country: 1, production: 1, rule: 0, missing: 1 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedCartogramScrolly } = await import("./DirectedCartogramScrolly.tsx");

  const REQUIRED = ["eyebrow", "rows", "breaks", "format", "number", "unit", "missingLabel", "counters", "subjectNote", "widestLabel", "missingNote", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "number", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: card 6's sentence (see CONTRACT.md)");
  for (const k of ["area", "country", "weight"])
    if (typeof beat.counters?.[k] !== "string" || beat.counters[k].split("{n}").length !== 2)
      throw new Error(`counters.${k} must be a short phrase holding {n} once (the mean the page counts up to); got ${JSON.stringify(beat.counters?.[k])}`);

  // ── THE JOIN: every row a grid country ──────────────────────────────────────────────────────────
  const onGrid = new Set(GRID.flatMap((l) => l.trim().split(/\s+/)).filter((c) => c !== ".."));
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { iso, name, value, weight } per country (see CONTRACT.md)");
  const off = beat.rows.filter((r) => !onGrid.has(r.iso));
  if (off.length) throw new Error(`these rows have no tile on the grid: ${off.map((r) => JSON.stringify(r.iso)).join(", ")}. The grid holds ${[...onGrid].join(" ")} (ISO alpha-3); this kit cannot place another country`);
  const seen = new Set();
  for (const r of beat.rows) {
    if (seen.has(r.iso)) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country`);
    seen.add(r.iso);
    if (!String(r.name ?? "").trim()) throw new Error(`rows: ${r.iso} has no name`);
    if (r.value !== null && typeof r.value !== "number") throw new Error(`rows: ${r.iso}'s value is ${JSON.stringify(r.value)}: a number, or null when the source does not report it`);
    if (!(typeof r.weight === "number" && r.weight >= 0)) throw new Error(`rows: ${r.iso}'s weight is ${JSON.stringify(r.weight)}: the quantity card 4 sizes its tile by (0 when it has none)`);
  }
  assertNumbers(beat.rows.filter((r) => r.value !== null).map((r) => [r.iso, r.value]));
  const share = new Map(beat.rows.map((r) => [r.iso, r.value]));
  const weight = new Map(beat.rows.map((r) => [r.iso, r.weight]));
  const NAME = Object.fromEntries(beat.rows.map((r) => [r.iso, plain(r.name)]));
  const placed = [];
  GRID.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (code !== ".." && share.has(code)) placed.push({ iso: code, col, row });
    }),
  );
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const area = {};
  for (const f of geo.features) area[f.properties.iso] = (area[f.properties.iso] ?? 0) + areaOf(f);

  // ── THE THREE MEANS ─────────────────────────────────────────────────────────────────────────────
  const withData = [...share.entries()].filter(([, v]) => v !== null);
  if (withData.length < 6) throw new Error(`${withData.length} countries carry a value: a cartogram of means needs at least 6`);
  const byCountry = withData.reduce((s, [, v]) => s + v, 0) / withData.length;
  const areaSum = withData.reduce((s, [c]) => s + (area[c] ?? 0), 0);
  const byArea = withData.reduce((s, [c, v]) => s + v * (area[c] ?? 0), 0) / areaSum;
  const weightSum = withData.reduce((s, [c]) => s + weight.get(c), 0);
  if (!(weightSum > 0)) throw new Error("no country with a value carries a weight above zero: card 4 sizes the tiles by it");
  const byWeight = withData.reduce((s, [c, v]) => s + v * weight.get(c), 0) / weightSum;
  const widest = withData.reduce((a, b) => ((area[b[0]] ?? 0) > (area[a[0]] ?? 0) ? b : a))[0];
  const widestShare = ((area[widest] ?? 0) / areaSum) * 100;
  const unreported = [...share.entries()].filter(([, v]) => v === null).map(([c]) => c);
  if (unreported.length > 1) throw new Error(`${unreported.length} countries carry no value (${unreported.join(", ")}): card 6 rings and names ONE hollow tile — give the others a value or leave them out of rows (say so in limits)`);
  const byWeightRank = withData.map(([c]) => c).sort((a, b) => weight.get(b) - weight.get(a));

  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.length > 5 || BREAKS.some((b, i) => typeof b !== "number" || (i && b <= BREAKS[i - 1])))
    throw new Error(`breaks must be 2 to 5 rising numbers (3 to 6 classes); got ${JSON.stringify(BREAKS)}`);
  const CLASS_COUNT = BREAKS.length + 1;
  const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);
  const pub = (iso) => ({ iso, name: NAME[iso], value: share.get(iso), weight: weight.get(iso), areaShare: ((area[iso] ?? 0) / areaSum) * 100 });
  const reading = {
    count: placed.length,
    reported: withData.length,
    byCountry,
    byArea,
    byWeight,
    gap: byCountry - byArea,
    widest: pub(widest),
    heaviest: pub(byWeightRank[0]),
    second: pub(byWeightRank[1]),
    byWeightRank: byWeightRank.map(pub),
    lightest: byWeightRank.slice(-2).map(pub),
    missing: unreported.map((iso) => ({ iso, name: NAME[iso] })),
    breaks: [...BREAKS],
    value: (iso) => share.get(iso) ?? null,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(withData.map(([, v]) => v), HERE);

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const n1 = (v) => plain(beat.number(v, 1));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const OWES = {
    map: [["r.count", String(reading.count)]],
    widest: [["r.widest.name", reading.widest.name], ["number(r.byArea, 1)", n1(byArea)]],
    tiles: [["number(r.byCountry, 1)", n1(byCountry)]],
    weight: [["number(r.byWeight, 1)", n1(byWeight)]],
    means: [["number(r.byArea, 1)", n1(byArea)], ["number(r.byWeight, 1)", n1(byWeight)], ["number(r.byCountry, 1)", n1(byCountry)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k]) if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const known = [
    reading.count, reading.reported, byCountry, byArea, byWeight, byCountry - byArea, widestShare, ...BREAKS, unreported.length,
    // the figures of the countries the reading names, not every country's (a wrong number would round to one)
    ...[reading.widest, reading.heaviest, reading.second, ...reading.lightest].flatMap((c) => [c.value, c.weight]), weightSum,
  ];
  const check = figureCheck({ format: (v) => beat.number(v, 1), known, hint: "r.byArea, r.byCountry, r.byWeight, r.widest.areaShare, …" });
  WORDED.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  const subjectNote = say("subjectNote", beat.subjectNote).join(" ");
  const widestLabel = say("widestLabel", beat.widestLabel).join(" ");
  const missingNote = say("missingNote", beat.missingNote).join(" ");
  for (const [k, t] of [["subjectNote", subjectNote], ["widestLabel", widestLabel], ["missingNote", missingNote]]) check(k, t);
  const counters = Object.fromEntries(["area", "country", "weight"].map((k) => [k, plain(beat.counters[k])]));
  for (const [k, t] of Object.entries(counters)) check(`counters.${k}`, t.replace("{n}", " "));
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [byCountry, byArea, byWeight, widestShare, ...BREAKS], "means");
  if ((beat.lang ?? storyLanguage(HERE) ?? "en") !== "fr")
    console.log("NOTE — the counters (cartogram-drive.mjs, the worked example's) print their mean with a decimal comma: written for French");

  const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, FRAME);
  const project = projectorOf(camera, FRAME);
  const geometry = cartogramGeometry({ geo, placed }, { project, stage: FRAME, margin: MARGIN });
  const countries = geometry.countries.map((c) => ({ ...c, value: share.get(c.iso), classIndex: classOf(share.get(c.iso)), twh: weight.get(c.iso) }));
  const STATES = STATES_RAW.map((state, k) => ({ ...state, ...camera, card: k }));
  const BAKE_STATES = STATES.slice(0, 2);
  const CARD_TO_BAKE = STATES_RAW.map((state) => (state.subject ? 1 : 0));
  // The widest country's name seat: the hand seat when there is one, else its largest ring's box centre.
  const seatOf = (iso) => {
    if (SEATS[iso]) return SEATS[iso];
    const rings = geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0])));
    const box = (ring) => [Math.min(...ring.map((p) => p[0])), Math.min(...ring.map((p) => p[1])), Math.max(...ring.map((p) => p[0])), Math.max(...ring.map((p) => p[1]))];
    const largest = rings.map(box).sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0];
    return [(Math.max(largest[0], WINDOW[0]) + Math.min(largest[2], WINDOW[2])) / 2, (Math.max(largest[1], WINDOW[1]) + Math.min(largest[3], WINDOW[3])) / 2];
  };
  const breakLabels = BREAKS.map((b) => plain(beat.format(b)));
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const missingLabel = plain(beat.missingLabel);
  const counterOf = (k, v) => ({ template: counters[k], value: Number(v.toFixed(1)) });
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${countries.map((c) => c.iso).join(" ")} ${breakLabels.join(" ")} ${unit} ${missingLabel}`,
    annot: `${subjectNote} ${missingNote} ${widestLabel}`,
    value: `${Object.values(counters).join(" ")} 0123456789, 0 50 100`,
  };
  const key = maptilerKey(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";

  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: CLASS_COUNT,
    async render({ label, direction, outDir }) {
      const cards = await openCards(HERE, key);
      let outPath;
      try {
        const { ink, muted, grid } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const ground = direction.ground;
        const accent = direction.accent;
        const { water: sea, land } = plateTints(direction);
        const floorOnGround = (colour, what) => {
          if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
          const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
          if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
          return lifted;
        };
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
          widest,
          colours,
          strokes,
          cameras: BAKE_STATES.map(() => camera),
          statesForCards: BAKE_STATES,
          referenceWidth: FRAME.width,
          referenceHeight: FRAME.height,
        });
        mapPlan = withWidestName(mapPlan, {
          at: seatOf(widest),
          text: widestLabel,
          register: { fontSize: annotPx },
          face,
          ink: inkOnGround,
          halo: strokes.halo,
          haloColour: classFills[classOf(share.get(widest))],
        });
        const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedCartogramScrolly, {
                plan: { ...mapPlan, fallback: shapes },
                fallbacks: CARD_TO_BAKE.map((i) => fallbacks[i]),
                reference: FRAME,
                countries,
                width: FRAME.width,
                height: FRAME.height,
                breaks: breakLabels,
                unit,
                missingLabel,
                subject: widest,
                subjectNote,
                byArea: counterOf("area", byArea),
                byCountry: counterOf("country", byCountry),
                byProduction: counterOf("weight", byWeight),
                missingNote,
                alt,
                regs,
                colours,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "cartogram-drive.mjs"), "utf8")}`,
              apply: "applyCartogramState",
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
        console.log(`face served by MapTiler: ${face}`);
      } finally {
        await cards.close();
      }
      liveGuard(HERE, outPath, key);
      return { outPath };
    },
  });
});
