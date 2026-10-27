// The Position family adapter (craft/gestures/GRAMMAR.md §4 F3, §4.2): marks placed by their value on ONE fitted
// value axis — never anchored at zero (`no-anchor-value-axis`), because a position is not a length — with an
// optional link joining a row's two points. Five types draw it, each a variant of one geometry:
//
//   dumbbell-range-plot  a row per unit, its two points (two moments) on a horizontal axis, the link between them
//   slope-slopegraph     a line per unit between two vertical rails (the two moments), the axis vertical
//   dot-strip            one strip per moment, every unit pinned on it; two moments join each unit by a leader
//   beeswarm             one strip, every unit a circle at its value, packed off the axis, its area its size
//   box-plot             a group per column, its readings as points beside a box (quartiles, median, whiskers)
//
// THE MARKS THE CORE SEES are one per ROW, the unit a story names ("Pologne", "1970s"), never one per point: the
// core reads a mark's value for a compare's gap, a rank word, a reference's axis, and a row's two points read as
// two marks made "Pologne" against "États-Unis" the first point of one against the sum of three others. So a row's
// core value is the figure its type ranks it by — a paired row's CHANGE (to − from), a single row's value, a group's
// MEDIAN — and every other figure the row draws (its two levels, a group's quartiles and whiskers, the field's
// floor, ceiling and median at each moment) is the family's own, given to the core through `hooks.figures`.
//
// Pure geometry and arithmetic, browser-safe (the video bundle, the web page and the scrolly drive's states import
// it): no Node module, no native code. It registers the family at import.
import { FAMILIES } from "./gesture-registry.mjs";
import { GestureRefusal } from "./gesture-core.mjs";

/** What the Position family admits, in every format (the registry removes `zoom` from a still plate). Not `count`
 *  nor `bracket`: positions do not add up to a sum or a share (the core refuses both for a non-additive family).
 *  Not `rescale`: a fitted axis has no top to travel to that a zoom does not already say, with its factor. Not
 *  `trace`: no type here draws a path in the order of its data. */
export const POSITION_GESTURES = ["highlight", "name", "annotate", "compare", "reference", "filter", "zoom", "reorder", "reveal", "pull-back"];

FAMILIES.position ??= { gestures: POSITION_GESTURES, additive: false };

/** Each type's shape: paired rows (two moments), single rows (one value, an optional size) or groups (readings). */
export const VARIANTS = {
  "dumbbell-range-plot": { shape: "paired", axis: "x", orders: true, label: "dumbbell" },
  "slope-slopegraph": { shape: "paired", axis: "y", orders: false, label: "slope" },
  "dot-strip": { shape: "either", axis: "x", orders: false, label: "dot strip" },
  beeswarm: { shape: "single", axis: "x", orders: false, label: "beeswarm" },
  "box-plot": { shape: "groups", axis: "y", orders: true, label: "box plot" },
};

// ── arithmetic ────────────────────────────────────────────────────────────────────────────────────

/** The type-7 quantile (d3-array's, which the per-type box plot draws with), on a copy. */
export function quantile(values, p) {
  const s = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo);
}
export const median = (values) => quantile(values, 0.5);
export const mean = (values) => values.reduce((s, v) => s + v, 0) / values.length;

/** A group's summary, as the per-type box plot computes it: quartiles, 1.5 × IQR whiskers, the readings past them. */
export function summarize(values) {
  const v = values.filter(Number.isFinite);
  const q1 = quantile(v, 0.25);
  const med = quantile(v, 0.5);
  const q3 = quantile(v, 0.75);
  const iqr = q3 - q1;
  const inFence = v.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  const kept = inFence.length ? inFence : v;
  return {
    n: v.length,
    q1,
    median: med,
    q3,
    iqr,
    whiskerLo: Math.min(...kept),
    whiskerHi: Math.max(...kept),
    min: Math.min(...v),
    max: Math.max(...v),
    mean: mean(v),
    outliers: v.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).sort((a, b) => a - b),
  };
}

// ── the model: a beat's rows, normalised ─────────────────────────────────────────────────────────

/**
 * The beat's rows as the family reads them, whatever variant drew them. Never refuses the data's shape: a row missing
 * a reading is left out and counted (`dropped`), so the plate states it; a group with one reading still draws it.
 *
 * @param variant  a VARIANTS slug
 * @param beat     { rows, moments? }: paired rows { name, from, to, code? }, single { name, value, size?, code? },
 *                 groups { name, values: [numbers] }
 * @returns        { variant, shape, rows, moments, core: [{ name, value }], dropped, points }
 */
export function modelOf(variant, beat) {
  const spec = VARIANTS[variant];
  if (!spec) throw new Error(`no Position variant "${variant}": one of ${Object.keys(VARIANTS).join(", ")}`);
  const given = Array.isArray(beat.rows) ? beat.rows : [];
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const paired = spec.shape === "paired" || (spec.shape === "either" && given.some((r) => r && r.from !== undefined && r.to !== undefined));
  const shape = spec.shape === "groups" ? "groups" : paired ? "paired" : "single";
  const rows = [];
  let dropped = 0;
  for (const r of given) {
    if (!r || r.name === undefined) {
      dropped += 1;
      continue;
    }
    const name = String(r.name);
    if (shape === "paired") {
      if (!finite(r.from) || !finite(r.to)) dropped += 1;
      else rows.push({ name, code: r.code === undefined ? undefined : String(r.code), from: r.from, to: r.to, change: r.to - r.from, value: r.to - r.from });
    } else if (shape === "single") {
      if (!finite(r.value)) dropped += 1;
      else rows.push({ name, code: r.code === undefined ? undefined : String(r.code), value: r.value, size: finite(r.size) && r.size > 0 ? r.size : undefined });
    } else {
      const values = (Array.isArray(r.values) ? r.values : []).map((v) => (typeof v === "object" && v ? v.value : v)).filter(finite);
      const labels = (Array.isArray(r.values) ? r.values : []).filter((v) => typeof v === "object" && v && finite(v.value)).map((v) => String(v.name ?? ""));
      if (!values.length) dropped += 1;
      else {
        const stats = summarize(values);
        rows.push({ name, values, labels: labels.length === values.length ? labels : undefined, stats, value: stats.median });
      }
    }
  }
  const moments = shape === "paired" ? [String(beat.moments?.[0] ?? "from"), String(beat.moments?.[1] ?? "to")] : [];
  return {
    variant,
    shape,
    spec,
    rows,
    moments,
    dropped,
    core: rows.map((r) => ({ name: r.name, value: r.value })),
    sized: shape === "single" && rows.some((r) => r.size !== undefined),
  };
}

/** Every value a row draws on the axis: its two levels, its value, or its readings. */
export function levelsOf(row) {
  if (row.from !== undefined) return [row.from, row.to];
  if (row.values) return row.values;
  return [row.value];
}

