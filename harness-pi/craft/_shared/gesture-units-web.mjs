// The Units web scheduler (craft/gestures/GRAMMAR.md §5, §9): the gestures that can rest together (WEB_RESTING) are
// drawn at once on the page the reader lands on — the end states the static plate draws — and every further gesture
// becomes ONE reader control: two native radios (the resting picture, and the picture with that gesture applied).
// The interaction declaration renderWeb holds the page against is generated here, never written by the model.
//
// The controls a units page draws:
//   bracket → `toggle-a-comparison`: the bracketed groups' units gather onto the first of them (its bar runs on, its
//             squares continue), the sum printed at its end; a bracket of one group against the whole gathers every
//             unit, so the row IS the whole.
//   compare → `toggle-a-comparison`: a copy of the other group's count laid in the subject's band, from the same
//             baseline (a dashed bar, or hollow squares), each figure printed.
//   filter  → `filter-to-a-subset`: the other groups leave, nothing moves.
// Every control's note carries the gesture's own note and the derived readings no plate prints (a share, a ratio, a
// difference). Nothing here reads the data's shape. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { edgeOf, splitMarks } from "./gesture-family-units.mjs";

export const UNIT_WEB_CONTROLS = {
  bracket: { atom: "toggle-a-comparison", mechanism: "gather" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
};

/** A gesture that is neither resting nor a control here is refused, naming the formats that draw it. */
export function assertUnitsWebMapping(gestures) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || UNIT_WEB_CONTROLS[g.do]) return;
    throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no web control on a units page: use ${Object.keys(UNIT_WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: i });
  });
}

function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param gestures validateGestures' gestures
 * @param groups   the partition's groups, in drawing order
 * @param format   how a count is printed
 * @returns        { resting, controls, total, laid }
 */
