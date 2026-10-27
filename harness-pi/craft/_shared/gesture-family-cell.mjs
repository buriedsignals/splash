// The Cell-grid family adapter (craft/gestures/GRAMMAR.md §4 F7): one mark per cell, its value drawn as a colour CLASS
// between fixed breaks. Two types share it: heatmap-matrix (a cell per row × column) and calendar-heatmap (a cell per
// date, twelve month rows by 31 day columns). It answers where cells are, which class a value falls in, the runs a
// predicate holds over, and the minimal row reorder; the format schedulers decide when each state shows.
// Browser-safe (the video bundle and the scrolly drive import it): no Node module.
//
// Marks, as the core reads them (gesture-core.mjs validateGestures):
//   heatmap   { name: "Pologne · Charbon", value, key: "Pologne", series: "Charbon" } — a gesture naming "Pologne" acts on
//             the row, "Charbon" on the column
//   calendar  { name: "2024-07-14", value, key: "2024-07-14", series: "Juillet" } — "Juillet" names the month's days
// The values do not add up (shares of different rows, daily readings): additive: false, so no bracket and no count.
//
// The family's locks (GRAMMAR.md §8): the colour domain is fixed (no-let-colour-scale) — no gesture moves a break, and no
// rescale exists here; a reorder moves only the rows the claim names (no-reorder-rows-claim), every other row keeps its
// relative order; a calendar's order is the calendar's and never moves.
import { figuresIn, GestureRefusal } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

export const FAMILY = "cell";
export const VARIANTS = ["heatmap-matrix", "calendar-heatmap"];

/** The gestures the family draws in all four formats (GRAMMAR.md §6, F7 column; zoom and rescale are not drawn). */
export const CELL_GESTURES = ["highlight", "name", "annotate", "compare", "reference", "trace", "filter", "reorder", "reveal", "pull-back"];
FAMILIES.cell ??= { gestures: CELL_GESTURES, additive: false };

/** What each gesture means on a cell grid, as a contract lists it (the registry's meanings are bar-worded). */
export const CELL_MEANINGS = {
  highlight: "a row, a column, a month or one cell is outlined in the accent; the colours of the cells never change",
  name: "one cell, row, column or month is ringed in ink and labelled with its value (a row: its measure; a month: its mean)",
  annotate: "a short note written beside one cell, row, column or month",
  compare: "two cells set against each other, joined by a rule; the note states their gap or ratio",
  reference: "a cutoff on the colour key at `value`; every cell at or above it is marked",
  trace: "the longest run of consecutive cells (days in date order, rows in drawn order, or the cells `along` one row, column or month) at or above `value` is outlined; the note states its length",
  filter: "the cells the claim is about keep their colour; every other cell steps back, nothing moves",
  reorder: "the rows named move to the top, every other row keeps its order (heatmap only)",
  reveal: "cells appear in their natural order (row by row, or day by day)",
  "pull-back": "the frame returns to the whole grid, with what was shown still marked",
};

