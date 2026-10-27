// The XY scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's scroll
// interpolating continuously from one card's state to the next, then a closing card carrying the limits, on which
// the whole chart returns (a zoom's window opens back to the full plot, a filter's stepped-back points return, what
// was shown stays marked).
//
// A state is a flat record of finite numbers: the plot's window (x0, x1, y0, y1, in the adapter's axis units), per
// gesture its progress g<k> (a ring arriving, a path tracing, the legs of a compare drawing), per filter its strength
// b<k> (1 while it holds, 0 once a pull-back or the closing card releases it), `ink` (a reveal), and `note` (which
// card's note the header reads). Every card sets its own g<k> and note, so every card changes the picture.
//
// Each card's prose is its gesture's `card`, written by the model in beat.mjs; every number in it is checked against
// the figures the plate draws (the marks' x and y, the gestures' derived figures) and a card whose gesture draws a
// figure (a rule, a compare, a filter, a trace) must state one. A card refusal is a gesture refusal: it names
// `gestures[i].card` and carries a fix, so SPLASH_GESTURE_REPAIR repairs it like any other.
//
// The drive (`applyXYState`) is ONE self-contained function — no import, no reference to this module's scope —
// emitted as source and inlined by the scrolly skill's renderScrolly. Browser-safe: no Node module.
import { figuresIn, GestureRefusal } from "./gesture-core.mjs";
import { pictureAt, planXY } from "./gesture-family-xy.mjs";

export const APPLY = "applyXYState";

/**
 * @param gestures validateGestures' list (family "xy", format "scrolly")
 * @param xy       the adapter
 * @returns        { plan, accentMark, states } — one state per gesture card, then the closing card's
 */
export function scheduleScrollyXY({ gestures, xy }) {
  const { plan, accentMark } = planXY({ gestures, xy });
  const filters = plan.filter((p) => p.do === "filter").map((p) => p.k);
  const base = { x0: xy.full.x[0], x1: xy.full.x[1], y0: xy.full.y[0], y1: xy.full.y[1], ink: plan.some((p) => p.do === "reveal") ? 0 : 1, note: 0 };
  plan.forEach((p) => (base[`g${p.k}`] = 0));
  filters.forEach((k) => (base[`b${k}`] = 0));
  const states = [];
  let state = base;
  plan.forEach((p, k) => {
    const on = Object.fromEntries(plan.slice(0, k + 1).map((q) => [q.k, 1]));
    const picture = pictureAt({ plan, accentMark, xy, on });
    const next = { ...state, [`g${k}`]: 1, note: k, x0: picture.dom.x[0], x1: picture.dom.x[1], y0: picture.dom.y[0], y1: picture.dom.y[1] };
    if (p.do === "reveal") next.ink = 1;
    if (p.do === "filter") next[`b${k}`] = 1;
    if (p.do === "pull-back") {
      if (!p.release) throw new GestureRefusal(`gestures[${k}]`, `pull-back has no zoom or filter to return from, so card ${k + 1} would change nothing (the closing card already shows the whole chart): drop it`, { remove: k });
      filters.forEach((f) => (next[`b${f}`] = 0));
    }
    states.push(next);
    state = next;
  });
  // THE CLOSING CARD: the whole chart, every point back, what was shown still marked.
  const closing = { ...state, x0: xy.full.x[0], x1: xy.full.x[1], y0: xy.full.y[0], y1: xy.full.y[1], note: plan.length };
  filters.forEach((f) => (closing[`b${f}`] = 0));
  states.push(closing);
  return { plan, accentMark, states };
}

const paragraphsOf = (card) => [card].flat().map((p) => (typeof p === "string" ? p : ""));
const SCALES = [0, -3, -6, -9, 3, 6, 9, -2, 2];
const matches = (n, f) => Math.abs(n.value - f) <= 0.5 * 10 ** -n.decimals + 1e-9;
const DRAWS_A_FIGURE = new Set(["reference", "filter", "compare", "trace", "zoom"]);

