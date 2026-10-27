// The PAIRED family adapter (craft/gestures/GRAMMAR.md §4, F1 Length — the members with two values per key or a
// signed one): lollipop, grouped-bar, bullet, diverging-bar, population-pyramid. Every type is drawn in ROWS (one band
// per key, names in the left gutter — or the pyramid's spine), on ONE value scale from zero:
//
//   lollipop            two stems per key from zero: series[0] the earlier state (pale), series[1] the later (full)
//   grouped-bar         two bars per key from zero: series[0] full, series[1] pale
//   bullet              a full track to the ceiling, series[0] the comparative state (thick, pale), series[1] the
//                       measure (thin, saturated) laid over it
//   diverging-bar       one signed bar per key from a mid zero (one series)
//   population-pyramid  series[0] grows left of a spine, series[1] right; keys keep their natural order (youngest at
//                       the foot), both halves on one magnitude scale
//
// A MARK is one key × series: { name: "Chine · 2023", value, key: "Chine", series: "2023" } (diverging-bar: the key
// itself, no series). A gesture may name a mark, a key (both of its marks) or a series (every key's mark of it).
//
// This module holds what every format shares: the marks from the beat's rows, the claim's entities over keys and
// series, the family's figures and refusals for the gesture core (`hooks`), the fold of a validated list into
// picture states (`foldGesture`), the family's locks (`invariants`), and the geometry (`layoutPaired`) every format's
// component draws from. Browser-safe: no Node module, no `#shared` import.
import { GestureRefusal } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

export const FAMILY = "paired";
export const VARIANTS = ["lollipop", "grouped-bar", "bullet", "diverging-bar", "population-pyramid"];

/**
 * The gestures this family draws in every format (GRAMMAR §6): fewer drawn well. `zoom` and `rescale` are left out (a
 * second scale beside a paired comparison is the false encoding the family exists to avoid), `count` and `trace` too
 * (no path; a climbing figure says nothing a paired note does not). `bracket` is admitted for the family and refused
 * per type by `hooks.refuse` where the values do not add up.
 *
 * additive: TRUE at the family level, because the pyramid's marks are counts of people (a run of age bands, both sexes,
 * adds up to a share of the population) and the core refuses every bracket of a non-additive family before a type can
 * speak. The other four types do NOT add up — lollipop and diverging-bar draw rates or changes, grouped-bar and bullet
 * draw shares of each key's own whole — so `hooks.refuse` drops a bracket there (rule `bracket-adds-up`), and the
 * core's own RATE test refuses one over a per-resident measure whatever the type.
 */
export const GESTURES = ["highlight", "name", "annotate", "compare", "reference", "filter", "reorder", "bracket", "reveal", "pull-back"];
FAMILIES.paired ??= { gestures: GESTURES, additive: true };

/** The types whose values add up within a series (a bracket draws their sum). */
export const ADDITIVE = new Set(["population-pyramid"]);
/** The types whose keys keep their natural order (no reorder). */
export const NATURAL_ORDER = new Set(["population-pyramid"]);

