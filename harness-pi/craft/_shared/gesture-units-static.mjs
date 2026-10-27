// The Units static scheduler (craft/gestures/GRAMMAR.md §5): every gesture's state composed onto ONE plate, in story
// order, the family's locks held over the states (gesture-family-units.mjs `createUnits`). A temporal gesture
// (reveal, count, pull-back) draws its end state: every unit in its group, a count's final figure. What the plate
// draws: the groups that take the accent (a block head), a ring, step back; the brackets (a run of groups, or one of
// the whole) with their sums; a compare's copy laid in its subject's band; the rules at edges; every note with the
// group it is written on. One note per group: the plate draws every gesture at once. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { createUnits, edgeOf, splitMarks } from "./gesture-family-units.mjs";

/**
 * @param gestures validateGestures' gestures (marks resolved; a reference's edge as `at`)
 * @param groups   the partition's groups, in drawing order
 * @returns        { accent, rings, stepBack, notes, captions, brackets, copies, references }
 */
export function composeUnitsStatic({ gestures, groups }) {
  const units = createUnits({ groups });
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const all = groups.map((g) => g.name);
  const total = units.total;
  const sum = (names) => names.reduce((s, n) => s + (countOf.get(n) ?? 0), 0);
  let state = units.rest();
  const states = [state];
  const plate = { accent: [], rings: [], stepBack: [], notes: [], captions: [], brackets: [], copies: [], references: [] };
  const implicit = implicitAccent(gestures);
  if (countOf.has(implicit)) plate.accent.push(implicit);
  const noted = new Set();
  const copied = new Set();
  const oneNote = (group, i) => {
    if (noted.has(group))
      throw new GestureRefusal(`gestures[${i}].note`, `${group} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
        set: { index: i, field: "note", value: undefined },
      });
    noted.add(group);
  };

  gestures.forEach((g, i) => {
    const { own, of } = splitMarks(g);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    switch (g.do) {
      case "highlight": {
        const subject = (m) => g.subject === undefined || m === g.subject;
        state = units.with(state, { emphasis: Object.fromEntries(own.map((m) => [m, subject(m) ? "accent" : "ring"])) });
        for (const m of own) (subject(m) ? plate.accent : plate.rings).includes(m) || (subject(m) ? plate.accent : plate.rings).push(m);
        if (note) {
          oneNote(own[0], i);
          plate.notes.push({ index: i, do: g.do, group: own[0], text: note });
        }
        break;
      }
      case "name":
        state = units.with(state, { emphasis: { [own[0]]: "ring" } });
        if (!plate.rings.includes(own[0])) plate.rings.push(own[0]);
        oneNote(own[0], i);
        plate.notes.push({ index: i, do: g.do, group: own[0], text: note ?? `${own[0]}: ${countOf.get(own[0])}` });
        break;
      case "annotate":
        oneNote(own[0], i);
        plate.notes.push({ index: i, do: g.do, group: own[0], text: note ?? String(countOf.get(own[0])) });
        break;
      case "filter": {
        const others = all.filter((n) => !own.includes(n));
        state = units.with(state, { emphasis: Object.fromEntries(others.map((n) => [n, "stepBack"])) });
        plate.stepBack = others;
        if (note) plate.captions.push({ index: i, do: g.do, text: note });
        break;
      }
      case "bracket": {
        const whole = own.length === 1 && g.of === "whole";
        const span = whole ? all : own;
        state = units.with(state, { bracket: span });
        const s = sum(own);
        plate.brackets.push({ index: i, span, whole, own, sum: s, total, text: note ?? (whole ? `${s} / ${total}` : String(s)) });
        break;
      }
      case "compare": {
        const subject = own[0];
        if (copied.has(subject))
          throw new GestureRefusal(`gestures[${i}]`, `${subject} already carries a compare's copy, and a second copy in its band cannot be read on a still plate: drop it`, { remove: i });
        copied.add(subject);
        const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? all : of;
        const value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? total : sum(of);
        state = units.with(state, { compare: [subject, ...against] });
        plate.copies.push({ index: i, onto: subject, value, against });
        if (note) {
          oneNote(subject, i);
          plate.notes.push({ index: i, do: g.do, group: subject, text: note });
        }
        break;
      }
      case "reference": {
        const at = edgeOf(g);
        state = units.with(state, { reference: at });
        const above = groups.findIndex((x) => x.lo === at);
        const below = groups.findIndex((x) => x.hi === at);
        plate.references.push({ index: i, at, between: [Math.min(above, below), Math.max(above, below)], text: note });
        break;
      }
      case "count": {
        const counted = own.length ? own : all;
        plate.captions.push({ index: i, do: g.do, text: note ?? String(sum(counted)) });
        break;
      }
      default:
        // reveal and pull-back: their end state is every unit in its group, which a still plate already is.
        if (note) plate.captions.push({ index: i, do: g.do, text: note });
    }
    states.push(state);
  });

  for (let k = 1; k < states.length; k++)
    try {
      units.invariants(states.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }

  return { ...plate, stepBack: plate.stepBack.filter((n) => !plate.accent.includes(n)) };
}
