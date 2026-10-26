// The generic half of a heatmap (matrix) WEB beat, taken from
// proof/web-heatmap-europe-electricity/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a floor control
// (the `filter` vocabulary, threshold-as-named-bands) lets the reader raise the floor under the grid
// and watch which cells survive, with a sentence per band saying how many cells remain and how much
// of each row the survivors still account for (CSS only, works without JS); every cell answers
// hover/tap/Tab with its exact value and its rank among the rows for its column. This file computes
// the classes, the bands, the survivors and the ranks; ./beat.mjs — the one file the model writes —
// gives the grid and the WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedHeatmapWeb } from "./DirectedHeatmapWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** True when `text` states the whole number `n` on its own — not as a digit inside 25, 16 or 9,8. */
const statesNumber = (text, n) => new RegExp(`(?<![\\d.,])${n}(?![\\d.,]*\\d)`).test(text);

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { slugOf } = await import(chartWeb(HERE, "assets", "filter.ts"));

  const REQUIRED = ["eyebrow", "heads", "rows", "breaks", "unit", "format", "formatBreak", "detail", "bands", "filterLabel", "allLabel", "bandLabel", "bandNote", "annotation", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "formatBreak", "detail", "bandLabel", "bandNote", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the grid ─────────────────────────────────────────────────────────────────────────────────
  const heads = beat.heads;
  if (!Array.isArray(heads) || heads.length < 2) throw new Error(`heads holds ${heads?.length ?? 0} column(s); a matrix crosses at least two`);
  if (heads.length > 12) throw new Error(`heads holds ${heads.length} columns; the page draws at most 12 — keep the columns the takeaway is about`);
  for (const h of heads) if (!h || typeof h.label !== "string" || !h.label.trim()) throw new Error(`every head is { label } (the words printed under its column); got ${JSON.stringify(h).slice(0, 100)}`);
  if (new Set(heads.map((h) => h.label)).size !== heads.length) throw new Error(`two heads share a label; every column needs its own words`);
  const input = beat.rows;
  if (!Array.isArray(input) || input.length < 2) throw new Error(`rows holds ${input?.length ?? 0} row(s); a matrix crosses at least two`);
  if (input.length > 16) throw new Error(`rows holds ${input.length} rows; the page draws at most 16 — select the rows by a rule you state in the standfirst`);
  for (const r of input) {
    if (!r || typeof r.label !== "string" || !Array.isArray(r.cells)) throw new Error(`every row is { label, cells: [one number per head] }; got ${JSON.stringify(r).slice(0, 100)}`);
    if (r.cells.length !== heads.length) throw new Error(`row ${r.label} has ${r.cells.length} cells for ${heads.length} heads: give one cell per head, in the heads' order`);
  }
  if (new Set(input.map((r) => r.label)).size !== input.length) throw new Error(`two rows share a label; one row per category`);
  const values = input.flatMap((r) => r.cells);
  assertNumbers(input.flatMap((r) => r.cells.map((v, j) => [`${r.label} / ${heads[j].label}`, v])));

  // ── the classes: the colour ramp's edges ────────────────────────────────────────────────────
  const breaks = beat.breaks;
  if (!Array.isArray(breaks) || breaks.length < 2 || breaks.some((b, i) => typeof b !== "number" || (i > 0 && b <= breaks[i - 1])))
    throw new Error(`breaks are the class edges, numbers strictly rising (e.g. [1, 5, 15, 30, 50]); got ${JSON.stringify(breaks)}`);
  if (breaks.length > 7) throw new Error(`breaks holds ${breaks.length} edges (${breaks.length + 1} classes): a single-hue ramp tells at most 8 classes apart — use fewer breaks`);
  const binOf = (v) => {
    let i = 0;
    while (i < breaks.length && v >= breaks[i]) i += 1;
    return i;
  };
  if (new Set(values.map(binOf)).size < 2)
    throw new Error(`every cell falls in one class (cells run ${Math.min(...values)} to ${Math.max(...values)}, breaks ${breaks.join(", ")}): put the breaks inside the cells' range`);
  const unit = plain(beat.unit);
  const suffix = unit ? ` ${unit}` : "";
  const fb = (v) => plain(beat.formatBreak(v));
  const bins = [
    { label: `< ${fb(breaks[0])}${suffix}` },
    ...breaks.slice(0, -1).map((b, i) => ({ label: `${fb(b)}–${fb(breaks[i + 1])}` })),
    { label: `≥ ${fb(breaks[breaks.length - 1])}${suffix}` },
  ];
  // A number is printed only where it carries the argument: by default the cells in the top class.
  const printFrom = beat.printFrom ?? breaks[breaks.length - 1];
  const printed = values.filter((v) => v >= printFrom);
  if (printed.length) assertLegibleLabels(printed, beat.format);

  beat.check();
  assertDrawsClaimColumn(values, HERE);
  // The title may count the rows or the columns ("seven countries"): the plate draws every one.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, input.length, heads.length], "cells");

  // ── each cell's own reading: its value and its rank among the rows for its column ──────────
  const rows = input.map((r, i) => ({ ...r, code: `r${i + 1}` }));
  const cellKey = (i, j) => `${rows[i].code}:c${j + 1}`;
  const rankFor = (j, i) => [...rows.keys()].sort((a, b) => rows[b].cells[j] - rows[a].cells[j]).indexOf(i) + 1;
  const cells = rows.flatMap((r, i) =>
    heads.map((h, j) => {
      const v = r.cells[j];
      const reading = { rowLabel: r.label, colLabel: h.label, value: v, rank: rankFor(j, i), count: rows.length, row: r, head: h, colIndex: j };
      return { row: i, col: j, key: cellKey(i, j), value: v, bin: binOf(v), label: v >= printFrom ? plain(beat.format(v)) : null, detail: plain(beat.detail(reading)) };
    }),
  );
  if (new Set(cells.map((c) => c.detail)).size !== cells.length)
    throw new Error(`detail() prints the same sentence for two cells: every cell must answer with its own reading (name its row and its column)`);

  // ── the floor: nested bands, each keeping the cells at or above it ─────────────────────────
  const bands = beat.bands;
  if (!Array.isArray(bands) || bands.length < 2 || bands.some((t, i) => typeof t !== "number" || (i > 0 && t <= bands[i - 1])))
    throw new Error(`bands are the floors the reader can raise, at least two numbers strictly rising (e.g. [5, 15, 25]); got ${JSON.stringify(bands)}`);
  const drawnKeys = cells.map((c) => c.key);
  const keptAt = (t) => cells.filter((c) => c.value >= t).map((c) => c.key);
  const labels = bands.map((t) => plain(beat.bandLabel(t)));
  const slugs = labels.map((l) => slugOf(l));
  if (new Set(slugs).size !== slugs.length || slugs.some((s) => !s || s === "all"))
    throw new Error(`bandLabel() gives labels that are empty or not distinct (${labels.join(", ")}): print each band's floor, e.g. "5 %"`);
  bands.forEach((t, b) => {
    const kept = new Set(keptAt(t));
    if (!kept.size) throw new Error(`the band ${labels[b]} keeps no cell at all: lower it`);
    // Every row survives every band: a row with no cell left is a label standing over a blank strip.
    const gone = rows.filter((r, i) => !heads.some((_, j) => kept.has(cellKey(i, j))));
    if (gone.length)
      throw new Error(`the band ${labels[b]} empties the row(s) ${gone.map((r) => r.label).join(", ")} — every row must keep at least one cell at every band: lower the top band`);
  });
  const filter = { label: plain(beat.filterLabel), allLabel: plain(beat.allLabel), unit: "cells", options: bands.map((t, b) => ({ label: labels[b], keys: keptAt(t) })) };
  /** An axis label belongs to a whole row or column: its token list is the union of its cells' bands. */
  const unionFilter = (keys) =>
    bands
      .map((t, b) => ({ slug: slugs[b], kept: new Set(keptAt(t)) }))
      .filter(({ kept }) => keys.some((k) => kept.has(k)))
      .map(({ slug }) => slug)
      .join(" ");
  const rowFilters = rows.map((_, i) => unionFilter(heads.map((_, j) => cellKey(i, j))));
  const colFilters = heads.map((_, j) => unionFilter(rows.map((_, i) => cellKey(i, j))));

  const notes = bands.map((t, b) => {
    const kept = keptAt(t);
    const cover = rows.map((r) => ({ name: r.label, cells: r.cells.filter((v) => v >= t).length, covered: r.cells.filter((v) => v >= t).reduce((s, v) => s + v, 0) }));
    const reading = {
      threshold: t,
      label: labels[b],
      kept: kept.length,
      total: drawnKeys.length,
      columnsKept: new Set(cells.filter((c) => c.value >= t).map((c) => c.col)).size,
      columnCount: heads.length,
      low: cover.reduce((a, c) => (c.covered < a.covered ? c : a)),
      high: cover.reduce((a, c) => (c.covered > a.covered ? c : a)),
      fewest: cover.reduce((a, c) => (c.cells < a.cells ? c : a)),
      most: cover.reduce((a, c) => (c.cells > a.cells ? c : a)),
    };
    const text = plain(beat.bandNote(reading));
    if (!statesNumber(text, kept.length))
      throw new Error(`bandNote() is shown when the band ${labels[b]} is chosen, so it must state how many cells it keeps, ${kept.length} (of ${drawnKeys.length}); it says: ${text}`);
    return { slug: slugs[b], text };
  });

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const routes = [{ key: "annotation", text: plain(beat.annotation) }];
  const alt = plain(beat.alt);
  const colLabels = heads.map((h) => plain(h.label));
  const rowLabels = rows.map((r) => ({ name: plain(r.label), route: "" }));

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.label, value: r.cells.reduce((s, v) => s + v, 0) })), { subject: rows[0].label, declaredSequence: unit || "value" });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${filter.label} ${filter.allLabel} ${labels.join(" ")} ${notes.map((n) => n.text).join(" ")}`,
    axis: `${colLabels.join(" ")} ${rowLabels.map((r) => r.name).join(" ")} ${bins.map((b) => b.label).join(" ")}`,
    annot: routes.map((r) => r.text).join(" "),
    value: cells.filter((c) => c.label).map((c) => c.label).join(" ") || "0",
  };

  const below = cells.filter((c) => c.value < bands[0]).length;
  const interaction = {
    earns:
      `A reader can raise the floor under the grid and watch which cells survive — ${below} of the ${cells.length} sit under the lowest band — and the page says ` +
      `how much of each row the survivors still account for. A still has to draw all ${cells.length} at once.`,
    controls: [
      {
        question: "Which cells actually carry each row — and how little is the rest of this grid worth?",
        gesture: "filter-to-a-subset",
        changes: "Every cell under the chosen floor leaves — rect, printed value, hit target, and a column's own label once its whole column has fallen away. The ramp key never moves.",
        parameter: "the floor under the grid",
        authorPicked: "all",
        readerPicks: ["all", ...slugs],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this cell actually worth, and where does this row rank on this column?",
        gesture: "ask-a-mark",
        changes: "The cell answers with its exact value and the row's rank among all rows for that column — the comparison the grid's own geometry makes impossible.",
        parameter: "which cell is asked about",
        authorPicked: `${rows[0].label} / ${heads[0].label}`,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedHeatmapWeb,
        props: {
          cells,
          rowLabels,
          colLabels,
          bins,
          routes,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          rowFilters,
          colFilters,
          notes,
          filter,
          filterKeys: drawnKeys,
          interaction,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
