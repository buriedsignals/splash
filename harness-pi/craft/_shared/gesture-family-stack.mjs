// The Stack family adapter (craft/gestures/GRAMMAR.md §4, F2): segments [from, to] on a floating baseline, the
// whole of a bar is the sum of its parts. Three types draw it, each an anchor mode:
//   stacked-bar                    zero     parts stack outward from one zero (negatives stack the other way)
//   diverging-stacked-bar-likert   centre   left parts run left of the centre, right parts right, a neutral part
//                                           straddles it
//   waterfall-bridge               running  an opening level, steps that float on the running level, a closing
//                                           level that is their sum (conservation)
// One MARK per bar × part (key = bar, series = part) for the gesture core; a waterfall step is a bar with one part.
// It answers where segments are in a given state and folds a validated gesture into a state; the format schedulers
// decide when each state shows. Browser-safe (the video bundle and the scrolly drive import it): no Node module.
import { FAMILIES } from "./gesture-registry.mjs";
import { GestureRefusal, validateGestures } from "./gesture-core.mjs";

/** The gestures every Stack kit draws in all four formats (GRAMMAR §6 column F2, minus zoom, rescale and trace). */
export const STACK_GESTURES = ["highlight", "name", "annotate", "bracket", "compare", "filter", "reference", "reorder", "count", "reveal", "pull-back"];

FAMILIES.stack ??= { gestures: STACK_GESTURES, additive: true };

export const VARIANTS = ["stacked-bar", "diverging-stacked-bar-likert", "waterfall-bridge"];
const MODE = { "stacked-bar": "zero", "diverging-stacked-bar-likert": "centre", "waterfall-bridge": "running" };

