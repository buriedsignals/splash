// The INTERVAL family (craft/gestures/GRAMMAR.md §4, F4's interval member, here as its own family): one row per
// entity, its runs as bars on a shared time axis — a gantt. A mark is one ROW, `{ name, value }`, its value the whole
// years the row's runs cover (the length a reader compares); its runs, first and last year are its derived figures.
// Positions are dates, so nothing moves: no reorder, rescale or zoom. Durations of different rows overlap in time and
// do not add up to a whole: `additive: false` (a bracket or count is refused by the core).
//
// Browser-safe: no Node module (the video bundle and the scrolly page import it).
import { GestureRefusal } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";
import { keyedHooks, noteItems, placeNotes, textBox } from "./gesture-keyed.mjs";

export const INTERVAL = "interval";
export const INTERVAL_GESTURES = ["highlight", "name", "annotate", "compare", "filter", "reference", "reveal", "pull-back"];
FAMILIES[INTERVAL] ??= { gestures: INTERVAL_GESTURES, additive: false };

const yearsOf = (runs) => runs.reduce((s, r) => s + r.to - r.from + 1, 0);

/** Validates the beat's rows (adapts, never refuses their shape: a run outside the axis is clipped and said). */
export function intervalRows({ rows, first, last }) {
  if (!Number.isInteger(first) || !Number.isInteger(last) || !(last > first)) throw new Error(`first and last are the axis's whole years (integers, last > first); got ${first} and ${last}`);
  if (!Array.isArray(rows) || !rows.length) throw new Error("rows must be a non-empty array of { name, runs: [{ from, to, open }] }");
  const names = new Set();
  return rows.map((r) => {
    const name = String(r.name ?? r.label ?? r.key ?? "");
    if (!name.trim()) throw new Error(`every row has a name; got ${JSON.stringify(r).slice(0, 80)}`);
    if (names.has(name)) throw new Error(`two rows are named ${name}: give each row all its runs in one row`);
    names.add(name);
    const runs = (r.runs ?? (r.from !== undefined ? [{ from: r.from, to: r.to, open: r.open }] : []))
      .map((run) => ({ from: Math.max(first, Math.round(run.from)), to: Math.min(last, Math.round(run.to)), open: run.open === true || (run.open === undefined && run.to >= last) }))
      .filter((run) => run.to >= run.from)
      .sort((a, b) => a.from - b.from);
    // A row with no run inside the axis is drawn as its empty track (0 years), never refused: a 12B gantt lost a whole
    // run on a country whose runs all fell outside it.
    return { name, runs, years: yearsOf(runs) };
  });
}

/** The marks the core reads: one per row, its value the years held. */
export const intervalMarks = (rows) => rows.map((r) => ({ name: r.name, value: r.years }));

/** A row's own figures beside its years: each run's length, its run count (years are not figures to the core). */
export const intervalDerived = (rows) => {
  const by = new Map(rows.map((r) => [r.name, r]));
  return (m) => {
    const r = by.get(m.name);
    return r ? [...r.runs.map((run) => run.to - run.from + 1), r.runs.length] : [];
  };
};

/** The family's checks: a rule sits inside the axis; a highlight or filter may state how many rows it holds. */
export function intervalHooks({ first, last }) {
  return keyedHooks({
    figures: (g, ctx) => (["highlight", "filter"].includes(g.do) ? [ctx.marks.length] : []),
    refuse(g, ctx) {
      if (g.do === "reference") {
        const v = Number(g.value);
        if (!Number.isFinite(v) || v < first || v > last + 1)
          throw new GestureRefusal(`gestures[${ctx.index}].value`, `a reference on a gantt is a year on its axis, ${first} to ${last}; ${g.value} is not on it`, {
            set: { index: ctx.index, field: "value", value: Math.min(last, Math.max(first, Math.round(Number.isFinite(v) ? v : first))) },
          });
      }
    },
  });
}

/** Each mark's lit unit: the row itself. */
export const intervalUnit = (m) => [m];

/**
 * The scene, in plot px (origin top-left of the plot box): names in a gutter, a faint track per row, the runs as bars
 * on the time axis, year ticks under the rows, the overlays (a compare's copy, a reference rule) and every note placed
 * clear of the words. Many rows thin the bars and, past the names' floor, print only the names gestures act on.
 */