/** The field's own figures at each moment: floor, ceiling, median, mean, spread — and how each moved. */
export function fieldStats(model) {
  const out = {};
  const at = (vals) => ({ floor: Math.min(...vals), ceiling: Math.max(...vals), median: median(vals), mean: mean(vals), spread: Math.max(...vals) - Math.min(...vals), n: vals.length });
  if (!model.rows.length) return out;
  if (model.shape === "paired") {
    out.from = at(model.rows.map((r) => r.from));
    out.to = at(model.rows.map((r) => r.to));
    out.change = Object.fromEntries(Object.keys(out.from).map((k) => [k, out.to[k] - out.from[k]]));
  } else if (model.shape === "single") {
    out.all = at(model.rows.map((r) => r.value));
    if (model.sized) {
      const people = model.rows.reduce((s, r) => s + (r.size ?? 0), 0);
      out.all.weightedMean = model.rows.reduce((s, r) => s + r.value * (r.size ?? 0), 0) / people;
      out.all.size = people;
    }
  } else {
    out.all = at(model.rows.flatMap((r) => r.values));
    out.medians = at(model.rows.map((r) => r.stats.median));
  }
  return out;
}

const statFigures = (s) => (s ? [s.floor, s.ceiling, s.median, s.mean, s.spread, s.n, s.weightedMean].filter(Number.isFinite) : []);

/** The figures one row draws beside its core value. */
function rowFigures(row) {
  if (row.from !== undefined) return [row.from, row.to, row.change, Math.abs(row.change)];
  if (row.stats) {
    const s = row.stats;
    return [s.median, s.q1, s.q3, s.iqr, s.whiskerLo, s.whiskerHi, s.min, s.max, s.mean, s.n, ...s.outliers];
  }
  return [row.value, ...(row.size !== undefined ? [row.size] : [])];
}

/** The field statistic a row holds (it is the floor or the ceiling at a moment): its note may state that figure. */
function heldStats(model, row, field) {
  const out = [];
  if (model.shape === "paired") {
    for (const [k, key] of [["from", "from"], ["to", "to"]]) {
      if (row[key] === field[k].floor) out.push(field[k].floor, field.change.floor, Math.abs(field.change.floor));
      if (row[key] === field[k].ceiling) out.push(field[k].ceiling, field.change.ceiling, Math.abs(field.change.ceiling));
    }
  } else if (model.shape === "single") {
    if (row.value === field.all.floor || row.value === field.all.ceiling) out.push(field.all.spread);
  } else if (row.stats.median === field.medians.ceiling || row.stats.median === field.medians.floor) out.push(field.medians.spread);
  return out;
}

// ── the core's hooks ──────────────────────────────────────────────────────────────────────────────

/**
 * The family's figures and refusals for validateGestures. A figure is admitted only where the gesture draws it: a
 * row's own levels or summary on a gesture that acts on the row, the gaps between two compared rows' levels at each
 * moment, the field's floor, ceiling, median and mean on a gesture that acts on the whole field (a reference, a
 * filter, a reveal, a pull-back), and on the row that holds one.
 */
export function positionHooks(model) {
  const byName = new Map(model.rows.map((r) => [r.name, r]));
  const field = fieldStats(model);
  const everyField = [
    ...Object.values(field).flatMap((s) => statFigures(s)),
    ...(field.change ? Object.values(field.change).flatMap((v) => [v, Math.abs(v)]) : []),
  ];
  const shareAbove = (v) => {
    const total = model.rows.reduce((s, r) => s + (r.size ?? 1), 0);
    const levels = model.rows.map((r) => ({ r, at: r.to ?? r.value ?? r.stats?.median }));
    const above = levels.filter((x) => x.at > v);
    const sizeAbove = above.reduce((s, x) => s + (x.r.size ?? 1), 0);
    return [above.length, levels.length - above.length, (sizeAbove / total) * 100, ((total - sizeAbove) / total) * 100];
  };
  return {
    figures(g, ctx) {
      const rows = ctx.marks.map((m) => byName.get(m)).filter(Boolean);
      const out = rows.flatMap(rowFigures);
      rows.forEach((r) => out.push(...heldStats(model, r, field)));
      if (g.do === "compare" && rows.length >= 2) {
        const [a, b] = rows;
        if (a.from !== undefined) out.push(a.from - b.from, b.from - a.from, a.to - b.to, b.to - a.to, Math.abs(a.from - b.from), Math.abs(a.to - b.to), a.change - b.change, a.change / b.change, b.change / a.change);
        else if (a.stats) out.push(a.stats.median - b.stats.median, b.stats.median - a.stats.median, a.stats.median / b.stats.median, b.stats.median / a.stats.median, a.stats.q3 - b.stats.q3, a.stats.q1 - b.stats.q1);
        else if (a.size !== undefined && b.size !== undefined) out.push(a.size / b.size, b.size / a.size);
      }
      if (["reference", "filter", "reveal", "pull-back", "zoom"].includes(g.do)) out.push(...everyField, model.rows.length);
      // Several rows in the accent, or kept by a filter, are drawn as a set: its count is on the plate.
      if ((g.do === "highlight" || g.do === "filter") && rows.length > 1) out.push(rows.length);
      if (g.do === "reference" && Number.isFinite(Number(g.value))) out.push(...shareAbove(Number(g.value)));
      if (g.do === "filter" && rows.length) {
        const kept = rows.map((r) => r.to ?? r.value ?? r.stats?.median);
        out.push(rows.length, Math.min(...kept), Math.max(...kept), median(kept));
        if (model.sized) out.push((rows.reduce((s, r) => s + (r.size ?? 0), 0) / field.all.size) * 100);
      }
      return out;
    },
    refuse(g, ctx) {
      const i = ctx.index;
      const entities = model.rows.map((r) => r.name);
      if (g.do === "compare" && (g.of === "whole" || ctx.marks.length > 2)) {
        // Positions add up to nothing: a row is compared with ONE other row, never with a whole or a sum of rows.
        const subject = ctx.marks[0];
        const other = ctx.marks.find((m) => m !== subject) ?? entities.find((n) => n !== subject);
        throw new GestureRefusal(
          `gestures[${i}].marks`,
          `a ${model.spec.label} places each row at its value, and positions do not add up: compare ${subject} with ONE other row`,
          other === undefined ? { remove: i } : { set: { index: i, value: { ...Object.fromEntries(Object.entries(g).filter(([k]) => k !== "of" && k !== "mark" && k !== "note")), marks: [subject, other] } } },
        );
      }
      if (g.do === "reorder" && !model.spec.orders)
        throw new GestureRefusal(
          `gestures[${i}].do`,
          `a ${model.spec.label} has no row order to change — every mark's place is its value (no-let-point-move): drop the reorder`,
          { remove: i },
        );
    },
  };
}

// ── states ────────────────────────────────────────────────────────────────────────────────────────

const niceStep = (span, count) => {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * power;
};

