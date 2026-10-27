// The Cell-grid family's runners, one per format, shared by every kit of the family (craft/<format>/<slug>.gestures/
// render-beat.mjs calls one with its variant). Runs in Bun only. Guard order, as the bar kits: importBeat →
// applyStoryboard → REQUIRED → the values → check() and the shared guards → the gesture core (validateGestures with
// the family's hooks, claim read from STORYBOARD.md) → the format's scheduler → render → verify → `look at:`. A gesture
// refusal prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix
// is applied instead ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here
// refuses the data's SHAPE: a cell the data does not give is drawn as missing, never as a zero, never refused.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { classOf, factsFor, gridOf, marksOf, stageCells } from "./gesture-family-cell.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertNumbers, errorText, importBeat, rowFacts, runCheck } from "./guards.mjs";

export const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

/** STORYBOARD.md's front matter, read field by field. */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/** A refusal's words, with the value that works (as the bar kits print it). */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

const FIELDS = {
  "heatmap-matrix": ["eyebrow", "heads", "rows", "breaks", "gestures", "unit", "format", "title", "limits", "source", "alt", "check"],
  "calendar-heatmap": ["eyebrow", "days", "months", "monthsShort", "gestures", "unit", "format", "title", "limits", "source", "alt", "check"],
};

/**
 * The beat read and held to its own claim, its grid built, before anything is staged: the fields, the values, the
 * shape refusals that are beat-writing errors (not data shapes), check().
 */
export async function readCellBeat(here, variant, { extra = [] } = {}) {
  const beat = await importBeat(here);
  /** What the grid leaves out, said on it (a year narrowed to, rows the frame has no room for). */
  const scope = [];
  applyStoryboard(beat, here);
  const missing = [...FIELDS[variant], ...extra].filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks | value, … } (see CONTRACT.md)");
  if (!Array.isArray(beat.breaks ?? []) || (beat.breaks ?? []).some((b, i, all) => !Number.isFinite(b) || (i && b <= all[i - 1])))
    throw new Error(`breaks are the class edges, numbers strictly rising (e.g. [2, 5, 10, 20, 40]); got ${JSON.stringify(beat.breaks)}`);
  if (variant === "heatmap-matrix") {
    if (!Array.isArray(beat.heads) || beat.heads.length < 2) throw new Error(`heads holds ${beat.heads?.length ?? 0} column(s); a matrix crosses at least two`);
    for (const h of beat.heads) if (!h || typeof h.label !== "string" || !h.label.trim()) throw new Error(`every head is { key, label, short?, family? }; got ${JSON.stringify(h).slice(0, 100)}`);
    if (new Set(beat.heads.map((h) => h.label)).size !== beat.heads.length) throw new Error("two heads share a label; every column needs its own words");
    if (!Array.isArray(beat.rows) || beat.rows.length < 2) throw new Error(`rows holds ${beat.rows?.length ?? 0} row(s); a matrix crosses at least two`);
    for (const r of beat.rows) {
      if (!r || typeof r.label !== "string" || !Array.isArray(r.cells)) throw new Error(`every row is { key?, label, value?, cells: [one number per head] }; got ${JSON.stringify(r).slice(0, 100)}`);
      if (r.cells.length !== beat.heads.length) throw new Error(`row ${r.label} has ${r.cells.length} cells for ${beat.heads.length} heads: give one cell per head, in the heads' order (a cell the data does not give is null)`);
    }
    if (new Set(beat.rows.map((r) => r.label)).size !== beat.rows.length) throw new Error("two rows share a label; one row per category");
    assertNumbers(beat.rows.flatMap((r) => r.cells.filter((v) => v !== null).map((v, j) => [`${r.label} / ${beat.heads[j]?.label}`, v])));
  } else {
    if (!Array.isArray(beat.days) || !beat.days.length) throw new Error(`days must be [{ date: "YYYY-MM-DD", value }], one per day of one year`);
    for (const [field, list] of [["months", beat.months], ["monthsShort", beat.monthsShort]]) {
      if (!Array.isArray(list) || list.length !== 12) throw new Error(`${field} must hold the twelve month names in the story's language`);
      if (new Set(list).size !== 12) throw new Error(`${field} names two months alike (${list.join(", ")}): write each abbreviation out so no two rows share a name`);
    }
    // SEVERAL YEARS ARE NARROWED, NEVER REFUSED: the year the takeaway names, else the latest year with the most days.
    const years = [...new Set(beat.days.map((d) => String(d.date).slice(0, 4)))].sort();
    if (years.length > 1) {
      const named = years.filter((y) => new RegExp(`(?<!\\d)${y}(?!\\d)`).test(frontOf(here)("takeaway") ?? [beat.title].flat()[0] ?? ""));
      const count = (y) => beat.days.filter((d) => String(d.date).startsWith(y)).length;
      const year = named.at(-1) ?? [...years].reverse().reduce((a, b) => (count(b) > count(a) ? b : a));
      beat.days = beat.days.filter((d) => String(d.date).startsWith(year));
      scope.push(typeof beat.scope === "function" ? beat.scope(year, years) : `${year} (${years[0]}–${years.at(-1)})`);
    }
    const seen = new Set();
    for (const d of beat.days) {
      if (seen.has(d.date)) throw new Error(`two readings for ${d.date}: one value per day — filter data.json to one station or series`);
      seen.add(d.date);
    }
    // A day the data does not give is drawn as missing (a pale cell), never refused and never a zero.
    assertNumbers(beat.days.filter((d) => d.value !== null && d.value !== undefined).map((d) => [d.date, d.value]), "days' values");
  }
  runCheck(beat);
  const grid = gridOf(variant, beat);
  if (grid.breaks.length < 1) throw new Error("breaks hold no class edge: give at least one");
  const lo = Math.min(...grid.cells.map((c) => c.value));
  const hi = Math.max(...grid.cells.map((c) => c.value));
  if (grid.breaks.at(-1) <= lo || grid.breaks[0] > hi)
    throw new Error(`every cell falls in one class (cells run ${lo} to ${hi}, breaks ${grid.breaks.join(", ")}): put the breaks inside the cells' range`);
  if (new Set(grid.breaks).size !== grid.breaks.length) throw new Error(`two classes share a break (${grid.breaks.join(", ")}): set breakDecimals to 1 (or more) in beat.mjs`);
  return { beat, grid, scope };
}

