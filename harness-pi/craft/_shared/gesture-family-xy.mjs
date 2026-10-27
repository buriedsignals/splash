// The XY family adapter (craft/gestures/GRAMMAR.md §4 F3 Position, the two-axis types): one point per row on two
// FITTED axes, x and y, never anchored at zero (no-anchor-value-axis-zero), a position that is data and never nudged
// (no-let-point-move), emphasis by ring rather than recolour beside the one accent (no-spend-accent-country).
// Variants: `scatter-and-bubble` (a cloud; an optional size carried on each mark is drawn as area) and
// `connected-scatter` (each entity's marks linked in key order, a hollow start and a filled end).
//
// MARKS. One mark per point, `value` = its y, `x` (and `size`) carried on the mark: { name, value, x, size? } for a
// scatter; { name, value, x, key, series } for a connected scatter, where the LAST step of a path is named by the
// path itself ("France") and the earlier ones "France 2000" — so the takeaway's word for an entity resolves to the
// path's head, and a gesture on it acts on the whole path. A key ("2000") names every mark at that step.
//
// It registers the family at import (FAMILIES.xy), carries the family's own figures and refusals for the core
// (`xyHooks`), folds a validated list into pictures (`planXY`, `pictureAt`) and stages a list with repair
// (`stageXY`). Browser-safe: no Node module.
import { applyFix, figuresIn, GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

/** What the XY family draws in all four formats (GRAMMAR §6, F3 column; bracket and count do not add up here). */
export const XY_GESTURES = ["highlight", "name", "annotate", "compare", "reference", "filter", "zoom", "trace", "reveal", "pull-back"];
FAMILIES.xy ??= { gestures: XY_GESTURES, additive: false };

export const VARIANTS = ["scatter-and-bubble", "connected-scatter"];
const CONNECTED = "connected-scatter";

// ── marks ─────────────────────────────────────────────────────────────────────────────────────────

const num = (v) => (typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", ".")));
const keyOrder = (keys) => (keys.every((k) => Number.isFinite(Number(k))) ? [...keys].sort((a, b) => Number(a) - Number(b)) : keys);

/**
 * The family's marks from the beat's rows. A scatter row is { name, x, value, size? }; a connected-scatter row is
 * { series, key, x, value }. Rows whose x or value is not a number are left out and counted (`dropped`): the plate
 * states them, it never refuses for them.
 */
export function marksOf(rows, variant) {
  const ok = rows.filter((r) => Number.isFinite(num(r.x)) && Number.isFinite(num(r.value)));
  const dropped = rows.length - ok.length;
  if (variant !== CONNECTED) {
    const marks = ok.map((r) => ({ name: String(r.name), value: num(r.value), x: num(r.x), ...(Number.isFinite(num(r.size)) && num(r.size) > 0 ? { size: num(r.size) } : {}) }));
    return { marks, dropped };
  }
  const bySeries = new Map();
  for (const r of ok) {
    const s = String(r.series ?? r.name);
    if (!bySeries.has(s)) bySeries.set(s, []);
    bySeries.get(s).push(r);
  }
  const marks = [];
  for (const [series, steps] of bySeries) {
    const order = keyOrder(steps.map((r) => String(r.key)));
    const sorted = order.map((k) => steps.find((r) => String(r.key) === k));
    sorted.forEach((r, i) =>
      marks.push({ name: i === sorted.length - 1 ? series : `${series} ${r.key}`, value: num(r.value), x: num(r.x), key: String(r.key), series }),
    );
  }
  return { marks, dropped };
}

// ── geometry ──────────────────────────────────────────────────────────────────────────────────────

/** Round numbers between lo and hi, about n of them. */
export function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => span / s <= n) ?? 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** Decades and their 2 and 5 between lo and hi (positive), thinned to at most n. */
export function logTicks(lo, hi, n = 8) {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= lo && v <= hi) out.push(v);
    }
  if (out.length <= n) return out;
  return out.filter((v) => /^1/.test(String(v)));
}

