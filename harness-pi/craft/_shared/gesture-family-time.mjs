// The Time-series family adapter (craft/gestures/GRAMMAR.md §4, F4): line, area-and-stacked-area, streamgraph and
// bump-ranking-over-time. A mark is one reading of one series at one time — { name: "2015 · Lisboa", value, key: "2015",
// series: "Lisboa" } — so a gesture may name a reading, a time (every series at it) or a series (its whole line).
//
// What the family knows, every format alike:
//   xOf(t)          linear in time over the drawn window (an eased traversal is refused: no-ease-traversal-measured)
//   at(series, t)   a series' reading at t, interpolated between readings, null in a gap
//   crossing(a, b)  where two series cross, SOLVED by linear interpolation, never read off the picture
//                   (no-believe-crossing-sight)
//   rankAt(t)       the ranking at t (bump draws it; a stream's "third source in 2016" is checked against it)
//   y-kind          value (line), stock-from-zero (area; stacked when several series), free-silhouette (stream),
//                   rank (bump)
// A gap — a time a series has no reading between its first and last — is never refused (Rémy's never-fail rule
// overrides GRAMMAR's "gaps refused"): the line breaks there, a dotted bridge marks it, and the stack is not drawn
// through it.
//
// It registers the family at import and wraps the core's validateGestures with the family's own figures and
// refusals (`validateTime`). Browser-safe: no Node module.
import { applyFix, figuresIn, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { FAMILIES, VOCABULARY, WEB_RESTING } from "./gesture-registry.mjs";

/** The gestures this family draws in all four formats (zoom is dropped from the still by the registry). */
export const TIME_GESTURES = ["highlight", "name", "annotate", "reference", "compare", "filter", "zoom", "trace", "reveal", "pull-back", "bracket"];

// A stacked area's layers add up (a band of years is a stock), so the core may bracket them; a line's or a rank's
// readings do not, and the family refuses a bracket there itself (hooks.refuse), naming what works instead.
FAMILIES.time ??= { gestures: TIME_GESTURES, additive: true };

export const VARIANTS = ["line", "area-and-stacked-area", "streamgraph", "bump-ranking-over-time"];
/** The variants whose readings add up to a sum a bracket may print. */
export const ADDITIVE = new Set(["area-and-stacked-area", "streamgraph"]);

const fold = (s) => String(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const wordsOf = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, " ")} `;

/** The mark's name: its time, then its series. */
export const markName = (key, series) => `${key} · ${series}`;

/** A time as a number on the x axis: a year stays a year, an ISO date becomes a fractional year. */
export function timeOf(raw) {
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  const ms = Date.parse(s);
  if (Number.isFinite(ms)) {
    const d = new Date(ms);
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    const next = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
    return d.getUTCFullYear() + (ms - start) / (next - start);
  }
  return NaN;
}

/** Round axis ticks over [lo, hi] (d3's nice-ticks rule, written out so the scrolly page and the bundle need no d3). */
export function niceTicks(lo, hi, count = 5) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.round(v / step) * step + 0);
  return out;
}

/** [lo, hi] widened outward to the nice step's multiples, so the first and last ticks are the domain's ends. */
export function niceDomain(lo, hi, count = 5) {
  if (!(hi > lo)) return [lo - 1, hi + 1];
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return [Math.floor(lo / step + 1e-9) * step + 0, Math.ceil(hi / step - 1e-9) * step + 0];
}

/**
 * The beat's readings, read whatever names the 12B gave their fields: `points: [{ series, t, value }]` (or `year`,
 * `x`, `date` for t; `y` for value; `name`, `entity` for series). A reading whose value is not a number is a gap,
 * never a refusal. Two readings for one series at one time cannot both be drawn: that is refused, with the fix.
 */
/** @param {{ fallbackSeries?: string }} [options] */
export function readPoints(points, { fallbackSeries = "—" } = {}) {
  if (!Array.isArray(points) || !points.length) throw new Error("beat.mjs: points must be a non-empty array of { series, t, value } — one per series per time, read from data.json (see CONTRACT.md)");
  const out = [];
  const seen = new Map();
  for (const p of points) {
    if (!p || typeof p !== "object") continue;
    const rawT = p.t ?? p.year ?? p.x ?? p.date ?? p.time;
    const t = timeOf(rawT);
    if (!Number.isFinite(t)) throw new Error(`beat.mjs: a point has no time it can be drawn at (${JSON.stringify(p)}): give each point t, a year or an ISO date`);
    const series = String(p.series ?? p.name ?? p.entity ?? fallbackSeries);
    const v = p.value ?? p.y;
    const value = v === null || v === undefined || v === "" ? NaN : Number(v);
    const key = String(rawT);
    const id = `${series}\u0000${t}`;
    if (seen.has(id))
      throw new Error(`points hold two readings for ${series} at ${key} (${seen.get(id)} and ${value}): one line cannot pass through both — filter data.json's rows to ONE reading per series per time (read its other columns)`);
    seen.set(id, value);
    out.push({ series, t, key, value });
  }
  return out;
}

