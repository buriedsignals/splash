// The generic half of a locator SCROLLY beat, taken from
// proof/scrolly-locator-zaporizhzhia/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards over
// ONE live, flat (Web Mercator) MapTiler map driven by a plan (plan.mjs, verbatim), the scroll moving
// its camera and every paint (locator-drive.mjs, verbatim):
//
//   1 tops     Europe; the largest sites as dots sized by their value, the others labelled with it;
//   2 country  the subject's country stepped forward: filled and outlined;
//   3 zoom     the camera closes on the subject; the country's regions appear as it arrives;
//   4 places   countries, settlements and water named — MapTiler's OWN label layers, filtered to the
//              names the beat gives (as the tiles spell them), each settlement on a dot;
//   5 subject  the subject ringed and named in the accent;
//   6 limits   the camera eases back part-way, every label kept; the card states the accounting.
//
// Under the live map, one frozen image per card, baked from the same plan (fallback/, cached on the
// plan's hash): what a reader without a key or a script sees. The page in renders/ carries
// `__MAPTILER_KEY__`; the key is substituted only in temporary copies, removed.
//
// This file computes every figure the cards may state (the ranking of the sites, the drawn ones,
// the subject's rank) and checks the words against them; ./beat.mjs — the one file the model writes —
// gives the sites, the places and the WORDS of each card. Copied into the beat by the harness; never
// edited by the model.
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
import { ISO3_TO_ISO2 } from "#shared/map-beat/iso-codes.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, lonLatOf, mercatorOf, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { locatorPlan } from "./plan.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { figureCheck, liveGuard, maptilerKey, openCards, owes, renderCardsPage, wordsOf } from "./scrolly-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["tops", "country", "zoom", "places", "subject", "limits"];
/** One state per card, the worked example's, verbatim; each card's camera is added below. */
const BASE_STATES = [
  { tops: 1, country: 0, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 0, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 0, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 0, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 1, limit: 0 },
  { tops: 0, country: 1, zoom: 1, places: 1, subject: 1, limit: 1 },
];
/** The header notes, one per card from card 1 (the component's slots; card 3's is the zoom's). */
const NOTE_SLOTS = { tops: "topNote", country: "countryNote", zoom: "zoomNote", subject: "subjectNote", limits: "limitNote" };
/** The whole-map camera: Europe, the worked example's window. */
const WHOLE_WINDOW = { west: -25, east: 45, south: 34, north: 72 };
/** The close-up's default half-span around the subject, in degrees (the static plate's window). */
const SPAN = { lon: 9, lat: 5.2 };
/** Card 6 eases back this share of the way toward the whole map. */
const PULLBACK = 0.35;