/**
 * Where marks sit: x and y on fitted domains (padded around the data, never pulled to zero), x on a log scale when
 * the beat asks and every x is positive (else linear — the layout adapts, the plate says so through `xLog`).
 *
 * @param extra  values a gesture lays on an axis ({ x: [], y: [] }: a reference rule), so the domain holds them
 */
export function createXY({ marks, variant = "scatter-and-bubble", xLog = false, extra = { x: [], y: [] } }) {
  const log = Boolean(xLog) && marks.every((m) => m.x > 0) && (extra.x ?? []).every((v) => v > 0);
  const tx = (v) => (log ? Math.log10(v) : v);
  const byName = new Map(marks.map((m) => [m.name, m]));
  const fit = (values, share) => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * share || Math.abs(hi) * 0.1 || 1;
    return [lo - pad, hi + pad];
  };
  const full = {
    x: fit([...marks.map((m) => tx(m.x)), ...(extra.x ?? []).map(tx)], 0.05),
    y: fit([...marks.map((m) => m.value), ...(extra.y ?? [])], 0.07),
  };

  // Paths: each series' marks in key order (connected scatter only).
  const paths = new Map();
  if (variant === CONNECTED)
    for (const m of marks) {
      if (!paths.has(m.series)) paths.set(m.series, []);
      paths.get(m.series).push(m.name);
    }
  /** The whole path a mark belongs to (a connected scatter's entity), else the mark alone. */
  const pathOf = (name) => {
    const m = byName.get(name);
    return m?.series !== undefined && (paths.get(m.series)?.length ?? 0) > 1 ? paths.get(m.series) : [name];
  };
  /** The marks a gesture on these names acts on: each named mark's path. */
  const reach = (names) => [...new Set(names.flatMap(pathOf))];
  /** The entities these names stand for, each once, by its path's head (a scatter point is its own head). */
  const headsOf = (names) => [...new Set(names.map((n) => pathOf(n).at(-1)))];
  /** The marks that stand for their entity now: every scatter point, a connected scatter's path heads. */
  const heads = variant === CONNECTED ? [...paths.values()].map((p) => p.at(-1)) : marks.map((m) => m.name);

  const u = (x, dom = full) => (tx(x) - dom.x[0]) / (dom.x[1] - dom.x[0]);
  const v = (y, dom = full) => (y - dom.y[0]) / (dom.y[1] - dom.y[0]);
  /** A mark's place as shares of the plot, u from the left, v from the bottom, in a state's domain. */
  const pos = (name, dom = full) => {
    const m = byName.get(name);
    if (!m) throw new Error(`${name} is not a drawn mark`);
    return { u: u(m.x, dom), v: v(m.value, dom) };
  };

  /** The move from a path's first step to its last: { dx, dy, from, to }, or null for a lone point. */
  const move = (name) => {
    const p = pathOf(name);
    if (p.length < 2) return null;
    const a = byName.get(p[0]);
    const b = byName.get(p.at(-1));
    return { dx: b.x - a.x, dy: b.value - a.value, from: a, to: b };
  };

  /**
   * A zoom onto a few marks: one factor on both axes (so the printed ×f is the whole magnification), centred on
   * their box, kept inside the full domain. The factor is how much the plot enlarges.
   */
  const window = (names) => {
    const ms = reach(names).map((n) => byName.get(n));
    const xs = ms.map((m) => tx(m.x));
    const ys = ms.map((m) => m.value);
    const W = full.x[1] - full.x[0];
    const H = full.y[1] - full.y[0];
    const bw = Math.max((Math.max(...xs) - Math.min(...xs)) * 1.6, W * 0.05);
    const bh = Math.max((Math.max(...ys) - Math.min(...ys)) * 1.6, H * 0.05);
    const factor = Math.min(W / bw, H / bh);
    const span = [W / factor, H / factor];
    const centre = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    const clampTo = (c, s, [a, b]) => {
      const lo = Math.min(Math.max(c - s / 2, a), b - s);
      return [lo, lo + s];
    };
    return { dom: { x: clampTo(centre[0], span[0], full.x), y: clampTo(centre[1], span[1], full.y) }, factor };
  };

  /** Marks on either side of a value on one axis (heads only: what stands for each entity now). */
  const sides = (axis, value) => {
    const at = (n) => (axis === "x" ? byName.get(n).x : byName.get(n).value);
    const below = heads.filter((n) => at(n) < value);
    const above = heads.filter((n) => at(n) >= value);
    const spread = (names) => {
      const vals = names.map((n) => (axis === "x" ? byName.get(n).value : byName.get(n).x));
      return names.length ? Math.max(...vals) - Math.min(...vals) : 0;
    };
    return { below, above, belowRange: spread(below), aboveRange: spread(above) };
  };

  return { family: "xy", variant, log, full, extra, marks, byName, paths, heads, headsOf, pathOf, reach, pos, u, v, move, window, sides, tx };
}

