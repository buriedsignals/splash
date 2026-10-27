// The Cell-grid scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's scroll
// interpolating continuously from one card's state to the next, then a closing card carrying the limits, on which the
// whole grid returns (a filter is released, what was shown stays marked).
//
// A state is a flat record of finite numbers: `ink` (a reveal's progress through the cells in reading order), `note`
// (which card's note the header reads), per gesture `g<k>` (its outline, its cutoff dots, its compare rule), per filter
// `f<k>` (its step back, released by a pull-back and on the closing card), per row `slot<r>` (a reorder moving rows).
// Every card sets its own `g<k>` and `note`, so every card changes the picture.
//
// Each card's prose is its gesture's `card`: every number in it is one the grid gives (a cell, a row's measure, a run,
// a count, a cutoff), and a trace's or a compare's card states the figure its picture shows. A card refusal is a
// gesture refusal (`gestures[i].card`, with a fix), so SPLASH_GESTURE_REPAIR repairs it like any other.
//
// The drive (`applyCellState`) is ONE self-contained function — no import, no reference to this module's scope —
// emitted as source and inlined by the scrolly skill's renderScrolly. Browser-safe: no Node module.
import { figuresIn, GestureRefusal } from "./gesture-core.mjs";
import { noteLine } from "./gesture-family-cell.mjs";

export const APPLY = "applyCellState";

/**
 * @param plan, orders  planCells' output
 * @param grid          gridOf's output
 * @returns { states, closing } — one state per gesture card, then the closing card's
 */
export function scheduleCellScrolly({ plan, orders, grid }) {
  const revealFirst = plan[0]?.do === "reveal";
  const base = { ink: revealFirst ? 0 : 1, note: 0 };
  grid.rows.forEach((_, r) => (base[`slot${r}`] = r));
  plan.forEach((p, k) => {
    base[`g${k}`] = 0;
    if (p.do === "filter") base[`f${k}`] = 0;
  });
  const states = [];
  let state = base;
  plan.forEach((p, k) => {
    const next = { ...state, [`g${k}`]: 1, note: k };
    if (p.do === "reveal") next.ink = 1;
    if (p.do === "filter") next[`f${k}`] = 1;
    if (p.do === "pull-back") plan.forEach((q, j) => q.do === "filter" && j < k && (next[`f${j}`] = 0));
    if (p.do === "reorder") orders[k].forEach((r, s) => (next[`slot${r}`] = s));
    states.push(next);
    state = next;
  });
  const closing = { ...state, note: plan.length };
  plan.forEach((q, j) => q.do === "filter" && (closing[`f${j}`] = 0));
  states.push(closing);
  return { states, closing };
}

const matches = (n, f) => Math.abs(n.value - f) <= 0.5 * 10 ** -n.decimals + 1e-9;
const paragraphsOf = (card) => [card].flat().map((p) => (typeof p === "string" ? p : ""));

/**
 * Every gesture's card checked: present, every number one the grid gives, a trace's and a compare's card stating the
 * figure its picture shows. Returns the cards' paragraphs; throws a GestureRefusal naming `gestures[k].card` and a fix.
 * @param valid validateGestures' `gestures` (their `figures` hold the family's own: a group's mean, a run's length…)
 */
