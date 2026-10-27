// The Cell-grid web scheduler (craft/gestures/GRAMMAR.md §5): the gestures that rest together are drawn at once on the
// page the reader lands on — the same end states the static plate draws — and every further gesture becomes ONE reader
// control: two native radios (the resting picture, the picture with that gesture on), mapped to the chart-web atom
// that names it. The interaction declaration renderWeb holds the page against is GENERATED here; the 12B never writes
// it. Each control's picture is the resting picture plus that one gesture, never folded from another control.
//
// The controls a grid can ask for:
//   trace    → `brush-a-range`: the run is outlined and every cell outside it steps back; the note says how long it is,
//              from where to where, and how many cells of the grid it holds
//   compare  → `toggle-a-comparison`: the two cells outlined and joined; the note writes their ratio and their gap
//   filter   → `filter-to-a-subset`: the cells outside the set step back; the frame does not move
//   reorder  → `sort-or-reorder`: the named rows move to the top, every other row keeps its order
// Every cell answers a pointer, tap or key with its exact value and its rank in its row's column (`ask-a-mark`).
// Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { groupLabel, implicitOutline, noteLine, pictureOf } from "./gesture-family-cell.mjs";

export const CELL_WEB_CONTROLS = {
  trace: { atom: "brush-a-range" },
  compare: { atom: "toggle-a-comparison" },
  filter: { atom: "filter-to-a-subset" },
  reorder: { atom: "sort-or-reorder" },
};

/** A ratio or a share in the format's own decimal mark. */
function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param plan, orders  planCells' output
 * @param grid          gridOf's output
 * @param format        how a value is printed (plain spaces)
 * @returns { resting: picture + notes, controls: [{ index, do, atom, picture, legend, chip, note, pieces, question, changes, parameter }] }
 */