const labelFor = (lang) =>
  ({ fr: "pas de données", de: "keine Daten", pl: "brak danych", pt: "sem dados", es: "sin datos", it: "nessun dato" })[String(lang ?? "en").slice(0, 2)] ?? "no data";

/**
 * The family's model of one beat: series, times, the marks it draws, the gaps, and every series' geometry in the
 * variant's own y-units (value, stack bottom/top, silhouette bottom/top, or rank).
 *
 *   variant  one of VARIANTS
 *   points   readPoints' output
 *   slots    bump only: how many ranks are drawn (a series outside them at a time is not drawn there)
 *   order    the series order (a stacked area's bottom-up; defaults to the beat's order)
 * @param {{ variant: string, points: any[], slots?: number, order?: string[], lang?: string }} input
 */
export function timeModel({ variant, points, slots = 10, order, lang }) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of ${VARIANTS.join(", ")}, not ${JSON.stringify(variant)}`);
  const seriesNames = order ?? [...new Set(points.map((p) => p.series))];
  const times = [...new Set(points.map((p) => p.t))].sort((a, b) => a - b);
  const keyOf = new Map(points.map((p) => [p.t, p.key]));
  const valueAt = new Map(points.map((p) => [`${p.series}\u0000${p.t}`, p.value]));
  const read = (s, t) => valueAt.get(`${s}\u0000${t}`);
  const finite = (v) => typeof v === "number" && Number.isFinite(v);

  // Ranks among every series with a reading at t (bump; a stream's rank words are checked against them too).
  const rankAt = new Map();
  for (const t of times) {
    const at = seriesNames.filter((s) => finite(read(s, t))).sort((a, b) => read(b, t) - read(a, t));
    rankAt.set(t, new Map(at.map((s, i) => [s, i + 1])));
  }

  // Which series are drawn: every one, except a bump draws only the series that ever sit in its slots.
  const drawnSeries = variant === "bump-ranking-over-time" ? seriesNames.filter((s) => times.some((t) => (rankAt.get(t).get(s) ?? Infinity) <= slots)) : seriesNames;

  // A stack's order: area bottom-up as given; a stream inside-out, the largest layers at the centre.
  let stackOrder = drawnSeries;
  if (variant === "streamgraph") {
    const total = (s) => times.reduce((sum, t) => sum + (finite(read(s, t)) ? read(s, t) : 0), 0);
    const bySize = [...drawnSeries].sort((a, b) => total(b) - total(a));
    const out = [];
    bySize.forEach((s, i) => (i % 2 ? out.push(s) : out.unshift(s)));
    stackOrder = out;
  }

  // Gap times: per series for a line or a rank, any layer missing for a stack (the stack's top is unknown there).
  const stacked = variant === "area-and-stacked-area" || variant === "streamgraph";
  const spanOf = (s) => {
    const own = times.filter((t) => read(s, t) !== undefined);
    return [own[0], own.at(-1)];
  };
  const gapTimes = new Set(stacked ? times.filter((t) => drawnSeries.some((s) => !finite(read(s, t)))) : []);

  const geometry = new Map();
  const marks = [];
  const markOf = new Map();
  const measureOf = new Map();
  for (const s of drawnSeries) geometry.set(s, []);
  for (const t of times) {
    const key = keyOf.get(t);
    if (stacked) {
      const total = drawnSeries.reduce((sum, s) => sum + (finite(read(s, t)) ? read(s, t) : 0), 0);
      let run = variant === "streamgraph" ? -total / 2 : 0;
      for (const s of stackOrder) {
        const v = read(s, t);
        const ok = finite(v) && !gapTimes.has(t);
        const y0 = run;
        if (finite(v)) run += v;
        geometry.get(s).push({ t, key, y0, y1: run, gap: !ok });
      }
    } else
      for (const s of drawnSeries) {
        const v = read(s, t);
        const [first, last] = spanOf(s);
        if (t < first || t > last) continue;
        if (variant === "bump-ranking-over-time") {
          const r = rankAt.get(t).get(s);
          geometry.get(s).push({ t, key, y0: r ?? NaN, y1: r ?? NaN, gap: !(r <= slots) });
        } else geometry.get(s).push({ t, key, y0: finite(v) ? v : NaN, y1: finite(v) ? v : NaN, gap: !finite(v) });
      }
  }
  // Marks, time-major (a run of years over every layer sits together for a bracket), drawn readings only.
  for (const t of times)
    for (const s of stacked ? stackOrder : drawnSeries) {
      const g = geometry.get(s).find((p) => p.t === t);
      if (!g || g.gap) continue;
      const v = read(s, t);
      const value = variant === "bump-ranking-over-time" ? rankAt.get(t).get(s) : v;
      const mark = { name: markName(keyOf.get(t), s), value, key: keyOf.get(t), series: s, t };
      marks.push(mark);
      markOf.set(mark.name, mark);
      measureOf.set(mark.name, v);
    }

  // Gaps as runs: [from, to] between the last reading before and the first after, per series (stack: shared).
  const gaps = [];
  const runsOf = (pts, s) => {
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].gap) continue;
      let j = i;
      while (j + 1 < pts.length && pts[j + 1].gap) j++;
      const before = pts[i - 1];
      const after = pts[j + 1];
      gaps.push({ series: s, from: before ? before.t : pts[i].t, to: after ? after.t : pts[j].t, keys: pts.slice(i, j + 1).map((p) => p.key), bridged: Boolean(before && after) });
      i = j;
    }
  };
  if (stacked) runsOf(geometry.get(stackOrder[0]) ?? [], null);
  else if (variant !== "bump-ranking-over-time") for (const s of drawnSeries) runsOf(geometry.get(s), s);

  // The y domain: a line is fitted (it carries a rate, no-anchor-value-axis); an area stands on zero
  // (no-lift-surface-zero); a stream is a silhouette around zero with no value axis; a rank runs 1 at the top.
  const ys = [...geometry.values()].flat().filter((p) => !p.gap).flatMap((p) => [p.y0, p.y1]);
  let domain;
  if (variant === "line") {
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    domain = niceDomain(lo, hi, 5);
  } else if (variant === "area-and-stacked-area") {
    domain = niceDomain(Math.min(0, ...ys), Math.max(0, ...ys) || 1, 5);
  } else if (variant === "streamgraph") {
    const hi = Math.max(...ys.map(Math.abs)) || 1;
    domain = [-hi * 1.04, hi * 1.04];
  } else domain = [slots + 0.5, 0.5];

  return {
    variant,
    slots,
    stacked,
    series: drawnSeries,
    allSeries: seriesNames,
    stackOrder,
    times,
    keyOf,
    t0: times[0],
    t1: times.at(-1),
    marks,
    markOf,
    measureOf,
    geometry,
    gaps,
    gapLabel: labelFor(lang),
    domain,
    read,
    rankAt: (t, s) => rankAt.get(t)?.get(s),
    rankingAt: (t) => [...(rankAt.get(t)?.entries() ?? [])].sort((a, b) => a[1] - b[1]).map(([s]) => s),
  };
}

// ── the family's members ─────────────────────────────────────────────────────────────────────────────

/** x in [0, 1] of the drawn window: linear in time, the only way a time axis is ever traversed. */
export const xOf = (model, t, window = [model.t0, model.t1]) => (window[1] === window[0] ? 0.5 : (t - window[0]) / (window[1] - window[0]));

/** A series' reading at t: the value at a reading, interpolated linearly between two, null in a gap or outside. */
export function at(model, series, t) {
  const pts = model.geometry.get(series) ?? [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.t === t) return p.gap ? null : p;
    const q = pts[i + 1];
    if (q && p.t < t && t < q.t) {
      if (p.gap || q.gap) return null;
      const u = (t - p.t) / (q.t - p.t);
      return { t, y0: p.y0 + (q.y0 - p.y0) * u, y1: p.y1 + (q.y1 - p.y1) * u, gap: false };
    }
  }
  return null;
}

/** The drawn magnitude of a reading in its own unit (a layer's thickness, a line's value, a rank). */
const magnitude = (model, p) => (model.stacked ? p.y1 - p.y0 : p.y1);

/**
 * Where two series cross, solved on their readings (never read off a picture): every t* where a − b changes sign
 * between two consecutive shared times, with the level there (for a stack, the two thicknesses are equal there).
 * `b` may be a number: where `a` crosses that level.
 */
export function crossing(model, a, b) {
  const out = [];
  const level = typeof b === "number";
  const shared = model.times.filter((t) => at(model, a, t) && (level || at(model, b, t)));
  const d = (t) => magnitude(model, at(model, a, t)) - (level ? b : magnitude(model, at(model, b, t)));
  for (let i = 0; i + 1 < shared.length; i++) {
    const [t, u] = [shared[i], shared[i + 1]];
    const [da, db] = [d(t), d(u)];
    if (da === 0 && i === 0) out.push({ t, level: magnitude(model, at(model, a, t)) });
    if (da === 0 || db === 0 ? db === 0 : Math.sign(da) !== Math.sign(db)) {
      const w = db === 0 ? 1 : da / (da - db);
      const tc = t + (u - t) * w;
      out.push({ t: tc, level: magnitude(model, at(model, a, t)) + (magnitude(model, at(model, a, u)) - magnitude(model, at(model, a, t))) * w });
    }
  }
  return out;
}

/** A gesture's marks as the family reads them: the series they belong to, and their readings in time order. */
export function seriesOfMarks(model, names) {
  return [...new Set(names.map((n) => model.markOf.get(n)?.series).filter((s) => s !== undefined))];
}

/** The window a zoom onto these marks opens: their time span, widened to a tenth of the whole when it is one time. */
export function windowOf(model, names) {
  const ts = names.map((n) => model.markOf.get(n)?.t).filter(Number.isFinite);
  let [a, b] = [Math.min(...ts), Math.max(...ts)];
  const whole = model.t1 - model.t0;
  if (!(b - a >= whole * 0.1)) {
    const mid = (a + b) / 2;
    [a, b] = [Math.max(model.t0, mid - whole * 0.05), Math.min(model.t1, mid + whole * 0.05)];
  }
  return [a, b];
}

/** How many times a zoom onto these marks enlarges the time axis. */
export const zoomFactor = (model, names) => {
  const [a, b] = windowOf(model, names);
  return (model.t1 - model.t0) / (b - a || 1);
};

/** The family's locks over a sequence of picture states: one value scale (a time window never moves the value axis),
 *  a zoom prints its factor. A state is { window, factorPrinted }. */
export function invariants(states) {
  states.forEach((s, i) => {
    if (s.window && !s.factorPrinted) throw new Error(`state ${i} zooms the time axis without printing its factor (no-let-camera-magnification): write the factor in the zoom's note`);
  });
}