const fold = (s) => String(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const words = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, " ")} `;

// ── the grid ──────────────────────────────────────────────────────────────────────────────────────

/** Five breaks for six bins of roughly equal count (calendar.mjs `quantileBreaks`, the per-type kit's rule). */
export function quantileBreaks(values, decimals = 0) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const f = 10 ** decimals;
  return [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => Math.round(q(p) * f) / f);
}

const SEP = " · ";

/**
 * The grid a beat draws, from its own fields.
 *   heatmap-matrix  beat.heads [{ key, label, short?, family? }], beat.rows [{ key?, label, value?, cells }], beat.breaks
 *   calendar        beat.days [{ date: "YYYY-MM-DD", value }] (one year), beat.months (12 names), beat.breaks or
 *                   quantile breaks at beat.breakDecimals
 * @returns { variant, rows: [{ key, label, value? }], cols: [{ key, label, short?, family? }], cells: [{ id, r, c, name,
 *            value, key, series, date? }], breaks, year? }
 */
export function gridOf(variant, beat) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of ${VARIANTS.join(", ")}, not "${variant}"`);
  if (variant === "heatmap-matrix") {
    const cols = beat.heads.map((h) => ({ key: String(h.key ?? h.label), label: String(h.label), short: h.short, family: h.family }));
    const rows = beat.rows.map((r) => ({ key: String(r.key ?? r.label), label: String(r.label), ...(Number.isFinite(r.value) ? { value: r.value } : {}) }));
    const cells = [];
    beat.rows.forEach((r, i) =>
      r.cells.forEach((v, j) => {
        // A cell the data does not give is not a zero: it is drawn as missing and named by no gesture.
        if (v === null || v === undefined || !Number.isFinite(v)) return;
        cells.push({ id: cells.length, r: i, c: j, name: `${rows[i].label}${SEP}${cols[j].label}`, value: v, key: rows[i].label, series: cols[j].label });
      }),
    );
    return { variant, rows, cols, cells, breaks: [...beat.breaks] };
  }
  const days = beat.days
    .map((d) => {
      const m = String(d.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) throw new Error(`date ${JSON.stringify(d.date)} is not YYYY-MM-DD`);
      return { date: String(d.date), year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]), value: d.value };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const rows = beat.months.map((label, m) => ({ key: String(label), label: String(label) }));
  const cols = Array.from({ length: 31 }, (_, d) => ({ key: String(d + 1), label: String(d + 1) }));
  const cells = days
    .filter((d) => Number.isFinite(d.value))
    .map((d, id) => ({ id, r: d.month, c: d.day - 1, name: d.date, value: d.value, key: d.date, series: rows[d.month].label, date: d.date, day: d.day }));
  const breaks = Array.isArray(beat.breaks) ? [...beat.breaks] : quantileBreaks(cells.map((c) => c.value), beat.breakDecimals ?? 0);
  return { variant, rows, cols, cells, breaks, year: days[0]?.year };
}

/** The marks the core validates against: one per cell. */
export const marksOf = (grid) => grid.cells.map((c) => ({ name: c.name, value: c.value, key: c.key, series: c.series }));

/** The class a value falls in: the number of breaks at or below it (breaks fixed for the beat: no-let-colour-scale). */
export const classOf = (breaks, v) => breaks.filter((b) => v >= b).length;

/** A grid's drawn row order, as indices (the order beat.mjs gives the rows). */
export const restOrder = (grid) => grid.rows.map((_, i) => i);

// ── names: the same reading as the core's, for the checks that must run before it ────────────────────

/** The cells a story's word names: a cell's own name, a row (key), a column or month (series), or a list of those. */
export function cellsNamed(grid, value) {
  const one = (name) => {
    const f = fold(name);
    const exact = grid.cells.filter((c) => fold(c.name) === f);
    if (exact.length) return exact;
    const row = grid.rows.findIndex((r) => fold(r.label) === f || fold(r.key) === f);
    const byKey = grid.cells.filter((c) => fold(c.key) === f || (row >= 0 && grid.variant === "heatmap-matrix" && c.r === row));
    if (byKey.length) return byKey;
    return grid.cells.filter((c) => fold(c.series) === f);
  };
  const list = (Array.isArray(value) ? value : [value]).filter((v) => typeof v === "string");
  const out = [];
  for (const v of list) {
    let hit = one(v);
    if (!hit.length) {
      const parts = v.split(/\s*(?:,|;|&|\band\b|\bet\b|\bund\b|\bi\b|\be\b|\by\b)\s*/i).filter(Boolean);
      if (parts.length > 1) hit = parts.flatMap(one);
    }
    out.push(...hit);
  }
  return [...new Map(out.map((c) => [c.id, c])).values()];
}

/** The rows (indices) a set of cells touches. */
const rowsOf = (cells) => [...new Set(cells.map((c) => c.r))];

