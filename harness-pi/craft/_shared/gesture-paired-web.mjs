// The paired family's web scheduler (craft/gestures/GRAMMAR.md §5, §6, §9), over the paired adapter
// (./gesture-family-paired.mjs): the gestures that can rest together (WEB_RESTING) are folded into the RESTING state
// — the picture the reader lands on, the same end states the static plate draws — and every further gesture becomes
// ONE reader control: two native radios (the resting picture, and the resting picture plus that one gesture), named by
// the chart-web atom that matches it. The interaction declaration renderWeb holds the page against is GENERATED here.
//
// Controls (this family's mapping):
//   compare  → `toggle-a-comparison` (`level.ts`): a copy of the other length laid over the subject's mark, from the
//              same zero; the control's sentence prints the ratio and the gap.
//   filter   → `filter-to-a-subset` (`filter.ts`): the keys outside the set leave, the scale and every band stay.
//   reorder  → `sort-or-reorder`: the same keys in the order asked for (never the pyramid: the adapter refuses it).
//   bracket  → `toggle-a-comparison` (`stack.ts`'s reading, not its motion): the bracketed bands take the accent and a
//              bracket spans them, their sum printed — the pyramid only (the adapter refuses it elsewhere).
//
// A control's note is the gesture's own `note` (checked by the core) plus derived readings no plate prints (a ratio, a
// gap, a sum written out, a share), language-neutral (figures, names, + − × / = %). Nothing here reads the data's
// shape: any key count, gaps, negatives, long names. What it refuses is a control that changes nothing (a filter
// keeping every key, a reorder into the order drawn) and a gesture with no web control; each refusal names the field
// and carries a fix, so SPLASH_GESTURE_REPAIR repairs it. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { domainOf, firstState, foldGesture, invariants, splitMarks, stagePaired } from "./gesture-family-paired.mjs";

export const WEB_CONTROLS = {
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  reorder: { atom: "sort-or-reorder", mechanism: "reorder" },
  bracket: { atom: "toggle-a-comparison", mechanism: "stack" },
};

/** The value scale's headroom past its longest state, for the figure printed after each mark's end. */
export const HEADROOM = 1.3;

/** Refuses a gesture that is neither resting nor a control here, naming what this page can do instead. */
export function assertPairedWebMapping(gestures) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || WEB_CONTROLS[g.do]) return;
    throw new GestureRefusal(
      `gestures[${i}].do`,
      `"${g.do}" has no web control on this page: stage the takeaway with ${Object.keys(WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].filter((d) => d !== "count").join(", ")} (resting)`,
      { remove: i },
    );
  });
}

function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param gestures validated gestures (own marks first, then `of`, in `marks`)
 * @returns { resting, controls: [{ index, do, atom, state, legend, chip, pieces, question, changes, parameter, note }],
 *            domain, subject }
 */
