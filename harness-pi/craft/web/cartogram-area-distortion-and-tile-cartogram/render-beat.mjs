// The generic half of a tile-cartogram WEB beat, taken from
// proof/web-cartogram-europe-lowcarbon/render-directions-web.mjs with everything about ITS subject
// removed. The page is the worked example's: one equal square per country on a designed grid,
// shaded by class — NOT a live map (no basemap, no key, no fallback picture) — and ONE control: the
// reader PUTS THE GEOGRAPHY BACK, one sacrifice at a time (the `restore` vocabulary). Stage 1 is the
// filed grid; stage 2 slides every square near its true centroid (relaxed until none overlaps); stage
// 3 gives each square its country's true area. The line of average under the plate is rewritten:
// giving back the PLACE does not move the mean by country, giving back the AREA turns it into the
// area-weighted mean a choropleth shows. Hovering a square answers its reading and what the chosen
// stage cost it. With no script the stages swap in pure CSS. This file computes the geometry (areas
// and centroids on the kit's frozen shapes in an equal-area projection), the relaxations, both means
// and every cost; ./beat.mjs — the one file the model writes — gives the rows, the breaks and the
// WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNumbers } from "./guards.mjs";
import { lookAt, mapWeb, verifyPage } from "./map-web.mjs";
import { chartWeb, pickDirection, plain, plainRegisters, refusing, storyLanguage } from "./web.mjs";
import { project } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CELL = 92;
const GAP = 8;
const TILE = CELL - GAP;
/** A cell's two-line name block (12 px name over a 13 px value), measured off the component. */
const NAME_BLOCK_H = 32;
/** The designed layout (the worked example's): one tile per country, roughly where a reader expects it. */
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
const STAGES = ["grid", "place", "area"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertRestoreDeclaration, assertOneRestore, restoreClearOf, restoreCrowdingOf, restoreDisplacementOf, restoreNamesOf, restoreRelaxation, restoreSlugOf } = await import(mapWeb(HERE, "assets", "restore.ts"));
  const { DirectedCartogramWeb } = await import("./DirectedCartogramWeb.tsx");

  // ── the fields ────────────────────────────────────────────────────────────────────────────────
  const REQUIRED = ["eyebrow", "rows", "breaks", "format", "classLabel", "figure", "number", "stageLabel", "stages", "total", "detail", "missingLabel", "callout", "title", "limits", "reading", "source", "alt", "check"];
  const missingFields = REQUIRED.filter((key) => beat[key] === undefined);
  if (missingFields.length) throw new Error(`beat.mjs is missing ${missingFields.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "classLabel", "figure", "number", "total", "detail", "callout", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const key of STAGES) {
    const w = beat.stages[key];
    if (!w || typeof w.label !== "string" || typeof w.announce !== "string" || (key !== "grid" && typeof w.note !== "function"))
      throw new Error(`beat.mjs: stages.${key} must be { label, announce${key === "grid" ? "" : ", note(s)"} } (see CONTRACT.md)`);
  }

  // ── THE JOIN onto the designed grid, loud both ways ────────────────────────────────────────
  const gridCodes = GRID.flatMap((l) => l.trim().split(/\s+/)).filter((c) => c !== "..");
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { iso, name, value } per country (see CONTRACT.md)");
  const seen = new Set();
  for (const r of beat.rows) {
    if (seen.has(r.iso)) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country`);
    seen.add(r.iso);
    if (!String(r.name ?? "").trim()) throw new Error(`rows: ${r.iso} has no name`);
  }
  const off = beat.rows.filter((r) => !gridCodes.includes(r.iso));
  if (off.length)
    throw new Error(`the grid has no tile for ${off.map((r) => `${JSON.stringify(r.iso)} (${r.name})`).join(", ")}: iso must be an ISO alpha-3 code of one of these ${gridCodes.length} European countries: ${gridCodes.join(" ")} — leave other rows out and say so in limits`);
  assertNumbers(beat.rows.filter((r) => r.value !== null).map((r) => [r.iso, r.value]));
  const byIso = new Map(beat.rows.map((r) => [r.iso, { ...r, name: plain(r.name) }]));

  // Grid tiles the story does not study are left out; the frame stays the designed grid's own
  // (12 x 9 cells), so every stage is measured in the frame the worked example was.
  const seats = [];
  GRID.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (byIso.has(code)) seats.push({ code, row, col });
    }),
  );
  const ROWS = GRID.length;
  const COLS = Math.max(...GRID.map((l) => l.trim().split(/\s+/).length));
  const CODES = seats.map((s) => s.code);
  if (CODES.length < 4) throw new Error(`${CODES.length} countries: a cartogram needs at least 4`);

  // ── THE GEOMETRY, measured once on the frozen shapes (equal-area camera) ──────────────────
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  const shapes = new Map();
  for (const f of geo.features) {
    const code = f.properties.iso;
    if (!code || !byIso.has(code)) continue;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (const poly of polys) {
      const ring = poly[0].map(project);
      let a = 0;
      let x = 0;
      let y = 0;
      for (let i = 0; i < ring.length; i += 1) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[(i + 1) % ring.length];
        const cross = x1 * y2 - x2 * y1;
        a += cross;
        x += (x1 + x2) * cross;
        y += (y1 + y2) * cross;
      }
      a /= 2;
      if (Math.abs(a) < 1e-12) continue;
      const w = Math.abs(a);
      area += w;
      cx += (x / (6 * a)) * w;
      cy += (y / (6 * a)) * w;
    }
    if (area <= 0) continue;
    const prev = shapes.get(code);
    if (prev) {
      const tot = prev.area + area;
      shapes.set(code, { area: tot, cx: (prev.cx * prev.area + cx) / tot, cy: (prev.cy * prev.area + cy) / tot });
    } else shapes.set(code, { area, cx: cx / area, cy: cy / area });
  }
  const shapeless = CODES.filter((c) => !shapes.has(c));
  if (shapeless.length) throw new Error(`${shapeless.join(", ")} have a tile and no polygon in the kit's shapes (a defect in the kit)`);

  // ── the two means, from the SAME shapes ──────────────────────────────────────────────────
  const withReading = CODES.filter((c) => byIso.get(c).value !== null);
  if (withReading.length < 3) throw new Error("fewer than 3 countries carry a value");
  const drawnArea = withReading.reduce((s, c) => s + shapes.get(c).area, 0);
  const byArea = withReading.reduce((s, c) => s + byIso.get(c).value * shapes.get(c).area, 0) / drawnArea;
  const byCountry = withReading.reduce((s, c) => s + byIso.get(c).value, 0) / withReading.length;
  const biggest = withReading.reduce((a, b) => (shapes.get(a).area >= shapes.get(b).area ? a : b));
  const areaShareOf = (c) => (shapes.get(c).area / drawnArea) * 100;
  // Ranked in the rows' own order where two values tie (a stable sort over beat.rows).
  const ranked = beat.rows.filter((r) => r.value !== null).map((r) => byIso.get(r.iso)).sort((a, b) => b.value - a.value);
  beat.check({
    byCountry,
    byArea,
    gap: byCountry - byArea,
    biggest: { iso: biggest, name: byIso.get(biggest).name, value: byIso.get(biggest).value, areaShare: areaShareOf(biggest) },
    value: (iso) => byIso.get(iso)?.value ?? null,
    ranked: ranked.map((r) => ({ iso: r.iso, name: r.name, value: r.value })),
  });
  assertDrawsClaimColumn(ranked.map((r) => r.value), HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, [...ranked.map((r) => r.value), byCountry, byArea], "tiles");

  // ── THE THREE STAGES ──────────────────────────────────────────────────────────────────────
  const FRAME = { width: COLS * CELL, height: ROWS * CELL };
  const gridPlace = new Map(seats.map((s) => [s.code, { cx: s.col * CELL + TILE / 2, cy: s.row * CELL + TILE / 2, side: TILE }]));
  const trueEqual = (() => {
    const xs = CODES.map((c) => shapes.get(c).cx);
    const ys = CODES.map((c) => shapes.get(c).cy);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const s = Math.min((FRAME.width - TILE) / (x1 - x0 || 1), (FRAME.height - TILE) / (y1 - y0 || 1));
    const ox = (FRAME.width - (x1 - x0) * s) / 2 - x0 * s;
    const oy = (FRAME.height - (y1 - y0) * s) / 2 - y0 * s;
    return new Map(CODES.map((c) => [c, { cx: ox + shapes.get(c).cx * s, cy: oy + shapes.get(c).cy * s, side: TILE }]));
  })();
  const trueArea = (() => {
    const half = (c) => Math.sqrt(shapes.get(c).area) / 2;
    const loX = Math.min(...CODES.map((c) => shapes.get(c).cx - half(c)));
    const hiX = Math.max(...CODES.map((c) => shapes.get(c).cx + half(c)));
    const loY = Math.min(...CODES.map((c) => shapes.get(c).cy - half(c)));
    const hiY = Math.max(...CODES.map((c) => shapes.get(c).cy + half(c)));
    const s = Math.min(FRAME.width / (hiX - loX), FRAME.height / (hiY - loY));
    const ox = (FRAME.width - (hiX - loX) * s) / 2 - loX * s;
    const oy = (FRAME.height - (hiY - loY) * s) / 2 - loY * s;
    return new Map(CODES.map((c) => [c, { cx: ox + shapes.get(c).cx * s, cy: oy + shapes.get(c).cy * s, side: Math.sqrt(shapes.get(c).area) * s }]));
  })();
  const seedOf = (map) => CODES.map((c) => ({ key: c, cx: map.get(c).cx, cy: map.get(c).cy, side: map.get(c).side }));
  const stageWord = (key) => plain(beat.stages[key].label);
  const placeRelaxed = restoreRelaxation(seedOf(trueEqual), { frame: FRAME, where: stageWord("place") });
  const areaRelaxed = restoreRelaxation(seedOf(trueArea), { frame: FRAME, where: stageWord("area") });
  const placeStage = new Map(placeRelaxed.places.map((p) => [p.key, p]));
  const areaStage = new Map(areaRelaxed.places.map((p) => [p.key, p]));
  const placesOf = (map, anchors) => {
    const sum = CODES.reduce((s, c) => s + map.get(c).side ** 2, 0);
    return CODES.map((c) => ({ key: c, cx: map.get(c).cx, cy: map.get(c).cy, side: map.get(c).side, areaShare: map.get(c).side ** 2 / sum, ax: anchors.get(c).cx, ay: anchors.get(c).cy }));
  };
  const STAGE_GEOMETRY = [
    { key: "grid", places: placesOf(gridPlace, trueEqual) },
    { key: "place", relaxed: true, places: placesOf(placeStage, new Map(placeRelaxed.places.map((p) => [p.key, { cx: p.ax, cy: p.ay }]))) },
    { key: "area", relaxed: true, places: placesOf(areaStage, new Map(areaRelaxed.places.map((p) => [p.key, { cx: p.ax, cy: p.ay }]))) },
  ];
  const slug = (key) => restoreSlugOf(key);
  const geometryOnly = {
    label: "x",
    frame: FRAME,
    tiles: CODES.map((c) => ({ key: c, label: byIso.get(c).name, nameWidth: 0, nameHeight: 0, lift: "fill" })),
    stages: STAGE_GEOMETRY.map((s) => ({ key: s.key, label: s.key, announce: s.key, relaxed: s.relaxed, places: s.places })),
  };
  const clear = new Map(restoreClearOf(geometryOnly).map((s) => [s.slug, s.clear.length]));
  const piles = new Map(restoreCrowdingOf(geometryOnly).map((s) => [s.slug, s]));
  const spread = new Map(restoreDisplacementOf(geometryOnly).map((s) => [s.slug, s]));
  const travelOf = (map, code) => Math.hypot(map.get(code).cx - gridPlace.get(code).cx, map.get(code).cy - gridPlace.get(code).cy) / CELL;
  const displacedOf = (key, code) => {
    const place = STAGE_GEOMETRY.find((s) => s.key === key).places.find((p) => p.key === code);
    return Math.hypot(place.cx - place.ax, place.cy - place.ay);
  };
  const scaleOf = (code) => areaStage.get(code).side / TILE;
  const biggestScale = CODES.reduce((a, b) => (scaleOf(a) >= scaleOf(b) ? a : b));
  const smallestScale = CODES.reduce((a, b) => (scaleOf(a) <= scaleOf(b) ? a : b));
  console.log(`${withReading.length} countries with a value · mean by AREA ${byArea.toFixed(1)} % · by COUNTRY ${byCountry.toFixed(1)} % · gap ${(byCountry - byArea).toFixed(1)} points · widest ${biggest} ${areaShareOf(biggest).toFixed(1)} % of the drawing`);
  for (const key of STAGES)
    console.log(`  ${key.padEnd(6)} overlapping pairs ${String(piles.get(slug(key)).pairs).padStart(3)} · clear ${clear.get(slug(key))}/${CODES.length} · median gap to the true centroid ${(spread.get(slug(key)).median.share * 100).toFixed(1)} % of the width · worst ${spread.get(slug(key)).worst.key} ${(spread.get(slug(key)).worst.share * 100).toFixed(1)} %`);

  // ── the classes and the words ───────────────────────────────────────────────────────────
  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.length > 6 || BREAKS.some((b, i) => typeof b !== "number" || (i && b <= BREAKS[i - 1])))
    throw new Error(`breaks must be 2 to 6 rising numbers; got ${JSON.stringify(BREAKS)}`);
  assertLegibleLabels(BREAKS, beat.format);
  const fmt = (v) => plain(beat.format(v));
  const number = (v, d) => plain(beat.number(v, d));
  const klassOf = (v) => {
    let i = 0;
    while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
    return i;
  };
  const counts = new Array(BREAKS.length + 1).fill(0);
  for (const r of ranked) counts[klassOf(r.value)] += 1;
  if (counts.some((n) => n === 0)) throw new Error(`breaks leave a class empty (counts ${counts.join("/")}): move the breaks inside the values' range`);
  const classes = Array.from({ length: BREAKS.length + 1 }, (_, index) => {
    const lower = index === 0 ? null : BREAKS[index - 1];
    const upper = index === BREAKS.length ? null : BREAKS[index];
    const label = plain(beat.classLabel({ index, lower, upper }));
    for (const [what, v] of [["lower", lower], ["upper", upper]])
      if (v !== null && !label.includes(fmt(v)) && !label.includes(number(v, (String(v).split(".")[1] ?? "").length)))
        throw new Error(`classLabel() for class ${index + 1} must print its ${what} limit ("${fmt(v)}"); it says "${label}"`);
    return { label };
  });
  const pct = (key, which) => spread.get(slug(key))[which].share * 100;
  const noteReading = (key) => ({
    byCountry,
    byArea,
    tiles: CODES.length,
    medianPct: pct(key, "median"),
    worstPct: pct(key, "worst"),
    worstName: byIso.get(spread.get(slug(key)).worst.key).name,
    gridMedianPct: pct("grid", "median"),
    biggestName: byIso.get(biggestScale).name,
    biggestScale: scaleOf(biggestScale),
    smallestName: byIso.get(smallestScale).name,
    smallestScale: scaleOf(smallestScale),
  });
  const notes = {};
  for (const key of ["place", "area"]) {
    const s = noteReading(key);
    const text = plain(beat.stages[key].note(s));
    const mean = key === "place" ? byCountry : byArea;
    if (!text.includes(number(mean, 1))) throw new Error(`stages.${key}.note must state the mean this stage leaves (${number(mean, 1)}, number(s.${key === "place" ? "byCountry" : "byArea"}, 1)); it says "${text}"`);
    if (!text.includes(number(s.medianPct, 1))) throw new Error(`stages.${key}.note must state what the stage costs: s.medianPct (${number(s.medianPct, 1)}); it says "${text}"`);
    notes[key] = text;
  }
  const STAGE_WORDS = Object.fromEntries(STAGES.map((key) => [key, { label: stageWord(key), announce: plain(beat.stages[key].announce), note: notes[key] }]));

  const tiles = CODES.map((code) => {
    const r = byIso.get(code);
    const klass = r.value === null ? null : klassOf(r.value);
    const rank = r.value === null ? 0 : ranked.findIndex((x) => x.iso === code) + 1;
    const base = { ...r, rank, of: ranked.length, tiles: CODES.length, classLabel: klass === null ? null : classes[klass].label, areaShare: areaShareOf(code) };
    const detailFor = (stage) => {
      const t = { ...base, stage, travel: stage === "place" ? travelOf(placeStage, code) : stage === "area" ? travelOf(areaStage, code) : 0, displaced: stage === "grid" ? 0 : displacedOf(stage, code), scale: scaleOf(code) };
      return plain(r.value === null ? beat.missingDetail?.(t) ?? `${r.name} · ${plain(beat.missingLabel)}` : beat.detail(t));
    };
    const detail = Object.fromEntries(STAGES.map((s) => [slug(s), detailFor(s)]));
    for (const [s, text] of Object.entries(detail)) if (!text.includes(r.name)) throw new Error(`detail() must name the country it answers for: ${r.name} (${s}) → "${text}"`);
    return { code, name: r.name, klass, label: r.name, value: r.value === null ? "—" : plain(beat.figure(r.value)), detail };
  });
  for (const s of STAGES) {
    const texts = tiles.map((t) => t.detail[slug(s)]);
    const dupe = texts.find((t, i) => texts.indexOf(t) !== i);
    if (dupe) throw new Error(`detail() answers two countries with the same sentence at stage ${s}: "${dupe}"`);
  }
  const missing = tiles.filter((t) => t.klass === null).length;
  if (missing && typeof beat.missingDetail !== "function") throw new Error(`${tiles.filter((t) => t.klass === null).map((t) => t.code).join(", ")} carry no value: give missingDetail(t), the sentence a pointer on that tile answers`);
  const callout = plain(beat.callout({ biggest: { name: byIso.get(biggest).name, value: byIso.get(biggest).value, areaShare: areaShareOf(biggest) }, missing, byCountry, byArea }));
  const caveat = plain([beat.limits].flat()[0]);
  const reading = plain([beat.reading].flat()[0]);
  const source = plain(beat.source);
  const eyebrow = plain(beat.eyebrow);
  const missingLabel = plain(beat.missingLabel);
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ tiles: tiles.length, byCountry, byArea, biggest: byIso.get(biggest).name }) : beat.alt);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${classes.map((c) => c.label).join(" ")} ${missingLabel} ${plain(beat.stageLabel)} ${Object.values(STAGE_WORDS).map((s) => s.label).join(" ")} ${tiles.map((t) => `${t.label} ${t.value}`).join(" ")}`,
    annot: `${callout} ${Object.values(STAGE_WORDS).map((s) => `${s.announce} ${s.note ?? ""}`).join(" ")} ${tiles.map((t) => Object.values(t.detail).join(" ")).join(" ")} ${alt}`,
    value: tiles.map((t) => t.value).join(" "),
  };

  // Metadata for the format's interaction plan (English is fine; it is not printed).
  const interaction = {
    earns: `The reader gives the map back its PLACE, then its AREA, and sees that the place does not move the mean while the area turns ${byCountry.toFixed(1)} into ${byArea.toFixed(1)} — a still must pick one weighting and print the other in a caption.`,
    controls: [
      {
        question: "Where are these countries really, and what does it change to the figure?",
        gesture: "toggle-a-comparison",
        changes: "Every square slides near its true centroid, then takes its country's true area; names travel with their square and fade where the square cannot hold them; the line of average rewrites and a sentence names what the stage gives back.",
        parameter: "what the map gives back: the place, the area, or neither",
        authorPicked: "grid",
        readerPicks: [...STAGES],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What did this square give up?",
        gesture: "ask-a-mark",
        changes: "The pointed-at square darkens from its own fill (a hollow one on its outline) and answers with its reading and what the chosen stage just gave it back.",
        parameter: "which tile is in question",
        authorPicked: byIso.get(biggest).name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const { label, direction } = pickDirection(HERE, plainRegisters(textPerRegister), beat.evidenceLevels ?? 3);
  // Whether a cell can hold its own name is a fact about the direction's typeface: measured here.
  const regs = webRegisters(direction, { ink: { ink: "#000000", muted: "#767676", accent: direction.accent } });
  const primary = (stack) => String(stack).split(",")[0].replace(/^["']|["']$/g, "").trim();
  const widthOf = (text, style) => measureText(text, { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: primary(style.fontFamily) });
  const restore = {
    label: plain(beat.stageLabel),
    frame: FRAME,
    tiles: tiles.map((tile) => ({
      key: tile.code,
      label: tile.name,
      nameWidth: Math.max(widthOf(tile.label, { fontSize: 12, fontWeight: 600, fontFamily: regs.axis.fontFamily }), widthOf(tile.value, { fontSize: 13, fontWeight: 700, fontFamily: regs.value.fontFamily })),
      nameHeight: NAME_BLOCK_H,
      lift: tile.klass === null ? "stroke" : "fill",
    })),
    stages: STAGE_GEOMETRY.map((stage) => ({ key: stage.key, label: STAGE_WORDS[stage.key].label, announce: STAGE_WORDS[stage.key].announce, note: STAGE_WORDS[stage.key].note, relaxed: stage.relaxed, places: stage.places })),
  };
  assertRestoreDeclaration(restore, label);
  const named = new Map(restoreNamesOf(restore).map((s) => [s.slug, s.named.length]));
  const totals = {};
  for (const key of STAGES) {
    const mean = key === "area" ? byArea : byCountry;
    const text = plain(beat.total({ stage: key, mean, by: key === "area" ? "area" : "country", tiles: CODES.length, named: named.get(slug(key)) }));
    if (!text.includes(number(mean, 1))) throw new Error(`total() for stage ${key} must print the mean it draws, number(t.mean, 1) = ${number(mean, 1)}; it says "${text}"`);
    totals[slug(key)] = text;
  }
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const { outPath } = await renderWeb({
    lang,
    component: DirectedCartogramWeb,
    props: { restore, tiles, classes, missingLabel, frame: FRAME, totals, title, eyebrow, caveat, source, reading, claimNote: callout, alt, interaction, direction, ground: direction.ground, accent: direction.accent },
    outDir: join(HERE, "renders"),
    name: `${label}.html`,
  });
  assertOneRestore(readFileSync(outPath, "utf8"), restore, label);
  console.log(`rendered renders/${label}.html · names drawn ${[...named].map(([s, n]) => `${s} ${n}`).join(" · ")}`);

  const { shots, desktop } = verifyPage({
    here: HERE,
    file: outPath,
    live: false,
    waivers: [
      // Inherited from the worked example: its own page fails these the same way.
      { test: /^\s*FAIL phone 375x812: (no vertical scroll inside the visual|the source line is on screen)\b/, why: "inherited from the worked example: on a phone the plate keeps its height and the page scrolls" },
      { test: /^\s*FAIL phone: chart-restore: (choosing "[^"]+" does not move the drawing|everything this beat holds still, holds)\b/, why: "inherited from the worked example: at 375 px the stage note re-wraps and moves the plate by a few pixels, which verify-web reads as the drawing not moving and the source moving" },
      { test: /^\s*FAIL laptop-wide( \(no JS\))?: chart-restore: choosing "[^"]+" again restores the landing picture\b/, why: "inherited from the worked example (132 px there too): a few hundred anti-aliased pixels differ after travelling away and back" },
    ],
  });
  lookAt({ here: HERE, label, shots, desktop });
});
