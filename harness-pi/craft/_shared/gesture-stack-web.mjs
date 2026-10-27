// The Stack family's web scheduler (craft/gestures/GRAMMAR.md §5, §6, §9): the gestures that can rest together
// (WEB_RESTING) are folded at once into the RESTING state — the same end states the static plate draws — and every
// further gesture becomes ONE reader control whose picture is the resting state plus that gesture alone
// (gesture-family-stack.mjs `apply`), mapped to the chart-web atom that names it. The interaction declaration
// renderWeb holds the page against is generated here; the 12B never writes it. Every control's note carries the
// gesture's own note (checked by the core) and the readings no plate prints, as language-neutral figures, so the page
// still says everything with JavaScript off. Every segment answers a pointer, tap or key (ask-a-mark).
// Browser-safe: no Node module.
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { validateStack } from "./gesture-family-stack.mjs";

/** Each Stack gesture beyond the resting state, as the reader control it becomes (chart-web atoms). */
export const STACK_WEB_CONTROLS = {
  bracket: { atom: "toggle-a-comparison", mechanism: "stack" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  reorder: { atom: "sort-or-reorder", mechanism: "reorder" },
};

function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param gestures validateStack's gestures (marks resolved to segments)
 * @param stack    the family model
 * @param subject  the bar the takeaway is about (always in the accent)
 * @returns        { resting, controls } — resting is a Stack state; each control carries its own state `plate`
 * @param {{ gestures: any[], stack: any, format?: (v: number) => string, subject?: string | null }} input
 * @returns {any}
 */
export function scheduleStackWeb({ gestures, stack, format = String, subject = null }) {
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);
  const running = stack.anchorMode === "running";
  const say = (u) => (u.wholeBars.length === u.bars.length ? short(u.bars) : short(u.segs));

  // The resting picture: the subject's accent, then every resting gesture in story order.
  let resting = stack.rest();
  if (subject) resting.accent = [subject];
  gestures.forEach((g, index) => {
    if (WEB_RESTING.has(g.do)) resting = stack.apply(resting, g, { index, format, subject });
  });
  stack.invariants([resting]);

  const controls = [];
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) return;
    if (!STACK_WEB_CONTROLS[g.do])
      throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no web control on this page: stage it with ${Object.keys(STACK_WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: i });
    const unchanged = (what) => {
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} ${what}, so its control would change nothing in the picture: drop it`, { remove: i });
    };
    const plate = stack.apply(resting, g, { index: i, format, subject });
    stack.invariants([resting, plate]);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    const control = { index: i, do: g.do, ...STACK_WEB_CONTROLS[g.do], note, label: g.label === undefined ? undefined : String(g.label), plate };
    const ofSegs = Array.isArray(g.of) ? g.of : [];
    const own = stack.unit(g.marks.slice(0, g.marks.length - ofSegs.length));
    switch (g.do) {
      case "bracket": {
        const b = plate.brackets.at(-1);
        const whole = stack.unit(b.span).value;
        Object.assign(control, {
          total: b.value,
          legend: b.whole ? `${say(own)} / ${F(whole)}` : say(own),
          chip: b.whole ? `${F(b.value)} / ${F(whole)}` : `= ${F(b.value)}`,
          pieces: b.whole && whole ? [`${F(b.value)} / ${F(whole)} = ${fx((b.value / whole) * 100)} %`] : [`${own.segs.map((m) => F(stack.marks.find((x) => x.name === m).value)).join(" + ")} = ${F(b.value)}`],
          question: b.whole ? `How much of ${short(b.bars)} is ${say(own)}?` : `What do ${say(own)} add up to together?`,
          changes: `A bracket spans ${say(own)} and prints their sum.`,
          parameter: `whether the bracket of gestures[${i}] is drawn`,
        });
        break;
      }
      case "compare": {
        const c = plate.copies.at(-1);
        const subjectU = stack.unit(c.onto);
        const against = stack.unit(c.of);
        Object.assign(control, {
          value: c.value,
          legend: `${say(subjectU)} / ${say(against)}`,
          chip: `${F(c.subjectValue)} / ${F(c.value)}`,
          pieces: [...(c.value !== 0 ? [`${F(c.subjectValue)} / ${F(c.value)} = ${fx(c.subjectValue / c.value)} ×`] : []), `${F(c.subjectValue)} - ${F(c.value)} = ${F(c.subjectValue - c.value)}`],
          question: `How long is ${say(subjectU)} against ${say(against)}?`,
          changes: `A copy of ${say(against)}'s length is laid under ${say(subjectU)}, from where it starts, its figure at its end.`,
          parameter: `whether gestures[${i}] lays ${say(against)} against ${say(subjectU)}`,
        });
        break;
      }
      case "filter": {
        const kept = own.bars;
        if (!kept.length || kept.length === stack.names.length) unchanged("keeps every bar");
        Object.assign(control, {
          kept,
          legend: short(kept),
          chip: `${kept.length} / ${stack.names.length}`,
          pieces: [`${kept.length} / ${stack.names.length}`],
          question: `What do ${kept.join(", ")} look like with the others stepped back?`,
          changes: "The other bars step back; the scale and every bar stay exactly where they were.",
          parameter: `whether gestures[${i}] keeps only ${kept.join(", ")}`,
        });
        break;
      }
      case "reorder": {
        if (plate.order.every((n, k) => n === resting.order[k])) unchanged(`asks for the order the bars already hold (${resting.order.join(", ")})`);
        Object.assign(control, {
          order: plate.order,
          legend: `${plate.order[0]} - ${plate.order.at(-1)}`,
          chip: `${F(stack.whole(plate.order[0]))} - ${F(stack.whole(plate.order.at(-1)))}`,
          pieces: [plate.order.map((n, k) => `${k + 1}. ${n}`).join(" ")],
          question: `What does the ranking look like with ${plate.order[0]} first?`,
          changes: "The same bars move into the new order, names with them; every segment and the scale stay as they were.",
          parameter: `the order gestures[${i}] asks for`,
        });
        break;
      }
    }
    controls.push(control);
  });
  return { resting, controls };
}

/** The declaration renderWeb holds the page against: ask-a-mark on every segment, then one control per gesture. */
export function stackInteractionPlan({ scheduled, stack, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What is this segment worth, against its bar and against the whole?",
    gesture: "ask-a-mark",
    changes: "The segment steps one shade toward the ink and the answer prints its value, its share of its bar and its bar's total.",
    parameter: "which segment is asked about",
    authorPicked: subject ?? stack.names[0],
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
      `A still of these ${stack.marks.length} segments must draw every gesture at once and print a fixed set of figures. ` +
      `Here the reader lands on the resting picture and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every segment answers with its value and its share of its bar.`,
    controls: [ask, ...controls],
  };
}

/**
 * The whole web staging: the core (format "web"), the scheduler and the declaration, with the repair loop.
 * @param {{ gestures: any[], stack: any, claim: any, format?: (v: number) => string, repair?: boolean, steps?: number }} input
 * @returns {any}
 */
export function stageStackWeb({ gestures, stack, claim, format = String, repair = false, steps = 12 }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid, subject } = validateStack({ gestures: list, stack, format: "web", claim });
      const scheduled = scheduleStackWeb({ gestures: valid, stack, format, subject });
      const interaction = stackInteractionPlan({ scheduled, stack, subject });
      return { gestures: list, valid, subject, scheduled, interaction, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}