/** A fitted domain over values, widened to round ticks; never pulled to zero (a position is not a length). */
export function fitDomain(values, count = 5) {
  const v = values.filter(Number.isFinite);
  let lo = Math.min(...v);
  let hi = Math.max(...v);
  if (!(hi > lo)) {
    const d = Math.abs(lo) * 0.1 || 1;
    lo -= d;
    hi += d;
  }
  const step = niceStep(hi - lo, count);
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

export function ticksOf([lo, hi], count = 5) {
  const step = niceStep(hi - lo, count);
  const out = [];
  for (let t = Math.ceil(lo / step - 1e-9) * step; t <= hi + step * 1e-6; t += step) out.push(Math.round(t / step) * step);
  return out;
}

/**
 * The family's states and locks. A state is a flat record: { domain, order, accent, rings, back, hidden, compares,
 * references, notes, window, factor, factorPrinted, reveal }. A mark's place is always computed from its value and
 * the state's domain — no state can carry a position of its own (`no-let-point-move`).
 */
export function createPosition({ model, domain }) {
  const byName = new Map(model.rows.map((r) => [r.name, r]));
  const all = model.rows.flatMap(levelsOf);
  const restDomain = Array.isArray(domain) && domain.length === 2 && domain.every(Number.isFinite) && domain[1] > domain[0]
    ? [Math.min(domain[0], ...all), Math.max(domain[1], ...all)]
    : fitDomain(all);

  const rest = () => ({
    domain: [...restDomain],
    order: model.rows.map((r) => r.name),
    accent: [],
    rings: [],
    back: [],
    hidden: [],
    compares: [],
    references: [],
    notes: [],
    window: null,
    factor: 1,
    factorPrinted: false,
    reveal: 1,
  });

  const with_ = (state, patch) => ({ ...state, ...patch });

  function order(state, how) {
    const at = (n) => byName.get(n).value;
    const ids = Array.isArray(how) ? [...how, ...state.order.filter((n) => !how.includes(n))] : [...state.order].sort((a, b) => (how === "ascending" ? at(a) - at(b) : at(b) - at(a)));
    return with_(state, { order: ids });
  }

  /** A zoom onto rows: the domain fitted to their levels (and the references already ruled), its factor computed. */
  function window(state, ids, extra = []) {
    const vals = [...ids.flatMap((id) => levelsOf(byName.get(id))), ...extra];
    let [lo, hi] = [Math.min(...vals), Math.max(...vals)];
    const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.12;
    [lo, hi] = [lo - pad, hi + pad];
    const span = restDomain[1] - restDomain[0];
    lo = Math.max(restDomain[0], lo);
    hi = Math.min(restDomain[1], hi);
    return with_(state, { domain: [lo, hi], window: [...ids], factor: span / (hi - lo), factorPrinted: false });
  }

  const factor = (state) => (restDomain[1] - restDomain[0]) / (state.domain[1] - state.domain[0]);

  const normal = (s) => JSON.stringify({ ...s, accent: [...s.accent].sort(), rings: [...s.rings].sort(), back: [...s.back].sort(), hidden: [...s.hidden].sort() });
  const equal = (a, b) => normal(a) === normal(b);

  /**
   * The family's locks over a sequence of states: a zoom prints its factor (no-let-camera-magnification), and every
   * state after a comparison stands on that comparison's scale unless it is a zoom (no-float-baseline-rescale).
   */
  function invariants(states) {
    let comparedOn = null;
    states.forEach((s, i) => {
      if (s.window && !s.factorPrinted)
        throw new Error(`state ${i} zooms ×${factor(s).toFixed(1)} without printing it (no-let-camera-magnification): write the factor in the zoom's note`);
      if (comparedOn && !s.window && (s.domain[0] !== comparedOn[0] || s.domain[1] !== comparedOn[1]))
        throw new Error(`state ${i} moves the axis after a comparison, so the compared shots stand on two scales (no-float-baseline-rescale)`);
      if (s.compares.length) comparedOn ??= s.domain;
    });
  }

  function derive(op, ids) {
    const rows = ids.map((id) => byName.get(id));
    switch (op) {
      case "diff":
        return rows[0].value - rows[1].value;
      case "ratio":
        return rows[0].value / rows[1].value;
      case "rank":
        return [...model.rows].sort((a, b) => b.value - a.value).findIndex((r) => r.name === ids[0]) + 1;
      case "count":
        return ids.length;
      case "median":
        return median(rows.flatMap(levelsOf));
      case "mean":
        return mean(rows.flatMap(levelsOf));
      case "floor":
        return Math.min(...rows.flatMap(levelsOf));
      case "ceiling":
        return Math.max(...rows.flatMap(levelsOf));
      case "quartiles": {
        const v = rows.flatMap(levelsOf);
        return [quantile(v, 0.25), quantile(v, 0.75)];
      }
      default:
        throw new Error(`no ${op} on the Position family`);
    }
  }

  return { family: "position", model, rest, with: with_, order, window, factor, equal, invariants, derive, restDomain, row: (n) => byName.get(n) };
}

/** Labels on one line that would touch are stacked: each takes the first level where it clears the ones before. */
function levelsOf_(items, gap = 6, maxLevels = 8) {
  // Each item: { name, x0, x1, at } — `at` is where its leader drops from the label to its mark. A label never
  // overlaps another; it avoids sitting across another's leader where a level allows it (labels wider than the
  // marks' spacing cannot always), then takes the free level whose leaders cross it least.
  const placed = [];
  const out = new Map();
  for (const it of [...items].sort((a, b) => a.x0 - b.x0)) {
    const at = it.at ?? (it.x0 + it.x1) / 2;
    let best = null;
    for (let k = 0; k < Math.max(maxLevels, placed.length + 1); k++) {
      if (placed.some((p) => p.level === k && p.x0 < it.x1 + gap && it.x0 < p.x1 + gap)) continue;
      const crossings = placed.filter((p) => (p.level < k && p.at > it.x0 - 3 && p.at < it.x1 + 3) || (p.level > k && at > p.x0 - 3 && at < p.x1 + 3)).length;
      if (!best || crossings < best.crossings) best = { k, crossings };
      if (crossings === 0) break;
    }
    placed.push({ ...it, at, level: best.k });
    out.set(it.name, best.k);
  }
  return out;
}

// ── the scene: one state drawn as primitives ──────────────────────────────────────────────────────

/**
 * Where everything of one state sits, in a plot frame's own units. Every format draws THIS: the still plate once,
 * the web page once per plate, the video between two event states, the scrolly page by interpolating the numbers of
 * two cards. Primitives carry a stable `id`, so two scenes of one beat interpolate attribute by attribute; a
 * primitive absent from a scene is absent (opacity 0) there.
 *
 * Kinds: `line` {x1,y1,x2,y2}, `circle` {cx,cy,r}, `rect` {x,y,width,height}, `text` {x,y} with `text`, `anchor`
 * ("start" | "middle" | "end"), `reg` (the register: axis, annot, value) and `role`. Every primitive has `o` (opacity)
 * and a colour `role`: ink, muted, neutral, accent, early (a paired row's first point), copy, rule, grid.
 *
 * @param model   modelOf()
 * @param state   a createPosition() state
 * @param frame   { x, y, width, height } the plot, labels included
 * @param text    { measure(text, reg) → width, lead(reg) → line height, format(v), delta(v), moments, unit }
 */
export function sceneOf({ model, state, frame, text }) {
  const prims = [];
  const add = (p) => (prims.push({ o: 1, ...p }), p);
  const byName = new Map(model.rows.map((r) => [r.name, r]));
  const [lo, hi] = state.domain;
  const accent = new Set(state.accent);
  const rings = new Set(state.rings);
  const back = new Set(state.back);
  const hidden = new Set(state.hidden);
  const shownRows = state.order.filter((n) => byName.has(n));
  const n = shownRows.length;
  const revealOf = (name) => {
    // Marks appear in their natural order (rank by the core value), a reveal at 0..1 of the way.
    if (state.reveal >= 1) return 1;
    const rank = [...model.rows].sort((a, b) => b.value - a.value).findIndex((r) => r.name === name);
    return Math.max(0, Math.min(1, state.reveal * model.rows.length - rank));
  };
  const opacityOf = (name) => (hidden.has(name) ? 0 : (back.has(name) ? 0.28 : 1) * revealOf(name));
  const colourOf = (name) => (accent.has(name) ? "accent" : "neutral");
  const lead = (reg) => text.lead(reg);
  const W = (t, reg) => text.measure(t, reg);
  const variant = model.variant;
  const out = { prims, plot: null, anchors: new Map(), axis: null, variant };

  // Labels' room around the plot itself.
  const valueAxis = model.spec.axis;
  const tickReg = "axis";
  const tickH = lead(tickReg);
  const fmt = (v) => text.format(v);
  // A tick on a whole number prints no decimals ("72", not "72,0"): the format's decimals belong to readings.
  const fmtTick = (t) => ((t = t || 0), Number.isInteger(t) ? String(text.format(t)).replace(/[.,]0+(?=\D*$)/, "") : text.format(t));
  const ticks = ticksOf([lo, hi]).filter((t) => t >= lo - 1e-9 && t <= hi + 1e-9);

  let plot;
  let pos;
  if (variant === "dumbbell-range-plot") {
    // On a web page the names stand in the page's own gutter, outside the stretched plot (text.namesOutside).
    const nameW = text.namesOutside ? 0 : Math.min(frame.width * 0.3, Math.max(...shownRows.map((r) => W(r, "axis")), 10) + 10);
    const deltaW = Math.max(...model.rows.map((r) => W(text.delta(r.change), "value")), 10) + 14;
    plot = { x: frame.x + nameW, y: frame.y + tickH + 4, width: frame.width - nameW - deltaW, height: frame.height - tickH * 2 - 8 };
    pos = (v) => plot.x + ((v - lo) / (hi - lo)) * plot.width;
    const pitch = plot.height / Math.max(1, n);
    const r = Math.max(2.5, Math.min(lead("value") * 0.32, pitch * 0.22));
    // The two moments, keyed once above the rows: a hollow point, a full point (drawn, not typed glyphs).
    const ky = frame.y + tickH * 0.8;
    const k0 = text.moments[0];
    const k1 = text.moments[1];
    add({ id: "key-from-dot", kind: "circle", cx: plot.x + r, cy: ky, r, role: "early", ring: "neutral" });
    add({ id: "key-from", kind: "text", x: plot.x + 2 * r + 5, y: ky, text: k0, anchor: "start", reg: "axis", role: "muted" });
    const k1x = plot.x + 2 * r + 5 + W(k0, "axis") + 16;
    add({ id: "key-to-dot", kind: "circle", cx: k1x + r, cy: ky, r, role: "neutral" });
    add({ id: "key-to", kind: "text", x: k1x + 2 * r + 5, y: ky, text: k1, anchor: "start", reg: "axis", role: "muted" });
    shownRows.forEach((name, i) => {
      const row = byName.get(name);
      const y = plot.y + (i + 0.5) * pitch;
      const o = opacityOf(name);
      const [a, b] = [pos(row.from), pos(row.to)];
      add({ id: `link-${name}`, kind: "line", x1: a, y1: y, x2: b, y2: y, o, role: colourOf(name), w: Math.max(1.5, r * 0.55) });
      add({ id: `p0-${name}`, kind: "circle", cx: a, cy: y, r, o, role: "early", ring: colourOf(name) });
      add({ id: `p1-${name}`, kind: "circle", cx: b, cy: y, r, o, role: colourOf(name) });
      if (!text.namesOutside) add({ id: `name-${name}`, kind: "text", x: plot.x - 10, y, text: name, anchor: "end", reg: "axis", role: accent.has(name) || rings.has(name) ? "ink" : "muted", bold: accent.has(name) || rings.has(name), o: o || (hidden.has(name) ? 0 : o) });
      add({ id: `delta-${name}`, kind: "text", x: frame.x + frame.width, y, text: text.delta(row.change), anchor: "end", reg: "value", role: accent.has(name) ? "accent" : "muted", o });
      if (rings.has(name)) add({ id: `ring-${name}`, kind: "rect", x: Math.min(a, b) - r - 4, y: y - r - 4, width: Math.abs(b - a) + 2 * r + 8, height: 2 * r + 8, o, role: "ink", stroke: true });
      out.anchors.set(name, { x: Math.max(a, b) + r, y, top: y - r, side: "after", rowY: y, pitch });
    });
  } else if (variant === "slope-slopegraph") {
    // On a web page (text.namesOutside) the words stand inside the rails, so a narrow window cannot push them out.
    const inside = !!text.web;
    const labelW = inside ? 8 : Math.min(frame.width * 0.3, Math.max(...model.rows.map((r) => W(`${fmt(r.to)}  ${r.name}`, "annot")), 10) + 12);
    const leftW = inside ? 8 : Math.max(...model.rows.map((r) => W(fmt(r.from), "value")), 10) + 12;
    plot = { x: frame.x + leftW, y: frame.y + lead("axis") + 8, width: Math.max(80, frame.width - leftW - labelW), height: frame.height - lead("axis") - 16 };
    pos = (v) => plot.y + plot.height - ((v - lo) / (hi - lo)) * plot.height;
    const [xa, xb] = [plot.x, plot.x + plot.width];
    add({ id: "rail-0", kind: "line", x1: xa, y1: plot.y, x2: xa, y2: plot.y + plot.height, role: "rule" });
    add({ id: "rail-1", kind: "line", x1: xb, y1: plot.y, x2: xb, y2: plot.y + plot.height, role: "rule" });
    add({ id: "rail-name-0", kind: "text", x: xa, y: frame.y + lead("axis") * 0.8, text: text.moments[0], anchor: "middle", reg: "axis", role: "muted" });
    add({ id: "rail-name-1", kind: "text", x: xb, y: frame.y + lead("axis") * 0.8, text: text.moments[1], anchor: "middle", reg: "axis", role: "muted" });
    // End labels dodge each other along the rail: a slope prints every end it draws.
    const dodge = (items, h) => {
      const sorted = [...items].sort((p, q) => p.y - q.y);
      const [top, bottom] = [plot.y, plot.y + plot.height];
      for (let k = 1; k < sorted.length; k++) sorted[k].y = Math.max(sorted[k].y, sorted[k - 1].y + h);
      if (sorted.length && sorted.at(-1).y > bottom) sorted.at(-1).y = bottom;
      for (let k = sorted.length - 2; k >= 0; k--) sorted[k].y = Math.min(sorted[k].y, sorted[k + 1].y - h);
      if (sorted.length && sorted[0].y < top) {
        sorted[0].y = top;
        for (let k = 1; k < sorted.length; k++) sorted[k].y = Math.max(sorted[k].y, sorted[k - 1].y + h);
      }
      return new Map(sorted.map((s) => [s.name, s.y]));
    };
    const lh = Math.max(lead("value"), lead("annot")) * 0.95;
    // A rail holds as many end labels as its height: the rows a gesture marks first, then the extremes inward. A
    // line past that is drawn without its labels (never a label printed over another).
    const room = Math.max(1, Math.floor(plot.height / lh));
    const byChange = [...shownRows.filter((nme) => !hidden.has(nme))].sort((p, q) => byName.get(q).change - byName.get(p).change);
    const priority = [...new Set([...shownRows.filter((nme) => !hidden.has(nme) && (accent.has(nme) || rings.has(nme) || state.compares.some((c) => c.subject === nme || c.other === nme))), ...byChange.flatMap((nme, k) => [nme, byChange[byChange.length - 1 - k]])])];
    const visible = priority.slice(0, room);
    const leftY = dodge(visible.map((nme) => ({ name: nme, y: pos(byName.get(nme).from) })), lh);
    const rightY = dodge(visible.map((nme) => ({ name: nme, y: pos(byName.get(nme).to) })), lh);
    // Thread rows drawn last, over the context.
    const ordered = [...shownRows.filter((nme) => !accent.has(nme) && !rings.has(nme)), ...shownRows.filter((nme) => accent.has(nme) || rings.has(nme))];
    ordered.forEach((name) => {
      const row = byName.get(name);
      const o = opacityOf(name);
      const [ya, yb] = [pos(row.from), pos(row.to)];
      const strong = accent.has(name) || rings.has(name);
      add({ id: `link-${name}`, kind: "line", x1: xa, y1: ya, x2: xb, y2: yb, o, role: colourOf(name), w: strong ? 2.6 : 1.4 });
      add({ id: `p0-${name}`, kind: "circle", cx: xa, cy: ya, r: strong ? 4 : 3, o, role: colourOf(name) });
      add({ id: `p1-${name}`, kind: "circle", cx: xb, cy: yb, r: strong ? 4 : 3, o, role: colourOf(name) });
      const labelled = leftY.has(name);
      const lift = inside ? lh * 0.6 * (yb >= ya ? 1 : -1) : 0;
      add({ id: `v0-${name}`, kind: "text", x: inside ? xa + 8 : xa - 8, y: (leftY.get(name) ?? ya) - lift, text: fmt(row.from), anchor: inside ? "start" : "end", reg: "value", role: accent.has(name) ? "accent" : "muted", o: labelled ? o : 0 });
      add({ id: `name-${name}`, kind: "text", x: inside ? xb - 8 : xb + 8, y: (rightY.get(name) ?? yb) - lift, text: `${fmt(row.to)}  ${name}`, anchor: inside ? "end" : "start", reg: "annot", role: accent.has(name) ? "accent" : strong ? "ink" : "muted", bold: strong, o: labelled ? o : 0 });
      if (rings.has(name)) add({ id: `ring-${name}`, kind: "circle", cx: xb, cy: yb, r: 9, o, role: "ink", stroke: true });
      out.anchors.set(name, { x: (xa + xb) / 2, y: (ya + yb) / 2, top: Math.min(ya, yb), side: "above", rowY: (ya + yb) / 2 });
    });
  } else if (variant === "dot-strip" || variant === "beeswarm") {
    const strips = model.shape === "paired" ? 2 : 1;
    const gutter = model.shape === "paired" ? Math.max(...text.moments.map((m) => W(m, "axis"))) + 12 : 0;
    plot = { x: frame.x + gutter, y: frame.y, width: frame.width - gutter - 6, height: frame.height - tickH - 6 };
    pos = (v) => plot.x + ((v - lo) / (hi - lo)) * plot.width;
    const band = plot.height / strips;
    const chipR = variant === "beeswarm" ? null : Math.max(3, Math.min(6, band * 0.06));
    if (variant === "dot-strip") {
      for (let s = 0; s < strips; s++) {
        const y = plot.y + band * (s + 0.5);
        add({ id: `strip-${s}`, kind: "line", x1: plot.x, y1: y, x2: plot.x + plot.width, y2: y, role: "rule" });
        if (strips === 2) add({ id: `strip-name-${s}`, kind: "text", x: frame.x, y, text: text.moments[s], anchor: "start", reg: "axis", role: "muted" });
      }
      const stripY = (s) => plot.y + band * (s + 0.5);
      const ordered = [...shownRows.filter((nme) => !accent.has(nme) && !rings.has(nme)), ...shownRows.filter((nme) => accent.has(nme) || rings.has(nme))];
      ordered.forEach((name) => {
        const row = byName.get(name);
        const o = opacityOf(name);
        const strong = accent.has(name) || rings.has(name);
        if (model.shape === "paired") {
          const [a, b] = [pos(row.from), pos(row.to)];
          add({ id: `link-${name}`, kind: "line", x1: a, y1: stripY(0), x2: b, y2: stripY(1), o: o * (strong ? 1 : 0.55), role: strong ? colourOf(name) : "grid", w: strong ? 2 : 1 });
          add({ id: `p0-${name}`, kind: "circle", cx: a, cy: stripY(0), r: chipR, o, role: colourOf(name) });
          add({ id: `p1-${name}`, kind: "circle", cx: b, cy: stripY(1), r: chipR, o, role: colourOf(name) });
          if (strong) {
            add({ id: `name-${name}`, kind: "text", x: a, y: stripY(0) - chipR - lead("annot") * 0.6, text: row.code ?? name, anchor: "middle", reg: "annot", role: accent.has(name) ? "accent" : "ink", bold: true, o });
            add({ id: `delta-${name}`, kind: "text", x: b, y: stripY(1) + chipR + lead("value") * 0.75, text: text.delta(row.change), anchor: "middle", reg: "value", role: accent.has(name) ? "accent" : "ink", o });
          }
          if (rings.has(name)) add({ id: `ring-${name}`, kind: "circle", cx: b, cy: stripY(1), r: chipR + 4, o, role: "ink", stroke: true });
          out.anchors.set(name, { x: b, y: stripY(1), top: stripY(0) - chipR - lead("annot") * 1.4, side: "above", rowY: stripY(1) });
        } else {
          const x = pos(row.value);
          add({ id: `p1-${name}`, kind: "circle", cx: x, cy: stripY(0), r: chipR, o, role: colourOf(name) });
          if (strong) add({ id: `name-${name}`, kind: "text", x, y: stripY(0) - chipR - lead("annot") * 0.6, text: row.code ?? name, anchor: "middle", reg: "annot", role: accent.has(name) ? "accent" : "ink", bold: true, o });
          if (rings.has(name)) add({ id: `ring-${name}`, kind: "circle", cx: x, cy: stripY(0), r: chipR + 4, o, role: "ink", stroke: true });
          out.anchors.set(name, { x, y: stripY(0), top: stripY(0) - chipR - lead("annot") * 1.4, side: "above", rowY: stripY(0) });
        }
      });
    } else {
      // THE SWARM: circles at their value, area their size, packed off the axis line in both directions — the
      // packing is layout, the x is data (no-stack-chips-sideways).
      const axisY = plot.y + plot.height * 0.55;
      add({ id: "swarm-axis", kind: "line", x1: plot.x, y1: axisY, x2: plot.x + plot.width, y2: axisY, role: "rule" });
      const sizes = model.rows.map((r) => r.size ?? 1);
      const maxSize = Math.max(...sizes);
      const area = (plot.width * plot.height * 0.07) / Math.max(1, sizes.reduce((s, v) => s + v, 0) / maxSize);
      const rMax = Math.min(plot.height * 0.13, Math.max(4, Math.sqrt(area / Math.PI)));
      const radius = (row) => (model.sized ? Math.max(1.6, rMax * Math.sqrt((row.size ?? 0) / maxSize)) : Math.max(2.5, Math.min(7, (plot.width / Math.max(1, n)) * 1.6)));
      const placed = [];
      const order = [...model.rows].sort((a, b) => (b.size ?? 1) - (a.size ?? 1) || a.value - b.value);
      for (const row of order) {
        const x = pos(row.value);
        const r = radius(row);
        // The nearest free place off the axis, inside the plot; where none is free, the least-crowded one.
        let best = null;
        let least = { dy: 0, hit: Infinity };
        const step = Math.max(0.8, r * 0.3);
        for (let k = 0; k < 2000; k++) {
          const dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
          const y = axisY + dy;
          if (y - r < plot.y + lead("annot") * 0.4 && y + r > plot.y + plot.height) break;
          if (y - r < plot.y || y + r > plot.y + plot.height) continue;
          const hit = placed.reduce((h, p) => h + Math.max(0, p.r + r + 0.6 - Math.hypot(p.x - x, p.y - y)), 0);
          if (hit === 0) {
            best = dy;
            break;
          }
          if (hit < least.hit) least = { dy, hit };
        }
        placed.push({ name: row.name, x, y: axisY + (best ?? least.dy), r });
      }
      const byPlaced = new Map(placed.map((p) => [p.name, p]));
      const ordered = [...placed.filter((p) => !accent.has(p.name) && !rings.has(p.name)), ...placed.filter((p) => accent.has(p.name) || rings.has(p.name))];
      for (const p of ordered) {
        const o = opacityOf(p.name);
        add({ id: `p1-${p.name}`, kind: "circle", cx: p.x, cy: p.y, r: p.r, o, role: colourOf(p.name), edge: true });
        if (rings.has(p.name)) add({ id: `ring-${p.name}`, kind: "circle", cx: p.x, cy: p.y, r: p.r + 4, o, role: "ink", stroke: true });
      }
      for (const p of placed) out.anchors.set(p.name, { x: p.x, y: p.y, top: Math.min(...placed.filter((q) => Math.abs(q.x - p.x) < p.r + 30).map((q) => q.y - q.r)) - 4, side: "above", rowY: p.y, r: p.r });
      const named = shownRows.filter((nme) => accent.has(nme) || rings.has(nme));
      const anchorOf = (x) => (x > plot.x + plot.width * 0.85 ? "end" : x < plot.x + plot.width * 0.15 ? "start" : "middle");
      const spanOf = (nme) => {
        const p = byPlaced.get(nme);
        const w = W(byName.get(nme).code ?? nme, "annot");
        const a = anchorOf(p.x);
        const x0 = a === "start" ? p.x : a === "end" ? p.x - w : p.x - w / 2;
        return { name: nme, x0, x1: x0 + w, at: p.x };
      };
      const level = levelsOf_(named.map(spanOf));
      for (const nme of named) {
        const p = byPlaced.get(nme);
        const label = byName.get(nme).code ?? nme;
        const ly = plot.y + lead("annot") * (0.6 + level.get(nme));
        add({ id: `leader-${nme}`, kind: "line", x1: p.x, y1: ly + lead("annot") * 0.45, x2: p.x, y2: p.y - p.r - 1, o: opacityOf(nme), role: "ink", w: 0.8 });
        add({ id: `name-${nme}`, kind: "text", x: p.x, y: ly, text: label, anchor: anchorOf(p.x), reg: "annot", role: accent.has(nme) ? "accent" : "ink", bold: true, o: opacityOf(nme) });
      }
    }
    // The value axis along the bottom.
    const ay = plot.y + plot.height + 4;
    for (const t of ticks) {
      add({ id: `grid-${t}`, kind: "line", x1: pos(t), y1: plot.y, x2: pos(t), y2: plot.y + plot.height, role: "grid" });
      add({ id: `tick-${t}`, kind: "text", x: pos(t), y: ay + tickH * 0.8, text: fmtTick(t), anchor: "middle", reg: "axis", role: "muted" });
    }
  } else if (variant === "box-plot") {
    const tickW = Math.max(...ticks.map((t) => W(fmtTick(t), "axis")), 10) + 8;
    const nameH = lead("axis") + 6;
    plot = { x: frame.x + tickW, y: frame.y + 6, width: frame.width - tickW - 4, height: frame.height - nameH - 10 };
    pos = (v) => plot.y + plot.height - ((v - lo) / (hi - lo)) * plot.height;
    const pitch = plot.width / Math.max(1, n);
    const boxW = Math.max(6, Math.min(46, pitch * 0.38));
    const dotR = Math.max(1.6, Math.min(3.2, pitch * 0.05));
    shownRows.forEach((name, i) => {
      const row = byName.get(name);
      const s = row.stats;
      const cx = plot.x + (i + 0.5) * pitch - boxW * 0.35;
      const o = opacityOf(name);
      const role = colourOf(name);
      add({ id: `whisker-${name}`, kind: "line", x1: cx, y1: pos(s.whiskerHi), x2: cx, y2: pos(s.whiskerLo), o, role: role === "accent" ? "accent" : "ink", w: 1 });
      add({ id: `box-${name}`, kind: "rect", x: cx - boxW / 2, y: pos(s.q3), width: boxW, height: Math.max(1, pos(s.q1) - pos(s.q3)), o, role: role === "accent" ? "accent" : "neutral" });
      add({ id: `median-${name}`, kind: "line", x1: cx - boxW / 2, y1: pos(s.median), x2: cx + boxW / 2, y2: pos(s.median), o, role: "ground", w: 2 });
      row.values.forEach((v, k) => {
        const outlier = v < s.whiskerLo || v > s.whiskerHi;
        const jitter = ((k * 7919) % 11) / 10 - 0.5;
        add({ id: `pt-${name}-${k}`, kind: "circle", cx: outlier ? cx : cx + boxW / 2 + 5 + (jitter + 0.5) * Math.min(14, pitch * 0.25), cy: pos(v), r: dotR, o: o * (outlier ? 1 : 0.85), role: role === "accent" ? "accent" : "rule", hollow: outlier });
      });
      add({ id: `name-${name}`, kind: "text", x: plot.x + (i + 0.5) * pitch, y: plot.y + plot.height + nameH * 0.8, text: name, anchor: "middle", reg: "axis", role: accent.has(name) || rings.has(name) ? "ink" : "muted", bold: accent.has(name) || rings.has(name), o: hidden.has(name) ? 0 : 1 * revealOf(name) });
      if (rings.has(name)) add({ id: `ring-${name}`, kind: "rect", x: cx - boxW / 2 - 4, y: pos(s.whiskerHi) - 4, width: boxW + 8 + Math.min(14, pitch * 0.25) + 8, height: pos(s.whiskerLo) - pos(s.whiskerHi) + 8, o, role: "ink", stroke: true });
      out.anchors.set(name, { x: cx + boxW / 2, y: pos(s.median), top: pos(s.whiskerHi) - dotR - 2, side: "above", rowY: pos(s.median), cx, boxW });
    });
    for (const t of ticks) {
      add({ id: `grid-${t}`, kind: "line", x1: plot.x, y1: pos(t), x2: plot.x + plot.width, y2: pos(t), role: "grid" });
      add({ id: `tick-${t}`, kind: "text", x: plot.x - 6, y: pos(t), text: fmtTick(t), anchor: "end", reg: "axis", role: "muted" });
    }
  }
  if (variant === "dumbbell-range-plot") {
    for (const t of ticks) {
      add({ id: `grid-${t}`, kind: "line", x1: pos(t), y1: plot.y, x2: pos(t), y2: plot.y + plot.height, role: "grid" });
      add({ id: `tick-${t}`, kind: "text", x: pos(t), y: plot.y + plot.height + tickH * 0.9, text: fmtTick(t), anchor: "middle", reg: "axis", role: "muted" });
    }
  }
  if (variant === "slope-slopegraph") {
    // No axis: the end values are printed (the per-type kit's own rule); a reference rule still sits on the scale.
  }
  out.plot = plot;
  out.pos = pos;

  // ── gesture layers ──
  // compare: the other row's span laid on the subject (paired), or the gap between the two drawn as a bridge.
  for (const c of state.compares) {
    const a = byName.get(c.subject);
    const b = byName.get(c.other);
    const at = out.anchors.get(c.subject);
    const bt = out.anchors.get(c.other);
    if (!a || !b || !at || !bt) continue;
    const o = Math.min(opacityOf(c.subject) || 1, 1) * (c.o ?? 1);
    if (variant === "dumbbell-range-plot") {
      // A copy of the other row's link, laid from the subject's first point, just under the subject's own.
      const y = at.rowY + Math.max(5, (at.pitch ?? 20) * 0.28);
      const x0 = pos(a.from);
      add({ id: `copy-${c.index}`, kind: "line", x1: x0, y1: y, x2: x0 + (pos(a.from + b.change) - x0) * (c.grow ?? 1), y2: y, o, role: "copy", w: 3 });
      add({ id: `copytick-${c.index}`, kind: "line", x1: pos(a.from + b.change), y1: y - 4, x2: pos(a.from + b.change), y2: y + 4, o: o * (c.grow ?? 1), role: "ink", w: 1 });
    } else if (variant === "slope-slopegraph") {
      // The other line's change, laid from the subject's left end.
      add({ id: `copy-${c.index}`, kind: "line", x1: plot.x, y1: pos(a.from), x2: plot.x + plot.width * (c.grow ?? 1), y2: pos(a.from + b.change * (c.grow ?? 1)), o: o * 0.9, role: "copy", w: 2, dash: true });
    } else if (variant === "box-plot") {
      // The other group's median carried across to the subject's box, and the gap between the two medians bracketed
      // just left of the subject's box.
      const y = pos(b.stats.median);
      const x1 = Math.min(at.cx, bt.cx) - (at.boxW ?? 10) / 2;
      const x2 = Math.max(at.cx, bt.cx) + (at.boxW ?? 10) / 2;
      const gx = at.cx - (at.boxW ?? 10) / 2 - 8;
      add({ id: `copy-${c.index}`, kind: "line", x1, y1: y, x2: x1 + (x2 - x1) * (c.grow ?? 1), y2: y, o, role: "copy", w: 1.5, dash: true });
      add({ id: `copytick-${c.index}`, kind: "line", x1: gx, y1: pos(a.stats.median), x2: gx, y2: pos(a.stats.median) + (y - pos(a.stats.median)) * (c.grow ?? 1), o, role: "copy", w: 2 });
      add({ id: `copytick2-${c.index}`, kind: "line", x1: gx - 4, y1: pos(a.stats.median), x2: gx + 4, y2: pos(a.stats.median), o, role: "copy", w: 1.5 });
    } else if (a.from !== undefined && variant === "dot-strip") {
      // Two moments on two strips: the other row's change laid from the subject's first reading, under the lower strip.
      const y = at.rowY + 10;
      const x0 = pos(a.from);
      add({ id: `copy-${c.index}`, kind: "line", x1: x0, y1: y, x2: x0 + (pos(a.from + b.change) - x0) * (c.grow ?? 1), y2: y, o, role: "copy", w: 3 });
      add({ id: `copytick-${c.index}`, kind: "line", x1: pos(a.from + b.change), y1: y - 4, x2: pos(a.from + b.change), y2: y + 4, o: o * (c.grow ?? 1), role: "ink", w: 1 });
    } else {
      // Two positions on one axis: the bridge between them is the gap.
      const level = (r) => r.to ?? r.value;
      const y = Math.min(at.top, bt.top) - 2;
      const [xa, xb] = [pos(level(a)), pos(level(b))];
      add({ id: `copy-${c.index}`, kind: "line", x1: xa, y1: y, x2: xa + (xb - xa) * (c.grow ?? 1), y2: y, o, role: "copy", w: 2 });
      add({ id: `copytick-${c.index}`, kind: "line", x1: xa, y1: y - 4, x2: xa, y2: y + 4, o, role: "ink", w: 1 });
      add({ id: `copytick2-${c.index}`, kind: "line", x1: xb, y1: y - 4, x2: xb, y2: y + 4, o: o * (c.grow ?? 1), role: "ink", w: 1 });
    }
  }
  for (const r of state.references) {
    const v = r.value;
    if (!(v >= lo && v <= hi)) continue;
    if (valueAxis === "x") add({ id: `rule-${r.index}`, kind: "line", x1: pos(v), y1: plot.y, x2: pos(v), y2: plot.y + plot.height, o: r.o ?? 1, role: "accent", dash: true, w: 1.2 });
    else add({ id: `rule-${r.index}`, kind: "line", x1: plot.x, y1: pos(v), x2: plot.x + plot.width, y2: pos(v), o: r.o ?? 1, role: "accent", dash: true, w: 1.2 });
  }
  return out;
}

/** A scene's primitives by id, for interpolating two of them. */
export const primsById = (scene) => new Map(scene.prims.map((p) => [p.id, p]));

const NUMERIC = ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "width", "height", "o"];

