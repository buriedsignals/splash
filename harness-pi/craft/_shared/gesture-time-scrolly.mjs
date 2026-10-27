// The Time-series scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's
// scroll interpolating continuously from one card's state to the next, then a closing card carrying the limits on
// which the whole chart returns (the time window opens back to the whole span, every series is drawn to its end and
// back in its ink, what was shown stays marked).
//
// A state is a flat record of finite numbers (`assertStates`, the scrolly skill's reveal.mjs): `play` (how far, as a
// share of the time span, every series is drawn — linear in time, never eased by the model), `lead` (how far the
// traced series is drawn), `x0`/`x1` (the time window, in time units: a zoom; its factor is printed in its note),
// per drawn series `accent<i>`, `ring<i>`, `back<i>`, per gesture `g<k>` (its marks arriving) and `note` (which
// card's note the header reads). Every card sets its own `g<k>` and `note`, so every card changes the picture.
//
// Each card's prose is its gesture's `card`, written by the model in beat.mjs; every number in it is checked against
// the readings and the family's figures, and a card whose picture shows a figure must state it. A card refusal is a
// gesture refusal: it names `gestures[i].card` and carries a fix, so SPLASH_GESTURE_REPAIR repairs it like any other.
//
// The drive (`applyTimeState`) is ONE self-contained function — no import, no reference to this module's scope —
// emitted as source and inlined by the scrolly skill's renderScrolly. Browser-safe: no Node module.
import { figuresIn, gapFigures, GestureRefusal } from "./gesture-core.mjs";
import { pictureOf } from "./gesture-family-time.mjs";

/** The name the scrolly skill calls to paint a state. */
export const APPLY = "applyTimeState";

/** Where a reading's mark sits, in the variant's y-units: a line's or a rank's value, a band's middle. */
const tipOf = (model, p) => (model.variant === "line" || model.variant === "bump-ranking-over-time" || (!model.stacked) || model.series.length === 1 ? p.y1 : (p.y0 + p.y1) / 2);

/**
 * @param model   timeModel's output
 * @param valid   validateTime's `gestures`
 * @param subject validateTime's `subject` (the claim's series)
 * @returns       { states, plan, accent } — one state per gesture card, then the closing card's
 */