// ── the core, with the family's figures and refusals ─────────────────────────────────────────────────

/**
 * The marks the core resolves, plus the per-mark facts its rank-word and figure checks read: a reading's own value,
 * its value in a column of its own series (so "highest" on a series' peak holds), and in a column of its own time
 * (so "third in 2016" holds against the ranking at 2016). A bump's readings are ranks: its columns hold the negated
 * rank, and the measure the rank is computed from is a fact a note may state.
 */
export function factsOf(model, base = {}) {
  const facts = { ...base };
  const S = model.series;
  const T = model.times;
  const bump = model.variant === "bump-ranking-over-time";
  for (const m of model.marks) {
    const v = bump ? -m.value : m.value;
    facts[m.name] = [
      bump ? model.measureOf.get(m.name) : m.value,
      ...S.map((s) => (s === m.series ? v : -Infinity)),
      ...T.map((t) => (t === m.t ? v : -Infinity)),
    ];
  }
  return facts;
}

/** The series the claim names: the recorded entity, else the first series the takeaway names, else the beat's own. */
export function claimSeries(model, claim, fallback) {
  const named = (text) => model.series.filter((s) => text && wordsOf(text).includes(wordsOf(s)));
  const first = (text) => {
    const hits = named(text);
    const pos = (s) => fold(text).indexOf(fold(s));
    return hits.sort((a, b) => pos(a) - pos(b))[0];
  };
  const subject = model.series.length === 1 ? model.series[0] : first(claim.entity) ?? first(claim.takeaway) ?? first(claim.subject) ?? first(fallback);
  const versus = first(claim.versus) ?? named(claim.comparison).find((s) => s !== subject) ?? named(claim.takeaway).find((s) => s !== subject);
  return { subject, versus };
}