/**
 * Every gesture's card checked against what the plate draws. Returns the cards; throws a GestureRefusal naming
 * `gestures[i].card` and a fix (the gesture's own note, which the core has already checked, when the card is wrong).
 */
export function checkCardsXY({ gestures, xy, facts = {} }) {
  const known = [
    xy.heads.length,
    xy.marks.length,
    ...xy.marks.flatMap((m) => [m.value, m.x, ...(m.size !== undefined ? [m.size] : [])]),
    ...gestures.flatMap((g) => g.figures ?? []),
    ...Object.values(facts).flat(),
  ].filter(Number.isFinite);
  const label = (n) => xy.byName.get(n)?.series ?? n;
  return gestures.map((g, k) => {
    const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
    const where = `card ${k + 1} (${g.do}${own ? ` on ${g.marks.slice(0, own).map(label).join(", ")}` : ""})`;
    const fallback = g.note ?? (own ? label(g.marks[0]) : `${xy.heads.length}`);
    const paragraphs = paragraphsOf(g.card);
    if (g.card === undefined || !paragraphs.length || paragraphs.some((p) => !p.trim()))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} has no prose: give the gesture a card, the sentence the reader reads while it plays, in the story's language`, {
        set: { index: k, field: "card", value: fallback },
      });
    const stated = paragraphs.flatMap((text) => figuresIn(text));
    const scale = SCALES.map((s) => ({ s, hits: stated.filter((n) => known.some((f) => matches(n, f * 10 ** s))).length })).reduce((a, b) => (b.hits > a.hits ? b : a), { s: 0, hits: -1 }).s;
    for (const n of stated) {
      if (known.some((f) => matches(n, f * 10 ** scale))) continue;
      throw new GestureRefusal(`gestures[${k}].card`, `${where} states ${n.raw}, which no figure the plate draws rounds to: compute it from the rows, or say what the picture shows`, {
        set: { index: k, field: "card", value: fallback },
      });
    }
    const figures = (g.figures ?? []).filter(Number.isFinite);
    if (DRAWS_A_FIGURE.has(g.do) && figures.length && !stated.some((n) => figures.some((f) => matches(n, f * 10 ** scale))))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} must state a figure its picture draws, and states none`, {
        set: { index: k, field: "card", value: g.note !== undefined ? [...paragraphs.slice(0, -1), `${paragraphs.at(-1).trim()} (${g.note})`] : fallback },
      });
    return { id: `card-${k + 1}-${g.do}`, prose: paragraphs };
  });
}

// ── the drive ─────────────────────────────────────────────────────────────────────────────────────

export const driveSource = () => applyXYState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it, because its source is inlined into
 * the page alone. Every mark is laid out in the reader's pixels on each paint: the plot fills the stage less a y tick
 * gutter and an x tick row; the window (x0…y1) maps data to pixels; each gesture's effect is weighted by its g<k>.
 */
export function applyXYState(root, state, context) {
  const carrier = root.querySelector("[data-gxy]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const set = (el, attrs) => {
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  };
  const place = (el, left, top, transform, opacity) => Object.assign(el.style, { left: `${left}px`, top: `${top}px`, transform, opacity: String(opacity) });

  if (context.resized || !root.__gxy) {
    const data = root.__gxyData || (root.__gxyData = JSON.parse(carrier.getAttribute("data-gxy")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const all = (sel) => Array.from(stage.querySelectorAll(sel));
    root.__gxy = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      pts: data.marks.map((_, i) => q(`[data-pt="${i}"]`)),
      rings: data.marks.map((_, i) => q(`[data-ptring="${i}"]`)),
      paths: data.paths.map((_, j) => q(`[data-path="${j}"]`)),
      traces: data.paths.map((_, j) => q(`[data-trace="${j}"]`)),
      tags: data.tags.map((_, i) => q(`[data-tag="${i}"]`)),
      rules: data.rules.map((_, i) => q(`[data-rule="${i}"]`)),
      ruleTags: data.rules.map((_, i) => q(`[data-ruletag="${i}"]`)),
      legs: data.compares.map((_, i) => [q(`[data-leg="${i}-x"]`), q(`[data-leg="${i}-y"]`)]),
      xt: all("[data-xt]"),
      yt: all("[data-yt]"),
      grid: all("[data-gridline]"),
      notes: data.notes.map((_, k) => root.querySelector(`[data-note="${k}"]`)),
      yGutter: Math.max(0, ...all("[data-yt]").map((n) => n.getBoundingClientRect().width)),
    };
  }
  const c = root.__gxy;
  const d = c.data;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  const left = c.yGutter + 10;
  const right = SW - 6;
  const top = 8;
  const bottom = SH - 26;
  const tx = (x) => (d.log ? Math.log10(x) : x);
  const X = (x) => left + ((tx(x) - state.x0) / (state.x1 - state.x0 || 1)) * (right - left);
  const Y = (y) => bottom - ((y - state.y0) / (state.y1 - state.y0 || 1)) * (bottom - top);
  const inside = (x, y) => x >= left - 1 && x <= right + 1 && y >= top - 1 && y <= bottom + 1;
  const g = (k) => clamp(state[`g${k}`] ?? 0);

  // Emphasis per mark: the subject's accent always; each highlight, name or compare's ring by its progress; each
  // filter steps the others back by its strength.
  const n = d.marks.length;
  const accent = d.marks.map((m) => (m.accent ? 1 : 0));
  const ring = new Array(n).fill(0);
  const back = new Array(n).fill(0);
  for (const e of d.effects) {
    const t = g(e.k);
    for (const i of e.accent ?? []) accent[i] = Math.max(accent[i], t);
    for (const i of e.ring ?? []) ring[i] = Math.max(ring[i], t);
    if (e.kept) {
      const b = clamp(state[`b${e.k}`] ?? 0);
      const keep = new Set(e.kept);
      for (let i = 0; i < n; i++) if (!keep.has(i)) back[i] = Math.max(back[i], b);
    }
  }
  const order = d.revealOrder;
  const shown = new Array(n).fill(1);
  if (d.reveal) order.forEach((group, rank) => group.forEach((i) => (shown[i] = clamp(state.ink * order.length - rank))));
  const mix = (a, b, t) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
  };
  const small = Math.min(SW, SH);
  const R = Math.max(2.5, small * 0.008);
  const rMax = small * 0.05;

  d.marks.forEach((m, i) => {
    const x = X(m.x);
    const y = Y(m.y);
    const el = c.pts[i];
    const vis = inside(x, y) ? shown[i] * (1 - 0.8 * back[i]) : 0;
    const true_ = d.sized ? rMax * Math.sqrt(m.s / d.maxSize) : R;
    const r = d.sized ? Math.max(1.6, true_) : m.start ? R * 0.9 : R;
    const fill = mix(d.colours.neutral, d.colours.accent, accent[i]);
    const hollow = m.start || (d.sized && true_ < 1.6);
    set(el, { cx: x, cy: y, r, fill: hollow ? d.colours.ground : fill, stroke: fill, "stroke-width": hollow || d.sized ? 1.2 : 0, "fill-opacity": d.sized && accent[i] < 0.5 && !hollow ? 0.45 : 1, opacity: vis });
    set(c.rings[i], { cx: x, cy: y, r: r + R * 1.4, opacity: vis * ring[i] });
  });
  d.paths.forEach((p, j) => {
    const pts = p.marks.map((i) => [X(d.marks[i].x), Y(d.marks[i].y)]);
    const head = p.marks[p.marks.length - 1];
    const a = accent[head];
    const vis = shown[head] * (1 - 0.8 * back[head]);
    set(c.paths[j], { points: pts.map((q) => q.join(",")).join(" "), stroke: mix(d.colours.neutral, d.colours.accent, a), "stroke-width": 1.2 + 1.4 * a, opacity: vis });
    let t = 0;
    for (const e of d.effects) if (e.traced && e.traced.includes(j)) t = Math.max(t, g(e.k));
    const segs = pts.length - 1;
    const reach = t * segs;
    const whole = Math.floor(reach);
    const drawn = pts.slice(0, whole + 1);
    if (whole < segs && reach > whole) {
      const [ax, ay] = pts[whole];
      const [bx, by] = pts[whole + 1];
      const f = reach - whole;
      drawn.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
    }
    set(c.traces[j], { points: drawn.map((q) => q.join(",")).join(" "), stroke: a > 0.5 ? d.colours.accent : d.colours.ink, opacity: t > 0 ? vis : 0 });
  });
  d.rules.forEach((r, i) => {
    const t = g(r.k);
    if (r.axis === "x") {
      const x = X(r.value);
      set(c.rules[i], { x1: x, x2: x, y1: bottom, y2: bottom - (bottom - top) * t, opacity: inside(x, top) ? 1 : 0 });
      place(c.ruleTags[i], x + 4, top, "none", inside(x, top) ? t : 0);
    } else {
      const y = Y(r.value);
      set(c.rules[i], { x1: left, x2: left + (right - left) * t, y1: y, y2: y, opacity: inside(left, y) ? 1 : 0 });
      place(c.ruleTags[i], right, y - 4, "translate(-100%, -100%)", inside(left, y) ? t : 0);
    }
  });
  d.compares.forEach((cmp, i) => {
    const t = g(cmp.k);
    const [ax, ay] = [X(d.marks[cmp.a].x), Y(d.marks[cmp.a].y)];
    const [bx, by] = [X(d.marks[cmp.b].x), Y(d.marks[cmp.b].y)];
    const tx1 = clamp(t * 2);
    const ty1 = clamp(t * 2 - 1);
    set(c.legs[i][0], { x1: ax, x2: ax + (bx - ax) * tx1, y1: ay, y2: ay, opacity: t > 0 ? 1 : 0 });
    set(c.legs[i][1], { x1: bx, x2: bx, y1: ay, y2: ay + (by - ay) * ty1, opacity: ty1 > 0 ? 1 : 0 });
  });
  d.tags.forEach((tag, i) => {
    let o = d.marks[tag.mark].accent ? 1 : 0;
    for (const k of tag.items) o = Math.max(o, g(k));
    const m = d.marks[tag.mark];
    const x = X(m.x);
    const y = Y(m.y);
    const el = c.tags[i];
    const rightSide = x + 8 + el.getBoundingClientRect().width < right;
    el.style.color = accent[tag.mark] > 0.5 ? d.colours.accentInk : d.colours.ink;
    place(el, rightSide ? x + 8 : x - 8, y - 6, rightSide ? "translateY(-100%)" : "translate(-100%, -100%)", inside(x, y) ? o * shown[tag.mark] : 0);
  });
  // Ticks: the set whose window is nearest the current one, placed on it; the others hidden.
  const span = state.x1 - state.x0;
  let best = 0;
  d.tickSets.forEach((s, i) => {
    if (Math.abs(s.span - span) < Math.abs(d.tickSets[best].span - span)) best = i;
  });
  c.xt.forEach((el) => {
    const [s, v] = el.getAttribute("data-xt").split("|").map(Number);
    const x = X(v);
    place(el, x, bottom + 6, "translateX(-50%)", s === best && x >= left - 1 && x <= right + 1 ? 1 : 0);
  });
  c.yt.forEach((el) => {
    const [s, v] = el.getAttribute("data-yt").split("|").map(Number);
    const y = Y(v);
    place(el, left - 8, y, "translate(-100%, -50%)", s === best && y >= top - 1 && y <= bottom + 1 ? 1 : 0);
  });
  c.grid.forEach((el) => {
    const [axis, s, v] = el.getAttribute("data-gridline").split("|");
    const on = Number(s) === best;
    if (axis === "x") {
      const x = X(Number(v));
      set(el, { x1: x, x2: x, y1: top, y2: bottom, opacity: on && x >= left && x <= right ? 1 : 0 });
    } else {
      const y = Y(Number(v));
      set(el, { x1: left, x2: right, y1: y, y2: y, opacity: on && y >= top && y <= bottom ? 1 : 0 });
    }
  });
  c.notes.forEach((node, k) => {
    if (node) node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}
