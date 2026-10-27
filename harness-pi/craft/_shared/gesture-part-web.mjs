// The web scheduler of the Part-to-whole family (craft/gestures/GRAMMAR.md §5, §6; the Length one is
// gesture-web.mjs): the gestures that can rest together (WEB_RESTING) are drawn at once on the page the reader lands
// on — the same end states the static plate draws — and every further gesture becomes ONE reader control: two native
// radios (the resting picture, and the picture with that gesture applied), mapped to the chart-web atom that names it.
// The interaction declaration renderWeb holds the page against is GENERATED here from the list; the 12B never writes
// it. With JavaScript off the page is the resting picture, and every control still works (radios plus :checked).
//
// A control's picture is the resting picture plus that one gesture (foldPart over the resting gestures and it alone),
// so two controls never disagree about what a third drew.
//
//   bracket → `toggle-a-comparison` (`stack`): the set gathers — a treemap lays it as one block of its summed area,
//             a donut lays its arcs side by side, a marimekko outlines its cells where they stand — and the note
//             prints its sum and its share of the whole.
//   compare → `toggle-a-comparison` (`level`): a copy of the compared quantity is laid against the subject with the
//             plate's own area (or angle) per unit, the note prints both figures, the ratio and the gap.
//   filter  → `filter-to-a-subset` (`filter`): the parts outside the set step back to the quietest fill; nothing
//             moves and nothing leaves, because a part that left would take its share of the whole with it.
//
// Nothing here reads the data's shape. What it refuses is a control that changes nothing (a filter keeping every
// drawn part). Each refusal names the field and carries a fix, so SPLASH_GESTURE_REPAIR repairs it like any other.
// Browser-safe: no Node module.
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { foldPart, groupsOf, REST, selectParts, shareText, validatePart } from "./gesture-family-part.mjs";

