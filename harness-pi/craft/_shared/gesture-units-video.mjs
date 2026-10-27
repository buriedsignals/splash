// The Units video scheduler (craft/gestures/GRAMMAR.md §5): three composed gestures placed into the six-event timing
// contract. `establish` (the title card) and `reference` (the groups arriving: names, baseline, every group's units
// landing at ONE pace — the j-th unit of every group on the same frame, `no-let-blocks-count`) are the scheduler's;
// the gestures fill `reveal`, `subject` and `conclusion` in story order; the conclusion shows the whole chart (a
// filter still active is released there) and brings the credit; `hold` repeats it. A state is a flat record of
// finite numbers, as the chart-video skill's `assertEventStates` reads it.
//
// The frame's arithmetic lives here too (`sceneUnitsAt`), so the Remotion bundle and the runner in Bun read one
// formula. Motion along a measured axis (units landing, a copy's length, a bracket's spine, a count) is linear;
// arrivals (the title, a colour, a ring, a note) are eased (gesture-video.mjs `fieldAt`). Browser-safe: no Node
// module, no `#shared` import.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";
import { EVENTS, fieldAt, landedOf, valueText } from "./gesture-video.mjs";
import { edgeOf, splitMarks } from "./gesture-family-units.mjs";

const ARRIVES = new Set(["highlight", "name", "annotate", "filter", "pull-back", "reference"]);
const WINDOW = {
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.45], fill: [0.25, 0.95] },
  gesture: [0.08, 0.88],
  conclusion: { release: [0, 0.3], gesture: [0.28, 0.82], source: [0.82, 0.97] },
};
const prefixSums = (values) => {
  let s = 0;
  return values.map((v) => (s += v));
};

/**
 * @param gestures validateGestures' gestures
 * @param groups   the partition's groups, in drawing order
 * @returns        { states, windows, linear, plan, total }
 */
