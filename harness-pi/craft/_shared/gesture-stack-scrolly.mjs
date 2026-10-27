// The Stack family's scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's
// scroll interpolating continuously from one card's state to the next, then a closing card carrying the limits, on
// which the whole chart returns (what was filtered comes back, what was shown stays marked).
//
// The states come from the family's own fold (gesture-family-stack.mjs foldStack): each is flattened into a record
// of finite numbers — per bar its slot in the order, accent, ring and step-back, per gesture its own progress `g<k>`
// (a copy growing, a bracket drawing, a count climbing, a ring appearing), `ink` (a reveal: the parts appear in
// their locked order) and `note` (which card's note the header reads). Every card sets its own `g<k>` and `note`,
// so every card changes the picture. The value axis is not in the state: the family never rescales
// (no-move-shared-zero, no-move-shared-centre).
//
// Each card's prose is its gesture's `card`, checked by the Length kit's card checks (gesture-scrolly.mjs
// checkCards) against what the card's picture shows on the family's marks: a bar's total, a segment, a sum, the two
// lengths of a compare. The drive (`applyStackState`) is ONE self-contained function — no import, no reference to
// this module's scope — emitted as source and inlined by the scrolly skill's renderScrolly; everything it draws is
// precomputed here and passed as data. Browser-safe: no Node module.
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { foldStack, validateStack } from "./gesture-family-stack.mjs";
import { checkCards } from "./gesture-scrolly.mjs";

/** The bars a page draws at most before the rest is stated in one line (every bar a gesture acts on is drawn). */
export const CAPACITY = 16;

/** The name the scrolly skill calls to paint a state. */
export const APPLY = "applyStackState";

const prefixSums = (values) => {
  let sum = 0;
  return values.map((v) => (sum += v));
};

/** The bars drawn: every bar a gesture acts on, then the others in the drawn order, up to `capacity`. */
export function selectBars({ stack, gestures, capacity = CAPACITY }) {
  if (stack.anchorMode === "running" || stack.names.length <= capacity) return { drawn: [...stack.names], rest: 0 };
  const keep = new Set(gestures.flatMap((g) => g.marks.map(stack.barOf)));
  const kept = stack.names.filter((b) => keep.has(b));
  const fill = stack.names.filter((b) => !keep.has(b)).slice(0, Math.max(0, capacity - kept.length));
  const drawn = stack.names.filter((b) => keep.has(b) || fill.includes(b));
  return { drawn, rest: stack.names.length - drawn.length };
}

/**
 * @param stack    the family model (stackFromBeat)
 * @param gestures validateStack's `gestures`
 * @param subject  validateStack's `subject` (the bar that always carries the accent)
 * @param drawn    the bars the page draws (selectBars)
 * @returns        { states, plan } — one state per gesture card, then the closing card's; per gesture what it draws
 */