/** Each gesture beyond the resting state, as the reader control it becomes. */
export const PART_WEB_CONTROLS = {
  bracket: { atom: "toggle-a-comparison", mechanism: "stack" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
};

/** The parts a web page draws beside the ones the gestures name, before the rest becomes one remainder part. */
export const WEB_EXTRA = { treemap: 12, "pie-and-donut": 6, "marimekko-mosaic-plot": 10 };

const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/** The drawn parts: every named part, the largest others up to WEB_EXTRA, the rest as one remainder part. */
export function webParts({ variant, marks, gestures }) {
  const named = new Set(gestures.flatMap((g) => g.marks ?? []));
  const namedCount = variant === "marimekko-mosaic-plot" ? new Set(marks.filter((m) => named.has(m.name)).map((m) => m.key)).size : named.size;
  return selectParts({ variant, marks, gestures, capacity: namedCount + WEB_EXTRA[variant] });
}

/**
 * @param variant  treemap | marimekko-mosaic-plot | pie-and-donut
 * @param gestures validatePart's `valid`
 * @param marks    every mark (the whole)
 * @param format   how a value is printed
 * @returns { resting, controls, whole } — resting: a foldPart picture; each control: { index, do, atom, mechanism,
 *          picture, groups, note, legend, chip, pieces, question, changes, parameter }
 */
export function schedulePartWeb({ variant, gestures, marks, format = (v) => String(v) }) {
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const whole = marks.reduce((s, m) => s + m.value, 0);
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const sum = (list) => list.reduce((s, n) => s + (valueOf.get(n) ?? 0), 0);
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);
  const isResting = (g) => WEB_RESTING.has(g.do);
  // A gesture masked out of a picture keeps its marks and subject (the implicit accent reads them) but draws nothing.
  const masked = (keep) => gestures.map((g, i) => (keep(g, i) ? g : { ...g, do: "__elsewhere" }));
  const resting = foldPart({ variant, gestures: masked(isResting), marks, format });
  const { parts } = webParts({ variant, marks, gestures });
  const drawn = parts.map((p) => p.name);

  const controls = [];
  gestures.forEach((g, i) => {
    if (isResting(g)) return;
    const control = PART_WEB_CONTROLS[g.do];
    if (!control)
      throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no web control on this page: stage it with ${Object.keys(PART_WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: i });
    const picture = foldPart({ variant, gestures: masked((x, k) => isResting(x) || k === i), marks, format });
    const { own, of } = splitMarks(g);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    const c = { index: i, do: g.do, ...control, picture, groups: g.do === "bracket" ? [own] : [], note, label: g.label === undefined ? undefined : String(g.label) };
    if (g.do === "bracket") {
      const b = picture.brackets.at(-1);
      const against = b.of === "whole" ? whole : b.sum / (b.share || 1);
      Object.assign(c, {
        legend: short(own),
        chip: `${F(b.sum)} · ${shareText(format, b.share)}`,
        pieces: [...(own.length <= 3 ? [`${own.map((m) => F(valueOf.get(m))).join(" + ")} = ${F(b.sum)}`] : []), `${F(b.sum)} / ${F(against)} = ${shareText(format, b.share)}`],
        question: b.of === "whole" ? `How much of the ${F(whole)} in all do ${short(own)} hold together?` : `How much of ${short([...own, ...of])} do ${short(own)} hold?`,
        changes:
          variant === "treemap"
            ? `The bracketed tiles gather into one block of their summed area, outlined; every tile keeps its area.`
            : variant === "pie-and-donut"
              ? `The bracketed arcs move side by side under one band; every arc keeps its angle.`
              : `The bracketed cells are outlined where they stand; no cell moves.`,
        parameter: `whether the bracket of gestures[${i}] is drawn`,
      });
    } else if (g.do === "compare") {
      const copy = picture.copies.at(-1);
      const a = valueOf.get(copy.onto);
      const label = copy.of.length === marks.length - 1 && g.of === "whole" ? F(whole) : short(copy.of);
      Object.assign(c, {
        legend: `${copy.onto} / ${label}`,
        chip: `${F(a)} / ${F(copy.value)}`,
        pieces: [...(copy.value ? [`${F(a)} / ${F(copy.value)} = ${fx(a / copy.value)} ×`] : []), `${F(a)} - ${F(copy.value)} = ${F(a - copy.value)}`],
        question: `How big is ${copy.onto} against ${label}?`,
        changes: `A copy of ${label}'s ${variant === "pie-and-donut" ? "angle" : "area"} is laid against ${copy.onto}'s, at the same ${variant === "pie-and-donut" ? "angle" : "area"} per unit.`,
        parameter: `whether gestures[${i}] lays ${label} against ${copy.onto}`,
      });
    } else if (g.do === "filter") {
      const kept = own.filter((n) => drawn.includes(n));
      if (drawn.every((n) => own.includes(n) || n === REST || n.startsWith(`${REST} `)))
        throw new GestureRefusal(`gestures[${i}]`, `filter keeps every drawn part, so its control would change nothing in the picture: drop it`, { remove: i });
      Object.assign(c, {
        legend: short(kept),
        chip: `${kept.length} / ${marks.length}`,
        pieces: [`${kept.length} / ${marks.length}`, `${own.length <= 3 ? `${own.map((m) => F(valueOf.get(m))).join(" + ")} = ` : ""}${F(sum(own))} · ${shareText(format, sum(own) / whole)}`],
        question: `What do ${short(kept)} look like with the other parts stepped back?`,
        changes: `The other parts step back to the quietest fill; nothing moves and the whole stays drawn.`,
        parameter: `whether gestures[${i}] keeps only ${short(kept)} in ink`,
      });
    }
    controls.push(c);
  });
  return { resting, controls, whole, parts };
}

/**
 * The interaction declaration renderWeb holds the page against: every part answers a pointer, tap or key with its
 * share of the whole and its rank, then ONE control per gesture beyond the resting state, in story order.
 */
export function partInteractionPlan({ scheduled, subject, count }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What is this part worth against the whole, and where does it rank?",
    gesture: "ask-a-mark",
    changes: "The part steps one shade toward the ink and the answer prints its share of the whole and its rank.",
    parameter: "which part is asked about",
    authorPicked: subject,
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
      `A still of these ${count} parts must draw every gesture at once on one plate. Here the reader lands on the resting ` +
      `picture and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — ` +
      `and every part answers with its share of the whole and its rank.`,
    controls: [ask, ...controls],
  };
}

/** The core (format "web"), then the scheduler, with the repair loop; every repair is returned. */
export function stagePartWeb({ variant, gestures, marks, claim, format = (v) => String(v), repair = false, steps = 12 }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { valid, entities } = validatePart({ variant, gestures: list, marks, claim, format: "web" });
      const scheduled = schedulePartWeb({ variant, gestures: valid, marks, format });
      const subject = scheduled.resting.accent[0] ?? entities[0] ?? scheduled.parts[0].name;
      const interaction = partInteractionPlan({ scheduled, subject, count: marks.length });
      return { gestures: list, valid, scheduled, interaction, subject, repairs, groups: groupsOf(scheduled.resting) };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}
