// The video scheduler (craft/gestures/GRAMMAR.md §5, §6.1; plan KTD4): three composed gestures placed into the
// six-event timing contract. `establish` (the title card) and `reference` (the chart arriving on its scale) are the
// scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the whole
// chart — a zoom or filter still active is released there, what was shown stays marked — and brings the credit;
// `hold` repeats it. A state is a flat record of finite numbers, as `assertEventStates` reads it.
//
// The time half lives here too — a field's value at a frame, the figure a count shows — so the frame (in the
// Remotion bundle), the runner (in Bun) and the tests read one arithmetic. Motion along a measured axis (the value
// scale, the row order, a bracket's spine, a copy's length, a count) is linear; arrivals (the title, the chart,
// a colour, a ring, a note) are eased.
//
// Refusals here are the grammar's "change" and "format" checks the core cannot make without the scheduled states:
// a reorder, rescale or early pull-back that leaves the picture as it was, and a zoom whose printed factor is not
// the factor applied. Nothing here reads the data's shape: any row count, any leader, zero and negative values.
// Browser-safe: no Node module, no `#shared` import.
import { figuresIn, GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { createLength } from "./gesture-length.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";

/** The six events, in the one order a directed beat plays them (shared/chart-video/timing.ts `EVENT_ORDER`). */
export const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

// Byte-identical formulas to shared/chart-video/series.mjs (`clamp01`, `ease`), which this module cannot import.
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Gestures whose own field is an arrival (eased); every other gesture moves along a measured axis (linear). */
const ARRIVES = new Set(["highlight", "name", "annotate", "filter", "pull-back"]);

/** Where each gesture's note is written: on its first mark's row, beside its bracket, or on a caption line. */
export const NOTE_AT = {
  highlight: "row",
  name: "row",
  annotate: "row",
  filter: "row",
  zoom: "row",
  compare: "row",
  bracket: "bracket",
  count: "caption",
  reference: "caption",
  reveal: "caption",
  reorder: "caption",
  rescale: "caption",
  "pull-back": "caption",
};

/** Windows inside each event, as shares of its duration. */
const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], grown: [0.25, 0.9], ink: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};

const prefixSums = (values) => {
  let sum = 0;
  return values.map((v) => (sum += v));
};

/**
 * @param gestures validateGestures' `gestures` (own marks first, then `of` rows, in `marks`)
 * @param rows     the rows the video draws, in the order it draws them: [{ name, value }]
 * @param rest     the rows the frame had no room for: { count, sum } (their sum closes a count of the whole)
 * @returns        { states, windows, linear, plan, pictures }
 */