// ── the family's figures and refusals, for the core ──────────────────────────────────────────────

/** The axis a reference or a threshold filter stands on: "x" or "y" (y by default). */
export const axisOf = (g) => (g.axis === "x" ? "x" : "y");

/** The marks a threshold filter keeps: those on its `side` ("above", the default, or "below") of `value`. */
export function thresholdKept(g, xy) {
  const s = xy.sides(axisOf(g), Number(g.value));
  return g.side === "below" ? s.below : s.above;
}

const ratios = (a, b) => (a && b ? [a / b, b / a] : []);
const gaps = (a, b) => (a && b ? [(a / b - 1) * 100, (1 - a / b) * 100, (b / a - 1) * 100, (1 - b / a) * 100] : []);

/**
 * The family's hooks for validateGestures: `figures` admits the x values, sizes and moves a note states for the marks
 * it names, a reference's or threshold's counts and spreads, a compare's x gap; `refuse` holds the family's own
 * refusals (a trace with no path, a compare that is not two marks, a filter that keeps everything or nothing).
 */
export function xyHooks(xy, list = []) {
  // The rules the list draws (references, thresholds): a whole-chart gesture shows them, still marked.
  const ruled = list.filter((g) => g && (g.do === "reference" || (g.do === "filter" && g.value !== undefined)) && Number.isFinite(Number(g.value))).map((g) => Number(g.value));
  const { byName } = xy;
  const moveFigures = (n) => {
    const mv = xy.move(n);
    return mv ? [mv.dx, -mv.dx, mv.dy, -mv.dy, Math.abs(mv.dx), Math.abs(mv.dy), mv.from.x, mv.from.value, mv.to.x, mv.to.value] : [];
  };
  const sideFigures = (axis, value) => {
    const s = xy.sides(axis, value);
    const n = s.below.length + s.above.length;
    return [value, s.below.length, s.above.length, s.belowRange, s.aboveRange, ...ratios(s.belowRange, s.aboveRange), (s.below.length / n) * 100, (s.above.length / n) * 100];
  };
  const spreadOf = (names, axis) => {
    const vals = names.map((n) => (axis === "x" ? byName.get(n).x : byName.get(n).value));
    return vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
  };
  return {
    figures(g, ctx) {
      const out = [];
      for (const n of ctx.marks) {
        const m = byName.get(n);
        if (!m) continue;
        out.push(m.x, ...(m.size !== undefined ? [m.size] : []), ...moveFigures(n));
      }
      if (g.do === "compare" && ctx.marks.length >= 2) {
        const [a, b] = ctx.marks.map((n) => byName.get(n));
        out.push(a.x - b.x, b.x - a.x, Math.abs(a.x - b.x), ...ratios(a.x, b.x), ...gaps(a.x, b.x), Math.abs(a.value - b.value));
        if (a.size !== undefined && b.size !== undefined) out.push(...ratios(a.size, b.size), Math.abs(a.size - b.size));
        const [ma, mb] = [xy.move(ctx.marks[0]), xy.move(ctx.marks[1])];
        if (ma && mb) out.push(ma.dx - mb.dx, mb.dx - ma.dx, ma.dy - mb.dy, mb.dy - ma.dy, ...ratios(ma.dx, mb.dx), ...ratios(ma.dy, mb.dy));
      }
      if (g.do === "reference" && Number.isFinite(Number(g.value))) out.push(...sideFigures(axisOf(g), Number(g.value)));
      if (g.do === "filter") {
        const kept = g.value !== undefined && Number.isFinite(Number(g.value)) ? thresholdKept(g, xy) : xy.headsOf(ctx.marks);
        if (g.value !== undefined) out.push(...sideFigures(axisOf(g), Number(g.value)));
        const others = xy.heads.filter((n) => !kept.includes(n));
        out.push(kept.length, others.length, spreadOf(kept, "y"), spreadOf(kept, "x"), spreadOf(others, "y"), ...ratios(spreadOf(others, "y"), spreadOf(kept, "y")));
      }
      // A reveal and a pull-back draw the whole chart with what was shown still marked: its entity count, its rules.
      if (g.do === "reveal" || g.do === "pull-back") out.push(xy.heads.length, ...ruled);
      if (g.do === "trace") {
        const on = ctx.marks.length ? ctx.marks : xy.heads;
        for (const n of on) out.push(...moveFigures(n), xy.pathOf(n).length);
      }
      return out.filter(Number.isFinite);
    },
    refuse(g, ctx) {
      const i = ctx.index;
      if (g.do === "trace") {
        const on = ctx.marks.length ? ctx.marks : xy.heads;
        if (!on.some((n) => xy.pathOf(n).length > 1))
          throw new GestureRefusal(
            `gestures[${i}]`,
            `trace draws a path in the order of its data, and ${ctx.marks.length ? ctx.marks.join(", ") : "this plate"} has no path (one point per entity): drop it, or reveal the points`,
            { remove: i },
          );
      }
      if (g.do === "compare") {
        if (g.of === "whole" || ctx.marks.length !== 2) {
          const subject = ctx.marks[0];
          const versus = [ctx.claim?.versus, ctx.claim?.comparison].filter(Boolean).map(String);
          const named = xy.heads.find((n) => n !== subject && versus.some((t) => t.toLowerCase().includes(n.toLowerCase())));
          const p = xy.pos(subject);
          const nearest = xy.heads.filter((n) => n !== subject).sort((a, b) => {
            const pa = xy.pos(a);
            const pb = xy.pos(b);
            return Math.hypot(pa.u - p.u, pa.v - p.v) - Math.hypot(pb.u - p.u, pb.v - p.v);
          })[0];
          const other = ctx.marks.length > 2 ? ctx.marks[1] : named ?? nearest;
          const rest = Object.fromEntries(Object.entries(g).filter(([k]) => k !== "of" && k !== "mark" && k !== "marks" && k !== "note"));
          throw new GestureRefusal(
            `gestures[${i}].marks`,
            `a compare on positions sets two points side by side (no sum, no whole): give marks: [${JSON.stringify(subject)}, ${JSON.stringify(other)}]`,
            { set: { index: i, value: { ...rest, marks: [subject, other] } } },
          );
        }
      }
      if (g.do === "reference") {
        if (!Number.isFinite(Number(g.value)))
          throw new GestureRefusal(`gestures[${i}].value`, `a reference is a rule at a number on one axis: give value (and axis: "x" or "y")`, { remove: i });
        if (g.axis !== undefined && g.axis !== "x" && g.axis !== "y")
          throw new GestureRefusal(`gestures[${i}].axis`, `axis is "x" or "y", not ${JSON.stringify(g.axis)}`, { set: { index: i, field: "axis", value: "y" } });
      }
      if (g.do === "filter") {
        const threshold = g.value !== undefined;
        if (threshold && !Number.isFinite(Number(g.value)))
          throw new GestureRefusal(`gestures[${i}].value`, `a threshold filter keeps the marks on one side of a number: give value a number`, { remove: i });
        const kept = threshold ? thresholdKept(g, xy) : xy.headsOf(ctx.marks);
        if (!threshold && !ctx.marks.length)
          throw new GestureRefusal(`gestures[${i}]`, `a filter keeps the marks the claim is about: give marks, or axis + value (+ side) for a threshold`, { remove: i });
        if (!kept.length || xy.heads.every((n) => kept.includes(n)))
          throw new GestureRefusal(`gestures[${i}]`, `this filter keeps ${kept.length ? "every" : "no"} mark, so it changes nothing in the picture: drop it`, { remove: i });
      }
    },
  };
}