/** A note's numbers as they must read for a zoom's factor (the core does not check a zoom's note). */
function assertFactor(g, i, factor) {
  const printed = figuresIn(g.note);
  if (printed.some((n) => Math.abs(n.value - factor) <= 0.5 * 10 ** -n.decimals + 1e-9)) return;
  const n = printed[0];
  const fixed = factor.toFixed(n.decimals).replace(".", n.separator === "," ? "," : ".");
  const value = g.note.slice(0, n.index) + fixed + g.note.slice(n.index + n.raw.length);
  throw new GestureRefusal(`gestures[${i}].note`, `prints the factor ${n.raw}, but the zoom enlarges the time axis ×${factor.toFixed(2)}: write "${value}"`, { set: { index: i, field: "note", value } });
}

/** The family's hooks for validateGestures: its own figures and its own refusals, per variant. */
export function timeHooks(model) {
  const additive = ADDITIVE.has(model.variant);
  const lastOf = (s) => model.marks.filter((m) => m.series === s).at(-1)?.name;
  const hooks = {
    figures(g, { marks }) {
      const out = [];
      const series = seriesOfMarks(model, marks);
      // A compare of two whole series: where they cross, solved.
      if (g.do === "compare" && marks.length > 2 && series.length === 2) for (const c of crossing(model, series[0], series[1])) out.push(c.level);
      // A reading's place among the series at its time, and its share of the stack there.
      for (const name of marks.length <= 3 ? marks : []) {
        const m = model.markOf.get(name);
        if (!m) continue;
        out.push(model.rankAt(m.t, m.series));
        if (model.stacked) {
          const total = model.series.reduce((s, x) => s + (Number.isFinite(model.read(x, m.t)) ? model.read(x, m.t) : 0), 0);
          out.push(total, (m.value / total) * 100);
        }
        if (model.variant === "bump-ranking-over-time") out.push(model.measureOf.get(name));
      }
      // A bracket's run of time: how many times it spans ("the 38 years after 1986").
      if (g.do === "bracket") out.push(new Set(marks.map((n) => model.markOf.get(n)?.t)).size);
      // A compare of two readings: the ranks moved and the measures behind them (bump).
      if (g.do === "compare" && marks.length === 2) {
        const [a, b] = marks.map((n) => model.markOf.get(n));
        if (a && b && model.variant === "bump-ranking-over-time") out.push(Math.abs(a.value - b.value), model.measureOf.get(a.name), model.measureOf.get(b.name));
      }
      return out;
    },
    refuse(g, ctx) {
      refuseShape(g, ctx);
      refuseFigures(g, ctx, hooks.figures(g, ctx));
    },
  };
  return hooks;

  /**
   * A note's numbers held to what THIS gesture draws on a time series. The core also admits the beat's whole and
   * every mark's rank among all readings as context figures; a line's or a ranking's whole is no reading anyone
   * draws, and a series holds a rank for every reading, so "rank 2" on India's 3rd place passed as the whole of the
   * ranks at a thousandth, and any integer under the reading count passed on a highlighted series. A figure that
   * only those give is refused here; a near one is offered as the gesture's own.
   */
  function refuseFigures(g, { marks, index: i }, family) {
    if (g.note === undefined || !String(g.note).trim() || g.do === "zoom") return;
    const ms = marks.map((n) => model.markOf.get(n)).filter(Boolean);
    const pool = [...family];
    const pair = (a, b) => [a, b, a - b, b - a, Math.abs(a - b), a / b, b / a, (a / b - 1) * 100, (1 - a / b) * 100, (b / a - 1) * 100, (1 - b / a) * 100];
    for (const m of ms) pool.push(m.value, model.measureOf.get(m.name));
    if (g.do === "compare" && ms.length === 2) pool.push(...pair(ms[0].value, ms[1].value), ...pair(model.measureOf.get(ms[0].name), model.measureOf.get(ms[1].name)));
    if (g.do === "bracket") {
      const sum = ms.reduce((t, m) => t + m.value, 0);
      const whole = model.marks.reduce((t, m) => t + m.value, 0);
      pool.push(sum, whole, (sum / whole) * 100, sum / whole, whole - sum);
    }
    if (g.do === "reference") pool.push(Number(g.value));
    const figures = pool.filter(Number.isFinite);
    const stated = figuresIn(g.note);
    const near = (n, f) => [f, ...(n.exp ? [f / 10 ** n.exp] : [])].some((x) => Math.abs(n.value - x) <= 0.5 * 10 ** -n.decimals + 1e-9);
    const SCALES = [0, -3, -6, -9, -12, 3, 6, 9, 12, -2, 2];
    const scale = SCALES.map((k) => ({ k, hits: stated.filter((n) => figures.some((f) => near(n, f * 10 ** k))).length })).reduce((a, b) => (b.hits > a.hits ? b : a), { k: 0, hits: -1 }).k;
    for (const n of stated) {
      if (figures.some((f) => near(n, f * 10 ** scale))) continue;
      const scaled = figures.map((f) => f * 10 ** scale);
      const best = scaled.reduce((a, f) => (Math.abs(f - n.value) < Math.abs(a - n.value) ? f : a), scaled[0] ?? Infinity);
      if (!(Math.abs(best - n.value) <= Math.abs(n.value) * 0.5))
        throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, which no reading this ${g.do} draws gives: drop the note, or check the readings it acts on (mark, marks)`, { set: { index: i, field: "note", value: undefined } });
      const text = Math.abs(best).toFixed(n.decimals).replace(".", n.separator === "," || n.decimalMark === "," ? "," : ".");
      const fixed = g.note.slice(0, n.index) + (best < 0 && !n.sign ? "-" : "") + text + g.note.slice(n.index + n.raw.length);
      throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, but the readings this ${g.do} draws give ${text}: write "${fixed}"`, { set: { index: i, field: "note", value: fixed } });
    }
  }

  function refuseShape(g, { marks, index: i }) {
      const series = seriesOfMarks(model, marks);
      if (g.do === "bracket" && !additive)
        throw new GestureRefusal(`gestures[${i}]`, `a ${model.variant === "line" ? "line's" : "ranking's"} readings do not add up to a sum or a share: drop the bracket, or compare two readings instead`, { remove: i });
      if (g.do === "compare" && g.of === "whole")
        throw new GestureRefusal(`gestures[${i}].of`, `the whole of a time series is every reading added up, which nothing here draws: compare two readings (marks: ["<time> · <series>", "<time> · <series>"]) or two series`, { remove: i });
      if (g.do === "reference" && model.variant === "streamgraph")
        throw new GestureRefusal(`gestures[${i}]`, `a streamgraph has no value axis, so a rule at a value draws nothing a reader can measure: annotate the band's reading instead`, { remove: i });
      if ((g.do === "name" || g.do === "annotate") && marks.length !== 1) {
        const target = series.length ? lastOf(series[0]) : model.marks.at(-1).name;
        throw new GestureRefusal(`gestures[${i}].mark`, `${g.do} writes on ONE reading, and "${g.mark ?? g.marks}" is ${marks.length} of them: name one, e.g. its last, "${target}"`, { set: { index: i, field: "mark", value: target } });
      }
      if (g.do === "trace" && series.length > 1)
        throw new GestureRefusal(`gestures[${i}].mark`, `a trace draws ONE series in time order; this one names ${series.join(", ")}: trace one of them`, { set: { index: i, field: "mark", value: series[0] } });
      if (g.do === "compare" && marks.length > 2) {
        if (series.length !== 2)
          throw new GestureRefusal(`gestures[${i}].marks`, `a compare sets two readings, or two whole series, side by side; this one names ${marks.length} readings of ${series.length} series: give two`, {
            set: { index: i, field: "marks", value: [model.marks.find((m) => m.series === series[0])?.name, lastOf(series[0])].filter(Boolean) },
          });
        if (!crossing(model, series[0], series[1]).length)
          throw new GestureRefusal(`gestures[${i}].marks`, `${series[0]} and ${series[1]} never cross on the drawn readings, so there is no crossing to ring: compare their last readings instead`, {
            set: { index: i, field: "marks", value: [lastOf(series[0]), lastOf(series[1])] },
          });
      }
      if (g.do === "zoom") {
        const factor = zoomFactor(model, marks);
        if (!(factor > 1.0001)) throw new GestureRefusal(`gestures[${i}]`, `zoom onto ${marks.length} readings spanning the whole time axis enlarges nothing: drop it`, { remove: i });
        assertFactor(g, i, factor);
      }
  }
}