/** A short label for a set of cells: the row, column or month they make up, else the cell, else "n cells". */
export function groupLabel(grid, cells) {
  if (!cells.length) return "";
  // One day reads as its day and month ("11 Août"), which a note on it names in its own words.
  if (cells.length === 1) return grid.variant === "heatmap-matrix" ? cells[0].name : `${cells[0].day} ${grid.rows[cells[0].r].label}`;
  const rows = rowsOf(cells);
  const cols = [...new Set(cells.map((c) => c.c))];
  const full = (r) => grid.cells.filter((c) => c.r === r).length === cells.filter((c) => c.r === r).length;
  if (rows.every(full)) return rows.map((r) => grid.rows[r].label).join(", ");
  if (cols.length === 1 && grid.variant === "heatmap-matrix") return grid.cols[cols[0]].label;
  // A set that is no row, column or month has no one name: its note speaks for itself.
  return "";
}

// ── the claim, read on cells ──────────────────────────────────────────────────────────────────────

/**
 * The claim as the core reads it, with the rows, columns and months the takeaway names spelled out as their cells'
 * names: the core finds the takeaway's entities among the MARKS' names ("Pologne · Charbon"), which a takeaway naming
 * "la Pologne" never contains. Each named group's cells are appended to `entity`; nothing else changes.
 */
export function claimFor(claim, grid) {
  const text = words([claim.takeaway, claim.subject, claim.comparison, claim.entity, claim.versus].filter(Boolean).join(" "));
  const groups = [...new Set([...grid.rows.map((r) => r.label), ...(grid.variant === "heatmap-matrix" ? grid.cols.map((c) => c.label) : [])])];
  const named = groups.filter((g) => text.includes(words(g)));
  if (!named.length) return claim;
  const cells = cellsNamed(grid, named);
  return { ...claim, entity: [claim.entity, ...cells.map((c) => c.name)].filter(Boolean).join(" | ") };
}

/**
 * The facts a note may state beside a cell's own value: data.json's numbers for its row (guards.mjs rowFacts, read by the
 * row's data name or its drawn label), and — heatmap — the row's drawn measure, so "Islande 100 %" on Iceland's row is
 * its row's figure, not a stranger's.
 */
export function factsFor(grid, rowFacts = {}, dataNames = {}) {
  const facts = {};
  for (const c of grid.cells) {
    const row = grid.rows[c.r];
    const own = rowFacts[c.name] ?? rowFacts[c.date] ?? rowFacts[dataNames[row.key] ?? row.key] ?? rowFacts[row.label] ?? [];
    facts[c.name] = [...own, ...(Number.isFinite(row.value) ? [row.value] : [])];
  }
  return facts;
}

// ── the family members (GRAMMAR.md §4.2 F7) ────────────────────────────────────────────────────────

/** The cell at (row, col), or at a date: undefined where the grid holds none (a missing value, 30 February). */
export function cell(grid, at, col) {
  if (typeof at === "string") return grid.cells.find((c) => c.date === at || c.name === at);
  return grid.cells.find((c) => c.r === at && c.c === col);
}

/**
 * The longest run of consecutive cells for which `predicate` holds, in reading order: a calendar's days in date order;
 * a heatmap's rows in drawn order (a row holds when its measure does), or the cells along one row or column.
 * @returns { cells: [cell], rows: [rowIndex], length, from, to } — from/to are the run's first and last cells (or rows)
 */
export function run(grid, predicate, { along = null, order = restOrder(grid) } = {}) {
  let items;
  if (grid.variant === "calendar-heatmap") items = (along ?? grid.cells).slice().sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ v: c.value, cells: [c], key: c }));
  else if (!along) {
    items = order.map((r) => ({ v: grid.rows[r].value, cells: grid.cells.filter((c) => c.r === r), key: r }));
  } else {
    const rows = rowsOf(along);
    // Along one column: its cells in drawn row order; along one row: its cells in column order.
    items = rows.length > 1 ? order.filter((r) => rows.includes(r)).map((r) => along.find((c) => c.r === r)).filter(Boolean).map((c) => ({ v: c.value, cells: [c], key: c })) : along.slice().sort((a, b) => a.c - b.c).map((c) => ({ v: c.value, cells: [c], key: c }));
  }
  let best = [];
  let cur = [];
  for (const it of items) {
    if (Number.isFinite(it.v) && predicate(it.v)) cur.push(it);
    else {
      if (cur.length > best.length) best = cur;
      cur = [];
    }
  }
  if (cur.length > best.length) best = cur;
  return { cells: best.flatMap((i) => i.cells), rows: best.flatMap((i) => (typeof i.key === "number" ? [i.key] : [])), length: best.length, from: best[0]?.key ?? null, to: best.at(-1)?.key ?? null };
}