export function scheduleVideo({ gestures, rows, rest = { count: 0, sum: 0 } }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const names = rows.map((r) => r.name);
  const at = new Map(names.map((n, i) => [n, i]));
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const sum = (list) => list.reduce((s, n) => s + valueOf.get(n), 0);
  const whole = sum(names) + rest.sum;
  // validateGestures returns a gesture's own marks followed by its `of` rows in one `marks` list.
  const split = (g) => {
    const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
    return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
  };

  // THE SCALE THE CHART ARRIVES ON: every value a gesture will lay on it — the bars, a compare's copy, a reference
  // rule — so no gesture has to move the one scale to show what it compares (no-float-baseline-rescale).
  const copyValue = (g) => {
    const { own, of } = split(g);
    return own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
  };
  const laid = [
    ...rows.map((r) => r.value),
    ...gestures.filter((g) => g.do === "compare").map(copyValue),
    ...gestures.filter((g) => g.do === "reference").map((g) => Number(g.value)),
  ];
  const lo = Math.min(0, ...laid);
  const hi = Math.max(0, ...laid) || 1;
  const length = createLength({ rows, frame: { x: 0, y: 0, width: 1, height: 1 }, orientation: "rows" });

  const base = { title: 0, furniture: 0, grown: 0, ink: 0, lo, hi, release: 0, source: 0 };
  names.forEach((_, i) => Object.assign(base, { [`slot${i}`]: i, [`accent${i}`]: 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const implicit = implicitAccent(gestures);
  if (at.has(implicit)) base[`accent${at.get(implicit)}`] = 1;

  const hasReveal = gestures.some((g) => g.do === "reveal");
  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grown: 1, ink: hasReveal ? 0 : 1 };
  const windows = {
    establish: { ...WINDOW.establish },
    reference: { ...WINDOW.reference },
    reveal: {},
    subject: {},
    conclusion: {},
    hold: {},
  };
  const linear = new Set(["lo", "hi", "ink", ...names.map((_, i) => `slot${i}`)]);

  // The Length state each gesture leaves, for the family's locks (gesture-length.mjs `invariants`).
  let picture = { ...length.rest(), domain: [lo, hi] };
  const pictures = [picture];
  let wide = [lo, hi];
  let state = reference;
  const plan = [];
  const states = [establish, reference];

  gestures.forEach((g, k) => {
    const event = VIDEO_EVENTS[k];
    const { own, of } = split(g);
    const field = `g${k}`;
    const next = { ...state, [field]: 1 };
    const item = { index: k, do: g.do, event, field, marks: own, of, note: g.note === undefined ? undefined : String(g.note), noteAt: NOTE_AT[g.do] };
    const order = () => [...names].sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
    const unchanged = (what) => {
      // A gesture in the conclusion is never "nothing": the conclusion releases what was zoomed or filtered and
      // brings the credit, and a pull-back there is that very return to the whole.
      if (event === "conclusion") return;
      throw new GestureRefusal(`gestures[${k}]`, `${g.do} ${what}, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    };
    if (!ARRIVES.has(g.do)) linear.add(field);

    switch (g.do) {
      case "highlight":
        // The subject carries the accent; a highlight on another row rings it (implicitAccent).
        own.forEach((m) => (next[`${(g.subject === undefined || m === g.subject) ? "accent" : "ring"}${at.get(m)}`] = 1));
        break;
      case "name":
        next[`ring${at.get(own[0])}`] = 1;
        break;
      case "filter":
        names.forEach((n, i) => (next[`back${i}`] = own.includes(n) ? 0 : 1));
        picture = length.with(picture, { emphasis: Object.fromEntries(names.filter((n) => !own.includes(n)).map((n) => [n, "stepBack"])) });
        break;
      case "zoom": {
        const zoomed = length.window(picture, own);
        const factor = (wide[1] - wide[0]) / (zoomed.domain[1] - zoomed.domain[0]);
        if (!(factor > 1.0001)) unchanged(`onto ${own.join(", ")} keeps the scale it had`);
        const printed = figuresIn(g.note);
        const holds = printed.some((n) => Math.abs(n.value - factor) <= 0.5 * 10 ** -n.decimals + 1e-9);
        if (!holds) {
          const n = printed[0];
          const fixed = factor.toFixed(n.decimals).replace(".", n.separator === "," ? "," : ".");
          const note = g.note.slice(0, n.index) + fixed + g.note.slice(n.index + n.raw.length);
          throw new GestureRefusal(
            `gestures[${k}].note`,
            `prints the factor ${n.raw}, but zooming onto ${own.join(", ")} enlarges the scale ×${factor.toFixed(2)}: write "${note}"`,
            { set: { index: k, field: "note", value: note } },
          );
        }
        picture = { ...zoomed, factorPrinted: true };
        [next.lo, next.hi] = zoomed.domain;
        item.factor = factor;
        break;
      }
      case "reorder": {
        const how = g.value === "ascending" || g.value === "descending" ? g.value : own.length ? [...own, ...order().filter((n) => !own.includes(n))] : "descending";
        const now = { ...picture, order: order() };
        const moved = length.order(now, how);
        if (length.equal(moved, now)) unchanged(`asks for the order the rows already hold (${now.order.join(", ")})`);
        moved.order.forEach((n, slot) => (next[`slot${at.get(n)}`] = slot));
        picture = moved;
        item.order = moved.order;
        break;
      }
      case "rescale": {
        // The new top, never under the longest bar: the axis travels, every bar stays whole.
        const top = Math.max(Number(g.value) || 0, ...rows.map((r) => Math.abs(r.value)));
        if (top === wide[1] && state.hi === wide[1]) unchanged(`to ${top} keeps the top the scale already has`);
        wide = [wide[0], top];
        [next.lo, next.hi] = wide;
        picture = { ...length.with(picture, { domain: [...wide] }), window: null };
        item.top = top;
        break;
      }
      case "reveal":
        next.ink = 1;
        break;
      case "compare":
        item.onto = own[0];
        item.value = copyValue(g);
        item.against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names.filter((n) => n !== own[0]) : of;
        picture = length.with(picture, { compare: [own[0], ...item.against] });
        break;
      case "bracket": {
        // One row of the whole: the bracket spans every drawn row, its count climbing to the whole.
        const ofWhole = own.length === 1 && g.of === "whole";
        const members = (ofWhole ? names : own).slice().sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
        item.members = members;
        item.steps = prefixSums([...members.map((n) => valueOf.get(n)), ...(ofWhole && rest.count ? [rest.sum] : [])]);
        picture = length.with(picture, { bracket: members });
        break;
      }
      case "count": {
        const counted = (own.length ? own : names).slice().sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
        item.counted = counted;
        item.steps = prefixSums([...counted.map((n) => valueOf.get(n)), ...(!own.length && rest.count ? [rest.sum] : [])]);
        break;
      }
      case "reference":
        item.value = Number(g.value);
        picture = length.with(picture, { reference: item.value });
        break;
      case "pull-back": {
        const zoomed = state.lo !== wide[0] || state.hi !== wide[1];
        const filtered = names.some((_, i) => state[`back${i}`] > 0);
        if (!zoomed && !filtered) unchanged("has no zoom or filter to return from");
        [next.lo, next.hi] = wide;
        names.forEach((_, i) => (next[`back${i}`] = 0));
        if (zoomed || filtered) next.release = 1;
        // A return from a zoom is not a rescale (its factor was printed): the picture keeps its window mark, so the
        // one-scale lock (no-float-baseline-rescale) is held against rescales only, as it is written.
        picture = { ...picture, domain: [...wide], emphasis: Object.fromEntries(Object.entries(picture.emphasis).filter(([, r]) => r !== "stepBack")) };
        break;
      }
      case "annotate":
        break;
      default:
        throw new GestureRefusal(`gestures[${k}].do`, `"${g.do}" has no video staging`, { remove: k });
    }

    // Which window each changed field moves in.
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const own_ = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = own_;

    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE CHART (doctrine rule 9): what is zoomed or filtered returns, marked.
      const releases = [];
      if (next.lo !== wide[0] || next.hi !== wide[1]) {
        [next.lo, next.hi] = wide;
        releases.push("lo", "hi");
      }
      names.forEach((_, i) => {
        if (next[`back${i}`] > 0) {
          next[`back${i}`] = 0;
          releases.push(`back${i}`);
        }
      });
      if (releases.length) {
        next.release = 1;
        releases.push("release");
        picture = { ...picture, domain: [...wide] };
      }
      for (const key of releases) windows.conclusion[key] = WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    pictures.push(picture);
    plan.push(item);
    states.push(next);
    state = next;
  });

  // The family's locks, held state by state so the refusal names the gesture that broke one (state k is gesture k-1).
  for (let k = 1; k < pictures.length; k++)
    try {
      length.invariants(pictures.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }

  states.push({ ...state });
  return { states, windows, linear: [...linear], plan, pictures, whole };
}

// ── time ──────────────────────────────────────────────────────────────────────────────────────────

/** How far through an event a frame is, 0..1 (shared/chart-video/timing.ts `progressOf`). */
export function progressOf(frame, event) {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

/** A field's value at a frame: each event's change, moved over its window, linear or eased. */
export function fieldAt(props, field, frame) {
  const { states, windows, timing } = props;
  const straight = props.linear.includes(field);
  // The title card is up from frame 0: establish's own state is where the video starts.
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

/** How far the `k`-th of `n` staggered moves has gone when the whole is at `t` (one move takes `share` of it). */
export const moveOf = (t, k, n, share = 0.3) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);

/**
 * A count's text at `v`, in the story's number format `{ decimals, small, below, decimal, group }`: `small` decimals
 * under `below`, `decimals` from it, `decimal` as the separator, `group` between thousands ("" for none). Negative
 * values keep their sign.
 */
export function valueText(v, f) {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const [whole, part] = a.toFixed(a >= f.below || a === 0 ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return `${sign}${part ? `${grouped}${f.decimal}${part}` : grouped}`;
}

/** How many of a climbing figure's steps have landed when its gesture's field is at `g`. */
export const landedOf = (item, g) => Math.min(item.steps.length, Math.floor(g * item.steps.length + 1e-9));

/** The text a count or bracket's figure shows at a frame, or null while none of its steps has landed. */
export function countTextAt(props, item, frame) {
  const landed = landedOf(item, fieldAt(props, item.field, frame));
  return landed > 0 ? valueText(item.steps[landed - 1], props.format) : null;
}

/** Every text a climbing figure can show, for the runner to measure before anything is drawn. */
export function countedTexts(plan, format) {
  return [...new Set(plan.filter((p) => p.steps).flatMap((p) => p.steps.map((v) => valueText(v, format))))];
}