/** The rows a frame holds at most; past it the rows the gestures name and the first others are drawn, the rest stated. */
export const CAPACITY = { static: 12, web: 16, scrolly: 12, video: 12 };

/**
 * NEVER REFUSE A HEATMAP FOR ITS ROW COUNT: keep every row a gesture names (by row, cell, column-free), then the first
 * others in the beat's order up to the format's capacity; the grid is rebuilt on them and the rest is stated.
 */
export async function fitRows(beat, grid, format, scope) {
  if (grid.variant !== "heatmap-matrix" || beat.rows.length <= CAPACITY[format]) return grid;
  const { cellsNamed } = await import("./gesture-family-cell.mjs");
  const named = new Set();
  for (const g of beat.gestures ?? []) {
    if (!g || typeof g !== "object") continue;
    const cells = cellsNamed(grid, [g.mark, g.marks, g.along, g.of].flat().filter((x) => typeof x === "string"));
    // A whole column names every row; it keeps none in particular.
    const rows = new Set(cells.map((c) => c.r));
    if (rows.size < grid.rows.length) rows.forEach((r) => named.add(r));
  }
  const keep = new Set([...named].slice(0, CAPACITY[format]));
  for (let r = 0; r < beat.rows.length && keep.size < CAPACITY[format]; r++) keep.add(r);
  const all = beat.rows.length;
  beat.rows = beat.rows.filter((_, r) => keep.has(r));
  scope.push(typeof beat.scope === "function" ? beat.scope(beat.rows.length, all) : `${beat.rows.length} / ${all}`);
  return gridOf("heatmap-matrix", beat);
}