export const SEP = " · ";
const fold = (s) => String(s ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const words = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
const namedIn = (text, name) => {
  const w = words(name).trim();
  return w !== "" && words(text).includes(` ${w} `);
};

// ── the beat's rows → keys and marks ─────────────────────────────────────────────────────────────

/**
 * The beat's rows as keys: `{ name, values: [a, b] }` (or `{ name, value }` for one series). A missing value (null,
 * undefined, NaN) is a GAP: its mark is not drawn and the band says "n/a" — never refused.
 * @returns { keys: [{ name, values }], series: [names], marks: [{ name, value, key, series, j }] }
 */
export function marksOf({ rows, series, variant }) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of ${VARIANTS.join(", ")}, not "${variant}"`);
  const names = [series ?? []].flat().map(String);
  const width = variant === "diverging-bar" ? 1 : 2;
  if (names.length !== width)
    throw new Error(
      variant === "diverging-bar"
        ? `beat.mjs: series must name the one measure the bars draw, e.g. series: ["change 1990-2024"]`
        : `beat.mjs: series must name the two values each row carries, in order, e.g. series: ["2000", "2023"] (see CONTRACT.md)`,
    );
  if (!Array.isArray(rows) || !rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { name, values: [first, second] }");
  const keys = rows.map((r, i) => {
    if (!r || r.name === undefined) throw new Error(`beat.mjs: rows[${i}] has no name`);
    const raw = Array.isArray(r.values) ? r.values : r.value !== undefined ? [r.value] : [];
    if (raw.length !== width)
      throw new Error(`beat.mjs: rows[${i}] (${r.name}) must carry ${width === 1 ? "value (or values: [v])" : `values: [${names[0]}, ${names[1]}]`}`);
    const values = raw.map((v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v)));
    return { name: String(r.name), values };
  });
  const seen = new Set();
  for (const k of keys) {
    if (seen.has(k.name)) throw new Error(`beat.mjs: rows holds ${k.name} twice: give each key ONE row carrying its ${width} value(s)`);
    seen.add(k.name);
  }
  const marks = [];
  for (const k of keys)
    k.values.forEach((v, j) => {
      if (v === null) return;
      marks.push({ name: width === 1 ? k.name : `${k.name}${SEP}${names[j]}`, value: v, key: k.name, ...(width === 1 ? {} : { series: names[j] }), j });
    });
  if (!marks.length) throw new Error("beat.mjs: every value is missing: rows must carry numbers read from data.json");
  return { keys, series: names, marks };
}

/**
 * The claim for the core. The core now resolves a takeaway's keys and series to their marks itself (b01577947): a
 * takeaway that says "la Chine" makes "Chine · 2000" and "Chine · 2023" its entities. This adapter used to add those
 * marks to `versus`, and with the core doing it too, the series named in those mark names ("2000") made every mark of
 * that series an entity — a gesture on India passed as serving a takeaway about China. So the claim goes through as
 * the storyboard recorded it; the function stays so every runner keeps one call site.
 */
export function pairedClaim(claim) {
  return claim;
}

/** The key the takeaway is about: the recorded entity, else the key the takeaway names first. */
export function subjectKey(claim, keys) {
  const names = keys.map((k) => k.name ?? k);
  const entity = names.find((n) => claim.entity && namedIn(claim.entity, n));
  if (entity) return entity;
  const t = fold(claim.takeaway);
  const at = (n) => (namedIn(claim.takeaway, n) ? t.indexOf(fold(n)) : -1);
  return names.filter((n) => at(n) >= 0).sort((a, b) => at(a) - at(b))[0] ?? (claim.subject ? names.find((n) => namedIn(claim.subject, n)) : undefined);
}

// ── the core's hooks: the family's figures and refusals ────────────────────────────────────────────

/**
 * hooks.figures: what a paired gesture draws beyond its marks' own values. A gesture covering both marks of a key
 * draws that key's CHANGE (second − first, and the reverse), its ratio both ways and its relative change in percent
 * (the printed change label); for the pyramid the band's total (both sides) as well. A gesture covering a whole series
 * draws how many keys it leads ("in 5 of 6 countries"). Never anything the marks do not give.
 */
export function pairedFigures(variant, marks) {
  const byName = new Map(marks.map((m) => [m.name, m]));
  return (g, ctx) => {
    const own = ctx.marks.map((n) => byName.get(n)).filter(Boolean);
    const out = [];
    const keys = [...new Set(own.map((m) => m.key))];
    for (const key of keys) {
      const pair = marks.filter((m) => m.key === key);
      if (pair.length !== 2 || !pair.every((m) => ctx.marks.includes(m.name))) continue;
      const [a, b] = pair.map((m) => m.value);
      out.push(b - a, a - b, Math.abs(b - a));
      if (a) out.push(b / a, (b / a - 1) * 100);
      if (b) out.push(a / b);
      if (ADDITIVE.has(variant)) out.push(a + b);
    }
    if (keys.length > 1 && ADDITIVE.has(variant)) out.push(own.reduce((s, m) => s + m.value, 0));
    const seriesNames = [...new Set(marks.map((m) => m.series).filter(Boolean))];
    for (const s of seriesNames) {
      const of = marks.filter((m) => m.series === s);
      if (!of.length || !of.every((m) => ctx.marks.includes(m.name))) continue;
      const other = seriesNames.find((x) => x !== s);
      const keysAll = [...new Set(marks.map((m) => m.key))];
      const leads = keysAll.filter((k) => {
        const a = marks.find((m) => m.key === k && m.series === s)?.value;
        const b = marks.find((m) => m.key === k && m.series === other)?.value;
        return a !== undefined && b !== undefined && a > b;
      }).length;
      out.push(leads, keysAll.length - leads, keysAll.length);
      if (ADDITIVE.has(variant)) out.push(of.reduce((t, m) => t + m.value, 0));
    }
    // diverging-bar: how many rise and how many fall (a filter on every rise says "the only one").
    if (variant === "diverging-bar") out.push(marks.filter((m) => m.value > 0).length, marks.filter((m) => m.value < 0).length, marks.length);
    return out;
  };
}

const given = (g, field) => (g[field] === undefined ? [] : [g[field]].flat());

/**
 * hooks.refuse: the family's rules, each with the field and a value that works.
 * - bracket-adds-up: a bracket prints a sum, and only the pyramid's values add up (people).
 * - natural-order: the pyramid's bands keep their age order: no reorder.
 * - compare-one-length: a compare lays ONE length against another; written on a key or a series it would lay a sum
 *   of mixed marks. It is refused with the two marks that work: the key's later value against its earlier one, or
 *   the two keys' later values.
 * - reference-on-the-scale: a reference rule at a level the value scale cannot hold (a negative level on the
 *   pyramid's magnitudes, a level past the bullet's ceiling).
 */
export function pairedRefuse(variant, marks, { ceiling } = {}) {
  const byName = new Map(marks.map((m) => [m.name, m]));
  const series = [...new Set(marks.map((m) => m.series).filter(Boolean))];
  return (g, ctx) => {
    const i = ctx.index;
    if (g.do === "bracket" && !ADDITIVE.has(variant))
      throw new GestureRefusal(`gestures[${i}]`, `a ${variant}'s values do not add up to a sum (rates, shares or changes): drop the bracket, or compare two marks instead`, { remove: i });
    if (g.do === "reorder" && NATURAL_ORDER.has(variant))
      throw new GestureRefusal(`gestures[${i}]`, `a population pyramid keeps its bands in age order (youngest at the foot): drop the reorder`, { remove: i });
    if (g.do === "compare") {
      const raw = [...given(g, "mark"), ...given(g, "marks")];
      const ofCount = Array.isArray(ctx.of) ? ctx.of.length : 0;
      const own = ctx.marks.slice(0, ctx.marks.length - ofCount);
      if (series.length === 2 && own.length > raw.length) {
        const ms = own.map((n) => byName.get(n)).filter(Boolean);
        const keys = [...new Set(ms.map((m) => m.key))];
        const last = series[1];
        const pick = (k, s) => marks.find((m) => m.key === k && m.series === s)?.name;
        const value =
          keys.length === 1
            ? [pick(keys[0], last), pick(keys[0], series[0])]
            : [pick(keys[0], last), pick(keys[1], last)];
        if (value.every(Boolean))
          throw new GestureRefusal(`gestures[${i}].marks`, `a compare lays one length against another, and ${raw.join(", ")} names ${own.length} marks: name the two marks, the subject first`, {
            set: { index: i, value: { ...Object.fromEntries(Object.entries(g).filter(([k]) => k !== "mark")), marks: value } },
          });
        throw new GestureRefusal(`gestures[${i}]`, `a compare lays one length against another, and ${raw.join(", ")} names ${own.length} marks: drop it`, { remove: i });
      }
    }
    if (g.do === "reference") {
      const v = Number(g.value);
      if (!Number.isFinite(v)) throw new GestureRefusal(`gestures[${i}].value`, `a reference needs a number: the level of its rule`, { remove: i });
      if (variant === "population-pyramid" && v < 0)
        throw new GestureRefusal(`gestures[${i}].value`, `the pyramid's two halves are magnitudes from the spine: a rule at ${v} is not on its scale; write ${Math.abs(v)}`, { set: { index: i, field: "value", value: Math.abs(v) } });
      if (variant === "bullet" && ceiling !== undefined && v > ceiling)
        throw new GestureRefusal(`gestures[${i}].value`, `the bullet's track ends at ${ceiling}: a rule at ${v} is off its scale`, { remove: i });
    }
  };
}