export function scheduleTimeScrolly({ model, valid, format = String, subject }) {
  const { accent, items } = pictureOf(model, valid, { format, subject });
  const S = model.series;
  const idx = (s) => S.indexOf(s);
  const span = model.t1 - model.t0 || 1;
  const frac = (t) => Math.max(0, Math.min(1, (t - model.t0) / span));
  const hasReveal = items.some((i) => i.do === "reveal");
  const traceItem = items.find((i) => i.do === "trace");
  const traced = traceItem ? traceItem.traced : [];

  const base = { play: hasReveal ? 0 : 1, lead: traceItem ? 0 : hasReveal ? 0 : 1, x0: model.t0, x1: model.t1, note: 0 };
  S.forEach((s, i) => Object.assign(base, { [`accent${i}`]: s === accent ? 1 : 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  items.forEach((it) => (base[`g${it.k}`] = 0));

  const plan = [];
  const states = [];
  let state = base;
  for (const it of items) {
    const next = { ...state, [`g${it.k}`]: 1, note: it.k };
    const item = { k: it.k, do: it.do, kind: it.kind, note: it.note, shown: [] };
    const measure = (name) => model.measureOf.get(name);
    switch (it.do) {
      case "highlight":
        for (const s of it.ring) next[`ring${idx(s)}`] = 1;
        for (const s of it.accent) next[`accent${idx(s)}`] = 1;
        break;
      case "filter":
        S.forEach((s, i) => (next[`back${i}`] = it.back.includes(s) ? 1 : 0));
        break;
      case "name":
      case "annotate":
        item.t = it.at.t;
        item.y = tipOf(model, it.at);
        item.series = idx(it.at.series);
        item.ring = it.do === "name";
        item.text = it.text;
        item.shown = model.variant === "bump-ranking-over-time" ? [it.at.value, measure(it.at.name)] : [measure(it.at.name)];
        break;
      case "compare":
        if (it.kind === "crossing") {
          item.pts = it.crossings.map((c) => [c.t, model.variant === "line" || model.variant === "bump-ranking-over-time" ? c.level : c.y]);
          // A crossing's picture is its rings: the solved levels are figures a card may state, not one it must.
          item.levels = it.crossings.map((c) => c.level);
        } else {
          item.a = [it.a.t, tipOf(model, it.a), it.a.y0, it.a.y1];
          item.b = [it.b.t, tipOf(model, it.b), it.b.y0, it.b.y1];
          const [va, vb] = model.variant === "bump-ranking-over-time" ? [it.a.value, it.b.value] : [measure(it.a.name), measure(it.b.name)];
          item.ratio = vb ? va / vb : undefined;
          item.shown = [va, vb, va - vb, vb - va];
          item.gap = Math.abs(va - vb);
        }
        break;
      case "bracket":
        item.from = it.from;
        item.to = it.to;
        item.layers = it.layers.map(idx);
        item.shown = it.ofWhole ? [it.sum, it.whole, it.share] : [it.sum];
        if (it.ofWhole) item.ratio = it.sum / it.whole;
        break;
      case "reference":
        item.value = it.value;
        item.shown = [it.value];
        break;
      case "zoom":
        [next.x0, next.x1] = it.window;
        item.shown = [it.factor];
        break;
      case "trace": {
        const f = frac(it.to);
        if (traced.length) next.lead = f;
        if (it.at) item.shown = [model.variant === "bump-ranking-over-time" ? it.at.value : measure(it.at.name)];
        item.t = it.to;
        break;
      }
      case "reveal":
        next.play = 1;
        if (!traceItem || traceItem.k < it.k) next.lead = 1;
        break;
      case "pull-back":
        next.x0 = model.t0;
        next.x1 = model.t1;
        S.forEach((_, i) => (next[`back${i}`] = 0));
        next.play = 1;
        break;
      default:
        throw new GestureRefusal(`gestures[${it.k}].do`, `"${it.do}" has no scrolly staging`, { remove: it.k });
    }
    // A mark the staging lays past the traced head draws the series up to it: a reading is never marked undrawn.
    const reach = [item.t, item.a?.[0], item.b?.[0], item.to, ...(item.pts ?? []).map((p) => p[0])].filter((t) => Number.isFinite(t) && it.do !== "trace");
    if (reach.length) {
      next.lead = Math.max(next.lead, frac(Math.max(...reach)));
      next.play = Math.max(next.play, frac(Math.max(...reach)));
    }
    plan.push(item);
    states.push(next);
    state = next;
  }
  // THE CLOSING CARD: the whole span, every series drawn to its end and back in its ink, what was shown still marked.
  const closing = { ...state, play: 1, lead: 1, x0: model.t0, x1: model.t1, note: items.length };
  S.forEach((_, i) => (closing[`back${i}`] = 0));
  // The closing card must change the picture: when nothing is left to return, its own field does.
  closing.close = 1;
  for (const s of states) s.close = 0;
  states.push(closing);
  return { states, plan, accent, traced: traced.map(idx) };
}

// ── the cards' words ────────────────────────────────────────────────────────────────────────────────

const SCALES = [0, -3, -6, -9, -12, 3, 6, 9, 12, -2, 2];
const matches = (n, f) =>
  [f, ...(n.sign ? [] : [Math.abs(f)])].some((x) => [x, ...(n.exp ? [x / 10 ** n.exp] : [])].some((y) => Math.abs(n.value - y) <= 0.5 * 10 ** -n.decimals + 1e-9));
const RATIO_WORDS = [
  [/\b(twice|double|two times|deux fois)\b/i, 2],
  [/\b(three times|triple|thrice|trois fois)\b/i, 3],
  [/\bfour times\b/i, 4],
  [/\bhalf\b|\bmoitié\b/i, 0.5],
];
function formatLike(n, f) {
  const [whole, part] = Math.abs(f).toFixed(n.decimals).split(".");
  const body = n.grouped
    ? whole.replace(/\B(?=(\d{3})+$)/g, n.separator) + (part ? (n.decimalMark ?? (n.separator === "," ? "." : ",")) + part : "")
    : part ? whole + n.separator + part : whole;
  const sign = f < 0 ? (n.sign === "−" ? "−" : "-") : n.sign === "+" ? "+" : "";
  return sign + body;
}
const paragraphsOf = (card) => [card].flat().map((p) => (typeof p === "string" ? p : ""));

/**
 * Every gesture's card checked against its picture: present, every number one the readings give (one power-of-ten
 * scale per card), stating one of the figures its picture shows, every ratio word the ratio its picture draws.
 * Returns the cards' paragraphs; throws a GestureRefusal naming `gestures[i].card` and a fix.
 */
export function checkTimeCards({ model, valid, plan, format = String, subject, facts = {} }) {
  const known = [
    ...model.marks.map((m) => m.value),
    ...[...model.measureOf.values()],
    model.times.length,
    model.series.length,
    ...valid.flatMap((g) => g.figures ?? []),
    ...plan.flatMap((p) => [...(p.shown ?? []), ...(p.levels ?? [])]),
    ...valid.flatMap((g) => g.marks.flatMap((m) => facts[m] ?? [])),
  ].filter((f) => Number.isFinite(f));
  const subjectMarks = model.marks.filter((m) => m.series === subject);
  const lastSubject = subjectMarks.at(-1);
  const subjectLine = lastSubject
    ? `${subject} ${lastSubject.key} : ${model.variant === "bump-ranking-over-time" ? `#${lastSubject.value}` : format(model.measureOf.get(lastSubject.name))}`
    : String(subject ?? model.series[0]);

  return valid.map((g, k) => {
    const item = plan[k];
    const on = [g.mark ?? g.marks ?? []].flat().map(String);
    const where = `card ${k + 1} (${g.do}${on.length ? ` on ${on.slice(0, 2).join(", ")}${on.length > 2 ? ` and ${on.length - 2} more` : ""}` : ""})`;
    const primary = item.shown[0];
    const fallback = g.note ?? (primary !== undefined ? `${subject ?? ""} ${format(primary)}`.trim() : subjectLine);
    if (g.card === undefined || !paragraphsOf(g.card).length || paragraphsOf(g.card).some((p) => !p.trim()))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} has no prose: give the gesture a card, the sentence the reader reads while it plays, in the story's language`, {
        set: { index: k, field: "card", value: fallback },
      });
    const paragraphs = paragraphsOf(g.card);
    const setParagraph = (p, text) => {
      if (!Array.isArray(g.card)) return text;
      const next = [...g.card];
      next[p] = text;
      return next;
    };
    const stated = paragraphs.flatMap((text, p) => figuresIn(text).map((n) => ({ ...n, p })));
    const scale = SCALES.map((s) => ({ s, hits: stated.filter((n) => known.some((f) => matches(n, f * 10 ** s))).length })).reduce((best, c) => (c.hits > best.hits ? c : best), { s: 0, hits: -1 }).s;
    const figures = known.map((f) => f * 10 ** scale);
    for (const n of stated) {
      if (figures.some((f) => matches(n, f))) continue;
      const own = item.shown.map((f) => f * 10 ** scale);
      const pool = own.length ? own : figures;
      const best = pool.reduce((p, f) => (Math.abs(f - n.value) < Math.abs(p - n.value) ? f : p), pool[0]);
      const text = paragraphs[n.p];
      if (best === undefined || Math.abs(best - n.value) > Math.abs(n.value) * 0.5)
        throw new GestureRefusal(`gestures[${k}].card`, `${where} states ${n.raw}, which no reading gives: say what its picture shows`, { set: { index: k, field: "card", value: setParagraph(n.p, fallback) } });
      const fixed = text.slice(0, n.index) + formatLike(n, best) + text.slice(n.index + n.raw.length);
      throw new GestureRefusal(`gestures[${k}].card`, `${where} states ${n.raw}, which no reading rounds to; the closest its picture draws is ${formatLike(n, best)}: write "${fixed}"`, {
        set: { index: k, field: "card", value: setParagraph(n.p, fixed) },
      });
    }
    if (item.do === "compare" && item.gap !== undefined)
      for (const [p, text] of paragraphs.entries())
        for (const n of gapFigures(text)) {
          const gap = item.gap * 10 ** scale;
          if (matches(n, gap)) continue;
          const fixed = text.slice(0, n.index) + formatLike(n, gap) + text.slice(n.index + n.raw.length);
          throw new GestureRefusal(`gestures[${k}].card`, `${where} states ${n.raw} as a gap, but its picture draws a gap of ${formatLike(n, gap)}: write "${fixed}"`, { set: { index: k, field: "card", value: setParagraph(p, fixed) } });
        }
    const shown = item.shown.map((f) => f * 10 ** scale);
    if (shown.length && !stated.some((n) => shown.some((f) => matches(n, f))))
      throw new GestureRefusal(`gestures[${k}].card`, `${where} must state the figure its picture shows — ${format(primary)} — and states none`, {
        set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${format(primary)})`) },
      });
    // A card whose picture shows no figure of its own still carries the takeaway: it names the claim's series or
    // states a figure of the readings.
    const named = model.series.some((s) => paragraphs.some((p) => p.toLowerCase().includes(String(s).toLowerCase())));
    if (!shown.length && !stated.length && !named && subject !== undefined)
      throw new GestureRefusal(`gestures[${k}].card`, `${where} shows no figure of its own, so its card must carry the takeaway: name ${subject} or state one of its readings`, {
        set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${subjectLine})`) },
      });
    for (const [p, text] of paragraphs.entries())
      for (const [word, x] of RATIO_WORDS) {
        const said = text.match(word);
        if (!said) continue;
        const r = item.ratio;
        const more = /\b(more than|plus de)\b/i.test(text);
        const less = /\b(less|fewer) than\b|\bmoins de\b/i.test(text);
        if (r !== undefined && (more ? r > x : less ? r < x : Math.abs(r - x) <= x * 0.1)) continue;
        const fixed = text.replace(word, r === undefined ? "" : `${r.toFixed(1)} ×`).replace(/\s{2,}/g, " ").trim();
        throw new GestureRefusal(`gestures[${k}].card`, `${where} says ${said[0]}, but its picture ${r === undefined ? "draws no ratio" : `draws ${r.toFixed(2)}`}: state the ratio it draws, or drop the word`, {
          set: { index: k, field: "card", value: setParagraph(p, fixed) },
        });
      }
    return { id: `card-${k + 1}-${g.do}`, prose: paragraphs };
  });
}

