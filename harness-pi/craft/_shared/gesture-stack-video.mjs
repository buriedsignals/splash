// The Stack family's video scheduler (craft/gestures/GRAMMAR.md §5): three composed gestures placed into the
// six-event timing contract. `establish` (the title card) and `reference` (the stack arriving on its one scale, parts
// growing in their locked order) are the scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story
// order; the conclusion shows the whole chart — a filter still active is released there, what was shown stays marked —
// and brings the credit; `hold` repeats it. A state is a flat record of finite numbers (assertEventStates).
//
// The time half and the picture at a frame (`sceneAt`) live here too, so the frame (in the Remotion bundle), the
// runner (in Bun) and the tests read one arithmetic. Motion along the value scale (a copy's length, a bracket, a
// reorder's slots, a count's climb, the parts growing) is linear; arrivals (a colour, a ring, a note) are eased.
// Browser-safe: no Node module, no `#shared` import.
import { GestureRefusal } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";

export const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const ARRIVES = new Set(["highlight", "name", "annotate", "filter", "pull-back"]);

const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], ink: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};

const prefixSums = (values) => {
  let sum = 0;
  return values.map((v) => (sum += v));
};

/**
 * @param gestures validateStack's `gestures` (marks resolved to segments, `of` split out, compares' `subjectSegs`)
 * @param stack    the family model (stackFromBeat)
 * @param drawn    the bars the frame draws, in the model's order (default: every bar)
 * @param subject  the bar the takeaway is about, in the accent from the start
 * @returns        { states, windows, linear, plan }
 */
