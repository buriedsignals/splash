// The PAIRED family's video scheduler and its time half (craft/gestures/GRAMMAR.md §5, §6.1): three composed gestures
// placed into the six-event timing contract, over the paired adapter (./gesture-family-paired.mjs). `establish` (the
// title card) and `reference` (the chart arriving on its one scale) are the scheduler's; the gestures fill `reveal`,
// `subject` and `conclusion` in story order; the conclusion shows the whole chart — a filter still active is released
// there, what was shown stays marked — and brings the credit; `hold` repeats it.
//
// Each gesture's END picture is the adapter's (`foldGesture`); this file turns the sequence of pictures into flat
// records of finite numbers (`assertEventStates`) and says, per field, when it moves:
//   slot<i>   key i's row position (a reorder moves it, linear)
//   back<i>   key i stepped back (a filter, eased; released in the conclusion)
//   accent<j> / ring<j>   mark j in the accent / ringed (eased)
//   g<k>      gesture k's own progress: a compare's copy growing along the scale, a bracket's spine running down its
//             bands while its figure climbs, a reference rule drawing itself, a note arriving
//   ink       the reveal: keys inked one by one in their drawn order (linear)
//
// Refusals here are the grammar's "change" and "format" checks the core cannot make without the scheduled pictures:
// a reorder into the order already held, a pull-back before the conclusion with nothing to return from. Nothing here
// reads the data's shape. Browser-safe: no Node module, no `#shared` import — the frame (Remotion bundle) imports
// `sceneAt` from here.
import { GestureRefusal } from "./gesture-core.mjs";
import { firstState, foldGesture, invariants, layoutPaired, splitMarks } from "./gesture-family-paired.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";

export const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

// Byte-identical formulas to shared/chart-video/series.mjs (`clamp01`, `ease`).
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Gestures whose own field is an arrival (eased); every other gesture moves along a measured axis (linear). */
const ARRIVES = new Set(["highlight", "name", "annotate", "filter", "pull-back", "reveal"]);

const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], grown: [0.25, 0.9] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};

const prefixSums = (values) => {
  let sum = 0;
  return values.map((v) => (sum += v));
};

/**
 * @param gestures validateGestures' `gestures` (format "video": exactly three)
 * @param keys     the keys drawn, in their drawn order: [{ name, values }] or names
 * @param marks    the drawn keys' marks (marksOf), in key-major order
 * @param series   the series names
 * @param variant  the paired type
 * @param claim    the claim (its subject key carries the accent when no gesture highlights)
 * @returns        { states, windows, linear, plan, pictures, subject }
 */