export function scheduleStackScrolly({ stack, gestures, subject = null, drawn = stack.names, format = String }) {
  const folded = foldStack(stack, gestures, { format, subject });
  const at = new Map(drawn.map((b, i) => [b, i]));
  const reveal = gestures.some((g) => g.do === "reveal");
  const flat = (s, k, prev) => {
    const out = { ink: prev ? prev.ink : reveal ? 0 : 1, note: k < 0 ? 0 : k };
    drawn.forEach((b, i) => {
      const order = s.order.filter((n) => at.has(n));
      out[`slot${i}`] = order.indexOf(b);
      out[`accent${i}`] = s.accent.includes(b) ? 1 : 0;
      out[`ring${i}`] = s.rings.includes(b) ? 1 : 0;
      out[`back${i}`] = s.stepBack.includes(b) && !s.accent.includes(b) ? 1 : 0;
    });
    gestures.forEach((_, j) => (out[`g${j}`] = j <= k ? 1 : 0));
    return out;
  };
  const states = [];
  const plan = [];
  let prev = null;
  gestures.forEach((g, k) => {
    const s = folded[k + 1];
    const next = flat(s, k, prev);
    if (g.do === "reveal") next.ink = 1;
    states.push(next);
    prev = next;
    const ofSegs = Array.isArray(g.of) ? g.of : [];
    const own = g.marks.slice(0, g.marks.length - ofSegs.length);
    const unit = stack.unit(own);
    const item = { k, do: g.do, own, of: ofSegs, note: g.note === undefined ? undefined : String(g.note), shown: [] };
    // What this card's picture shows, in figures: what its card must state.
    // A whole bar shows its total and every segment's own number (a Likert's side totals first: its rows all make 100).
    const segValues = own.map((m) => stack.marks.find((x) => x.name === m).value);
    const barTotals = unit.wholeBars.length
      ? [
          ...(stack.anchorMode === "centre" ? unit.wholeBars.flatMap((b) => [stack.sideTotal(b, "left"), stack.sideTotal(b, "right")]) : []),
          ...unit.wholeBars.map((b) => stack.whole(b)),
          ...segValues,
        ]
      : [];
    switch (g.do) {
      case "highlight":
      case "filter":
        item.shown = unit.wholeBars.length ? barTotals : segValues;
        item.rings = unit.wholeBars.length ? [] : own;
        break;
      case "name":
      case "annotate":
        item.shown = unit.wholeBars.length ? [unit.value, ...barTotals] : [unit.value, ...segValues];
        item.rings = g.do === "name" && !(unit.wholeBars.length === 1 && unit.bars.length === 1) ? own : [];
        break;
      case "bracket": {
        const b = s.brackets.find((x) => x.index === k);
        item.bars = b.bars;
        item.segs = b.whole ? b.span : b.segs;
        item.whole = b.whole;
        const members = b.whole && b.bars.length > 1 ? stack.names : null;
        item.steps = members ? prefixSums(members.map((m) => stack.whole(m))) : prefixSums(own.map((m) => stack.marks.find((x) => x.name === m).value));
        const base = b.whole ? stack.unit(b.span).value : null;
        item.shown = [unit.value, ...(base ? [base, (unit.value / base) * 100] : [])];
        if (base) item.ratio = unit.value / base;
        break;
      }
      case "compare": {
        const c = s.copies.find((x) => x.index === k);
        item.copy = c;
        item.value = c.value;
        item.against = c.of;
        item.ratio = c.subjectValue / c.value;
        item.shown = [c.subjectValue, c.value, item.ratio, c.subjectValue - c.value, c.value - c.subjectValue];
        break;
      }
      case "count": {
        const on = s.count.segs;
        item.steps = prefixSums(on.map((m) => stack.marks.find((x) => x.name === m).value));
        item.shown = [item.steps.at(-1), on.length];
        break;
      }
      case "reference":
        item.value = Number(g.value);
        item.shown = [item.value];
        break;
      default:
        item.shown = [];
    }
    plan.push(item);
  });
  // THE CLOSING CARD: the whole chart, every bar back, what was shown still marked.
  const closing = { ...(prev ?? flat(folded[0], -1, null)), ink: 1, note: gestures.length };
  drawn.forEach((_, i) => (closing[`back${i}`] = 0));
  states.push(closing);
  return { states, plan, folded };
}

/**
 * The whole staging: the family's validation (format "scrolly"), the bars drawn, the scheduler, the cards. With
 * `repair`, each refusal's fix is applied to the model's own list until it is accepted (at most `steps` times).
 */