/** The claim the journalist confirmed, as the core reads it, with the family's facts. */
export function claimOf(here, beat, grid) {
  const front = frontOf(here);
  return {
    takeaway: front("takeaway") ?? [beat.title].flat()[0],
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: factsFor(grid, rowFacts(here)),
    unit: beat.unit,
  };
}

/**
 * Stages the beat's list for one format: the core and the family's plan, then the format's own step (`then`, which may
 * refuse too). With REPAIR each refusal's fix is applied to the model's own list; without, the refusal is thrown as an
 * Error carrying its value that works.
 */
export function stageWithRepair({ beat, grid, claim, format, then = (x) => x, log = console.log }) {
  let gestures = beat.gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const staged = stageCells({ validateGestures, gestures, grid, format, claim });
      return { ...staged, ...then(staged), repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      if (!REPAIR || step >= 12) throw new Error(refusalText(error));
      log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      repairs.push({ field: error.field, fix: error.fix });
      gestures = applyFix(gestures, error.fix);
    }
  }
}

/** Every figure the title may state that the plate draws: cells, row measures, counts, runs, cutoffs. */
export function drawnFigures(grid, plan) {
  return [
    ...grid.cells.map((c) => c.value),
    ...grid.rows.map((r) => r.value).filter(Number.isFinite),
    grid.rows.length,
    ...plan.filter((p) => p.do === "trace").map((p) => p.run.length),
    ...plan.filter((p) => p.do === "reference" || p.do === "trace").map((p) => p.value),
  ];
}

/** The treatments' facts for a variant (the per-type kits' own). */
export async function treatmentsOf(grid, beat) {
  const { beatFacts, applicableTreatments } = await import("#shared/chart-beat/treatments.mjs");
  if (grid.variant === "heatmap-matrix")
    return applicableTreatments(
      beatFacts(
        grid.rows.map((r) => ({ key: r.key, label: r.label, value: r.value ?? 0 })),
        {
          subject: grid.rows[0].key,
          cells: grid.cells.map((c) => ({ key: `${c.r}-${c.c}`, value: c.value })),
          impossibleCells: 0,
          scaleClasses: grid.breaks.length + 1,
          groups: beat.heads.map((h) => h.family ?? h.label),
          declaredSequence: beat.declaredSequence ?? "row value",
        },
      ),
    ).map((t) => t.id);
  const year = grid.year;
  const impossibleCells = Array.from({ length: 12 }, (_, m) => 31 - new Date(year, m + 1, 0).getDate()).reduce((a, b) => a + b, 0);
  const means = grid.rows.map((r, m) => {
    const of = grid.cells.filter((c) => c.r === m);
    return { key: r.label, label: r.label, value: of.length ? of.reduce((s, c) => s + c.value, 0) / of.length : 0 };
  });
  return applicableTreatments(beatFacts(means, { subject: means.reduce((a, b) => (b.value > a.value ? b : a)).key, cells: grid.cells.map((c) => ({ key: c.date, value: c.value })), impossibleCells, declaredSequence: "calendar" })).map((t) => t.id);
}

/** Families of the heatmap's heads: contiguous blocks, each named once over its columns. */
export function familiesOf(beat) {
  const families = [];
  for (const [i, h] of beat.heads.entries()) {
    const name = h.family ?? "";
    const last = families.at(-1);
    if (last && last.name === name) last.to = i;
    else {
      if (families.some((f) => f.name === name))
        throw new Error(`the family "${name}" appears in two separate blocks of heads: order heads so each family's columns sit side by side`);
      families.push({ name, short: beat.familyShort?.[name], from: i, to: i });
    }
  }
  return families.filter((f) => f.name);
}

// ── static ────────────────────────────────────────────────────────────────────────────────────────