// ── the plan: what each gesture does to the picture ───────────────────────────────────────────────

/** A zoom's printed factor must be the factor applied (no-let-camera-magnification). */
function checkZoom(g, k, factor) {
  const printed = figuresIn(g.note);
  if (printed.some((n) => Math.abs(n.value - factor) <= 0.5 * 10 ** -n.decimals + 1e-9)) return;
  const n = printed[0];
  const fixed = factor.toFixed(n?.decimals ?? 1).replace(".", n?.separator === "," ? "," : ".");
  const note = n ? g.note.slice(0, n.index) + fixed + g.note.slice(n.index + n.raw.length) : `×${fixed}`;
  throw new GestureRefusal(`gestures[${k}].note`, `prints the factor ${n?.raw ?? "none"}, but zooming onto ${g.marks.join(", ")} enlarges the plot ×${factor.toFixed(2)}: write "${note}"`, {
    set: { index: k, field: "note", value: note },
  });
}

/**
 * Each validated gesture as what it does to the picture, in story order. Refuses what the core cannot see without the
 * geometry: a zoom whose printed factor is not the one applied, a zoom that does not enlarge, a pull-back or a
 * highlight that changes nothing, two notes on one mark (`oneNote`, the still plate and the web's resting state).
 *
 * @param oneNote  every note is drawn at once (static, web resting): a mark carries one note, the later is dropped
 */