export const hooksFor = (variant, marks, opts) => ({ figures: pairedFigures(variant, marks), refuse: pairedRefuse(variant, marks, opts) });

// ── states: one picture as a flat record, folded gesture by gesture ─────────────────────────────────

/**
 * A state: { order: [keys], emphasis: { mark: "accent" | "ring" }, stepBack: [keys], notes: [{ index, do, marks, text }],
 * copies: [{ index, onto, value, of }], brackets: [{ index, marks, keys, sum, whole, note }], references: [{ index,
 * value, note }], revealed: number of keys shown (Infinity: all) }.
 */
export function restState(keys) {
  return { order: keys.map((k) => k.name ?? k), emphasis: {}, stepBack: [], notes: [], copies: [], brackets: [], references: [], revealed: Infinity };
}

const clone = (s) => ({ ...s, order: [...s.order], emphasis: { ...s.emphasis }, stepBack: [...s.stepBack], notes: [...s.notes], copies: [...s.copies], brackets: [...s.brackets], references: [...s.references] });

/** The marks a validated gesture acts on, split into its own and its `of` rows (validateGestures merged them). */
export const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/**
 * The state after one validated gesture (its END state). ctx = { marks, keys, series, variant, format(v) }.
 * Throws GestureRefusal for a conflict on one picture: two notes on one key, a second copy on one mark.
 */