export async function runStatic(here, variant) {
  const { rm } = await import("node:fs/promises");
  const { basename } = await import("node:path");
  const { createElement } = await import("react");
  const { renderStill } = await import("#shared/chart-beat/render-still.mjs");
  const { readPalette } = await import("#shared/chart-beat/colour.mjs");
  const { composeDirections, filedDirections, report: composeReport, resolveDirectionFamilies } = await import("#shared/design-base/index.mjs");
  const { directionReachable, readRunDirection } = await import("#shared/design-base/run-direction.mjs");
  const { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } = await import("#shared/chart-beat/directed-size.mjs");
  const { composeCellStatic } = await import("./gesture-cell-static.mjs");
  const { GestureCellStatic } = await import("./GestureCellStatic.tsx");

  let beat, grid, staged;
  try {
    let scope;
    ({ beat, grid, scope } = await readCellBeat(here, variant));
    grid = await fitRows(beat, grid, "static", scope);
    const claim = claimOf(here, beat, grid);
    staged = stageWithRepair({ beat, grid, claim, format: "static", then: ({ plan, orders }) => ({ plate: composeCellStatic({ plan, orders, grid, format: beat.format }) }) });
    assertHeadlineNumbersDrawn([beat.title].flat()[0], drawnFigures(grid, staged.plan), "cells");
    for (const line of scope) staged.plate.notes.push({ index: -1, do: "scope", text: String(line), accent: false });
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const OUT = join(here, "renders");
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  assertBeatMayEnter(here, SIZE, { what: basename(here) });
  const treatments = await treatmentsOf(grid, beat);
  const title = [beat.title].flat();
  const limits = [beat.limits].flat();
  const reading = [beat.reading ?? ""].flat().filter((t) => String(t).trim());
  const plate = { ...staged.plate, plan: staged.plan };
  const breaks = grid.breaks;
  const textPerRegister = {
    display: title.join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: `${grid.rows.map((r) => r.label).join(" ")} ${variant === "heatmap-matrix" ? beat.heads.map((h) => h.label).join(" ") : `${beat.monthsShort.join(" ")} 1 5 10 15 20 25 31`} ${breaks.map(beat.format).join(" ")} ${beat.unit} ${beat.valueHead ?? ""} ${beat.keyLabel ?? ""} ${beat.missingLabel ?? ""}`,
    annot: `${reading.join(" ")} ${plate.notes.map((n) => n.text).join(" ")}`,
    value: variant === "heatmap-matrix" ? grid.rows.map((r) => (Number.isFinite(r.value) ? beat.format(r.value) : "")).join(" ") || "0" : "",
  };
  console.log(`  ${grid.cells.length} cells · gestures: ${staged.valid.map((g) => g.do).join(", ")} · notes: ${plate.notes.length}`);

  const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let chosen;
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    chosen = { label: labelOf(run.id), direction: run };
  } else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? breaks.length + 1 }, textPerRegister });
    if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
    chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
  }
  const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
  const id = chosen.label;
  const common = { variant, frame: { width: FRAME.width, height: FRAME.height }, plate, cells: grid.cells, breaks, unit: beat.unit, title, limits, reading: reading.length ? reading : [""], source: beat.source, alt: typeof beat.alt === "function" ? beat.alt(grid) : beat.alt, eyebrow: beat.eyebrow, format: beat.format, direction, treatments, onLadder: (note) => console.log(`  ${note}`) };
  const props =
    variant === "heatmap-matrix"
      ? { ...common, rows: beat.rows.map((r) => ({ key: String(r.key ?? r.label), label: r.label, lowCarbon: r.value, shares: r.cells.map((v) => (v === null || v === undefined ? NaN : v)) })), sources: beat.heads.map((h) => ({ key: String(h.key ?? h.label), label: h.label, short: h.short, family: h.family ?? "" })), families: familiesOf(beat), shareHead: beat.valueHead ?? "" }
      : { ...common, days: grid.cells.map((c) => ({ date: c.date, month: c.r, day: c.c + 1, value: c.value })), months: beat.months, monthsShort: beat.monthsShort, year: grid.year, keyLabel: beat.keyLabel, missingLabel: beat.missingLabel };
  try {
    await renderStill({ element: createElement(GestureCellStatic, props), width: FRAME.width, height: FRAME.height, outDir: OUT, name: nameAtSize(id, SIZE), scale: FRAME.scale });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
    console.log(`look at: ${join(OUT, `${nameAtSize(id, SIZE)}.png`)}`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
}

export { classOf, marksOf };

// ── web ───────────────────────────────────────────────────────────────────────────────────────────

/** Each cell's own answer: its row and column (or its date), its exact value, its rank in its column (or its year). */
function detailsOf(grid, format, unit) {
  const u = unit ? ` ${unit}` : "";
  return grid.cells.map((c) => {
    const peers = grid.variant === "heatmap-matrix" ? grid.cells.filter((o) => o.c === c.c) : grid.cells;
    const rank = 1 + peers.filter((o) => o.value > c.value).length;
    const where = grid.variant === "heatmap-matrix" ? `${grid.rows[c.r].label} · ${grid.cols[c.c].label}` : `${c.day} ${grid.rows[c.r].label} ${grid.year}`;
    return `${where} · ${format(c.value)}${u} · ${rank} / ${peers.length}`;
  });
}

export async function runWeb(here, variant) {
  const { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } = await import("./web.mjs");
  const { scheduleCellWeb, cellInteractionPlan } = await import("./gesture-cell-web.mjs");
  const { GestureCellWeb } = await import("./GestureCellWeb.tsx");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  await refusing(here, async () => {
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { beat, grid: full, scope } = await readCellBeat(here, variant, { extra: ["restLabel"] });
    const grid = await fitRows(beat, full, "web", scope);
    if (!String(beat.restLabel).trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. "The grid alone"');
    const format = (v) => plain(beat.format(v));
    const claim = claimOf(here, beat, grid);
    const staged = stageWithRepair({ beat, grid, claim, format: "web", then: ({ plan, orders }) => ({ scheduled: scheduleCellWeb({ plan, orders, grid, format }) }) });
    const title = plain([beat.title].flat()[0]);
    assertHeadlineNumbersDrawn(title, drawnFigures(grid, staged.plan), "cells");
    const { scheduled } = staged;
    const details = detailsOf(grid, format, plain(beat.unit));
    if (new Set(details).size !== details.length) throw new Error("two cells answer with the same words: give every row and column its own label");
    const cells = grid.cells.map((c, i) => ({ id: c.id, r: c.r, c: c.c, value: c.value, bin: classOf(grid.breaks, c.value), detail: plain(details[i]) }));
    const unit = plain(beat.unit);
    const fb = (v) => plain(beat.format(v));
    const b = grid.breaks;
    const bins = [{ label: `< ${fb(b[0])}` }, ...b.slice(0, -1).map((x, i) => ({ label: `${fb(x)}–${fb(b[i + 1])}` })), { label: `≥ ${fb(b.at(-1))}` }];
    const restLabel = plain(beat.restLabel);
    const controls = scheduled.controls.map((c) => {
      const chip = plain(c.chip);
      const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
      return { ...c, legend: plain(c.legend), chip, note, announce: `${chip} — ${note}` };
    });
    const restNotes = [...scheduled.resting.notes, ...scope.map((text) => ({ text: String(text), accent: false }))].map((n) => ({ text: plain(n.text), accent: n.accent }));
    const interaction = cellInteractionPlan({ scheduled, grid });
    const rowLabels = grid.rows.map((r) => plain(r.label));
    const colLabels = grid.cols.map((c) => plain(c.label));
    const colTicks = variant === "calendar-heatmap" ? [0, 4, 9, 14, 19, 24, 30] : colLabels.map((_, i) => i);
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain([beat.limits].flat()[0]);
    const reading = plain([beat.reading ?? ""].flat()[0] ?? "");
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(grid) : beat.alt);
    const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.map((n) => n.text).join(" ")} ${restLabel} ${controlText} ${reading} ${source} ${cells.map((c) => c.detail).join(" ")}`,
      axis: `${unit} ${rowLabels.join(" ")} ${colLabels.join(" ")} ${bins.map((x) => x.label).join(" ")}`,
      annot: restNotes.map((n) => n.text).join(" ") || title,
      value: "0123456789",
    };
    console.log(`  ${cells.length} cells · resting: ${staged.valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const { measureText } = await import(chartWeb(here, "scripts", "render-still.mjs"));
        const { labelBoxPx } = await import(chartWeb(here, "assets", "keyed-note.ts"));
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const nameBox = Math.ceil(labelBoxPx("Hg", regs.axis, measureText, { chip: false }).h);
        const pitch = variant === "calendar-heatmap" ? 22 : 28;
        const rowFloor = { rows: rowLabels.length, pitch, px: nameBox, why: `Each of the ${rowLabels.length} rows carries its name in the gutter; under that pitch a name prints over its neighbour's.` };
        return renderWeb({
          rowFloor,
          lang,
          component: GestureCellWeb,
          props: { variant, cells, rowLabels, colLabels, colShort: grid.cols.map((c) => plain(c.short ?? c.label)), colTicks, bins, resting: scheduled.resting, controls, restLabel, restNotes, title, eyebrow, caveat, reading, source, unit, alt, interaction, direction, ground: direction.ground, accent: direction.accent, ink, muted },
          outDir,
          name: `${label}.html`,
        });
      },
    });
  });
}