export function stageStackScrolly({ gestures, stack, claim, format = String, capacity = CAPACITY, repair = false, steps = 12 }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid, subject } = validateStack({ gestures: list, stack, format: "scrolly", claim });
      const { drawn, rest } = selectBars({ stack, gestures: valid, capacity });
      const scheduled = scheduleStackScrolly({ stack, gestures: valid, subject, drawn, format });
      // The card checks read a gesture's marks by the family's mark names; a whole bar is all of its segments.
      const cards = checkCards({ gestures: valid, plan: scheduled.plan, rows: stack.marks, drawn: stack.marks, format, facts: claim?.facts });
      return { gestures: list, valid, subject, drawn, rest, scheduled, cards, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

// ── the drive ─────────────────────────────────────────────────────────────────────────────────────

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyStackState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it, because its source is inlined into
 * the page alone. Rows (stacked-bar, Likert): names in a left column, the bars on one value axis shared by every
 * card, a total (or the sides' totals) at each bar's ends. Columns (a bridge): the opening, the steps floating on the
 * running level, the closing level, names under the columns, values over them.
 */
export function applyStackState(root, state, context) {
  const carrier = root.querySelector("[data-gstack]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const set = (el, attrs) => {
    if (!el) return;
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  };
  const place = (el, left, top, transform, opacity) => {
    if (!el) return;
    Object.assign(el.style, { left: `${left}px`, top: `${top}px`, transform, opacity: String(opacity) });
  };
  const width = (node) => (node ? node.getBoundingClientRect().width : 0);
  const landedOf = (g, length) => (g >= 0.995 ? length : Math.min(length, Math.floor(g * length)));

  if (context.resized || !root.__gstack) {
    const data = root.__gstackData || (root.__gstackData = JSON.parse(carrier.getAttribute("data-gstack")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const bars = data.bars.map((b, i) => ({
      ...b,
      name: q(`[data-name="${i}"]`),
      ring: q(`[data-ring="${i}"]`),
      tot: q(`[data-tot="${i}"]`),
      lt: q(`[data-lt="${i}"]`),
      conn: q(`[data-conn="${i}"]`),
      segs: b.segs.map((s, p) => ({ ...s, rect: q(`[data-seg="${i}-${p}"]`), label: q(`[data-sv="${i}-${p}"]`) })),
    }));
    const plan = data.plan.map((p) => ({
      ...p,
      copy: q(`[data-copy="${p.k}"]`),
      tick: q(`[data-tick="${p.k}"]`),
      path: q(`[data-bk="${p.k}"]`),
      rule: q(`[data-rule="${p.k}"]`),
      label: q(`[data-label="${p.k}"]`),
      rings: Array.from(stage.querySelectorAll(`[data-sring="${p.k}"]`)),
    }));
    for (const b of bars) if (b.name) Object.assign(b.name.style, { width: "auto", whiteSpace: "nowrap" });
    root.__gstack = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      baseline: q('[data-part="baseline"]'),
      rest: q('[data-part="rest"]'),
      closing: { rect: q('[data-seg="c"]'), tot: q('[data-tot="c"]'), name: q('[data-name="c"]') },
      bars,
      plan,
      notes: data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`)),
      nameNatural: Math.max(0, ...bars.map((b) => width(b.name))),
      lineH: Math.max(0, ...bars.map((b) => (b.name ? b.name.getBoundingClientRect().height : 0))),
      totW: Math.max(0, ...bars.map((b) => width(b.tot))),
      ltW: Math.max(0, ...bars.map((b) => width(b.lt))),
      labelW: Math.max(0, ...plan.map((p) => width(p.label))),
    };
  }
  const c = root.__gstack;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  const data = c.data;
  const [lo, hi] = data.domain;
  const n = c.bars.length;
  const narrow = SW < 560;
  const gap = narrow ? 6 : 12;
  // A reveal: the parts (a bridge's columns) appear in their locked order as the ink climbs.
  const shownOf = (order) => clamp(state.ink * data.revealCount - order);

  if (data.layout === "rows") {
    const slots = n + (c.rest ? 1 : 0);
    const top = 4;
    const bottom = SH - 4;
    const pitch = (bottom - top) / slots;
    const nameW = Math.min(c.nameNatural, SW * (narrow ? 0.3 : 0.24));
    const brackets = c.plan.filter((p) => p.do === "bracket" && p.multi);
    const right = c.totW + 8 + (brackets.length ? c.labelW + 24 : 0);
    const x0 = nameW + gap + c.ltW + (c.ltW ? 6 : 0);
    const x1 = Math.max(x0 + 40, SW - right - gap);
    const X = (v) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);
    const thick = Math.max(3, Math.min(pitch * 0.6, 34));
    const slotY = (s) => top + (s + 0.5) * pitch;
    const zero = X(0);
    set(c.baseline, { x1: zero, x2: zero, y1: top, y2: bottom, opacity: data.centre || lo < 0 ? 1 : 0 });
    const rowY = c.bars.map((_, i) => slotY(state[`slot${i}`]));
    const alpha = c.bars.map((_, i) => 1 - 0.7 * clamp(state[`back${i}`]));
    c.bars.forEach((b, i) => {
      const y = rowY[i];
      const strong = state[`accent${i}`] > 0.5 || state[`ring${i}`] > 0.5;
      const colour = strong ? data.colours.accent : data.colours.ink;
      Object.assign(b.name.style, { width: `${nameW}px`, whiteSpace: c.nameNatural > nameW ? "normal" : "nowrap", textAlign: "right", color: colour, fontWeight: strong ? "700" : "" });
      place(b.name, 0, y, "translateY(-50%)", alpha[i]);
      let lowest = Infinity;
      let highest = -Infinity;
      b.segs.forEach((s) => {
        const shown = shownOf(s.order);
        const a = X(s.from);
        const e = X(s.from) + (X(s.to) - X(s.from)) * shown;
        lowest = Math.min(lowest, a);
        highest = Math.max(highest, X(s.to));
        set(s.rect, { x: Math.min(a, e), y: y - thick / 2, width: Math.max(0, Math.abs(e - a)), height: thick, opacity: alpha[i] });
        if (s.label) {
          const fits = width(s.label) + 6 <= Math.abs(X(s.to) - X(s.from));
          place(s.label, (X(s.from) + X(s.to)) / 2, y, "translate(-50%, -50%)", fits && shown >= 0.999 ? alpha[i] : 0);
        }
      });
      set(b.ring, { x: lowest - 3, y: y - thick / 2 - 3, width: Math.max(0, highest - lowest) + 6, height: thick + 6, opacity: alpha[i] * clamp(state[`ring${i}`]) });
      const done = shownOf(data.revealCount - 1) >= 0.999 ? 1 : 0;
      if (b.tot) {
        b.tot.style.color = colour;
        place(b.tot, highest + 6, y, "translateY(-50%)", alpha[i] * done);
      }
      if (b.lt) {
        b.lt.style.color = colour;
        place(b.lt, lowest - 6, y, "translate(-100%, -50%)", alpha[i] * done);
      }
    });
    if (c.rest) place(c.rest, x0, slotY(n), "translateY(-50%)", 1);
    let column = SW - c.labelW - 22;
    c.plan.forEach((p) => {
      const g = clamp(state[`g${p.k}`]);
      if (p.do === "compare") {
        const i = p.bar;
        if (i === undefined || i < 0) return;
        const y = rowY[i];
        const end = X(lerp(p.from, p.to, g));
        // The copy lies in the lower part of the subject's own bar, its end ticked across the bar.
        set(p.copy, { x: Math.min(X(p.from), end), y: y + thick * 0.18, width: Math.abs(end - X(p.from)), height: Math.max(3, thick * 0.26), opacity: Math.min(1, g * 3) * alpha[i] });
        set(p.tick, { x1: end, x2: end, y1: y - thick / 2 - 4, y2: y + thick / 2 + 4, opacity: g * alpha[i] });
        place(p.label, end + 4, y - thick / 2 - 4, "translateY(-100%)", clamp((g - 0.6) / 0.4) * alpha[i]);
      } else if (p.do === "bracket" && !p.multi) {
        const i = p.bar;
        if (i === undefined || i < 0) return;
        const y = rowY[i] - thick / 2 - 5;
        const a = X(p.from);
        const e = lerp(a, X(p.to), g);
        set(p.path, { d: `M${a},${y + 4}V${y}H${e}V${y + 4}`, opacity: Math.min(1, g * 4) });
        const landed = landedOf(g, p.steps.length);
        if (landed > 0 && p.label.textContent !== p.steps[landed - 1]) p.label.textContent = p.steps[landed - 1];
        place(p.label, (a + X(p.to)) / 2, y - 2, "translate(-50%, -100%)", landed > 0 ? 1 : 0);
      } else if (p.do === "bracket") {
        const ys = p.bars.filter((i) => i >= 0).map((i) => rowY[i]);
        if (!ys.length) return;
        const x = column;
        const y0 = Math.min(...ys) - thick / 2;
        const y1 = Math.max(...ys) + thick / 2;
        set(p.path, { d: `M${x - 6},${y0}H${x}V${lerp(y0, y1, g)}${g >= 0.999 ? `H${x - 6}` : ""}`, opacity: Math.min(1, g * 4) });
        const landed = landedOf(g, p.steps.length);
        if (landed > 0 && p.label.textContent !== p.steps[landed - 1]) p.label.textContent = p.steps[landed - 1];
        place(p.label, x + 6, (y0 + y1) / 2, "translateY(-50%)", landed > 0 ? 1 : 0);
      } else if (p.do === "reference") {
        const x = X(p.value);
        set(p.rule, { x1: x, x2: x, y1: top, y2: bottom, opacity: g });
        place(p.label, x + 4, top, "none", g);
      }
      p.rings.forEach((r) => {
        const [i, s] = r.getAttribute("data-at").split("-").map(Number);
        const seg = c.bars[i] && c.bars[i].segs[s];
        if (!seg) return;
        const y = rowY[i];
        set(r, { x: X(seg.from) - 2, y: y - thick / 2 - 2, width: X(seg.to) - X(seg.from) + 4, height: thick + 4, opacity: g * alpha[i] });
      });
    });
  } else {
    // ── a bridge: columns ─────────────────────────────────────────────────────────────────────
    const cols = n + 1;
    const nameH = c.lineH * 2 + 6;
    const valueH = 26;
    const bracketH = c.plan.some((p) => p.do === "bracket") ? 44 : 0;
    const top = 4 + valueH + bracketH;
    const bottom = SH - nameH;
    const Y = (v) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
    const slot = SW / cols;
    const colW = slot * (narrow ? 0.7 : 0.6);
    const xOf = (i) => i * slot + (slot - colW) / 2;
    set(c.baseline, { x1: 0, x2: SW, y1: Y(0), y2: Y(0), opacity: 1 });
    const alpha = c.bars.map((_, i) => 1 - 0.7 * clamp(state[`back${i}`]));
    const drawCol = (i, from, to, shown, grow, rect, tot, name, a, strong) => {
      const x = xOf(i);
      const h = (Y(from) - Y(to)) * shown;
      set(rect, { x, y: grow ? Y(from) - h : Y(to), width: colW, height: Math.max(0, h), opacity: a });
      if (tot) {
        tot.style.color = strong ? data.colours.accent : data.colours.ink;
        tot.style.fontWeight = strong ? "700" : "";
        place(tot, x + colW / 2, Y(to) - 4, "translate(-50%, -100%)", shown >= 0.999 ? a : 0);
      }
      if (name) {
        Object.assign(name.style, { width: `${slot - 4}px`, whiteSpace: "normal", textAlign: "center", color: strong ? data.colours.accent : data.colours.ink, fontWeight: strong ? "700" : "" });
        place(name, i * slot + 2, bottom + 4, "none", a);
      }
    };
    c.bars.forEach((b, i) => {
      const s = b.segs[0];
      const strong = state[`accent${i}`] > 0.5 || state[`ring${i}`] > 0.5;
      const shown = shownOf(s.order);
      drawCol(i, s.from, s.to, shown, i === 0 || s.up, s.rect, b.tot, b.name, alpha[i], strong);
      set(b.ring, { x: xOf(i) - 3, y: Y(s.to) - 3, width: colW + 6, height: Y(s.from) - Y(s.to) + 6, opacity: alpha[i] * clamp(state[`ring${i}`]) });
      const level = data.levels[i];
      set(b.conn, { x1: xOf(i) + colW, x2: xOf(i + 1), y1: Y(level), y2: Y(level), opacity: shown >= 0.999 ? alpha[i] : 0 });
    });
    const closingShown = shownOf(data.revealCount - 1) >= 0.999 ? 1 : 0;
    drawCol(n, Math.min(0, data.closing), Math.max(0, data.closing), closingShown, true, c.closing.rect, c.closing.tot, c.closing.name, 1, false);
    c.plan.forEach((p) => {
      const g = clamp(state[`g${p.k}`]);
      if (p.do === "compare") {
        const i = p.bar;
        if (i === undefined || i < 0) return;
        const end = lerp(p.from, p.to, g);
        set(p.copy, { x: xOf(i) + colW + 3, y: Math.min(Y(p.from), Y(end)), width: Math.max(4, slot * 0.08), height: Math.abs(Y(p.from) - Y(end)), opacity: Math.min(1, g * 3) * alpha[i] });
        set(p.tick, { x1: xOf(i) - 3, x2: xOf(i) + colW + 6 + slot * 0.08, y1: Y(end), y2: Y(end), opacity: g * alpha[i] });
        place(p.label, xOf(i) + colW + 8 + slot * 0.08, Y(end), "translateY(-50%)", clamp((g - 0.6) / 0.4) * alpha[i]);
      } else if (p.do === "bracket") {
        const idx = p.bars.filter((i) => i >= 0);
        if (!idx.length) return;
        const a = xOf(Math.min(...idx));
        const e = xOf(Math.max(...idx)) + colW;
        const y = 4 + bracketH - 6;
        set(p.path, { d: `M${a},${y + 5}V${y}H${lerp(a, e, g)}V${y + 5}`, opacity: Math.min(1, g * 4) });
        const landed = landedOf(g, p.steps.length);
        if (landed > 0 && p.label.textContent !== p.steps[landed - 1]) p.label.textContent = p.steps[landed - 1];
        place(p.label, (a + e) / 2, y - 4, "translate(-50%, -100%)", landed > 0 ? 1 : 0);
      } else if (p.do === "reference") {
        set(p.rule, { x1: 0, x2: SW, y1: Y(p.value), y2: Y(p.value), opacity: g });
        place(p.label, 4, Y(p.value) - 2, "translateY(-100%)", g);
      }
    });
  }

  // The header reads the note of the card being read; a count's figure climbs there, then its note replaces it.
  c.plan.forEach((p, j) => {
    const node = c.notes[j];
    if (!node) return;
    if (p.do === "count") {
      const g = clamp(state[`g${p.k}`]);
      const landed = landedOf(g, p.steps.length);
      const text = g >= 0.995 ? p.noteText : landed > 0 ? p.steps[landed - 1] : "";
      if (node.textContent !== text) node.textContent = text;
    }
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - p.k)));
  });
}

// ── what the page draws, precomputed for the drive ─────────────────────────────────────────────────

/**
 * The drive's data: every drawn bar's segments in value units with their reveal order, the value axis, a bridge's
 * running levels and closing level, and per gesture its drawn objects by drawn bar index. Fills are the static
 * plate's (GestureStackStatic): a stacked bar's parts one ramp of the accent, a Likert's two ramps and a neutral, a
 * bridge's increases in the accent and decreases in the second ink.
 */
export function pageData({ stack, drawn, plan, format = String, fills }) {
  const running = stack.anchorMode === "running";
  const at = new Map(drawn.map((b, i) => [b, i]));
  const order = running ? stack.names : stack.parts;
  const copyEnds = plan.filter((p) => p.do === "compare").map((p) => p.copy.to);
  const refs = plan.filter((p) => p.do === "reference").map((p) => p.value);
  let [lo, hi] = stack.domain;
  lo = Math.min(lo, ...refs);
  hi = Math.max(hi, ...copyEnds, ...refs);
  if (stack.anchorMode === "centre") {
    const m = Math.max(-lo, hi);
    [lo, hi] = [-m, m];
  }
  const bars = drawn.map((b) => {
    const parts = stack.partsOf(b);
    return {
      name: b,
      segs: parts.map((p) => {
        const [from, to] = stack.segment(b, p);
        const v = stack.valueOf(b, p);
        return { from, to, order: order.indexOf(running ? b : p), fill: fills(b, p), up: v >= 0, label: running ? null : format(Math.abs(v)) };
      }),
      total: running ? (stack.names[0] === b ? format(stack.valueOf(b, b)) : `${stack.valueOf(b, b) >= 0 ? "+" : "−"}${format(Math.abs(stack.valueOf(b, b)))}`) : stack.anchorMode === "zero" ? format(stack.whole(b)) : format(stack.sideTotal(b, "right")),
      left: stack.anchorMode === "centre" ? format(stack.sideTotal(b, "left")) : null,
    };
  });
  const idx = (bs) => (bs ?? []).map((b) => (at.has(b) ? at.get(b) : -1));
  const items = plan.map((p) => {
    const base = { k: p.k, do: p.do };
    if (p.do === "compare") {
      const bar = at.get(p.copy.bars[0]);
      return { ...base, bar: bar ?? -1, from: p.copy.from, to: running ? (stack.valueOf(stack.barOf(p.copy.onto[0]), stack.barOf(p.copy.onto[0])) >= 0 ? p.copy.from + Math.abs(p.copy.value) : stack.segment(stack.barOf(p.copy.onto[0]), stack.barOf(p.copy.onto[0]))[1] - Math.abs(p.copy.value)) : p.copy.to, label: format(Math.abs(p.copy.value)) };
    }
    if (p.do === "bracket") {
      const multi = running || p.bars.length > 1;
      const ext = stack.unit(p.segs).extent;
      return { ...base, multi, bar: multi ? undefined : at.get(p.bars[0]) ?? -1, bars: idx(p.bars), from: ext[0], to: ext[1], steps: p.steps.map(format), label: format(p.steps.at(-1)) };
    }
    if (p.do === "reference") return { ...base, value: p.value, label: format(p.value) };
    if (p.do === "count") return { ...base, steps: p.steps.map(format), noteText: p.note ?? format(p.steps.at(-1)) };
    return { ...base, rings: (p.rings ?? []).map((m) => [at.get(stack.barOf(m)) ?? -1, stack.partsOf(stack.barOf(m)).indexOf(stack.partOf(m))]).filter(([i]) => i >= 0) };
  });
  // A bridge's compare copy runs from where the subject step starts toward its direction of change.
  for (const it of items)
    if (it.do === "compare" && running) {
      const p = plan.find((x) => x.k === it.k);
      const b = stack.barOf(p.copy.onto[0]);
      const [f, t] = stack.segment(b, b);
      const up = stack.valueOf(b, b) >= 0 || stack.names[0] === b;
      it.from = up ? f : t;
      it.to = up ? f + Math.abs(p.copy.value) : t - Math.abs(p.copy.value);
    }
  return {
    layout: running ? "columns" : "rows",
    centre: stack.anchorMode === "centre",
    domain: [lo, hi || 1],
    revealCount: order.length,
    bars,
    levels: running ? drawn.map((b) => stack.levelAfter(b)) : [],
    closing: running ? stack.closing.value : null,
    closingLabel: running ? format(stack.closing.value) : null,
    closingName: running ? stack.closing.name : null,
    plan: items,
  };
}