/**
 * The core's validation for this family: the claim's series named through their marks (a takeaway says "Lisboa",
 * never "2015 · Lisboa"), the per-mark facts, the family's hooks; and a web page whose every gesture rests is given
 * a compare of the subject's last reading against its first — a control this family draws — instead of the core's
 * bracket, which a line's readings would refuse (the repair must never revisit a list).
 */
/** @param {{ gestures: any, model: any, format: string, claim?: any, fallbackSubject?: any }} input */
export function validateTime({ gestures, model, format, claim = {}, fallbackSubject }) {
  const { subject, versus } = claimSeries(model, claim, fallbackSubject);
  const marksOf = (s) => model.marks.filter((m) => m.series === s).map((m) => m.name);
  const augmented = {
    ...claim,
    // The core names a series' marks from its name (a holder); a list of mark names would also name every key
    // ("2010 · Alpha" names 2010, and with it every series' 2010 reading).
    entity: subject ?? claim.entity,
    versus: versus ?? claim.versus,
    facts: factsOf(model, claim.facts ?? {}),
  };
  if (format === "web" && Array.isArray(gestures) && gestures.length && gestures.every((g) => WEB_RESTING.has(g?.do))) {
    const own = marksOf(subject ?? model.series[0]);
    throw new GestureRefusal("gestures", `a web page needs at least one gesture a reader asks for (compare, filter, zoom, trace${ADDITIVE.has(model.variant) ? ", bracket" : ""}); every gesture here rests on the page`, {
      add: { at: gestures.length, gesture: { do: "compare", marks: [own.at(-1), own[0]] } },
    });
  }
  // Refused before the core reads them: its own checks on a bracket's run would answer first, with a run of
  // readings a line's bracket could never draw.
  if (Array.isArray(gestures))
    gestures.forEach((g, i) => {
      if (g?.do === "bracket" && !ADDITIVE.has(model.variant))
        throw new GestureRefusal(`gestures[${i}]`, `a ${model.variant === "line" ? "line's" : "ranking's"} readings do not add up to a sum or a share: drop the bracket, or compare two readings instead`, { remove: i });
    });
  const rows = model.marks.map(({ name, value, key, series }) => ({ name, value, key, series }));
  // A trace with no mark draws the claim's series: it touches the takeaway like any gesture on that series.
  if (Array.isArray(gestures))
    gestures = gestures.map((g) => (g?.do === "trace" && g.mark === undefined && g.marks === undefined ? { ...g, mark: subject ?? model.series[0] } : g));
  const out = validateGestures({ gestures, rows, family: "time", format, claim: augmented, hooks: timeHooks(model) });
  return { ...out, subject, versus };
}