export function scheduleStackVideo({ gestures, stack, drawn = stack.names, subject = null }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const at = new Map(drawn.map((b, i) => [b, i]));
  const marks = stack.marks.filter((m) => at.has(m.key)).map((m) => m.name);
  const markAt = new Map(marks.map((m, j) => [m, j]));
  const running = stack.anchorMode === "running";

  const base = { title: 0, furniture: 0, ink: 0, release: 0, source: 0 };
  // The subject is in the accent from the chart's arrival, unless a gesture highlights it: then the accent arrives with it.
  const highlighted = gestures.some((g) => g.do === "highlight" && g.marks.some((m) => stack.barOf(m) === subject));
  drawn.forEach((b, i) => Object.assign(base, { [`slot${i}`]: i, [`accent${i}`]: b === subject && !highlighted ? 1 : 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  marks.forEach((_, j) => (base[`mring${j}`] = 0));
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const hasReveal = gestures.some((g) => g.do === "reveal");
  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, ink: hasReveal ? 0 : 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["ink", ...drawn.map((_, i) => `slot${i}`)]);

  let state = reference;
  let folded = stack.rest();
  if (subject) folded.accent = [subject];
  const states = [establish, reference];
  const plan = [];
  gestures.forEach((g, k) => {
    const event = VIDEO_EVENTS[k];
    const field = `g${k}`;
    const next = { ...state, [field]: 1 };
    const after = stack.apply(folded, g, { index: k, subject });
    const ofSegs = Array.isArray(g.of) ? g.of : [];
    const own = g.marks.slice(0, g.marks.length - ofSegs.length);
    const item = { index: k, do: g.do, event, field, marks: own, bars: [...new Set(own.map(stack.barOf))], note: g.note === undefined ? undefined : String(g.note) };
    const unchanged = (what) => {
      if (event === "conclusion") return;
      throw new GestureRefusal(`gestures[${k}]`, `${g.do} ${what}, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    };
    if (!ARRIVES.has(g.do)) linear.add(field);
    const barField = (prefix, b) => (at.has(b) ? `${prefix}${at.get(b)}` : null);
    switch (g.do) {
      case "highlight":
      case "name":
        for (const b of after.accent) if (barField("accent", b)) next[barField("accent", b)] = 1;
        for (const r of after.rings) {
          if (at.has(r)) next[`ring${at.get(r)}`] = 1;
          else if (markAt.has(r)) next[`mring${markAt.get(r)}`] = 1;
        }
        break;
      case "filter":
        drawn.forEach((b, i) => (next[`back${i}`] = after.stepBack.includes(b) ? 1 : 0));
        break;
      case "reorder": {
        const before = [...drawn].sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
        const order = after.order.filter((b) => at.has(b));
        if (order.join("|") === before.join("|")) unchanged(`asks for the order the bars already hold (${before.join(", ")})`);
        order.forEach((b, slot) => (next[`slot${at.get(b)}`] = slot));
        item.order = order;
        break;
      }
      case "reveal":
        next.ink = 1;
        break;
      case "compare": {
        const copy = after.copies.at(-1);
        Object.assign(item, { onto: copy.bars[0], from: copy.from, to: copy.to, value: copy.value });
        break;
      }
      case "bracket": {
        const b = after.brackets.at(-1);
        const span = b.span;
        const members = running ? span : [...new Set(span.map(stack.barOf))];
        item.members = members.filter((m) => (running ? at.has(m) : at.has(m)));
        item.inBar = b.bars.length === 1 && !running ? b.bars[0] : null;
        item.extent = stack.unit(b.whole ? span : b.segs).extent;
        // The figure climbs through each member it adds (a bar's total, a segment's value, a step).
        const parts = item.inBar ? b.segs.map((m) => stack.marks.find((x) => x.name === m).value) : running ? b.segs.map((m) => stack.marks.find((x) => x.name === m).value) : [...new Set(b.segs.map(stack.barOf))].map((bar) => stack.unit(b.segs.filter((m) => stack.barOf(m) === bar)).value);
        item.steps = prefixSums(parts);
        break;
      }
      case "count": {
        const c = after.count;
        const byBar = [...new Set(c.segs.map(stack.barOf))].map((bar) => stack.unit(c.segs.filter((m) => stack.barOf(m) === bar)).value);
        item.steps = prefixSums(byBar);
        break;
      }
      case "reference":
        item.value = Number(g.value);
        break;
      case "pull-back": {
        const filtered = drawn.some((_, i) => state[`back${i}`] > 0);
        if (!filtered) unchanged("has no filter to return from");
        drawn.forEach((_, i) => (next[`back${i}`] = 0));
        if (filtered) next.release = 1;
        break;
      }
      case "annotate":
        break;
      default:
        throw new GestureRefusal(`gestures[${k}].do`, `"${g.do}" has no video staging`, { remove: k });
    }
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const own_ = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = own_;
    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE CHART (doctrine rule 9): a filter still active returns, what was shown stays marked.
      const releases = [];
      drawn.forEach((_, i) => {
        if (next[`back${i}`] > 0) {
          next[`back${i}`] = 0;
          releases.push(`back${i}`);
        }
      });
      if (next.ink < 1) {
        next.ink = 1;
        releases.push("ink");
      }
      if (releases.length) {
        next.release = 1;
        releases.push("release");
      }
      for (const key of releases) windows.conclusion[key] = WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    folded = after;
    plan.push(item);
    states.push(next);
    state = next;
  });
  // The family's locks over the folded states (part order, a bridge's story order, conservation).
  stack.invariants([folded]);
  states.push({ ...state });
  return { states, windows, linear: [...linear], plan };
}

// ── time ──────────────────────────────────────────────────────────────────────────────────────────

export function progressOf(frame, event) {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

/** A field's value at a frame: each event's change, moved over its window, linear or eased. */
export function fieldAt(props, field, frame) {
  const { states, windows, timing } = props;
  const straight = props.linear.includes(field);
  let value = states[0][field];
  for (let i = 1; i < EVENTS.length; i++) {
    const delta = states[i][field] - states[i - 1][field];
    if (delta === 0) continue;
    const [a, b] = windows[EVENTS[i]]?.[field] ?? [0, 1];
    const t = clamp01((progressOf(frame, timing[EVENTS[i]]) - a) / (b - a));
    value += delta * (straight ? t : ease(t));
  }
  return value;
}

/** A count's text at `v` in the story's number format { decimals, small, below, decimal, group }. */
export function valueText(v, f) {
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  const [whole, part] = a.toFixed(a >= f.below || a === 0 ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return `${sign}${part ? `${grouped}${f.decimal}${part}` : grouped}`;
}

export const landedOf = (item, g) => Math.min(item.steps.length, Math.floor(g * item.steps.length + 1e-9));

/** Every text a climbing figure can show, for the runner to measure before anything is drawn. */
export function countedTexts(plan, format) {
  return [...new Set(plan.filter((p) => p.steps).flatMap((p) => p.steps.map((v) => valueText(v, format))))];
}

// ── the picture at a frame ────────────────────────────────────────────────────────────────────────

const NB = " ";
const withUnit = (unit, text) => (unit ? `${text}${NB}${unit}` : text);
const noteShown = (item, g) => (ARRIVES.has(item.do) ? g : g >= 1 ? 1 : 0);

/** Two #rrggbb colours mixed `t` of the way. */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The picture at one frame, pure arithmetic over build.mjs's props: `props.bars` (each with its segments in value
 * units), `props.layout` (rows or columns), the plan and the states.
 */
export function sceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const L = props.layout;
  const [lo, hi] = props.domain;
  const g = props.plan.map((p) => f(p.field));
  const ink = f("ink");
  const nParts = props.partCount;
  const shown = (order) => clamp01(ink * nParts - order);
  const rowsMode = L.mode === "rows";
  const v2 = rowsMode ? (v) => L.plotLeft + ((v - lo) / (hi - lo)) * (L.plotRight - L.plotLeft) : (v) => L.plotBottom - ((v - lo) / (hi - lo)) * (L.plotBottom - L.plotTop);

  const bars = props.bars.map((b, i) => {
    const slot = f(`slot${i}`);
    const centre = rowsMode ? L.plotTop + slot * L.pitch + L.pitch / 2 : L.plotLeft + slot * L.slot + L.slot / 2;
    const segs = b.segs.map((s, j) => {
      const t = shown(s.order);
      const a = v2(s.from);
      const z = v2(s.to);
      // Rows grow from the segment's start; a bridge's decrease grows downward from the level it leaves.
      const grow = rowsMode ? [a, a + (z - a) * t] : s.down ? [z, z + (a - z) * t] : [a, a + (z - a) * t];
      return { ...s, t, p0: Math.min(...grow), p1: Math.max(...grow), ring: f(`mring${s.markIndex}`), labelShown: t >= 1 && s.fits ? 1 : 0 };
    });
    const ext = [Math.min(...b.segs.map((s) => v2(s.from)), ...b.segs.map((s) => v2(s.to))), Math.max(...b.segs.map((s) => v2(s.from)), ...b.segs.map((s) => v2(s.to)))];
    const done = b.segs.every((s) => shown(s.order) >= 1);
    return { key: b.key, centre, segs, ext, accent: f(`accent${i}`), ring: f(`ring${i}`), back: f(`back${i}`), labelsShown: done ? 1 : 0 };
  });
  const barOf = (key) => bars.find((b) => b.key === key);

  const copies = props.plan
    .filter((p) => p.do === "compare" && g[p.index] > 0 && barOf(p.onto))
    .map((p) => {
      const b = barOf(p.onto);
      const a = v2(p.from);
      const z = a + (v2(p.to) - a) * g[p.index];
      return { index: p.index, centre: b.centre, p0: Math.min(a, z), p1: Math.max(a, z), done: g[p.index] >= 1 };
    });

  const brackets = props.plan
    .filter((p) => p.do === "bracket" && g[p.index] > 0)
    .map((p) => {
      const progress = g[p.index];
      const landed = landedOf(p, progress);
      const figure = landed > 0 ? withUnit(props.unit, valueText(p.steps[landed - 1], props.format)) : null;
      const label = props.bracketLabels.find((x) => x.item === p.index);
      const noted = progress >= 1 && label?.note;
      if (p.inBar) {
        const b = barOf(p.inBar);
        const a = v2(p.extent[0]);
        const z = v2(p.extent[1]);
        return { index: p.index, kind: "inBar", centre: b.centre, p0: a, p1: a + (z - a) * progress, figure: noted ? null : figure, note: noted ? label.note : null };
      }
      const centres = p.members.map((m) => barOf(m)?.centre).filter((c) => c !== undefined);
      const c0 = Math.min(...centres);
      const c1 = Math.max(...centres);
      return { index: p.index, kind: "span", c0, c1: c0 + (c1 - c0) * progress, ticks: centres.filter((c) => c <= c0 + (c1 - c0) * progress + 0.5), figure: noted ? null : figure, note: noted ? label.note : null };
    });

  const rules = props.plan.filter((p) => p.do === "reference" && g[p.index] > 0).map((p) => ({ index: p.index, at: v2(p.value), progress: g[p.index] }));

  // Row notes (and bracket notes on rows) sit in the lane at their bar's height; captions at the top.
  const notes = props.notes.map((n) => {
    const item = props.plan[n.item];
    const b = n.bar !== undefined ? barOf(n.bar) : null;
    return { ...n, centre: b ? b.centre : null, opacity: noteShown(item, g[n.item]) };
  });
  const captions = props.captions.map((c) => {
    const item = props.plan[c.item];
    const progress = g[c.item];
    if (c.kind === "count") {
      const landed = landedOf(item, progress);
      const figure = landed > 0 ? withUnit(props.unit, valueText(item.steps[landed - 1], props.format)) : null;
      const noted = progress >= 1 && c.lines.length > 0;
      return { ...c, figure: noted ? null : figure, opacity: noted ? 1 : 0 };
    }
    return { ...c, figure: null, opacity: noteShown(item, progress) };
  });
  return { title: f("title"), furniture: f("furniture"), source: f("source"), zero: v2(0), bars, copies, brackets, rules, notes, captions };
}
