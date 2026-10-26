// The generic half of a proportional symbol SCROLLY beat, taken from
// proof/scrolly-proportional-symbol-europe-capacity/render-directions-scrolly.mjs with everything about
// ITS subject removed. The choreography is the worked example's and is not the model's to change — six
// cards over ONE live, flat (Web Mercator) MapTiler map driven by a plan (plan.mjs, verbatim), the
// scroll adding hollow circles (area = value) largest first (symbol-drive.mjs, verbatim):
//
//   1 largest  the largest site alone, named; the counter: 1 site, its share of the sites and of the whole;
//   2 ten      the ten largest;
//   3 hundred  the hundred largest;
//   4 subject  the subject group's sites stand whatever their rank, every other site steps back; the
//              camera centres the region holding most of them;
//   5 all      every site: the field closes;
//   6 cut      the sites at or above the cut stand; the cut and its note; the reading line (limits).
//
// Under the live map, one frozen image per card, baked from the same plan (fallback/, cached on the
// plan's hash). The page in renders/ carries `__MAPTILER_KEY__`; the key is substituted only in
// temporary copies, removed.
//
// This file computes every figure the cards may state (the ranking, the cumulative shares, the
// subject group, the cut) and checks the words against them; ./beat.mjs — the one file the model
// writes — gives the sites and the WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, lonLatOf, mercatorOf, stageViewOf, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { arrivalsFor, proportionalPlan } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["largest", "ten", "hundred", "subject", "all", "cut"];
/** Card 2 and card 3 stand the ten and the hundred largest: the drive counts in powers of ten. */
const TEN = 10;
const HUNDRED = 100;
/** THE STUDY WINDOW (the worked example's): Iceland to Cyprus, Portugal to western Russia, north to 71.2° N. */
const BOUNDS = { west: -24.6, east: 45, south: 34.5, north: 71.2 };
/** The window the circle sizes and the close-up were approved on (north edge 68° N). */
const APPROVED_WINDOW_NORTH = 68;
/** The stage the SVG beat's circle sizes were measured on (1280 × 800 viewport). */
const SVG_DESKTOP_STAGE = { width: 1168, height: 536 };
const PHONE_STAGE = { width: 330, height: 414 };

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedProportionalScrolly } = await import("./DirectedProportionalScrolly.tsx");

  const REQUIRED = ["eyebrow", "sites", "subject", "largestName", "largestLabel", "cut", "keySizes", "unit", "dotIs", "counter", "format", "count", "percent", "cards", "subjectNote", "cutNote", "limitNote", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "count", "percent", "largestLabel", "subjectNote", "cutNote", "limitNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: the reading line that closes card 6 (see CONTRACT.md)");

  // ── the sites, every one, largest first ─────────────────────────────────────────────────────────
  if (!Array.isArray(beat.sites)) throw new Error("sites must be every site as { value, lon, lat, group, region } (see CONTRACT.md)");
  const bad = beat.sites.filter((s) => ![s.value, s.lon, s.lat].every((v) => typeof v === "number" && Number.isFinite(v)));
  if (bad.length) throw new Error(`sites hold ${bad.length} row(s) with no usable value or coordinates (first: ${JSON.stringify(bad[0])}): convert them with Number(), or leave them out and say so in limits`);
  assertNumbers(beat.sites.map((s, i) => [`site ${i + 1}`, s.value]));
  if (beat.sites.some((s) => !(s.value > 0))) throw new Error("sites hold a value that is not above zero: a circle's area is its value; leave out the sites the data gives no value for");
  // The worked example's own rule: its north edge holds the northernmost site (it refuses one beyond);
  // a site past the other edges sits off the frame on a desktop and is counted — said, not refused
  // (the worked example's own data has 9 of them, in North Africa).
  const north = beat.sites.filter((s) => s.lat >= BOUNDS.north);
  if (north.length) throw new Error(`${north.length} site(s) lie north of the map's north edge (${BOUNDS.north}° N), first at ${north[0].lon}, ${north[0].lat}: this kit draws Europe only — leave them out of sites and say so in limits`);
  const out = beat.sites.filter((s) => s.lon < BOUNDS.west || s.lon > BOUNDS.east || s.lat < BOUNDS.south);
  if (out.length > beat.sites.length * 0.01)
    throw new Error(`${out.length} site(s) lie outside the map (${BOUNDS.west}° to ${BOUNDS.east}° E, ${BOUNDS.south}° to ${BOUNDS.north}° N), first at ${out[0].lon}, ${out[0].lat}: this kit draws Europe only — leave them out of sites and say so in limits`);
  if (out.length) console.log(`NOTE — ${out.length} site(s) lie outside the study window (first at ${out[0].lon}, ${out[0].lat}): counted in every figure, off the frame on a desktop`);
  const stations = beat.sites.map((s) => ({ value: s.value, lon: s.lon, lat: s.lat, group: String(s.group ?? ""), region: String(s.region ?? "") })).sort((a, b) => b.value - a.value);
  const total = stations.length;
  if (total < HUNDRED * 2) throw new Error(`sites holds ${total} sites: card 3 stands the hundred largest and card 5 all of them, so this choreography needs at least ${HUNDRED * 2}`);
  const wholeValue = stations.reduce((a, s) => a + s.value, 0);
  const cumulative = [];
  let run = 0;
  for (const s of stations) cumulative.push(((run += s.value) / wholeValue) * 100);
  const [first] = stations;
  const share = (k) => ({ count: k, siteShare: (k / total) * 100, valueShare: cumulative[k - 1] });

  // ── the subject group and its region ────────────────────────────────────────────────────────────
  const subjectSites = stations.filter((s) => s.group === String(beat.subject));
  if (!subjectSites.length) throw new Error(`no site's group is ${JSON.stringify(beat.subject)}: subject must be the group value card 4 isolates (the groups are ${[...new Set(stations.map((s) => s.group))].slice(0, 12).join(", ")})`);
  if (subjectSites.length === total) throw new Error(`every site is in the subject group ${beat.subject}: card 4 would step nothing back`);
  const byRegion = {};
  for (const s of subjectSites) byRegion[s.region] = (byRegion[s.region] ?? 0) + 1;
  const [focus, focusCount] = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const focusSites = subjectSites.filter((s) => s.region === focus);
  if (!focus || focusSites.length < 2) throw new Error(`the region holding most ${beat.subject} sites (${focus || "no region"}) holds ${focusSites.length}: card 4 centres the camera on a region's subject sites, which needs at least two (give each site its region)`);
  const subjectValue = subjectSites.reduce((a, s) => a + s.value, 0);

  // ── the cut card 6 keeps ────────────────────────────────────────────────────────────────────────
  if (!(typeof beat.cut === "number" && beat.cut > 0)) throw new Error("cut must be the value at or above which card 6 keeps a site (the static plate's threshold)");
  const cutCount = stations.filter((s) => s.value >= beat.cut).length;
  if (cutCount < 2 || cutCount >= total) throw new Error(`cut ${beat.cut} keeps ${cutCount} of ${total} sites: card 6 keeps the largest, so the cut must keep at least 2 and leave some out`);

  // ── the cameras (the worked example's arithmetic) ───────────────────────────────────────────────
  const [bx0, by1] = mercatorOf([BOUNDS.west, BOUNDS.south]);
  const [bx1, by0] = mercatorOf([BOUNDS.east, BOUNDS.north]);
  const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
  const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
  const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);
  const approvedHeight = (1280 * (by1 - mercatorOf([BOUNDS.east, APPROVED_WINDOW_NORTH])[1])) / (bx1 - bx0);
  const fp = focusSites.map((s) => mercatorOf([s.lon, s.lat]));
  const fx0 = Math.min(...fp.map((p) => p[0]));
  const fx1 = Math.max(...fp.map((p) => p[0]));
  const fy0 = Math.min(...fp.map((p) => p[1]));
  const fy1 = Math.max(...fp.map((p) => p[1]));
  if (!(fx1 - fx0 > 1e-6 && fy1 - fy0 > 1e-6)) throw new Error(`${focus}'s ${beat.subject} sites all sit on one line or point: card 4's close-up is fitted to their box`);
  const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((fx1 - fx0) * 1.5 * 512), approvedHeight / ((fy1 - fy0) * 1.5 * 512)));
  const CLOSE_CENTER = lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]);
  const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
  const closeUp = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM, alignY: 0 });
  const cameras = [whole, whole, whole, closeUp, whole, whole];
  const radius = {
    largestPx: Math.max(12, Math.min(30, SVG_DESKTOP_STAGE.width / 42)),
    anchorZoom: WHOLE_ZOOM + zoomShiftFor({ referenceWidth: REFERENCE.width, referenceHeight: approvedHeight }, SVG_DESKTOP_STAGE.width, SVG_DESKTOP_STAGE.height),
    growth: 0.35,
  };
  const referencePlan = { referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height };
  const inView = (camera, stage, [lon, lat], margin) => {
    const view = stageViewOf(referencePlan, camera, stage.width, stage.height);
    const scale = 512 * 2 ** view.zoom;
    const [cx, cy] = mercatorOf(view.center);
    const [x, y] = mercatorOf([lon, lat]);
    const px = (x - cx) * scale + stage.width / 2;
    const py = (y - cy) * scale + stage.height / 2;
    return px > margin && px < stage.width - margin && py > margin && py < stage.height - margin;
  };
  for (const stage of [SVG_DESKTOP_STAGE, PHONE_STAGE]) {
    if (!inView(whole, stage, [first.lon, first.lat], 30)) throw new Error(`card 1 names the largest site, which sits too close to the map's edge on a ${stage.width} × ${stage.height} stage for its name`);
    for (const s of focusSites) if (!inView(closeUp, stage, [s.lon, s.lat], 0)) throw new Error(`card 4 centres ${focus}'s ${beat.subject} sites, and one of them leaves the close-up on a ${stage.width} × ${stage.height} stage`);
  }

  // ── the reading every word function receives ───────────────────────────────────────────────────
  const reading = {
    count: total,
    whole: wholeValue,
    largest: { name: plain(beat.largestName), value: first.value, group: first.group, region: first.region, lon: first.lon, lat: first.lat, valueShare: cumulative[0] },
    ten: share(TEN),
    hundred: { ...share(HUNDRED), subjectCount: stations.slice(0, HUNDRED).filter((s) => s.group === String(beat.subject)).length },
    subject: { group: String(beat.subject), count: subjectSites.length, siteShare: (subjectSites.length / total) * 100, valueShare: (subjectValue / wholeValue) * 100, value: subjectValue },
    focus: { region: focus, count: focusCount },
    cut: { threshold: beat.cut, ...share(cutCount) },
    shareOf: (k) => {
      if (!(Number.isInteger(k) && k >= 1 && k <= total)) throw new Error(`shareOf(${k}): k is a whole count of sites, 1 to ${total}`);
      return share(k);
    },
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(stations.map((s) => s.value), HERE);
  assertLegibleLabels(beat.keySizes, beat.format);

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const count = (n) => plain(beat.count(n));
  const percent = (v) => plain(beat.percent(v));
  const cardProse = CARDS.map((k) => say(`cards.${k}`, beat.cards[k]));
  const limits = say("limits", [beat.limits].flat()[0]);
  // Card 6 is the cut, then the reading line (the limits), as one paragraph — the worked example's.
  const prose = [...cardProse.slice(0, 5), [`${cardProse[5].join(" ")} ${limits.join(" ")}`]];
  const OWES = {
    largest: [["format(r.largest.value)", format(first.value)], ["percent(r.largest.valueShare)", percent(reading.largest.valueShare)]],
    ten: [["percent(r.ten.siteShare)", percent(reading.ten.siteShare)], ["percent(r.ten.valueShare)", percent(reading.ten.valueShare)]],
    hundred: [["percent(r.hundred.siteShare)", percent(reading.hundred.siteShare)], ["percent(r.hundred.valueShare)", percent(reading.hundred.valueShare)]],
    subject: [["count(r.subject.count)", count(reading.subject.count)], ["percent(r.subject.valueShare)", percent(reading.subject.valueShare)]],
    all: [["count(r.count)", count(total)]],
    cut: [["count(r.cut.count)", count(cutCount)], ["percent(r.cut.valueShare)", percent(reading.cut.valueShare)]],
  };
  CARDS.forEach((k, i) => {
    const text = cardProse[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const known = [
    total, wholeValue, TEN, HUNDRED, cutCount, beat.cut, first.value, subjectSites.length, subjectValue, focusCount, reading.hundred.subjectCount,
    ...[reading.largest, reading.ten, reading.hundred, reading.cut].flatMap((x) => [x.siteShare, x.valueShare]).filter((v) => v !== undefined),
    (1 / total) * 100, reading.subject.siteShare, reading.subject.valueShare, ...beat.keySizes,
  ];
  const check = figureCheck({ format: [beat.percent, beat.format], known, hint: "r.ten.valueShare, r.subject.count, r.cut.count, …" });
  CARDS.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, cardProse[i].join(" ")));
  const words = {
    unit: plain(beat.unit),
    counter: plain(beat.counter),
    subjectNote: say("subjectNote", beat.subjectNote).join(" "),
    cutNote: say("cutNote", beat.cutNote).join(" "),
    circleIs: plain(beat.dotIs),
    cut: say("limitNote", beat.limitNote).join(" "),
  };
  for (const ph of ["{n}", "{sites}", "{mw}"])
    if (words.counter.split(ph).length !== 2) throw new Error(`counter must hold ${ph} once: the header writes the sites standing ({n}), their share of the sites ({sites}) and of the whole ({mw}); it is ${JSON.stringify(words.counter)}`);
  check("counter", words.counter.replace(/\{(n|sites|mw)\}/g, " "));
  for (const k of ["subjectNote", "cutNote"]) check(k, words[k]);
  check("limitNote", words.cut);
  if (!owes(words.cut, format(beat.cut))) throw new Error(`limitNote must state format(cut) = "${format(beat.cut)}" — the value under which card 6 draws nothing; it says: ${words.cut}`);
  const largestLabel = say("largestLabel", beat.largestLabel).join(" ");
  if (!owes(largestLabel, reading.largest.name) || !owes(largestLabel, format(first.value))) throw new Error(`largestLabel must state r.largest.name and format(r.largest.value) = "${format(first.value)}"; it says: ${largestLabel}`);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  if (!Array.isArray(beat.keySizes) || beat.keySizes.length < 1 || beat.keySizes.length > 4 || beat.keySizes.some((v) => !(v > 0 && v <= first.value)))
    throw new Error(`keySizes must be 1 to 4 round values for the key's circles, each above zero and at most the largest (${first.value}); got ${JSON.stringify(beat.keySizes)}`);
  const sizes = beat.keySizes.map((v) => ({ mw: v, label: format(v) }));

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [first.value, ...beat.keySizes, beat.cut, cutCount, total], "sites");
  if ((beat.lang ?? storyLanguage(HERE) ?? "en") !== "fr")
    console.log("NOTE — the live counter (symbol-drive.mjs, the worked example's) prints its two shares with a decimal comma and a space before %, and turns a plural \"centrales\" in the counter to \"centrale\" at one site: written for French");

  // The counter as card 1 reads it (the drive rewrites it as the scroll moves, the same way).
  const pct = (v) => `${(v < 0.1 ? v.toFixed(2) : v.toFixed(1)).replace(".", ",")} %`;
  const firstCounter = words.counter.replace("{n}", "1").replace("centrales", "centrale").replace("{sites}", pct((1 / total) * 100)).replace("{mw}", pct(cumulative[0]));

  const STATES = [
    { level: 0, largest: 1, subject: 0, zoom: 0, cut: 0 },
    { level: 1, largest: 1, subject: 0, zoom: 0, cut: 0 },
    { level: 2, largest: 0, subject: 0, zoom: 0, cut: 0 },
    { level: 2, largest: 0, subject: 1, zoom: 1, cut: 0 },
    { level: Math.log10(total), largest: 0, subject: 0, zoom: 0, cut: 0 },
    { level: Math.log10(cutCount), largest: 0, subject: 0, zoom: 0, cut: 1 },
  ].map((state, k) => ({ ...state, ...cameras[k], card: k }));
  // The rank buckets, ten to a decade (the worked example's): the cut and 1,000 are edges, so card 6
  // keeps exactly its sites.
  const EDGES = [...new Set([
    ...Array.from({ length: 10 }, (_, i) => i + 1),
    ...Array.from({ length: 29 }, (_, i) => Math.round(10 ** (1 + (i + 1) / 10))).filter((e) => e > 10 && e < total),
    cutCount,
    ...(1000 < total ? [1000] : []),
    total,
  ])].sort((a, b) => a - b);
  const round4 = (v) => Math.round(v * 1e4) / 1e4;
  const bands = arrivalsFor(EDGES.map((to, i) => {
    const from = i === 0 ? 1 : EDGES[i - 1] + 1;
    const members = stations.slice(from - 1, to).map((s) => ({ lon: round4(s.lon), lat: round4(s.lat), r: round4(Math.sqrt(s.value / first.value)), nuclear: s.group === String(beat.subject) }));
    return { from, to, nuclear: members.filter((m) => m.nuclear), others: members.filter((m) => !m.nuclear) };
  }), STATES.map((s) => s.level));
  if (bands.reduce((a, b) => a + b.nuclear.length + b.others.length, 0) !== total) throw new Error("the rank bands do not hold every site once: a defect in the kit, not in beat.mjs");
  for (const [k, state] of STATES.entries()) {
    const arrived = bands.reduce((n, b) => n + (b.to - b.from + 1) * Math.max(0, Math.min(1, (state.level - b.a) / (b.b - b.a))), 0);
    if (Math.abs(arrived - Math.round(10 ** state.level)) > 1e-6) throw new Error(`card ${k + 1} should show ${Math.round(10 ** state.level)} sites; the arrivals give ${arrived}: a defect in the kit, not in beat.mjs`);
  }

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.circleIs} ${words.cut} ${sizes.map((s) => s.label).join(" ")}`,
    annot: largestLabel,
    value: `${words.counter} ${words.subjectNote} ${words.cutNote} 0123456789,%`,
  };
  const key = maptilerKey(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const trackingEm = (register) => Number.parseFloat(register.letterSpacing ?? "0") / Number.parseFloat(register.fontSize);

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
        const colours = { circle: adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent };
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
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedProportionalScrolly, {
                plan: { ...plan, fallback: shapes },
                fallbacks,
                reference: REFERENCE,
                cumulative: cumulative.map((v) => Math.round(v * 100) / 100),
                maxMw: first.value,
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
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "symbol-drive.mjs"), "utf8")}`,
              apply: "applySymbolState",
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
        console.log(`face served by MapTiler: ${fonts.annot}`);
      } finally {
        await cards.close();
      }
      liveGuard(HERE, outPath, key);
      return { outPath };
    },
  });
});