/**
 * The minimal reorder (no-reorder-rows-claim): the named rows move to the top in the order given, every other row keeps
 * its relative order. Returns the new order of row indices.
 */
export function reorderRows(order, named) {
  return [...named, ...order.filter((r) => !named.includes(r))];
}

/** Whether a reorder kept every row it does not name in its relative order (no-reorder-rows-claim). */
export function keepsOthersInOrder(before, after, named) {
  const others = (o) => o.filter((r) => !named.includes(r));
  return others(before).every((r, i) => others(after)[i] === r);
}

/**
 * Outline rectangles for a set of cells, in grid units ({ r0, r1, c0, c1 }, rows as SLOTS in `order`): each slot's run of
 * contiguous columns, then identical spans in consecutive slots merged — a row is one rectangle, a column one, a month
 * one, a run across months one per month.
 */
export function outlineOf(cells, order) {
  const slotOf = new Map(order.map((r, s) => [r, s]));
  const spans = [];
  const bySlot = new Map();
  for (const c of cells) {
    const s = slotOf.get(c.r);
    if (s === undefined) continue;
    (bySlot.get(s) ?? bySlot.set(s, []).get(s)).push(c.c);
  }
  for (const [s, cols] of [...bySlot].sort((a, b) => a[0] - b[0])) {
    const sorted = [...new Set(cols)].sort((a, b) => a - b);
    let start = sorted[0];
    for (let i = 1; i <= sorted.length; i++)
      if (i === sorted.length || sorted[i] !== sorted[i - 1] + 1) {
        spans.push({ r0: s, r1: s, c0: start, c1: sorted[i - 1] });
        start = sorted[i];
      }
  }
  const merged = [];
  for (const sp of spans) {
    const above = merged.find((m) => m.r1 === sp.r0 - 1 && m.c0 === sp.c0 && m.c1 === sp.c1);
    if (above) above.r1 = sp.r1;
    else merged.push({ ...sp });
  }
  return merged;
}

// ── figures, refusals and the checks before the core ─────────────────────────────────────────────────

const mean = (vs) => vs.reduce((s, v) => s + v, 0) / vs.length;

/** The figures a set of cells holds beside their own values: how many, their mean, lowest and highest, and (heatmap,
 *  whole rows) each row's measure and the count of rows. */
function groupFigures(grid, cells) {
  if (!cells.length) return [];
  const vs = cells.map((c) => c.value);
  const rows = rowsOf(cells);
  const out = [cells.length, mean(vs), Math.min(...vs), Math.max(...vs)];
  if (rows.length > 1) out.push(rows.length);
  for (const r of rows) if (Number.isFinite(grid.rows[r].value)) out.push(grid.rows[r].value);
  // A single day's date is a figure of the note written on it ("14 juillet: 25,1 °C").
  if (grid.variant === "calendar-heatmap" && cells.length === 1) out.push(cells[0].day);
  return out;
}

/** The run a trace draws (its `along` named in the gesture, its predicate value ≥ `value`). */
export function traceRun(grid, g, order = restOrder(grid)) {
  const along = g.along === undefined ? null : cellsNamed(grid, g.along);
  return run(grid, (v) => v >= Number(g.value), { along: along?.length ? along : null, order });
}

function traceFigures(grid, g) {
  const r = traceRun(grid, g);
  const out = [r.length, Number(g.value)];
  if (grid.variant === "calendar-heatmap" && r.length) out.push(r.from.day, r.to.day);
  if (r.cells.length) out.push(...groupFigures(grid, r.cells).slice(1, 4));
  return out;
}