export function planXY({ gestures, xy, oneNote = false }) {
  const subject = implicitAccent(gestures);
  const accentMark = subject !== undefined && xy.byName.has(subject) ? subject : null;
  const noted = new Set();
  const plan = [];
  let zoomed = false;
  let filtered = false;
  gestures.forEach((g, k) => {
    const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
    const marks = g.marks.slice(0, own);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    const item = { k, do: g.do, marks, reach: xy.reach(marks), note };
    const anchorNote = (mark) => {
      if (note === undefined) return;
      if (oneNote && noted.has(mark))
        throw new GestureRefusal(`gestures[${k}].note`, `${mark} already carries a note, and every note is drawn at once here: drop this note (the gesture stays)`, { set: { index: k, field: "note", value: undefined } });
      noted.add(mark);
      item.at = mark;
    };
    switch (g.do) {
      case "highlight":
        item.rings = marks.filter((m) => m !== accentMark && !(g.subject !== undefined && m === g.subject));
        item.accent = marks.filter((m) => m === accentMark || (g.subject !== undefined && m === g.subject));
        if (marks.length === 1) anchorNote(marks[0]);
        break;
      case "name":
      case "annotate":
        if (g.do === "name") item.rings = marks.filter((m) => m !== accentMark);
        if (note === undefined) item.value = true;
        else anchorNote(marks[0]);
        item.at = marks[0];
        break;
      case "compare":
        item.a = marks[0];
        item.b = marks[1];
        anchorNote(marks[0]);
        break;
      case "reference":
        item.axis = axisOf(g);
        item.value = Number(g.value);
        break;
      case "filter":
        // The entities kept (a path counts once, by its head); the picture keeps each one's whole path.
        item.kept = g.value !== undefined ? thresholdKept(g, xy) : xy.headsOf(marks);
        if (g.value !== undefined) Object.assign(item, { axis: axisOf(g), value: Number(g.value), side: g.side === "below" ? "below" : "above" });
        if (marks.length === 1) anchorNote(marks[0]);
        filtered = true;
        break;
      case "zoom": {
        const w = xy.window(marks);
        if (!(w.factor > 1.05))
          throw new GestureRefusal(`gestures[${k}]`, `zoom onto ${marks.join(", ")} enlarges the plot only ×${w.factor.toFixed(2)}: they already fill it, drop it`, { remove: k });
        checkZoom(g, k, w.factor);
        Object.assign(item, { dom: w.dom, factor: w.factor });
        zoomed = true;
        break;
      }
      case "trace":
        item.series = [...new Set((marks.length ? marks : xy.heads).map((n) => xy.pathOf(n)).filter((p) => p.length > 1).map((p) => p.at(-1)))];
        break;
      case "pull-back":
        item.release = zoomed || filtered;
        zoomed = false;
        filtered = false;
        break;
      default:
        break;
    }
    plan.push(item);
  });
  return { plan, accentMark };
}