export const SEP = " · ";
const fold = (s) => String(s ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const words = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
const namedIn = (text, name) => words(text).includes(words(name));

/**
 * The family's model from a beat's fields, whatever the variant:
 *   stacked-bar   rows: [{ name, parts: { [part]: value } }], parts: [part, …] (the locked order, from the zero)
 *   likert        rows: [{ name, parts: { … } }], left: [part, …] and right: [part, …] (each outward from the
 *                 centre), centre: part (optional, the neutral that straddles the axis)
 *   waterfall     opening: { name, value }, steps: [{ name, value }], closing: { name, value? }
 * A missing part is a zero-width segment, never a refusal: the stack adapts to gaps.
 */
export function stackFromBeat(beat, variant) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of ${VARIANTS.join(", ")}, not "${variant}"`);
  if (variant === "waterfall-bridge") {
    const opening = beat.opening;
    const steps = beat.steps ?? [];
    if (!opening || typeof opening.name !== "string") throw new Error("beat.mjs needs opening: { name, value } — the level the bridge starts from (see CONTRACT.md)");
    if (!Array.isArray(steps) || !steps.length) throw new Error("beat.mjs needs steps: [{ name, value }, …] — each change between the opening and the closing level, in story order (see CONTRACT.md)");
    const closing = beat.closing ?? { name: "Total" };
    return createStack({
      variant,
      bars: [{ name: opening.name, parts: { [opening.name]: Number(opening.value) } }, ...steps.map((s) => ({ name: s.name, parts: { [s.name]: Number(s.value) } }))],
      parts: [opening.name, ...steps.map((s) => s.name)],
      closing: { name: closing.name, value: closing.value === undefined ? undefined : Number(closing.value) },
    });
  }
  const rows = beat.rows ?? [];
  if (!Array.isArray(rows) || !rows.length) throw new Error("beat.mjs needs rows: [{ name, parts: { … } }, …] — one per bar (see CONTRACT.md)");
  let parts = beat.parts;
  let left = [];
  let right = [];
  let centre = null;
  if (variant === "diverging-stacked-bar-likert") {
    left = beat.left ?? [];
    right = beat.right ?? [];
    centre = beat.centre ?? null;
    // Drawn left to right: the left side's outermost first, the neutral, then the right side outward.
    parts = [...[...left].reverse(), ...(centre ? [centre] : []), ...right];
  }
  // No parts list given: the parts in the order the first row holds them.
  if (!Array.isArray(parts) || !parts.length) parts = [...new Set(rows.flatMap((r) => Object.keys(r.parts ?? {})))];
  return createStack({
    variant,
    bars: rows.map((r) => ({ name: String(r.name), parts: Object.fromEntries(parts.map((p) => [p, Number(r.parts?.[p] ?? 0) || 0])) })),
    parts,
    left,
    right,
    centre,
  });
}

export function createStack({ variant, bars, parts, left = [], right = [], centre = null, closing = null }) {
  const mode = MODE[variant];
  const running = mode === "running";
  const names = bars.map((b) => b.name);
  const valueOf = (bar, part) => bars.find((b) => b.name === bar)?.parts[part] ?? 0;
  const markName = (bar, part) => (running ? bar : `${bar}${SEP}${part}`);
  const partsOf = (bar) => (running ? [bar] : parts);
  const marks = bars.flatMap((b) => partsOf(b.name).map((p) => ({ name: markName(b.name, p), value: b.parts[p], key: b.name, ...(running ? {} : { series: p }) })));
  const markOf = new Map(marks.map((m) => [m.name, m]));
  const barOf = (mark) => markOf.get(mark)?.key;
  const partOf = (mark) => (running ? markOf.get(mark)?.key : markOf.get(mark)?.series);

  const whole = (bar) => partsOf(bar).reduce((s, p) => s + valueOf(bar, p), 0);
  const openingValue = running ? whole(names[0]) : 0;
  const closingValue = running ? marks.reduce((s, m) => s + m.value, 0) : null;
  const sideOf = (part) => (part === centre ? "centre" : left.includes(part) ? "left" : right.includes(part) ? "right" : null);
  const sideTotal = (bar, side) => parts.filter((p) => sideOf(p) === side).reduce((s, p) => s + valueOf(bar, p), 0);

  /** Every segment of every bar in value units, [from, to] with from <= to. */
  const geometry = new Map();
  if (mode === "zero")
    for (const b of names) {
      let up = 0;
      let down = 0;
      for (const p of parts) {
        const v = valueOf(b, p);
        if (v >= 0) geometry.set(markName(b, p), [up, (up += v)]);
        else geometry.set(markName(b, p), [(down += v), down - v]);
      }
    }
  if (mode === "centre")
    for (const b of names) {
      const c = centre ? valueOf(b, centre) : 0;
      if (centre) geometry.set(markName(b, centre), [-c / 2, c / 2]);
      let at = -c / 2;
      for (const p of left) {
        const v = Math.abs(valueOf(b, p));
        geometry.set(markName(b, p), [at - v, at]);
        at -= v;
      }
      at = c / 2;
      for (const p of right) {
        const v = Math.abs(valueOf(b, p));
        geometry.set(markName(b, p), [at, at + v]);
        at += v;
      }
    }
  if (running) {
    let level = 0;
    names.forEach((b, i) => {
      const v = valueOf(b, b);
      if (i === 0) {
        geometry.set(b, [Math.min(0, v), Math.max(0, v)]);
        level = v;
      } else {
        geometry.set(b, [Math.min(level, level + v), Math.max(level, level + v)]);
        level += v;
      }
    });
  }
  const segment = (bar, part) => geometry.get(markName(bar, part));
  const extentOf = (segs) => {
    const spans = segs.map((m) => geometry.get(m)).filter(Boolean);
    return spans.length ? [Math.min(...spans.map((s) => s[0])), Math.max(...spans.map((s) => s[1]))] : [0, 0];
  };
  /** The running level after a step (waterfall): where the next step starts. */
  const levelAfter = (bar) => {
    const i = names.indexOf(bar);
    return names.slice(0, i + 1).reduce((s, b) => s + valueOf(b, b), 0);
  };

  /** The value axis every state shares (no-move-shared-zero, no-move-shared-centre: never rescaled by a gesture). */
  const domain = (() => {
    const all = [...geometry.values()].flat();
    const lo = Math.min(0, ...all, ...(running ? [closingValue] : []));
    const hi = Math.max(0, ...all, ...(running ? [closingValue] : []));
    if (mode === "centre") {
      const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
      return [-m, m];
    }
    return [lo, hi || 1];
  })();

  /** What names a unit: a mark, a bar (its parts), a part (in every bar). Null when the name is none of them. */
  function expand(name) {
    if (typeof name !== "string") return null;
    if (markOf.has(name)) return [name];
    const f = fold(name);
    const mark = marks.find((m) => fold(m.name) === f);
    if (mark) return [mark.name];
    const bar = names.find((b) => fold(b) === f);
    if (bar) return partsOf(bar).map((p) => markName(bar, p));
    const part = parts.find((p) => fold(p) === f);
    if (part && !running) return names.map((b) => markName(b, part));
    return null;
  }

  /** A resolved set of marks, said as the bars and parts it covers. */
  function unit(segs) {
    const barsIn = [...new Set(segs.map(barOf))].filter((b) => b !== undefined);
    const wholeBars = barsIn.filter((b) => partsOf(b).every((p) => segs.includes(markName(b, p))));
    return { segs, bars: barsIn, wholeBars, value: segs.reduce((s, m) => s + (markOf.get(m)?.value ?? 0), 0), extent: extentOf(segs) };
  }

  // ── states ──────────────────────────────────────────────────────────────────────────────────────
  // A state is a flat record: the order of bars, the emphasis roles, the gestures' drawn objects and the reveal
  // progress (0..1, parts in their locked order). The value axis is not in it: the family never rescales.
  const rest = () => ({
    order: [...names],
    accent: [],
    rings: [],
    stepBack: [],
    notes: [],
    brackets: [],
    copies: [],
    references: [],
    count: null,
    reveal: 1,
  });

  /**
   * One validated gesture folded into a state (the gesture as validateStack returns it: marks resolved to
   * segments, `of` split out). `format` prints a value the way the plate does, for a note the model did not write.
   */
  function apply(state, g, { index = 0, format = String, subject = null } = {}) {
    const s = structuredClone(state);
    const ofSegs = Array.isArray(g.of) ? g.of : [];
    const ownSegs = g.marks.slice(0, g.marks.length - ofSegs.length);
    const own = unit(ownSegs);
    const note = g.note === undefined ? undefined : String(g.note);
    const add = (list, item) => {
      if (!list.includes(item)) list.push(item);
    };
    switch (g.do) {
      case "highlight":
        // The subject bar carries the accent; a highlight on another bar, or on a part, rings it.
        for (const b of own.wholeBars) (b === subject || !subject ? add(s.accent, b) : add(s.rings, b));
        if (!own.wholeBars.length) ownSegs.forEach((m) => add(s.rings, m));
        if (note !== undefined) s.notes.push({ index, do: g.do, anchor: "mark", segs: ownSegs, bars: own.bars, text: note });
        break;
      case "name": {
        const ring = own.wholeBars.length === 1 && own.bars.length === 1 ? own.bars[0] : ownSegs.length === 1 ? ownSegs[0] : null;
        if (ring) add(s.rings, ring);
        else ownSegs.forEach((m) => add(s.rings, m));
        const label = own.wholeBars.length === 1 && own.bars.length === 1 ? own.bars[0] : ownSegs.length === 1 ? ownSegs[0] : own.bars.join(", ");
        s.notes.push({ index, do: g.do, anchor: "mark", segs: ownSegs, bars: own.bars, text: note ?? `${label} ${format(own.value)}`, value: note === undefined });
        break;
      }
      case "annotate":
        s.notes.push({ index, do: g.do, anchor: "mark", segs: ownSegs, bars: own.bars, text: note?.trim() ? note : format(own.value), value: !note?.trim() });
        break;
      case "filter":
        s.stepBack = s.order.filter((b) => !own.bars.includes(b));
        if (note !== undefined) s.notes.push({ index, do: g.do, anchor: "span", segs: ownSegs, bars: own.bars, text: note });
        break;
      case "bracket": {
        // One unit of the whole: within one bar, the bar's own whole (the whole is the sum of the stack); across
        // bars, every bar.
        const ofWhole = g.of === "whole";
        const inOneBar = own.bars.length === 1;
        const span = ofWhole ? (inOneBar && !running ? partsOf(own.bars[0]).map((p) => markName(own.bars[0], p)) : marks.map((m) => m.name)) : ownSegs;
        s.brackets.push({ index, segs: ownSegs, span, bars: unit(span).bars, whole: ofWhole, value: own.value, note });
        break;
      }
      case "compare": {
        const other = ofSegs.length ? unit(ofSegs) : g.of === "whole" ? unit(marks.map((m) => m.name).filter((m) => !ownSegs.includes(m))) : null;
        // The subject is the first unit the compare names; validateStack recorded where it ends.
        const subjectSegs = g.subjectSegs ?? [ownSegs[0]];
        const others = g.subjectSegs ? ownSegs.filter((m) => !subjectSegs.includes(m)) : ownSegs.slice(1);
        const against = other ?? unit(others);
        const subj = unit(subjectSegs);
        // A copy of the compared length, laid from where the subject starts: its end against the subject's end.
        const start = subj.extent[0];
        s.copies.push({ index, onto: subjectSegs, bars: subj.bars, of: against.segs, from: start, to: start + Math.abs(against.value), value: against.value, subjectValue: subj.value });
        if (note !== undefined) s.notes.push({ index, do: g.do, anchor: "mark", segs: subjectSegs, bars: subj.bars, text: note });
        break;
      }
      case "reference":
        s.references.push({ index, value: Number(g.value), note });
        break;
      case "reorder": {
        const how = g.value;
        const ids = ownSegs.length ? [...new Set(ownSegs.map(barOf))] : [];
        if (how === "ascending" || how === "descending" || !ids.length)
          s.order = [...s.order].sort((a, b) => (how === "ascending" ? whole(a) - whole(b) : whole(b) - whole(a)));
        else s.order = [...ids, ...s.order.filter((b) => !ids.includes(b))];
        break;
      }
      case "count": {
        const on = ownSegs.length ? ownSegs : marks.map((m) => m.name);
        const value = on.reduce((t, m) => t + (markOf.get(m)?.value ?? 0), 0);
        s.count = { index, segs: on, value, text: note ?? format(value), value_: note === undefined };
        break;
      }
      case "reveal":
        s.reveal = 1;
        if (note !== undefined) s.notes.push({ index, do: g.do, anchor: "span", segs: [], bars: [], text: note });
        break;
      case "pull-back":
        s.stepBack = [];
        if (note !== undefined) s.notes.push({ index, do: g.do, anchor: "span", segs: [], bars: [], text: note });
        break;
      default:
        throw new Error(`no ${g.do} on the Stack family`);
    }
    return s;
  }

  /** How much of a segment is drawn at a reveal progress (parts appear in their locked order, a step at a time). */
  function shownOf(mark, reveal) {
    const order = running ? names : parts;
    const at = order.indexOf(partOf(mark));
    const n = order.length;
    return Math.max(0, Math.min(1, reveal * n - at));
  }

  /**
   * The family's locks over a sequence of states: the order of parts never changes (no-change-segment-order),
   * every state stands on one value axis (no-move-shared-zero, no-move-shared-centre — the family has no rescale),
   * a waterfall's steps keep their story order (no-re-anchor-redrawing), and its closing level is the sum
   * (conservation).
   */
  function invariants(states) {
    states.forEach((s, i) => {
      if (running && s.order.join("\u0000") !== names.join("\u0000"))
        throw new Error(`state ${i} moves a bridge's steps out of their story order (no-re-anchor-redrawing)`);
    });
    conservation();
  }

  /** A bridge adds up: the opening plus every step is the closing level the data gives. */
  function conservation() {
    if (!running || closing?.value === undefined || !Number.isFinite(closing.value)) return true;
    const gap = closing.value - closingValue;
    if (Math.abs(gap) > Math.max(1e-6, Math.abs(closing.value) * 1e-3))
      // Not a gesture refusal: the beat's steps are false, and no gesture list repairs them.
      throw new Error(
        `steps: the opening (${openingValue}) plus the steps (${(closingValue - openingValue).toFixed(2)}) give ${closingValue.toFixed(2)}, but closing.value is ${closing.value}: a bridge must add up — add the missing change as a step of ${gap.toFixed(2)} (computed from data.json), or leave closing.value out and the closing level is drawn as the sum`,
      );
    return true;
  }

  function derive(op, ids) {
    const v = ids.map((m) => markOf.get(m)?.value ?? whole(m));
    switch (op) {
      case "sum":
        return v.reduce((t, x) => t + x, 0);
      case "diff":
        return v[0] - v[1];
      case "ratio":
        return v[0] / v[1];
      case "share":
        return v.reduce((t, x) => t + x, 0) / marks.reduce((t, m) => t + m.value, 0);
      case "count":
        return ids.length;
      case "whole":
        return whole(ids[0]);
      default:
        throw new Error(`no ${op} on the Stack family`);
    }
  }

  return {
    family: "stack",
    variant,
    anchorMode: mode,
    names,
    parts,
    partOrder: Object.freeze([...parts]),
    left,
    right,
    centre,
    marks,
    markName,
    barOf,
    partOf,
    partsOf,
    valueOf,
    segment,
    geometry,
    whole,
    sideOf,
    sideTotal,
    levelAfter,
    opening: running ? { name: names[0], value: openingValue } : null,
    closing: running ? { name: closing?.name ?? "Total", value: closingValue } : null,
    domain,
    expand,
    unit,
    rest,
    apply,
    shownOf,
    invariants,
    conservation,
    derive,
  };
}