/**
 * The family's hooks for validateGestures: the figures a gesture draws beyond the core's own (a group's mean, a row's
 * measure, a run's length and endpoints, the cells past a cutoff), and the family's own refusals.
 */
export function cellHooks(grid) {
  const byName = new Map(grid.cells.map((c) => [c.name, c]));
  return {
    figures(g, ctx) {
      const cells = ctx.marks.map((m) => byName.get(m)).filter(Boolean);
      const out = groupFigures(grid, cells);
      if (g.do === "trace") out.push(...traceFigures(grid, g));
      if (g.do === "reference") {
        const v = Number(g.value);
        out.push(grid.cells.filter((c) => c.value >= v).length);
        const above = grid.rows.filter((r) => Number.isFinite(r.value) && r.value >= v).length;
        if (above) out.push(above);
      }
      return out;
    },
    refuse(g, ctx) {
      const i = ctx.index;
      if (g.do === "reorder") {
        if (grid.variant === "calendar-heatmap")
          throw new GestureRefusal(`gestures[${i}]`, `a calendar's rows are its months, in the calendar's order: they never move — drop the reorder, or highlight the month instead`, { remove: i });
        const cells = ctx.marks.map((m) => byName.get(m)).filter(Boolean);
        const rows = rowsOf(cells);
        if (!rows.length) {
          const named = [...new Set(grid.cells.filter((c) => ctx.claim?.entity && words(ctx.claim.entity).includes(words(c.name))).map((c) => grid.rows[c.r].label))];
          throw new GestureRefusal(`gestures[${i}].marks`, `a reorder names the rows that move to the top, and only those move (no-reorder-rows-claim)`, named.length ? { set: { index: i, field: "marks", value: named } } : { remove: i });
        }
        if (rows.length >= grid.rows.length)
          throw new GestureRefusal(`gestures[${i}].marks`, `this reorder moves every row; a reorder moves only the rows the claim needs (no-reorder-rows-claim): name those rows, or drop it`, { remove: i });
      }
      if (g.do === "trace") {
        if (!Number.isFinite(Number(g.value)) || g.value === null || g.value === "")
          throw new GestureRefusal(`gestures[${i}].value`, `a trace outlines the longest run of cells at or above a value: give value, the threshold the takeaway names`, { remove: i });
        const r = traceRun(grid, g);
        if (r.length < 1)
          throw new GestureRefusal(`gestures[${i}].value`, `no cell${g.along ? ` along ${g.along}` : ""} reaches ${g.value}, so the trace would outline nothing: drop it, or give the threshold the takeaway names`, { remove: i });
        // A trace's note counts its run: a whole number it states that the run does not give is a miscount, fixed to the
        // run's own length (on a grid of many cells the core would read it as some other cell's value and drop the note).
        const own = traceFigures(grid, g);
        for (const n of figuresIn(g.note ?? "")) {
          if (n.percent || own.some((f) => Math.abs(n.value - f) <= 0.5 * 10 ** -n.decimals + 1e-9)) continue;
          if (!Number.isInteger(n.value)) continue;
          const fixed = g.note.slice(0, n.index) + String(r.length) + g.note.slice(n.index + n.raw.length);
          throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, but the run at or above ${g.value} is ${r.length} long: write "${fixed}"`, { set: { index: i, field: "note", value: fixed } });
        }
      }
      if (g.do === "reference") {
        const v = Number(g.value);
        if (!Number.isFinite(v)) throw new GestureRefusal(`gestures[${i}].value`, `a reference is a cutoff on the colour key: give value, a number`, { remove: i });
      }
    },
  };
}

/**
 * The family's checks that must run BEFORE the core, and the one normalisation it makes:
 *  - a trace's row, column or month is its `along` (written as `mark`, it is moved there): the core would otherwise read
 *    the run's cells as the gesture's marks and hold the threshold's percent sign against them;
 *  - a compare sets exactly two cells against each other: the core derives a compare from its first mark against the
 *    sum of the others, which on a grid of rates is no figure at all;
 *  - on the web, a list that rests whole asks the reader nothing: the core's own fix adds a bracket, which this family
 *    does not draw, so the fix here adds a gesture it does.
 * @returns the list to validate (a new array; the model's own list otherwise unchanged)
 */
export function precheck({ gestures, grid, format }) {
  if (!Array.isArray(gestures)) return gestures;
  const list = gestures.map((g) => {
    if (g?.do === "trace" && g.mark !== undefined && g.along === undefined) {
      const { mark, ...rest } = g;
      return { ...rest, along: mark };
    }
    return g;
  });
  list.forEach((g, i) => {
    if (g?.do !== "compare") return;
    const named = g.marks !== undefined ? cellsNamed(grid, [g.marks].flat()) : cellsNamed(grid, [g.mark, ...[g.of ?? []].flat()].filter((x) => typeof x === "string" && x !== "whole"));
    if (named.length === 2) return;
    const groups = [g.marks ?? g.mark].flat().filter((x) => typeof x === "string");
    const first = groups.map((x) => cellsNamed(grid, x)[0]).filter(Boolean);
    const example = first.length === 2 ? first.map((c) => c.name) : grid.cells.slice(0, 2).map((c) => c.name);
    throw new GestureRefusal(
      `gestures[${i}].marks`,
      `a compare on a cell grid sets two CELLS against each other (it names ${named.length}): write marks: [${example.map((n) => JSON.stringify(n)).join(", ")}] — two cells, by their names`,
      { remove: i },
    );
  });
  const RESTING = new Set(["highlight", "name", "annotate", "reference", "reveal", "pull-back"]);
  if (format === "web" && list.length && list.every((g) => RESTING.has(g?.do))) {
    const reference = list.find((g) => g.do === "reference");
    const first = list.find((g) => g.mark !== undefined || g.marks !== undefined);
    const gesture = reference ? { do: "trace", value: reference.value } : first ? { do: "filter", mark: first.mark ?? first.marks } : { do: "filter", mark: grid.rows[0].label };
    throw new GestureRefusal("gestures", `a web page needs at least one gesture a reader asks for (trace, compare, filter or reorder); every gesture here rests on the page`, { add: { at: list.length, gesture } });
  }
  return list;
}

// ── the fold: every format's states come from one reading of the list ──────────────────────────────

/**
 * What each validated gesture lays on the grid, in story order.
 * @param gestures validateGestures' `gestures` (marks resolved to cell names)
 * @returns { plan: [{ index, do, cells: [id], note, value?, run?, order? }], orders: [order after gesture k] }
 */
export function planCells({ gestures, grid }) {
  const byName = new Map(grid.cells.map((c) => [c.name, c]));
  let order = restOrder(grid);
  const plan = [];
  const orders = [];
  gestures.forEach((g, k) => {
    const cells = (g.marks ?? []).map((m) => byName.get(m)).filter(Boolean);
    const item = { index: k, do: g.do, cells: cells.map((c) => c.id), note: g.note === undefined || !String(g.note).trim() ? undefined : String(g.note), label: groupLabel(grid, cells) };
    if (g.do === "trace") {
      const r = traceRun(grid, g, order);
      Object.assign(item, { value: Number(g.value), cells: r.cells.map((c) => c.id), run: { length: r.length, rows: r.rows }, label: g.along ? String(g.along) : "" });
      if (grid.variant === "calendar-heatmap" && r.length) item.run.from = r.from.date, item.run.to = r.to.date;
    }
    if (g.do === "reference") Object.assign(item, { value: Number(g.value), cells: grid.cells.filter((c) => c.value >= Number(g.value)).map((c) => c.id) });
    if (g.do === "reorder") {
      const named = [];
      for (const c of cells) if (!named.includes(c.r)) named.push(c.r);
      const next = reorderRows(order, named);
      if (next.every((r, i) => r === order[i]))
        throw new GestureRefusal(`gestures[${k}]`, `reorder asks for the order the rows already hold (${order.map((r) => grid.rows[r].label).join(", ")}), so it changes nothing in the picture: drop it`, { remove: k });
      order = next;
      item.order = [...order];
    }
    if (g.do === "filter" && cells.length >= grid.cells.length)
      throw new GestureRefusal(`gestures[${k}]`, `filter keeps every cell, so nothing steps back: drop it, or name the cells the claim is about`, { remove: k });
    if (g.do === "compare") {
      const [a, b] = cells;
      Object.assign(item, { a: a.id, b: b.id, values: [a.value, b.value] });
    }
    if (["name", "annotate"].includes(g.do) && !item.note) item.value = cells.length === 1 ? cells[0].value : Number.isFinite(grid.rows[cells[0]?.r]?.value) && rowsOf(cells).length === 1 ? grid.rows[cells[0].r].value : mean(cells.map((c) => c.value));
    plan.push(item);
    orders.push([...order]);
  });
  return { plan, orders };
}

/**
 * The picture after a set of gestures is on: which cells are outlined (and how), which step back, the cutoff, the
 * compares, the notes, the order. `on[k]` says whether gesture k is drawn; a pull-back releases every filter before it.
 */
export function pictureOf({ plan, orders, grid, on }) {
  const pic = { order: restOrder(grid), outlines: [], back: [], cutoffs: [], compares: [], notes: [], revealed: false };
  let filtered = null;
  plan.forEach((p, k) => {
    if (!on[k]) return;
    if (p.do === "reorder") pic.order = orders[k];
    if (p.do === "highlight") pic.outlines.push({ index: k, kind: "accent", cells: p.cells });
    if (p.do === "name") pic.outlines.push({ index: k, kind: "ring", cells: p.cells });
    if (p.do === "trace") pic.outlines.push({ index: k, kind: "run", cells: p.cells });
    if (p.do === "compare") pic.compares.push({ index: k, a: p.a, b: p.b });
    if (p.do === "reference") pic.cutoffs.push({ index: k, value: p.value, cells: p.cells });
    if (p.do === "filter") filtered = new Set([...(filtered ?? []), ...p.cells]);
    if (p.do === "pull-back") filtered = null;
    if (p.do === "reveal") pic.revealed = true;
  });
  if (filtered) pic.back = grid.cells.filter((c) => !filtered.has(c.id)).map((c) => c.id);
  return pic;
}

/** A gesture's note as drawn: its own words, else (name, annotate) the group's label and value in the beat's format. */
export function noteText(p, format) {
  if (p.note) return p.note;
  if ((p.do === "name" || p.do === "annotate") && p.value !== undefined) return `${p.label}: ${format(p.value)}`;
  return null;
}

/** The note as a reader meets it: prefixed with its group when the words do not name it ("Juillet: 21,3"). */
export function noteLine(p, format) {
  const text = noteText(p, format);
  if (!text) return null;
  // A compare's two cells are named by its own words; the column they share is no subject of the sentence.
  return p.label && p.do !== "compare" && !words(text).includes(words(p.label)) && p.cells.length ? `${p.label}: ${text}` : text;
}

/**
 * The accent's subject when no highlight names one (implicitAccent, on cells): the first gesture's cells. Doctrine's
 * one accent carries the argument; on a grid the accent is an outline, never a fill (the hue is the scale).
 */
export function implicitOutline(plan) {
  if (plan.some((p) => p.do === "highlight")) return null;
  // Not a filter: its kept cells are already set apart by the step back, and an outline on them would hide a later
  // trace over the same rows (the heatmap video drew the run under the filter's accent).
  const first = plan.find((p) => p.cells.length && ["name", "annotate", "compare", "trace"].includes(p.do));
  return first ? { index: first.index, kind: "accent", cells: first.do === "compare" ? [first.a] : first.cells, implicit: true } : null;
}

/** The whole staging of one format: precheck → core → plan. Shared by the four schedulers. */
export function stageCells({ validateGestures, gestures, grid, format, claim }) {
  const list = precheck({ gestures, grid, format });
  const { gestures: valid, entities } = validateGestures({ gestures: list, rows: marksOf(grid), family: FAMILY, format, claim: claimFor(claim, grid), hooks: cellHooks(grid) });
  const { plan, orders } = planCells({ gestures: valid, grid });
  return { list, valid, entities, plan, orders };
}
