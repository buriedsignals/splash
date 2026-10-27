// The PAIRED family's scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's
// scroll interpolating continuously from one card's state to the next, then a closing card carrying the limits, on
// which the whole chart returns (what was filtered comes back, what was shown stays marked). The pictures are the
// family adapter's (gesture-family-paired.mjs, `foldGesture`): this file turns each picture into a flat record of
// finite numbers the scrolly skill interpolates (`assertStates`), and checks every card's words with the Length
// scheduler's own card check (`checkCards`, gesture-scrolly.mjs) over the family's marks.
//
// A state: `lo`, `hi` (ONE value scale for every card — the family has no rescale), `ink` (a reveal), `note` (whose
// note the header reads); per drawn key `slot<i>` and `back<i>`; per drawn mark `accent<m>` and `ring<m>`; per
// gesture its own progress `g<k>` (a copy growing, a bracket's spine running, a rule appearing).
//
// Nothing here reads the data's shape: any key count (the keys no gesture names and the frame has no room for are
// stated as a remainder; the pyramid keeps every band), long names (they wrap), negative values, gaps (a missing
// value is no mark: the band says "n/a"). The drive (`applyPairedState`) is ONE self-contained function — no import,
// no reference to this module's scope — inlined by the scrolly skill's renderScrolly. Browser-safe: no Node module.
import { GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { domainOf, firstState, foldGesture, invariants, keysToDraw, splitMarks, stagePaired } from "./gesture-family-paired.mjs";
import { checkCards } from "./gesture-scrolly.mjs";

/** Keys a page draws at most before the rest is stated (every key a gesture acts on is always drawn). */
export const CAPACITY = 14;
/** The name the scrolly skill calls to paint a state. */
export const APPLY = "applyPairedState";

/**
 * @param gestures validateGestures' `gestures` (over the marks)
 * @param keys / marks / series  the adapter's (marksOf)
 * @param variant  the type
 * @param claim    the resolved claim (the subject key takes the accent before any highlight)
 * @param capacity keys drawn at most
 * @returns { states, plan, drawnKeys, drawnMarks, rest, pictures }
 */
export function schedulePairedScrolly({ gestures, keys, marks, series, variant, claim = {}, format = (v) => String(v), capacity = CAPACITY, ceiling }) {
  const { state: first } = firstState({ keys, marks, gestures, claim });
  const ctx = { marks, keys, series, variant, format };
  const pictures = [first];
  gestures.forEach((g, i) => pictures.push(foldGesture(pictures.at(-1), g, i, ctx)));
  invariants(pictures, { variant });

  // The keys drawn: every key a gesture acts on, then the extremes of the order (the pyramid keeps every band).
  const byName = new Map(marks.map((m) => [m.name, m]));
  const keep = [...new Set(gestures.flatMap((g) => g.marks.map((n) => byName.get(n)?.key)).filter(Boolean))];
  const drawnKeys = keysToDraw({ variant, order: first.order, keep, capacity });
  const kIndex = new Map(drawnKeys.map((k, i) => [k, i]));
  const drawnMarks = marks.filter((m) => kIndex.has(m.key));
  const mIndex = new Map(drawnMarks.map((m, i) => [m.name, i]));
  const left = keys.filter((k) => !kIndex.has(k.name));
  const rest = { count: left.length, sum: marks.filter((m) => !kIndex.has(m.key)).reduce((s, m) => s + m.value, 0) };
  const [lo, hi] = domainOf({ variant, marks: drawnMarks, states: pictures, ceiling });

  const revealAt = gestures.findIndex((g) => g.do === "reveal");
  const flat = (p, k) => {
    // Before a composed reveal only the rows a gesture already showed stand; from the reveal on, every row.
    const s = { lo, hi, ink: revealAt < 0 || k >= revealAt ? 1 : 0, note: k };
    const order = p.order.filter((x) => kIndex.has(x));
    drawnKeys.forEach((key, i) => {
      s[`slot${i}`] = order.indexOf(key);
      s[`back${i}`] = p.stepBack.includes(key) ? 1 : 0;
    });
    drawnMarks.forEach((m, i) => {
      s[`accent${i}`] = p.emphasis[m.name] === "accent" ? 1 : 0;
      s[`ring${i}`] = p.emphasis[m.name] === "ring" ? 1 : 0;
    });
    gestures.forEach((_, j) => (s[`g${j}`] = j <= k ? 1 : 0));
    return s;
  };

  const states = [];
  const plan = [];
  gestures.forEach((g, k) => {
    const { own, of } = splitMarks(g);
    const before = pictures[k];
    const after = pictures[k + 1];
    const state = flat(after, k);
    const values = own.map((n) => byName.get(n)?.value).filter((v) => v !== undefined);
    const item = { k, do: g.do, own, of, note: g.note === undefined ? undefined : String(g.note), shown: [] };
    switch (g.do) {
      case "highlight":
      case "name":
      case "annotate":
      case "filter":
        // what the gesture draws: its marks' values and the family's figures (a key's change, a series' leads)
        item.shown = [...values, ...(g.figures ?? []).filter((f) => !values.includes(f))];
        break;
      case "compare": {
        const copy = after.copies.find((c) => c.index === k);
        item.value = copy.value;
        item.against = copy.of;
        const a = byName.get(own[0]).value;
        item.ratio = copy.value ? a / copy.value : undefined;
        item.shown = [a, copy.value, ...(item.ratio !== undefined ? [item.ratio] : []), a - copy.value, copy.value - a];
        break;
      }
      case "bracket": {
        const b = after.brackets.find((x) => x.index === k);
        // the spine climbs through its members in drawn order, the sum landing at its end
        const members = own.slice().sort((x, y) => mIndex.get(x) - mIndex.get(y));
        let run = 0;
        item.members = members;
        item.steps = members.map((n) => (run += byName.get(n).value));
        item.whole = b.whole !== null;
        item.shown = b.whole !== null ? [b.sum, b.whole, (b.sum / b.whole) * 100] : [b.sum];
        if (b.whole !== null) item.ratio = b.sum / b.whole;
        break;
      }
      case "reference":
        item.value = Number(g.value);
        item.shown = [item.value];
        break;
      case "reorder":
        if (before.order.every((x, i) => x === after.order[i]))
          throw new GestureRefusal(`gestures[${k}]`, `reorder asks for the order the rows already hold (${before.order.join(", ")}), so card ${k + 1} would change nothing in the picture: drop it`, { remove: k });
        break;
      default:
        break;
    }
    plan.push(item);
    states.push(state);
  });

  // THE CLOSING CARD: the whole chart, every key back, what was shown still marked.
  const closing = { ...states.at(-1), note: gestures.length, ink: 1 };
  drawnKeys.forEach((_, i) => (closing[`back${i}`] = 0));
  states.push(closing);
  return { states, plan, drawnKeys, drawnMarks, rest, pictures, lo, hi };
}

/**
 * The whole staging: the core over the marks (format "scrolly", the family's hooks, the claim over keys and series),
 * the scheduler, the cards. With `repair` each refusal's fix is applied to the model's own list, every repair returned.
 */
export function stagePairedScrolly({ gestures, variant, rows, series, claim, format = (v) => String(v), capacity = CAPACITY, ceiling = /** @type {number | undefined} */ (undefined), repair = false, steps = 12 }) {
  const out = stagePaired({
    gestures,
    variant,
    rows,
    series,
    format: "scrolly",
    claim,
    ceiling,
    repair,
    steps,
    validateGestures,
    then: ({ gestures: valid, keys, marks, series: names, claim: resolved }) => {
      const scheduled = schedulePairedScrolly({ gestures: valid, keys, marks, series: names, variant, claim: resolved, format, capacity, ceiling });
      const cards = checkCards({ gestures: valid, plan: scheduled.plan, rows: marks, rest: scheduled.rest, drawn: scheduled.drawnMarks, format, facts: claim?.facts });
      return { valid, scheduled, cards };
    },
  });
  return { ...out.staged, gestures: out.list, repairs: out.repairs, keys: out.keys, marks: out.marks, series: out.series, claim: out.claim };
}

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyPairedState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it. Every mark is laid out in the reader's
 * pixels on each paint: one band per key (names in a left column, or the pyramid's spine), up to two marks per band
 * on ONE value scale from zero, a value written at a mark's tip, a compare's copy in the lower half of its subject's
 * mark, a bracket's spine at the right, a reference rule across the plot (on both halves of a pyramid).
 */
export function applyPairedState(root, state, context) {
  const carrier = root.querySelector("[data-gpair]");
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

  if (context.resized || !root.__gpair) {
    const data = root.__gpairData || (root.__gpairData = JSON.parse(carrier.getAttribute("data-gpair")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const keys = data.keys.map((k, i) => ({ ...k, name: q(`[data-name="${i}"]`), track: q(`[data-track="${i}"]`), gap: q(`[data-gap="${i}"]`) }));
    for (const k of keys) Object.assign(k.name.style, { width: "auto", whiteSpace: "nowrap" });
    const marks = data.marks.map((m, i) => ({
      ...m,
      bar: q(`[data-bar="${i}"]`),
      accent: q(`[data-accent="${i}"]`),
      ring: q(`[data-ring="${i}"]`),
      dot: q(`[data-dot="${i}"]`),
      value: q(`[data-value="${i}"]`),
    }));
    const plan = data.plan.map((p) => ({
      ...p,
      copy: q(`[data-copy="${p.k}"]`),
      label: q(`[data-label="${p.k}"]`),
      spine: q(`[data-spine="${p.k}"]`),
      ticks: Array.from(stage.querySelectorAll(`[data-mtick="${p.k}"]`)),
      rules: Array.from(stage.querySelectorAll(`[data-rule="${p.k}"]`)),
    }));
    root.__gpair = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      zeros: Array.from(stage.querySelectorAll('[data-part="zero"]')),
      rest: q('[data-part="rest"]'),
      keys,
      marks,
      plan,
      notes: data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`)),
      nameNatural: Math.max(0, ...keys.map((k) => width(k.name))),
      lineH: Math.max(0, ...keys.map((k) => k.name.getBoundingClientRect().height)),
      valueW: Math.max(0, ...marks.map((m) => width(m.value))),
      bracketW: plan.filter((p) => p.do === "bracket").map((p) => width(p.label) * 1.15 + 18),
    };
  }
  const c = root.__gpair;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const v = c.data.variant;
  const pyramid = v === "population-pyramid";
  const narrow = SW < 560;
  const gap = narrow ? 6 : 10;
  const n = c.keys.length;
  const slots = n + (c.rest ? 1 : 0);
  const top = 4;
  const bottom = SH - 4;
  const pitch = (bottom - top) / slots;
  const bracketCols = c.bracketW.reduce((s, w) => s + w, 0);
  const negative = c.marks.some((m) => m.v < 0);
  const negW = negative ? c.valueW + 6 : 0;
  const lo = state.lo;
  const hi = state.hi;

  // NAMES: a left column (wrapping when long), or the pyramid's spine.
  const sideW = pyramid ? Math.min(c.nameNatural, SW * 0.22) : Math.min(c.nameNatural, SW * (narrow ? 0.3 : 0.26));
  for (const k of c.keys)
    Object.assign(k.name.style, { width: `${sideW}px`, whiteSpace: c.nameNatural > sideW ? "normal" : "nowrap", textAlign: pyramid ? "center" : "right", lineHeight: "1.1" });
  const valueRoom = pyramid ? 0 : c.valueW + 6;
  let X;
  let spineL = 0;
  let spineR = 0;
  let x1;
  if (pyramid) {
    const half = (SW - bracketCols - sideW - 2 * gap) / 2;
    spineL = half;
    spineR = half + sideW + 2 * gap;
    x1 = spineR + half;
    X = (val, side) => (side < 0 ? spineL - (Math.abs(val) / (hi || 1)) * half : spineR + (Math.abs(val) / (hi || 1)) * half);
  } else {
    const x0 = sideW + gap + negW;
    x1 = Math.max(x0 + 20, SW - valueRoom - gap - bracketCols);
    X = (val) => x0 + ((val - lo) / (hi - lo || 1)) * (x1 - x0);
  }
  const zeros = pyramid ? [spineL, spineR] : [X(0)];
  c.zeros.forEach((z, i) => set(z, { x1: zeros[i] ?? zeros[0], x2: zeros[i] ?? zeros[0], y1: top, y2: bottom }));

  const slotY = (s) => (pyramid ? top + (n - 1 - s + 0.5) * pitch : top + (s + 0.5) * pitch);
  const keyY = c.keys.map((_, i) => slotY(state[`slot${i}`]));
  const shownKey = c.keys.map((k, i) => (c.data.reveal ? Math.max(clamp(state.ink * n - state[`slot${i}`]), k.seen >= 0 ? clamp(state[`g${k.seen}`]) : 0) : 1));
  const alphaKey = c.keys.map((_, i) => shownKey[i] * (1 - 0.72 * clamp(state[`back${i}`])));
  const inner = Math.min(pitch * 0.78, v === "diverging-bar" ? 30 : 44);

  c.keys.forEach((k, i) => {
    const y = keyY[i];
    if (pyramid) place(k.name, spineL + gap, y, "translateY(-50%)", alphaKey[i]);
    else place(k.name, 0, y, "translateY(-50%)", alphaKey[i]);
    // a key's name takes the accent when every mark it holds is marked (not when a highlighted series crosses it)
    const own = c.marks.map((m, j) => j).filter((j) => c.marks[j].key === i);
    const strong = own.length > 0 && own.every((j) => state[`accent${j}`] > 0.5 || state[`ring${j}`] > 0.5);
    // colour only: the name's register carries one weight, and a bold it does not embed would fall back
    k.name.style.color = strong ? c.data.colours.accent : c.data.colours.ink;
    if (k.track) {
      const a = X(0);
      const b = X(c.data.ceiling);
      set(k.track, { x: a, y: y - inner / 2, width: Math.max(0, b - a), height: inner, opacity: alphaKey[i] });
    }
    if (k.gap) place(k.gap, X(0) + 6, y, "translateY(-50%)", alphaKey[i]);
  });

  // where each mark sits in its band
  const geo = c.marks.map((m) => {
    const y0 = keyY[m.key] - inner / 2;
    let y = y0;
    let h = inner;
    if (v === "grouped-bar" || v === "lollipop") {
      h = inner / 2;
      y = y0 + m.j * h;
    } else if (v === "bullet") {
      h = m.j === 0 ? inner * 0.72 : inner * 0.28;
      y = y0 + (inner - h) / 2;
    }
    const side = pyramid ? (m.j === 0 ? -1 : 1) : 1;
    const base = pyramid ? (side < 0 ? spineL : spineR) : X(0);
    const tip = X(m.v, side);
    return { y, h, base, tip, side, a: Math.min(base, tip), b: Math.max(base, tip) };
  });
  const labelRoom = (m) => (v === "grouped-bar" || v === "lollipop" ? inner / 2 : inner) >= c.lineH * 0.8;

  c.marks.forEach((m, j) => {
    const g = geo[j];
    const alpha = alphaKey[m.key];
    const strong = state[`accent${j}`] > 0.5 || state[`ring${j}`] > 0.5;
    if (v === "lollipop") {
      const cy = g.y + g.h / 2;
      set(m.bar, { x: g.a, y: cy - 1, width: Math.max(0, g.b - g.a), height: 2, opacity: alpha });
      set(m.accent, { x: g.a, y: cy - 1, width: Math.max(0, g.b - g.a), height: 2, opacity: alpha * clamp(state[`accent${j}`]) });
      set(m.dot, { cx: g.tip, cy, r: Math.max(2.5, Math.min(g.h * 0.42, 7)), opacity: alpha });
      set(m.ring, { x: g.a - 3, y: g.y - 1, width: Math.max(0, g.b - g.a) + 10, height: g.h + 2, opacity: alpha * clamp(state[`ring${j}`]) });
    } else {
      const geom = { x: g.a, y: g.y, width: Math.max(0, g.b - g.a), height: g.h };
      set(m.bar, { ...geom, opacity: alpha });
      set(m.accent, { ...geom, opacity: alpha * clamp(state[`accent${j}`]) });
      set(m.ring, { x: g.a - 3, y: g.y - 3, width: Math.max(0, g.b - g.a) + 6, height: g.h + 6, opacity: alpha * clamp(state[`ring${j}`]) });
    }
    if (m.dot && v === "lollipop") m.dot.setAttribute("fill", state[`accent${j}`] > 0.5 ? m.accentFill : m.fill);
    // a value at its mark's tip: on every mark that has the room, on a marked one always (the pyramid: marked only)
    const show = pyramid || (v === "bullet" && m.j === 0) ? strong : labelRoom(m) || strong;
    if (m.value) {
      m.value.style.color = strong ? c.data.colours.accent : c.data.colours.ink;
      const ty = g.y + g.h / 2;
      // the bullet's comparative state is overdrawn by the measure: its value stands under its tip
      if (v === "bullet" && m.j === 0) place(m.value, g.tip, g.y + g.h + 2, "translateX(-50%)", show ? alpha : 0);
      else if (g.side < 0 || m.v < 0) place(m.value, g.a - 6, ty, "translate(-100%, -50%)", show ? alpha : 0);
      else place(m.value, (v === "lollipop" ? g.b + 8 : g.b + 6), ty, "translateY(-50%)", show ? alpha : 0);
    }
  });
  if (c.rest) place(c.rest, pyramid ? 0 : sideW + gap, top + (n + 0.5) * pitch, "translateY(-50%)", c.data.reveal ? clamp(state.ink) : 1);

  let column = x1 + valueRoom + gap;
  c.plan.forEach((p) => {
    const g = clamp(state[`g${p.k}`]);
    if (p.do === "compare") {
      const j = p.own[0];
      const mg = geo[j];
      const alpha = alphaKey[c.marks[j].key];
      const end = X(lerp(0, p.value, g), mg.side);
      const from = Math.min(mg.base, end);
      // the copy lies in the lower half of its subject's mark (the bullet's thin measure: just under it)
      const cy = v === "bullet" ? mg.y + mg.h : mg.y + mg.h / 2;
      const ch = v === "bullet" ? Math.max(4, mg.h) : Math.max(2, mg.h / 2);
      set(p.copy, { x: from, y: cy, width: Math.abs(end - mg.base), height: ch, opacity: Math.min(1, g * 3) * alpha });
      if (mg.side < 0) place(p.label, end - 4, cy + ch, "translateX(-100%)", clamp((g - 0.6) / 0.4) * alpha);
      else place(p.label, end + 4, cy, "none", clamp((g - 0.6) / 0.4) * alpha);
    } else if (p.do === "bracket") {
      const x = column + 4;
      column += c.bracketW[c.plan.filter((q) => q.do === "bracket").indexOf(p)];
      const ys = p.members.map((j) => geo[j].y + geo[j].h / 2);
      const y0 = Math.min(...ys) - inner / 2;
      const y1 = Math.max(...ys) + inner / 2;
      set(p.spine, { x1: x, x2: x, y1: y0, y2: lerp(y0, y1, g), opacity: Math.min(1, g * 4) });
      p.ticks.forEach((t, m) => set(t, { x1: x - 6, x2: x, y1: ys[m], y2: ys[m], opacity: clamp(g * ys.length - m) }));
      const landed = landedOf(g, p.steps.length);
      if (landed > 0 && p.label.textContent !== p.steps[landed - 1]) p.label.textContent = p.steps[landed - 1];
      place(p.label, x + 6, (y0 + y1) / 2, "translateY(-50%)", landed > 0 ? 1 : 0);
    } else if (p.do === "reference") {
      const xs = pyramid ? [X(p.value, -1), X(p.value, 1)] : [X(p.value)];
      p.rules.forEach((r, i) => set(r, { x1: xs[i], x2: xs[i], y1: top, y2: bottom, opacity: g }));
      place(p.label, xs.at(-1) + 4, top, "none", g);
    }
  });

  // The header reads the note of the card being read.
  c.plan.forEach((p, j) => {
    const node = c.notes[j];
    if (node) node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - p.k)));
  });
}