export function intervalScene({ rows, first, last, plan, box, measure, lead, format = String, spanLabel }) {
  const nameW = Math.max(...rows.map((r) => measure(r.name, "axis")));
  const gutter = Math.min(box.width * 0.34, nameW + 14);
  const tickH = lead("axis") * 1.6;
  const plotH = box.height - tickH;
  const pitch = plotH / rows.length;
  const bar = Math.max(2, Math.min(pitch * 0.62, 18));
  const x = (year) => gutter + ((year - first) / (last + 1 - first)) * (box.width - gutter);
  const yMid = (i) => (i + 0.5) * pitch;
  const named = new Set(plan.flatMap((p) => [...p.own, ...(p.against ?? [])]));
  const roomy = pitch >= lead("axis") * 0.92;

  const furniture = [];
  const texts = [];
  const marks = rows.map((r, i) => {
    furniture.push({ tag: "rect", role: "track", attrs: { x: x(first), y: yMid(i) - bar / 2, width: x(last + 1) - x(first), height: bar } });
    const shapes = r.runs.map((run) => ({ tag: "rect", paint: "fill", attrs: { x: x(run.from), y: yMid(i) - bar / 2, width: Math.max(1, x(run.to + 1) - x(run.from)), height: bar } }));
    const lastRun = r.runs.at(-1) ?? { from: first, to: first - 1 };
    const longest = [...r.runs].sort((a, b) => b.to - b.from - (a.to - a.from))[0] ?? lastRun;
    const left = x(r.runs[0]?.from ?? first);
    const right = Math.max(left, x(lastRun.to + 1));
    if (roomy || named.has(r.name)) texts.push({ text: r.name, x: gutter - 8, y: yMid(i) + lead("axis") * 0.3, anchor: "end", reg: "axis", role: "name", mark: i, width: measure(r.name, "axis") });
    return {
      i,
      name: r.name,
      shapes,
      ring: { tag: "rect", attrs: { x: left - 2, y: yMid(i) - bar / 2 - 2, width: right - left + 4, height: bar + 4, rx: 2 } },
      anchor: { x: right, y: yMid(i) },
      hit: { x: (x(longest.from) + x(longest.to + 1)) / 2, y: yMid(i), r: Math.max(4, Math.min(9, bar / 2)) },
      detail: `${r.name} · ${r.years} · ${spanLabel ? spanLabel(r) : r.runs.map((run) => (run.from === run.to ? `${run.from}` : `${run.from}–${run.open ? "" : run.to}`)).join(", ")}`,
    };
  });

  // Year ticks: the first and last always (an open run ends flush with the axis), the fives between where they clear.
  const ticks = [first];
  const yw = (y) => measure(String(y), "axis");
  for (let y = Math.ceil((first + 1) / 5) * 5; y < last; y += 5) {
    const prev = ticks.at(-1);
    if (x(y) - yw(y) / 2 > x(prev) + yw(prev) / (prev === first ? 1 : 2) + 8 && x(y) + yw(y) / 2 < x(last) - yw(last) / 2 - 8) ticks.push(y);
  }
  ticks.push(last);
  for (const y of ticks) {
    const at = y === last ? x(last + 1) : x(y);
    furniture.push({ tag: "line", role: "grid", attrs: { x1: at, x2: at, y1: 0, y2: plotH } });
    texts.push({ text: String(y), x: at, y: plotH + lead("axis") * 1.1, anchor: y === first ? "start" : y === last ? "end" : "middle", reg: "axis", role: "tick", width: yw(y) });
  }

  const at = new Map(rows.map((r, i) => [r.name, i]));
  const overlays = [];
  for (const p of plan) {
    if (p.do === "compare") {
      const i = at.get(p.own[0]);
      const from = x(rows[i].runs[0]?.from ?? first);
      const end = from + (p.b / (last + 1 - first)) * (box.width - gutter);
      const y = yMid(i) + bar / 2 + 2;
      const text = p.label;
      overlays.push({
        k: p.k,
        shapes: [
          { tag: "rect", role: "copy", attrs: { x: from, y, width: Math.max(1, end - from), height: Math.max(2, bar * 0.35) } },
          { tag: "line", role: "rule", attrs: { x1: end, x2: end, y1: yMid(i) - bar / 2 - 2, y2: y + bar * 0.35 + 2 } },
        ],
        label: { text, x: Math.min(end + 6, box.width - measure(text, "annot")), y: y + bar * 0.35 + lead("annot") * 0.85, anchor: "start", reg: "annot", width: measure(text, "annot") },
      });
    } else if (p.do === "reference") {
      const rx = x(p.value);
      const text = p.label;
      const w = measure(text, "annot");
      overlays.push({
        k: p.k,
        shapes: [{ tag: "line", role: "rule", attrs: { x1: rx, x2: rx, y1: -lead("annot") * 0.2, y2: plotH, "stroke-dasharray": "4 3" } }],
        label: { text, x: rx + w + 6 > box.width ? rx - 6 : rx + 6, y: -lead("annot") * 0.35, anchor: rx + w + 6 > box.width ? "end" : "start", reg: "annot", width: w },
      });
    }
  }
  const taken = [...texts.map((t) => textBox(t, lead(t.reg))), ...overlays.filter((o) => o.label).map((o) => textBox(o.label, lead("annot")))];
  const soft = marks.flatMap((m) => m.shapes.map((p) => ({ x: p.attrs.x, y: p.attrs.y, w: p.attrs.width, h: p.attrs.height })));
  const notes = placeNotes({ items: noteItems(plan, (name) => marks[at.get(name)]?.anchor ?? null), taken, soft, box: { width: box.width, height: plotH }, measure, lead });
  return { width: box.width, height: box.height, furniture, marks, texts, overlays, notes, topRoom: lead("annot") };
}

/** The family as the format stagers read it (gesture-keyed.mjs `stageKeyedFormat`); `model` is intervalRows' output
 *  with the axis: { rows, first, last }. */
export const INTERVAL_SPEC = {
  id: INTERVAL,
  what: "row",
  marks: (model) => intervalMarks(model.rows),
  hooks: (model) => intervalHooks(model),
  derived: (model) => intervalDerived(model.rows),
  unitOf: () => intervalUnit,
  scene: (model, args) => intervalScene({ ...model, ...args }),
};