export function foldGesture(state, g, i, ctx) {
  const s = clone(state);
  const byName = new Map(ctx.marks.map((m) => [m.name, m]));
  const { own, of } = splitMarks(g);
  const F = ctx.format ?? String;
  const keysOf = (names) => [...new Set(names.map((n) => byName.get(n)?.key).filter(Boolean))];
  const allMarks = ctx.marks.map((m) => m.name);
  const whole = ctx.marks.reduce((t, m) => t + m.value, 0);
  const sum = (names) => names.reduce((t, n) => t + (byName.get(n)?.value ?? 0), 0);
  const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
  const valueWords = (names) => {
    const ms = names.map((n) => byName.get(n)).filter(Boolean);
    const ks = keysOf(names);
    if (ks.length === 1 && ms.length === 2) return `${ks[0]} : ${ms[0].series} ${F(ms[0].value)}, ${ms[1].series} ${F(ms[1].value)}`;
    return ms.map((m) => `${m.name} ${F(m.value)}`).join(", ");
  };
  const addNote = (text, on, value = false) => {
    const k = keysOf(on);
    if (k.length === 1 && s.notes.some((n) => n.keys.length === 1 && n.keys[0] === k[0]))
      throw new GestureRefusal(`gestures[${i}].note`, `${k[0]} already carries a note, and two notes on one row collide: drop this note (the gesture stays)`, { set: { index: i, field: "note", value: undefined } });
    s.notes.push({ index: i, do: g.do, marks: on, keys: k, text, value });
  };
  switch (g.do) {
    case "highlight": {
      // One accent carries the subject: the first highlighted set takes it; a later highlight on other marks rings them.
      const taken = Object.values(s.emphasis).includes("accent");
      for (const m of own) if (s.emphasis[m] !== "accent") s.emphasis[m] = taken ? "ring" : "accent";
      if (note) addNote(note, own);
      break;
    }
    case "name":
      for (const m of own) if (s.emphasis[m] !== "accent") s.emphasis[m] = "ring";
      addNote(note ?? valueWords(own), own, note === undefined);
      break;
    case "annotate":
      addNote(note ?? valueWords(own), own, note === undefined);
      break;
    case "compare": {
      const subject = own[0];
      if (s.copies.some((c) => c.onto === subject))
        throw new GestureRefusal(`gestures[${i}]`, `${subject} already carries a compare's copy: drop this compare`, { remove: i });
      const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? allMarks.filter((n) => n !== subject) : of;
      const value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
      s.copies.push({ index: i, onto: subject, value, of: against });
      if (note) addNote(note, [subject]);
      break;
    }
    case "reference":
      s.references.push({ index: i, value: Number(g.value), note });
      break;
    case "filter": {
      const kept = keysOf(own);
      s.stepBack = s.order.filter((k) => !kept.includes(k));
      if (note) s.notes.push({ index: i, do: g.do, marks: own, keys: kept, text: note });
      break;
    }
    case "reorder": {
      const valueAt = (k, j) => ctx.marks.find((m) => m.key === k && (m.j === j || ctx.marks.filter((x) => x.key === k).length === 1))?.value ?? -Infinity;
      const last = ctx.series.length - 1;
      const by = (dir) => [...s.order].sort((a, b) => (dir === "ascending" ? valueAt(a, last) - valueAt(b, last) : valueAt(b, last) - valueAt(a, last)));
      const firsts = keysOf(own);
      s.order = g.value === "ascending" || g.value === "descending" ? by(g.value) : firsts.length ? [...firsts, ...s.order.filter((k) => !firsts.includes(k))] : by("descending");
      break;
    }
    case "bracket": {
      const ofWhole = g.of === "whole" && keysOf(own).length === 1 && own.length <= 2;
      s.brackets.push({ index: i, marks: own, keys: keysOf(own), sum: sum(own), whole: ofWhole ? whole : null, note });
      break;
    }
    case "pull-back":
      s.stepBack = [];
      s.revealed = Infinity;
      if (note) s.notes.push({ index: i, do: g.do, marks: [], keys: [], text: note });
      break;
    default:
      // reveal: its end state is every key shown.
      s.revealed = Infinity;
      if (note) s.notes.push({ index: i, do: g.do, marks: [], keys: [], text: note });
  }
  return s;
}