/** Two scenes' primitives interpolated at t (0 → a, 1 → b): numbers lerp, a primitive absent on one side fades. */
export function lerpScenes(a, b, t) {
  const A = primsById(a);
  const B = primsById(b);
  const ids = [...new Set([...A.keys(), ...B.keys()])];
  return ids.map((id) => {
    const p = A.get(id);
    const q = B.get(id);
    if (!p) return { ...q, o: q.o * t };
    if (!q) return { ...p, o: p.o * (1 - t) };
    const out = { ...(t < 0.5 ? p : q) };
    for (const k of NUMERIC) if (typeof p[k] === "number" && typeof q[k] === "number") out[k] = p[k] + (q[k] - p[k]) * t;
    return out;
  });
}

/** The colour each role is drawn in, from the ground, the accent and the furniture. */
export function roleColours({ ground, accent, ink, muted, mix }) {
  return {
    ground,
    accent,
    ink,
    muted,
    neutral: mix(ground, ink, 0.45),
    early: mix(ground, ink, 0.2),
    copy: mix(ground, ink, 0.72),
    rule: mix(ground, ink, 0.55),
    grid: mix(ground, ink, 0.12),
  };
}

/** A paired row's change as a signed figure in the beat's own format ("+5,0", "−2,5"). */
export const deltaOf = (format) => (v) => `${v < 0 ? "−" : "+"}${format(Math.abs(v))}`;