// ── validation: the core on the family's marks, with the family's own figures and refusals ────────────────────

const RANK = [
  [/(?<![\p{L}])(highest|largest|biggest|greatest|most|top|first|le plus|la plus|premier|première|najwięcej|największ\p{L}*)(?![\p{L}])/iu, (r) => r === 1, "the highest"],
  [/(?<![\p{L}])(lowest|smallest|least|fewest|bottom|last|le moins|la moins|dernier|dernière|najmniej|najmniejsz\p{L}*)(?![\p{L}])/iu, (r, n) => r === n, "the lowest"],
];

/** The family's hooks for validateGestures: the figures a stack draws beyond each mark's value, and its refusals. */
export function stackHooks(stack) {
  const { marks, unit, whole, names, variant } = stack;
  const running = stack.anchorMode === "running";
  return {
    figures(g, ctx) {
      const ofSegs = ctx.of ?? [];
      const ownSegs = ctx.marks;
      const own = unit(ownSegs);
      const out = [];
      // Every bar a gesture touches prints its total at its end; a stack gives back the whole it hides.
      for (const b of own.bars) out.push(whole(b));
      // The touched segments added up, per bar and across bars (a part's total over the bars it spans).
      for (const b of own.bars) out.push(unit(ownSegs.filter((m) => stack.barOf(m) === b)).value);
      out.push(own.value, Math.abs(own.value));
      // A segment's share of its own bar: on a stack the bar is the whole.
      for (const m of ownSegs) {
        const b = stack.barOf(m);
        const w = whole(b);
        if (w) out.push((stack.marks.find((x) => x.name === m).value / w) * 100);
      }
      if (own.bars.length === 1 && whole(own.bars[0])) out.push((own.value / whole(own.bars[0])) * 100);
      if (variant === "diverging-stacked-bar-likert")
        for (const b of own.bars) out.push(stack.sideTotal(b, "left"), stack.sideTotal(b, "right"), stack.sideTotal(b, "left") + stack.sideTotal(b, "right"));
      if (running) {
        // The running level after the touched steps, the closing level and the net change it states.
        for (const b of own.bars) out.push(stack.levelAfter(b));
        // The closing level and the net change belong to the gestures that span the bridge, not to a note on one step.
        if (["bracket", "count", "reveal", "pull-back"].includes(g.do) || own.bars.length > 1)
          out.push(stack.closing.value, stack.closing.value - stack.opening.value, Math.abs(stack.closing.value - stack.opening.value));
      }
      if (ofSegs.length) out.push(unit(ofSegs).value, Math.abs(unit(ofSegs).value));
      return out;
    },
    refuse(g, ctx) {
      const own = unit(ctx.marks.slice(0, ctx.marks.length - (ctx.of?.length ?? 0)));
      // A bridge tells its steps in their order: moving them breaks the running level (no-re-anchor-redrawing).
      if (g.do === "reorder" && running)
        throw new GestureRefusal(`gestures[${ctx.index}]`, `a bridge's steps float on the running level in story order; reordering them redraws every step (no-re-anchor-redrawing): drop it`, { remove: ctx.index });
      // Rows may move, parts may not (no-change-segment-order): a reorder names bars, never parts.
      if (g.do === "reorder" && ctx.marks.length && own.wholeBars.length !== own.bars.length)
        throw new GestureRefusal(`gestures[${ctx.index}]`, `the order of a stack's parts is locked (no-change-segment-order); a reorder moves whole bars: drop it, or give value: "descending"`, {
          set: { index: ctx.index, value: { do: "reorder", value: "descending" } },
        });
      // A bridge step's share of the closing level is no reading of a bridge: its run with other steps is.
      if (g.do === "bracket" && running && g.of === "whole" && own.segs.length === 1)
        throw new GestureRefusal(`gestures[${ctx.index}]`, `a bridge step against the whole is no reading (the closing level is not made of that step); bracket a run of steps (their net change) instead, or drop it`, { remove: ctx.index });
      // A rank word on one bar is its rank by total, not by any one segment.
      if (["name", "annotate", "highlight"].includes(g.do) && g.note !== undefined && own.wholeBars.length === 1 && own.bars.length === 1 && !running) {
        const ranked = [...names].sort((a, b) => whole(b) - whole(a));
        const rank = ranked.indexOf(own.bars[0]) + 1;
        for (const [word, holds, said] of RANK) {
          if (!word.test(g.note) || holds(rank, names.length)) continue;
          const actual = said === "the highest" ? ranked[0] : ranked.at(-1);
          throw new GestureRefusal(`gestures[${ctx.index}].note`, `calls ${own.bars[0]} ${said}, but its total ranks ${rank} of ${names.length} and ${actual} is ${said}: drop the word, or write the note on ${actual}`, {
            set: { index: ctx.index, field: "note", value: g.note.replace(word, "").replace(/\s{2,}/g, " ").trim() },
          });
        }
      }
    },
  };
}