export function scheduleUnitsWeb({ gestures, groups, format = String, entities = [] }) {
  assertUnitsWebMapping(gestures);
  const names = groups.map((g) => g.name);
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const sum = (list) => list.reduce((s, n) => s + (countOf.get(n) ?? 0), 0);
  const total = sum(names);
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const pct = (part) => `${fx((part / total) * 100)} %`;
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);

  const resting = { accent: [], rings: [], notes: [], references: [], captions: [], reveal: false };
  const implicit = implicitAccent(gestures);
  if (countOf.has(implicit)) resting.accent.push(implicit);
  const controls = [];
  const laid = [];

  gestures.forEach((g, i) => {
    const { own, of } = splitMarks(g);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    if (WEB_RESTING.has(g.do)) {
      switch (g.do) {
        case "highlight":
          for (const m of own) {
            const list = g.subject === undefined || m === g.subject ? resting.accent : resting.rings;
            if (!list.includes(m)) list.push(m);
          }
          if (note) resting.notes.push({ index: i, do: g.do, group: own[0], text: note });
          break;
        case "name":
          if (!resting.rings.includes(own[0])) resting.rings.push(own[0]);
          resting.notes.push({ index: i, do: g.do, group: own[0], text: note ?? `${own[0]}: ${F(countOf.get(own[0]))}` });
          break;
        case "annotate":
          resting.notes.push({ index: i, do: g.do, group: own[0], text: note ?? F(countOf.get(own[0])) });
          break;
        case "reference": {
          const at = edgeOf(g);
          const above = groups.findIndex((x) => x.lo === at);
          const below = groups.findIndex((x) => x.hi === at);
          resting.references.push({ index: i, at, between: [Math.min(above, below), Math.max(above, below)], text: note ?? F(at) });
          break;
        }
        case "count":
          resting.captions.push({ index: i, do: g.do, text: note ?? F(sum(own.length ? own : names)) });
          break;
        default:
          if (g.do === "reveal") resting.reveal = true;
          if (note) resting.captions.push({ index: i, do: g.do, text: note });
      }
      return;
    }

    const control = { index: i, do: g.do, ...UNIT_WEB_CONTROLS[g.do], note, label: g.label === undefined ? undefined : String(g.label) };
    if (g.do === "bracket") {
      const ofWhole = own.length === 1 && g.of === "whole";
      const members = ofWhole ? [own[0], ...names.filter((n) => n !== own[0])] : names.filter((n) => own.includes(n));
      const s = sum(ofWhole ? own : members);
      const gathered = sum(members);
      Object.assign(control, {
        base: members[0],
        gathered: members.slice(1),
        ofWhole,
        total: gathered,
        legend: ofWhole ? `${own[0]} / ${F(total)}` : short(members),
        chip: ofWhole ? `${F(s)} / ${F(total)}` : `= ${F(gathered)}`,
        pieces: ofWhole ? [`${F(s)} / ${F(total)} = ${pct(s)}`, `${F(total)} - ${F(s)} = ${F(total - s)}`] : [`${members.map((m) => F(countOf.get(m))).join(" + ")} = ${F(gathered)}`, pct(gathered)],
        question: ofWhole ? `How many of the ${F(total)} counted are in ${own[0]}?` : `How many do ${members.join(", ")} hold together?`,
        changes: ofWhole ? `Every other group's units gather onto ${own[0]}'s row, which becomes the whole, ${F(total)}, printed at its end.` : `The bracketed groups' units gather onto ${members[0]}'s row, their sum printed at its end.`,
        parameter: `whether the bracket of gestures[${i}] is drawn`,
      });
      laid.push(gathered);
    } else if (g.do === "compare") {
      const subject = own[0];
      const value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? total : sum(of);
      const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names : of;
      const a = countOf.get(subject);
      const label = g.of === "whole" && own.length === 1 ? F(total) : short(against);
      Object.assign(control, {
        subject,
        value,
        legend: `${subject} / ${label}`,
        chip: `${F(a)} / ${F(value)}`,
        pieces: [...(value !== 0 ? [`${F(a)} / ${F(value)} = ${fx(a / value)} ×`] : []), `${F(a)} - ${F(value)} = ${F(a - value)}`],
        question: `How many does ${subject} hold against ${label}?`,
        changes: `A copy of ${label}'s count is laid inside ${subject}'s row, from the same baseline, its figure at its end.`,
        parameter: `whether gestures[${i}] lays ${label} against ${subject}`,
      });
      laid.push(value);
    } else if (g.do === "filter") {
      const kept = names.filter((n) => own.includes(n));
      if (!kept.length) {
        const value = entities.filter((e) => names.includes(e));
        throw new GestureRefusal(`gestures[${i}].marks`, `a filter keeps the groups the claim is about: name them`, { set: { index: i, field: "marks", value: value.length ? value : [names[0]] } });
      }
      if (kept.length === names.length) throw new GestureRefusal(`gestures[${i}]`, `filter keeps every group, so its control would change nothing in the picture: drop it`, { remove: i });
      Object.assign(control, {
        kept,
        legend: short(kept),
        chip: `${kept.length} / ${names.length}`,
        pieces: [`${F(sum(kept))} / ${F(total)} = ${pct(sum(kept))}`],
        question: `What do ${kept.join(", ")} look like without the others?`,
        changes: `The other groups and their names leave the plot; every remaining row stays exactly where it was.`,
        parameter: `whether gestures[${i}] keeps only ${kept.join(", ")}`,
      });
    }
    controls.push(control);
  });
  return { resting, controls, total, laid };
}

/** The interaction declaration: every group answers a pointer with what the plate prints nowhere, then one control per further gesture. */
export function unitsInteractionPlan({ scheduled, groups, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "How many does this group hold against the whole, which things are in it, and where does it rank?",
    gesture: "ask-a-mark",
    changes: "The group steps one shade toward the ink and the answer prints its share of the whole, its rank and the things it holds.",
    parameter: "which group is asked about",
    authorPicked: subject ?? groups[0].name,
    readerPicks: "every mark",
    heldStill: HELD,
  };
  const controls = scheduled.controls.map((c) => ({
    question: c.question,
    gesture: c.atom,
    changes: c.changes,
    parameter: c.parameter,
    authorPicked: "on",
    readerPicks: ["rest", "on"],
    heldStill: HELD,
  }));
  return {
    earns:
      `A still of these ${scheduled.total} things in ${groups.length} groups must draw every gesture at once and cannot say which things a group holds. ` +
      `Here the reader lands on the resting picture and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every group answers with its share, its rank and its members.`,
    controls: [ask, ...controls],
  };
}