export function schedulePairedWeb({ gestures, keys, marks, series, variant, format = String, claim = {}, ceiling }) {
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const byName = new Map(marks.map((m) => [m.name, m]));
  const keysOf = (names) => [...new Set(names.map((n) => byName.get(n)?.key).filter(Boolean))];
  const sum = (names) => names.reduce((t, n) => t + (byName.get(n)?.value ?? 0), 0);
  const whole = marks.reduce((t, m) => t + m.value, 0);
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);
  const ctx = { marks, keys, series, variant, format };

  const { state: first, subject } = firstState({ keys, marks, gestures, claim });
  let resting = first;
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) resting = foldGesture(resting, g, i, ctx);
  });

  const controls = [];
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) return;
    const { own, of } = splitMarks(g);
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    // The control's words go in its sentence, never on the plate: the plate draws the gesture's marks only.
    const state = foldGesture(resting, { ...g, note: undefined }, i, ctx);
    const unchanged = (what) => {
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} ${what}, so its control would change nothing in the picture: drop it`, { remove: i });
    };
    const control = { index: i, do: g.do, ...WEB_CONTROLS[g.do], note, state, label: g.label === undefined ? undefined : String(g.label) };
    switch (g.do) {
      case "compare": {
        const copy = state.copies.at(-1);
        const a = byName.get(copy.onto).value;
        const b = copy.value;
        const label = g.of === "whole" && own.length === 1 ? F(whole) : short(copy.of);
        Object.assign(control, {
          subject: copy.onto,
          value: b,
          legend: `${copy.onto} / ${label}`,
          chip: `${F(a)} / ${F(b)}`,
          pieces: [...(b !== 0 ? [`${F(a)} / ${F(b)} = ${fx(a / b)} ×`] : []), `${F(a)} - ${F(b)} = ${F(a - b)}`],
          question: `How long is ${copy.onto} against ${label}?`,
          changes: `A copy of ${label}'s length is laid over ${copy.onto}'s mark, from the same zero, the two figures at its end.`,
          parameter: `whether gestures[${i}] lays ${label} against ${copy.onto}`,
        });
        break;
      }
      case "filter": {
        const kept = keysOf(own);
        if (!kept.length || kept.length === keys.length) unchanged("keeps every key");
        Object.assign(control, {
          kept,
          legend: short(kept),
          chip: `${kept.length} / ${keys.length}`,
          pieces: [`${kept.length} / ${keys.length}`, kept.map((k) => `${k} = ${marks.filter((m) => m.key === k).map((m) => F(m.value)).join(" / ")}`).join(", ")],
          question: `What do ${kept.join(", ")} look like without the others?`,
          changes: `The other rows leave the plot; the scale and every remaining row stay exactly where they were.`,
          parameter: `whether gestures[${i}] keeps only ${kept.join(", ")}`,
        });
        break;
      }
      case "reorder": {
        if (state.order.every((k, j) => k === resting.order[j])) unchanged(`asks for the order the rows already hold (${resting.order.join(", ")})`);
        const o = state.order;
        Object.assign(control, {
          order: o,
          legend: `${o[0]} - ${o.at(-1)}`,
          chip: `${o[0]} - ${o.at(-1)}`,
          pieces: [o.map((n, k) => `${k + 1}. ${n}`).join(" ")],
          question: `What does the ranking look like with ${o[0]} first?`,
          changes: `The same rows move into the new order, names with them; every length and the scale stay as they were.`,
          parameter: `the order gestures[${i}] asks for`,
        });
        break;
      }
      case "bracket": {
        const b = state.brackets.at(-1);
        const s = b.sum;
        Object.assign(control, {
          keys: b.keys,
          total: s,
          legend: short(b.keys),
          chip: `= ${F(s)}`,
          pieces: [`${F(s)} / ${F(whole)} = ${fx((s / whole) * 100)} %`],
          question: `What do ${b.keys.join(", ")} add up to together?`,
          changes: `The bracketed rows take the accent and a bracket spans them, their sum printed at its end.`,
          parameter: `whether the bracket of gestures[${i}] is drawn`,
        });
        break;
      }
    }
    controls.push(control);
  });

  invariants([first, resting, ...controls.map((c) => c.state)], { variant });
  const domain = domainOf({ variant, marks, states: [resting, ...controls.map((c) => c.state)], ceiling });
  return { resting, controls, domain, subject, whole };
}

/**
 * The interaction declaration renderWeb holds the page against: every mark answers a pointer, tap or key with its
 * reading (both values of its key, the change), then ONE control per gesture beyond the resting state.
 */
export function pairedInteractionPlan({ scheduled, keys, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What does this mark read, and how does it compare with its row's other value?",
    gesture: "ask-a-mark",
    changes: "The mark steps one shade toward the ink and the answer prints its value and its row's reading.",
    parameter: "which mark is asked about",
    authorPicked: subject ?? keys[0].name,
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
  const asked = scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ");
  return {
    earns:
      `A still of these ${keys.length} rows must draw every gesture at once on one plate. ` +
      `Here the reader lands on the resting picture and asks for each further gesture in turn — ${asked} — and every mark answers with its reading.`,
    controls: [ask, ...controls],
  };
}

/**
 * The whole web staging: the core (family "paired", format "web", the adapter's hooks and claim), the web mapping,
 * the scheduler and the declaration, with the repair loop (`repair`) applying each refusal's fix to the model's list.
 */
export function stagePairedWeb({ gestures, variant, rows, series, claim, format = String, ceiling, repair = false, steps = 12, validateGestures }) {
  const out = stagePaired({
    gestures,
    variant,
    rows,
    series,
    format: "web",
    claim,
    ceiling,
    repair,
    steps,
    // The core's own all-resting refusal offers a bracket, which this family refuses on four of its five types (the
    // values do not add up), so following it would loop. The page asks first, offering a filter onto the row the
    // first gesture names — a control every paired type draws. Core change asked for: a family-aware fix (report).
    validateGestures: (input) => {
      const list = input.gestures;
      if (Array.isArray(list) && list.length && list.every((g) => WEB_RESTING.has(g?.do))) {
        const named = list.map((g) => [g.mark, g.marks].flat().find((m) => typeof m === "string")).find(Boolean);
        const mark = input.rows.find((m) => m.name === named || m.key === named || m.series === named);
        const key = mark && mark.series === named ? input.rows[0].key : mark?.key ?? input.rows[0].key;
        throw new GestureRefusal("gestures", `a web page needs at least one gesture a reader asks for (${Object.keys(WEB_CONTROLS).join(", ")}); every gesture here rests on the page`, {
          add: { at: list.length, gesture: { do: "filter", marks: [key] } },
        });
      }
      return validateGestures(input);
    },
    then: ({ gestures: valid, keys, marks, series: names, claim: resolved }) => {
      assertPairedWebMapping(valid);
      const scheduled = schedulePairedWeb({ gestures: valid, keys, marks, series: names, variant, format, claim: resolved, ceiling });
      const interaction = pairedInteractionPlan({ scheduled, keys, subject: scheduled.subject });
      return { valid, scheduled, interaction };
    },
  });
  return { ...out.staged, gestures: out.list, repairs: out.repairs, keys: out.keys, marks: out.marks, series: out.series, claim: out.claim };
}