/**
 * The first state: the takeaway's subject key in the accent before any gesture (doctrine's one accent; a highlight
 * moves it), so a list with no highlight never leaves every mark neutral.
 */
export function firstState({ keys, marks, gestures, claim }) {
  const s = restState(keys);
  const subject = subjectKey(claim ?? {}, keys) ?? marks.find((m) => gestures.some((g) => g.marks?.includes(m.name)))?.key;
  const highlighted = gestures.some((g) => g.do === "highlight");
  if (subject !== undefined && !highlighted) for (const m of marks) if (m.key === subject) s.emphasis[m.name] = "accent";
  return { state: s, subject };
}

/**
 * Every state of a list, in story order: [first, after gesture 0, after gesture 1, …]. The family's locks are held
 * over the whole sequence; a refusal names the gesture that broke one.
 */
export function foldAll({ gestures, keys, marks, series, variant, format, claim }) {
  const { state, subject } = firstState({ keys, marks, gestures, claim });
  const ctx = { marks, keys, series, variant, format };
  const states = [state];
  gestures.forEach((g, i) => states.push(foldGesture(states.at(-1), g, i, ctx)));
  invariants(states, { variant });
  return { states, subject };
}

/**
 * The family's locks (GRAMMAR §8): one scale for everything compared in every state (no state carries its own domain,
 * so a rescale cannot exist), the pyramid's bands in age order (`no-reorder-rows-claim`), and one accent: no state
 * spends the accent on marks of more than one key unless they are one whole series (a highlighted series).
 */
export function invariants(states, { variant }) {
  states.forEach((s, k) => {
    if (NATURAL_ORDER.has(variant) && s.order.some((key, i) => key !== states[0].order[i]))
      throw new GestureRefusal(`gestures[${k - 1}]`, `the pyramid's bands left their age order (no-reorder-rows-claim): drop it`, { remove: k - 1 });
  });
}