// ── scrolly ───────────────────────────────────────────────────────────────────────────────────────

export async function runScrolly(here, variant) {
  const { createElement } = await import("react");
  const { plain, refusing, storyLanguage } = await import("./web.mjs");
  const { renderBeatScrolly, scrollySkill } = await import("./scrolly.mjs");
  const { APPLY, checkCellCards, driveSource, scheduleCellScrolly } = await import("./gesture-cell-scrolly.mjs");
  const { implicitOutline, noteLine } = await import("./gesture-family-cell.mjs");
  const { GestureCellScrolly } = await import("./GestureCellScrolly.tsx");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
  await refusing(here, async () => {
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const { beat, grid: full, scope } = await readCellBeat(here, variant);
    const grid = await fitRows(beat, full, "scrolly", scope);
    const format = (v) => plain(beat.format(v));
    const claim = claimOf(here, beat, grid);
    const staged = stageWithRepair({
      beat,
      grid,
      claim,
      format: "scrolly",
      then: ({ valid, plan, orders }) => ({ scheduled: scheduleCellScrolly({ plan, orders, grid }), cards: checkCellCards({ valid, plan, grid, format, claim }) }),
    });
    const titleForms = [beat.title].flat().map(plain);
    assertHeadlineNumbersDrawn(titleForms[0], drawnFigures(grid, staged.plan), "cells");
    const { plan, scheduled, cards } = staged;
    const kinds = { highlight: "accent", name: "ring", trace: "run", reference: "cutoff", compare: "compare" };
    const marks = plan.filter((p) => kinds[p.do]).map((p) => ({ k: p.index, kind: kinds[p.do], cells: p.cells, ...(p.do === "compare" ? { a: p.a, b: p.b } : {}) }));
    const implicit = implicitOutline(plan);
    if (implicit) marks.unshift({ k: implicit.index, kind: "accent", cells: implicit.cells });
    const filters = plan.filter((p) => p.do === "filter").map((p) => ({ k: p.index, kept: p.cells }));
    const notes = plan.map((p) => plain(noteLine(p, format) ?? ""));
    const closing = scheduled.closing;
    const closingOrder = grid.rows.map((_, r) => r).sort((a, b) => closing[`slot${a}`] - closing[`slot${b}`]);
    const fb = (v) => plain(beat.format(v));
    const b = grid.breaks;
    const bins = [{ label: `< ${fb(b[0])}` }, ...b.slice(0, -1).map((x, i) => ({ label: `${fb(x)}–${fb(b[i + 1])}` })), { label: `≥ ${fb(b.at(-1))}` }];
    const cells = grid.cells.map((c) => ({ id: c.id, r: c.r, c: c.c, value: c.value, bin: classOf(grid.breaks, c.value) }));
    const rowLabels = grid.rows.map((r) => plain(r.label));
    const colLabels = grid.cols.map((c) => plain(c.short ?? c.label));
    const colTicks = variant === "calendar-heatmap" ? [0, 4, 9, 14, 19, 24, 30] : colLabels.map((_, i) => i);
    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0]), ...scope.map((t) => plain(String(t)))]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const unit = plain(beat.unit);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(grid) : beat.alt);
    const textPerRegister = {
      display: titleForms.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${unit} ${rowLabels.join(" ")} ${colLabels.join(" ")} ${bins.map((x) => x.label).join(" ")}`,
      annot: rowLabels.join(" "),
      value: notes.join(" ") || "0123456789",
    };
    console.log(`  ${cells.length} cells · cards: ${steps.join(" · ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatScrolly({
      here,
      states: scheduled.states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        return renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GestureCellScrolly, { variant, cells, rowLabels, colLabels, colTicks, bins, marks, filters, closingOrder, notes, unit, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
            states: scheduled.states,
            driver: driveSource(),
            apply: APPLY,
          },
          title: titleForms,
          eyebrow,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang,
          outDir,
          name: `${label}.html`,
        });
      },
    });
  });
}