export function scheduleUnitsVideo({ gestures, groups }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const names = groups.map((g) => g.name);
  const at = new Map(names.map((n, i) => [n, i]));
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const sum = (list) => list.reduce((s, n) => s + (countOf.get(n) ?? 0), 0);
  const total = sum(names);
  const hasReveal = gestures.some((g) => g.do === "reveal");

  const base = { title: 0, furniture: 0, fill: 0, release: 0, source: 0 };
  names.forEach((_, i) => Object.assign(base, { [`accent${i}`]: 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const implicit = implicitAccent(gestures);
  if (at.has(implicit)) base[`accent${at.get(implicit)}`] = 1;

  const establish = { ...base, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, fill: hasReveal ? 0 : 1 };
  const windows = { establish: { ...WINDOW.establish }, reference: { ...WINDOW.reference }, reveal: {}, subject: {}, conclusion: {}, hold: {} };
  const linear = new Set(["fill"]);
  const states = [establish, reference];
  const plan = [];
  let state = reference;

  gestures.forEach((g, k) => {
    const event = VIDEO_EVENTS[k];
    const { own, of } = splitMarks(g);
    const field = `g${k}`;
    const next = { ...state, [field]: 1 };
    const item = { index: k, do: g.do, event, field, marks: own, of, note: g.note === undefined || !String(g.note).trim() ? undefined : String(g.note) };
    const unchanged = (what) => {
      if (event === "conclusion") return;
      throw new GestureRefusal(`gestures[${k}]`, `${g.do} ${what}, so the ${event} would change nothing in the picture: drop it`, { remove: k });
    };
    if (!ARRIVES.has(g.do)) linear.add(field);
    switch (g.do) {
      case "highlight":
        own.forEach((m) => (next[`${g.subject === undefined || m === g.subject ? "accent" : "ring"}${at.get(m)}`] = 1));
        break;
      case "name":
        next[`ring${at.get(own[0])}`] = 1;
        break;
      case "annotate":
        break;
      case "filter":
        names.forEach((n, i) => (next[`back${i}`] = own.includes(n) ? 0 : 1));
        break;
      case "reveal":
        if (state.fill >= 1) unchanged("finds every unit already landed");
        next.fill = 1;
        break;
      case "compare":
        item.onto = own[0];
        item.value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? total : sum(of);
        break;
      case "bracket": {
        const ofWhole = own.length === 1 && g.of === "whole";
        item.members = ofWhole ? names : own;
        item.whole = ofWhole;
        // Against the whole the figure states the group's own count, then the whole it is measured against.
        item.steps = ofWhole ? [countOf.get(own[0]), total] : prefixSums(item.members.map((n) => countOf.get(n)));
        break;
      }
      case "count": {
        const counted = own.length ? own : names;
        item.counted = counted;
        item.steps = prefixSums(counted.map((n) => countOf.get(n)));
        break;
      }
      case "reference": {
        item.at = edgeOf(g);
        const above = groups.findIndex((x) => x.lo === item.at);
        const below = groups.findIndex((x) => x.hi === item.at);
        item.between = [Math.min(above, below), Math.max(above, below)];
        break;
      }
      case "pull-back": {
        const filtered = names.some((_, i) => state[`back${i}`] > 0);
        if (!filtered) unchanged("has no filter to return from");
        names.forEach((_, i) => (next[`back${i}`] = 0));
        if (filtered) next.release = 1;
        break;
      }
      default:
        throw new GestureRefusal(`gestures[${k}].do`, `"${g.do}" has no video staging on a units chart`, { remove: k });
    }
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    const own_ = event === "conclusion" ? WINDOW.conclusion.gesture : WINDOW.gesture;
    for (const key of changed) windows[event][key] = own_;
    if (event === "conclusion") {
      const releases = [];
      names.forEach((_, i) => {
        if (next[`back${i}`] > 0) {
          next[`back${i}`] = 0;
          releases.push(`back${i}`);
        }
      });
      if (next.fill < 1) {
        next.fill = 1;
        releases.push("fill");
      }
      if (releases.length) {
        next.release = 1;
        releases.push("release");
      }
      for (const key of releases) windows.conclusion[key] = WINDOW.conclusion.release;
      next.source = 1;
      windows.conclusion.source = WINDOW.conclusion.source;
    }
    plan.push(item);
    states.push(next);
    state = next;
  });
  states.push({ ...state });
  return { states, windows, linear: [...linear], plan, total, events: EVENTS };
}

/** The frame's picture at one frame: pure arithmetic over build.mjs's props. */
export function sceneUnitsAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const L = props.layout;
  const max = L.max;
  const fill = f("fill");
  const g = props.plan.map((p) => f(p.field));
  const variant = props.variant;
  const endAt = (row, k) => (variant === "histogram" ? L.x0 + (k / max) * L.span : L.x0 + Math.min(k, L.perLine) * L.cell);
  const rows = props.rows.map((r, i) => {
    // Every group lands its units at one pace: the j-th unit of every group at the same frame (no-let-blocks-count).
    const landed = variant === "histogram" ? Math.min(r.count, fill * max) : Math.min(r.count, Math.floor(fill * max + 1e-9));
    const copy = props.plan.find((p) => p.do === "compare" && p.onto === r.key);
    const after = Math.max(endAt(r, r.count), copy ? endAt(r, copy.value) : 0);
    return {
      landed,
      accent: f(`accent${i}`),
      ring: f(`ring${i}`),
      back: f(`back${i}`),
      end: endAt(r, landed),
      countX: after + L.gap,
      countOpacity: landed >= r.count ? 1 : 0,
      notes: r.notes.map((n) => ({ ...n, opacity: g[n.item] >= 1 || ARRIVES.has(props.plan[n.item].do) ? g[n.item] : 0 })),
    };
  });
  const copies = props.plan
    .filter((p) => p.do === "compare" && g[p.index] > 0)
    .map((p) => ({ row: props.rows.findIndex((r) => r.key === p.onto), shown: p.value * g[p.index] }));
  const brackets = props.plan
    .filter((p) => p.do === "bracket" && g[p.index] > 0)
    .map((p) => {
      const idx = p.members.map((m) => props.rows.findIndex((r) => r.key === m));
      const y1 = Math.min(...idx.map((i) => props.rows[i].top));
      const y2 = Math.max(...idx.map((i) => props.rows[i].top + props.rows[i].band));
      const landedSteps = landedOf(p, g[p.index]);
      const label = props.bracketLabels.find((b) => b.item === p.index);
      const noted = g[p.index] >= 1 && label?.note;
      return { index: p.index, y1, reach: y1 + (y2 - y1) * g[p.index], y2, figure: noted ? null : landedSteps > 0 ? valueText(p.steps[landedSteps - 1], props.format) : null, note: noted ? label.note : null, x: label.x };
    });
  const rules = props.plan
    .filter((p) => p.do === "reference" && g[p.index] > 0)
    .map((p) => {
      const a = props.rows[p.between[0]];
      const b = props.rows[p.between[1]];
      return { index: p.index, y: (a.top + a.band + b.top) / 2, reach: L.x0 + (L.right - L.x0) * g[p.index], opacity: g[p.index] };
    });
  const captions = props.captions.map((c) => {
    const item = props.plan[c.item];
    const progress = g[c.item];
    if (c.kind === "count") {
      const k = landedOf(item, progress);
      const noted = progress >= 1 && c.lines.length > 0;
      return { ...c, figure: noted ? null : k > 0 ? valueText(item.steps[k - 1], props.format) : null, opacity: noted ? 1 : 0 };
    }
    return { ...c, figure: null, opacity: ARRIVES.has(item.do) ? progress : progress >= 1 ? 1 : 0 };
  });
  return { title: f("title"), furniture: f("furniture"), source: f("source"), rows, copies, brackets, rules, captions };
}

/** Every text a climbing figure can show, for the runner to measure before anything is drawn. */
export function climbingTexts(plan, format) {
  return [...new Set(plan.filter((p) => p.steps).flatMap((p) => p.steps.map((v) => valueText(v, format))))];
}