/** The claim as the core reads it on segment marks: the bars (or parts) the journalist named, said as their marks. */
export function stackClaim(stack, claim = {}) {
  const text = [claim.takeaway, claim.subject, claim.comparison, claim.entity, claim.versus].filter(Boolean).join(" ");
  // A bridge's opening is a level label (a year the takeaway says as "since 2015"), not the claim's subject.
  const bars = stack.names.filter((b, i) => namedIn(text, b) && !(stack.anchorMode === "running" && i === 0));
  const parts = stack.anchorMode === "running" ? [] : stack.parts.filter((p) => namedIn(text, p));
  const entityBar = [claim.entity, claim.takeaway].map((t) => stack.names.find((b, i) => namedIn(t ?? "", b) && !(stack.anchorMode === "running" && i === 0))).find(Boolean) ?? bars[0] ?? null;
  const facts = { ...(claim.facts ?? {}) };
  for (const m of stack.marks) facts[m.name] ??= claim.facts?.[m.key] ?? [];
  // The core makes a named bar (a mark's key) or part (its series) the claim's entities. A takeaway that names no
  // bar and no part is about the whole chart (a bridge's net change): every bar serves it, said here by name.
  const whole = !bars.length && !parts.length;
  return {
    claim: {
      ...claim,
      entity: entityBar ?? (whole ? stack.names.join(" ; ") : claim.entity),
      versus: whole ? stack.names.join(" ; ") : claim.versus,
      facts,
    },
    subject: stack.anchorMode === "running" ? null : entityBar,
  };
}

