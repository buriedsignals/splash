// The generic half of a flow map SCROLLY beat, taken from
// proof/scrolly-flow-map-ukraine-protection/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards over ONE live, flat MapTiler map driven by a plan (plan.mjs, verbatim): a fan of bands out of
// ONE origin, read largest first (flow-drive.mjs, verbatim):
//
//   1 origin   the origin's node on the map; the total;
//   2 first    the widest band traced, origin to the largest destination; the share counts;
//   3 second   the second band; the share of the two together;
//   4 drawn    the next bands traced one after another, each named as it arrives;
//   5 others   a dot at each smaller destination, too small for a band;
//   6 limits   everything: the two largest named in bold, the width key; the reading line.
//
// Under the live map, one frozen image per card, baked from the same plan (fallback/, cached on the
// plan's hash). The page in renders/ carries `__MAPTILER_KEY__`; the key is substituted only in
// temporary copies, removed.
//
// This file computes every figure the cards may state (the total, the ranking, the shares) and the
// bands' geometry, and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the origin, the flows and the WORDS. Copied into the beat by the harness; never edited by the model.
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
import { cameraFields, lonLatOf, mercatorOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { flowMapPlan } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids. */
const CARDS = ["origin", "first", "second", "drawn", "others", "limits"];
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
/** The worked example's band geometry and marks. */
const FOCUS_PAD_X = 0.32;
const FOCUS_PAD_Y = 0.26;
const WIDEST = 18;
const BAND_FLOOR = 2;
const NODE_R = 9;
const DOT_R = 3.2;
const OTHERS_R = 2.4;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedFlowMapScrolly } = await import("./DirectedFlowMapScrolly.tsx");

  const REQUIRED = ["eyebrow", "origin", "flows", "unit", "totalNote", "counter", "othersNote", "drawnNote", "othersKey", "keySizes", "format", "count", "percent", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "count", "percent", "totalNote", "counter", "othersNote", "drawnNote", "othersKey", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: card 6's reading line (see CONTRACT.md)");

  // ── the seats: every country's, the mean of its vertices inside the window, in Web Mercator ──────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const sums = {};
  for (const f of geo.features)
    for (const [lon, lat] of (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2)) {
      if (!(lon >= WINDOW.west && lon <= WINDOW.east && lat >= WINDOW.south && lat <= WINDOW.north)) continue;
      const [x, y] = mercatorOf([lon, lat]);
      const s = (sums[f.properties.iso] ??= { x: 0, y: 0, n: 0 });
      s.x += x;
      s.y += y;
      s.n++;
    }
  const seats = Object.fromEntries(Object.entries(sums).map(([iso, s]) => [iso, lonLatOf([s.x / s.n, s.y / s.n])]));

  // ── the flows: one origin, one row per destination ──────────────────────────────────────────────
  const origin = beat.origin;
  if (!origin || !seats[origin.iso] || !String(origin.name ?? "").trim())
    throw new Error(`origin must be { iso, name, short } — the ISO alpha-3 code of the one country every band leaves (a European country of the shapes), its name, and a short form for a phone; got ${JSON.stringify(origin)}`);
  if (!Array.isArray(beat.flows) || beat.flows.length < 6) throw new Error("flows must be one { iso, name, value } per destination, at least 6 (see CONTRACT.md)");
  const seen = new Set();
  for (const f of beat.flows) {
    if (!seats[f.iso]) throw new Error(`flows: ${JSON.stringify(f.iso)} (${f.name}) has no seat on the map: an ISO alpha-3 code of a European country of the shapes`);
    if (f.iso === origin.iso) throw new Error(`flows holds the origin ${origin.iso} itself: a band cannot leave and arrive at one place`);
    if (seen.has(f.iso)) throw new Error(`flows hold ${f.iso} twice: keep ONE row per destination (one month, one series)`);
    seen.add(f.iso);
    if (!String(f.name ?? "").trim()) throw new Error(`flows: ${f.iso} has no name`);
  }
  assertNumbers(beat.flows.map((f) => [f.iso, f.value]));
  if (beat.flows.some((f) => !(f.value > 0))) throw new Error("flows hold a value that is not above zero: a band's width is its value; leave out a destination with none");
  const ranked = [...beat.flows].sort((a, b) => b.value - a.value).map((f) => ({ iso: f.iso, name: plain(f.name), value: f.value }));
  const DRAWN = beat.drawCount ?? 10;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 4 && DRAWN <= 12)) throw new Error(`drawCount is ${beat.drawCount}: draw between 4 and 12 bands`);
  if (ranked.length <= DRAWN) throw new Error(`flows has ${ranked.length} destinations and drawCount is ${DRAWN}: card 5 shows the destinations too small for a band, so give every destination, or lower drawCount`);
  const total = ranked.reduce((s, f) => s + f.value, 0);
  const drawn = ranked.slice(0, DRAWN);
  const rest = ranked.slice(DRAWN);
  const [first, second] = drawn;
  const pct = (v) => (v / total) * 100;
  const drawnShare = pct(drawn.reduce((s, f) => s + f.value, 0));

  const reading = {
    origin: { iso: origin.iso, name: plain(origin.name) },
    total,
    count: ranked.length,
    drawCount: DRAWN,
    first: { ...first, share: pct(first.value), rank: 1 },
    second: { ...second, share: pct(second.value), rank: 2 },
    topTwoShare: pct(first.value + second.value),
    drawn: drawn.map((f, i) => ({ ...f, share: pct(f.value), rank: i + 1 })),
    third: { ...drawn[2], rank: 3 },
    last: { ...drawn[DRAWN - 1], rank: DRAWN },
    drawnShare,
    restCount: rest.length,
    restShare: 100 - drawnShare,
    ranked,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(ranked.map((f) => f.value), HERE);
  assertLegibleLabels(drawn.map((f) => f.value), beat.format);

  // ── the camera: the origin and the drawn destinations' seats, padded (the worked example's) ──────
  const pts = [seats[origin.iso], ...drawn.map((f) => seats[f.iso])].map(mercatorOf);
  const bx0 = Math.min(...pts.map((p) => p[0]));
  const bx1 = Math.max(...pts.map((p) => p[0]));
  const by0 = Math.min(...pts.map((p) => p[1]));
  const by1 = Math.max(...pts.map((p) => p[1]));
  const padX = (bx1 - bx0) * FOCUS_PAD_X;
  const padY = (by1 - by0) * FOCUS_PAD_Y;
  const [fx0, fx1, fy0, fy1] = [bx0 - padX, bx1 + padX, by0 - padY, by1 + padY];
  const REFERENCE = { width: 1280, height: Math.round((1280 * (fy1 - fy0)) / (fx1 - fx0)) };
  REFERENCE.height = Math.max(REFERENCE.height, Math.ceil(REFERENCE.width / 1.95));
  const ZOOM = Math.log2(REFERENCE.width / ((fx1 - fx0) * 512));
  const camera = cameraFields({ center: lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]), zoom: ZOOM, alignY: -1 });
  const cameras = Array.from({ length: 6 }, () => camera);
  const worldPx = 512 * 2 ** camera.camZoom;
  const project = (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [REFERENCE.width / 2 + (x - camera.camX) * worldPx, REFERENCE.height / 2 + (y - camera.camY) * worldPx];
  };
  const unproject = ([x, y]) => lonLatOf([camera.camX + (x - REFERENCE.width / 2) / worldPx, camera.camY + (y - REFERENCE.height / 2) / worldPx]);

  // ── the bands: each a bow away from the fan's mean bearing (the worked example's geometry) ──────
  const originPx = project(seats[origin.iso]);
  const topTwo = new Set([first.iso, second.iso]);
  const mean = drawn.reduce((acc, f) => {
    const [x, y] = project(seats[f.iso]);
    const len = Math.hypot(x - originPx[0], y - originPx[1]);
    return [acc[0] + (x - originPx[0]) / len, acc[1] + (y - originPx[1]) / len];
  }, [0, 0]);
  const maxValue = first.value;
  const widthOf = (v) => Math.max(BAND_FLOOR, (WIDEST * v) / maxValue);
  const bandsGeo = drawn.map((f) => {
    const [sx, sy] = project(seats[f.iso]);
    const dx = sx - originPx[0];
    const dy = sy - originPx[1];
    const len = Math.hypot(dx, dy);
    if (!(len > 1)) throw new Error(`${f.name} sits on the origin's own seat: a band needs a distance`);
    const side = Math.sign(mean[0] * dy - mean[1] * dx) || 1;
    const bow = len * 0.14 * side;
    const control = [(originPx[0] + sx) / 2 - (dy / len) * bow, (originPx[1] + sy) / 2 + (dx / len) * bow];
    const quad = (t) => [(1 - t) ** 2 * originPx[0] + 2 * (1 - t) * t * control[0] + t * t * sx, (1 - t) ** 2 * originPx[1] + 2 * (1 - t) * t * control[1] + t * t * sy];
    const samples = Array.from({ length: 41 }, (_, i) => quad(i / 40));
    const cumulative = [0];
    for (let i = 1; i < samples.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
    return {
      code: f.iso,
      name: f.name,
      people: f.value,
      top: topTwo.has(f.iso),
      width: Math.round(widthOf(f.value) * 10) / 10,
      coordinates: samples.map(unproject),
      cumulative: cumulative.map((v) => Math.round(v * 100) / 100),
      seatLonLat: seats[f.iso],
    };
  });

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const count = (n) => plain(beat.count(n));
  const percent = (v) => plain(beat.percent(v));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const OWES = {
    origin: [["count(r.total)", count(total)], ["r.count", String(ranked.length)]],
    first: [["r.first.name", first.name], ["count(r.first.value)", count(first.value)], ["percent(r.first.share)", percent(reading.first.share)]],
    second: [["r.second.name", second.name], ["count(r.second.value)", count(second.value)], ["percent(r.topTwoShare)", percent(reading.topTwoShare)]],
    drawn: [["r.drawCount", String(DRAWN)]],
    others: [["r.restCount", String(rest.length)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k]) if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const known = [
    total, ranked.length, DRAWN, DRAWN - 2, rest.length, drawnShare, 100 - drawnShare, reading.topTwoShare, total / 1e6, total / 1e3,
    ...drawn.flatMap((f) => [f.value, pct(f.value)]), ...beat.keySizes,
  ];
  const check = figureCheck({ format: [beat.percent, beat.format], known, hint: "r.total, r.first.share, r.topTwoShare, r.drawnShare, …" });
  WORDED.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  const words = {
    unit: plain(beat.unit),
    totalNote: say("totalNote", beat.totalNote).join(" "),
    count: say("counter", beat.counter).join(" "),
    othersNote: say("othersNote", beat.othersNote).join(" "),
    drawnNote: say("drawnNote", beat.drawnNote).join(" "),
    othersKey: say("othersKey", beat.othersKey).join(" "),
  };
  if (words.count.split("{p}").length !== 2) throw new Error(`counter must return a phrase holding {p} once: the header counts the share the traced bands carry into it; it returned ${JSON.stringify(words.count)}`);
  for (const [k, t] of Object.entries(words)) if (k !== "unit") check(k === "count" ? "counter" : k, t.replace("{p}", " "));
  if (!Array.isArray(beat.keySizes) || beat.keySizes.length < 1 || beat.keySizes.length > 3 || beat.keySizes.some((v) => !(v > 0 && v <= maxValue)))
    throw new Error(`keySizes must be 1 to 3 round values for the width key, each above zero and at most the widest band (${maxValue})`);
  const keySizes = beat.keySizes.map((v) => ({ people: v, label: format(v), px: widthOf(v) }));
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [total, total / 1e6, ...drawn.map((f) => f.value), reading.topTwoShare, drawnShare], "flows");
  if ((beat.lang ?? storyLanguage(HERE) ?? "en") !== "fr")
    console.log("NOTE — the counter (flow-drive.mjs, the worked example's) prints its share with a decimal comma: written for French");

  const STATES = [
    { bands: 0, others: 0, pair: 0, key: 0 },
    { bands: 1, others: 0, pair: 0, key: 0 },
    { bands: 2, others: 0, pair: 1, key: 0 },
    { bands: DRAWN, others: 0, pair: 0, key: 0 },
    { bands: DRAWN, others: 1, pair: 0, key: 0 },
    { bands: DRAWN, others: 1, pair: 1, key: 1 },
  ].map((state, k) => ({ ...state, ...camera, card: k }));
  const otherPts = rest.map((f) => seats[f.iso]).filter(Boolean);

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const originShort = plain(origin.short ?? origin.iso);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${bandsGeo.map((b) => b.name).join(" ")} ${words.drawnNote} ${words.othersKey} ${keySizes.map((k) => k.label).join(" ")}`,
    annot: "",
    value: `${words.totalNote} ${words.count} ${words.othersNote} ${reading.origin.name} ${originShort} 0123456789,`,
  };
  const key = maptilerKey(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";

  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const cards = await openCards(HERE, key);
      let outPath;
      try {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const tints = plateTints(direction);
        const onBoth = (c, floor, what) => {
          for (const on of [tints.land, tints.water]) {
            const w = adjustToContrast(c, on, floor);
            if (w && contrast(w, tints.land) >= floor - 1e-9 && contrast(w, tints.water) >= floor - 1e-9) return w;
          }
          throw new Error(`${what} has no variant that reads at ${floor}:1 on both the land and the sea: the palette cannot carry this map`);
        };
        const colours = {
          land: tints.land,
          water: tints.water,
          band: onBoth(direction.accent, NON_TEXT_CONTRAST_MIN, "a band"),
          subjectBand: onBoth(mix(direction.accent, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the subject's band"),
          node: onBoth(ink, NON_TEXT_CONTRAST_MIN, "the node's edge"),
        };
        const plan = flowMapPlan({
          tints: { water: tints.water, land: tints.land },
          colours,
          cameras,
          statesForCards: STATES,
          referenceWidth: REFERENCE.width,
          referenceHeight: REFERENCE.height,
          node: { seat: seats[origin.iso], r: NODE_R },
          bands: bandsGeo,
          seatDots: bandsGeo.map((b) => ({ code: b.code, seat: b.seatLonLat, top: b.top })),
          others: otherPts,
          dotR: DOT_R,
          othersR: OTHERS_R,
          hairline: (direction.stroke?.hairline ?? 0.6) * 1,
        });
        const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedFlowMapScrolly, {
                plan: { ...plan, fallback: shapes },
                fallbacks,
                reference: REFERENCE,
                bands: bandsGeo.map(({ code, name, people, top }) => ({ code, name, people, top })),
                others: rest.length,
                total,
                keySizes,
                bandColour: colours.band,
                subjectColour: colours.subjectBand,
                landColour: colours.land,
                words,
                alt,
                regs,
                ground: direction.ground,
                accent: direction.accent,
                ink,
                muted,
                originName: reading.origin.name,
                originCode: originShort,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "flow-drive.mjs"), "utf8")}`,
              apply: "applyFlowState",
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
          plan,
          states: STATES,
          stageGround: tints.water,
          cardOf: (baked) => ({ zoom: baked.zoom }),
          renderPage,
        }));
      } finally {
        await cards.close();
      }
      // WAIVED, BY EXACT SHAPE: frames with a missing tile while scrolling. The worked example's own committed
      // page fails it the same way (measured 2026-10-26: 2 frames at 1280x800, 3 at 375x812, at 30 px per
      // frame). An undrawn canvas at a card is never waived.
      liveGuard(HERE, outPath, key, {
        waive: [{ test: /^\d+x\d+: \d+ frames with a missing tile at \d+px\/frame$/, why: "inherited: the worked example's own page fails it the same way" }],
      });
      return { outPath };
    },
  });
});