// ── geometry: where every mark is, in a frame, for a state ─────────────────────────────────────────

/**
 * The plot's geometry for a state, in frame px. Rows: one band per key, top to bottom in `state.order` (the pyramid
 * bottom to top: its first key is the foot).
 *
 * @param frame   { x, y, width, height, gutter? } the plot area (names outside it; the pyramid's spine gutter inside)
 * @param domain  [lo, hi] the one value scale (pyramid: [0, hi] for each half); computed by `domainOf` unless given
 * @returns { bands: Map key → { y, h }, marks: Map name → { x0, x1, y, h, tip: { x, y }, side, j }, zero: x | [xl, xr],
 *            xOf(v, side?) }
 */
export function layoutPaired({ variant, keys, marks, series, state, frame, domain }) {
  const order = state.order;
  const n = Math.max(order.length, 1);
  const pitch = frame.height / n;
  const [lo, hi] = domain ?? domainOf({ variant, marks, state });
  const bands = new Map();
  order.forEach((k, i) => {
    const slot = variant === "population-pyramid" ? n - 1 - i : i;
    bands.set(k, { y: frame.y + slot * pitch, h: pitch });
  });
  const pyramid = variant === "population-pyramid";
  const gutter = pyramid ? frame.gutter ?? 0 : 0;
  const half = (frame.width - gutter) / 2;
  const spineL = frame.x + half;
  const spineR = frame.x + half + gutter;
  const xOf = (v, side = 1) => {
    if (pyramid) return side < 0 ? spineL - (Math.abs(v) / (hi || 1)) * half : spineR + (Math.abs(v) / (hi || 1)) * half;
    return frame.x + ((v - lo) / (hi - lo || 1)) * frame.width;
  };
  const out = new Map();
  const inner = pitch * 0.78;
  for (const m of marks) {
    const b = bands.get(m.key);
    if (!b) continue;
    const top = b.y + (pitch - inner) / 2;
    let y = top;
    let h = inner;
    let side = 1;
    if (variant === "grouped-bar" || variant === "lollipop") {
      h = inner / 2;
      y = top + m.j * h;
    } else if (variant === "bullet") {
      // the comparative state thick, the measure a third of it, centred on it
      h = m.j === 0 ? inner * 0.72 : inner * 0.28;
      y = top + (inner - h) / 2;
    } else if (pyramid) {
      side = m.j === 0 ? -1 : 1;
      h = inner;
    }
    const a = pyramid ? (side < 0 ? spineL : spineR) : xOf(0);
    const t = xOf(m.value, side);
    const x0 = Math.min(a, t);
    const x1 = Math.max(a, t);
    out.set(m.name, { x0, x1, y, h, tip: { x: t, y: y + h / 2 }, base: a, side: pyramid ? side : m.value < 0 ? -1 : 1, j: m.j });
  }
  return { bands, marks: out, zero: pyramid ? [spineL, spineR] : xOf(0), xOf, pitch, domain: [lo, hi], half, spine: pyramid ? [spineL, spineR] : null };
}

/** The one value scale every state shares: every mark, every copy, every reference, the bullet's ceiling, zero. */
export function domainOf({ variant, marks, state, states, ceiling }) {
  const all = states ?? [state];
  const values = [0, ...marks.map((m) => m.value), ...all.flatMap((s) => [...(s?.copies ?? []).map((c) => c.value), ...(s?.references ?? []).map((r) => r.value)])];
  if (variant === "population-pyramid") return [0, Math.max(...values.map(Math.abs)) || 1];
  if (variant === "bullet") return [Math.min(...values), Math.max(ceiling ?? -Infinity, ...values) || 1];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return [lo, hi > lo ? hi : lo + 1];
}

/**
 * The keys a frame draws when it cannot hold them all: every key a gesture acts on, then the extremes of the order
 * from both ends (a diverging plate keeps its rise and its largest falls); the pyramid keeps every band (its order is
 * its reading). The rest is stated by the plate, never silently dropped.
 */
