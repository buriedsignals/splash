// The generic half of a dot density SCROLLY beat, taken from
// proof/scrolly-dot-density-europe-stations/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards over ONE live, flat MapTiler map driven by a plan (plan.mjs, verbatim), one dot per site
// (dot-drive.mjs, verbatim):
//
//   1 empty    the land, empty;
//   2 dots     one dot per site, group by group, most numerous first; the header counts them;
//   3 subject  the subject group's sites arrive ringed; every other site steps back;
//   4 weight   every dot takes the AREA of its value: the small turn to dust, the subject swells;
//   5 focus    the camera closes on the region holding most of the subject's sites;
//   6 limits   one dot per site again, the subject ringed; the reading line and the data's limit.
//
// Under the live map, one frozen image per card, baked from the same plan (fallback/, cached on the
// plan's hash). The page in renders/ carries `__MAPTILER_KEY__`; the key is substituted only in
// temporary copies, removed. The page holds every site as a dot: renders are heavy — run ONE at a time.
//
// This file computes every figure the cards may state (counts, shares, the focus region's averages)
// and checks the words against them; ./beat.mjs — the one file the model writes — gives the sites and
// the WORDS. Copied into the beat by the harness; never edited by the model.
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
import { dotDensityPlan } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids. */
const CARDS = ["empty", "dots", "subject", "weight", "focus", "limits"];
/** The whole-map camera never reaches past Europe: the box the sites fill is clipped to it. */
const WHOLE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
/** The worked example's dot sizes were set on a 1920-wide video; the reference here is 1280 wide. */
const VIDEO_REFERENCE_WIDTH = 1920;
const STATES_RAW = [
  { arrive: 0, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 0, fade: 0, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 1, weight: 0, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 0 },
  { arrive: 1, subject: 1, fade: 0, weight: 1, zoom: 1 },
  { arrive: 1, subject: 1, fade: 0, weight: 0, zoom: 0 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedDotDensityScrolly } = await import("./DirectedDotDensityScrolly.tsx");

  const REQUIRED = ["eyebrow", "sites", "subject", "compareGroup", "keySizes", "unit", "counter", "dotIs", "weightIs", "subjectIs", "subjectNote", "weightNote", "zoomNote", "limitNote", "format", "count", "percent", "cards", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "count", "percent", "subjectIs", "subjectNote", "weightNote", "zoomNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  const absent = WORDED.filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${WORDED.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: card 6's sentence (see CONTRACT.md)");

  // ── the sites ───────────────────────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.sites) || beat.sites.length < 50) throw new Error("sites must be every site as { value, lon, lat, group, region }, at least 50 (a dot map is about many places; see CONTRACT.md)");
  const bad = beat.sites.filter((s) => ![s.value, s.lon, s.lat].every((v) => typeof v === "number" && Number.isFinite(v)));
  if (bad.length) throw new Error(`sites hold ${bad.length} row(s) with no usable value or coordinates (first: ${JSON.stringify(bad[0])}): convert them with Number(), or leave them out and say so in limits`);
  assertNumbers(beat.sites.map((s, i) => [`site ${i + 1}`, s.value]));
  if (beat.sites.some((s) => !(s.value > 0))) throw new Error("sites hold a value that is not above zero: card 4 gives each dot the area of its value");
  const stations = beat.sites.map((s) => ({ value: s.value, lon: s.lon, lat: s.lat, group: String(s.group ?? ""), region: String(s.region ?? "") }));
  const total = stations.length;
  const SUBJECT = String(beat.subject);
  const subjectSites = stations.filter((s) => s.group === SUBJECT);
  if (!subjectSites.length) throw new Error(`no site's group is ${JSON.stringify(SUBJECT)}: subject must be the group card 3 rings (the groups are ${[...new Set(stations.map((s) => s.group))].slice(0, 12).join(", ")})`);
  if (subjectSites.length === total) throw new Error("every site is in the subject group: card 3 would step nothing back");
  const valueAll = stations.reduce((a, s) => a + s.value, 0);
  const valueSubject = subjectSites.reduce((a, s) => a + s.value, 0);
  const byGroup = {};
  for (const s of stations) {
    byGroup[s.group] ??= { n: 0, value: 0 };
    byGroup[s.group].n++;
    byGroup[s.group].value += s.value;
  }
  const others = Object.entries(byGroup).filter(([g]) => g !== SUBJECT).sort((a, b) => b[1].n - a[1].n).map(([g]) => g);
  if (others.length > 8) throw new Error(`the sites fall into ${others.length + 1} groups: card 2 reveals them group by group, at most 9 — merge the small ones in beat.mjs (say so in limits)`);
  const perSite = Object.entries(byGroup).map(([group, v]) => ({ group, mean: v.value / v.n })).sort((a, b) => b.mean - a.mean);

  const sitesBy = {};
  for (const s of subjectSites) sitesBy[s.region] = (sitesBy[s.region] ?? 0) + 1;
  const [focus, focusCount] = Object.entries(sitesBy).sort((a, b) => b[1] - a[1])[0];
  const focusSubject = subjectSites.filter((s) => s.region === focus);
  if (!focus || focusSubject.length < 2) throw new Error(`the region holding most ${SUBJECT} sites (${focus || "no region"}) holds ${focusSubject.length}: card 5 centres the camera on a region's subject sites, which needs at least two (give each site its region)`);
  const inFocus = stations.filter((s) => s.region === focus);
  const mean = (group) => {
    const list = inFocus.filter((s) => s.group === group);
    if (!list.length) throw new Error(`card 5 compares ${group} in ${focus}, which has none: choose another compareGroup`);
    return list.reduce((a, s) => a + s.value, 0) / list.length;
  };
  const COMPARE = String(beat.compareGroup);
  if (COMPARE === SUBJECT) throw new Error("compareGroup is the subject itself: card 5 sets the subject's mean site against ANOTHER group's");
  const focusSubjectMean = mean(SUBJECT);
  const focusCompareMean = mean(COMPARE);

  // ── the cameras (the worked example's arithmetic) ───────────────────────────────────────────────
  const proj = stations.map((s) => mercatorOf([s.lon, s.lat]));
  const pctile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))];
  const [wx0, wy1] = mercatorOf([WHOLE_WINDOW.west, WHOLE_WINDOW.south]);
  const [wx1, wy0] = mercatorOf([WHOLE_WINDOW.east, WHOLE_WINDOW.north]);
  const ex0 = Math.max(wx0, pctile(proj.map((p) => p[0]), 0.01));
  const ex1 = Math.min(wx1, pctile(proj.map((p) => p[0]), 0.99));
  const ey0 = Math.max(wy0, pctile(proj.map((p) => p[1]), 0.01));
  const ey1 = Math.min(wy1, pctile(proj.map((p) => p[1]), 0.99));
  if (!(ex1 > ex0 && ey1 > ey0)) throw new Error("the sites do not fall in Europe (25° W to 45° E, 34° N to 72° N): this kit draws Europe only");
  const padX = (ex1 - ex0) * 0.06;
  const padY = (ey1 - ey0) * 0.06;
  const [bx0, bx1, by0, by1] = [ex0 - padX, ex1 + padX, ey0 - padY, ey1 + padY];
  const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
  const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
  const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);
  const fp = focusSubject.map((s) => mercatorOf([s.lon, s.lat]));
  const fx0 = Math.min(...fp.map((p) => p[0]));
  const fx1 = Math.max(...fp.map((p) => p[0]));
  const fy0 = Math.min(...fp.map((p) => p[1]));
  const fy1 = Math.max(...fp.map((p) => p[1]));
  if (!(fx1 - fx0 > 1e-6 && fy1 - fy0 > 1e-6)) throw new Error(`${focus}'s ${SUBJECT} sites all sit on one line or point: card 5's close-up is fitted to their box`);
  const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((fx1 - fx0) * 1.15 * 512), REFERENCE.height / ((fy1 - fy0) * 1.15 * 512)));
  const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
  const closeUp = cameraFields({ center: lonLatOf([(fx0 + fx1) / 2, (fy0 + fy1) / 2]), zoom: CLOSE_ZOOM, alignY: 0 });
  const cameras = [whole, whole, whole, whole, closeUp, whole];
  const STATES = STATES_RAW.map((state, k) => ({ ...state, ...cameras[k], card: k }));

  // ── the reading ─────────────────────────────────────────────────────────────────────────────────
  const reading = {
    count: total,
    othersCount: total - subjectSites.length,
    groups: others.map((g) => ({ group: g, count: byGroup[g].n, value: byGroup[g].value, mean: byGroup[g].value / byGroup[g].n })),
    subject: { group: SUBJECT, count: subjectSites.length, siteShare: (subjectSites.length / total) * 100, valueShare: (valueSubject / valueAll) * 100, value: valueSubject, mean: valueSubject / subjectSites.length },
    mostConcentrated: perSite[0].group,
    focus: { region: focus, count: focusCount, subjectMean: focusSubjectMean, compareGroup: COMPARE, compareMean: focusCompareMean, ratio: focusSubjectMean / focusCompareMean },
    whole: valueAll,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(stations.map((s) => s.value), HERE);
  if (!Array.isArray(beat.keySizes) || beat.keySizes.length < 1 || beat.keySizes.length > 4) throw new Error("keySizes must be 1 to 4 round values the size key draws on card 4");
  assertLegibleLabels(beat.keySizes, beat.format);

  // ── the words ───────────────────────────────────────────────────────────────────────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const count = (n) => plain(beat.count(n));
  const percent = (v) => plain(beat.percent(v));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const OWES = {
    empty: [["count(r.count)", count(total)]],
    dots: [["count(r.othersCount)", count(reading.othersCount)]],
    subject: [["count(r.subject.count)", count(reading.subject.count)], ["percent(r.subject.siteShare)", percent(reading.subject.siteShare)]],
    weight: [["percent(r.subject.valueShare)", percent(reading.subject.valueShare)]],
    focus: [["count(r.focus.count)", count(focusCount)], ["format(r.focus.subjectMean)", format(focusSubjectMean)], ["format(r.focus.compareMean)", format(focusCompareMean)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k]) if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  const known = [
    total, reading.othersCount, subjectSites.length, reading.subject.siteShare, reading.subject.valueShare, valueAll, valueSubject, reading.subject.mean,
    focusCount, focusSubjectMean, focusCompareMean, reading.focus.ratio, others.length, ...beat.keySizes,
    ...reading.groups.flatMap((g) => [g.count, g.mean]),
  ];
  const check = figureCheck({ format: [beat.percent, beat.format], known, hint: "r.subject.count, r.subject.valueShare, r.focus.subjectMean, …" });
  WORDED.forEach((k, i) => check(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  const words = {
    unit: plain(beat.unit),
    count: plain(beat.counter),
    subjectNote: say("subjectNote", beat.subjectNote).join(" "),
    weightNote: say("weightNote", beat.weightNote).join(" "),
    zoomNote: say("zoomNote", beat.zoomNote).join(" "),
    dotIs: plain(beat.dotIs),
    subjectIs: say("subjectIs", beat.subjectIs).join(" "),
    weightIs: plain(beat.weightIs),
    limit: plain(beat.limitNote),
  };
  if (words.count.split("{n}").length !== 2) throw new Error(`counter must hold {n} once: the header counts the dots standing into it; it is ${JSON.stringify(words.count)}`);
  check("counter", words.count.replace("{n}", " "));
  for (const k of ["subjectNote", "weightNote", "zoomNote", "subjectIs", "limit"]) check(k === "limit" ? "limitNote" : k, words[k]);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  check("alt", alt);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [total, subjectSites.length, reading.othersCount, ...beat.keySizes], "sites");
  const firstCounter = words.count.replace("{n}", "0");

  // ── the dots, sized and bucketed as the worked example (its validated video's rule) ──────────────
  const maxValue = Math.max(...stations.map((s) => s.value));
  const SCALE = REFERENCE.width / VIDEO_REFERENCE_WIDTH;
  const DOT_R = 2.2 * SCALE;
  const WEIGHT_R = 40 * SCALE;
  const WEIGHT_FLOOR_R = 1.2 * SCALE;
  const RING_R = 3.2 * DOT_R;
  const round4 = (v) => Math.round(v * 1e4) / 1e4;
  const weightRadiusOf = (v) => Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(v / maxValue));
  const asWeighted = (s) => ({ lon: round4(s.lon), lat: round4(s.lat), w: weightRadiusOf(s.value) });
  const stationsByFuel = Object.fromEntries(others.map((g) => [g, stations.filter((s) => s.group === g).map(asWeighted)]));
  const nuclearWeighted = subjectSites.map(asWeighted);
  if (beat.keySizes.some((v) => !(v > 0 && v <= maxValue))) throw new Error(`keySizes must each be above zero and at most the largest site (${maxValue})`);
  const sizes = beat.keySizes.map((v) => ({ mw: v, label: format(v), px: 2 * Math.max(WEIGHT_FLOOR_R, WEIGHT_R * Math.sqrt(v / maxValue)) }));

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.dotIs} ${words.subjectIs} ${words.weightIs} ${words.limit} ${sizes.map((s) => s.label).join(" ")}`,
    annot: "",
    value: `${words.count} ${words.subjectNote} ${words.weightNote} ${words.zoomNote} 0123456789`,
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
        const walked = (c, on, floor) => adjustToContrast(c, on, floor) ?? c;
        const dot = walked(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN);
        let subject = null;
        for (const ratio of [0.35, 0.5, 0.65, 0.8, 1]) {
          const candidate = walked(mix(direction.accent, ink, ratio), tints.land, NON_TEXT_CONTRAST_MIN);
          if (contrast(dot, candidate) >= 1.5) {
            subject = candidate;
            break;
          }
        }
        if (!subject) throw new Error(`no mix of the accent toward the ink separates the subject's disc from the ordinary dot (${dot}) by 1.5:1 on ${tints.land}: the palette cannot carry this map`);
        const colours = { land: tints.land, dot, subject, barBack: mix(tints.land, dot, 0.18) };
        const plan = dotDensityPlan({
          tints: { water: tints.water, land: tints.land },
          fuels: others,
          stations: stationsByFuel,
          nuclear: nuclearWeighted,
          colours,
          cameras,
          statesForCards: STATES,
          referenceWidth: REFERENCE.width,
          referenceHeight: REFERENCE.height,
          dotR: DOT_R,
          ringR: RING_R,
          hairline: (direction.stroke?.hairline ?? 0.6) * SCALE,
          ringStroke: (direction.stroke?.rule ?? 1) * SCALE,
        });
        const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedDotDensityScrolly, {
                plan: { ...plan, fallback: shapes },
                fallbacks,
                reference: REFERENCE,
                total: total - subjectSites.length,
                firstCounter,
                sizes,
                dotColour: colours.dot,
                subjectColour: colours.subject,
                barBack: colours.barBack,
                dotR: DOT_R,
                ringR: RING_R,
                shareSites: reading.subject.siteShare,
                shareCapacity: reading.subject.valueShare,
                words,
                alt,
                regs,
                ground: direction.ground,
                accent: direction.accent,
                ink,
                muted,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "dot-drive.mjs"), "utf8")}`,
              apply: "applyDotState",
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
      liveGuard(HERE, outPath, key);
      return { outPath };
    },
  });
});