// ── notes: every gesture's words, placed beside what they are about ──────────────────────────────

/** Greedy word wrap on measured widths. */
export function wrapWords(words, maxWidth, measure) {
  const lines = [];
  let line = "";
  for (const w of String(words).split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${w}` : w;
    if (line && measure(trial) > maxWidth) {
      lines.push(line);
      line = w;
    } else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}

const boxOfText = (p, measure, lead) => {
  const w = measure(p.text, p.reg);
  const left = p.anchor === "middle" ? p.x - w / 2 : p.anchor === "end" ? p.x - w : p.x;
  const h = lead(p.reg);
  return { x0: left, x1: left + w, y0: p.y - h / 2, y1: p.y + h / 2 };
};
const overlaps = (a, b, pad = 2) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;

/**
 * Places each note as direct annotation: beside its row's anchor (after a dumbbell row's change, above a point, a
 * box, a rule's top), in the first spot that touches no other word, no mark and stays inside the frame. A note no
 * spot holds is written under the plot instead, naming its row — never dropped, never shrunk.
 *
 * @param scene  sceneOf()'s result (its prims gain the notes' text and leaders)
 * @param notes  [{ index, marks, text, at? }] — `at` a value on the axis (a reference's note)
 * @param frame  the plot frame sceneOf drew into
 * @returns      { under: [{ index, text }] }
 */
export function placeNotes({ scene, notes, text, frame, reg = "annot", role = "accent" }) {
  const measure = (t, r = reg) => text.measure(t, r);
  const lead = (r) => text.lead(r);
  const taken = scene.prims.filter((p) => p.kind === "text" && p.o > 0).map((p) => boxOfText(p, (t, r) => text.measure(t, r), lead));
  // Marks are obstacles too: a note never sits on a point or a box.
  for (const p of scene.prims) {
    if (!(p.o > 0)) continue;
    if (p.kind === "circle") taken.push({ x0: p.cx - p.r, x1: p.cx + p.r, y0: p.cy - p.r, y1: p.cy + p.r });
    if (p.kind === "rect" && !p.stroke) taken.push({ x0: p.x, x1: p.x + p.width, y0: p.y, y1: p.y + p.height });
    // A leader, a link or a rule is an obstacle where it is thin (vertical or horizontal); a diagonal is not boxed.
    if (p.kind === "line" && !["grid", "rule"].includes(p.role)) {
      const box = { x0: Math.min(p.x1, p.x2) - 1.5, x1: Math.max(p.x1, p.x2) + 1.5, y0: Math.min(p.y1, p.y2) - 1.5, y1: Math.max(p.y1, p.y2) + 1.5 };
      if (box.x1 - box.x0 < 5 || box.y1 - box.y0 < 5) taken.push(box);
      else {
        // A diagonal (a slope's line) is boxed in short steps along its length.
        const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
        for (let t = 0; t <= len; t += 8) {
          const x = p.x1 + ((p.x2 - p.x1) * t) / len;
          const y = p.y1 + ((p.y2 - p.y1) * t) / len;
          taken.push({ x0: x - 2, x1: x + 2, y0: y - 2, y1: y + 2 });
        }
      }
    }
  }
  const inside = (b) => b.x0 >= frame.x - 0.5 && b.x1 <= frame.x + frame.width + 0.5 && b.y0 >= frame.y - 0.5 && b.y1 <= frame.y + frame.height + 0.5;
  const under = [];
  const maxW = Math.max(90, Math.min(frame.width * 0.34, 260));
  const h = lead(reg);
  for (const note of notes) {
    if (!note.text) continue;
    const lines = wrapWords(note.text, maxW, (t) => measure(t));
    const w = Math.max(...lines.map((l) => measure(l)));
    const H = lines.length * h;
    const anchor = note.marks?.length ? scene.anchors.get(note.marks[0]) : null;
    const candidates = [];
    if (anchor) {
      const ax = anchor.x;
      const top = anchor.top ?? anchor.y;
      for (let k = 0; k < 14; k++) {
        const lift = k * h * 0.8;
        if (anchor.side === "after") {
          candidates.push({ x0: frame.x + frame.width - w, y0: anchor.y - H / 2 + lift, leader: false });
          candidates.push({ x0: frame.x + frame.width - w, y0: anchor.y - H / 2 - lift, leader: false });
        }
        candidates.push({ x0: ax - w / 2, y0: top - H - 6 - lift, leader: true });
        candidates.push({ x0: ax + 10, y0: top - H - 4 - lift, leader: true });
        candidates.push({ x0: ax - w - 10, y0: top - H - 4 - lift, leader: true });
        candidates.push({ x0: ax + 12, y0: anchor.y - H / 2 + lift, leader: false });
        candidates.push({ x0: ax - w - 12, y0: anchor.y - H / 2 + lift, leader: false });
        candidates.push({ x0: ax - w / 2, y0: anchor.y + 8 + lift, leader: false });
      }
      // The nearest free spot wins, whichever side it is on.
      const d = (c) => Math.hypot(c.x0 + w / 2 - ax, c.y0 + H / 2 - anchor.y);
      candidates.sort((p, q) => d(p) - d(q));
    } else if (note.at !== undefined && scene.pos) {
      const p = scene.pos(note.at);
      const vertical = scene.plot && Math.abs(scene.pos(note.at) - scene.pos(note.at + 1e-9)) < 1 && (scene.plot.height > 0);
      for (let k = 0; k < 14; k++) {
        const step = k * h * 0.9;
        if (["dumbbell-range-plot", "dot-strip", "beeswarm"].includes(scene.variant ?? "")) {
          candidates.push({ x0: p + 6, y0: scene.plot.y + step, leader: false });
          candidates.push({ x0: p - w - 6, y0: scene.plot.y + step, leader: false });
        } else {
          candidates.push({ x0: scene.plot.x + scene.plot.width - w, y0: p - H - 3 - step, leader: false });
          candidates.push({ x0: scene.plot.x + scene.plot.width - w, y0: p + 3 + step, leader: false });
          candidates.push({ x0: scene.plot.x + 4, y0: p - H - 3 - step, leader: false });
        }
      }
      void vertical;
    } else {
      for (let k = 0; k < 10; k++) candidates.push({ x0: scene.plot.x + 4, y0: scene.plot.y + k * h, leader: false });
    }
    const spot = candidates
      .map((c) => ({ ...c, x0: Math.max(frame.x, Math.min(frame.x + frame.width - w, c.x0)) }))
      .map((c) => ({ ...c, box: { x0: c.x0, x1: c.x0 + w, y0: c.y0, y1: c.y0 + H } }))
      .find((c) => inside(c.box) && taken.every((t) => !overlaps(c.box, t)));
    if (!spot) {
      under.push({ index: note.index, text: note.marks?.length && !note.text.includes(note.marks[0]) ? `${note.marks[0]} : ${note.text}`.replace(" : ", ": ") : note.text });
      continue;
    }
    taken.push(spot.box);
    lines.forEach((l, k) =>
      scene.prims.push({ id: `note-${note.index}-${k}`, kind: "text", x: spot.x0, y: spot.y0 + h * (k + 0.5), text: l, anchor: "start", reg, role, o: note.o ?? 1, note: note.index }),
    );
    if (anchor && spot.leader) {
      const ly = spot.box.y1 + 1;
      const tx = Math.max(spot.box.x0 + 2, Math.min(spot.box.x1 - 2, anchor.x));
      if ((anchor.top ?? anchor.y) - ly > 3) scene.prims.push({ id: `leader-note-${note.index}`, kind: "line", x1: tx, y1: ly, x2: anchor.x, y2: (anchor.top ?? anchor.y) - 1, role: "ink", w: 0.7, o: note.o ?? 1, note: note.index });
    }
  }
  return { under };
}