// ── the drive ─────────────────────────────────────────────────────────────────────────────────────

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyTimeState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it, because its source is inlined into
 * the page alone. Reads the readings (per series [t, y0, y1, gap]) and the plan from `data-gtime`, maps time
 * linearly over the state's window and the variant's y-units over the plot, draws each series up to its playhead
 * (an interpolated point at the head), and places every gesture's marks and the direct end labels.
 */
export function applyTimeState(root, state, context) {
  const carrier = root.querySelector("[data-gtime]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const set = (el, attrs) => {
    if (!el) return;
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  };
  const place = (el, left, top, transform, opacity) => {
    if (!el) return;
    Object.assign(el.style, { left: `${left}px`, top: `${top}px`, transform, opacity: String(opacity) });
  };
  if (context.resized || !root.__gtime) {
    const data = root.__gtimeData || (root.__gtimeData = JSON.parse(carrier.getAttribute("data-gtime")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const qa = (sel) => Array.from(stage.querySelectorAll(sel));
    root.__gtime = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      clip: q('[data-part="clip"]'),
      base: q('[data-part="baseline"]'),
      head: q('[data-part="playhead"]'),
      headLabel: q('[data-part="headlabel"]'),
      series: data.series.map((_, i) => ({ path: q(`[data-series="${i}"]`), tint: q(`[data-tint="${i}"]`), end: q(`[data-end="${i}"]`) })),
      ygrid: qa("[data-ygrid]"),
      ylabels: qa("[data-ylabel]"),
      xlabels: qa("[data-xlabel]"),
      gaps: qa("[data-gap]"),
      plan: data.plan.map((p) => ({ ...p, els: qa(`[data-pk="${p.k}"]`) })),
      notes: data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`)),
      ylabelW: Math.max(0, ...qa("[data-ylabel]").map((el) => el.getBoundingClientRect().width)),
      endW: Math.max(0, ...data.series.map((_, i) => q(`[data-end="${i}"]`)?.getBoundingClientRect().width ?? 0)),
      lineH: q('[data-end="0"]')?.getBoundingClientRect().height || 16,
    };
  }
  const c = root.__gtime;
  const d = c.data;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  const top = c.lineH + 6;
  const bottom = SH - c.lineH - 8;
  const left = c.ylabelW ? c.ylabelW + 10 : 2;
  const right = SW - Math.min(SW * 0.34, c.endW + 10);
  set(c.clip, { x: left, y: 0, width: Math.max(1, right - left), height: SH });
  const X = (t) => left + ((t - state.x0) / (state.x1 - state.x0 || 1)) * (right - left);
  const Y = (v) => bottom - ((v - d.domain[0]) / (d.domain[1] - d.domain[0] || 1)) * (bottom - top);
  const span = d.t1 - d.t0 || 1;
  // An eased scroll lands a hair short of its card: a head within half a percent of its end is at the end.
  const headOf = (i) => {
    const u = clamp(d.traced.includes(i) ? state.lead : state.play);
    return d.t0 + span * (u >= 0.995 ? 1 : u);
  };

  // furniture
  d.yTicks.forEach((v, j) => {
    set(c.ygrid[j], { x1: left, x2: right, y1: Y(v), y2: Y(v) });
    place(c.ylabels[j], left - 8, Y(v), "translate(-100%, -50%)", 1);
  });
  set(c.base, { x1: left, x2: right, y1: bottom, y2: bottom });
  d.xTicks.forEach((t, j) => {
    const x = X(t);
    place(c.xlabels[j], x, bottom + 4, "translateX(-50%)", x >= left - 1 && x <= right + 1 ? 1 : 0);
  });

  // the series, each to its own head
  const ends = [];
  d.series.forEach((s, i) => {
    const head = headOf(i);
    const segs = [];
    let run = [];
    let last = null;
    for (let j = 0; j < s.pts.length; j++) {
      const p = s.pts[j];
      if (p[0] > head) {
        const q = run.length ? run[run.length - 1] : null;
        if (q && !p[3] && q[0] < head) {
          const u = (head - q[0]) / (p[0] - q[0]);
          run.push([head, q[1] + (p[1] - q[1]) * u, q[2] + (p[2] - q[2]) * u, 0]);
        }
        break;
      }
      if (p[3]) {
        if (run.length) segs.push(run);
        run = [];
        continue;
      }
      run.push(p);
    }
    if (run.length) segs.push(run);
    for (const sg of segs) if (sg.length) last = sg[sg.length - 1];
    // The label states the reading the head has reached, never the series' last one.
    let reached = -1;
    for (let j = 0; j < s.pts.length; j++) if (!s.pts[j][3] && s.pts[j][0] <= head + 1e-9) reached = j;
    let dPath = "";
    for (const sg of segs) {
      if (d.band) {
        dPath += sg.map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join("");
        dPath += sg.slice().reverse().map((p) => `L${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("") + "Z";
      } else dPath += sg.map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join("");
    }
    const accent = state[`accent${i}`] > 0.5;
    const ring = state[`ring${i}`] > 0.5;
    const back = clamp(state[`back${i}`]);
    const colour = accent ? d.colours.accent : ring ? d.colours.ring : i % 2 && d.band ? d.colours.light : d.colours.neutral;
    // A bracketed layer: the run the bracket spans in full, the rest of the layer lighter.
    const bracketG = Math.max(0, ...c.plan.filter((p) => p.do === "bracket" && p.layers.includes(i)).map((p) => clamp(state[`g${p.k}`])));
    const opacity = (1 - 0.82 * back) * (accent && bracketG > 0 ? 1 - 0.55 * bracketG : 1);
    if (d.band) set(c.series[i].path, { d: dPath || "M0,0", fill: colour, opacity, stroke: d.colours.ground, "stroke-width": ring ? 0 : 0.8 });
    else set(c.series[i].path, { d: dPath || "M0,0", stroke: colour, opacity, "stroke-width": accent ? 3 : ring ? 2.2 : 1.4 });
    if (c.series[i].tint) {
      const pb = c.plan.find((p) => p.do === "bracket" && p.layers.includes(i));
      if (pb && d.band) {
        const sg = s.pts.filter((p) => !p[3] && p[0] >= pb.from && p[0] <= Math.min(pb.to, head));
        const tp = sg.length
          ? sg.map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join("") + sg.slice().reverse().map((p) => `L${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("") + "Z"
          : "M0,0";
        set(c.series[i].tint, { d: tp, fill: colour, opacity: bracketG * (1 - 0.82 * back) });
      }
    }
    // The direct end label at the series' head, in its own ink; a series that left the chart before the end is not
    // labelled unless the staging marks it.
    const endEl = c.series[i].end;
    if (endEl && last) {
      const shown = last[0] >= d.t1 - 1e-9 || head < d.t1 || accent || ring;
      const y = d.band ? Y((last[1] + last[2]) / 2) : Y(last[2]);
      const text = s.vals && reached >= 0 ? `${s.name} ${s.vals[reached]}` : s.name;
      if (s.name !== undefined && endEl.textContent !== text) endEl.textContent = text;
      endEl.style.color = accent ? d.colours.accentInk : d.colours.ink;
      endEl.style.fontWeight = accent ? "700" : "";
      ends.push({ el: endEl, x: Math.min(X(last[0]), right) + 6, y, opacity: shown ? 1 - 0.6 * back : 0 });
    } else if (endEl) endEl.style.opacity = "0";
  });
  ends.sort((a, b) => a.y - b.y);
  const pitch = c.lineH * 0.95;
  for (let k = 1; k < ends.length; k++) if (ends[k].opacity > 0 && ends[k].y - ends[k - 1].y < pitch) ends[k].y = ends[k - 1].y + pitch;
  const maxY = bottom;
  for (let k = ends.length - 1; k >= 0; k--) {
    const limit = k === ends.length - 1 ? maxY : ends[k + 1].y - pitch;
    if (ends[k].y > limit) ends[k].y = limit;
  }
  for (const e of ends) place(e.el, e.x, e.y, "translateY(-50%)", e.opacity);

  // gaps, drawn once the head has passed them
  c.gaps.forEach((el, j) => {
    const g = d.gaps[j];
    const passed = Math.min(...d.series.map((_, i) => headOf(i))) >= g.to - 1e-9 ? 1 : 0;
    if (g.rect) set(el, { x: X(g.from), y: top, width: Math.max(1, X(g.to) - X(g.from)), height: bottom - top, opacity: passed });
    else set(el, { x1: X(g.from), x2: X(g.to), y1: Y(g.a), y2: Y(g.b), opacity: passed });
  });

  // the playhead, while a series is still being drawn
  const heads = d.series.map((_, i) => headOf(i));
  const moving = Math.min(...heads) < d.t1 - 1e-9;
  const hx = X(Math.min(...heads));
  set(c.head, { x1: hx, x2: hx, y1: top, y2: bottom, opacity: moving ? 1 : 0 });
  if (c.headLabel) {
    const year = String(Math.round(Math.min(...heads)));
    if (c.headLabel.textContent !== year) c.headLabel.textContent = year;
    place(c.headLabel, hx, 0, "translateX(-50%)", moving ? 1 : 0);
  }

  // every gesture's marks, arriving with its own g<k>
  c.plan.forEach((p) => {
    const g = clamp(state[`g${p.k}`]);
    const els = p.els;
    if (p.do === "name" || p.do === "annotate") {
      set(els[0], { cx: X(p.t), cy: Y(p.y), r: p.ring ? 7 : 3.5, opacity: g });
    } else if (p.do === "compare" && p.kind === "crossing") {
      p.pts.forEach((pt, j) => set(els[j], { cx: X(pt[0]), cy: Y(pt[1]), r: 7, opacity: g }));
    } else if (p.do === "compare" && p.kind === "level") {
      const [ta, ya] = p.a;
      const [tb, yb] = p.b;
      const xe = X(tb) + (X(ta) - X(tb)) * g;
      set(els[0], { x1: X(tb), x2: xe, y1: Y(yb), y2: Y(yb), opacity: g > 0 ? 1 : 0 });
      set(els[1], { cx: X(tb), cy: Y(yb), r: 4.5, opacity: g });
      set(els[2], { x1: X(ta), x2: X(ta), y1: Y(yb), y2: Y(yb) + (Y(ya) - Y(yb)) * clamp((g - 0.6) / 0.4), opacity: g > 0.6 ? 1 : 0 });
      set(els[3], { cx: X(ta), cy: Y(ya), r: 4.5, opacity: clamp((g - 0.6) / 0.4) });
    } else if (p.do === "compare" && p.kind === "copy") {
      const [ta, , ya0] = p.a;
      const [tb, , yb0, yb1] = p.b;
      const thick = Math.abs(Y(yb1) - Y(yb0)) * g;
      set(els[0], { x: X(ta) + 5, y: Y(ya0) - thick, width: 6, height: Math.max(0.5, thick), opacity: g > 0 ? 1 : 0 });
      set(els[1], { x: X(tb) - 3, y: Y(yb1), width: 6, height: Math.max(0.5, Math.abs(Y(yb1) - Y(yb0))), opacity: g });
    } else if (p.do === "bracket") {
      const x1 = X(p.from);
      const x2 = X(p.from) + (X(p.to) - X(p.from)) * g;
      set(els[0], { d: `M${x1},${top + 6}V${top}H${x2}V${top + 6}`, opacity: g > 0 ? 1 : 0 });
    } else if (p.do === "reference") {
      set(els[0], { x1: left, x2: left + (right - left) * g, y1: Y(p.value), y2: Y(p.value), opacity: g > 0 ? 1 : 0 });
    }
  });

  // The header reads the note of the card being read.
  c.plan.forEach((p, j) => {
    const node = c.notes[j];
    if (node) node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - p.k)));
  });
}