export function scheduleCellWeb({ plan, orders, grid, format = String }) {
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const byId = new Map(grid.cells.map((c) => [c.id, c]));
  // A legend holds one line on a phone: a list of rows is its first and how many more ("Islande + 6").
  const short = (label) => {
    const parts = String(label ?? "").split(", ").filter(Boolean);
    return parts.length <= 2 ? parts.join(", ") : `${parts[0]} + ${parts.length - 1}`;
  };
  const restingOn = plan.map((p) => WEB_RESTING.has(p.do));
  plan.forEach((p, k) => {
    if (!restingOn[k] && !CELL_WEB_CONTROLS[p.do])
      throw new GestureRefusal(`gestures[${k}].do`, `"${p.do}" has no web control on a cell grid: draw it in the static or video format, or stage it with ${Object.keys(CELL_WEB_CONTROLS).join(", ")} (a control)`, { remove: k });
  });
  const implicit = implicitOutline(plan);
  const withImplicit = (pic) => (implicit ? { ...pic, outlines: [implicit, ...pic.outlines] } : pic);
  const resting = withImplicit(pictureOf({ plan, orders, grid, on: restingOn }));
  resting.notes = plan.filter((p, k) => restingOn[k]).map((p) => ({ index: p.index, do: p.do, text: noteLine(p, format), accent: p.do === "highlight" })).filter((n) => n.text);

  const controls = [];
  plan.forEach((p, k) => {
    if (restingOn[k]) return;
    const on = restingOn.map((x, j) => x || j === k);
    const picture = withImplicit(pictureOf({ plan, orders, grid, on }));
    const cells = p.cells.map((id) => byId.get(id));
    const note = noteLine(p, format) ?? undefined;
    const control = { index: k, do: p.do, ...CELL_WEB_CONTROLS[p.do], picture, note, label: p.label };
    switch (p.do) {
      case "trace": {
        // The brush: the run outlined, every cell outside it stepping back.
        picture.back = grid.cells.filter((c) => !p.cells.includes(c.id)).map((c) => c.id);
        const along = p.label ? ` · ${p.label}` : "";
        const span = grid.variant === "calendar-heatmap" ? `${p.run.from} – ${p.run.to}` : p.run.rows.length ? `${p.run.rows.length} / ${grid.rows.length}` : `${p.run.length} / ${p.label ? "" : grid.cells.length}`;
        Object.assign(control, {
          legend: `≥ ${F(p.value)}${along}`,
          chip: `${p.run.length} × ≥ ${F(p.value)}`,
          pieces: grid.variant === "calendar-heatmap" ? [span] : [span.replace(/ \/ $/, "")],
          question: `Where does the longest run at or above ${F(p.value)} start and end?`,
          changes: `The longest run of cells at or above ${F(p.value)} is outlined and every other cell steps back; no colour changes.`,
          parameter: `whether the run of gestures[${k}] is drawn`,
        });
        break;
      }
      case "compare": {
        const [a, b] = cells;
        const label = (c) => groupLabel(grid, [c]);
        // The legend names the two rows (or days); the chip and the note carry the columns and the values.
        const name = (c) => (grid.variant === "heatmap-matrix" ? grid.rows[c.r].label : label(c));
        Object.assign(control, {
          legend: `${name(a)} / ${name(b)}`,
          chip: `${F(a.value)} / ${F(b.value)}`,
          // The gap, written out (a ratio of two rates is no reading a grid owes; the note may state one, checked).
          pieces: [`${F(a.value)} - ${F(b.value)} = ${F(a.value - b.value)}`],
          question: `How does ${label(a)} stand against ${label(b)}?`,
          changes: `The two cells are outlined and joined by a rule; their colours do not change.`,
          parameter: `whether gestures[${k}] sets ${label(a)} against ${label(b)}`,
        });
        break;
      }
      case "filter": {
        const kept = cells.length;
        const mean = cells.reduce((s, c) => s + c.value, 0) / kept;
        Object.assign(control, {
          legend: short(p.label) || `${kept}`,
          chip: `${kept} / ${grid.cells.length}`,
          // A month's days have a mean worth reading; a row of shares always averages the same, so it is left out.
          pieces: grid.variant === "calendar-heatmap" ? [`${kept} / ${grid.cells.length}`, `x̄ ${F(mean)}`] : [`${kept} / ${grid.cells.length}`],
          question: `What do ${p.label || "these cells"} look like without the others?`,
          changes: `Every other cell steps back; the grid, the order and the colours stay exactly where they were.`,
          parameter: `whether gestures[${k}] keeps only ${p.label || "its cells"}`,
        });
        break;
      }
      case "reorder": {
        const order = orders[k].map((r) => grid.rows[r].label);
        Object.assign(control, {
          legend: `${order[0]} …`,
          chip: order.slice(0, 2).join(", "),
          pieces: [order.map((n, i) => `${i + 1}. ${n}`).join(" ")],
          question: `What does the grid look like with ${order[0]} first?`,
          changes: `The named rows move to the top and every other row keeps its order; no cell changes colour.`,
          parameter: `the order gestures[${k}] asks for`,
        });
        break;
      }
    }
    controls.push(control);
  });
  return { resting, controls };
}

/** The interaction declaration renderWeb holds the page against: ask-a-mark on every cell, then one control per gesture. */
export function cellInteractionPlan({ scheduled, grid }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What is this cell actually worth, and where does it rank in its column?",
    gesture: "ask-a-mark",
    changes: "The cell answers with its exact value and its rank among the cells of its column — what a colour class cannot say.",
    parameter: "which cell is asked about",
    authorPicked: grid.cells[0].name,
    readerPicks: "every mark",
    heldStill: HELD,
  };
  const controls = scheduled.controls.map((c) => ({ question: c.question, gesture: c.atom, changes: c.changes, parameter: c.parameter, authorPicked: "on", readerPicks: ["rest", "on"], heldStill: HELD }));
  return {
    earns:
      `A still of these ${grid.cells.length} cells draws every gesture at once and prints only the class each value falls in. ` +
      `Here the reader lands on the resting grid, asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every cell answers with its exact value.`,
    controls: [ask, ...controls],
  };
}