export function checkCellCards({ valid, plan, grid, format = String, claim = {} }) {
  const known = [
    grid.cells.length,
    grid.rows.length,
    ...grid.cells.map((c) => c.value),
    ...grid.rows.map((r) => r.value).filter(Number.isFinite),
    ...valid.flatMap((g) => g.figures ?? []),
    ...figuresIn(claim.takeaway ?? "").map((n) => n.value),
  ].filter(Number.isFinite);
  return valid.map((g, k) => {
    const p = plan[k];
    const where = `card ${k + 1} (${g.do}${p.label ? ` on ${p.label}` : ""})`;
    const fallback = noteLine(p, format) ?? (p.label || grid.rows[0].label);
    if (g.card === undefined || !paragraphsOf(g.card).length || paragraphsOf(g.card).some((t) => !t.trim()))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} has no prose: give the gesture a card, the sentence the reader reads while it plays, in the story's language`, { set: { index: k, field: "card", value: fallback } });
    const paragraphs = paragraphsOf(g.card);
    const setParagraph = (i, text) => (Array.isArray(g.card) ? Object.assign([...g.card], { [i]: text }) : text);
    for (const [i, text] of paragraphs.entries())
      for (const n of figuresIn(text)) {
        if (known.some((f) => matches(n, f))) continue;
        throw new GestureRefusal(`gestures[${k}].card`, `${where} states ${n.raw}, which no cell, row, run or count of the grid gives: say what the picture shows`, { set: { index: k, field: "card", value: setParagraph(i, fallback) } });
      }
    const owed = p.do === "trace" ? p.run.length : p.do === "compare" ? null : undefined;
    const stated = paragraphs.flatMap((t) => figuresIn(t));
    if (p.do === "compare" && !stated.some((n) => p.values.some((v) => matches(n, v)) || (g.figures ?? []).some((f) => matches(n, f))))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} must state a figure its picture shows — ${format(p.values[0])} against ${format(p.values[1])}`, { set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${format(p.values[0])} / ${format(p.values[1])})`) } });
    if (owed !== undefined && owed !== null && !stated.some((n) => matches(n, owed)))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} must state the run its picture outlines — ${owed}`, { set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${owed})`) } });
    return { id: `card-${k + 1}-${g.do}`, prose: paragraphs };
  });
}

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyCellState.toString();

/**
 * Paints one state. SELF-CONTAINED. The grid is an SVG drawn once at build time (cells per row group, every gesture's
 * marks already laid out, at the closing card's picture for a reader without a script); a state only sets opacities
 * and moves row groups: a row's slot (a reorder), a cell's step back (a filter, washed toward the ground), a
 * gesture's marks arriving, a reveal's progress, the header's note.
 */
export function applyCellState(root, state, context) {
  const carrier = root.querySelector("[data-gcell]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  if (context.resized || !root.__gcell) {
    const data = JSON.parse(carrier.getAttribute("data-gcell"));
    root.__gcell = {
      data,
      rows: Array.from(carrier.querySelectorAll("[data-row]")),
      labels: Array.from(carrier.querySelectorAll("[data-row-label]")),
      cells: Array.from(carrier.querySelectorAll("[data-cell]")),
      marks: Array.from(carrier.querySelectorAll("[data-g]")),
      notes: Array.from(root.querySelectorAll("[data-note]")),
    };
  }
  const c = root.__gcell;
  const { pitch, rows: nRows, filters, order } = c.data;
  c.rows.forEach((g) => {
    const r = Number(g.getAttribute("data-row"));
    g.setAttribute("transform", `translate(0 ${(state[`slot${r}`] * pitch).toFixed(3)})`);
  });
  c.labels.forEach((el) => {
    const r = Number(el.getAttribute("data-row-label"));
    el.style.top = `${(((state[`slot${r}`] + 0.5) / nRows) * 100).toFixed(3)}%`;
  });
  const n = c.cells.length;
  c.cells.forEach((el) => {
    const id = Number(el.getAttribute("data-cell"));
    let back = 0;
    for (const f of filters) if (!f.kept.includes(id)) back = Math.max(back, clamp(state[`f${f.k}`]));
    const shown = clamp(state.ink * n - order[id]);
    el.setAttribute("opacity", String(shown * (1 - 0.72 * back)));
  });
  c.marks.forEach((el) => el.setAttribute("opacity", String(clamp(state[`g${el.getAttribute("data-g")}`]))));
  c.notes.forEach((el) => {
    const k = Number(el.getAttribute("data-note"));
    el.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}