// ── video ─────────────────────────────────────────────────────────────────────────────────────────

export async function runVideo(here, variant) {
  const { videoExportSize } = await import("#shared/chart-video/sizes.mjs");
  const { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } = await import("./video.mjs");
  const { noteLine } = await import("./gesture-family-cell.mjs");
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const { beat, grid: full, scope } = await readCellBeat(here, variant);
    const grid = await fitRows(beat, full, "video", scope);
    const format = (v) => plain(beat.format(v));
    const b = grid.breaks;
    const copy = {
      eyebrow: plain(beat.eyebrow),
      title: plain([beat.title].flat()[0]),
      // What the frame leaves out is stated with the credit.
      source: [beat.source].flat().map((t) => plain([...scope, t].join(" · "))),
      unit: plain(beat.unit),
      format,
      cols: grid.cols.map((c) => plain(c.label)),
      shortCols: grid.cols.map((c) => plain(c.short ?? c.label)),
      bins: b.map(format),
    };
    if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
    const claim = claimOf(here, beat, grid);
    const { buildCellVideo, textPerRegisterOf } = await import("./gesture-cell-video-build.mjs");
    const { CELL_VIDEO_TIMING } = await import(join(here, "timing-contract.ts"));
    const notes = beat.gestures.filter((g) => g && typeof g === "object" && g.note).map((g) => String(g.note));
    const { label, chosen } = pickDirection(here, textPerRegisterOf(copy, grid, notes), beat.evidenceLevels ?? 2);
    const staged = stageWithRepair({ beat, grid, claim, format: "video", then: ({ plan, orders }) => ({ built: buildCellVideo({ id: label, chosen, grid, plan, orders, copy, size: SIZE, timing: CELL_VIDEO_TIMING }) }) });
    assertHeadlineNumbersDrawn(copy.title, drawnFigures(grid, staged.plan), "cells");
    const { props, report, direction } = staged.built;
    console.log(`direction ${label}`);
    console.log(`  ${report.cells} cells · cell ${report.cellW}×${report.cellH}px · heads ${report.stagger ? "staggered" : "on one line"} · title on ${report.titleLines} line(s)`);
    console.log(`  gestures: ${staged.plan.map((p, k) => `${["reveal", "subject", "conclusion"][k]} ${p.do}${p.label ? ` ${p.label}` : ""}`).join(" · ")}`);
    void direction;
    void noteLine;
    const { GestureCellFrame } = await import("./GestureCellFrame.tsx");
    try {
      assertEventFramesReadable(GestureCellFrame, props, SIZE, label);
    } catch (error) {
      throw new Error(`${error.message} — shorten the words that frame draws (row names, notes, the title, source forms)`);
    }
    const T = props.timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const lookFrames = [
      { name: "end-establish", frame: end("establish") },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${staged.plan[0].do}`, frame: mid("reveal") },
      { name: "end-subject", frame: end("subject") },
      { name: "final", frame: T.total - 1 },
    ];
    const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
    const { wantedOf } = await import(skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
    await renderBeatVideo({
      Frame: GestureCellFrame,
      here,
      label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
      composition: `zone-video-${variant}-gestures-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames,
      lookOnly: process.argv.includes("--look-only"),
    });
  });
}