/** validateTime with each refusal's fix applied until it accepts (SPLASH_GESTURE_REPAIR=1), every repair returned. */
/** @param {{ gestures: any, model: any, format: string, claim?: any, fallbackSubject?: any, repair?: boolean, steps?: number, after?: (valid: any) => any }} input */
export function stageTime({ gestures, model, format, claim, fallbackSubject, repair = false, steps = 12, after }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const valid = validateTime({ gestures: list, model, format, claim, fallbackSubject });
      const extra = after ? after(valid) : {};
      return { gestures: list, ...valid, ...extra, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

/** A gesture's own marks and its `of` rows (the core merges them in `marks`). */
export const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/**
 * What every format reads off one validated list: per gesture its kind of picture, in the family's terms. A format
 * scheduler decides when each shows; none decides what it is.
 *   accent series (the subject's, or implicit), ring series (a highlight on another), back series (a filter),
 *   a ring + note on one reading (name, annotate), a level rewound or a thickness copied (compare of two readings),
 *   rings at solved crossings (compare of two series), a run of times tinted and summed (bracket), a rule (reference),
 *   a time window (zoom), a playhead (trace, reveal).
 */
/** @param {{ format?: (v: number) => string, subject?: string }} [options] */
export function pictureOf(model, valid, { format = String, subject } = {}) {
  const seriesOf = (names) => seriesOfMarks(model, names);
  const subjectSeries = subject ?? seriesOf(valid.find((g) => g.subject !== undefined)?.subject ? [valid.find((g) => g.subject !== undefined).subject] : [])[0];
  const highlighted = valid.filter((g) => g.do === "highlight").flatMap((g) => seriesOf(g.marks));
  const accent = subjectSeries ?? highlighted[0] ?? seriesOf(valid.find((g) => g.marks?.length)?.marks ?? [])[0] ?? model.series[0];
  const level = model.variant === "line" || model.variant === "bump-ranking-over-time" || (model.variant === "area-and-stacked-area" && model.series.length === 1);
  const items = valid.map((g, k) => {
    const { own } = splitMarks(g);
    const series = seriesOf(own);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    const base = { k, do: g.do, marks: own, series, note };
    const pt = (name) => {
      const m = model.markOf.get(name);
      const p = m && at(model, m.series, m.t);
      return m && p ? { name, series: m.series, t: m.t, key: m.key, value: m.value, y0: p.y0, y1: p.y1 } : null;
    };
    switch (g.do) {
      case "highlight":
        return { ...base, accent: series.filter((s) => s === accent), ring: series.filter((s) => s !== accent), at: own.length === 1 ? pt(own[0]) : null };
      case "filter":
        return { ...base, keep: series, back: model.series.filter((s) => !series.includes(s)) };
      case "name":
      case "annotate": {
        const p = pt(own[0]);
        const shown = model.variant === "bump-ranking-over-time" ? `#${p.value}` : format(model.measureOf.get(own[0]));
        return { ...base, at: p, text: note ?? (g.do === "name" ? `${p.series} ${p.key}: ${shown}` : shown) };
      }
      case "compare": {
        if (own.length === 2) {
          const [a, b] = own.map(pt);
          return { ...base, kind: level ? "level" : "copy", a, b, value: magnitude(model, b) };
        }
        const cross = crossing(model, series[0], series[1]).map((c) => {
          const p = at(model, series[0], c.t) ?? {};
          return { t: c.t, level: c.level, y: (p.y0 + p.y1) / 2 };
        });
        return { ...base, kind: "crossing", crossings: cross };
      }
      case "bracket": {
        const ms = own.map((n) => model.markOf.get(n)).filter(Boolean);
        const ts = ms.map((m) => m.t);
        const sum = ms.reduce((s, m) => s + m.value, 0);
        const whole = model.marks.reduce((s, m) => s + m.value, 0);
        const layers = [...new Set(ms.map((m) => m.series))];
        return { ...base, from: Math.min(...ts), to: Math.max(...ts), layers, sum, whole, ofWhole: g.of === "whole", share: (sum / whole) * 100 };
      }
      case "reference":
        return { ...base, value: Number(g.value) };
      case "zoom":
        return { ...base, window: windowOf(model, own), factor: zoomFactor(model, own) };
      case "trace": {
        const p = own.length === 1 ? pt(own[0]) : null;
        return { ...base, to: p ? p.t : model.t1, traced: series.length ? series : [accent], at: p };
      }
      default:
        return base;
    }
  });
  return { accent, items };
}