export function schedulePairedVideo({ gestures, keys, marks, series, variant, claim = {}, format = String }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const keyNames = keys.map((k) => k.name ?? k);
  const kAt = new Map(keyNames.map((n, i) => [n, i]));
  const mAt = new Map(marks.map((m, j) => [m.name, j]));
  const byName = new Map(marks.map((m) => [m.name, m]));

  const { state: first, subject } = firstState({ keys: keyNames, marks, gestures, claim });
  const ctx = { marks, keys: keyNames, series, variant, format };

  const fieldsOf = (picture) => {
    const out = {};
    picture.order.forEach((k, slot) => (out[`slot${kAt.get(k)}`] = slot));
    keyNames.forEach((k, i) => (out[`back${i}`] = picture.stepBack.includes(k) ? 1 : 0));
    marks.forEach((m, j) => {
      out[`accent${j}`] = picture.emphasis[m.name] === "accent" ? 1 : 0;
      out[`ring${j}`] = picture.emphasis[m.name] === "ring" ? 1 : 0;
    });
    return out;
  };

  const base = { title: 0, furniture: 0, grown: 0, ink: 0, release: 0, source: 0, ...fieldsOf(first) };
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const hasReveal = gestures.some((g) => g.do === "reveal");
  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grown: 1, ink: hasReveal ? 0 : 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["ink", ...keyNames.map((_, i) => `slot${i}`)]);

  let picture = first;
  const pictures = [first];
  let state = reference;
  const plan = [];
  const states = [establish, reference];

  gestures.forEach((g, k) => {
    const event = VIDEO_EVENTS[k];
    const { own, of } = splitMarks(g);
    const field = `g${k}`;
    const before = picture;
    picture = foldGesture(picture, g, k, ctx);
    const next = { ...state, ...fieldsOf(picture), [field]: 1 };
    const keysOf = (names) => [...new Set(names.map((n) => byName.get(n)?.key).filter(Boolean))];
    const item = { index: k, do: g.do, event, field, marks: own, of, keys: keysOf(own), note: picture.notes.find((n) => n.index === k)?.text };
    const unchanged = (what) => {
      if (event === "conclusion") return;
      throw new GestureRefusal(`gestures[${k}]`, `${g.do} ${what}, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    };
    if (!ARRIVES.has(g.do)) linear.add(field);
    switch (g.do) {
      case "reorder":
        if (picture.order.every((n, i) => n === before.order[i])) unchanged(`asks for the order the rows already hold (${before.order.join(", ")})`);
        item.order = picture.order;
        break;
      case "reveal":
        next.ink = 1;
        break;
      case "compare": {
        const copy = picture.copies.find((c) => c.index === k);
        Object.assign(item, { onto: copy.onto, value: copy.value, against: copy.of });
        break;
      }
      case "bracket": {
        const b = picture.brackets.find((x) => x.index === k);
        const members = b.marks.slice().sort((x, y) => next[`slot${kAt.get(byName.get(x).key)}`] - next[`slot${kAt.get(byName.get(y).key)}`]);
        item.members = members;
        item.bandKeys = b.keys;
        item.steps = prefixSums(members.map((n) => byName.get(n).value));
        item.whole = b.whole;
        item.note = b.note;
        break;
      }
      case "reference":
        item.value = Number(g.value);
        break;
      case "pull-back":
        if (!before.stepBack.length) unchanged("has no filter to return from");
        if (before.stepBack.length) next.release = 1;
        break;
      default:
        break;
    }
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const span = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = span;

    if (event === "conclusion") {
      // THE CONCLUSION SHOWS THE WHOLE CHART (doctrine rule 9): what is stepped back returns, the marks stay.
      const releases = keyNames.map((_, i) => `back${i}`).filter((f) => next[f] > 0);
      for (const f of releases) next[f] = 0;
      if (releases.length) {
        next.release = 1;
        releases.push("release");
        picture = { ...picture, stepBack: [] };
      }
      for (const f of releases) windows.conclusion[f] = WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    pictures.push(picture);
    plan.push(item);
    states.push(next);
    state = next;
  });
  invariants(pictures, { variant });
  states.push({ ...state });
  return { states, windows, linear: [...linear], plan, pictures, subject };
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

export const moveOf = (t, k, n, share = 0.3) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);

/** A figure's text at `v`, in the story's number format `{ decimals, small, below, decimal, group }`. */
export function valueText(v, f) {
  const sign = v < 0 ? "-" : "";
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

export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

const NB = " ";
const withUnit = (unit, text) => (unit ? `${text}${NB}${unit}` : text);

/**
 * THE PICTURE AT ONE FRAME — pure arithmetic over build.mjs's props: the adapter's geometry (`layoutPaired`) at the
 * rest order, each band shifted to its moving slot, each mark grown from its base, coloured by its eased accent and
 * step-back, and every gesture's own laying at its progress.
 */
export function sceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const L = props.layout;
  const variant = props.variant;
  const pyramid = variant === "population-pyramid";
  const keyNames = props.keys.map((k) => k.name);
  const n = keyNames.length;
  const geo = layoutPaired({ variant, keys: keyNames, marks: props.marks, series: props.series, state: { order: keyNames }, frame: L.plot, domain: L.domain });
  const grown = f("grown");
  const ink = f("ink");
  const g = props.plan.map((p) => f(p.field));
  const slotY = (slot) => L.plot.y + (pyramid ? n - 1 - slot : slot) * geo.pitch;

  const keys = props.keys.map((k, i) => {
    const slot = f(`slot${i}`);
    const restY = geo.bands.get(k.name).y;
    const dy = slotY(slot) - restY;
    const inked = props.hasReveal ? moveOf(ink, Math.round(slot), n) : 1;
    return { name: k.name, dy, y: slotY(slot), back: f(`back${i}`), inked };
  });
  const keyAt = new Map(keys.map((k, i) => [k.name, i]));

  const marks = props.marks.map((m, j) => {
    const at = geo.marks.get(m.name);
    const k = keys[keyAt.get(m.key)];
    const tip = at.base + (at.tip.x - at.base) * grown;
    return {
      name: m.name,
      key: m.key,
      j: m.j,
      x0: Math.min(at.base, tip),
      x1: Math.max(at.base, tip),
      base: at.base,
      tip,
      fullTip: at.tip.x,
      y: at.y + k.dy,
      h: at.h,
      side: at.side,
      accent: f(`accent${j}`),
      ring: f(`ring${j}`),
      back: k.back,
      inked: k.inked,
      labelOpacity: grown >= 1 && k.inked >= 1 ? 1 - 0.6 * k.back : 0,
    };
  });
  const markAt = new Map(marks.map((m) => [m.name, m]));

  const copies = props.plan
    .filter((p) => p.do === "compare" && g[p.index] > 0)
    .map((p) => {
      const m = markAt.get(p.onto);
      const target = geo.xOf(p.value, m.side);
      const tip = m.base + (target - m.base) * g[p.index];
      return { index: p.index, x: Math.min(m.base, tip), width: Math.abs(tip - m.base), y: m.y + m.h * 0.55, height: m.h * 0.45, base: m.base, tip, cy: m.y + m.h / 2, r: m.h * 0.4 };
    });

  const brackets = props.plan
    .filter((p) => p.do === "bracket" && g[p.index] > 0)
    .map((p) => {
      const ys = p.bandKeys.map((k) => keys[keyAt.get(k)].y);
      const y1 = Math.min(...ys) + geo.pitch * 0.11;
      const y2 = Math.max(...ys) + geo.pitch * 0.89;
      const progress = g[p.index];
      const x = L.bracketX;
      // The spine runs in the order its figure climbs: down the rows, or up the pyramid from its foot.
      const [from, to] = pyramid ? [y2, y1] : [y1, y2];
      const reach = from + (to - from) * progress;
      const landed = landedOf(p, progress);
      const label = props.bracketLabels.find((b) => b.item === p.index);
      const figure = landed > 0 ? withUnit(props.unit, valueText(p.steps[landed - 1], props.format)) : null;
      const noted = progress >= 1 && label?.note;
      return { index: p.index, x, y1: from, reach, labelX: x + L.gap, labelY: (y1 + y2) / 2 + L.countShift, figure: noted ? null : figure, note: noted ? label.note : null };
    });

  const rules = props.plan
    .filter((p) => p.do === "reference" && g[p.index] > 0)
    .flatMap((p) => {
      const y2 = L.plot.y + L.plot.height * g[p.index];
      return (pyramid ? [-1, 1] : [1]).map((side) => ({ index: p.index, x: geo.xOf(p.value, side), y1: L.plot.y, y2 }));
    });

  const captions = props.captions.map((c) => {
    const item = props.plan[c.item];
    const progress = g[c.item];
    const arrives = ARRIVES.has(item.do);
    return { ...c, opacity: arrives ? progress : progress >= 1 ? 1 : 0 };
  });

  return { title: f("title"), furniture: f("furniture"), source: f("source"), keys, marks, copies, brackets, rules, captions, geo, g };
}