export function keysToDraw({ variant, order, keep, capacity }) {
  if (NATURAL_ORDER.has(variant) || order.length <= capacity) return order;
  const kept = new Set(keep.filter((k) => order.includes(k)));
  for (let a = 0, b = order.length - 1; kept.size < Math.max(capacity, kept.size) && a <= b; a++, b--) {
    if (kept.size < capacity) kept.add(order[a]);
    if (kept.size < capacity) kept.add(order[b]);
  }
  return order.filter((k) => kept.has(k));
}

/** The tones a variant draws its two series in: [first, second] as a mix weight toward the ink (1 = full). */
export const SERIES_TONE = {
  lollipop: [0.45, 1],
  "grouped-bar": [1, 0.5],
  bullet: [0.38, 1],
  "diverging-bar": [1],
  "population-pyramid": [1, 1],
};

// ── the core, for this family ──────────────────────────────────────────────────────────────────────

/**
 * validateGestures for a paired beat: the family id, its hooks, and the claim resolved over keys and series. Every
 * format's runner calls this, then its own scheduler. `repair` applies each refusal's fix to the model's own list
 * (at most `steps` times) and returns every repair; the composition stays the model's.
 */
export function stagePaired({ gestures, variant, rows, series, format, claim, ceiling, then = (x) => x, repair = false, steps = 12, validateGestures }) {
  const { keys, marks, series: names } = marksOf({ rows, series, variant });
  const resolved = pairedClaim(claim, marks);
  const hooks = hooksFor(variant, marks, { ceiling });
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const out = validateGestures({ gestures: list, rows: marks, family: FAMILY, format, claim: resolved, hooks });
      const staged = then({ ...out, keys, marks, series: names, claim: resolved });
      return { list, staged, repairs, keys, marks, series: names, claim: resolved };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFixLocal(list, error.fix);
    }
  }
}

function applyFixLocal(list, fix) {
  const next = structuredClone(list);
  if ("remove" in fix) next.splice(fix.remove, 1);
  else if ("set" in fix) next[fix.set.index] = fix.set.field ? { ...next[fix.set.index], [fix.set.field]: fix.set.value } : fix.set.value;
  else if ("add" in fix) next.splice(fix.add.at, 0, fix.add.gesture);
  return next;
}

/**
 * The readings a paired plate draws beyond its marks' values, for the headline guard (assertHeadlineNumbersDrawn): each
 * key's change, the ratio between any two marks of one series or one key ("1,7 fois plus"), and the counts of keys
 * each series leads ("5 de ces 6"). A takeaway's figure among these is drawn by a pair, not invented.
 */
export function pairedReadings(keys) {
  const out = [keys.length];
  const full = keys.filter((k) => k.values.length === 2 && k.values.every((v) => v !== null));
  for (const k of full) {
    const [a, b] = k.values;
    out.push(b - a, a - b);
    if (a) out.push(b / a);
    if (b) out.push(a / b);
  }
  const width = Math.max(...keys.map((k) => k.values.length));
  for (let j = 0; j < width; j++)
    for (const x of keys)
      for (const y of keys) if (x !== y && x.values[j] && y.values[j]) out.push(x.values[j] / y.values[j]);
  if (width === 2) {
    const leads = full.filter((k) => k.values[0] > k.values[1]).length;
    out.push(leads, full.length - leads);
  }
  return out.filter(Number.isFinite);
}

/**
 * The gestures one type of the family admits, for its contract's table (src/craft-kit.ts contractText): a bracket
 * only where values add up (the pyramid), a reorder only where the keys have no natural order (not the pyramid).
 * The same rules hooks.refuse holds at render, so the contract never lists a gesture the render would drop.
 */
export function gesturesOf(slug) {
  if (!VARIANTS.includes(slug)) return undefined;
  return GESTURES.filter((d) => (d !== "bracket" || ADDITIVE.has(slug)) && (d !== "reorder" || !NATURAL_ORDER.has(slug)));
}