/**
 * The picture once the gestures with `on[k] > 0` have played, weights in 0..1 (a video or scrolly blends them): which
 * marks take the accent (the subject's whole path), a ring, step back; the domain; the notes, rules, compares and
 * traced paths drawn. `release` in 0..1 returns what a zoom or filter hid (a video's conclusion, a scrolly's closing
 * card). Pure: every format reads it.
 */
export function pictureAt({ plan, accentMark, xy, on, release = 0 }) {
  const w = (k) => Math.max(0, Math.min(1, on[k] ?? 0));
  const accent = new Map();
  const ring = new Map();
  const back = new Map();
  let dom = { x: [...xy.full.x], y: [...xy.full.y] };
  const notes = [];
  const rules = [];
  const compares = [];
  const traced = [];
  let reveal = null;
  let factor = null;
  const bump = (map, names, t) => names.forEach((n) => map.set(n, Math.max(map.get(n) ?? 0, t)));
  if (accentMark) bump(accent, xy.pathOf(accentMark), 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const blendDom = (to, t) => ({ x: [lerp(dom.x[0], to.x[0], t), lerp(dom.x[1], to.x[1], t)], y: [lerp(dom.y[0], to.y[0], t), lerp(dom.y[1], to.y[1], t)] });
  for (const p of plan) {
    const t = w(p.k);
    if (p.do === "reveal") reveal = t;
    if (t <= 0) continue;
    switch (p.do) {
      case "highlight":
        bump(ring, xy.reach(p.rings ?? []), t);
        bump(accent, xy.reach(p.accent ?? []), t);
        break;
      case "name":
        bump(ring, xy.reach(p.rings ?? []), t);
        break;
      case "filter": {
        const keep = new Set(p.kept.flatMap((n) => xy.pathOf(n)));
        for (const m of xy.marks) if (!keep.has(m.name)) back.set(m.name, Math.max(back.get(m.name) ?? 0, t));
        if (p.axis) rules.push({ k: p.k, axis: p.axis, value: p.value, t, threshold: true });
        break;
      }
      case "zoom":
        dom = blendDom(p.dom, t);
        factor = p.factor;
        break;
      case "pull-back":
        if (p.release) {
          dom = blendDom(xy.full, t);
          for (const key of back.keys()) back.set(key, back.get(key) * (1 - t));
        }
        break;
      case "reference":
        rules.push({ k: p.k, axis: p.axis, value: p.value, t });
        break;
      case "compare":
        compares.push({ k: p.k, a: p.a, b: p.b, t });
        break;
      case "trace":
        traced.push(...p.series.map((s) => ({ k: p.k, series: s, t })));
        break;
      default:
        break;
    }
    if (p.at !== undefined || p.value === true) notes.push({ k: p.k, do: p.do, mark: p.at ?? p.marks[0], text: p.note, value: p.note === undefined, t });
    else if (p.note !== undefined) notes.push({ k: p.k, do: p.do, mark: null, text: p.note, t });
  }
  if (release > 0) {
    dom = blendDom(xy.full, release);
    for (const key of back.keys()) back.set(key, back.get(key) * (1 - release));
  }
  return { accent, ring, back, dom, notes, rules, compares, traced, reveal, factor };
}

/**
 * The family's locks over a sequence of pictures (state k is after gesture k-1): a zoomed picture prints its factor
 * (planXY refuses a zoom without it), and the closing picture of a video or scrolly shows every mark on the full
 * domain (doctrine rule 9). Throws an Error naming the state.
 */
export function invariants(pictures, xy, { closing = false } = {}) {
  pictures.forEach((p, i) => {
    const zoomed = p.dom.x[0] !== xy.full.x[0] || p.dom.x[1] !== xy.full.x[1] || p.dom.y[0] !== xy.full.y[0] || p.dom.y[1] !== xy.full.y[1];
    if (zoomed && p.factor === null) throw new Error(`state ${i} moves the plot without a printed factor (no-let-camera-magnification)`);
  });
  if (closing) {
    const last = pictures.at(-1);
    const off = last.dom.x[0] !== xy.full.x[0] || last.dom.x[1] !== xy.full.x[1] || last.dom.y[0] !== xy.full.y[0] || last.dom.y[1] !== xy.full.y[1];
    if (off || [...last.back.values()].some((t) => t > 1e-9)) throw new Error(`the closing picture hides part of the chart (doctrine rule 9)`);
  }
}

// ── staging ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The whole staging for one format: the core (family "xy", the family's hooks),
 * then the format's own scheduler (`schedule(valid, entities)`, which may refuse). With `repair`, each refusal's fix
 * is applied to the model's own list until accepted (at most `steps` times), every repair returned.
 */
export function stageXY({ gestures, xy, format, claim, schedule, repair = false, steps = 12 }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const hooks = xyHooks(xy, Array.isArray(list) ? list : []);
      const { gestures: valid, entities } = validateGestures({ gestures: list, rows: xy.marks, family: "xy", format, claim, hooks });
      const scheduled = schedule ? schedule(valid, entities) : null;
      return { gestures: list, valid, entities, scheduled, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

/** A refusal as the runners print it: the message, then the fix's value or "(drop that gesture)". */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/** The beat's fields every XY kit reads, checked; returns the marks and the adapter. Throws plain Errors (not staging). */
export function prepareXY(beat, variant, required) {
  const missing = required.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "xFormat", "check"]) if (beat[fn] !== undefined && typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error(`beat.mjs: rows must be a non-empty array of ${variant === CONNECTED ? "{ series, key, x, value }" : "{ name, x, value }"}`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  if (variant === CONNECTED && beat.rows.some((r) => r.series === undefined || r.key === undefined))
    throw new Error("beat.mjs: a connected scatter's rows are { series, key, x, value } — series names the entity (its path), key the step (a year)");
  const { marks, dropped } = marksOf(beat.rows, variant);
  if (!marks.length) throw new Error("beat.mjs: no row has both a numeric x and a numeric value");
  const names = marks.map((m) => m.name);
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice !== undefined)
    throw new Error(`rows name "${twice}" twice: give each ${variant === CONNECTED ? "series one row per key" : "point a name of its own (filter data.json to one year)"}`);
  const extra = { x: [], y: [] };
  for (const g of beat.gestures) if (g && (g.do === "reference" || (g.do === "filter" && g.value !== undefined)) && Number.isFinite(Number(g.value))) extra[g.axis === "x" ? "x" : "y"].push(Number(g.value));
  const xy = createXY({ marks, variant, xLog: beat.xLog, extra });
  return { marks, dropped, xy };
}

/** The ticks a plot prints on each axis, in data units. */
export function ticksOf(xy, dom = xy.full) {
  const x = xy.log ? logTicks(10 ** dom.x[0], 10 ** dom.x[1]) : niceTicks(dom.x[0], dom.x[1], 5);
  const y = niceTicks(dom.y[0], dom.y[1], 5);
  return { x, y };
}

/** The gestures a type's contract lists (craft-kit.ts `contractText`): a cloud has no path to trace. */
export function gesturesOf(slug) {
  return slug === "scatter-and-bubble" ? XY_GESTURES.filter((d) => d !== "trace") : XY_GESTURES;
}