const remap = (error, i) => {
  if (!(error instanceof GestureRefusal)) return error;
  const field = error.field.replace(/^gestures\[0\]/, `gestures[${i}]`).replace(/^gestures$/, `gestures[${i}]`);
  const fix = structuredClone(error.fix);
  if ("remove" in fix) fix.remove = i;
  if ("set" in fix) fix.set.index = i;
  if ("add" in fix) fix.add.at = i;
  return new GestureRefusal(field, error.message.slice(error.field.length + 2), fix);
};

/**
 * The gesture core on a stack: names expand to the family's units (a bar is its segments, a part is its segments
 * in every bar), the takeaway's bars become entities, and every compare has its note checked on the two lengths it
 * lays side by side (its subject unit and what it is compared with) — the core alone would read a whole-bar subject
 * as its first segment, and would not take a percent figure that is a sum of shares. Returns what validateGestures returns, each compare carrying `subjectSegs`.
 */
export function validateStack({ gestures, stack, format, claim }) {
  const { claim: segClaim, subject } = stackClaim(stack, claim);
  if (!Array.isArray(gestures)) return validateGestures({ gestures, rows: stack.marks, family: "stack", format, claim: segClaim, hooks: stackHooks(stack) });
  stack.conservation();
  // A gesture on a bridge's closing level names the sum of every mark: that is what a count draws.
  if (stack.anchorMode === "running")
    gestures.forEach((g, i) => {
      const names = [g?.mark, ...[g?.marks ?? []].flat()].filter((n) => typeof n === "string");
      if (names.some((n) => fold(n) === fold(stack.closing.name)) && g.do !== "count")
        throw new GestureRefusal(`gestures[${i}]`, `${stack.closing.name} is the closing level, drawn as the sum of the opening and every step; a count over every mark prints it`, {
          set: { index: i, value: { do: "count", ...(g.note !== undefined ? { note: g.note } : {}) } },
        });
      if (names.some((n) => fold(n) === fold(stack.closing.name)) && g.do === "count")
        throw new GestureRefusal(`gestures[${i}].mark`, `a count with no mark counts every mark, whose sum is ${stack.closing.name}: drop the mark`, {
          set: { index: i, value: Object.fromEntries(Object.entries(g).filter(([k]) => k !== "mark" && k !== "marks")) },
        });
    });
  const subjects = [];
  const ofBar = [];
  const masked = gestures.map((g, i) => {
    // A bracket of the whole inside one bar measures against that bar (the whole is the sum of its stack): the core
    // is handed the bar's other segments as `of`, so the share it checks is the share of the bar.
    if (g?.do === "bracket" && g.of === "whole" && stack.anchorMode !== "running") {
      const own = [g.mark, ...[g.marks ?? []].flat()].filter((n) => n !== undefined).flatMap((n) => stack.expand(n) ?? []);
      const bars = [...new Set(own.map(stack.barOf))];
      if (own.length && bars.length === 1) {
        const others = stack.partsOf(bars[0]).map((p) => stack.markName(bars[0], p)).filter((m) => !own.includes(m));
        if (others.length) {
          ofBar[i] = own.length;
          const { mark, ...bare } = g;
          return { ...bare, marks: own, of: others };
        }
      }
    }
    if (g?.do !== "compare") return g;
    const given = [g.mark, ...[g.marks ?? []].flat()].filter((n) => n !== undefined);
    const first = stack.expand(given[0]);
    if (!first) return g;
    // The whole-bar subject: check the note on the two lengths, then hand the core a compare without the note.
    const restNames = given.slice(1);
    const rest = restNames.flatMap((n) => stack.expand(n) ?? []);
    const ofList = Array.isArray(g.of) ? g.of.flatMap((n) => stack.expand(n) ?? []) : typeof g.of === "string" && g.of !== "whole" ? stack.expand(g.of) ?? [] : [];
    const other = g.of === "whole" ? stack.marks.map((m) => m.name).filter((m) => !first.includes(m)) : [...rest, ...ofList];
    subjects[i] = first;
    if (g.note !== undefined && other.length) {
      const subjName = String(given[0]);
      const otherName = restNames.length === 1 ? String(restNames[0]) : g.of === "whole" ? "the rest" : [...restNames, ...[g.of ?? []].flat()].join(", ") || "the rest";
      const a = stack.unit(first).value;
      const b = stack.unit(other).value;
      try {
        validateGestures({
          gestures: [{ do: "compare", marks: [subjName, otherName], note: g.note }],
          rows: [{ name: subjName, value: a }, { name: otherName, value: b }],
          family: "stack",
          format: "static",
          claim: { takeaway: claim.takeaway, entity: subjName, facts: {} },
        });
      } catch (error) {
        throw remap(error, i);
      }
    }
    const { note, ...bare } = g;
    return { ...bare, marks: [first[0], ...other.filter((m) => !first.includes(m))], mark: undefined, of: undefined };
  });
  // Shares drawn in percent (a Likert's rows each make 100): a "%" in a note is the drawn unit, so the core reads
  // the figure as a value of the marks (a sum, a side total), not only as a gap.
  const percentUnit = /%|per ?cent|pour ?cent|procent/i.test(String(claim.unit ?? ""));
  const unpercent = (g) => (percentUnit && g && typeof g.note === "string" ? { ...g, note: g.note.replace(/\s?(%|per ?cent|pour ?cent|procent)/gi, "") } : g);
  const clean = (g) => (g && g.mark === undefined ? Object.fromEntries(Object.entries(g).filter(([, v]) => v !== undefined)) : g);
  let result;
  try {
    result = validateGestures({ gestures: masked.map(clean).map(unpercent), rows: stack.marks, family: "stack", format, claim: segClaim, hooks: stackHooks(stack) });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    // The core lists marks; a refusal read by the model says a whole bar by its name.
    let message = error.message.slice(error.field.length + 2);
    for (const b of stack.names) {
      const segs = stack.partsOf(b).map((p) => stack.markName(b, p));
      for (const run of [segs, segs.filter((m) => !/[^\p{L}\p{N}]$/u.test(m))]) if (run.length > 1) message = message.split(run.join(", ")).join(b);
    }
    throw new GestureRefusal(error.field, message, error.fix);
  }
  // The notes as the beat wrote them.
  result.gestures = result.gestures.map((g, i) => (gestures[i]?.note !== undefined && g.note !== undefined ? { ...g, note: gestures[i].note } : g));
  result.gestures = result.gestures.map((g, i) => {
    if (ofBar[i] !== undefined) {
      const { of, ...bare } = g;
      return { ...bare, marks: g.marks.slice(0, ofBar[i]), of: "whole", ofBar: true };
    }
    if (!subjects[i]) return g;
    const original = gestures[i];
    const other = g.marks.slice(1);
    return { ...g, marks: [...subjects[i], ...other], subjectSegs: subjects[i], ...(original.note !== undefined ? { note: original.note } : {}) };
  });
  result.subject = subject;
  return result;
}

/**
 * Fold a validated list into states, one per gesture after the rest state, and hold the family's locks.
 * @param {any} stack
 * @param {any[]} gestures
 * @param {{ format?: (v: number) => string, subject?: string | null }} [options]
 * @returns {any[]}
 */
export function foldStack(stack, gestures, { format = String, subject = null } = {}) {
  // The rest state is the neutral chart; the subject takes the accent with the first gesture (implicitAccent), so a
  // highlight on the subject is a change and every gesture's state differs from the one before.
  let state = stack.rest();
  const states = [state];
  gestures.forEach((g, index) => {
    if (index === 0 && subject && !state.accent.includes(subject)) state = { ...state, accent: [subject] };
    state = stack.apply(state, g, { index, format, subject });
    states.push(state);
  });
  for (let k = 1; k < states.length; k++)
    try {
      stack.invariants(states.slice(0, k + 1));
    } catch (error) {
      if (error instanceof GestureRefusal) throw error;
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }
  return states;
}