/** Ray casting over one ring of [lon, lat]. */
function inRing([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  const { DirectedLocatorScrolly } = await import("./DirectedLocatorScrolly.tsx");

  const REQUIRED = ["eyebrow", "sites", "subject", "subjectName", "subjectLabel", "country", "areas", "places", "waters", "unit", "format", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")}: give each as a field of the default export (export default { …, ${missingFields[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "subjectLabel", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const WORDED = CARDS.slice(0, 5);
  for (const [group, keys] of [["cards", WORDED], ["notes", Object.keys(NOTE_SLOTS)]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }
  if (typeof [beat.limits].flat()[0] !== "string") throw new Error("limits must be a string: the last card's sentence, the accounting the map rests on (see CONTRACT.md)");

  // ── the shapes: which country a point falls in ──────────────────────────────────────────────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const countryOf = (lon, lat) => {
    for (const f of geo.features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      if (polys.some((poly) => inRing([lon, lat], poly[0]) && !poly.slice(1).some((hole) => inRing([lon, lat], hole)))) return f.properties.iso;
    }
    return null;
  };
  const shapeIsos = new Set(geo.features.map((f) => f.properties.iso));
  const inWindow = (p) => p.lon >= WHOLE_WINDOW.west && p.lon <= WHOLE_WINDOW.east && p.lat >= WHOLE_WINDOW.south && p.lat <= WHOLE_WINDOW.north;
  const isPoint = (p) => typeof p?.lon === "number" && typeof p?.lat === "number" && Number.isFinite(p.lon) && Number.isFinite(p.lat) && Math.abs(p.lon) <= 180 && Math.abs(p.lat) <= 85;

  // ── the sites: every one, so the ranking is the whole list ──────────────────────────────────────
  if (!Array.isArray(beat.sites) || beat.sites.length < 2) throw new Error("sites must be every site of the kind the story ranks, as { value, lon, lat } (see CONTRACT.md)");
  const badPoint = beat.sites.filter((s) => !isPoint(s));
  if (badPoint.length) throw new Error(`sites hold ${badPoint.length} row(s) whose lon/lat are not numbers on the globe (first: ${JSON.stringify(badPoint[0])}): convert them with Number(), or leave them out and say so in limits`);
  assertNumbers(beat.sites.map((s, i) => [s.name ?? `site ${i + 1}`, s.value]));
  if (beat.sites.some((s) => !(s.value > 0))) throw new Error("sites hold a value that is not above zero: a dot is sized by its value; leave out the sites the data gives no value for");
  const ranked = [...beat.sites].sort((a, b) => b.value - a.value).map((s, i) => ({ ...s, rank: i + 1 }));
  const DRAWN = beat.drawCount ?? 4;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 2 && DRAWN <= 6)) throw new Error(`drawCount is ${beat.drawCount}: card 1 draws between 2 and 6 of the largest sites`);
  const tops = ranked.slice(0, DRAWN);
  const offFrame = tops.filter((s) => !inWindow(s));
  if (offFrame.length) throw new Error(`the largest sites include ${offFrame.map((s) => `${s.name ?? "a site"} at ${s.lon}, ${s.lat}`).join("; ")}, outside the whole-map camera (${WHOLE_WINDOW.west}° to ${WHOLE_WINDOW.east}° E, ${WHOLE_WINDOW.south}° to ${WHOLE_WINDOW.north}° N): this kit draws Europe only`);
  const same = (a, b) => Math.abs(a.lon - b.lon) < 1e-6 && Math.abs(a.lat - b.lat) < 1e-6;
  if (!isPoint(beat.subject)) throw new Error("subject must be { lon, lat } — the coordinates of the subject's own row in sites");
  const subjectRow = tops.find((s) => same(s, beat.subject));
  if (!subjectRow)
    throw new Error(`subject (${beat.subject.lon}, ${beat.subject.lat}) is not one of the ${DRAWN} largest sites: card 1 draws the largest and card 5 rings the subject among them. Give the subject's own row's lon/lat, or raise drawCount`);
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) if (same(tops[i], tops[j])) throw new Error(`two of the drawn sites sit at the same point (${tops[i].lon}, ${tops[i].lat}): give each site its own row once`);
  assertLegibleLabels(tops.map((s) => s.value), beat.format);

  // ── the country card 2 steps forward ────────────────────────────────────────────────────────────
  const country = beat.country;
  if (!country || !shapeIsos.has(country.iso) || !/^[A-Z]{2}$/.test(ISO3_TO_ISO2[country.iso] ?? "") || !String(country.name ?? "").trim())
    throw new Error(`country must be { iso, name } — the ISO alpha-3 code of the country card 2 outlines (a European country of the shapes) and its name in the story's language; got ${JSON.stringify(country)}`);
  const subjectIn = countryOf(subjectRow.lon, subjectRow.lat);
  if (subjectIn !== country.iso)
    throw new Error(`the subject (${subjectRow.lon}, ${subjectRow.lat}) falls in ${subjectIn ?? "no country of the shapes"}, not in ${country.iso}: card 2 outlines the subject's own country`);

  // ── what card 4 names: MapTiler's own labels, filtered ──────────────────────────────────────────
  if (!Array.isArray(beat.areas) || beat.areas.some((iso) => !/^[A-Z]{2}$/.test(ISO3_TO_ISO2[iso] ?? "")))
    throw new Error(`areas must be ISO alpha-3 codes of the countries card 4 names (MapTiler's own country labels); got ${JSON.stringify(beat.areas)}`);
  if (!Array.isArray(beat.places) || beat.places.some((p) => !isPoint(p) || !String(p.name ?? "").trim()))
    throw new Error("places must be [{ name, lon, lat }] — the settlements card 4 names, each as MapTiler's map spells it, at its own coordinates from data.json");
  if (beat.places.length > 8) throw new Error(`places holds ${beat.places.length} settlements: name at most 8 (the largest), or the close-up fills with words`);
  if (!Array.isArray(beat.waters) || beat.waters.some((w) => typeof w !== "string" || !w.trim()))
    throw new Error("waters must be the names of the seas or lakes card 4 names, as MapTiler's map spells them (in English: \"Black Sea\")");
  if (beat.river !== undefined && (!isPoint(beat.river) || !String(beat.river.text ?? "").trim()))
    throw new Error("river must be { text, lon, lat }: a river name the map draws itself, in the story's language, at a point on the river");

  // ── the cameras, from the beat's own facts (the worked example's arithmetic) ────────────────────
  const span = beat.span ?? SPAN;
  if (!(span.lon > 0 && span.lat > 0 && span.lon <= 30 && span.lat <= 20)) throw new Error(`span is ${JSON.stringify(beat.span)}: { lon, lat } degrees either side of the subject, at most 30 by 20`);
  const [bx0, by1] = mercatorOf([WHOLE_WINDOW.west, WHOLE_WINDOW.south]);
  const [bx1, by0] = mercatorOf([WHOLE_WINDOW.east, WHOLE_WINDOW.north]);
  const REFERENCE = { width: 1280, height: Math.round((1280 * (by1 - by0)) / (bx1 - bx0)) };
  const WHOLE_ZOOM = Math.log2(REFERENCE.width / ((bx1 - bx0) * 512));
  const WHOLE_CENTER = lonLatOf([(bx0 + bx1) / 2, (by0 + by1) / 2]);
  const [zx0, zy1] = mercatorOf([subjectRow.lon - span.lon, subjectRow.lat - span.lat]);
  const [zx1, zy0] = mercatorOf([subjectRow.lon + span.lon, subjectRow.lat + span.lat]);
  const CLOSE_ZOOM = Math.log2(Math.min(REFERENCE.width / ((zx1 - zx0) * 512), REFERENCE.height / ((zy1 - zy0) * 512)));
  const CLOSE_CENTER = [subjectRow.lon, subjectRow.lat];
  const PULLBACK_ZOOM = CLOSE_ZOOM - (CLOSE_ZOOM - WHOLE_ZOOM) * PULLBACK;
  const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM, alignY: 1 });
  const closeUp = cameraFields({ center: CLOSE_CENTER, zoom: CLOSE_ZOOM, alignY: 0 });
  const pullback = cameraFields({ center: CLOSE_CENTER, zoom: PULLBACK_ZOOM, alignY: 0 });
  const cameras = [whole, whole, closeUp, closeUp, closeUp, pullback];
  const STATES = BASE_STATES.map((state, k) => ({ ...state, ...cameras[k], card: k }));
  const inClose = (p) => Math.abs(p.lon - subjectRow.lon) <= span.lon && Math.abs(p.lat - subjectRow.lat) <= span.lat;
  const farPlaces = beat.places.filter((p) => !inClose(p));
  if (farPlaces.length) throw new Error(`places holds ${farPlaces.map((p) => p.name).join(", ")}, outside the close-up (±${span.lon}° by ±${span.lat}° around the subject): card 4 names only what the close-up shows`);

  const pub = (s) => ({ name: s.name ?? null, value: s.value, lon: s.lon, lat: s.lat, rank: s.rank });
  const reading = {
    count: ranked.length,
    drawCount: DRAWN,
    top: tops.map(pub),
    largest: pub(tops[0]),
    second: pub(tops[1]),
    last: pub(tops[DRAWN - 1]),
    subject: { ...pub(subjectRow), name: plain(beat.subjectName) },
    country: { iso: country.iso, name: plain(country.name) },
    places: beat.places.map((p) => ({ name: plain(p.name), lon: p.lon, lat: p.lat })),
    placeCount: beat.places.length,
    countryOf,
  };
  Object.freeze(reading);

  beat.check(reading);
  assertDrawsClaimColumn(tops.map((s) => s.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = wordsOf(reading);
  const format = (v) => plain(beat.format(v));
  const prose = [...WORDED.map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const words = { unit: plain(beat.unit) };
  for (const [k, slot] of Object.entries(NOTE_SLOTS)) words[slot] = say(`notes.${k}`, beat.notes[k]).join(" ");
  const subjectLabel = say("subjectLabel", beat.subjectLabel).join(" ");

  // What each card is ABOUT, so it must say it.
  const OWES = {
    tops: [["format(subject.value)", format(subjectRow.value)]],
    country: [["country.name", reading.country.name]],
    zoom: [],
    places: [],
    subject: [["subjectName", reading.subject.name], ["format(subject.value)", format(subjectRow.value)]],
  };
  WORDED.forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owes(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — what its picture shows; it says: ${text}`);
  });
  for (const [what, wanted] of [["subjectName", reading.subject.name], ["format(subject.value)", format(subjectRow.value)]])
    if (!owes(subjectLabel, wanted)) throw new Error(`subjectLabel (the words beside the ring) must state ${what} = "${wanted}"; it says: ${subjectLabel}`);

  const known = [ranked.length, DRAWN, DRAWN - 1, beat.places.length, subjectRow.rank, ...tops.map((s) => s.value)];
  const checkFigures = figureCheck({ format: [beat.format, (v) => v.toLocaleString(beat.lang ?? storyLanguage(HERE) ?? "en")], known, hint: "r.subject.value, r.top[i].value, r.count, …" });
  WORDED.forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  for (const [k, slot] of Object.entries(NOTE_SLOTS)) checkFigures(`notes.${k}`, words[slot]);
  checkFigures("subjectLabel", subjectLabel);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], tops.map((s) => s.value), "sites");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const placeNames = beat.places.map((p) => plain(p.name));
  const waters = beat.waters.map(plain);
  const river = beat.river ? { at: [beat.river.lon, beat.river.lat], text: plain(beat.river.text) } : { at: CLOSE_CENTER, text: " " };
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${tops.filter((s) => s !== subjectRow).map((s) => format(s.value)).join(" ")} ${words.limitNote}`,
    annot: `${subjectLabel} ${placeNames.join(" ")} ${waters.join(" ")} ${river.text}`,
    value: `${Object.values(NOTE_SLOTS).map((slot) => words[slot]).join(" ")}`,
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
        // THE NAMES, AGAINST THE TILES: card 4's settlements and waters are MapTiler's own labels filtered by
        // name, so a name the tiles spell otherwise draws a dot with no word. Asked of the tiles at the close-up.
        const namesPage = await cards.mapPage();
        try {
          await namesPage.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
          const zoom = CLOSE_ZOOM + zoomShiftFor({ referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height }, 1280, 680);
          const seen = await namesPage.evaluate(
            async (style, center, zoom) => {
              const map = new maplibregl.Map({ container: "map", style, center, zoom, interactive: false, fadeDuration: 0 });
              await new Promise((r) => map.once("idle", r));
              const nameOf = (f) => f.properties["name:latin"] ?? f.properties.name;
              const places = map.querySourceFeatures("maptiler_planet", { sourceLayer: "place" }).map(nameOf);
              const waters = map.querySourceFeatures("maptiler_planet", { sourceLayer: "water_name" }).map((f) => f.properties.name);
              map.remove();
              return { places: [...new Set(places)], waters: [...new Set(waters)] };
            },
            cards.styleDoc,
            CLOSE_CENTER,
            zoom,
          );
          const unknownPlaces = placeNames.filter((n) => !seen.places.includes(n));
          const unknownWaters = waters.filter((n) => !seen.waters.includes(n));
          // A NOTE, NOT A REFUSAL: the worked example's own six settlements are not in the tiles at its close-up
          // zoom (MapTiler carries city names from tile zoom 5; the close-up opens at 4.9 on a 1280x800 desktop),
          // so the proof draws them as dots without a name — matched here, and said.
          if (unknownPlaces.length || unknownWaters.length)
            console.log(
              `NOTE — MapTiler's tiles carry no ${[...unknownPlaces, ...unknownWaters].map((n) => JSON.stringify(n)).join(", ")} at the close-up's zoom on a 1280x800 desktop: ` +
                `card 4 shows the map's OWN labels, filtered by name, so ${unknownPlaces.length ? "those settlements are dots without a name" : "those waters are not named"} on the live map ` +
                `(a smaller span zooms closer; the map's names are spelled as it spells them — names it carries there: ${[...seen.places, ...seen.waters].filter(Boolean).slice(0, 30).join(", ")})`,
            );
          else console.log(`names: ${placeNames.length} settlements and ${waters.length} waters found among MapTiler's own labels in the close-up`);
        } finally {
          await namesPage.close();
        }

        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const tints = plateTints(direction);
        const inkOnLand = adjustToContrast(ink, tints.land, TEXT_CONTRAST_MIN) ?? ink;
        const mutedOnLand = adjustToContrast(muted, tints.land, TEXT_CONTRAST_MIN) ?? muted;
        const waterInk = adjustToContrast(mix(direction.accent, ink, 0.2), tints.water, TEXT_CONTRAST_MIN) ?? inkOnLand;
        const accentMark = adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent;
        const accentInk = adjustToContrast(direction.accent, tints.land, TEXT_CONTRAST_MIN) ?? direction.accent;
        const unreported = adjustToContrast(mix(tints.land, ink, 0.22), tints.land, NON_TEXT_CONTRAST_MIN) ?? mix(tints.land, ink, 0.22);
        const colours = {
          unreported,
          accentMark,
          accentInk,
          regionLine: adjustToContrast(mix(tints.land, ink, 0.45), unreported, NON_TEXT_CONTRAST_MIN) ?? mix(tints.land, ink, 0.45),
          stationDot: adjustToContrast(direction.accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? direction.accent,
          inkOnLand,
          waterInk,
        };
        if (contrast(colours.unreported, tints.land) < NON_TEXT_CONTRAST_MIN) throw new Error(`the country's fill ${colours.unreported} measures under 3:1 against the land ${tints.land}: the palette's ground cannot carry it`);
        const fonts = {
          axis: await cards.faceOf(regs.axis, "axis"),
          axisSize: Number.parseFloat(regs.axis.fontSize),
          annot: await cards.faceOf(regs.annot, "annot"),
          annotSize: Number.parseFloat(regs.annot.fontSize),
          waterFace: await cards.faceOf({ ...regs.annot, fontStyle: "italic" }, "water"),
          waterSize: Number.parseFloat(regs.annot.fontSize),
        };
        const largest = tops[0].value;
        const plan = locatorPlan({
          tints: { water: tints.water, land: tints.land },
          subjectCountryIso: ISO3_TO_ISO2[country.iso],
          stations: tops.map((s) => ({ lon: s.lon, lat: s.lat, r: Math.sqrt(s.value / largest), isSubject: s === subjectRow, label: format(s.value) })),
          subject: { lon: subjectRow.lon, lat: subjectRow.lat, label: subjectLabel, riverAt: river.at, riverLabel: river.text },
          places: beat.places.map((p) => ({ lon: p.lon, lat: p.lat })),
          colours,
          fonts,
          cameras,
          statesForCards: STATES,
          referenceWidth: REFERENCE.width,
          referenceHeight: REFERENCE.height,
          radiusPx: 9,
          subjectRadiusPx: { rest: 5, named: 9 },
          placeDotPx: 3,
        });
        const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
        if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

        const native = {
          countryCodes: beat.areas.map((iso) => ISO3_TO_ISO2[iso]),
          countryColor: mutedOnLand,
          placeNames,
          placeColor: inkOnLand,
          waterNames: waters,
          waterColor: waterInk,
          landHalo: tints.land,
        };
        const renderPage = (fallbacks, shapes) =>
          renderScrolly({
            steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
            reveal: {
              element: createElement(DirectedLocatorScrolly, {
                plan: { ...plan, fallback: shapes },
                fallbacks,
                reference: REFERENCE,
                native,
                words,
                alt,
                regs,
                ground: direction.ground,
                accent: direction.accent,
                ink,
                muted,
              }),
              states: STATES,
              driver: `${cards.mapScript}\n${readFileSync(join(HERE, "locator-drive.mjs"), "utf8")}`,
              apply: "applyLocatorState",
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
        console.log(`faces served by MapTiler: ${fonts.axis} / ${fonts.annot} / ${fonts.waterFace}`);
      } finally {
        await cards.close();
      }

      // WAIVED, BY EXACT SHAPE: frames with a missing tile while the camera travels. The worked example's own
      // committed page fails the same guard the same way (measured 2026-10-26: 4/5 frames at 1280x800, 6/7 at
      // 375x812 at 30/120 px per frame) — the close-up's tiles load during the travel. An undrawn canvas at a
      // card is never waived.
      liveGuard(HERE, outPath, key, {
        waive: [{ test: /^\d+x\d+: \d+ frames with a missing tile at \d+px\/frame$/, why: "inherited: the worked example's own page fails it the same way (tiles loading during the camera's travel)" }],
      });
      return { outPath };
    },
  });
});
